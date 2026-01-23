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
import type { ScribeInputs, ScribeCalculations } from "@/lib/scribeGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import { SCRIBE_ASSUMPTIONS } from "@/lib/scribeGapCalculator";

const colors = {
  coral: "#E85A4F",
  coralLight: "#FEF2F2",
  coralDark: "#991B1B",
  coralBorder: "#FECACA",
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
    fontSize: 10,
    color: colors.black,
    backgroundColor: colors.white,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.coral,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  headerDate: {
    fontSize: 8,
    color: colors.mediumGray,
  },

  metricsStrip: {
    flexDirection: "row",
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    marginBottom: 14,
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
    fontSize: 20,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricSublabel: {
    fontSize: 6,
    color: colors.lightGray,
    marginTop: 1,
  },

  executiveSummary: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 14,
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
  sectionNote: {
    fontSize: 7,
    color: colors.mediumGray,
    fontStyle: "italic",
    marginTop: 6,
  },

  coverageBar: {
    flexDirection: "row",
    height: 36,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  coverageSegmentCovered: {
    backgroundColor: colors.coral,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 45,
    paddingHorizontal: 6,
  },
  coverageSegmentCoveredText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.white,
  },
  coverageSegmentCoveredSubtext: {
    fontSize: 7,
    color: "rgba(255,255,255,0.8)",
  },
  coverageSegmentGap: {
    backgroundColor: colors.coralLight,
    borderWidth: 1,
    borderColor: colors.coralBorder,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  coverageSegmentGapText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.coralDark,
  },

  comparisonContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  comparisonBox: {
    flex: 1,
    padding: 8,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  comparisonBoxHighlight: {
    flex: 1,
    padding: 8,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
  },
  comparisonLabel: {
    fontSize: 6,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  comparisonTitle: {
    fontSize: 9,
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
    color: colors.coral,
    marginTop: 2,
  },

  burdenContainer: {
    flexDirection: "row",
    gap: 6,
  },
  burdenCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  burdenValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
  },
  burdenLabel: {
    fontSize: 6,
    color: colors.mediumGray,
    textAlign: "center",
    marginTop: 2,
  },

  keyTakeaways: {
    marginTop: 10,
    marginBottom: 10,
  },
  takeawaysTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.black,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  takeawaysList: {
    marginBottom: 8,
  },
  takeawayItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  takeawayBullet: {
    fontSize: 8,
    color: colors.coral,
    marginRight: 4,
    fontWeight: "bold",
  },
  takeawayText: {
    fontSize: 7,
    color: colors.darkGray,
    flex: 1,
    lineHeight: 1.4,
  },
  questionBox: {
    backgroundColor: colors.coralLight,
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.coralBorder,
  },
  questionText: {
    fontSize: 8,
    color: colors.coralDark,
    fontWeight: "bold",
    fontStyle: "italic",
  },

  methodology: {
    marginTop: "auto",
    paddingTop: 8,
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.headerTitle}>Scribe Program Analysis</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
        </View>

        <View style={styles.metricsStrip}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {formatCurrency(calculations.totalScribeCost)}
            </Text>
            <Text style={styles.metricLabel}>Investment</Text>
            <Text style={styles.metricSublabel}>{inputs.scribeCount} scribes</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{calculations.coveragePercent}%</Text>
            <Text style={styles.metricLabel}>Coverage</Text>
            <Text style={styles.metricSublabel}>
              {inputs.providersWithScribes}/{inputs.totalProviders}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {formatCurrency(calculations.costPerProviderCovered)}
            </Text>
            <Text style={styles.metricLabel}>Per Provider</Text>
            <Text style={styles.metricSublabel}>annual</Text>
          </View>
          <View style={styles.metricItemLast}>
            <Text style={styles.metricValue}>{scaleMultiplier}x</Text>
            <Text style={styles.metricLabel}>To Scale</Text>
            <Text style={styles.metricSublabel}>to 100%</Text>
          </View>
        </View>

        <View style={styles.executiveSummary}>
          <Text style={styles.execSummaryTitle}>EXECUTIVE SUMMARY</Text>
          <Text style={styles.execSummaryText}>
            Your organization invests {formatCurrency(calculations.totalScribeCost)} annually in a
            scribe program that supports {inputs.providersWithScribes} of {inputs.totalProviders}{" "}
            providers ({calculations.coveragePercent}%). The remaining{" "}
            {calculations.providersWithoutSupport} providers have no documentation support and
            spend an estimated {formatNumber(calculations.unsupportedDocTimeHours)} hours per year
            on clinical notes — approximately{" "}
            {formatNumber(calculations.docTimePerUnsupportedProvider)} hours per provider, much of
            it outside clinic hours.
          </Text>
          <Text style={styles.execSummaryText}>
            Scaling your scribe program to cover all providers would require an additional{" "}
            {formatCurrency(calculations.costToScale)} annually — a {scaleMultiplier}x increase in
            investment. This analysis examines your current program economics and the implications
            of the coverage gap.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>1</Text>
          <Text style={styles.sectionTitle}>Coverage Gap</Text>
        </View>
        <Text style={styles.sectionContext}>
          Of your {inputs.totalProviders} providers, only {inputs.providersWithScribes} (
          {calculations.coveragePercent}%) have scribe support. The remaining{" "}
          {calculations.providersWithoutSupport} are documenting without assistance.
        </Text>
        <View style={styles.coverageBar}>
          <View
            style={[
              styles.coverageSegmentCovered,
              { width: `${Math.max(calculations.coveragePercent, 8)}%` },
            ]}
          >
            <Text style={styles.coverageSegmentCoveredText}>
              {inputs.providersWithScribes}
            </Text>
            <Text style={styles.coverageSegmentCoveredSubtext}>
              {calculations.coveragePercent}%
            </Text>
          </View>
          <View style={styles.coverageSegmentGap}>
            <Text style={styles.coverageSegmentGapText}>
              {calculations.providersWithoutSupport} without support
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>2</Text>
          <Text style={styles.sectionTitle}>Scaling Economics</Text>
        </View>
        <Text style={styles.sectionContext}>
          Scribe programs scale linearly — more coverage requires proportionally more scribes. At
          your current scribe-to-provider ratio of 1:{calculations.scribeRatio}, achieving full
          coverage would require {additionalScribesNeeded} additional scribes.
        </Text>
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonBox}>
            <Text style={styles.comparisonLabel}>Current State</Text>
            <Text style={styles.comparisonTitle}>
              {inputs.scribeCount} scribes → {inputs.providersWithScribes} providers
            </Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonRowLabel}>Coverage</Text>
              <Text style={styles.comparisonRowValue}>{calculations.coveragePercent}%</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonRowLabel}>Ratio</Text>
              <Text style={styles.comparisonRowValue}>1:{calculations.scribeRatio}</Text>
            </View>
            <View style={styles.comparisonTotal}>
              <Text style={styles.comparisonTotalValue}>
                {formatCurrency(calculations.totalScribeCost)}/yr
              </Text>
            </View>
          </View>

          <View style={styles.comparisonBoxHighlight}>
            <Text style={styles.comparisonLabel}>Full Coverage</Text>
            <Text style={styles.comparisonTitle}>
              {calculations.scribesNeededForFullCoverage} scribes → {inputs.totalProviders}{" "}
              providers
            </Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonRowLabel}>Coverage</Text>
              <Text style={styles.comparisonRowValue}>100%</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonRowLabel}>Ratio</Text>
              <Text style={styles.comparisonRowValue}>1:{calculations.scribeRatio}</Text>
            </View>
            <View style={styles.comparisonTotal}>
              <Text style={styles.comparisonTotalValue}>
                {formatCurrency(calculations.fullScribeCost)}/yr
              </Text>
              <Text style={styles.comparisonIncrease}>
                +{formatCurrency(calculations.costToScale)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>3</Text>
          <Text style={styles.sectionTitle}>Burden on Unsupported Providers</Text>
        </View>
        <Text style={styles.sectionContext}>
          Your {calculations.providersWithoutSupport} providers without scribe support spend
          significant time on documentation, contributing to administrative burden and after-hours
          work.
        </Text>
        <View style={styles.burdenContainer}>
          <View style={styles.burdenCard}>
            <Text style={styles.burdenValue}>
              {formatNumber(calculations.unsupportedDocTimeHours)}
            </Text>
            <Text style={styles.burdenLabel}>hrs/yr documentation</Text>
          </View>
          <View style={styles.burdenCard}>
            <Text style={styles.burdenValue}>
              {formatNumber(calculations.pajamaTimeHours)}
            </Text>
            <Text style={styles.burdenLabel}>hrs/yr after-hours</Text>
          </View>
          <View style={styles.burdenCard}>
            <Text style={styles.burdenValue}>
              {formatNumber(calculations.docTimePerUnsupportedProvider)}
            </Text>
            <Text style={styles.burdenLabel}>hrs/yr per provider</Text>
          </View>
        </View>
        <Text style={styles.sectionNote}>
          This represents approximately {fteEquivalents} FTE-equivalents of documentation time,
          with an estimated {pajamaPercent}% occurring outside normal clinic hours.
        </Text>

        <View style={styles.keyTakeaways}>
          <Text style={styles.takeawaysTitle}>KEY TAKEAWAYS</Text>
          <View style={styles.takeawaysList}>
            <View style={styles.takeawayItem}>
              <Text style={styles.takeawayBullet}>•</Text>
              <Text style={styles.takeawayText}>
                Your current scribe investment provides documentation support to{" "}
                {calculations.coveragePercent}% of providers
              </Text>
            </View>
            <View style={styles.takeawayItem}>
              <Text style={styles.takeawayBullet}>•</Text>
              <Text style={styles.takeawayText}>
                {calculations.providersWithoutSupport} providers (
                {100 - calculations.coveragePercent}%) handle documentation without assistance,
                totaling {formatNumber(calculations.unsupportedDocTimeHours)} hours annually
              </Text>
            </View>
            <View style={styles.takeawayItem}>
              <Text style={styles.takeawayBullet}>•</Text>
              <Text style={styles.takeawayText}>
                Extending scribe coverage to all providers would require a {scaleMultiplier}x
                increase in annual investment
              </Text>
            </View>
          </View>

          <View style={styles.questionBox}>
            <Text style={styles.questionText}>
              The question: How can you extend documentation support to all{" "}
              {inputs.totalProviders} providers without a {scaleMultiplier}x increase in cost?
            </Text>
          </View>
        </View>

        <View style={styles.methodology}>
          <Text style={styles.methodologyTitle}>METHODOLOGY</Text>
          <Text style={styles.methodologyText}>
            Inputs: {inputs.scribeCount} scribes · ${inputs.scribeCostPerHour}/hr ×{" "}
            {inputs.scribeHoursPerWeek} hrs/wk · {inputs.providersWithScribes} covered ·{" "}
            {inputs.totalProviders} total · {formatNumber(inputs.annualEncounters)} encounters
          </Text>
          <Text style={styles.methodologyText}>
            Assumptions: {SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe} min/encounter doc
            time · {SCRIBE_ASSUMPTIONS.pajamaTimePercent * 100}% after-hours ·{" "}
            {SCRIBE_ASSUMPTIONS.weeksPerYear} weeks/year
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge</Text>
          <Text style={styles.footerText}>Page 1</Text>
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
