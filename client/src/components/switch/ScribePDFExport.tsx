import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { ScribeInputs, ScribeCalculations } from "@/lib/scribeGapCalculator";
import { SCRIBE_ASSUMPTIONS } from "@/lib/scribeGapCalculator";

const colors = {
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  borderGray: "#E5E7EB",
  backgroundGray: "#F9FAFB",
  coral: "#E85A4F",
  coralLight: "#FEF2F2",
  amber: "#92400E",
  amberLight: "#FEF3C7",
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
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.coral,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
  },
  headerDate: {
    fontSize: 9,
    color: colors.mediumGray,
  },

  metricsStrip: {
    flexDirection: "row",
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: colors.borderGray,
    alignItems: "center",
  },
  metricItemLast: {
    flex: 1,
    padding: 12,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricSublabel: {
    fontSize: 7,
    color: colors.lightGray,
    marginTop: 1,
  },

  insightBox: {
    backgroundColor: colors.coralLight,
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.coral,
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.coral,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 10,
    color: colors.black,
    lineHeight: 1.4,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 12,
  },
  sectionNumber: {
    backgroundColor: colors.black,
    color: colors.white,
    width: 18,
    height: 18,
    borderRadius: 9,
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    marginRight: 8,
    paddingTop: 3,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  coverageBar: {
    flexDirection: "row",
    height: 40,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  coverageSegmentCovered: {
    backgroundColor: colors.coral,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 50,
    paddingHorizontal: 8,
  },
  coverageSegmentCoveredText: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.white,
  },
  coverageSegmentCoveredSubtext: {
    fontSize: 8,
    color: "rgba(255,255,255,0.8)",
  },
  coverageSegmentGap: {
    backgroundColor: colors.amberLight,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  coverageSegmentGapText: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.amber,
  },

  comparisonContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  comparisonBox: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.backgroundGray,
    borderRadius: 4,
  },
  comparisonBoxHighlight: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.amberLight,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  comparisonLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  comparisonTitle: {
    fontSize: 10,
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
    borderTopColor: "#D1D5DB",
  },
  comparisonTotalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
  },
  comparisonIncrease: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.coral,
    marginTop: 2,
  },

  burdenContainer: {
    flexDirection: "row",
    gap: 8,
  },
  burdenCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    padding: 10,
    borderRadius: 4,
    alignItems: "center",
  },
  burdenValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
  },
  burdenLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textAlign: "center",
    marginTop: 2,
  },

  methodology: {
    marginTop: "auto",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 4,
  },
  methodologyText: {
    fontSize: 7,
    color: colors.lightGray,
    lineHeight: 1.4,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.coral }}>
            ABRIDGE
          </Text>
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
            <Text style={styles.metricLabel}>Annual Investment</Text>
            <Text style={styles.metricSublabel}>{inputs.scribeCount} scribes</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{calculations.coveragePercent}%</Text>
            <Text style={styles.metricLabel}>Coverage</Text>
            <Text style={styles.metricSublabel}>
              {inputs.providersWithScribes}/{inputs.totalProviders} providers
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {formatCurrency(calculations.costPerProviderCovered)}
            </Text>
            <Text style={styles.metricLabel}>Per Provider</Text>
            <Text style={styles.metricSublabel}>annual cost</Text>
          </View>
          <View style={styles.metricItemLast}>
            <Text style={styles.metricValue}>{scaleMultiplier}x</Text>
            <Text style={styles.metricLabel}>Cost to Scale</Text>
            <Text style={styles.metricSublabel}>to 100%</Text>
          </View>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>The Insight</Text>
          <Text style={styles.insightText}>
            Your scribe program covers {calculations.coveragePercent}% of providers. 
            Full coverage would require {formatCurrency(calculations.costToScale)} more annually.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>1</Text>
          <Text style={styles.sectionTitle}>Coverage Gap</Text>
        </View>
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
              {calculations.providersWithoutSupport} without support ({100 - calculations.coveragePercent}%)
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>2</Text>
          <Text style={styles.sectionTitle}>Scaling Economics</Text>
        </View>
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
                {formatCurrency(calculations.totalScribeCost)}/year
              </Text>
            </View>
          </View>

          <View style={styles.comparisonBoxHighlight}>
            <Text style={styles.comparisonLabel}>Full Coverage</Text>
            <Text style={styles.comparisonTitle}>
              {calculations.scribesNeededForFullCoverage} scribes → {inputs.totalProviders} providers
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
                {formatCurrency(calculations.fullScribeCost)}/year
              </Text>
              <Text style={styles.comparisonIncrease}>
                +{formatCurrency(calculations.costToScale)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>3</Text>
          <Text style={styles.sectionTitle}>
            Burden on Unsupported Providers ({calculations.providersWithoutSupport} documenting alone)
          </Text>
        </View>
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

        <View style={styles.methodology}>
          <Text style={styles.methodologyTitle}>Methodology</Text>
          <Text style={styles.methodologyText}>
            Inputs: {inputs.scribeCount} scribes · ${inputs.scribeCostPerHour}/hr × {inputs.scribeHoursPerWeek} hrs/wk · {inputs.providersWithScribes} covered · {inputs.totalProviders} total · {formatNumber(inputs.annualEncounters)} encounters
          </Text>
          <Text style={styles.methodologyText}>
            Assumptions: {SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe} min/encounter doc time · {SCRIBE_ASSUMPTIONS.pajamaTimePercent * 100}% after-hours · {SCRIBE_ASSUMPTIONS.weeksPerYear} weeks/year
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
