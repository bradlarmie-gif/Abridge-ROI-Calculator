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
  Line,
  Circle,
  Polyline,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { SwitchInputs, SwitchCalculations } from "@/lib/switchGapCalculator";
import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// ============================================================================
// COLORS - Premium palette matching Expand PDF
// ============================================================================

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
  emeraldDark: "#047857",
  slate800: "#1e293b",
  slate900: "#0f172a",
  blue: "#2563EB",
  blueLight: "#DBEAFE",
  amber: "#D97706",
  amberLight: "#FEF3C7",
  red: "#DC2626",
  redLight: "#FEF2F2",
};

// ============================================================================
// STYLES - Premium god tier layout matching Expand PDF
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },
  
  // Hero sections
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
  
  heroCompact: {
    backgroundColor: colors.slate900,
    padding: 28,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  heroCompactTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.white,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroCompactSubtitle: {
    fontSize: 10,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.5,
    maxWidth: 400,
  },
  
  // Content section
  contentSection: {
    padding: 40,
    paddingTop: 28,
  },
  
  // Typography
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
    color: colors.emerald,
    fontWeight: "bold",
  },
  
  // Metrics grid
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
  metricCardGreen: {
    flex: 1,
    backgroundColor: colors.emeraldLight,
    borderRadius: 8,
    padding: 14,
    marginRight: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.emerald,
  },
  metricLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  metricLabelLight: {
    fontSize: 7,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
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
  metricValueGreen: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.emerald,
  },
  metricSub: {
    fontSize: 7,
    color: colors.mediumGray,
    marginTop: 2,
  },
  
  // Summary box
  summaryBox: {
    backgroundColor: colors.slate800,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
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
    textAlign: "center",
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.white,
  },
  summaryItemValueGreen: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.emerald,
  },
  summaryItemSubtext: {
    fontSize: 7,
    color: colors.lightGray,
    marginTop: 2,
    textAlign: "center",
  },
  
  // Dimension cards
  dimensionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  dimensionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dimensionName: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  dimensionScore: {
    fontSize: 10,
    fontWeight: "bold",
  },
  dimensionCompare: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dimensionCompareItem: {
    flex: 1,
    alignItems: "center",
  },
  dimensionCompareLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 2,
  },
  dimensionCompareValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
  },
  dimensionCompareArrow: {
    fontSize: 14,
    color: colors.emerald,
    paddingHorizontal: 8,
  },
  dimensionEducation: {
    backgroundColor: colors.backgroundGray,
    padding: 10,
    borderRadius: 6,
  },
  dimensionText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  dimensionInsight: {
    fontSize: 8,
    color: colors.primary,
    lineHeight: 1.5,
    backgroundColor: colors.primaryLight,
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  bold: {
    fontWeight: "bold",
  },
  
  // Gap calculation cards
  gapCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  gapCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.backgroundGray,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  gapCardTitle: {
    fontSize: 9,
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
  },
  gapStep: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.6,
    marginBottom: 3,
    paddingLeft: 8,
  },
  gapStepLabel: {
    fontWeight: "bold",
    color: colors.mediumGray,
  },
  
  // Total value box
  totalBox: {
    backgroundColor: colors.emeraldLight,
    borderWidth: 2,
    borderColor: colors.emerald,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.emeraldDark,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.emerald,
    marginBottom: 4,
  },
  totalSubtext: {
    fontSize: 8,
    color: colors.emeraldDark,
  },
  
  // Opportunity box
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
  
  // Optimization cards
  optimizationCard: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.emerald,
  },
  optimizationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  optimizationTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  optimizationValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.emerald,
  },
  optimizationBody: {
    flexDirection: "row",
    marginBottom: 6,
  },
  optimizationCurrentTarget: {
    flex: 1,
  },
  optimizationLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 2,
  },
  optimizationMetric: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.darkGray,
  },
  optimizationAction: {
    fontSize: 8,
    color: colors.darkGray,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  
  // Takeaway cards
  takeawayCard: {
    flexDirection: "row",
    backgroundColor: colors.backgroundGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  takeawayIcon: {
    width: 20,
    marginRight: 10,
  },
  takeawayContent: {
    flex: 1,
  },
  takeawayTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 3,
  },
  takeawayText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },
  
  // Warning/info boxes
  warningBox: {
    backgroundColor: colors.amberLight,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.amber,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 8,
    color: colors.amber,
    lineHeight: 1.4,
  },
  
  // Methodology
  methodologySection: {
    marginTop: 16,
  },
  methodologyTitle: {
    fontSize: 10,
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
    paddingRight: 12,
  },
  methodologyColumnTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  methodologyItem: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  methodologyNote: {
    fontSize: 7,
    color: colors.lightGray,
    lineHeight: 1.4,
    marginTop: 10,
    fontStyle: "italic",
  },
  
  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 16,
  },
  
  // Footer
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
});

// ============================================================================
// TYPES & HELPERS
// ============================================================================

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

const getMaturityDescription = (stage: string): string => {
  switch(stage) {
    case 'Early Stage': return 'Early in the value capture journey with significant upside';
    case 'Developing': return 'Building momentum with room to optimize';
    case 'Optimized': return 'Performing well with fine-tuning opportunities';
    case 'Transformed': return 'Among top performers, maximizing value';
    default: return 'Progressing on the value capture journey';
  }
};

// ============================================================================
// SVG COMPONENTS FOR VISUALIZATIONS
// ============================================================================

const ScoreGauge = ({ score }: { score: number }) => {
  const width = 180;
  const height = 100;
  const centerX = width / 2;
  const centerY = 85;
  const radius = 70;
  
  const startAngle = Math.PI;
  const endAngle = 0;
  const scoreAngle = startAngle - (score / 100) * Math.PI;
  
  const getPoint = (angle: number, r: number) => ({
    x: centerX + Math.cos(angle) * r,
    y: centerY - Math.sin(angle) * r,
  });
  
  const arcPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;
  const scorePoint = getPoint(scoreAngle, radius);
  
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} fill="transparent" />
      <Circle cx={centerX - radius} cy={centerY} r={4} fill={colors.red} />
      <Circle cx={centerX} cy={centerY - radius} r={4} fill={colors.amber} />
      <Circle cx={centerX + radius} cy={centerY} r={4} fill={colors.emerald} />
      <Circle cx={scorePoint.x} cy={scorePoint.y} r={8} fill={colors.primary} />
      <Line x1={centerX - radius + 10} y1={centerY + 15} x2={centerX + radius - 10} y2={centerY + 15} stroke={colors.borderGray} strokeWidth={1} />
    </Svg>
  );
};

const DimensionProgressBar = ({ score, label, width = 200 }: { score: number; label: string; width?: number }) => {
  const barWidth = Math.max((score / 100) * width, 4);
  const color = getScoreColor(score);
  
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 8, color: colors.darkGray }}>{label}</Text>
        <Text style={{ fontSize: 8, fontWeight: 'bold', color }}>{score}%</Text>
      </View>
      <Svg width={width} height={8}>
        <Rect x={0} y={0} width={width} height={8} fill={colors.backgroundGray} rx={4} />
        <Rect x={0} y={0} width={barWidth} height={8} fill={color} rx={4} />
      </Svg>
    </View>
  );
};

const CostTrajectoryChart = ({ 
  currentGap, 
  monthlyGap 
}: { 
  currentGap: number; 
  monthlyGap: number;
}) => {
  const width = 460;
  const height = 100;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 10;
  const paddingBottom = 25;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  const years = [0, 1, 2, 3];
  const currentPath = years.map(y => y * currentGap);
  const abridgePath = years.map(() => 0);
  
  const maxValue = currentGap * 3;
  
  const getX = (year: number) => paddingLeft + (year / 3) * chartWidth;
  const getY = (value: number) => paddingTop + chartHeight - (value / maxValue) * chartHeight;
  
  const currentPoints = years.map(y => `${getX(y)},${getY(currentPath[y])}`).join(' ');
  
  return (
    <View style={{ marginVertical: 12 }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke={colors.borderGray} strokeWidth={1} />
        <Line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke={colors.borderGray} strokeWidth={1} />
        
        <Polyline points={currentPoints} stroke={colors.red} strokeWidth={2} fill="none" />
        
        <Line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke={colors.emerald} strokeWidth={3} />
        
        {years.map((y) => (
          <Circle key={y} cx={getX(y)} cy={getY(currentPath[y])} r={4} fill={colors.red} />
        ))}
        
        <Circle cx={width - paddingRight} cy={height - paddingBottom} r={6} fill={colors.emerald} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: paddingLeft - 10, paddingRight: paddingRight }}>
        <Text style={{ fontSize: 7, color: colors.mediumGray }}>Today</Text>
        <Text style={{ fontSize: 7, color: colors.mediumGray }}>Year 1</Text>
        <Text style={{ fontSize: 7, color: colors.mediumGray }}>Year 2</Text>
        <Text style={{ fontSize: 7, color: colors.mediumGray }}>Year 3</Text>
      </View>
    </View>
  );
};

// ============================================================================
// NARRATIVE GENERATORS
// ============================================================================

interface DimensionInfo {
  name: string;
  score: number;
}

const getStageNarrative = (stage: string, score: number, gap: number): string => {
  switch(stage) {
    case 'Early Stage':
      return `At ${score}% value realization, your organization is capturing roughly one-third of ambient AI's potential. This isn't unusual for early deployments—but it represents a ${formatCurrency(gap)} annual opportunity that compounds over time. The good news: the path to higher value is clear and actionable.`;
    case 'Developing':
      return `At ${score}% value realization, you've built a solid foundation. The ${formatCurrency(gap)} opportunity isn't about starting over—it's about optimizing what's already working. Organizations at this stage typically see the fastest improvements with targeted interventions.`;
    case 'Optimized':
      return `At ${score}% value realization, you're outperforming most deployments. The ${formatCurrency(gap)} remaining opportunity represents fine-tuning rather than fundamental change. You're in a position to become a reference case for what's possible.`;
    case 'Transformed':
      return `At ${score}% value realization, you're among the top performers. The ${formatCurrency(gap)} represents marginal gains—worth pursuing, but your primary value is already being captured. Consider how to maintain and extend this success.`;
    default:
      return `At ${score}% value realization, there's meaningful opportunity to optimize. The ${formatCurrency(gap)} annual gap is addressable with focused effort on your weakest dimensions.`;
  }
};

const getDimensionRankings = (scores: { utilization: number; efficiency: number; quality: number; satisfaction: number }): { lowest: DimensionInfo; highest: DimensionInfo; sorted: DimensionInfo[] } => {
  const dimensions: DimensionInfo[] = [
    { name: 'Utilization', score: scores.utilization },
    { name: 'Efficiency', score: scores.efficiency },
    { name: 'Quality', score: scores.quality },
    { name: 'Satisfaction', score: scores.satisfaction },
  ];
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  return { lowest: sorted[0], highest: sorted[sorted.length - 1], sorted };
};

interface OptimizationOpportunity {
  title: string;
  current: string;
  target: string;
  potentialValue: number;
  action: string;
}

const getOptimizationOpportunities = (
  inputs: SwitchInputs,
  calculations: SwitchCalculations,
  dimensionRankings: ReturnType<typeof getDimensionRankings>
): OptimizationOpportunity[] => {
  const opportunities: OptimizationOpportunity[] = [];
  
  if (calculations.utilizationScore < 90) {
    const utilizationGap = ABRIDGE_BENCHMARKS.utilization - inputs.utilization;
    const potentialValue = Math.round(calculations.utilizationGapValue * 0.5);
    opportunities.push({
      title: 'Increase Utilization',
      current: `${inputs.utilization}% of encounters`,
      target: `${Math.min(inputs.utilization + Math.round(utilizationGap / 2), ABRIDGE_BENCHMARKS.utilization)}%`,
      potentialValue,
      action: 'Focus on workflow integration and provider training to capture more encounters.',
    });
  }
  
  if (calculations.efficiencyScore < 90) {
    const potentialValue = Math.round(calculations.efficiencyGapValue * 0.5);
    opportunities.push({
      title: 'Improve Time Savings',
      current: `${inputs.timeSavedPerEncounter} min/encounter`,
      target: `${Math.min(inputs.timeSavedPerEncounter + 1, ABRIDGE_BENCHMARKS.timeSavedAvg)} min`,
      potentialValue,
      action: 'Review note templates and reduce post-visit editing to increase per-encounter savings.',
    });
  }
  
  if (calculations.qualityScore < 90) {
    const potentialValue = Math.round(calculations.wrvuGapValue * 0.5);
    opportunities.push({
      title: 'Enhance Documentation Quality',
      current: `+${inputs.wrvuLift}% wRVU`,
      target: `+${Math.min(inputs.wrvuLift + 1, ABRIDGE_BENCHMARKS.wrvuLift)}%`,
      potentialValue,
      action: 'Partner with coding team to identify documentation gaps affecting wRVU capture.',
    });
  }
  
  return opportunities.slice(0, 3);
};

const DimensionEducation = {
  utilization: {
    definition: "The percentage of encounters where ambient AI is used for documentation.",
    whyMatters: "Every encounter not using ambient AI is one where providers carry full documentation burden. Low utilization means paying for capacity that isn't being used.",
    whatDrives: "Workflow integration, provider habits, technical friction, and whether the tool feels natural in clinical environments.",
    getInsight: (score: number, value: number) => score < 70 
      ? `At ${score}% of benchmark, this dimension represents ${formatCurrency(value)} in untapped value. Focus here could yield quick wins.`
      : score < 90 
        ? `Solid utilization with room to grow. Closing the gap could add ${formatCurrency(value)} annually.`
        : `Strong utilization. Maintain current practices while looking for edge cases.`,
  },
  efficiency: {
    definition: "Average time saved per encounter when ambient AI is used.",
    whyMatters: "This is the core promise: giving time back to providers. Less time saved means the documentation burden persists despite the tool.",
    whatDrives: "Note quality out of the box, editing frequency, template optimization, and EHR integration smoothness.",
    getInsight: (score: number, value: number) => score < 70 
      ? `At ${score}% of benchmark, providers may be editing notes extensively. ${formatCurrency(value)} opportunity through optimization.`
      : score < 90 
        ? `Good efficiency with optimization potential. Target: reduce editing time to capture ${formatCurrency(value)}.`
        : `Excellent efficiency. Providers are experiencing the full time-saving promise.`,
  },
  quality: {
    definition: "Documentation improvement measured through wRVU capture.",
    whyMatters: "Better documentation leads to better coding, which leads to better reimbursement. Often the largest dollar opportunity.",
    whatDrives: "Clinical detail capture, coder feedback loops, and whether notes reflect complexity of care delivered.",
    getInsight: (score: number, value: number) => score < 70 
      ? `At ${score}% of benchmark, documentation isn't translating to coding accuracy. This ${formatCurrency(value)} gap is often the largest opportunity.`
      : score < 90 
        ? `Documentation quality is good. Tightening the coder feedback loop could capture ${formatCurrency(value)}.`
        : `Strong quality metrics. Your documentation is supporting appropriate reimbursement.`,
  },
  satisfaction: {
    definition: "Provider satisfaction—typically measured through NPS or likelihood to recommend.",
    whyMatters: "Satisfaction is a leading indicator. Dissatisfied providers use solutions less over time. Happy providers become champions who drive adoption.",
    whatDrives: "Note accuracy, time actually saved, reliability, and whether it genuinely makes their day better.",
    getInsight: (score: number) => score < 70 
      ? `At ${score}% of benchmark, there may be fundamental experience issues to address. Low satisfaction often predicts declining utilization.`
      : score < 90 
        ? `Good satisfaction with room for improvement. Understanding the remaining friction points is key.`
        : `Excellent satisfaction. These providers are likely your best advocates for expansion.`,
  },
};

// ============================================================================
// PDF DOCUMENT - Premium 6-page layout
// ============================================================================

const AmbientPDFDocument = ({ inputs, calculations, clientName, preparedBy }: AmbientPDFData) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const encountersAtBenchmark = Math.round((inputs.annualEncounters || 150000) * (ABRIDGE_BENCHMARKS.utilization / 100));
  const monthlyGap = Math.round(calculations.annualGap / 12);
  
  const dimensionRankings = getDimensionRankings({
    utilization: calculations.utilizationScore,
    efficiency: calculations.efficiencyScore,
    quality: calculations.qualityScore,
    satisfaction: calculations.satisfactionScore,
  });

  const optimizationOpportunities = getOptimizationOpportunities(inputs, calculations, dimensionRankings);
  
  const efficiencyTimeDiff = ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter;
  const efficiencyHoursGap = Math.round((efficiencyTimeDiff / 60) * encountersAtBenchmark);
  const wrvuGapPercent = ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift;
  const additionalWrvu = Math.round(encountersAtBenchmark * 1.5 * (wrvuGapPercent / 100));

  return (
    <Document>
      {/* ================================================================ */}
      {/* PAGE 1: EXECUTIVE SUMMARY */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.heroSection}>
          <Image src={abridgeLogoPath} style={{ width: 100, height: 20, marginBottom: 24 }} />
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>{today}</Text>
            <Text style={styles.heroMetaText}>Prepared by {preparedBy}</Text>
          </View>
          <Text style={styles.heroClientName}>{clientName}</Text>
          <Text style={styles.heroTagline}>
            Value Realization Assessment — Understanding where you are today and the path to full value capture
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>EXECUTIVE SUMMARY</Text>
          <Text style={styles.sectionTitle}>Your Value Realization at a Glance</Text>
          <Text style={styles.sectionSubtitle}>
            This assessment examines four dimensions of ambient AI value: utilization, efficiency, quality, and satisfaction. Your overall realization score reflects how much potential value is being captured.
          </Text>
          
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCardGreen, { flex: 1.5 }]}>
              <Text style={styles.metricLabel}>Annual Opportunity</Text>
              <Text style={styles.metricValueGreen}>{formatCurrency(calculations.annualGap)}</Text>
              <Text style={styles.metricSub}>Value gap to close</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Realization Score</Text>
              <Text style={[styles.metricValue, { color: getScoreColor(calculations.realizationScore) }]}>{calculations.realizationScore}%</Text>
              <Text style={styles.metricSub}>of potential captured</Text>
            </View>
            <View style={[styles.metricCard, styles.metricCardLast]}>
              <Text style={styles.metricLabel}>3-Year Impact</Text>
              <Text style={styles.metricValue}>{formatCurrency(calculations.threeYearGap)}</Text>
              <Text style={styles.metricSub}>cumulative opportunity</Text>
            </View>
          </View>
          
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>PERFORMANCE BY DIMENSION</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Utilization</Text>
                <Text style={[styles.summaryItemValue, { color: getScoreColor(calculations.utilizationScore) }]}>{calculations.utilizationScore}%</Text>
                <Text style={styles.summaryItemSubtext}>{inputs.utilization}% vs {ABRIDGE_BENCHMARKS.utilization}%</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Efficiency</Text>
                <Text style={[styles.summaryItemValue, { color: getScoreColor(calculations.efficiencyScore) }]}>{calculations.efficiencyScore}%</Text>
                <Text style={styles.summaryItemSubtext}>{inputs.timeSavedPerEncounter}min vs {ABRIDGE_BENCHMARKS.timeSavedAvg}min</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Quality</Text>
                <Text style={[styles.summaryItemValue, { color: getScoreColor(calculations.qualityScore) }]}>{calculations.qualityScore}%</Text>
                <Text style={styles.summaryItemSubtext}>+{inputs.wrvuLift}% vs +{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Satisfaction</Text>
                <Text style={[styles.summaryItemValue, { color: getScoreColor(calculations.satisfactionScore) }]}>{calculations.satisfactionScore}%</Text>
                <Text style={styles.summaryItemSubtext}>{inputs.satisfaction}% vs {ABRIDGE_BENCHMARKS.satisfaction}%</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.storyText}>
            {getStageNarrative(calculations.maturityLevel, calculations.realizationScore, calculations.annualGap)}
          </Text>
          
          <Text style={styles.storyText}>
            <Text style={styles.storyTextBold}>Primary opportunity: </Text>
            {dimensionRankings.lowest.name} at {dimensionRankings.lowest.score}% is your biggest gap. 
            {dimensionRankings.highest.name} at {dimensionRankings.highest.score}% shows what's possible when a dimension is optimized.
          </Text>
          
          <View style={styles.opportunityBox}>
            <Text style={styles.opportunityTitle}>Every Month of Delay = {formatCurrency(monthlyGap)}</Text>
            <Text style={styles.opportunityText}>
              This isn't about blame—it's about opportunity cost. The value gap compounds monthly. Taking action now captures value that would otherwise be left on the table.
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Abridge Value Realization Assessment</Text>
          <Text style={styles.footerText}>Page 1 of 6</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 2: DIMENSION DEEP-DIVES (Part 1) */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactTitle}>Understanding Your Four Dimensions</Text>
          <Text style={styles.heroCompactSubtitle}>
            Value realization depends on performance across four interconnected areas. Weakness in one dimension limits the others.
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>DIMENSION ANALYSIS</Text>
          <Text style={styles.sectionTitle}>Utilization & Efficiency</Text>
          
          <View style={styles.dimensionCard}>
            <View style={styles.dimensionHeader}>
              <Text style={styles.dimensionName}>UTILIZATION</Text>
              <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.utilizationScore) }]}>
                {calculations.utilizationScore}% of benchmark
              </Text>
            </View>
            <View style={styles.dimensionCompare}>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>YOUR RATE</Text>
                <Text style={styles.dimensionCompareValue}>{inputs.utilization}%</Text>
              </View>
              <Text style={styles.dimensionCompareArrow}>→</Text>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>BENCHMARK</Text>
                <Text style={[styles.dimensionCompareValue, { color: colors.emerald }]}>{ABRIDGE_BENCHMARKS.utilization}%</Text>
              </View>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>GAP VALUE</Text>
                <Text style={[styles.dimensionCompareValue, { color: colors.emerald }]}>{formatCurrency(calculations.utilizationGapValue)}</Text>
              </View>
            </View>
            <View style={styles.dimensionEducation}>
              <Text style={styles.dimensionText}>
                <Text style={styles.bold}>Why it matters: </Text>{DimensionEducation.utilization.whyMatters}
              </Text>
              <Text style={styles.dimensionText}>
                <Text style={styles.bold}>What drives it: </Text>{DimensionEducation.utilization.whatDrives}
              </Text>
            </View>
            {calculations.utilizationScore < 90 && (
              <Text style={styles.dimensionInsight}>
                {DimensionEducation.utilization.getInsight(calculations.utilizationScore, calculations.utilizationGapValue)}
              </Text>
            )}
          </View>
          
          <View style={styles.dimensionCard}>
            <View style={styles.dimensionHeader}>
              <Text style={styles.dimensionName}>EFFICIENCY (Time Savings)</Text>
              <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.efficiencyScore) }]}>
                {calculations.efficiencyScore}% of benchmark
              </Text>
            </View>
            <View style={styles.dimensionCompare}>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>YOUR SAVINGS</Text>
                <Text style={styles.dimensionCompareValue}>{inputs.timeSavedPerEncounter} min</Text>
              </View>
              <Text style={styles.dimensionCompareArrow}>→</Text>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>BENCHMARK</Text>
                <Text style={[styles.dimensionCompareValue, { color: colors.emerald }]}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
              </View>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>GAP VALUE</Text>
                <Text style={[styles.dimensionCompareValue, { color: colors.emerald }]}>{formatCurrency(calculations.efficiencyGapValue)}</Text>
              </View>
            </View>
            <View style={styles.dimensionEducation}>
              <Text style={styles.dimensionText}>
                <Text style={styles.bold}>Why it matters: </Text>{DimensionEducation.efficiency.whyMatters}
              </Text>
              <Text style={styles.dimensionText}>
                <Text style={styles.bold}>What drives it: </Text>{DimensionEducation.efficiency.whatDrives}
              </Text>
            </View>
            {calculations.efficiencyScore < 90 && (
              <Text style={styles.dimensionInsight}>
                {DimensionEducation.efficiency.getInsight(calculations.efficiencyScore, calculations.efficiencyGapValue)}
              </Text>
            )}
          </View>
          
          <View style={styles.divider} />
          
          <DimensionProgressBar score={calculations.utilizationScore} label="Utilization" width={480} />
          <DimensionProgressBar score={calculations.efficiencyScore} label="Efficiency" width={480} />
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Abridge Value Realization Assessment</Text>
          <Text style={styles.footerText}>Page 2 of 6</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 3: DIMENSION DEEP-DIVES (Part 2) */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactTitle}>Quality & Satisfaction</Text>
          <Text style={styles.heroCompactSubtitle}>
            Revenue impact and provider experience—the outcomes that validate the investment
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <View style={styles.dimensionCard}>
            <View style={styles.dimensionHeader}>
              <Text style={styles.dimensionName}>QUALITY (wRVU Capture)</Text>
              <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.qualityScore) }]}>
                {calculations.qualityScore}% of benchmark
              </Text>
            </View>
            <View style={styles.dimensionCompare}>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>YOUR LIFT</Text>
                <Text style={styles.dimensionCompareValue}>+{inputs.wrvuLift}%</Text>
              </View>
              <Text style={styles.dimensionCompareArrow}>→</Text>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>BENCHMARK</Text>
                <Text style={[styles.dimensionCompareValue, { color: colors.emerald }]}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
              </View>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>GAP VALUE</Text>
                <Text style={[styles.dimensionCompareValue, { color: colors.emerald }]}>{formatCurrency(calculations.wrvuGapValue)}</Text>
              </View>
            </View>
            <View style={styles.dimensionEducation}>
              <Text style={styles.dimensionText}>
                <Text style={styles.bold}>Why it matters: </Text>{DimensionEducation.quality.whyMatters}
              </Text>
              <Text style={styles.dimensionText}>
                <Text style={styles.bold}>What drives it: </Text>{DimensionEducation.quality.whatDrives}
              </Text>
            </View>
            {calculations.qualityScore < 90 && (
              <Text style={styles.dimensionInsight}>
                {DimensionEducation.quality.getInsight(calculations.qualityScore, calculations.wrvuGapValue)}
              </Text>
            )}
          </View>
          
          <View style={styles.dimensionCard}>
            <View style={styles.dimensionHeader}>
              <Text style={styles.dimensionName}>SATISFACTION</Text>
              <Text style={[styles.dimensionScore, { color: getScoreColor(calculations.satisfactionScore) }]}>
                {calculations.satisfactionScore}% of benchmark
              </Text>
            </View>
            <View style={styles.dimensionCompare}>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>YOUR RATE</Text>
                <Text style={styles.dimensionCompareValue}>{inputs.satisfaction}%</Text>
              </View>
              <Text style={styles.dimensionCompareArrow}>→</Text>
              <View style={styles.dimensionCompareItem}>
                <Text style={styles.dimensionCompareLabel}>BENCHMARK</Text>
                <Text style={[styles.dimensionCompareValue, { color: colors.emerald }]}>{ABRIDGE_BENCHMARKS.satisfaction}%</Text>
              </View>
            </View>
            <View style={styles.dimensionEducation}>
              <Text style={styles.dimensionText}>
                <Text style={styles.bold}>Why it matters: </Text>{DimensionEducation.satisfaction.whyMatters}
              </Text>
              <Text style={styles.dimensionText}>
                <Text style={styles.bold}>What drives it: </Text>{DimensionEducation.satisfaction.whatDrives}
              </Text>
            </View>
            {calculations.satisfactionScore < 90 && (
              <Text style={styles.dimensionInsight}>
                {DimensionEducation.satisfaction.getInsight(calculations.satisfactionScore)}
              </Text>
            )}
          </View>
          
          <View style={styles.divider} />
          
          <DimensionProgressBar score={calculations.qualityScore} label="Quality (wRVU)" width={480} />
          <DimensionProgressBar score={calculations.satisfactionScore} label="Satisfaction" width={480} />
          
          {calculations.satisfactionScore < 70 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Attention Required</Text>
              <Text style={styles.warningText}>
                Low satisfaction often predicts declining utilization. Consider surveying providers to understand friction points before they impact adoption.
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Abridge Value Realization Assessment</Text>
          <Text style={styles.footerText}>Page 3 of 6</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 4: THE MATH */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactTitle}>How Each Gap is Calculated</Text>
          <Text style={styles.heroCompactSubtitle}>
            Every number traces back to your inputs and transparent assumptions
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>TRANSPARENT CALCULATIONS</Text>
          
          {calculations.utilizationGapValue > 0 && (
            <View style={styles.gapCard}>
              <View style={styles.gapCardHeader}>
                <Text style={styles.gapCardTitle}>Utilization Opportunity</Text>
                <Text style={styles.gapCardValue}>{formatCurrency(calculations.utilizationGapValue)}</Text>
              </View>
              <View style={styles.gapCardBody}>
                <Text style={styles.gapStep}>
                  <Text style={styles.gapStepLabel}>Step 1: </Text>
                  {formatNumber(inputs.annualEncounters || 150000)} encounters × {ABRIDGE_BENCHMARKS.utilization}% benchmark = {formatNumber(encountersAtBenchmark)} should be documented
                </Text>
                <Text style={styles.gapStep}>
                  <Text style={styles.gapStepLabel}>Step 2: </Text>
                  Gap of {formatNumber(calculations.encounterGap)} encounters not being documented today
                </Text>
                <Text style={styles.gapStep}>
                  <Text style={styles.gapStepLabel}>Step 3: </Text>
                  {formatNumber(calculations.encounterGap)} encounters × {ABRIDGE_BENCHMARKS.timeSavedAvg} min ÷ 60 = {formatNumber(Math.round(calculations.encounterGap * ABRIDGE_BENCHMARKS.timeSavedAvg / 60))} hours of lost time savings
                </Text>
                <Text style={styles.gapStep}>
                  <Text style={styles.gapStepLabel}>Step 4: </Text>
                  Hours × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% conversion = {formatCurrency(calculations.utilizationGapValue)}
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
                  <Text style={styles.gapStepLabel}>Step 1: </Text>
                  Benchmark saves {ABRIDGE_BENCHMARKS.timeSavedAvg} min vs your {inputs.timeSavedPerEncounter} min = {efficiencyTimeDiff.toFixed(1)} min gap
                </Text>
                <Text style={styles.gapStep}>
                  <Text style={styles.gapStepLabel}>Step 2: </Text>
                  {formatNumber(encountersAtBenchmark)} encounters × {efficiencyTimeDiff.toFixed(1)} min ÷ 60 = {formatNumber(efficiencyHoursGap)} hours
                </Text>
                <Text style={styles.gapStep}>
                  <Text style={styles.gapStepLabel}>Step 3: </Text>
                  {formatNumber(efficiencyHoursGap)} hours × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% = {formatCurrency(calculations.efficiencyGapValue)}
                </Text>
              </View>
            </View>
          )}
          
          {calculations.wrvuGapValue > 0 && (
            <View style={styles.gapCard}>
              <View style={styles.gapCardHeader}>
                <Text style={styles.gapCardTitle}>Quality Opportunity (wRVU)</Text>
                <Text style={styles.gapCardValue}>{formatCurrency(calculations.wrvuGapValue)}</Text>
              </View>
              <View style={styles.gapCardBody}>
                <Text style={styles.gapStep}>
                  <Text style={styles.gapStepLabel}>Step 1: </Text>
                  Benchmark achieves +{ABRIDGE_BENCHMARKS.wrvuLift}% vs your +{inputs.wrvuLift}% = {wrvuGapPercent.toFixed(1)}% gap
                </Text>
                <Text style={styles.gapStep}>
                  <Text style={styles.gapStepLabel}>Step 2: </Text>
                  {formatNumber(encountersAtBenchmark)} encounters × 1.5 avg wRVU × {wrvuGapPercent.toFixed(1)}% = {formatNumber(additionalWrvu)} additional wRVU
                </Text>
                <Text style={styles.gapStep}>
                  <Text style={styles.gapStepLabel}>Step 3: </Text>
                  {formatNumber(additionalWrvu)} wRVU × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution = {formatCurrency(calculations.wrvuGapValue)}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Annual Opportunity</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculations.annualGap)}</Text>
            <Text style={styles.totalSubtext}>
              Utilization ({formatCurrency(calculations.utilizationGapValue)}) + Efficiency ({formatCurrency(calculations.efficiencyGapValue)}) + Quality ({formatCurrency(calculations.wrvuGapValue)})
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Abridge Value Realization Assessment</Text>
          <Text style={styles.footerText}>Page 4 of 6</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 5: COST OF WAITING + OPTIMIZATION ROADMAP */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactTitle}>The Cost of Waiting</Text>
          <Text style={styles.heroCompactSubtitle}>
            Value gaps compound over time—here's what delay means in real dollars
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>TIMELINE ANALYSIS</Text>
          <Text style={styles.sectionTitle}>Gap Trajectory: Current State vs. Optimized</Text>
          
          <CostTrajectoryChart currentGap={calculations.annualGap} monthlyGap={monthlyGap} />
          
          <View style={{ flexDirection: 'row', marginBottom: 16, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 24 }}>
              <View style={{ width: 12, height: 3, backgroundColor: colors.red, marginRight: 6 }} />
              <Text style={{ fontSize: 8, color: colors.darkGray }}>Cumulative gap if no action taken</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 12, height: 3, backgroundColor: colors.emerald, marginRight: 6 }} />
              <Text style={{ fontSize: 8, color: colors.darkGray }}>Value captured with Abridge optimization</Text>
            </View>
          </View>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>If You Act Now</Text>
              <Text style={styles.metricValueGreen}>{formatCurrency(calculations.annualGap)}</Text>
              <Text style={styles.metricSub}>captured Year 1</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Wait 6 Months</Text>
              <Text style={[styles.metricValue, { color: colors.amber }]}>{formatCurrency(monthlyGap * 6)}</Text>
              <Text style={styles.metricSub}>left on the table</Text>
            </View>
            <View style={[styles.metricCard, styles.metricCardLast]}>
              <Text style={styles.metricLabel}>Wait 12 Months</Text>
              <Text style={[styles.metricValue, { color: colors.red }]}>{formatCurrency(calculations.annualGap)}</Text>
              <Text style={styles.metricSub}>full year lost</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.chapterLabel}>OPTIMIZATION ROADMAP</Text>
          <Text style={styles.sectionTitle}>Prioritized Actions with Estimated Impact</Text>
          <Text style={styles.sectionSubtitle}>
            Based on your dimension scores, here are the highest-impact opportunities ranked by potential value:
          </Text>
          
          {optimizationOpportunities.map((opp, i) => (
            <View key={i} style={styles.optimizationCard}>
              <View style={styles.optimizationHeader}>
                <Text style={styles.optimizationTitle}>{opp.title}</Text>
                <Text style={styles.optimizationValue}>+{formatCurrency(opp.potentialValue)}/year</Text>
              </View>
              <View style={styles.optimizationBody}>
                <View style={styles.optimizationCurrentTarget}>
                  <Text style={styles.optimizationLabel}>CURRENT</Text>
                  <Text style={styles.optimizationMetric}>{opp.current}</Text>
                </View>
                <View style={styles.optimizationCurrentTarget}>
                  <Text style={styles.optimizationLabel}>TARGET</Text>
                  <Text style={[styles.optimizationMetric, { color: colors.emerald }]}>{opp.target}</Text>
                </View>
              </View>
              <Text style={styles.optimizationAction}>{opp.action}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Abridge Value Realization Assessment</Text>
          <Text style={styles.footerText}>Page 5 of 6</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 6: KEY TAKEAWAYS + METHODOLOGY */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.heroCompact}>
          <Text style={styles.heroCompactTitle}>Key Takeaways & Next Steps</Text>
          <Text style={styles.heroCompactSubtitle}>
            A summary of findings and the methodology behind this assessment
          </Text>
        </View>
        
        <View style={styles.contentSection}>
          <Text style={styles.chapterLabel}>SUMMARY</Text>
          <Text style={styles.sectionTitle}>What This Assessment Tells Us</Text>
          
          <View style={styles.takeawayCard}>
            <View style={styles.takeawayContent}>
              <Text style={styles.takeawayTitle}>Your Realization Score: {calculations.realizationScore}% — {calculations.maturityLevel}</Text>
              <Text style={styles.takeawayText}>
                {getMaturityDescription(calculations.maturityLevel)}. The gap to benchmark represents {formatCurrency(calculations.annualGap)} annually.
              </Text>
            </View>
          </View>
          
          <View style={styles.takeawayCard}>
            <View style={styles.takeawayContent}>
              <Text style={styles.takeawayTitle}>Primary Opportunity: {dimensionRankings.lowest.name}</Text>
              <Text style={styles.takeawayText}>
                At {dimensionRankings.lowest.score}% of benchmark, this dimension has the most room for improvement. Focused intervention here will have the highest impact on overall value capture.
              </Text>
            </View>
          </View>
          
          <View style={styles.takeawayCard}>
            <View style={styles.takeawayContent}>
              <Text style={styles.takeawayTitle}>3-Year Cumulative Impact: {formatCurrency(calculations.threeYearGap)}</Text>
              <Text style={styles.takeawayText}>
                Value gaps compound. Every month of delay represents {formatCurrency(monthlyGap)} in unrealized value. The cost of inaction grows linearly with time.
              </Text>
            </View>
          </View>
          
          <View style={styles.takeawayCard}>
            <View style={styles.takeawayContent}>
              <Text style={styles.takeawayTitle}>Conservative Assumptions</Text>
              <Text style={styles.takeawayText}>
                All calculations use conservative conversion rates and attribution factors. Actual value may be higher, especially for organizations with strong operational execution.
              </Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.methodologySection}>
            <Text style={styles.methodologyTitle}>METHODOLOGY & ASSUMPTIONS</Text>
            <View style={styles.methodologyGrid}>
              <View style={styles.methodologyColumn}>
                <Text style={styles.methodologyColumnTitle}>Your Inputs</Text>
                <Text style={styles.methodologyItem}>• {inputs.providers} providers</Text>
                <Text style={styles.methodologyItem}>• {formatNumber(inputs.annualEncounters || 150000)} annual encounters</Text>
                <Text style={styles.methodologyItem}>• {inputs.utilization}% utilization rate</Text>
                <Text style={styles.methodologyItem}>• {inputs.timeSavedPerEncounter} min time savings</Text>
                <Text style={styles.methodologyItem}>• +{inputs.wrvuLift}% wRVU improvement</Text>
                <Text style={styles.methodologyItem}>• {inputs.satisfaction}% provider satisfaction</Text>
              </View>
              <View style={styles.methodologyColumn}>
                <Text style={styles.methodologyColumnTitle}>Abridge Benchmarks</Text>
                <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.utilization}% utilization</Text>
                <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.timeSavedAvg} min time savings</Text>
                <Text style={styles.methodologyItem}>• +{ABRIDGE_BENCHMARKS.wrvuLift}% wRVU improvement</Text>
                <Text style={styles.methodologyItem}>• {ABRIDGE_BENCHMARKS.satisfaction}% satisfaction</Text>
              </View>
              <View style={styles.methodologyColumn}>
                <Text style={styles.methodologyColumnTitle}>Value Assumptions</Text>
                <Text style={styles.methodologyItem}>• ${VALUE_ASSUMPTIONS.hourlyRate}/hr provider rate</Text>
                <Text style={styles.methodologyItem}>• {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% utilization conversion</Text>
                <Text style={styles.methodologyItem}>• {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% efficiency conversion</Text>
                <Text style={styles.methodologyItem}>• ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU value</Text>
                <Text style={styles.methodologyItem}>• {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% wRVU attribution</Text>
              </View>
            </View>
            <Text style={styles.methodologyNote}>
              Benchmarks represent median performance across Abridge deployments. Individual results vary based on specialty mix, EHR integration, and organizational factors. All calculations are transparent and adjustable—these are your numbers.
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Abridge Value Realization Assessment • Generated {today}</Text>
          <Text style={styles.footerText}>Page 6 of 6</Text>
        </View>
      </Page>
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export const generateAmbientPDFBlob = async (data: AmbientPDFData): Promise<Blob> => {
  const blob = await pdf(<AmbientPDFDocument {...data} />).toBlob();
  return blob;
};

export const generateAmbientPDF = async (data: AmbientPDFData): Promise<void> => {
  const blob = await generateAmbientPDFBlob(data);
  const clientSlug = data.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  saveAs(blob, `${clientSlug}-value-realization-assessment.pdf`);
};

export type { AmbientPDFData };
