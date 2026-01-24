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
import type { RoiInputs, LeverId } from "@/lib/roi-types";
import { leverLabels } from "@/lib/roi-types";
import type { calculateRoi } from "@/lib/roi-calculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

interface OutpatientPDFData {
  inputs: RoiInputs;
  results: ReturnType<typeof calculateRoi>;
  enabledDrivers: LeverId[];
  driverValues: Record<LeverId, number>;
  careSettingLabel: string;
  organizationName?: string;
  journeyData?: {
    startingProviders: number;
    fullScaleProviders: number;
    startingValue: number;
    fullScaleValue: number;
    targetUtilization: number;
    scalingPace: string;
    compoundingBonus: number;
  };
}

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  primaryDark: "#C42400",
  green: "#059669",
  greenLight: "#ECFDF5",
  greenDark: "#047857",
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  backgroundGray: "#F9FAFB",
  borderGray: "#E5E7EB",
  white: "#FFFFFF",
  warningBg: "#FEF3C7",
  warningBorder: "#F59E0B",
  warningText: "#92400E",
  mathBg: "#FFFBF5",
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
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
  headerSubtitle: {
    fontSize: 8,
    color: colors.mediumGray,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
  },
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
  metricCardHighlight: {
    flex: 1,
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 8,
    marginRight: 6,
    alignItems: "center",
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
  metricValueLarge: {
    fontSize: 20,
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
    textTransform: "uppercase",
  },
  metricDescription: {
    fontSize: 6,
    color: colors.lightGray,
    textAlign: "center",
    lineHeight: 1.3,
  },
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
  findingsText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  findingsSubtitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 3,
    marginTop: 6,
  },
  driverCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  driverName: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  driverValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.green,
  },
  driverTheory: {
    backgroundColor: colors.mathBg,
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  driverTheoryLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  driverTheoryText: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
  },
  driverCalcSection: {
    marginTop: 6,
  },
  driverStepLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  driverStepText: {
    fontSize: 7,
    color: colors.darkGray,
    marginBottom: 2,
  },
  driverStepMath: {
    fontSize: 7,
    fontFamily: "Courier",
    color: colors.black,
    backgroundColor: colors.backgroundGray,
    padding: 4,
    borderRadius: 2,
    marginBottom: 6,
  },
  driverStepResult: {
    fontSize: 8,
    fontFamily: "Courier",
    fontWeight: "bold",
    color: colors.green,
    backgroundColor: colors.greenLight,
    padding: 4,
    borderRadius: 2,
  },
  driverBenchmark: {
    backgroundColor: colors.backgroundGray,
    padding: 6,
    borderRadius: 4,
    marginTop: 6,
  },
  driverBenchmarkTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 4,
  },
  driverBenchmarkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  driverBenchmarkLabel: {
    fontSize: 6,
    color: colors.darkGray,
  },
  driverBenchmarkValue: {
    fontSize: 6,
    color: colors.black,
    fontWeight: "bold",
  },
  warningBox: {
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: 4,
    padding: 8,
    marginTop: 6,
  },
  warningTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.warningText,
    marginBottom: 2,
  },
  warningText: {
    fontSize: 6,
    color: colors.warningText,
    lineHeight: 1.4,
  },
  investmentBox: {
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  investmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  investmentLabel: {
    fontSize: 8,
    color: colors.darkGray,
  },
  investmentValue: {
    fontSize: 8,
    color: colors.black,
    fontWeight: "bold",
  },
  investmentDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginVertical: 6,
  },
  investmentTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.greenLight,
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  investmentTotalLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
  },
  investmentTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.green,
  },
  valueBreakdownGrid: {
    flexDirection: "row",
    marginBottom: 10,
  },
  valueBreakdownCard: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginRight: 6,
  },
  valueBreakdownCardLast: {
    marginRight: 0,
  },
  valueBreakdownTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.mediumGray,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  valueBreakdownAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },
  valueBreakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  valueBreakdownItemLabel: {
    fontSize: 7,
    color: colors.darkGray,
  },
  valueBreakdownItemValue: {
    fontSize: 7,
    color: colors.green,
    fontWeight: "bold",
  },
  progressBarContainer: {
    height: 12,
    flexDirection: "row",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarSegment: {
    height: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarLabel: {
    fontSize: 6,
    color: colors.white,
    fontWeight: "bold",
  },
  projectionTable: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  projectionHeader: {
    flexDirection: "row",
    backgroundColor: colors.backgroundGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  projectionHeaderCell: {
    flex: 1,
    padding: 6,
    fontSize: 7,
    fontWeight: "bold",
    color: colors.mediumGray,
    textAlign: "center",
  },
  projectionRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  projectionRowLast: {
    borderBottomWidth: 0,
  },
  projectionCell: {
    flex: 1,
    padding: 6,
    fontSize: 8,
    color: colors.darkGray,
    textAlign: "center",
  },
  projectionCellBold: {
    flex: 1,
    padding: 6,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    textAlign: "center",
  },
  projectionCellGreen: {
    flex: 1,
    padding: 6,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.green,
    textAlign: "center",
  },
  perProviderBox: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  perProviderTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  perProviderGrid: {
    flexDirection: "row",
    marginBottom: 8,
  },
  perProviderItem: {
    flex: 1,
    alignItems: "center",
  },
  perProviderValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  perProviderLabel: {
    fontSize: 6,
    color: colors.mediumGray,
    textAlign: "center",
  },
  perProviderInsight: {
    fontSize: 7,
    color: colors.darkGray,
    lineHeight: 1.5,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
  },
  perProviderScaling: {
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  perProviderScalingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  perProviderScalingLabel: {
    fontSize: 7,
    color: colors.darkGray,
  },
  perProviderScalingValue: {
    fontSize: 7,
    fontWeight: "bold",
    color: colors.green,
  },
  methodologySection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
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
    marginTop: 8,
    fontStyle: "italic",
  },
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
  closingQuote: {
    backgroundColor: colors.backgroundGray,
    padding: 12,
    borderRadius: 4,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  closingQuoteText: {
    fontSize: 9,
    color: colors.darkGray,
    lineHeight: 1.6,
    fontStyle: "italic",
  },
  bold: {
    fontWeight: "bold",
  },
});

const formatCurrency = (num: number): string => {
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num.toLocaleString()}`;
};

const formatNumber = (num: number): string => num.toLocaleString();

interface DriverContent {
  theory: string;
  getSteps: (inputs: RoiInputs, value: number, eligibleEncounters: number, hoursReturned: number) => {
    label: string;
    description: string;
    math: string;
    result?: string;
  }[];
  benchmarks?: { label: string; value: string }[];
  warning?: { title: string; text: string };
}

const getDriverContent = (driverId: LeverId): DriverContent => {
  switch (driverId) {
    case "patientAccess":
      return {
        theory: "When clinicians spend less time on documentation, they have capacity to see additional patients. Not all saved time converts to visits—scheduling, room availability, and demand limit realization—but even a modest portion creates meaningful revenue.",
        getSteps: (inputs, value, eligibleEncounters, hoursReturned) => {
          const allocatedHours = hoursReturned * (inputs.patientAccess.pctTimeToNewVisits / 100);
          const additionalVisits = Math.round((allocatedHours * 60) / inputs.patientAccess.avgVisitDurationMinutes);
          return [
            {
              label: "Step 1: Time Returned",
              description: "How much time does Abridge give back?",
              math: `${formatNumber(eligibleEncounters)} enc x ${inputs.minutesSavedPerEncounter} min / 60 = ${formatNumber(hoursReturned)} hrs`,
            },
            {
              label: "Step 2: Time Allocated to Access",
              description: `What portion of saved time goes toward seeing more patients? (${inputs.patientAccess.pctTimeToNewVisits}%)`,
              math: `${formatNumber(hoursReturned)} hrs x ${inputs.patientAccess.pctTimeToNewVisits}% = ${formatNumber(Math.round(allocatedHours))} hrs`,
            },
            {
              label: "Step 3: Conversion to Visits",
              description: "How many additional visits is that?",
              math: `${formatNumber(Math.round(allocatedHours))} hrs x 60 / ${inputs.patientAccess.avgVisitDurationMinutes} min/visit = ${formatNumber(additionalVisits)} visits`,
            },
            {
              label: "Step 4: Revenue Impact",
              description: "What's the revenue value?",
              math: `${formatNumber(additionalVisits)} visits x ${formatCurrency(inputs.patientAccess.avgNetRevenuePerVisit)}/visit`,
              result: formatCurrency(value),
            },
          ];
        },
        benchmarks: [
          { label: "Primary Care", value: "$100 - $150" },
          { label: "Specialty", value: "$175 - $300" },
          { label: "Procedural", value: "$300 - $600+" },
        ],
      };

    case "wrvu":
      return {
        theory: "Physicians under time pressure document less than the full clinical picture. AI-assisted documentation captures the complexity that supports accurate coding—not upcoding, just getting credit for work already done.",
        getSteps: (inputs, value, eligibleEncounters) => {
          const baselineWrvus = eligibleEncounters * inputs.baselineWrvuPerEncounter;
          const wrvuGain = baselineWrvus * (inputs.wrvu.pctIncreaseWrvuPerEncounter / 100);
          return [
            {
              label: "Step 1: Baseline wRVUs",
              description: "What's your current productivity?",
              math: `${formatNumber(eligibleEncounters)} enc x ${inputs.baselineWrvuPerEncounter} wRVU/enc = ${formatNumber(Math.round(baselineWrvus))} wRVUs`,
            },
            {
              label: "Step 2: wRVU Improvement",
              description: `How much does Abridge improve capture? (+${inputs.wrvu.pctIncreaseWrvuPerEncounter}%)`,
              math: `${formatNumber(Math.round(baselineWrvus))} wRVUs x ${inputs.wrvu.pctIncreaseWrvuPerEncounter}% = ${formatNumber(Math.round(wrvuGain))} wRVU gain`,
            },
            {
              label: "Step 3: Revenue Impact",
              description: "What's the dollar value?",
              math: `${formatNumber(Math.round(wrvuGain))} wRVU x ${formatCurrency(inputs.wrvu.wrvuConversionFactor)}/wRVU`,
              result: formatCurrency(value),
            },
          ];
        },
        benchmarks: [
          { label: "Medicare (2024)", value: "$33" },
          { label: "Commercial (typical)", value: "$45 - $65" },
        ],
      };

    case "workforce":
      return {
        theory: "Documentation burden is the #1 driver of physician burnout. Reducing this burden improves satisfaction and retention. Replacing a physician costs $400K-$800K+ when you factor in recruiting, lost revenue during vacancy, and onboarding.",
        getSteps: (inputs, value) => {
          const departures = inputs.workforce.providerCount * (inputs.workforce.baselineAttritionRate / 100);
          const burnoutRelated = departures * (inputs.workforce.pctAttritionLinkedToBurnout / 100);
          const avoided = burnoutRelated * (inputs.workforce.pctBurnoutExitsAvoided / 100);
          return [
            {
              label: "Step 1: Baseline Turnover",
              description: "What's the current turnover situation?",
              math: `${inputs.workforce.providerCount} providers x ${inputs.workforce.baselineAttritionRate}% = ${departures.toFixed(1)} departures/year`,
            },
            {
              label: "Step 2: Burnout-Related Departures",
              description: `How much is burnout-driven? (${inputs.workforce.pctAttritionLinkedToBurnout}%)`,
              math: `${departures.toFixed(1)} departures x ${inputs.workforce.pctAttritionLinkedToBurnout}% = ${burnoutRelated.toFixed(2)} preventable`,
            },
            {
              label: "Step 3: Abridge Attribution",
              description: "What can Abridge prevent? (Rule of Thirds: 30%)",
              math: `${burnoutRelated.toFixed(2)} preventable x ${inputs.workforce.pctBurnoutExitsAvoided}% = ${avoided.toFixed(2)}/year avoided`,
            },
            {
              label: "Step 4: Cost Savings",
              description: "What's the dollar value?",
              math: `${avoided.toFixed(2)} avoided x ${formatCurrency(inputs.workforce.costPerDeparture)} replacement cost`,
              result: formatCurrency(value),
            },
          ];
        },
        warning: {
          title: "Long-term Investment Metric",
          text: "With fewer than 50 providers, retention savings are probabilistic over multi-year periods. Consider this a long-term investment metric rather than a near-term ROI driver.",
        },
      };

    case "denials":
      return {
        theory: "Most denials are recoverable—you appeal, you win, it just costs time. But a portion of documentation-related denials are written off without appeal. Abridge captures the clinical reasoning that saves these.",
        getSteps: (inputs, value, eligibleEncounters) => {
          const totalDenials = eligibleEncounters * (inputs.denials.baselineDenialRate / 100);
          const docDenials = totalDenials * (inputs.denials.pctDenialsFromDocumentation / 100);
          const writtenOff = docDenials * ((100 - inputs.denials.pctDenialsRecoveredAfterRework) / 100);
          const recovered = writtenOff * (inputs.denials.pctDocDenialsRecovered / 100);
          return [
            {
              label: "Step 1: Total Denials",
              description: "How many claims get denied?",
              math: `${formatNumber(eligibleEncounters)} enc x ${inputs.denials.baselineDenialRate}% = ${formatNumber(Math.round(totalDenials))} denials`,
            },
            {
              label: "Step 2: Documentation-Related",
              description: "How many are due to documentation?",
              math: `${formatNumber(Math.round(totalDenials))} x ${inputs.denials.pctDenialsFromDocumentation}% = ${formatNumber(Math.round(docDenials))} doc denials`,
            },
            {
              label: "Step 3: Written Off",
              description: "How many are not recovered?",
              math: `${formatNumber(Math.round(docDenials))} x ${100 - inputs.denials.pctDenialsRecoveredAfterRework}% = ${formatNumber(Math.round(writtenOff))} written off`,
            },
            {
              label: "Step 4: Revenue Recovered",
              description: "What does Abridge recover?",
              math: `${formatNumber(Math.round(recovered))} claims x ${formatCurrency(inputs.denials.avgRevenuePerEncounter)}`,
              result: formatCurrency(value),
            },
          ];
        },
      };

    case "overtime":
      return {
        theory: "When documentation is done during clinical hours instead of after, overtime costs decrease. This is a direct labor cost reduction that shows up on the P&L.",
        getSteps: (inputs, value, _eligibleEncounters, hoursReturned) => {
          const allocatedHours = hoursReturned * (inputs.overtime.pctOvertimeReduced / 100);
          return [
            {
              label: "Step 1: Hours Returned",
              description: "How much time does Abridge give back?",
              math: `${formatNumber(hoursReturned)} hours returned annually`,
            },
            {
              label: "Step 2: Overtime Reduction",
              description: `What portion reduces overtime? (${inputs.overtime.pctOvertimeReduced}%)`,
              math: `${formatNumber(hoursReturned)} hrs x ${inputs.overtime.pctOvertimeReduced}% = ${formatNumber(Math.round(allocatedHours))} hrs`,
            },
            {
              label: "Step 3: Cost Savings",
              description: "What's the dollar value?",
              math: `${formatNumber(Math.round(allocatedHours))} hrs x ${formatCurrency(inputs.overtime.blendedOvertimeRate)}/hr`,
              result: formatCurrency(value),
            },
          ];
        },
      };

    case "hcc":
      return {
        theory: "Medicare Advantage reimbursement is risk-adjusted. Complete documentation captures conditions that increase RAF scores and PMPM payments—not gaming the system, just getting credit for actual patient complexity.",
        getSteps: (inputs, value, eligibleEncounters) => {
          const maPatients = inputs.totalMedicareAdvantagePatients;
          const missedConditions = maPatients * inputs.hcc.avgConditionsPerMember * (inputs.hcc.pctConditionsMissed / 100);
          const recaptured = missedConditions * (inputs.hcc.pctMissedConditionsRecaptured / 100);
          return [
            {
              label: "Step 1: MA Population",
              description: "How many Medicare Advantage patients?",
              math: `${formatNumber(maPatients)} MA patients`,
            },
            {
              label: "Step 2: Missed Conditions",
              description: `How many conditions are missed? (${inputs.hcc.pctConditionsMissed}% of avg ${inputs.hcc.avgConditionsPerMember} per member)`,
              math: `${formatNumber(maPatients)} x ${inputs.hcc.avgConditionsPerMember} x ${inputs.hcc.pctConditionsMissed}% = ${formatNumber(Math.round(missedConditions))} missed`,
            },
            {
              label: "Step 3: Recaptured by Abridge",
              description: `How many does Abridge recapture? (${inputs.hcc.pctMissedConditionsRecaptured}%)`,
              math: `${formatNumber(Math.round(missedConditions))} x ${inputs.hcc.pctMissedConditionsRecaptured}% = ${formatNumber(Math.round(recaptured))} recaptured`,
            },
            {
              label: "Step 4: Revenue Impact",
              description: "What's the dollar value?",
              math: `${formatNumber(Math.round(recaptured))} conditions x ${formatCurrency(inputs.hcc.rafGainPerCondition)} RAF gain`,
              result: formatCurrency(value),
            },
          ];
        },
      };

    default:
      return {
        theory: "This value driver captures additional benefits from AI-assisted documentation.",
        getSteps: (_inputs, value) => [
          {
            label: "Annual Value",
            description: "Calculated benefit from this driver",
            math: "",
            result: formatCurrency(value),
          },
        ],
      };
  }
};

const getROINarrative = (roi: number, netGain: number, totalBenefit: number): string => {
  if (roi >= 5) {
    return `This is a compelling investment. At ${roi.toFixed(1)}x ROI, every dollar invested returns ${roi.toFixed(2)} dollars in value. The ${formatCurrency(netGain)} net annual gain demonstrates strong economic justification for deployment.`;
  } else if (roi >= 3) {
    return `This is a solid investment with ${roi.toFixed(1)}x returns. The ${formatCurrency(netGain)} net annual gain provides meaningful value while leaving room for additional optimization as utilization increases.`;
  } else if (roi >= 2) {
    return `At ${roi.toFixed(1)}x ROI, this investment pays for itself with room to spare. The ${formatCurrency(netGain)} net gain represents a conservative starting point that typically improves with adoption.`;
  } else {
    return `With ${roi.toFixed(1)}x ROI, this investment generates ${formatCurrency(netGain)} in net value. Consider strategies to increase utilization or enable additional value drivers to strengthen returns.`;
  }
};

const getDriverMixInsight = (laborValue: number, revenueValue: number, totalBenefit: number): string => {
  const laborPct = Math.round((laborValue / totalBenefit) * 100) || 0;
  const revenuePct = 100 - laborPct;

  if (laborPct > 60) {
    return `Your value composition is ${laborPct}% labor efficiency and ${revenuePct}% revenue enhancement. This labor-heavy mix is typical for organizations prioritizing operational efficiency and burnout reduction.`;
  } else if (revenuePct > 60) {
    return `Your value composition is ${revenuePct}% revenue enhancement and ${laborPct}% labor efficiency. This revenue-focused mix maximizes financial returns through patient access and coding optimization.`;
  } else {
    return `Your value is balanced: ${laborPct}% from labor efficiency and ${revenuePct}% from revenue enhancement. This diversified approach captures value across multiple dimensions.`;
  }
};

const OutpatientPDFDocument = ({
  inputs,
  results,
  enabledDrivers,
  driverValues,
  careSettingLabel,
  organizationName,
}: OutpatientPDFData) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const eligibleEncounters = Math.round(inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100));
  const hoursReturned = Math.round((eligibleEncounters * inputs.minutesSavedPerEncounter) / 60);
  const annualInvestment = inputs.numberOfProviders * inputs.monthlyCostPerProvider * 12;
  const netGain = results.totalAnnualBenefit - annualInvestment;
  const roi = annualInvestment > 0 ? results.totalAnnualBenefit / annualInvestment : 0;

  const laborDriverIds: LeverId[] = ["overtime", "workforce"];
  const revenueDriverIds: LeverId[] = ["patientAccess", "wrvu", "denials", "hcc"];

  const laborDrivers = enabledDrivers.filter(id => laborDriverIds.includes(id));
  const revenueDrivers = enabledDrivers.filter(id => revenueDriverIds.includes(id));

  const laborValue = laborDrivers.reduce((sum, id) => sum + (driverValues[id] || 0), 0);
  const revenueValue = revenueDrivers.reduce((sum, id) => sum + (driverValues[id] || 0), 0);

  const laborPct = results.totalAnnualBenefit > 0 ? Math.round((laborValue / results.totalAnnualBenefit) * 100) : 0;
  const revenuePct = 100 - laborPct;

  const valuePerProvider = inputs.numberOfProviders > 0 ? results.totalAnnualBenefit / inputs.numberOfProviders : 0;
  const netPerProvider = inputs.numberOfProviders > 0 ? netGain / inputs.numberOfProviders : 0;
  const investmentPerProvider = inputs.monthlyCostPerProvider * 12;

  const year1Value = results.totalAnnualBenefit;
  const year2Value = Math.round(year1Value * 1.1);
  const year3Value = Math.round(year2Value * 1.1);
  const threeYearValue = year1Value + year2Value + year3Value;
  const threeYearCost = annualInvestment * 3;
  const threeYearNet = threeYearValue - threeYearCost;

  const driverPages = Math.ceil(enabledDrivers.length / 2);
  const totalPages = 1 + driverPages + 2;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{careSettingLabel} ROI Assessment</Text>
            <Text style={styles.headerSubtitle}>{today}</Text>
          </View>
        </View>

        {organizationName && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.black }}>
              {organizationName}
            </Text>
            <Text style={{ fontSize: 9, color: colors.mediumGray }}>
              {inputs.numberOfProviders} Providers - {formatNumber(inputs.annualOutpatientEncounters)} Encounters
            </Text>
          </View>
        )}

        <View style={styles.introBox}>
          <Text style={styles.introTitle}>THE FRAME</Text>
          <Text style={styles.introText}>
            Most organizations ask "What's the ROI of ambient AI?" That's the wrong question.
          </Text>
          <Text style={styles.introText}>
            The right question is: "Which value drivers matter most to us, and how do we capture them?"
          </Text>
          <Text style={styles.introText}>
            This assessment models your specific priorities: {enabledDrivers.map((id) => leverLabels[id]).join(", ")}.
            Each driver includes transparent calculations you can validate, adjust, and defend to your leadership.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>YOUR RESULTS AT A GLANCE</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCardHighlight}>
            <Text style={styles.metricValueLarge}>+{formatCurrency(netGain)}</Text>
            <Text style={styles.metricLabel}>Net Annual Gain</Text>
            <Text style={styles.metricDescription}>{formatCurrency(results.totalAnnualBenefit)} value - {formatCurrency(annualInvestment)} investment</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{roi.toFixed(1)}x</Text>
            <Text style={styles.metricLabel}>Return on Investment</Text>
            <Text style={styles.metricDescription}>Every $1 invested returns ${roi.toFixed(2)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatNumber(hoursReturned)}</Text>
            <Text style={styles.metricLabel}>Hours Returned</Text>
            <Text style={styles.metricDescription}>Annual documentation time saved</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardLast]}>
            <Text style={styles.metricValueGreen}>{formatCurrency(netPerProvider)}</Text>
            <Text style={styles.metricLabel}>Per Provider</Text>
            <Text style={styles.metricDescription}>Net annual benefit per provider</Text>
          </View>
        </View>

        <View style={styles.findingsSection}>
          <Text style={styles.findingsTitle}>OUR FINDINGS</Text>
          <Text style={styles.findingsText}>
            {getROINarrative(roi, netGain, results.totalAnnualBenefit)}
          </Text>
          <Text style={styles.findingsSubtitle}>Value Composition</Text>
          <Text style={styles.findingsText}>
            {getDriverMixInsight(laborValue, revenueValue, results.totalAnnualBenefit)}
          </Text>
          <Text style={styles.findingsSubtitle}>Your Deployment</Text>
          <Text style={styles.findingsText}>
            At {inputs.abridgeUtilizationPct}% utilization across {formatNumber(inputs.annualOutpatientEncounters)} annual encounters, 
            you'll have {formatNumber(eligibleEncounters)} Abridge-documented encounters generating {formatNumber(hoursReturned)} hours 
            of returned provider time. This is the foundation for all value calculations that follow.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>VALUE BREAKDOWN</Text>

        <View style={styles.valueBreakdownGrid}>
          <View style={styles.valueBreakdownCard}>
            <Text style={styles.valueBreakdownTitle}>Labor & Efficiency</Text>
            <Text style={styles.valueBreakdownAmount}>{formatCurrency(laborValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, marginBottom: 6 }}>{laborPct}% of total value</Text>
            {laborDrivers.map((id) => (
              <View key={id} style={styles.valueBreakdownItem}>
                <Text style={styles.valueBreakdownItemLabel}>{leverLabels[id]}</Text>
                <Text style={styles.valueBreakdownItemValue}>{formatCurrency(driverValues[id] || 0)}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.valueBreakdownCard, styles.valueBreakdownCardLast]}>
            <Text style={styles.valueBreakdownTitle}>Revenue & Quality</Text>
            <Text style={styles.valueBreakdownAmount}>{formatCurrency(revenueValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, marginBottom: 6 }}>{revenuePct}% of total value</Text>
            {revenueDrivers.map((id) => (
              <View key={id} style={styles.valueBreakdownItem}>
                <Text style={styles.valueBreakdownItemLabel}>{leverLabels[id]}</Text>
                <Text style={styles.valueBreakdownItemValue}>{formatCurrency(driverValues[id] || 0)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          {laborPct > 0 && (
            <View style={[styles.progressBarSegment, { flex: laborPct, backgroundColor: "#3B82F6" }]}>
              {laborPct > 15 && <Text style={styles.progressBarLabel}>Labor {laborPct}%</Text>}
            </View>
          )}
          {revenuePct > 0 && (
            <View style={[styles.progressBarSegment, { flex: revenuePct, backgroundColor: colors.green }]}>
              {revenuePct > 15 && <Text style={styles.progressBarLabel}>Revenue {revenuePct}%</Text>}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page 1/{totalPages}</Text>
        </View>
      </Page>

      {Array.from({ length: Math.ceil(enabledDrivers.length / 2) }).map((_, pageIndex) => {
        const driversOnPage = enabledDrivers.slice(pageIndex * 2, pageIndex * 2 + 2);
        const currentPageNum = 2 + pageIndex;

        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            <View style={styles.header}>
              <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
              <View style={styles.headerRight}>
                <Text style={styles.headerTitle}>{careSettingLabel} ROI Assessment</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>VALUE DRIVER DETAILS</Text>

            {driversOnPage.map((driverId) => {
              const content = getDriverContent(driverId);
              const value = driverValues[driverId] || 0;
              const steps = content.getSteps(inputs, value, eligibleEncounters, hoursReturned);

              return (
                <View key={driverId} style={styles.driverCard}>
                  <View style={styles.driverHeader}>
                    <Text style={styles.driverName}>{leverLabels[driverId]}</Text>
                    <Text style={styles.driverValue}>{formatCurrency(value)}</Text>
                  </View>

                  <View style={styles.driverTheory}>
                    <Text style={styles.driverTheoryLabel}>The Theory</Text>
                    <Text style={styles.driverTheoryText}>{content.theory}</Text>
                  </View>

                  <View style={styles.driverCalcSection}>
                    {steps.map((step, i) => (
                      <View key={i} style={{ marginBottom: 6 }}>
                        <Text style={styles.driverStepLabel}>{step.label}</Text>
                        <Text style={styles.driverStepText}>{step.description}</Text>
                        {step.result ? (
                          <Text style={styles.driverStepResult}>{step.math} = {step.result}</Text>
                        ) : (
                          <Text style={styles.driverStepMath}>{step.math}</Text>
                        )}
                      </View>
                    ))}
                  </View>

                  {content.benchmarks && (
                    <View style={styles.driverBenchmark}>
                      <Text style={styles.driverBenchmarkTitle}>Benchmark Reference</Text>
                      {content.benchmarks.map((b, i) => (
                        <View key={i} style={styles.driverBenchmarkRow}>
                          <Text style={styles.driverBenchmarkLabel}>{b.label}</Text>
                          <Text style={styles.driverBenchmarkValue}>{b.value}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {content.warning && inputs.numberOfProviders < 50 && driverId === "workforce" && (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningTitle}>{content.warning.title}</Text>
                      <Text style={styles.warningText}>{content.warning.text}</Text>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
              <Text style={styles.footerText}>Page {currentPageNum}/{totalPages}</Text>
            </View>
          </Page>
        );
      })}

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{careSettingLabel} ROI Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>YOUR INVESTMENT</Text>

        <View style={styles.investmentBox}>
          <View style={styles.investmentRow}>
            <Text style={styles.investmentLabel}>Care Setting</Text>
            <Text style={styles.investmentValue}>{careSettingLabel}</Text>
          </View>
          <View style={styles.investmentRow}>
            <Text style={styles.investmentLabel}>Providers</Text>
            <Text style={styles.investmentValue}>{inputs.numberOfProviders}</Text>
          </View>
          <View style={styles.investmentRow}>
            <Text style={styles.investmentLabel}>Price</Text>
            <Text style={styles.investmentValue}>${inputs.monthlyCostPerProvider}/provider/month</Text>
          </View>
          <View style={styles.investmentDivider} />
          <View style={styles.investmentRow}>
            <Text style={[styles.investmentLabel, styles.bold]}>Annual Investment</Text>
            <Text style={styles.investmentValue}>{formatCurrency(annualInvestment)}</Text>
          </View>
          <View style={styles.investmentRow}>
            <Text style={[styles.investmentLabel, styles.bold]}>Total Annual Value</Text>
            <Text style={styles.investmentValue}>{formatCurrency(results.totalAnnualBenefit)}</Text>
          </View>
          <View style={styles.investmentTotal}>
            <Text style={styles.investmentTotalLabel}>NET ANNUAL GAIN</Text>
            <Text style={styles.investmentTotalValue}>+{formatCurrency(netGain)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>MULTI-YEAR PROJECTION</Text>

        <View style={styles.projectionTable}>
          <View style={styles.projectionHeader}>
            <Text style={styles.projectionHeaderCell}></Text>
            <Text style={styles.projectionHeaderCell}>Year 1</Text>
            <Text style={styles.projectionHeaderCell}>Year 2</Text>
            <Text style={styles.projectionHeaderCell}>Year 3</Text>
            <Text style={styles.projectionHeaderCell}>3-Yr Total</Text>
          </View>
          <View style={styles.projectionRow}>
            <Text style={styles.projectionCellBold}>Value</Text>
            <Text style={styles.projectionCell}>{formatCurrency(year1Value)}</Text>
            <Text style={styles.projectionCell}>{formatCurrency(year2Value)}</Text>
            <Text style={styles.projectionCell}>{formatCurrency(year3Value)}</Text>
            <Text style={styles.projectionCellBold}>{formatCurrency(threeYearValue)}</Text>
          </View>
          <View style={styles.projectionRow}>
            <Text style={styles.projectionCellBold}>Cost</Text>
            <Text style={styles.projectionCell}>{formatCurrency(annualInvestment)}</Text>
            <Text style={styles.projectionCell}>{formatCurrency(annualInvestment)}</Text>
            <Text style={styles.projectionCell}>{formatCurrency(annualInvestment)}</Text>
            <Text style={styles.projectionCellBold}>{formatCurrency(threeYearCost)}</Text>
          </View>
          <View style={[styles.projectionRow, styles.projectionRowLast]}>
            <Text style={styles.projectionCellBold}>Net</Text>
            <Text style={styles.projectionCellGreen}>{formatCurrency(year1Value - annualInvestment)}</Text>
            <Text style={styles.projectionCellGreen}>{formatCurrency(year2Value - annualInvestment)}</Text>
            <Text style={styles.projectionCellGreen}>{formatCurrency(year3Value - annualInvestment)}</Text>
            <Text style={styles.projectionCellGreen}>{formatCurrency(threeYearNet)}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 6, color: colors.lightGray, marginTop: 4, fontStyle: "italic" }}>
          * Assumes 10% annual value growth with increased adoption
        </Text>

        <Text style={styles.sectionTitle}>THE ECONOMICS OF ADDING PROVIDERS</Text>

        <View style={styles.perProviderBox}>
          <Text style={styles.perProviderTitle}>Annual Benefit Per Provider</Text>
          <View style={styles.perProviderGrid}>
            <View style={styles.perProviderItem}>
              <Text style={styles.perProviderValue}>{formatCurrency(valuePerProvider)}</Text>
              <Text style={styles.perProviderLabel}>Gross Value</Text>
              <Text style={styles.perProviderLabel}>per provider</Text>
            </View>
            <View style={styles.perProviderItem}>
              <Text style={[styles.perProviderValue, { color: colors.green }]}>{formatCurrency(netPerProvider)}</Text>
              <Text style={styles.perProviderLabel}>Net Benefit</Text>
              <Text style={styles.perProviderLabel}>per provider</Text>
            </View>
            <View style={styles.perProviderItem}>
              <Text style={styles.perProviderValue}>{formatCurrency(investmentPerProvider)}</Text>
              <Text style={styles.perProviderLabel}>Investment</Text>
              <Text style={styles.perProviderLabel}>per provider</Text>
            </View>
          </View>
          <Text style={styles.perProviderInsight}>
            Every provider added to Abridge generates {formatCurrency(netPerProvider)} in net annual value. 
            More importantly: every provider NOT using Abridge represents {formatCurrency(valuePerProvider)} in unrealized value.
          </Text>
          <View style={styles.perProviderScaling}>
            <View style={styles.perProviderScalingRow}>
              <Text style={styles.perProviderScalingLabel}>+10 providers</Text>
              <Text style={styles.perProviderScalingValue}>+{formatCurrency(netPerProvider * 10)} net annual value</Text>
            </View>
            <View style={styles.perProviderScalingRow}>
              <Text style={styles.perProviderScalingLabel}>+25 providers</Text>
              <Text style={styles.perProviderScalingValue}>+{formatCurrency(netPerProvider * 25)} net annual value</Text>
            </View>
            <View style={styles.perProviderScalingRow}>
              <Text style={styles.perProviderScalingLabel}>+50 providers</Text>
              <Text style={styles.perProviderScalingValue}>+{formatCurrency(netPerProvider * 50)} net annual value</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page {totalPages - 1}/{totalPages}</Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={{ width: 90, height: 18 }} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{careSettingLabel} ROI Assessment</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>METHODOLOGY & ASSUMPTIONS</Text>

        <View style={styles.methodologySection}>
          <View style={styles.methodologyGrid}>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Your Inputs</Text>
              <Text style={styles.methodologyItem}>- {inputs.numberOfProviders} providers</Text>
              <Text style={styles.methodologyItem}>- {formatNumber(inputs.annualOutpatientEncounters)} annual encounters</Text>
              <Text style={styles.methodologyItem}>- {inputs.abridgeUtilizationPct}% utilization</Text>
              <Text style={styles.methodologyItem}>- {inputs.minutesSavedPerEncounter} min saved per encounter</Text>
              <Text style={styles.methodologyItem}>- ${inputs.monthlyCostPerProvider}/provider/month</Text>
              <Text style={styles.methodologyItem}>- {enabledDrivers.length} value drivers selected</Text>
            </View>
            <View style={styles.methodologyColumn}>
              <Text style={styles.methodologyColumnTitle}>Calculated Values</Text>
              <Text style={styles.methodologyItem}>- {formatNumber(eligibleEncounters)} eligible encounters</Text>
              <Text style={styles.methodologyItem}>- {formatNumber(hoursReturned)} hours returned annually</Text>
              <Text style={styles.methodologyItem}>- {formatCurrency(annualInvestment)} annual investment</Text>
              <Text style={styles.methodologyItem}>- {formatCurrency(results.totalAnnualBenefit)} total annual value</Text>
              
              <Text style={[styles.methodologyColumnTitle, { marginTop: 10 }]}>Key Assumptions</Text>
              <Text style={styles.methodologyItem}>- Provider time valued at $150/hr</Text>
              <Text style={styles.methodologyItem}>- Time allocation: 50% QoL, 25% access, 25% cost</Text>
              <Text style={styles.methodologyItem}>- wRVU: Medicare conversion factor ($33)</Text>
              <Text style={styles.methodologyItem}>- Retention: 30% attribution to doc burden</Text>
            </View>
          </View>
          <Text style={styles.methodologyNote}>
            All benchmarks based on aggregate data from 200+ health system partners across 50M+ encounters. 
            Individual results vary based on specialty mix, payer mix, and operational factors. 
            Long-term value drivers (retention, HCC capture) require 12+ months to fully materialize.
          </Text>
        </View>

        <View style={styles.closingQuote}>
          <Text style={styles.closingQuoteText}>
            "This isn't about whether ambient AI creates value. It does. The question is whether you'll capture 40% of that value, or 85%.
          </Text>
          <Text style={[styles.closingQuoteText, { marginTop: 8 }]}>
            That choice—between partial adoption and full optimization—is worth {formatCurrency(netGain)} annually in {careSettingLabel.toLowerCase()} alone."
          </Text>
        </View>

        <View style={{ marginTop: 20, alignItems: "center" }}>
          <Image src={abridgeLogoPath} style={{ width: 100, height: 20, marginBottom: 8 }} />
          <Text style={{ fontSize: 8, color: colors.mediumGray }}>
            Questions about this assessment? Contact your Abridge representative.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by Abridge ROI Calculator</Text>
          <Text style={styles.footerText}>Page {totalPages}/{totalPages}</Text>
        </View>
      </Page>
    </Document>
  );
};

export async function generateOutpatientPDF(
  inputs: RoiInputs,
  results: ReturnType<typeof calculateRoi>,
  enabledDrivers: LeverId[],
  driverValues: Record<LeverId, number>,
  careSettingLabel: string = "Outpatient",
  organizationName?: string
) {
  const blob = await pdf(
    <OutpatientPDFDocument
      inputs={inputs}
      results={results}
      enabledDrivers={enabledDrivers}
      driverValues={driverValues}
      careSettingLabel={careSettingLabel}
      organizationName={organizationName}
    />
  ).toBlob();
  
  const today = new Date().toISOString().split("T")[0];
  const orgSlug = organizationName ? organizationName.replace(/\s+/g, "-").substring(0, 20) : "";
  const filename = orgSlug 
    ? `abridge-roi-${careSettingLabel.toLowerCase()}-${orgSlug}-${today}.pdf`
    : `abridge-roi-${careSettingLabel.toLowerCase()}-${today}.pdf`;
  
  saveAs(blob, filename);
}

export default OutpatientPDFDocument;
