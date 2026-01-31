import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Rect,
  Line,
  pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { MeasureState } from "@/lib/measureCalculator";
import { calculateMeasureResults, generateTrendData } from "@/lib/measureCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

const colors = {
  primary: "#EA2C00",
  coral: "#F07B5F",
  black: "#0f172a",
  darkGray: "#334155",
  mediumGray: "#64748b",
  lightGray: "#94a3b8",
  borderGray: "#e2e8f0",
  backgroundGray: "#f8fafc",
  white: "#FFFFFF",
  emerald: "#059669",
  emeraldLight: "#d1fae5",
  amber: "#d97706",
  amberLight: "#fef3c7",
  slate800: "#1e293b",
  slate900: "#0f172a",
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.black,
    backgroundColor: colors.white,
  },
  pageWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  fullHero: {
    backgroundColor: colors.slate900,
    flex: 1,
    padding: 56,
    justifyContent: "space-between",
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroMeta: {
    textAlign: "right",
  },
  heroMetaText: {
    fontSize: 8,
    color: colors.lightGray,
    marginBottom: 2,
  },
  heroCenter: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 40,
  },
  heroLabel: {
    fontSize: 9,
    color: colors.coral,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 16,
  },
  heroBigNumber: {
    fontSize: 72,
    fontWeight: "bold",
    color: colors.white,
    letterSpacing: -2,
    marginBottom: 8,
  },
  heroBigUnit: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.coral,
    marginBottom: 24,
  },
  heroNarrative: {
    fontSize: 14,
    color: colors.lightGray,
    lineHeight: 1.7,
    maxWidth: 400,
  },
  heroNarrativeHighlight: {
    color: colors.white,
    fontWeight: "bold",
  },
  heroBottom: {
    borderTopWidth: 1,
    borderTopColor: colors.slate800,
    paddingTop: 24,
    flexDirection: "row",
  },
  heroStat: {
    marginRight: 48,
  },
  heroStatLabel: {
    fontSize: 8,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.white,
  },

  compactHero: {
    backgroundColor: colors.slate900,
    padding: 40,
    paddingTop: 32,
    paddingBottom: 28,
  },
  compactHeroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactHeroLeft: {
    flex: 1,
  },
  compactHeroLabel: {
    fontSize: 8,
    color: colors.coral,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  compactHeroTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.white,
    letterSpacing: -0.5,
  },
  compactHeroRight: {
    alignItems: "flex-end",
  },
  compactHeroNumber: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.coral,
  },
  compactHeroUnit: {
    fontSize: 10,
    color: colors.lightGray,
    marginTop: 2,
  },

  content: {
    flex: 1,
    padding: 48,
    paddingTop: 36,
  },

  sectionLabel: {
    fontSize: 8,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  headline: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 11,
    color: colors.mediumGray,
    lineHeight: 1.6,
    marginBottom: 28,
    maxWidth: 440,
  },

  prose: {
    fontSize: 11,
    color: colors.darkGray,
    lineHeight: 1.8,
    marginBottom: 20,
  },
  proseBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  proseHighlight: {
    color: colors.primary,
    fontWeight: "bold",
  },

  comparison: {
    flexDirection: "row",
    marginBottom: 32,
  },
  comparisonSide: {
    flex: 1,
    padding: 20,
  },
  comparisonLeft: {
    backgroundColor: colors.backgroundGray,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  comparisonRight: {
    backgroundColor: colors.slate900,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  comparisonLabel: {
    fontSize: 8,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  comparisonLabelLight: {
    fontSize: 8,
    color: colors.lightGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.darkGray,
  },
  comparisonValueLight: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.white,
  },
  comparisonUnit: {
    fontSize: 12,
    color: colors.mediumGray,
    marginTop: 4,
  },
  comparisonUnitLight: {
    fontSize: 12,
    color: colors.lightGray,
    marginTop: 4,
  },
  comparisonDelta: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.emerald,
    marginTop: 8,
  },

  trendContainer: {
    marginBottom: 28,
  },
  trendTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 16,
  },
  trendLegend: {
    flexDirection: "row",
    marginTop: 12,
  },
  trendLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  trendLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  trendLegendText: {
    fontSize: 8,
    color: colors.mediumGray,
  },

  valueBlock: {
    backgroundColor: colors.backgroundGray,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
  },
  valueBlockLabel: {
    fontSize: 9,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  valueBlockRange: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
  },
  valueBlockNote: {
    fontSize: 9,
    color: colors.mediumGray,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: 1.5,
  },

  allocationSection: {
    marginBottom: 24,
  },
  allocationItem: {
    marginBottom: 20,
  },
  allocationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  allocationName: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
  },
  allocationValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  allocationBar: {
    marginBottom: 6,
  },
  allocationDetail: {
    fontSize: 9,
    color: colors.mediumGray,
    lineHeight: 1.5,
  },

  insightBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    backgroundColor: "#fef7f5",
    padding: 16,
    marginBottom: 20,
  },
  insightText: {
    fontSize: 10,
    color: colors.darkGray,
    lineHeight: 1.7,
    fontStyle: "italic",
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 24,
  },

  grid2: {
    flexDirection: "row",
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    paddingRight: 20,
  },
  gridLabel: {
    fontSize: 8,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  gridValueGreen: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.emerald,
  },

  methodology: {
    marginTop: 16,
  },
  methodologyTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.darkGray,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  methodologyGrid: {
    flexDirection: "row",
  },
  methodologyColumn: {
    flex: 1,
    paddingRight: 20,
  },
  methodologyItem: {
    fontSize: 8,
    color: colors.mediumGray,
    lineHeight: 1.6,
    marginBottom: 2,
  },
  disclaimer: {
    fontSize: 7,
    color: colors.lightGray,
    lineHeight: 1.5,
    marginTop: 20,
    fontStyle: "italic",
  },

  footer: {
    marginTop: "auto",
    marginLeft: 48,
    marginRight: 48,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },
});

interface MeasurePDFData {
  state: MeasureState;
  clientName?: string;
  preparedBy?: string;
}

const formatCurrency = (num: number): string => {
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${Math.round(num).toLocaleString()}`;
};

const formatNumber = (num: number): string => Math.round(num).toLocaleString();

const AllocationBar = ({ percent, color, width = 420 }: { percent: number; color: string; width?: number }) => {
  const barWidth = Math.max((percent / 100) * width, 4);
  return (
    <Svg width={width} height={6}>
      <Rect x={0} y={0} width={width} height={6} fill={colors.borderGray} rx={3} />
      <Rect x={0} y={0} width={barWidth} height={6} fill={color} rx={3} />
    </Svg>
  );
};

const SimpleTrendChart = ({
  data,
  width = 420,
  height = 120,
  color = colors.emerald,
}: {
  data: { month: string; abridge: number; baseline: number }[];
  width?: number;
  height?: number;
  color?: string;
}) => {
  if (data.length === 0) return null;

  const padding = { left: 36, right: 16, top: 16, bottom: 24 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = data.flatMap((d) => [d.abridge, d.baseline]);
  const minValue = Math.min(...allValues) * 0.85;
  const maxValue = Math.max(...allValues) * 1.1;
  const range = maxValue - minValue || 1;

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };
  const getY = (value: number) =>
    padding.top + chartHeight - ((value - minValue) / range) * chartHeight;

  return (
    <Svg width={width} height={height}>
      <Rect
        x={padding.left}
        y={padding.top}
        width={chartWidth}
        height={chartHeight}
        fill={colors.backgroundGray}
        rx={4}
      />

      <Line
        x1={padding.left}
        y1={getY(data[0].baseline)}
        x2={padding.left + chartWidth}
        y2={getY(data[0].baseline)}
        stroke={colors.lightGray}
        strokeWidth={1}
        strokeDasharray="4,3"
      />

      {data.map((d, i) => {
        if (i === 0) return null;
        const prev = data[i - 1];
        return (
          <Line
            key={`line-${i}`}
            x1={getX(i - 1)}
            y1={getY(prev.abridge)}
            x2={getX(i)}
            y2={getY(d.abridge)}
            stroke={color}
            strokeWidth={2.5}
          />
        );
      })}

      {data.map((d, i) => (
        <Rect
          key={`dot-${i}`}
          x={getX(i) - 4}
          y={getY(d.abridge) - 4}
          width={8}
          height={8}
          fill={color}
          rx={4}
        />
      ))}

      {data.map((d, i) => (
        <Text
          key={`label-${i}`}
          x={getX(i)}
          y={height - 6}
          style={{ fontSize: 7, fill: colors.mediumGray, textAnchor: "middle" }}
        >
          {d.month}
        </Text>
      ))}
    </Svg>
  );
};

const MeasurePDFDocument = ({ state, clientName, preparedBy }: MeasurePDFData) => {
  const results = calculateMeasureResults(state);
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const displayPreparedBy = preparedBy || "Abridge Partner Success";

  const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  const docValueConservative =
    wrvuDelta * state.deployment.abridgeEncounters * state.calibration.conversionFactor * 0.5;
  const docValueOptimistic =
    wrvuDelta * state.deployment.abridgeEncounters * state.calibration.conversionFactor * 0.75;

  const totalValueLow = results.timeReallocatedTotal + docValueConservative;
  const totalValueHigh = results.timeReallocatedTotal + docValueOptimistic;

  const projectionMultiplier = 2;
  const projectedProviders = state.deployment.providers * projectionMultiplier;
  const projectedHours = Math.round(results.totalHoursSaved * projectionMultiplier);
  const projectedValueLow = totalValueLow * projectionMultiplier;
  const projectedValueHigh = totalValueHigh * projectionMultiplier;

  const timeInNotesTrend = state.trendConfig.enabled
    ? generateTrendData(state, "timeInNotes")
    : [];
  const hasTrends = state.trendConfig.enabled && timeInNotesTrend.length >= 2;

  const totalPages = 5;

  return (
    <Document>
      {/* PAGE 1: THE STORY */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.fullHero}>
          <View style={styles.heroTop}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{today}</Text>
              <Text style={styles.heroMetaText}>Prepared by {displayPreparedBy}</Text>
            </View>
          </View>

          <View style={styles.heroCenter}>
            <Text style={styles.heroLabel}>Your Value Story</Text>
            <Text style={styles.heroBigNumber}>{formatNumber(Math.round(results.totalHoursSaved))}</Text>
            <Text style={styles.heroBigUnit}>hours reclaimed</Text>
            <Text style={styles.heroNarrative}>
              In {state.deployment.monthsOnAbridge} months, your{" "}
              <Text style={styles.heroNarrativeHighlight}>{state.deployment.providers} providers</Text> reclaimed this
              time from documentation. Not a projection. Not a benchmark.{" "}
              <Text style={styles.heroNarrativeHighlight}>Your data.</Text>
            </Text>
          </View>

          <View style={styles.heroBottom}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Encounters</Text>
              <Text style={styles.heroStatValue}>{formatNumber(state.deployment.abridgeEncounters)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Utilization</Text>
              <Text style={styles.heroStatValue}>{Math.round(state.deployment.utilizationRate)}%</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Per Provider / Week</Text>
              <Text style={styles.heroStatValue}>{results.qualityHoursPerWeek.toFixed(1)}h</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 2: THE PROOF */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.compactHero}>
            <View style={styles.compactHeroRow}>
              <View style={styles.compactHeroLeft}>
                <Text style={styles.compactHeroLabel}>The Proof</Text>
                <Text style={styles.compactHeroTitle}>Same Providers. Different Outcomes.</Text>
              </View>
              <View style={styles.compactHeroRight}>
                <Text style={styles.compactHeroNumber}>-{results.timeInNotesDelta}</Text>
                <Text style={styles.compactHeroUnit}>minutes per encounter</Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.prose}>
              This isn't a comparison against industry benchmarks or a different health system.{" "}
              <Text style={styles.proseBold}>
                Your providers are their own control group.
              </Text>{" "}
              Of {formatNumber(state.deployment.totalEncounters)} encounters,{" "}
              {formatNumber(state.deployment.abridgeEncounters)} used Abridge. The rest didn't. Same
              physicians. Same patient panels. Different documentation experience.
            </Text>

            <Text style={styles.sectionLabel}>Time in Notes</Text>
            <View style={styles.comparison}>
              <View style={[styles.comparisonSide, styles.comparisonLeft]}>
                <Text style={styles.comparisonLabel}>Without Abridge</Text>
                <Text style={styles.comparisonValue}>{state.timeEfficiency.timeInNotesWithout}</Text>
                <Text style={styles.comparisonUnit}>minutes per encounter</Text>
              </View>
              <View style={[styles.comparisonSide, styles.comparisonRight]}>
                <Text style={styles.comparisonLabelLight}>With Abridge</Text>
                <Text style={styles.comparisonValueLight}>{state.timeEfficiency.timeInNotesWith}</Text>
                <Text style={styles.comparisonUnitLight}>minutes per encounter</Text>
                <Text style={styles.comparisonDelta}>
                  {Math.round(results.timeInNotesDeltaPercent)}% faster
                </Text>
              </View>
            </View>

            {hasTrends && (
              <View style={styles.trendContainer}>
                <Text style={styles.trendTitle}>Documentation Time Over {state.deployment.monthsOnAbridge} Months</Text>
                <SimpleTrendChart data={timeInNotesTrend} color={colors.emerald} />
                <View style={styles.trendLegend}>
                  <View style={styles.trendLegendItem}>
                    <View style={[styles.trendLegendDot, { backgroundColor: colors.emerald }]} />
                    <Text style={styles.trendLegendText}>With Abridge</Text>
                  </View>
                  <View style={styles.trendLegendItem}>
                    <View style={[styles.trendLegendDot, { backgroundColor: colors.lightGray }]} />
                    <Text style={styles.trendLegendText}>Baseline</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Same-Day Closure</Text>
                <Text style={styles.gridValueGreen}>
                  {state.timeEfficiency.sameDayClosureWith}%{" "}
                  <Text style={{ color: colors.mediumGray, fontSize: 10, fontWeight: "normal" }}>
                    (was {state.timeEfficiency.sameDayClosureWithout}%)
                  </Text>
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Work Outside Hours</Text>
                <Text style={styles.gridValueGreen}>
                  {state.timeEfficiency.workOutsideWith}h{" "}
                  <Text style={{ color: colors.mediumGray, fontSize: 10, fontWeight: "normal" }}>
                    (was {state.timeEfficiency.workOutsideWithout}h)
                  </Text>
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 2 of {totalPages}</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 3: WHERE VALUE LANDS */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.compactHero}>
            <View style={styles.compactHeroRow}>
              <View style={styles.compactHeroLeft}>
                <Text style={styles.compactHeroLabel}>Value Allocation</Text>
                <Text style={styles.compactHeroTitle}>Where Did the Time Go?</Text>
              </View>
              <View style={styles.compactHeroRight}>
                <Text style={styles.compactHeroNumber}>{formatNumber(Math.round(results.totalHoursSaved))}</Text>
                <Text style={styles.compactHeroUnit}>hours to allocate</Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.prose}>
              Time saved is only valuable when it goes somewhere. Here's how your organization is
              deploying the {formatNumber(Math.round(results.totalHoursSaved))} hours reclaimed from
              documentation.
            </Text>

            <View style={styles.allocationSection}>
              {state.allocation.hardSavingsPercent > 0 && (
                <View style={styles.allocationItem}>
                  <View style={styles.allocationHeader}>
                    <Text style={styles.allocationName}>Hard Savings</Text>
                    <Text style={[styles.allocationValue, { color: colors.emerald }]}>
                      {formatCurrency(results.hardSavingsValue)}
                    </Text>
                  </View>
                  <View style={styles.allocationBar}>
                    <AllocationBar percent={state.allocation.hardSavingsPercent} color={colors.emerald} />
                  </View>
                  <Text style={styles.allocationDetail}>
                    {state.allocation.hardSavingsPercent}% of time ({formatNumber(Math.round(results.hardSavingsHours))} hours) 
                    converted to cost reduction at ${state.calibration.otHourlyRate}/hour.
                  </Text>
                </View>
              )}

              {state.allocation.capacityPercent > 0 && (
                <View style={styles.allocationItem}>
                  <View style={styles.allocationHeader}>
                    <Text style={styles.allocationName}>Capacity</Text>
                    <Text style={[styles.allocationValue, { color: colors.primary }]}>
                      {formatCurrency(results.capacityValue)}
                    </Text>
                  </View>
                  <View style={styles.allocationBar}>
                    <AllocationBar percent={state.allocation.capacityPercent} color={colors.primary} />
                  </View>
                  <Text style={styles.allocationDetail}>
                    {state.allocation.capacityPercent}% of time enabled{" "}
                    {formatNumber(Math.round(results.capacityVisits))} additional visits at ${state.calibration.revenuePerVisit}/visit.
                  </Text>
                </View>
              )}

              {state.allocation.qualityOfLifePercent > 0 && (
                <View style={styles.allocationItem}>
                  <View style={styles.allocationHeader}>
                    <Text style={styles.allocationName}>Quality of Life</Text>
                    <Text style={[styles.allocationValue, { color: colors.amber }]}>
                      {results.qualityHoursPerWeek.toFixed(1)}h/week
                    </Text>
                  </View>
                  <View style={styles.allocationBar}>
                    <AllocationBar percent={state.allocation.qualityOfLifePercent} color={colors.amber} />
                  </View>
                  <Text style={styles.allocationDetail}>
                    {state.allocation.qualityOfLifePercent}% of time ({formatNumber(Math.round(results.qualityHours))} hours) 
                    returned to providers as personal time.
                  </Text>
                </View>
              )}

              {state.allocation.hardSavingsPercent === 0 &&
                state.allocation.capacityPercent === 0 &&
                state.allocation.qualityOfLifePercent === 0 && (
                  <View style={styles.insightBox}>
                    <Text style={styles.insightText}>
                      Allocation not yet configured. The {formatNumber(Math.round(results.totalHoursSaved))} hours
                      saved can be distributed across hard savings, capacity, and quality of life
                      based on how your organization is actually using the time.
                    </Text>
                  </View>
                )}
            </View>

            {state.allocation.qualityOfLifePercent >= 50 && (
              <View style={styles.insightBox}>
                <Text style={styles.insightText}>
                  When quality of life is the primary allocation, the value extends beyond the
                  calculator. Physician replacement costs run $300K-$500K. If improved wellbeing
                  prevents even one departure, the ROI story changes entirely.
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Documentation Quality</Text>
            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>wRVU per Encounter</Text>
                <Text style={styles.gridValueGreen}>
                  {state.documentationQuality.wrvuWith.toFixed(2)}{" "}
                  <Text style={{ color: colors.mediumGray, fontSize: 10, fontWeight: "normal" }}>
                    (+{wrvuDelta.toFixed(2)} vs baseline)
                  </Text>
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Documentation Value</Text>
                <Text style={styles.gridValue}>
                  {formatCurrency(docValueConservative)} – {formatCurrency(docValueOptimistic)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 3 of {totalPages}</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 4: THE NUMBER */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.compactHero}>
            <View style={styles.compactHeroRow}>
              <View style={styles.compactHeroLeft}>
                <Text style={styles.compactHeroLabel}>Total Value Created</Text>
                <Text style={styles.compactHeroTitle}>The Bottom Line</Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.valueBlock}>
              <Text style={styles.valueBlockLabel}>Annual Value (Conservative to Optimistic)</Text>
              <Text style={styles.valueBlockRange}>
                {formatCurrency(totalValueLow)} – {formatCurrency(totalValueHigh)}
              </Text>
              <Text style={styles.valueBlockNote}>
                Time reallocation value ({formatCurrency(results.timeReallocatedTotal)}) plus
                documentation quality improvement ({formatCurrency(docValueConservative)} –{" "}
                {formatCurrency(docValueOptimistic)}, using 50-75% attribution).
              </Text>
            </View>

            <Text style={styles.sectionLabel}>What If You Expanded?</Text>
            <Text style={styles.headline}>At {projectedProviders} Providers</Text>
            <Text style={styles.subheadline}>
              You've proven the model with {state.deployment.providers} providers. If you scaled to{" "}
              {projectedProviders} while maintaining current utilization, here's the projection.
            </Text>

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Projected Hours Saved</Text>
                <Text style={styles.gridValueGreen}>{formatNumber(projectedHours)}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Projected Annual Value</Text>
                <Text style={styles.gridValue}>
                  {formatCurrency(projectedValueLow)} – {formatCurrency(projectedValueHigh)}
                </Text>
              </View>
            </View>

            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                Unlike scribe programs that scale linearly with headcount, AI documentation scales
                differently. Per-provider investment decreases as adoption grows, while value
                creation remains consistent per encounter. The {state.deployment.providers}-provider
                proof of concept demonstrates what {projectedProviders} providers could deliver.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Image src={abridgeLogoPath} style={{ width: 70 }} />
            <Text style={styles.footerText}>Page 4 of {totalPages}</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 5: METHODOLOGY */}
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={styles.compactHero}>
            <View style={styles.compactHeroRow}>
              <View style={styles.compactHeroLeft}>
                <Text style={styles.compactHeroLabel}>Methodology</Text>
                <Text style={styles.compactHeroTitle}>How We Got Here</Text>
              </View>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.prose}>
              Transparency matters. These numbers come from your data, processed through a
              straightforward methodology. No hidden assumptions, no industry-wide benchmarks
              masquerading as your results.
            </Text>

            <View style={styles.methodology}>
              <Text style={styles.methodologyTitle}>Your Inputs</Text>
              <View style={styles.methodologyGrid}>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>
                    {state.deployment.providers} providers over {state.deployment.monthsOnAbridge} months
                  </Text>
                  <Text style={styles.methodologyItem}>
                    {formatNumber(state.deployment.totalEncounters)} total encounters
                  </Text>
                  <Text style={styles.methodologyItem}>
                    {formatNumber(state.deployment.abridgeEncounters)} Abridge encounters (
                    {Math.round(state.deployment.utilizationRate)}% utilization)
                  </Text>
                </View>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>
                    Time in notes: {state.timeEfficiency.timeInNotesWithout} min → {state.timeEfficiency.timeInNotesWith} min
                  </Text>
                  <Text style={styles.methodologyItem}>
                    wRVU: {state.documentationQuality.wrvuWithout.toFixed(2)} → {state.documentationQuality.wrvuWith.toFixed(2)}
                  </Text>
                  <Text style={styles.methodologyItem}>
                    Same-day closure: {state.timeEfficiency.sameDayClosureWithout}% → {state.timeEfficiency.sameDayClosureWith}%
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.methodology}>
              <Text style={styles.methodologyTitle}>Value Assumptions</Text>
              <View style={styles.methodologyGrid}>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>
                    Provider hourly rate: ${state.calibration.otHourlyRate}
                  </Text>
                  <Text style={styles.methodologyItem}>
                    Minutes per visit: {state.calibration.minutesPerVisit}
                  </Text>
                </View>
                <View style={styles.methodologyColumn}>
                  <Text style={styles.methodologyItem}>
                    Revenue per visit: ${state.calibration.revenuePerVisit}
                  </Text>
                  <Text style={styles.methodologyItem}>
                    wRVU conversion: ${state.calibration.conversionFactor}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.methodology}>
              <Text style={styles.methodologyTitle}>Key Calculations</Text>
              <View style={styles.methodologyGrid}>
                <View style={[styles.methodologyColumn, { flex: 2 }]}>
                  <Text style={styles.methodologyItem}>
                    Time Saved = (Time Without - Time With) x Abridge Encounters / 60
                  </Text>
                  <Text style={styles.methodologyItem}>
                    Hard Savings = Time Saved x Allocation % x Hourly Rate
                  </Text>
                  <Text style={styles.methodologyItem}>
                    Capacity Value = Time Saved x Allocation % / Min per Visit x Revenue per Visit
                  </Text>
                  <Text style={styles.methodologyItem}>
                    wRVU Value = wRVU Delta x Encounters x Conversion Factor x Attribution %
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.disclaimer}>
              This analysis is for informational purposes. Documentation value uses a 50-75%
              attribution range to acknowledge uncertainty about causation. These are your results
              based on your data, but past performance does not guarantee future results. Consult
              with your finance team before making investment decisions.
            </Text>
          </View>

          <View style={styles.footer}>
            <View>
              <Image src={abridgeLogoPath} style={{ width: 70, marginBottom: 4 }} />
              <Text style={styles.footerText}>Questions? Reach out to your Abridge Partner Success team.</Text>
            </View>
            <Text style={styles.footerText}>Page 5 of {totalPages}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export async function generateMeasurePDF(
  state: MeasureState,
  clientName?: string,
  preparedBy?: string
): Promise<void> {
  const blob = await pdf(
    <MeasurePDFDocument state={state} clientName={clientName} preparedBy={preparedBy} />
  ).toBlob();

  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  const fileName = `abridge-value-story-${new Date().toISOString().split("T")[0]}.pdf`;

  if (isMobile) {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    saveAs(blob, fileName);
  }
}

export default MeasurePDFDocument;
