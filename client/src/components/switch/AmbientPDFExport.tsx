import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { SwitchInputs, SwitchCalculations } from "@/lib/switchGapCalculator";
import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

const colors = {
  coral: "#E85A4F",
  coralLight: "#FEF2F2",
  coralDark: "#991B1B",
  coralBorder: "#FECACA",
  green: "#059669",
  greenLight: "#ECFDF5",
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
    padding: 32,
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
    borderBottomColor: colors.coral,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
  },
  headerDate: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
  },

  metricsStrip: {
    flexDirection: "row",
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  metricItem: {
    flex: 1,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: colors.borderGray,
    alignItems: "center",
  },
  metricItemLast: {
    flex: 1,
    padding: 10,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  metricValueHighlight: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.coral,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  executiveSummary: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
  },
  execSummaryTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.coral,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  execSummaryText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    marginTop: 10,
  },
  sectionNumber: {
    backgroundColor: colors.coral,
    color: colors.white,
    width: 16,
    height: 16,
    borderRadius: 8,
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
    marginRight: 6,
    paddingTop: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContext: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 8,
  },

  performanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  performanceCell: {
    width: "50%",
    padding: 8,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderGray,
    backgroundColor: colors.white,
  },
  performanceCellLast: {
    borderRightWidth: 0,
  },
  performanceCellBottom: {
    borderBottomWidth: 0,
  },
  performanceLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  performanceValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  performanceYou: {
    fontSize: 8,
    color: colors.black,
  },
  performanceBenchmark: {
    fontSize: 8,
    color: colors.mediumGray,
  },
  performanceBar: {
    height: 6,
    backgroundColor: colors.borderGray,
    borderRadius: 3,
    overflow: "hidden",
  },
  performanceBarFill: {
    height: "100%",
    backgroundColor: colors.coral,
    borderRadius: 3,
  },
  performancePercent: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginTop: 3,
  },

  scoreSummary: {
    backgroundColor: colors.coralLight,
    padding: 8,
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  scoreSummaryText: {
    fontSize: 9,
    color: colors.darkGray,
  },
  scoreSummaryValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.coral,
  },

  gapTable: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  gapRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    alignItems: "center",
  },
  gapRowLast: {
    borderBottomWidth: 0,
  },
  gapName: {
    width: "25%",
    padding: 6,
    backgroundColor: colors.backgroundGray,
  },
  gapNameText: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
  },
  gapChange: {
    width: "22%",
    padding: 6,
  },
  gapChangeText: {
    fontSize: 8,
    color: colors.darkGray,
  },
  gapImpact: {
    width: "30%",
    padding: 6,
  },
  gapImpactText: {
    fontSize: 7,
    color: colors.darkGray,
  },
  gapValue: {
    width: "23%",
    padding: 6,
    alignItems: "flex-end",
  },
  gapValueText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.green,
  },

  gapTotal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: colors.black,
  },
  gapTotalLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginRight: 12,
  },
  gapTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.green,
  },

  timelineContainer: {
    flexDirection: "row",
    marginBottom: 6,
    gap: 4,
  },
  timelineYear: {
    flex: 1,
    padding: 8,
    backgroundColor: colors.backgroundGray,
    alignItems: "center",
    borderRadius: 4,
  },
  timelineYearLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    marginBottom: 2,
  },
  timelineYearValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
  },
  timelineCumulative: {
    backgroundColor: colors.greenLight,
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.green,
    marginTop: 4,
  },
  timelineCumulativeLabel: {
    fontSize: 7,
    color: colors.green,
    fontWeight: "bold",
  },
  timelineCumulativeValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.green,
  },
  monthlyCallout: {
    backgroundColor: colors.coralLight,
    padding: 8,
    borderRadius: 4,
    marginTop: 6,
    alignItems: "center",
  },
  monthlyCalloutText: {
    fontSize: 8,
    color: colors.coral,
    fontWeight: "bold",
  },

  takeawaysContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  takeawaysTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  takeawayItem: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  takeawayBullet: {
    fontSize: 8,
    color: colors.coral,
    marginRight: 6,
    width: 8,
  },
  takeawayText: {
    fontSize: 8,
    color: colors.darkGray,
    flex: 1,
    lineHeight: 1.4,
  },

  methodology: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 3,
  },
  methodologyText: {
    fontSize: 6,
    color: colors.lightGray,
    lineHeight: 1.4,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 6,
    color: colors.lightGray,
  },
});

interface AmbientPDFData {
  inputs: SwitchInputs;
  calculations: SwitchCalculations;
}

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num.toLocaleString()}`;
};

const formatNumber = (num: number): string => num.toLocaleString();

const AmbientPDFDocument = ({ inputs, calculations }: AmbientPDFData) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const largestGapName = 
    calculations.utilizationGapValue >= calculations.efficiencyGapValue && 
    calculations.utilizationGapValue >= calculations.wrvuGapValue
      ? "Utilization"
      : calculations.efficiencyGapValue >= calculations.wrvuGapValue
      ? "Efficiency"
      : "Quality";

  const encounterGapCount = Math.round(
    (inputs.annualEncounters || 150000) * 
    ((ABRIDGE_BENCHMARKS.utilization - inputs.utilization) / 100)
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.headerTitle}>Value Realization Assessment</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
        </View>

        <View style={styles.metricsStrip}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValueHighlight}>{formatCurrency(calculations.annualGap)}</Text>
            <Text style={styles.metricLabel}>Annual Gap</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{calculations.realizationScore}%</Text>
            <Text style={styles.metricLabel}>Realized</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{formatCurrency(calculations.threeYearGap)}</Text>
            <Text style={styles.metricLabel}>3-Year Gap</Text>
          </View>
          <View style={styles.metricItemLast}>
            <Text style={styles.metricValue}>{calculations.maturityLevel}</Text>
            <Text style={styles.metricLabel}>Stage</Text>
          </View>
        </View>

        <View style={styles.executiveSummary}>
          <Text style={styles.execSummaryTitle}>EXECUTIVE SUMMARY</Text>
          <Text style={styles.execSummaryText}>
            Based on your inputs, your organization is capturing{" "}
            <Text style={{ fontWeight: "bold" }}>{calculations.realizationScore}%</Text> of the
            potential value from ambient AI — leaving an estimated{" "}
            <Text style={{ fontWeight: "bold" }}>{formatCurrency(calculations.annualGap)}</Text> per
            year unrealized. Over 3 years, this gap represents{" "}
            <Text style={{ fontWeight: "bold" }}>{formatCurrency(calculations.threeYearGap)}</Text> in
            value that could be captured through improved utilization, efficiency, and documentation
            quality.
          </Text>
          <Text style={styles.execSummaryText}>
            You are in the "<Text style={{ fontWeight: "bold" }}>{calculations.maturityLevel}</Text>"
            stage of ambient AI value realization. Most organizations plateau here without focused
            optimization.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>1</Text>
          <Text style={styles.sectionTitle}>Your Performance vs. Benchmarks</Text>
        </View>

        <View style={styles.performanceGrid}>
          <View style={styles.performanceCell}>
            <Text style={styles.performanceLabel}>Utilization</Text>
            <View style={styles.performanceValues}>
              <Text style={styles.performanceYou}>You: {inputs.utilization}%</Text>
              <Text style={styles.performanceBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.utilization}%</Text>
            </View>
            <View style={styles.performanceBar}>
              <View style={[styles.performanceBarFill, { width: `${calculations.utilizationScore}%` }]} />
            </View>
            <Text style={styles.performancePercent}>{calculations.utilizationScore}%</Text>
          </View>
          <View style={[styles.performanceCell, styles.performanceCellLast]}>
            <Text style={styles.performanceLabel}>Efficiency</Text>
            <View style={styles.performanceValues}>
              <Text style={styles.performanceYou}>You: {inputs.timeSavedPerEncounter} min</Text>
              <Text style={styles.performanceBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
            </View>
            <View style={styles.performanceBar}>
              <View style={[styles.performanceBarFill, { width: `${calculations.efficiencyScore}%` }]} />
            </View>
            <Text style={styles.performancePercent}>{calculations.efficiencyScore}%</Text>
          </View>
          <View style={[styles.performanceCell, styles.performanceCellBottom]}>
            <Text style={styles.performanceLabel}>Quality (wRVU)</Text>
            <View style={styles.performanceValues}>
              <Text style={styles.performanceYou}>You: +{inputs.wrvuLift}%</Text>
              <Text style={styles.performanceBenchmark}>Benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
            </View>
            <View style={styles.performanceBar}>
              <View style={[styles.performanceBarFill, { width: `${calculations.qualityScore}%` }]} />
            </View>
            <Text style={styles.performancePercent}>{calculations.qualityScore}%</Text>
          </View>
          <View style={[styles.performanceCell, styles.performanceCellLast, styles.performanceCellBottom]}>
            <Text style={styles.performanceLabel}>Satisfaction</Text>
            <View style={styles.performanceValues}>
              <Text style={styles.performanceYou}>You: {inputs.satisfaction}%</Text>
              <Text style={styles.performanceBenchmark}>Benchmark: {ABRIDGE_BENCHMARKS.satisfaction}%</Text>
            </View>
            <View style={styles.performanceBar}>
              <View style={[styles.performanceBarFill, { width: `${calculations.satisfactionScore}%` }]} />
            </View>
            <Text style={styles.performancePercent}>{calculations.satisfactionScore}%</Text>
          </View>
        </View>

        <View style={styles.scoreSummary}>
          <Text style={styles.scoreSummaryText}>Average Score: </Text>
          <Text style={styles.scoreSummaryValue}>{calculations.realizationScore}%</Text>
          <Text style={styles.scoreSummaryText}> — "{calculations.maturityLevel}" stage</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>2</Text>
          <Text style={styles.sectionTitle}>The Gap Breakdown</Text>
        </View>
        <Text style={styles.sectionContext}>
          Each gap represents value that exists but isn't being captured:
        </Text>

        <View style={styles.gapTable}>
          <View style={styles.gapRow}>
            <View style={styles.gapName}>
              <Text style={styles.gapNameText}>Utilization Gap</Text>
            </View>
            <View style={styles.gapChange}>
              <Text style={styles.gapChangeText}>{inputs.utilization}% → {ABRIDGE_BENCHMARKS.utilization}%</Text>
            </View>
            <View style={styles.gapImpact}>
              <Text style={styles.gapImpactText}>+{formatNumber(encounterGapCount)} encounters</Text>
            </View>
            <View style={styles.gapValue}>
              <Text style={styles.gapValueText}>{formatCurrency(calculations.utilizationGapValue)}</Text>
            </View>
          </View>
          <View style={styles.gapRow}>
            <View style={styles.gapName}>
              <Text style={styles.gapNameText}>Efficiency Gap</Text>
            </View>
            <View style={styles.gapChange}>
              <Text style={styles.gapChangeText}>{inputs.timeSavedPerEncounter} → {ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
            </View>
            <View style={styles.gapImpact}>
              <Text style={styles.gapImpactText}>+{formatNumber(calculations.efficiencyGapHours)} hours</Text>
            </View>
            <View style={styles.gapValue}>
              <Text style={styles.gapValueText}>{formatCurrency(calculations.efficiencyGapValue)}</Text>
            </View>
          </View>
          <View style={[styles.gapRow, styles.gapRowLast]}>
            <View style={styles.gapName}>
              <Text style={styles.gapNameText}>Quality Gap</Text>
            </View>
            <View style={styles.gapChange}>
              <Text style={styles.gapChangeText}>+{inputs.wrvuLift}% → +{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
            </View>
            <View style={styles.gapImpact}>
              <Text style={styles.gapImpactText}>+{ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift}% wRVU lift</Text>
            </View>
            <View style={styles.gapValue}>
              <Text style={styles.gapValueText}>{formatCurrency(calculations.wrvuGapValue)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.gapTotal}>
          <Text style={styles.gapTotalLabel}>TOTAL ANNUAL GAP:</Text>
          <Text style={styles.gapTotalValue}>{formatCurrency(calculations.annualGap)}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>3</Text>
          <Text style={styles.sectionTitle}>The Cost of the Gap Over Time</Text>
        </View>

        <View style={styles.timelineContainer}>
          <View style={styles.timelineYear}>
            <Text style={styles.timelineYearLabel}>Year 1</Text>
            <Text style={styles.timelineYearValue}>{formatCurrency(calculations.annualGap)}</Text>
          </View>
          <View style={styles.timelineYear}>
            <Text style={styles.timelineYearLabel}>Year 2</Text>
            <Text style={styles.timelineYearValue}>{formatCurrency(calculations.annualGap)}</Text>
          </View>
          <View style={styles.timelineYear}>
            <Text style={styles.timelineYearLabel}>Year 3</Text>
            <Text style={styles.timelineYearValue}>{formatCurrency(calculations.annualGap)}</Text>
          </View>
        </View>
        <View style={styles.timelineCumulative}>
          <Text style={styles.timelineCumulativeLabel}>3-Year Cumulative</Text>
          <Text style={styles.timelineCumulativeValue}>{formatCurrency(calculations.threeYearGap)}</Text>
        </View>
        <View style={styles.monthlyCallout}>
          <Text style={styles.monthlyCalloutText}>
            Every month at current performance = {formatCurrency(calculations.monthlyGap)} in unrealized value
          </Text>
        </View>

        <View style={styles.takeawaysContainer}>
          <Text style={styles.takeawaysTitle}>Key Takeaways</Text>
          <View style={styles.takeawayItem}>
            <Text style={styles.takeawayBullet}>•</Text>
            <Text style={styles.takeawayText}>
              You're capturing {calculations.realizationScore}% of ambient AI's potential value
            </Text>
          </View>
          <View style={styles.takeawayItem}>
            <Text style={styles.takeawayBullet}>•</Text>
            <Text style={styles.takeawayText}>
              The largest gap is in {largestGapName} ({
                largestGapName === "Utilization" ? calculations.utilizationScore :
                largestGapName === "Efficiency" ? calculations.efficiencyScore :
                calculations.qualityScore
              }% of benchmark)
            </Text>
          </View>
          <View style={styles.takeawayItem}>
            <Text style={styles.takeawayBullet}>•</Text>
            <Text style={styles.takeawayText}>
              Closing the gap could recover {formatCurrency(calculations.annualGap)} annually / {formatCurrency(calculations.threeYearGap)} over 3 years
            </Text>
          </View>
          <View style={styles.takeawayItem}>
            <Text style={styles.takeawayBullet}>•</Text>
            <Text style={styles.takeawayText}>
              You're in the "{calculations.maturityLevel}" stage — focused optimization can help
            </Text>
          </View>
        </View>

        <View style={styles.methodology}>
          <Text style={styles.methodologyTitle}>METHODOLOGY</Text>
          <Text style={styles.methodologyText}>
            Inputs: {inputs.providers} providers · {formatNumber(inputs.annualEncounters)} encounters · Ambient AI
          </Text>
          <Text style={styles.methodologyText}>
            Your metrics: {inputs.utilization}% utilization · {inputs.timeSavedPerEncounter} min saved · +{inputs.wrvuLift}% wRVU · {inputs.satisfaction}% satisfaction
          </Text>
          <Text style={styles.methodologyText}>
            Benchmarks: {ABRIDGE_BENCHMARKS.utilization}% utilization · {ABRIDGE_BENCHMARKS.timeSavedAvg} min saved · +{ABRIDGE_BENCHMARKS.wrvuLift}% wRVU · {ABRIDGE_BENCHMARKS.satisfaction}% satisfaction
          </Text>
          <Text style={styles.methodologyText}>
            Valuation: Time at ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% conversion · wRVU at ${VALUE_ASSUMPTIONS.wrvuDollarValue} × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 1</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateAmbientPDF(
  inputs: SwitchInputs,
  calculations: SwitchCalculations
): Promise<void> {
  const blob = await pdf(
    <AmbientPDFDocument inputs={inputs} calculations={calculations} />
  ).toBlob();
  
  const today = new Date().toISOString().split("T")[0];
  saveAs(blob, `ambient-value-assessment-${today}.pdf`);
}
