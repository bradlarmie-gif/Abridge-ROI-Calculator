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
  coral: "#EA2C00",
  coralLight: "#FEF2F2",
  green: "#10B981",
  greenLight: "#ECFDF5",
  yellow: "#F59E0B",
  yellowLight: "#FEF3C7",
  amber: "#D97706",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: colors.black,
    backgroundColor: "#FFFFFF",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  headerRight: {
    textAlign: "right",
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.black,
  },
  headerDate: {
    fontSize: 9,
    color: colors.mediumGray,
    marginTop: 2,
  },

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    padding: 16,
    borderRadius: 6,
  },
  metricCardHighlight: {
    flex: 1,
    backgroundColor: colors.coralLight,
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.black,
  },
  metricLabel: {
    fontSize: 9,
    color: colors.mediumGray,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metricSublabel: {
    fontSize: 8,
    color: colors.lightGray,
    marginTop: 2,
  },

  insightBox: {
    backgroundColor: colors.backgroundGray,
    padding: 16,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
  },
  insightTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  insightText: {
    fontSize: 11,
    color: colors.black,
    lineHeight: 1.5,
  },

  coverageBar: {
    flexDirection: "row",
    height: 32,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  coverageSegmentCovered: {
    backgroundColor: colors.mediumGray,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  coverageSegmentGap: {
    backgroundColor: colors.yellowLight,
    justifyContent: "center",
    paddingHorizontal: 8,
    flex: 1,
  },
  coverageSegmentText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  coverageSegmentTextDark: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.amber,
  },

  statsRow: {
    flexDirection: "row",
    gap: 24,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.black,
  },
  statValueAlert: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.amber,
  },
  statLabel: {
    fontSize: 9,
    color: colors.mediumGray,
    marginTop: 2,
  },

  comparisonTable: {
    flexDirection: "row",
    gap: 12,
  },
  comparisonColumn: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.backgroundGray,
    borderRadius: 6,
  },
  comparisonColumnHighlight: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  comparisonHeader: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  comparisonTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  comparisonLabel: {
    fontSize: 9,
    color: colors.mediumGray,
  },
  comparisonValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  comparisonTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: colors.black,
  },
  comparisonTotalLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  comparisonTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
  },
  comparisonIncrease: {
    fontSize: 9,
    color: colors.amber,
    marginTop: 4,
    fontWeight: "bold",
  },

  burdenRow: {
    flexDirection: "row",
    gap: 12,
  },
  burdenCard: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.backgroundGray,
    borderRadius: 6,
    alignItems: "center",
  },
  burdenValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  burdenLabel: {
    fontSize: 8,
    color: colors.mediumGray,
    textAlign: "center",
  },
  burdenMath: {
    fontSize: 7,
    color: colors.lightGray,
    marginTop: 4,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 8,
    color: colors.lightGray,
  },

  methodology: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.backgroundGray,
    borderRadius: 6,
  },
  methodologyTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  methodologyColumns: {
    flexDirection: "row",
    gap: 24,
  },
  methodologyColumn: {
    flex: 1,
  },
  methodologySubtitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  methodologyItem: {
    fontSize: 8,
    color: colors.mediumGray,
    marginBottom: 2,
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
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Scribe Program Analysis</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Scribe Program at a Glance</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {formatCurrency(calculations.totalScribeCost)}
              </Text>
              <Text style={styles.metricLabel}>Annual Investment</Text>
              <Text style={styles.metricSublabel}>{inputs.scribeCount} scribes</Text>
            </View>
            <View style={styles.metricCardHighlight}>
              <Text style={styles.metricValue}>{calculations.coveragePercent}%</Text>
              <Text style={styles.metricLabel}>Coverage</Text>
              <Text style={styles.metricSublabel}>
                {inputs.providersWithScribes} of {inputs.totalProviders} providers
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {formatCurrency(calculations.costPerProviderCovered)}
              </Text>
              <Text style={styles.metricLabel}>Cost Per Provider</Text>
              <Text style={styles.metricSublabel}>annual</Text>
            </View>
          </View>

          <View style={styles.insightBox}>
            <Text style={styles.insightTitle}>The Insight</Text>
            <Text style={styles.insightText}>
              Your scribe program covers {calculations.coveragePercent}% of providers at{" "}
              {formatCurrency(calculations.costPerProviderCovered)} each. To reach 100%
              coverage would require an additional {formatCurrency(calculations.costToScale)}{" "}
              annually — a {scaleMultiplier}x increase in investment.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Coverage Gap</Text>

          <View style={styles.coverageBar}>
            <View
              style={[
                styles.coverageSegmentCovered,
                { width: `${Math.max(calculations.coveragePercent, 5)}%` },
              ]}
            >
              <Text style={styles.coverageSegmentText}>{inputs.providersWithScribes}</Text>
            </View>
            <View style={styles.coverageSegmentGap}>
              <Text style={styles.coverageSegmentTextDark}>
                {calculations.providersWithoutSupport} without support
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{calculations.coveragePercent}%</Text>
              <Text style={styles.statLabel}>have scribe support</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValueAlert}>
                {100 - calculations.coveragePercent}%
              </Text>
              <Text style={styles.statLabel}>documenting alone</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Full Coverage Would Cost</Text>

          <View style={styles.comparisonTable}>
            <View style={styles.comparisonColumn}>
              <Text style={styles.comparisonHeader}>Current State</Text>
              <Text style={styles.comparisonTitle}>Your Scribe Program</Text>

              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Scribes</Text>
                <Text style={styles.comparisonValue}>{inputs.scribeCount}</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Providers covered</Text>
                <Text style={styles.comparisonValue}>{inputs.providersWithScribes}</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Coverage</Text>
                <Text style={styles.comparisonValue}>{calculations.coveragePercent}%</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Scribe:Provider ratio</Text>
                <Text style={styles.comparisonValue}>1:{calculations.scribeRatio}</Text>
              </View>

              <View style={styles.comparisonTotal}>
                <Text style={styles.comparisonTotalLabel}>Annual cost</Text>
                <Text style={styles.comparisonTotalValue}>
                  {formatCurrency(calculations.totalScribeCost)}
                </Text>
              </View>
            </View>

            <View style={styles.comparisonColumnHighlight}>
              <Text style={styles.comparisonHeader}>Full Coverage</Text>
              <Text style={styles.comparisonTitle}>If Everyone Had a Scribe</Text>

              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Scribes needed</Text>
                <Text style={styles.comparisonValue}>
                  {calculations.scribesNeededForFullCoverage}
                </Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Providers covered</Text>
                <Text style={styles.comparisonValue}>{inputs.totalProviders}</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Coverage</Text>
                <Text style={styles.comparisonValue}>100%</Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Scribe:Provider ratio</Text>
                <Text style={styles.comparisonValue}>1:{calculations.scribeRatio}</Text>
              </View>

              <View style={styles.comparisonTotal}>
                <Text style={styles.comparisonTotalLabel}>Annual cost</Text>
                <Text style={styles.comparisonTotalValue}>
                  {formatCurrency(calculations.fullScribeCost)}
                </Text>
              </View>
              <Text style={styles.comparisonIncrease}>
                +{formatCurrency(calculations.costToScale)} to scale
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Burden on Unsupported Providers</Text>
          <Text style={{ fontSize: 9, color: colors.mediumGray, marginBottom: 12 }}>
            Your {calculations.providersWithoutSupport} providers without scribe support are
            handling documentation alone
          </Text>

          <View style={styles.burdenRow}>
            <View style={styles.burdenCard}>
              <Text style={styles.burdenValue}>
                {formatNumber(calculations.unsupportedDocTimeHours)}
              </Text>
              <Text style={styles.burdenLabel}>hours/year on documentation</Text>
              <Text style={styles.burdenMath}>
                {calculations.providersWithoutSupport} x{" "}
                {formatNumber(calculations.encountersPerProvider)} enc x 12 min / 60
              </Text>
            </View>
            <View style={styles.burdenCard}>
              <Text style={styles.burdenValue}>
                {formatNumber(calculations.pajamaTimeHours)}
              </Text>
              <Text style={styles.burdenLabel}>hours/year after clinic</Text>
              <Text style={styles.burdenMath}>~40% occurs outside clinic hours</Text>
            </View>
            <View style={styles.burdenCard}>
              <Text style={styles.burdenValue}>
                {formatNumber(calculations.docTimePerUnsupportedProvider)}
              </Text>
              <Text style={styles.burdenLabel}>hours/year per provider</Text>
              <Text style={styles.burdenMath}>Average documentation burden</Text>
            </View>
          </View>
        </View>

        <View style={styles.methodology}>
          <Text style={styles.methodologyTitle}>Methodology & Assumptions</Text>
          <View style={styles.methodologyColumns}>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologySubtitle}>From Your Inputs</Text>
              <Text style={styles.methodologyItem}>
                Scribe count: {inputs.scribeCount}
              </Text>
              <Text style={styles.methodologyItem}>
                Cost: ${inputs.scribeCostPerHour}/hr x {inputs.scribeHoursPerWeek} hrs/week
              </Text>
              <Text style={styles.methodologyItem}>
                Providers with scribes: {inputs.providersWithScribes}
              </Text>
              <Text style={styles.methodologyItem}>
                Total providers: {inputs.totalProviders}
              </Text>
              <Text style={styles.methodologyItem}>
                Annual encounters: {formatNumber(inputs.annualEncounters)}
              </Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologySubtitle}>Industry Assumptions</Text>
              <Text style={styles.methodologyItem}>
                Documentation time without scribe:{" "}
                {SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe} min/encounter
              </Text>
              <Text style={styles.methodologyItem}>
                After-hours documentation: ~{SCRIBE_ASSUMPTIONS.pajamaTimePercent * 100}% of
                total
              </Text>
              <Text style={styles.methodologyItem}>
                Working weeks per year: {SCRIBE_ASSUMPTIONS.weeksPerYear}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 1 of 1</Text>
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
