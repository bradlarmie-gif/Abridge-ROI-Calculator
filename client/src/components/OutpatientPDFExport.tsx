import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import type { RoiInputs, LeverId } from "@/lib/roi-types";
import { leverLabels, leverDescriptions } from "@/lib/roi-types";
import type { calculateRoi } from "@/lib/roi-calculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// ============================================================================
// TYPES
// ============================================================================

interface OutpatientPDFData {
  inputs: RoiInputs;
  results: ReturnType<typeof calculateRoi>;
  enabledDrivers: LeverId[];
  driverValues: Record<LeverId, number>;
  careSettingLabel: string;
  organizationName?: string;
  journeyData?: {
    fullScaleProviders: number;
    targetUtilization: number;
    fullScaleValue: number;
  };
}

// ============================================================================
// COLORS - Matching Ambient PDF exactly
// ============================================================================

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  green: "#059669",
  greenLight: "#ECFDF5",
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  backgroundGray: "#F9FAFB",
  borderGray: "#E5E7EB",
  white: "#FFFFFF",
  redLight: "#FEF2F2",
  redDark: "#991B1B",
  mathBg: "#FFFBF5",
};

// ============================================================================
// STYLES - Matching Ambient PDF exactly
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.black,
    backgroundColor: colors.white,
  },

  // Header - exact match
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  headerRight: {
    textAlign: "right",
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  headerDate: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
  },

  // Intro box - exact match
  introBox: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 10,
  },
  introTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },
  introText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },

  // Section title - exact match
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },

  // Metrics grid - exact match
  metricsGrid: {
    flexDirection: "row",
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    marginRight: 6,
    alignItems: "center",
  },
  metricCardLast: {
    marginRight: 0,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  metricValueGreen: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.green,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textAlign: "center",
    marginBottom: 2,
  },
  metricDescription: {
    fontSize: 6,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.3,
  },

  // Findings section - exact match
  findingsSection: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 4,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  findingsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  findingsNarrative: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  findingsSubsection: {
    marginBottom: 8,
  },
  findingsSubtitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 3,
  },
  findingsText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
  },

  // Driver card - exact match to dimension card
  driverCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  driverName: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  driverScore: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primary,
  },
  driverDefinition: {
    fontSize: 8,
    color: colors.mediumGray,
    fontStyle: "italic",
    marginBottom: 8,
    lineHeight: 1.4,
  },
  driverEducation: {
    backgroundColor: colors.backgroundGray,
    padding: 8,
    borderRadius: 4,
  },
  driverWhyMatters: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  driverWhatDrives: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  driverInsight: {
    fontSize: 7,
    color: colors.redDark,
    lineHeight: 1.5,
    backgroundColor: colors.redLight,
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
  },
  bold: {
    fontWeight: "bold",
  },

  // Gap card - exact match
  gapCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  gapCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.backgroundGray,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  gapCardTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
  },
  gapCardValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.green,
  },
  gapCardValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 6,
    paddingBottom: 4,
  },
  gapValueItem: {
    fontSize: 7,
    color: colors.darkGray,
  },
  gapValueBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  gapCardSteps: {
    padding: 6,
    paddingTop: 4,
    backgroundColor: colors.backgroundGray,
  },
  gapStep: {
    fontSize: 6,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 1,
  },
  gapStepLabel: {
    fontWeight: "bold",
    color: colors.mediumGray,
  },

  // Total box - exact match
  totalGapBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  totalGapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalGapLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  totalGapValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.green,
  },
  totalGapBreakdown: {
    fontSize: 7,
    color: colors.darkGray,
    marginTop: 4,
  },

  // Timeline - exact match
  timelineSection: {
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timelineBox: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
    marginRight: 4,
  },
  timelineBoxHighlight: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  timelineLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
  },
  timelineValueLarge: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
  },
  timelineSubtext: {
    fontSize: 6,
    color: colors.mediumGray,
    marginTop: 2,
  },
  timelineArrow: {
    fontSize: 12,
    color: colors.mediumGray,
    paddingHorizontal: 2,
  },

  // Monthly callout - exact match
  monthlyCallout: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 8,
    borderRadius: 4,
  },
  monthlyText: {
    fontSize: 8,
    color: colors.primary,
    textAlign: "center",
    fontWeight: "bold",
  },

  // Takeaways - exact match
  takeawaysBox: {
    marginBottom: 10,
  },
  takeawaysTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  takeawayItem: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 2,
    paddingLeft: 8,
  },

  // Methodology - exact match
  methodologySection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  methodologyTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  methodologyGrid: {
    flexDirection: "row",
  },
  methodologyColumn: {
    flex: 1,
    paddingRight: 10,
  },
  methodologyColumnTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  methodologyItem: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  methodologyNote: {
    fontSize: 6,
    color: colors.lightGray,
    lineHeight: 1.4,
    marginTop: 6,
    fontStyle: "italic",
  },

  // Footer - exact match
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },
});

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (num: number): string => {
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) {
    const k = Math.round(num / 1000);
    if (Math.abs(k) >= 1000) return `$${(num / 1000000).toFixed(1)}M`;
    return `$${k}K`;
  }
  return `$${num.toLocaleString()}`;
};

const formatNumber = (num: number): string => num.toLocaleString();

// ============================================================================
// DRIVER EDUCATION CONTENT - Same structure as DimensionEducationContent
// ============================================================================

const DriverEducationContent: Record<string, {
  definition: string;
  whyMatters: string;
  whatDrives: string;
  getInsight: (inputs: RoiInputs, value: number) => string;
}> = {
  patientAccess: {
    definition: "The revenue captured by converting documentation time savings into additional patient visits.",
    whyMatters: "Time saved on documentation can translate to capacity for more patients. Even modest conversion rates create meaningful revenue because the marginal cost of an additional visit is low when the provider is already present.",
    whatDrives: "Patient demand, scheduling efficiency, room availability, provider willingness to add visits, and the specialty mix (procedural vs. cognitive visits have different capacity constraints).",
    getInsight: (inputs, value) => `At ${inputs.patientAccess.pctTimeToNewVisits}% time-to-access conversion, you're capturing ${formatCurrency(value)} annually. Organizations with strong scheduling operations often achieve 15-25% conversion.`,
  },
  wrvu: {
    definition: "The revenue improvement from documentation that accurately captures clinical complexity, supporting appropriate E/M coding.",
    whyMatters: "Physicians under time pressure routinely under-document visit complexity. This is about getting credit for work already performed. A 5% wRVU lift across thousands of encounters compounds significantly.",
    whatDrives: "Documentation completeness, HPI detail, medical decision-making clarity, time documentation, and whether the note tells the full clinical story that coders need.",
    getInsight: (inputs, value) => `At ${inputs.wrvu.pctIncreaseWrvuPerEncounter}% wRVU improvement and $${inputs.wrvu.wrvuConversionFactor}/wRVU, you're capturing ${formatCurrency(value)}. Commercial payer rates ($45-65/wRVU) would increase this significantly.`,
  },
  workforce: {
    definition: "The cost avoided by reducing burnout-driven turnover through documentation burden reduction.",
    whyMatters: "Documentation burden is the #1 cited driver of physician burnout. Replacing a physician costs $400K-$1M+ when you factor recruiting, lost revenue during vacancy, onboarding, and productivity ramp. Preventing even fractional departures creates substantial value.",
    whatDrives: "Baseline turnover rate, what portion is burnout-related, how much documentation contributes to burnout, and Abridge's ability to meaningfully reduce that burden.",
    getInsight: (inputs, value) => `With ${inputs.workforce.providerCount} providers at ${inputs.workforce.baselineAttritionRate}% turnover, preventing ${((inputs.workforce.providerCount * inputs.workforce.baselineAttritionRate / 100) * (inputs.workforce.pctAttritionLinkedToBurnout / 100) * (inputs.workforce.pctBurnoutExitsAvoided / 100)).toFixed(1)} departures annually saves ${formatCurrency(value)}. This is a long-term metric—benefits materialize over 12+ months.`,
  },
  denials: {
    definition: "Revenue recovered by preventing documentation-related claim denials that would otherwise be written off.",
    whyMatters: "Not all denials are appealable. When documentation can't support the claim, revenue is lost permanently. Abridge captures the clinical reasoning that prevents these denials upfront or makes them winnable on appeal.",
    whatDrives: "Baseline denial rate, what portion stems from documentation gaps (vs. eligibility or authorization), and whether the MDM and clinical narrative support the billed service.",
    getInsight: (inputs, value) => `At a ${inputs.denials.baselineDenialRate}% denial rate with ${inputs.denials.pctDenialsFromDocumentation}% documentation-related, recovering ${inputs.denials.pctDocDenialsRecovered}% of write-offs yields ${formatCurrency(value)} annually.`,
  },
  overtime: {
    definition: "Cost savings from reducing after-hours documentation that drives overtime and locum reliance.",
    whyMatters: "Documentation that spills outside clinic hours creates premium labor costs. When providers finish notes during the workday, overtime drops and locum needs decrease—both carrying significant cost premiums.",
    whatDrives: "How much documentation currently occurs after hours ('pajama time'), provider efficiency with the tool, and whether saved time actually converts to reduced overtime vs. other uses.",
    getInsight: (inputs, value) => `With ${inputs.overtime.pctAfterHours}% of documentation occurring after hours and ${inputs.overtime.pctOvertimeReduced}% overtime reduction, you save ${formatCurrency(value)} annually at $${inputs.overtime.blendedOvertimeRate}/hr blended rate.`,
  },
  hcc: {
    definition: "Risk adjustment revenue from capturing chronic conditions discussed but not documented in encounters.",
    whyMatters: "Physicians discuss chronic conditions that don't make it into the note due to time pressure. Each missed HCC-eligible condition represents RAF value that compounds across the patient's annual attribution period.",
    whatDrives: "Medicare Advantage patient mix, conditions discussed per visit, documentation gap rate, and whether Abridge captures conditions mentioned in conversation that support HCC coding.",
    getInsight: (inputs, value) => `With ${inputs.hcc.pctMedicareAdvantage}% MA patients and ${inputs.hcc.pctConditionsMissed}% conditions missed, recapturing ${inputs.hcc.pctMissedConditionsRecaptured}% yields ${formatCurrency(value)}. Actual value depends heavily on payer mix and current capture maturity.`,
  },
};

// ============================================================================
// NARRATIVE GENERATION - Same approach as Ambient PDF
// ============================================================================

const getROIStageNarrative = (roi: number, netGain: number, totalValue: number): string => {
  if (roi >= 5) {
    return `At ${roi.toFixed(1)}x ROI, this deployment generates exceptional returns. For every dollar invested, your organization captures $${roi.toFixed(2)} in value—a compelling case that exceeds typical healthcare technology investments by 3-4x. The ${formatCurrency(netGain)} annual net gain represents both operational improvement and direct financial return.`;
  } else if (roi >= 3) {
    return `At ${roi.toFixed(1)}x ROI, this deployment delivers strong value creation. The ${formatCurrency(netGain)} in annual net gain demonstrates that ambient documentation isn't just a productivity tool—it's a revenue and efficiency driver with measurable financial impact.`;
  } else if (roi >= 2) {
    return `At ${roi.toFixed(1)}x ROI, the investment clearly pays for itself with meaningful surplus. There may be opportunity to optimize further through increased utilization or additional value drivers, but the fundamental economics are sound.`;
  } else if (roi >= 1.5) {
    return `At ${roi.toFixed(1)}x ROI, the investment returns positive value. Consider whether higher utilization rates or additional value drivers could strengthen returns. Many organizations see ROI improve significantly after the first 6-12 months of optimization.`;
  } else {
    return `At ${roi.toFixed(1)}x ROI, returns are modest but positive. Focus on utilization optimization and change management to improve value capture. Organizations typically see 30-50% improvement in ROI from Year 1 to Year 2 as adoption matures.`;
  }
};

const getPrimaryOpportunity = (
  enabledDrivers: LeverId[],
  driverValues: Record<LeverId, number>,
  totalValue: number
): string => {
  const sorted = enabledDrivers
    .map(id => ({ id, value: driverValues[id] || 0, pct: Math.round(((driverValues[id] || 0) / totalValue) * 100) }))
    .sort((a, b) => b.value - a.value);
  
  const top = sorted[0];
  const topLabel = leverLabels[top.id];
  
  if (sorted.length === 1) {
    return `Your model focuses entirely on ${topLabel}. Consider whether additional value drivers could diversify your ROI and capture value you may be leaving on the table.`;
  }
  
  const second = sorted[1];
  const secondLabel = leverLabels[second.id];
  
  return `${topLabel} drives ${top.pct}% of your value (${formatCurrency(top.value)}), followed by ${secondLabel} at ${second.pct}%. This concentration means optimizing ${topLabel} has disproportionate impact on total returns.`;
};

const getValueMixInsight = (laborPct: number, revenuePct: number): string => {
  if (laborPct === 0) {
    return `Your value comes entirely from Revenue & Quality drivers. These represent direct financial improvement through better documentation and coding—highly measurable and defensible to finance leadership.`;
  } else if (revenuePct === 0) {
    return `Your value comes entirely from Labor & Efficiency drivers. Consider adding Revenue & Quality drivers (wRVU lift, denial reduction) to capture documentation improvement value that's likely occurring but not being measured.`;
  } else if (laborPct > 60) {
    return `Value skews toward Labor & Efficiency (${laborPct}%). This is common for organizations prioritizing provider satisfaction and retention. Revenue & Quality drivers could add incremental value.`;
  } else if (revenuePct > 60) {
    return `Value skews toward Revenue & Quality (${revenuePct}%). This represents direct financial ROI from documentation improvement—the most defensible value category for internal stakeholder conversations.`;
  } else {
    return `Value is balanced across Labor & Efficiency (${laborPct}%) and Revenue & Quality (${revenuePct}%). This diversification reduces risk that any single driver underperforms expectations.`;
  }
};

// ============================================================================
// PDF DOCUMENT - Matching Ambient PDF structure exactly
// ============================================================================

const OutpatientPDFDocument = ({
  inputs,
  results,
  enabledDrivers,
  driverValues,
  careSettingLabel,
  organizationName,
  journeyData,
}: OutpatientPDFData) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Core calculations
  const eligibleEncounters = Math.round(
    inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100)
  );
  const hoursReturned = Math.round(
    (eligibleEncounters * inputs.minutesSavedPerEncounter) / 60
  );
  const annualInvestment = inputs.numberOfProviders * inputs.monthlyCostPerProvider * 12;
  const netGain = results.totalAnnualBenefit - annualInvestment;
  const roi = annualInvestment > 0 ? results.totalAnnualBenefit / annualInvestment : 0;
  const monthlyGain = Math.round(netGain / 12);

  // Categorize drivers
  const laborDriverIds: LeverId[] = ["patientAccess", "overtime", "workforce"];
  const revenueDriverIds: LeverId[] = ["wrvu", "denials", "hcc"];
  const laborDrivers = enabledDrivers.filter((id) => laborDriverIds.includes(id));
  const revenueDrivers = enabledDrivers.filter((id) => revenueDriverIds.includes(id));
  const laborValue = laborDrivers.reduce((sum, id) => sum + (driverValues[id] || 0), 0);
  const revenueValue = revenueDrivers.reduce((sum, id) => sum + (driverValues[id] || 0), 0);
  const laborPct = Math.round((laborValue / results.totalAnnualBenefit) * 100) || 0;
  const revenuePct = Math.round((revenueValue / results.totalAnnualBenefit) * 100) || 0;

  // Per-provider
  const valuePerProvider = Math.round(results.totalAnnualBenefit / inputs.numberOfProviders);
  const netPerProvider = Math.round(netGain / inputs.numberOfProviders);

  // Multi-year
  const year1 = results.totalAnnualBenefit;
  const year2 = Math.round(year1 * 1.1);
  const year3 = Math.round(year2 * 1.1);
  const threeYearTotal = year1 + year2 + year3;
  const threeYearCost = annualInvestment * 3;
  const threeYearNet = threeYearTotal - threeYearCost;

  // Journey data
  const fullScaleProviders = journeyData?.fullScaleProviders || inputs.numberOfProviders * 3;
  const fullScaleValue = journeyData?.fullScaleValue || Math.round(results.totalAnnualBenefit * (fullScaleProviders / inputs.numberOfProviders) * 1.2);

  return (
    <Document>
      {/* ================================================================ */}
      {/* PAGE 1: THE STORY - Matching Ambient PDF Page 1 exactly */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{careSettingLabel} ROI Assessment</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
        </View>

        {/* Intro box - same as "Understanding Value Realization" */}
        <View style={styles.introBox}>
          <Text style={styles.introTitle}>UNDERSTANDING OUTPATIENT ROI</Text>
          <Text style={styles.introText}>
            Ambient AI creates financial value through multiple channels: time returned to providers (capacity), documentation quality improvement (revenue), and reduced administrative burden (retention and cost). Most ROI models focus on one channel. The complete picture requires measuring all of them.
          </Text>
          <Text style={styles.introText}>
            This assessment models {enabledDrivers.length} value driver{enabledDrivers.length > 1 ? 's' : ''} specific to your priorities: {enabledDrivers.map(id => leverLabels[id]).join(', ')}. Each calculation is transparent and adjustable—these are your numbers, not black-box estimates.
          </Text>
        </View>

        {/* Results at a glance - exact match */}
        <Text style={styles.sectionTitle}>YOUR RESULTS AT A GLANCE</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValueGreen}>{formatCurrency(netGain)}</Text>
            <Text style={styles.metricLabel}>Net Annual Gain</Text>
            <Text style={styles.metricDescription}>Value minus investment</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{roi.toFixed(1)}x</Text>
            <Text style={styles.metricLabel}>ROI</Text>
            <Text style={styles.metricDescription}>Return on investment</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatCurrency(threeYearNet)}</Text>
            <Text style={styles.metricLabel}>3-Year Net</Text>
            <Text style={styles.metricDescription}>Cumulative gain over three years</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardLast]}>
            <Text style={styles.metricValue}>{formatCurrency(netPerProvider)}</Text>
            <Text style={styles.metricLabel}>Per Provider</Text>
            <Text style={styles.metricDescription}>Net annual benefit each</Text>
          </View>
        </View>

        {/* Findings - exact match to "Our Findings" */}
        <View style={styles.findingsSection}>
          <Text style={styles.findingsTitle}>OUR FINDINGS</Text>
          <Text style={styles.findingsNarrative}>
            {getROIStageNarrative(roi, netGain, results.totalAnnualBenefit)}
          </Text>
          <View style={styles.findingsSubsection}>
            <Text style={styles.findingsSubtitle}>Primary Opportunity</Text>
            <Text style={styles.findingsText}>
              {getPrimaryOpportunity(enabledDrivers, driverValues, results.totalAnnualBenefit)}
            </Text>
          </View>
          <View style={styles.findingsSubsection}>
            <Text style={styles.findingsSubtitle}>Value Composition</Text>
            <Text style={styles.findingsText}>
              {getValueMixInsight(laborPct, revenuePct)}
            </Text>
          </View>
          <View style={styles.findingsSubsection}>
            <Text style={styles.findingsSubtitle}>Deployment Baseline</Text>
            <Text style={styles.findingsText}>
              {inputs.numberOfProviders} providers × {formatNumber(inputs.annualOutpatientEncounters)} encounters × {inputs.abridgeUtilizationPct}% utilization = {formatNumber(eligibleEncounters)} Abridge-documented encounters generating {formatNumber(hoursReturned)} hours returned annually.
            </Text>
          </View>
        </View>

        {/* Value over time - matching "The Cost of the Gap Over Time" */}
        <Text style={styles.sectionTitle}>VALUE ACCUMULATION OVER TIME</Text>

        <View style={styles.timelineSection}>
          <View style={styles.timelineRow}>
            <View style={styles.timelineBox}>
              <Text style={styles.timelineLabel}>TODAY</Text>
              <Text style={styles.timelineValue}>$0</Text>
              <Text style={styles.timelineSubtext}>Starting point</Text>
            </View>
            <Text style={styles.timelineArrow}>→</Text>
            <View style={styles.timelineBox}>
              <Text style={styles.timelineLabel}>YEAR 1</Text>
              <Text style={styles.timelineValue}>{formatCurrency(netGain)}</Text>
            </View>
            <Text style={styles.timelineArrow}>→</Text>
            <View style={styles.timelineBox}>
              <Text style={styles.timelineLabel}>YEAR 2</Text>
              <Text style={styles.timelineValue}>{formatCurrency(netGain + (year2 - annualInvestment))}</Text>
            </View>
            <Text style={styles.timelineArrow}>→</Text>
            <View style={styles.timelineBoxHighlight}>
              <Text style={styles.timelineLabel}>YEAR 3</Text>
              <Text style={styles.timelineValueLarge}>{formatCurrency(threeYearNet)}</Text>
              <Text style={styles.timelineSubtext}>Cumulative</Text>
            </View>
          </View>

          <View style={styles.monthlyCallout}>
            <Text style={styles.monthlyText}>
              Every month of deployment = {formatCurrency(monthlyGain)} in net value captured
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 1/4</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 2: VALUE DRIVERS - Matching Ambient PDF Pages 2-3 */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{careSettingLabel} ROI Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>YOUR VALUE DRIVERS IN DETAIL</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 8 }}>
          Each driver includes the theory, the calculation, and context for your specific situation:
        </Text>

        {enabledDrivers.slice(0, 3).map((driverId) => {
          const value = driverValues[driverId] || 0;
          const pct = Math.round((value / results.totalAnnualBenefit) * 100);
          const education = DriverEducationContent[driverId];
          
          return (
            <View key={driverId} style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <Text style={styles.driverName}>{leverLabels[driverId].toUpperCase()}</Text>
                <Text style={styles.driverScore}>{formatCurrency(value)} ({pct}% of total)</Text>
              </View>
              <Text style={styles.driverDefinition}>
                What it measures: {education?.definition || leverDescriptions[driverId]}
              </Text>
              <View style={styles.driverEducation}>
                <Text style={styles.driverWhyMatters}>
                  <Text style={styles.bold}>Why it matters: </Text>
                  {education?.whyMatters || 'Creates measurable financial value through improved documentation workflows.'}
                </Text>
                <Text style={styles.driverWhatDrives}>
                  <Text style={styles.bold}>What drives it: </Text>
                  {education?.whatDrives || 'Utilization rate, documentation quality, and workflow integration.'}
                </Text>
                {education && (
                  <Text style={styles.driverInsight}>
                    <Text style={styles.bold}>Your situation: </Text>
                    {education.getInsight(inputs, value)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 2/4</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 3: CALCULATIONS - Matching Ambient PDF Page 4 */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{careSettingLabel} ROI Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>HOW EACH VALUE IS CALCULATED</Text>
        <Text style={{ fontSize: 7, color: colors.darkGray, marginBottom: 8 }}>
          Every number traces back to your inputs and transparent assumptions. Here's the math:
        </Text>

        {enabledDrivers.map((driverId) => {
          const value = driverValues[driverId] || 0;
          
          // Generate calculation steps based on driver
          let steps: string[] = [];
          let keyInputs: { label: string; value: string }[] = [];
          
          if (driverId === 'patientAccess') {
            const allocatedHours = Math.round(hoursReturned * (inputs.patientAccess.pctTimeToNewVisits / 100));
            const visits = Math.round((allocatedHours * 60) / inputs.patientAccess.avgVisitDurationMinutes);
            keyInputs = [
              { label: 'Time to access', value: `${inputs.patientAccess.pctTimeToNewVisits}%` },
              { label: 'Visit duration', value: `${inputs.patientAccess.avgVisitDurationMinutes} min` },
              { label: 'Revenue/visit', value: formatCurrency(inputs.patientAccess.avgNetRevenuePerVisit) },
            ];
            steps = [
              `Step 1: ${formatNumber(hoursReturned)} hours returned × ${inputs.patientAccess.pctTimeToNewVisits}% = ${formatNumber(allocatedHours)} hours to access`,
              `Step 2: ${formatNumber(allocatedHours)} hours × 60 ÷ ${inputs.patientAccess.avgVisitDurationMinutes} min = ${formatNumber(visits)} additional visits`,
              `Step 3: ${formatNumber(visits)} visits × ${formatCurrency(inputs.patientAccess.avgNetRevenuePerVisit)} = ${formatCurrency(value)}`,
            ];
          } else if (driverId === 'wrvu') {
            const baseWrvu = Math.round(eligibleEncounters * inputs.baselineWrvuPerEncounter);
            const wrvuGain = Math.round(baseWrvu * (inputs.wrvu.pctIncreaseWrvuPerEncounter / 100));
            keyInputs = [
              { label: 'Baseline wRVU/enc', value: inputs.baselineWrvuPerEncounter.toString() },
              { label: 'Improvement', value: `${inputs.wrvu.pctIncreaseWrvuPerEncounter}%` },
              { label: 'Conversion factor', value: `$${inputs.wrvu.wrvuConversionFactor}` },
            ];
            steps = [
              `Step 1: ${formatNumber(eligibleEncounters)} enc × ${inputs.baselineWrvuPerEncounter} wRVU = ${formatNumber(baseWrvu)} baseline wRVUs`,
              `Step 2: ${formatNumber(baseWrvu)} × ${inputs.wrvu.pctIncreaseWrvuPerEncounter}% = ${formatNumber(wrvuGain)} wRVU gain`,
              `Step 3: ${formatNumber(wrvuGain)} wRVU × $${inputs.wrvu.wrvuConversionFactor} = ${formatCurrency(value)}`,
            ];
          } else if (driverId === 'workforce') {
            const departures = inputs.workforce.providerCount * (inputs.workforce.baselineAttritionRate / 100);
            const burnout = departures * (inputs.workforce.pctAttritionLinkedToBurnout / 100);
            const avoided = burnout * (inputs.workforce.pctBurnoutExitsAvoided / 100);
            keyInputs = [
              { label: 'Turnover rate', value: `${inputs.workforce.baselineAttritionRate}%` },
              { label: 'Burnout portion', value: `${inputs.workforce.pctAttritionLinkedToBurnout}%` },
              { label: 'Replacement cost', value: formatCurrency(inputs.workforce.costPerDeparture) },
            ];
            steps = [
              `Step 1: ${inputs.workforce.providerCount} providers × ${inputs.workforce.baselineAttritionRate}% = ${departures.toFixed(1)} departures/year`,
              `Step 2: ${departures.toFixed(1)} × ${inputs.workforce.pctAttritionLinkedToBurnout}% burnout = ${burnout.toFixed(2)} preventable`,
              `Step 3: ${burnout.toFixed(2)} × ${inputs.workforce.pctBurnoutExitsAvoided}% avoided = ${avoided.toFixed(2)} retained`,
              `Step 4: ${avoided.toFixed(2)} × ${formatCurrency(inputs.workforce.costPerDeparture)} = ${formatCurrency(value)}`,
            ];
          } else if (driverId === 'denials') {
            const totalDenials = Math.round(eligibleEncounters * (inputs.denials.baselineDenialRate / 100));
            const docDenials = Math.round(totalDenials * (inputs.denials.pctDenialsFromDocumentation / 100));
            const recovered = Math.round(docDenials * (inputs.denials.pctDocDenialsRecovered / 100));
            keyInputs = [
              { label: 'Denial rate', value: `${inputs.denials.baselineDenialRate}%` },
              { label: 'Doc-related', value: `${inputs.denials.pctDenialsFromDocumentation}%` },
              { label: 'Recovery rate', value: `${inputs.denials.pctDocDenialsRecovered}%` },
            ];
            steps = [
              `Step 1: ${formatNumber(eligibleEncounters)} enc × ${inputs.denials.baselineDenialRate}% = ${formatNumber(totalDenials)} denials`,
              `Step 2: ${formatNumber(totalDenials)} × ${inputs.denials.pctDenialsFromDocumentation}% = ${formatNumber(docDenials)} doc-related`,
              `Step 3: ${formatNumber(docDenials)} × ${inputs.denials.pctDocDenialsRecovered}% = ${formatNumber(recovered)} recovered`,
              `Step 4: ${formatNumber(recovered)} × ${formatCurrency(inputs.denials.avgRevenuePerEncounter)} = ${formatCurrency(value)}`,
            ];
          } else if (driverId === 'overtime') {
            const afterHours = Math.round(hoursReturned * (inputs.overtime.pctAfterHours / 100));
            const reduced = Math.round(afterHours * (inputs.overtime.pctOvertimeReduced / 100));
            keyInputs = [
              { label: 'After-hours %', value: `${inputs.overtime.pctAfterHours}%` },
              { label: 'OT reduction', value: `${inputs.overtime.pctOvertimeReduced}%` },
              { label: 'OT rate', value: `$${inputs.overtime.blendedOvertimeRate}/hr` },
            ];
            steps = [
              `Step 1: ${formatNumber(hoursReturned)} hours × ${inputs.overtime.pctAfterHours}% = ${formatNumber(afterHours)} after-hours`,
              `Step 2: ${formatNumber(afterHours)} × ${inputs.overtime.pctOvertimeReduced}% = ${formatNumber(reduced)} OT reduced`,
              `Step 3: ${formatNumber(reduced)} hrs × $${inputs.overtime.blendedOvertimeRate} = ${formatCurrency(value)}`,
            ];
          } else if (driverId === 'hcc') {
            const riskEnc = Math.round(eligibleEncounters * (inputs.hcc.pctMedicareAdvantage / 100));
            keyInputs = [
              { label: 'MA %', value: `${inputs.hcc.pctMedicareAdvantage}%` },
              { label: 'Missed conditions', value: `${inputs.hcc.pctConditionsMissed}%` },
              { label: 'Recapture rate', value: `${inputs.hcc.pctMissedConditionsRecaptured}%` },
            ];
            steps = [
              `Step 1: ${formatNumber(eligibleEncounters)} enc × ${inputs.hcc.pctMedicareAdvantage}% MA = ${formatNumber(riskEnc)} risk encounters`,
              `Step 2: HCC opportunity calculation based on condition capture rates`,
              `Step 3: Risk-adjusted annual value = ${formatCurrency(value)}`,
            ];
          }
          
          return (
            <View key={driverId} style={styles.gapCard}>
              <View style={styles.gapCardHeader}>
                <Text style={styles.gapCardTitle}>{leverLabels[driverId]}</Text>
                <Text style={styles.gapCardValue}>{formatCurrency(value)}</Text>
              </View>
              <View style={styles.gapCardValues}>
                {keyInputs.map((input, i) => (
                  <Text key={i} style={styles.gapValueItem}>
                    {input.label}: <Text style={styles.gapValueBold}>{input.value}</Text>
                  </Text>
                ))}
              </View>
              <View style={styles.gapCardSteps}>
                {steps.map((step, i) => (
                  <Text key={i} style={styles.gapStep}>{step}</Text>
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.totalGapBox}>
          <View style={styles.totalGapRow}>
            <Text style={styles.totalGapLabel}>TOTAL ANNUAL VALUE</Text>
            <Text style={styles.totalGapValue}>{formatCurrency(results.totalAnnualBenefit)}</Text>
          </View>
          <Text style={styles.totalGapBreakdown}>
            {enabledDrivers.map(id => `${leverLabels[id]} (${formatCurrency(driverValues[id] || 0)})`).join(' + ')}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 3/4</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* PAGE 4: METHODOLOGY & SCALING - Compact final page */}
      {/* ================================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{careSettingLabel} ROI Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>THE ECONOMICS OF SCALING</Text>

        {/* Per-provider economics */}
        <View style={[styles.gapCard, { marginBottom: 10 }]}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>ANNUAL BENEFIT PER PROVIDER</Text>
            <Text style={styles.gapCardValue}>{formatCurrency(netPerProvider)} net</Text>
          </View>
          <View style={{ padding: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.black }}>{formatCurrency(valuePerProvider)}</Text>
              <Text style={{ fontSize: 6, color: colors.mediumGray }}>Gross value/provider</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.green }}>{formatCurrency(netPerProvider)}</Text>
              <Text style={{ fontSize: 6, color: colors.mediumGray }}>Net benefit/provider</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.black }}>{formatCurrency(inputs.monthlyCostPerProvider * 12)}</Text>
              <Text style={{ fontSize: 6, color: colors.mediumGray }}>Investment/provider</Text>
            </View>
          </View>
          <View style={{ padding: 8, paddingTop: 0 }}>
            <Text style={{ fontSize: 7, color: colors.darkGray, lineHeight: 1.5 }}>
              Every provider NOT using Abridge represents {formatCurrency(valuePerProvider)} in unrealized annual value. Scaling from {inputs.numberOfProviders} to {fullScaleProviders} providers could generate {formatCurrency(fullScaleValue)} annually.
            </Text>
          </View>
        </View>

        {/* Scaling scenarios */}
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <View style={{ flex: 1, backgroundColor: colors.backgroundGray, borderRadius: 4, padding: 8, marginRight: 4 }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: colors.mediumGray, marginBottom: 6 }}>SCALING SCENARIOS</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 7, color: colors.darkGray }}>+10 providers</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: colors.green }}>+{formatCurrency(netPerProvider * 10)}/yr</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 7, color: colors.darkGray }}>+25 providers</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: colors.green }}>+{formatCurrency(netPerProvider * 25)}/yr</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 7, color: colors.darkGray }}>+50 providers</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: colors.green }}>+{formatCurrency(netPerProvider * 50)}/yr</Text>
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.backgroundGray, borderRadius: 4, padding: 8 }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: colors.mediumGray, marginBottom: 6 }}>MULTI-YEAR PROJECTION</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 7, color: colors.darkGray }}>Year 1 net</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: colors.green }}>{formatCurrency(netGain)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 7, color: colors.darkGray }}>Year 2 net</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: colors.green }}>{formatCurrency(year2 - annualInvestment)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 7, color: colors.darkGray }}>Year 3 net</Text>
              <Text style={{ fontSize: 7, fontWeight: 'bold', color: colors.green }}>{formatCurrency(year3 - annualInvestment)}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.borderGray, marginTop: 4, paddingTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 7, fontWeight: 'bold', color: colors.black }}>3-Year Total</Text>
                <Text style={{ fontSize: 7, fontWeight: 'bold', color: colors.green }}>{formatCurrency(threeYearNet)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Key takeaways */}
        <View style={styles.takeawaysBox}>
          <Text style={styles.takeawaysTitle}>KEY TAKEAWAYS</Text>
          <Text style={styles.takeawayItem}>Investment of {formatCurrency(annualInvestment)}/year generates {formatCurrency(results.totalAnnualBenefit)} in value ({roi.toFixed(1)}x ROI)</Text>
          <Text style={styles.takeawayItem}>Net annual gain of {formatCurrency(netGain)} represents real operational and financial improvement</Text>
          <Text style={styles.takeawayItem}>Each provider generates {formatCurrency(netPerProvider)} in net annual value after investment cost</Text>
          <Text style={styles.takeawayItem}>Over 3 years, cumulative net benefit reaches {formatCurrency(threeYearNet)} (assumes 10% annual growth)</Text>
        </View>

        {/* Methodology */}
        <View style={styles.methodologySection}>
          <Text style={styles.methodologyTitle}>METHODOLOGY & ASSUMPTIONS</Text>
          <View style={styles.methodologyGrid}>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Your Inputs</Text>
              <Text style={styles.methodologyItem}>{inputs.numberOfProviders} providers</Text>
              <Text style={styles.methodologyItem}>{formatNumber(inputs.annualOutpatientEncounters)} annual encounters</Text>
              <Text style={styles.methodologyItem}>{inputs.abridgeUtilizationPct}% utilization</Text>
              <Text style={styles.methodologyItem}>{inputs.minutesSavedPerEncounter} min saved/encounter</Text>
              <Text style={styles.methodologyItem}>${inputs.monthlyCostPerProvider}/provider/month</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Benchmarks Used</Text>
              <Text style={styles.methodologyItem}>wRVU conversion: ${inputs.wrvu?.wrvuConversionFactor || 33} (Medicare)</Text>
              <Text style={styles.methodologyItem}>Provider replacement: ${(inputs.workforce?.costPerDeparture || 400000).toLocaleString()}</Text>
              <Text style={styles.methodologyItem}>Time value: $150/hr (fully-loaded)</Text>
              <Text style={styles.methodologyItem}>Visit conversion: 60% of capacity</Text>
              <Text style={styles.methodologyItem}>Burnout attribution: 30%</Text>
            </View>
          </View>
          <Text style={styles.methodologyNote}>
            Benchmarks based on aggregate data from 200+ health system partners. Individual results vary based on specialty mix, payer mix, and operational factors. Conservative assumptions used throughout—actual value may be higher.
          </Text>
        </View>

        {/* Closing */}
        <View style={{ backgroundColor: colors.backgroundGray, padding: 10, borderRadius: 4, marginTop: 10, borderLeftWidth: 4, borderLeftColor: colors.primary }}>
          <Text style={{ fontSize: 8, color: colors.darkGray, lineHeight: 1.6, fontStyle: 'italic' }}>
            "This isn't about whether ambient AI creates value—it does. The question is whether you'll capture 40% of that value or 85%. That choice is worth {formatCurrency(netGain)} annually in {careSettingLabel.toLowerCase()} alone."
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 4/4</Text>
        </View>
      </Page>
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTION
// ============================================================================

export async function generateOutpatientPDF(
  inputs: RoiInputs,
  results: ReturnType<typeof calculateRoi>,
  enabledDrivers: LeverId[],
  driverValues: Record<LeverId, number>,
  careSettingLabel: string = "Outpatient",
  organizationName?: string,
  journeyData?: {
    fullScaleProviders: number;
    targetUtilization: number;
    fullScaleValue: number;
  }
) {
  const blob = await pdf(
    <OutpatientPDFDocument
      inputs={inputs}
      results={results}
      enabledDrivers={enabledDrivers}
      driverValues={driverValues}
      careSettingLabel={careSettingLabel}
      organizationName={organizationName}
      journeyData={journeyData}
    />
  ).toBlob();

  const today = new Date().toISOString().split("T")[0];
  const orgSlug = organizationName
    ? organizationName.replace(/\s+/g, "-").toLowerCase().substring(0, 20)
    : "";
  const filename = orgSlug
    ? `abridge-${careSettingLabel.toLowerCase()}-roi-${orgSlug}-${today}.pdf`
    : `abridge-${careSettingLabel.toLowerCase()}-roi-${today}.pdf`;

  await savePdfBlob(blob, filename);
}

export default OutpatientPDFDocument;
