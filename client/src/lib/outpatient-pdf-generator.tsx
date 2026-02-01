import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Svg,
  Path,
  Line,
  Circle,
  Rect,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// ============================================================================
// TYPES
// ============================================================================

export interface DriverCalculation {
  id: string;
  name: string;
  value: number;
  category: "labor" | "revenue";
  inputs: Record<string, number | string>;
}

export interface JourneyData {
  pilotProviders: number;
  pilotEncounters: number;
  pilotUtilization: number;
  pilotValue: number;
  fullScaleProviders: number;
  fullScaleUtilization: number;
  fullScaleValue: number;
  scalingPace: "measured" | "steady" | "aggressive";
  scalingMonths: number;
  networkEffect: number;
}

export interface OutpatientPDFData {
  clientName?: string;
  preparedBy?: string;
  organizationName?: string;
  careSetting: string;
  unitName: string;
  unitNamePlural: string;
  
  providers: number;
  encounters: number;
  eligibleEncounters: number;
  utilization: number;
  timeSavedPerEncounter: number;
  hoursReturned: number;
  
  totalValue: number;
  investment: number;
  netGain: number;
  roi: number;
  costPerProvider: number;
  
  drivers: DriverCalculation[];
  laborTotal: number;
  revenueTotal: number;
  laborPct: number;
  revenuePct: number;
  
  year1Value: number;
  year2Value: number;
  year3Value: number;
  year1Cost: number;
  year2Cost: number;
  year3Cost: number;
  threeYearValue: number;
  threeYearCost: number;
  threeYearNet: number;
  
  journey: JourneyData;
}

// ============================================================================
// ABRIDGE BRAND COLORS - Premium Pentagram Design System
// ============================================================================

const brand = {
  // Primary brand colors
  cadmiumRed: "#EA2C00",
  coral: "#F07B5F",
  
  // Dark backgrounds (premium)
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  
  // Text colors
  white: "#FFFFFF",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  
  // Functional colors
  emerald: "#10b981",
  emeraldLight: "#d1fae5",
  emeraldDark: "#059669",
  
  // Light backgrounds
  paleGray: "#F8FAFC",
  borderGray: "#E2E8F0",
  
  // Accent combinations
  redLight: "#FEF2F0",
  black: "#0f172a",
};

// ============================================================================
// STYLES - Premium Abridge Design System
// ============================================================================

const styles = StyleSheet.create({
  // Base page
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: brand.black,
    backgroundColor: brand.white,
  },

  // ==========================================
  // COVER PAGE - Dark Premium Hero
  // ==========================================
  coverPage: {
    backgroundColor: brand.slate900,
    padding: 0,
    height: "100%",
  },
  coverHeader: {
    padding: 40,
    paddingBottom: 0,
  },
  coverLogoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 60,
  },
  coverLogo: {
    width: 100,
    height: 20,
  },
  coverDate: {
    fontSize: 9,
    color: brand.slate400,
    letterSpacing: 0.5,
  },
  coverContent: {
    padding: 40,
    paddingTop: 0,
    flex: 1,
    justifyContent: "center",
  },
  coverLabel: {
    fontSize: 10,
    color: brand.coral,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 16,
    fontWeight: "bold",
  },
  coverTitle: {
    fontSize: 42,
    fontWeight: "bold",
    color: brand.white,
    marginBottom: 12,
    lineHeight: 1.1,
  },
  coverSubtitle: {
    fontSize: 18,
    color: brand.slate300,
    marginBottom: 40,
    lineHeight: 1.4,
  },
  coverMetrics: {
    flexDirection: "row",
    marginTop: 20,
  },
  coverMetricBox: {
    marginRight: 40,
  },
  coverMetricValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: brand.emerald,
    marginBottom: 4,
  },
  coverMetricLabel: {
    fontSize: 10,
    color: brand.slate400,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  coverFooter: {
    padding: 40,
    paddingTop: 0,
  },
  coverFooterText: {
    fontSize: 9,
    color: brand.slate500,
    lineHeight: 1.5,
  },

  // ==========================================
  // CONTENT PAGES - Light Premium
  // ==========================================
  contentPage: {
    padding: 0,
    paddingBottom: 50,
  },
  
  // Page header strip
  pageHeader: {
    backgroundColor: brand.slate900,
    padding: 24,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 0,
  },
  pageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageHeaderLogo: {
    width: 80,
    height: 16,
  },
  pageHeaderTitle: {
    fontSize: 11,
    color: brand.white,
    fontWeight: "bold",
  },
  pageHeaderClient: {
    fontSize: 9,
    color: brand.slate400,
    marginTop: 2,
  },

  // Content area
  contentArea: {
    padding: 40,
    paddingTop: 28,
    paddingBottom: 20,
  },

  // Section styling
  sectionLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: brand.cadmiumRed,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: brand.black,
    marginBottom: 6,
    lineHeight: 1.2,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: brand.slate500,
    marginBottom: 20,
    lineHeight: 1.5,
  },

  // Educational callouts (matching wizard)
  educationalBox: {
    backgroundColor: brand.paleGray,
    padding: 16,
    borderRadius: 6,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: brand.cadmiumRed,
  },
  educationalLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: brand.slate700,
    marginBottom: 6,
  },
  educationalText: {
    fontSize: 9,
    color: brand.slate500,
    lineHeight: 1.6,
  },

  // Metrics grid
  metricsGrid: {
    flexDirection: "row",
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: brand.white,
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 8,
    padding: 16,
    marginRight: 12,
    alignItems: "center",
  },
  metricCardLast: {
    marginRight: 0,
  },
  metricCardHighlight: {
    flex: 1,
    backgroundColor: brand.emeraldLight,
    borderWidth: 2,
    borderColor: brand.emerald,
    borderRadius: 8,
    padding: 16,
    marginRight: 12,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: brand.black,
    marginBottom: 4,
  },
  metricValueGreen: {
    fontSize: 22,
    fontWeight: "bold",
    color: brand.emerald,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: brand.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  metricSublabel: {
    fontSize: 7,
    color: brand.slate400,
    marginTop: 4,
    textAlign: "center",
  },

  // Value breakdown cards
  twoColumn: {
    flexDirection: "row",
    marginBottom: 20,
  },
  valueCard: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    marginRight: 12,
  },
  valueCardLast: {
    marginRight: 0,
  },
  laborCard: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  revenueCard: {
    backgroundColor: brand.emeraldLight,
    borderWidth: 1,
    borderColor: brand.emerald,
  },
  valueCardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: brand.black,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valueCardPct: {
    fontSize: 8,
    color: brand.slate500,
    marginBottom: 10,
  },
  valueCardAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: brand.black,
    marginBottom: 12,
  },
  valueCardDriver: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  valueCardDriverLast: {
    borderBottomWidth: 0,
  },
  valueCardDriverName: {
    fontSize: 9,
    color: brand.slate700,
  },
  valueCardDriverValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: brand.emeraldDark,
  },

  // Tables
  table: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.slate900,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 10,
    fontSize: 8,
    fontWeight: "bold",
    color: brand.white,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: brand.borderGray,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowAlt: {
    backgroundColor: brand.paleGray,
  },
  tableCell: {
    flex: 1,
    padding: 10,
    fontSize: 9,
    color: brand.slate700,
    textAlign: "center",
  },
  tableCellBold: {
    flex: 1,
    padding: 10,
    fontSize: 9,
    fontWeight: "bold",
    color: brand.black,
    textAlign: "center",
  },
  tableCellGreen: {
    flex: 1,
    padding: 10,
    fontSize: 9,
    fontWeight: "bold",
    color: brand.emerald,
    textAlign: "center",
  },

  // Driver pages
  driverHero: {
    backgroundColor: brand.slate900,
    padding: 28,
    marginBottom: 0,
  },
  driverHeroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  driverHeroTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: brand.white,
    marginBottom: 6,
  },
  driverHeroSubtitle: {
    fontSize: 10,
    color: brand.slate400,
    lineHeight: 1.5,
    maxWidth: 320,
  },
  driverHeroValue: {
    alignItems: "flex-end",
  },
  driverHeroValueLabel: {
    fontSize: 8,
    color: brand.slate400,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  driverHeroValueAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: brand.emerald,
  },

  // Theory box (educational)
  theoryBox: {
    backgroundColor: brand.paleGray,
    padding: 16,
    borderRadius: 6,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: brand.coral,
  },
  theoryLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: brand.coral,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  theoryText: {
    fontSize: 9,
    color: brand.slate700,
    lineHeight: 1.6,
  },

  // Calculation steps
  calcSection: {
    marginBottom: 20,
  },
  calcTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: brand.black,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  stepBox: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderGray,
  },
  stepBoxLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  stepLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: brand.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stepQuestion: {
    fontSize: 9,
    color: brand.slate700,
    fontStyle: "italic",
    marginBottom: 8,
  },
  stepMath: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  stepInput: {
    backgroundColor: brand.white,
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 4,
  },
  stepInputText: {
    fontSize: 9,
    fontFamily: "Courier",
    color: brand.black,
  },
  stepOperator: {
    fontSize: 10,
    color: brand.slate400,
    marginHorizontal: 6,
  },
  stepResult: {
    backgroundColor: brand.emeraldLight,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 6,
  },
  stepResultText: {
    fontSize: 9,
    fontWeight: "bold",
    fontFamily: "Courier-Bold",
    color: brand.emeraldDark,
  },
  stepNote: {
    fontSize: 8,
    color: brand.slate400,
    fontStyle: "italic",
    marginTop: 4,
  },

  // Final value box
  finalValueBox: {
    backgroundColor: brand.emeraldLight,
    borderWidth: 2,
    borderColor: brand.emerald,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  finalValueLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: brand.black,
  },
  finalValueFormula: {
    fontSize: 8,
    color: brand.slate500,
    marginTop: 2,
  },
  finalValueAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: brand.emerald,
  },

  // Implication box
  implicationBox: {
    backgroundColor: brand.paleGray,
    padding: 14,
    borderRadius: 6,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: brand.emerald,
  },
  implicationTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: brand.emeraldDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  implicationText: {
    fontSize: 9,
    color: brand.slate700,
    lineHeight: 1.6,
  },

  // Journey/Scaling page
  journeyChart: {
    backgroundColor: brand.paleGray,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    minHeight: 140,
  },
  journeyScenario: {
    flexDirection: "row",
    marginBottom: 20,
  },
  journeyCard: {
    flex: 1,
    backgroundColor: brand.white,
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 8,
    padding: 16,
    marginRight: 12,
  },
  journeyCardHighlight: {
    flex: 1,
    backgroundColor: brand.white,
    borderWidth: 2,
    borderColor: brand.cadmiumRed,
    borderRadius: 8,
    padding: 16,
  },
  journeyCardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: brand.slate700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  journeyCardTitleHighlight: {
    fontSize: 10,
    fontWeight: "bold",
    color: brand.cadmiumRed,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  journeyCardRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  journeyCardBullet: {
    fontSize: 9,
    color: brand.slate400,
    marginRight: 8,
    width: 12,
  },
  journeyCardText: {
    fontSize: 9,
    color: brand.slate700,
    flex: 1,
  },
  journeyCardValue: {
    fontWeight: "bold",
    color: brand.black,
  },
  journeyCardValueGreen: {
    fontWeight: "bold",
    color: brand.emerald,
  },

  // Compounding box
  compoundingBox: {
    backgroundColor: brand.emeraldLight,
    borderWidth: 1,
    borderColor: brand.emerald,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  compoundingTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: brand.emeraldDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  compoundingValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: brand.emerald,
    marginBottom: 6,
  },
  compoundingText: {
    fontSize: 9,
    color: brand.emeraldDark,
    lineHeight: 1.5,
  },

  // Methodology
  methodologyGrid: {
    flexDirection: "row",
    marginBottom: 20,
  },
  methodologyColumn: {
    flex: 1,
    marginRight: 16,
  },
  methodologyColumnLast: {
    marginRight: 0,
  },
  methodologyTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: brand.slate700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  methodologyItem: {
    fontSize: 8,
    color: brand.slate500,
    lineHeight: 1.6,
    marginBottom: 4,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: brand.borderGray,
  },
  footerText: {
    fontSize: 8,
    color: brand.slate400,
  },

  // Utility
  bold: {
    fontWeight: "bold",
  },
});

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString()}`;
};

const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

// ============================================================================
// DRIVER EDUCATIONAL CONTENT - Premium "Godfather of Clarity" Tone
// ============================================================================

const driverTheories: Record<string, { theory: string; logic: string }> = {
  patientAccess: {
    theory: `When clinicians spend less time on documentation, they may have capacity for additional patient visits. The conversion isn't automatic—scheduling, room availability, and demand all play a role. This model uses conservative assumptions: only a portion of saved time goes to access, and only a fraction converts to actual visits.`,
    logic: `Time saved per encounter multiplied by eligible encounters gives total hours returned. We allocate a percentage to patient access, then apply a conversion rate to account for real-world scheduling constraints. The result represents realistic capacity expansion—not theoretical maximum.`,
  },
  
  wrvu: {
    theory: `The hypothesis behind wRVU improvement is that physicians under time pressure often document less than the full clinical picture. When notes capture the complete complexity of a visit, coding can reflect the work actually performed—not upcoding, just accurate representation.`,
    logic: `We calculate baseline wRVUs from your encounter volume, then apply a modest improvement percentage based on better documentation. The Medicare conversion factor provides a conservative baseline—commercial rates would yield higher results. A realization rate accounts for payer mix and fee schedule variability.`,
  },
  
  workforce: {
    theory: `Documentation burden is consistently cited as the leading driver of physician burnout. Replacing a departing clinician costs $400K-$1M+ when factoring recruiting, lost revenue during vacancy, onboarding, and productivity ramp. Preventing even fractional departures creates substantial value.`,
    logic: `Starting with your baseline turnover rate, we estimate what portion relates to burnout and how much documentation contributes. A conservative retention improvement rate reflects that while ambient AI helps significantly, it doesn't eliminate all burnout drivers.`,
  },

  overtime: {
    theory: `Documentation that spills outside clinic hours creates premium labor costs—overtime pay, locum coverage, and invisible burnout tax. When providers finish notes during the workday, these costs decrease and quality of life improves.`,
    logic: `We calculate current overtime hours from providers experiencing after-hours documentation, apply a reduction rate based on typical Abridge impact, then convert only a portion to dollar savings—acknowledging some reclaimed time improves wellbeing rather than reducing costs.`,
  },

  hcc: {
    theory: `Risk adjustment pays based on documented conditions. Clinicians frequently discuss chronic conditions that don't make it into the note due to time pressure. Each missed HCC-eligible condition represents RAF value that compounds across the patient's attribution period.`,
    logic: `We identify encounters with Medicare Advantage patients, estimate conditions discussed but not documented, and calculate how many Abridge could recapture. A conservative audit factor accounts for RADV reviews and conditions that may not survive payer scrutiny.`,
  },

  denials: {
    theory: `About half of claim denials stem from documentation gaps—missing clinical information, insufficient medical decision-making, incomplete narratives. These claims are often abandoned because the documentation can't support an appeal. Preventing denials upfront is more efficient than winning appeals.`,
    logic: `Starting with your baseline denial rate, we isolate documentation-related denials and estimate write-offs. Abridge's comprehensive capture can prevent many of these by documenting the clinical reasoning in real-time. A realization rate accounts for appeals success variability.`,
  },
};

const driverImplications: Record<string, (value: number, data: OutpatientPDFData) => string> = {
  patientAccess: (value, data) => 
    `At ${formatCurrency(value)} annually, patient access represents ${Math.round((value / data.totalValue) * 100)}% of your projected value. Organizations with strong scheduling operations and patient demand often see this number grow as utilization matures.`,
  
  wrvu: (value, data) =>
    `This ${formatCurrency(value)} represents documentation improvement value—capturing complexity that's already being delivered. It's highly defensible because it's not about doing more, it's about getting credit for existing work.`,
  
  workforce: (value, data) =>
    `Retention value is probabilistic—it materializes over 12+ months as turnover patterns emerge. With ${data.providers} ${data.unitNamePlural}, even fractional improvement in retention creates substantial value given replacement costs.`,

  overtime: (value, data) =>
    `The ${formatCurrency(value)} in overtime reduction represents both hard savings (reduced premium pay) and quality-of-life improvement. Many organizations see this as a leading indicator of broader satisfaction gains.`,

  hcc: (value, data) =>
    `HCC capture at ${formatCurrency(value)} depends heavily on your current capture maturity and payer mix. Organizations with mature risk programs may see lower opportunity; those early in their journey often exceed these projections.`,

  denials: (value, data) =>
    `Denial prevention at ${formatCurrency(value)} is one of the most measurable value drivers—you can track denials before and after implementation with clear attribution to documentation improvement.`,
};

// ============================================================================
// CALCULATION STEPS
// ============================================================================

interface CalculationStep {
  label: string;
  question: string;
  inputs: { value: string; label?: string }[];
  operators?: string[];
  result: string;
  note?: string;
}

function getDriverSteps(driver: DriverCalculation, data: OutpatientPDFData): CalculationStep[] {
  const inputs = driver.inputs;
  
  switch (driver.id) {
    case "patientAccess":
      return [
        {
          label: "Step 1: Time Returned",
          question: "How much documentation time does Abridge return?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters), label: "encounters" },
            { value: `${data.timeSavedPerEncounter} min` },
          ],
          operators: ["×"],
          result: `${formatNumber(data.hoursReturned)} hours`,
          note: "Based on your time savings scenario selection.",
        },
        {
          label: "Step 2: Hours to Access",
          question: "How much time can realistically convert to patient access?",
          inputs: [
            { value: formatNumber(data.hoursReturned), label: "hours" },
            { value: `${inputs.timeToAccessPct || 25}%`, label: "allocation" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.accessHours as number || 0)} hours`,
          note: "Not all time converts—some goes to wellbeing, teaching, research.",
        },
        {
          label: "Step 3: Visit Conversion",
          question: "How many hours actually become visits?",
          inputs: [
            { value: formatNumber(inputs.accessHours as number || 0), label: "hours" },
            { value: `${inputs.conversionRate || 50}%`, label: "realization" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.additionalVisits as number || 0)} visits`,
          note: "Realization rate accounts for scheduling, room availability, demand.",
        },
        {
          label: "Step 4: Annual Value",
          question: "What's the revenue impact?",
          inputs: [
            { value: formatNumber(inputs.additionalVisits as number || 0), label: "visits" },
            { value: `$${inputs.revenuePerVisit || 200}`, label: "per visit" },
          ],
          operators: ["×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "wrvu":
      return [
        {
          label: "Step 1: Baseline wRVUs",
          question: "What's your current wRVU generation?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters), label: "encounters" },
            { value: `${inputs.avgWrvuPerEncounter || 1.5}`, label: "wRVU/enc" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.baselineWrvus as number || 0)} wRVUs`,
        },
        {
          label: "Step 2: Documentation Lift",
          question: "How much improvement does better documentation create?",
          inputs: [
            { value: formatNumber(inputs.baselineWrvus as number || 0), label: "wRVUs" },
            { value: `${inputs.wrvuImprovementRate || 5}%`, label: "lift" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.wrvuGain as number || 0)} wRVU gain`,
          note: "Lift comes from capturing complexity that supports accurate coding.",
        },
        {
          label: "Step 3: Dollar Value",
          question: "What's the financial impact?",
          inputs: [
            { value: formatNumber(inputs.wrvuGain as number || 0), label: "wRVUs" },
            { value: `$${inputs.conversionFactor || 33}`, label: "CF" },
            { value: `${inputs.realizationRate || 75}%`, label: "realization" },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
          note: "Medicare CF shown. Commercial rates ($45-65) yield higher results.",
        },
      ];

    case "workforce":
      return [
        {
          label: "Step 1: Expected Turnover",
          question: "How many departures occur annually?",
          inputs: [
            { value: formatNumber(data.providers), label: data.unitNamePlural },
            { value: `${inputs.turnoverRate || 7}%`, label: "turnover" },
          ],
          operators: ["×"],
          result: `${(inputs.annualDepartures as number || 0).toFixed(1)} departures`,
        },
        {
          label: "Step 2: Burnout-Related",
          question: "How many are tied to burnout?",
          inputs: [
            { value: (inputs.annualDepartures as number || 0).toFixed(1), label: "departures" },
            { value: `${inputs.burnoutAttribution || 50}%` },
          ],
          operators: ["×"],
          result: `${(inputs.burnoutDepartures as number || 0).toFixed(2)} burnout-related`,
        },
        {
          label: "Step 3: Prevented Departures",
          question: "How many can improved documentation help prevent?",
          inputs: [
            { value: (inputs.burnoutDepartures as number || 0).toFixed(2), label: "at-risk" },
            { value: `${inputs.abridgeImpact || 30}%`, label: "impact" },
          ],
          operators: ["×"],
          result: `${(inputs.departuresAvoided as number || 0).toFixed(2)} prevented`,
          note: "Conservative—documentation is a major driver but not the only one.",
        },
        {
          label: "Step 4: Retention Value",
          question: "What's the cost savings?",
          inputs: [
            { value: (inputs.departuresAvoided as number || 0).toFixed(2), label: "prevented" },
            { value: formatCurrency(inputs.replacementCost as number || 400000), label: "cost" },
          ],
          operators: ["×"],
          result: formatCurrency(driver.value),
        },
      ];

    case "overtime":
      return [
        {
          label: "Step 1: After-Hours Documentation",
          question: "How many overtime hours occur annually?",
          inputs: [
            { value: formatNumber(inputs.providersWithOT as number || 0), label: "providers w/ OT" },
            { value: `${inputs.otHoursPerWeek || 5} hrs/wk` },
            { value: `${inputs.otWeeksPerYear || 48} wks` },
          ],
          operators: ["×", "×"],
          result: `${formatNumber(inputs.totalOTHours as number || 0)} hours`,
        },
        {
          label: "Step 2: Hours Reclaimed",
          question: "How much overtime can Abridge eliminate?",
          inputs: [
            { value: formatNumber(inputs.totalOTHours as number || 0), label: "OT hours" },
            { value: `${inputs.otReductionRate || 70}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.hoursReclaimed as number || 0)} hours reclaimed`,
        },
        {
          label: "Step 3: Dollar Savings",
          question: "How much converts to cost savings?",
          inputs: [
            { value: formatNumber(inputs.hoursReclaimed as number || 0), label: "hours" },
            { value: `${inputs.otConversionRate || 33}%`, label: "conversion" },
            { value: `$${inputs.physicianHourlyRate || 150}`, label: "/hr" },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
          note: "Only a portion converts to savings—the rest improves quality of life.",
        },
      ];

    case "hcc":
      return [
        {
          label: "Step 1: Risk Encounters",
          question: "How many encounters involve Medicare Advantage patients?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters), label: "encounters" },
            { value: `${inputs.riskContractPercent || 20}%`, label: "MA mix" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.riskEncounters as number || 0)} MA encounters`,
        },
        {
          label: "Step 2: Missed Opportunities",
          question: "How many HCCs are being missed?",
          inputs: [
            { value: formatNumber(inputs.riskEncounters as number || 0), label: "encounters" },
            { value: `${(inputs.missedHccsPerEncounter as number || 0.14).toFixed(2)}`, label: "missed/enc" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.missedHccOpportunities as number || 0)} opportunities`,
        },
        {
          label: "Step 3: Abridge Capture",
          question: "How many can Abridge recover?",
          inputs: [
            { value: formatNumber(inputs.missedHccOpportunities as number || 0), label: "opportunities" },
            { value: `${inputs.abridgeCaptureRate || 40}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.hccsCaptured as number || 0)} HCCs captured`,
        },
        {
          label: "Step 4: Risk-Adjusted Value",
          question: "What's the financial impact after audit adjustments?",
          inputs: [
            { value: formatNumber(inputs.hccsCaptured as number || 0), label: "HCCs" },
            { value: `$${inputs.avgHccValue || 800}`, label: "value" },
            { value: `${100 - (inputs.auditFactor as number || 25)}%`, label: "after audit" },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
          note: "Audit factor accounts for RADV risk and payer review.",
        },
      ];

    case "denials":
      return [
        {
          label: "Step 1: Total Denials",
          question: "How many claims are denied today?",
          inputs: [
            { value: formatNumber(data.eligibleEncounters), label: "encounters" },
            { value: `${inputs.denialRate || 8}%`, label: "denial rate" },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.totalDenials as number || 0)} denials`,
        },
        {
          label: "Step 2: Documentation-Related",
          question: "How many stem from documentation gaps?",
          inputs: [
            { value: formatNumber(inputs.totalDenials as number || 0), label: "denials" },
            { value: `${inputs.docRelatedPercent || 50}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.docRelatedDenials as number || 0)} doc denials`,
          note: "About half of denials stem from documentation issues.",
        },
        {
          label: "Step 3: Preventable Write-offs",
          question: "How many are lost without appeal?",
          inputs: [
            { value: formatNumber(inputs.docRelatedDenials as number || 0), label: "doc denials" },
            { value: `${inputs.writtenOffPercent || 60}%` },
          ],
          operators: ["×"],
          result: `${formatNumber(inputs.writtenOffDenials as number || 0)} written off`,
        },
        {
          label: "Step 4: Recovered Value",
          question: "What can Abridge save?",
          inputs: [
            { value: formatNumber(inputs.writtenOffDenials as number || 0), label: "write-offs" },
            { value: `${inputs.abridgeCaptureRate || 75}%`, label: "recovery" },
            { value: `$${inputs.avgClaimValue || 250}`, label: "/claim" },
          ],
          operators: ["×", "×"],
          result: formatCurrency(driver.value),
        },
      ];

    default:
      return [];
  }
}

function getFinalFormula(driver: DriverCalculation): string {
  const inputs = driver.inputs;
  switch (driver.id) {
    case "patientAccess":
      return `${formatNumber((inputs.additionalVisits as number) || 0)} visits × $${inputs.revenuePerVisit || 200}/visit`;
    case "wrvu":
      return `${formatNumber((inputs.wrvuGain as number) || 0)} wRVU × $${inputs.conversionFactor || 33} × ${inputs.realizationRate || 75}%`;
    case "workforce":
      return `${((inputs.departuresAvoided as number) || 0).toFixed(2)} prevented × ${formatCurrency((inputs.replacementCost as number) || 400000)}`;
    case "overtime":
      return `${formatNumber((inputs.hoursReclaimed as number) || 0)} hrs × ${inputs.otConversionRate || 33}% × $${inputs.physicianHourlyRate || 150}/hr`;
    case "hcc":
      return `${formatNumber((inputs.hccsCaptured as number) || 0)} HCCs × $${inputs.avgHccValue || 800} × ${100 - (inputs.auditFactor as number || 25)}%`;
    case "denials":
      return `${formatNumber((inputs.claimsRecovered as number) || 0)} claims × $${inputs.avgClaimValue || 250}`;
    default:
      return "";
  }
}

// ============================================================================
// PAGE COMPONENTS
// ============================================================================

const CoverPage = ({ data }: { data: OutpatientPDFData }) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const displayName = data.clientName || data.organizationName || "Your Organization";
  const valuePerProvider = Math.round(data.netGain / data.providers);

  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverHeader}>
        <View style={styles.coverLogoContainer}>
          <Image src={abridgeLogoPath} style={styles.coverLogo} />
          <Text style={styles.coverDate}>{today}</Text>
        </View>
      </View>

      <View style={styles.coverContent}>
        <Text style={styles.coverLabel}>Value Assessment</Text>
        <Text style={styles.coverTitle}>{displayName}</Text>
        <Text style={styles.coverSubtitle}>
          Exploring how ambient documentation could create value for your {data.careSetting.toLowerCase()} practice—with transparent methodology you can stress-test.
        </Text>

        <View style={styles.coverMetrics}>
          <View style={styles.coverMetricBox}>
            <Text style={styles.coverMetricValue}>+{formatCurrency(data.netGain)}</Text>
            <Text style={styles.coverMetricLabel}>Net Annual Value</Text>
          </View>
          <View style={styles.coverMetricBox}>
            <Text style={[styles.coverMetricValue, { color: brand.coral }]}>{data.roi.toFixed(1)}x</Text>
            <Text style={styles.coverMetricLabel}>Return on Investment</Text>
          </View>
          <View style={styles.coverMetricBox}>
            <Text style={[styles.coverMetricValue, { color: brand.white }]}>{formatNumber(data.hoursReturned)}</Text>
            <Text style={styles.coverMetricLabel}>Hours Returned</Text>
          </View>
        </View>
      </View>

      <View style={styles.coverFooter}>
        <Text style={styles.coverFooterText}>
          {data.providers} {data.unitNamePlural} • {formatNumber(data.encounters)} encounters • {data.utilization}% utilization • {data.drivers.length} value drivers enabled
        </Text>
      </View>
    </Page>
  );
};

const ExecutiveSummaryPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const revenueDrivers = data.drivers.filter(d => d.category === "revenue");
  const valuePerProvider = Math.round(data.netGain / data.providers);

  return (
    <Page size="A4" style={styles.contentPage}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderRow}>
          <Image src={abridgeLogoPath} style={styles.pageHeaderLogo} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.pageHeaderTitle}>{data.careSetting} Value Assessment</Text>
            {data.clientName && <Text style={styles.pageHeaderClient}>{data.clientName}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>
        <Text style={styles.sectionLabel}>Executive Summary</Text>
        <Text style={styles.sectionTitle}>Your Value Model at a Glance</Text>
        <Text style={styles.sectionSubtitle}>
          {data.providers} {data.unitNamePlural} • {formatNumber(data.encounters)} annual encounters • {data.drivers.length} value drivers
        </Text>

        <View style={styles.educationalBox}>
          <Text style={styles.educationalLabel}>How to use this assessment</Text>
          <Text style={styles.educationalText}>
            This model translates your inputs into projected value using industry benchmarks and conservative assumptions. Every number traces back to editable inputs—designed so you can stress-test the assumptions and adjust where your situation differs.
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCardHighlight}>
            <Text style={styles.metricValueGreen}>+{formatCurrency(data.netGain)}</Text>
            <Text style={styles.metricLabel}>Net Annual Value</Text>
            <Text style={styles.metricSublabel}>{formatCurrency(data.totalValue)} - {formatCurrency(data.investment)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{data.roi.toFixed(1)}x</Text>
            <Text style={styles.metricLabel}>Return on Investment</Text>
            <Text style={styles.metricSublabel}>Every $1 returns ${data.roi.toFixed(2)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatCurrency(valuePerProvider)}</Text>
            <Text style={styles.metricLabel}>Per {data.unitName}</Text>
            <Text style={styles.metricSublabel}>Net annual benefit</Text>
          </View>
          <View style={[styles.metricCard, styles.metricCardLast]}>
            <Text style={styles.metricValue}>{formatNumber(data.hoursReturned)}</Text>
            <Text style={styles.metricLabel}>Hours Returned</Text>
            <Text style={styles.metricSublabel}>Documentation time saved</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { fontSize: 14, marginTop: 8, marginBottom: 12 }]}>Where the Value Comes From</Text>

        <View style={styles.twoColumn}>
          <View style={[styles.valueCard, styles.laborCard]}>
            <Text style={styles.valueCardTitle}>Labor & Efficiency</Text>
            <Text style={styles.valueCardPct}>{data.laborPct}% of total value</Text>
            <Text style={styles.valueCardAmount}>{formatCurrency(data.laborTotal)}</Text>
            {laborDrivers.map((driver, i) => (
              <View key={driver.id} style={[styles.valueCardDriver, i === laborDrivers.length - 1 ? styles.valueCardDriverLast : {}]}>
                <Text style={styles.valueCardDriverName}>{driver.name}</Text>
                <Text style={styles.valueCardDriverValue}>{formatCurrency(driver.value)}</Text>
              </View>
            ))}
            {laborDrivers.length === 0 && (
              <Text style={{ fontSize: 8, color: brand.slate400, fontStyle: "italic" }}>No labor drivers selected</Text>
            )}
          </View>

          <View style={[styles.valueCard, styles.revenueCard, styles.valueCardLast]}>
            <Text style={styles.valueCardTitle}>Revenue & Quality</Text>
            <Text style={styles.valueCardPct}>{data.revenuePct}% of total value</Text>
            <Text style={styles.valueCardAmount}>{formatCurrency(data.revenueTotal)}</Text>
            {revenueDrivers.map((driver, i) => (
              <View key={driver.id} style={[styles.valueCardDriver, i === revenueDrivers.length - 1 ? styles.valueCardDriverLast : {}]}>
                <Text style={styles.valueCardDriverName}>{driver.name}</Text>
                <Text style={styles.valueCardDriverValue}>{formatCurrency(driver.value)}</Text>
              </View>
            ))}
            {revenueDrivers.length === 0 && (
              <Text style={{ fontSize: 8, color: brand.slate400, fontStyle: "italic" }}>No revenue drivers selected</Text>
            )}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { fontSize: 14, marginTop: 8, marginBottom: 12 }]}>Multi-Year Projection</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: "left", paddingLeft: 12 }]}></Text>
            <Text style={styles.tableHeaderCell}>Year 1</Text>
            <Text style={styles.tableHeaderCell}>Year 2</Text>
            <Text style={styles.tableHeaderCell}>Year 3</Text>
            <Text style={styles.tableHeaderCell}>3-Year Total</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 0.8, textAlign: "left", paddingLeft: 12, fontWeight: "bold" }]}>Value</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year1Value)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year2Value)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year3Value)}</Text>
            <Text style={styles.tableCellBold}>{formatCurrency(data.threeYearValue)}</Text>
          </View>
          <View style={[styles.tableRow, styles.tableRowAlt]}>
            <Text style={[styles.tableCell, { flex: 0.8, textAlign: "left", paddingLeft: 12, fontWeight: "bold" }]}>Investment</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year1Cost)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year2Cost)}</Text>
            <Text style={styles.tableCell}>{formatCurrency(data.year3Cost)}</Text>
            <Text style={styles.tableCellBold}>{formatCurrency(data.threeYearCost)}</Text>
          </View>
          <View style={[styles.tableRow, styles.tableRowLast]}>
            <Text style={[styles.tableCell, { flex: 0.8, textAlign: "left", paddingLeft: 12, fontWeight: "bold" }]}>Net Value</Text>
            <Text style={styles.tableCellGreen}>{formatCurrency(data.year1Value - data.year1Cost)}</Text>
            <Text style={styles.tableCellGreen}>{formatCurrency(data.year2Value - data.year2Cost)}</Text>
            <Text style={styles.tableCellGreen}>{formatCurrency(data.year3Value - data.year3Cost)}</Text>
            <Text style={styles.tableCellGreen}>{formatCurrency(data.threeYearNet)}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 7, color: brand.slate400, marginTop: 8, fontStyle: "italic" }}>
          Projection assumes 10% annual value growth with increased adoption and workflow maturity.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const DriverDetailPage = ({ 
  driver, 
  data, 
  pageNum, 
  totalPages 
}: { 
  driver: DriverCalculation; 
  data: OutpatientPDFData; 
  pageNum: number; 
  totalPages: number;
}) => {
  const theoryContent = driverTheories[driver.id] || { theory: "", logic: "" };
  const implicationFn = driverImplications[driver.id];
  const implication = implicationFn ? implicationFn(driver.value, data) : `This driver contributes ${formatCurrency(driver.value)} annually.`;
  const steps = getDriverSteps(driver, data);

  return (
    <Page size="A4" style={styles.contentPage} wrap={false}>
      <View style={styles.driverHero}>
        <View style={styles.pageHeaderRow}>
          <Image src={abridgeLogoPath} style={styles.pageHeaderLogo} />
        </View>
        <View style={[styles.driverHeroRow, { marginTop: 16 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverHeroTitle}>{driver.name}</Text>
            <Text style={styles.driverHeroSubtitle}>
              {theoryContent.theory.substring(0, 150)}...
            </Text>
          </View>
          <View style={styles.driverHeroValue}>
            <Text style={styles.driverHeroValueLabel}>Annual Value</Text>
            <Text style={styles.driverHeroValueAmount}>{formatCurrency(driver.value)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>
        <View style={styles.theoryBox}>
          <Text style={styles.theoryLabel}>The Logic</Text>
          <Text style={styles.theoryText}>{theoryContent.logic}</Text>
        </View>

        <View style={styles.calcSection}>
          <Text style={styles.calcTitle}>Your Calculation</Text>
          
          {steps.map((step, index) => (
            <View key={index} style={[styles.stepBox, index === steps.length - 1 ? styles.stepBoxLast : {}]}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepQuestion}>{step.question}</Text>
              
              <View style={styles.stepMath}>
                {step.inputs.map((input, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                    {i > 0 && <Text style={styles.stepOperator}>{step.operators?.[i - 1] || "×"}</Text>}
                    <View style={styles.stepInput}>
                      <Text style={styles.stepInputText}>{input.value}</Text>
                    </View>
                    {input.label && (
                      <Text style={{ fontSize: 7, color: brand.slate400, marginLeft: 3 }}>{input.label}</Text>
                    )}
                  </View>
                ))}
                <Text style={styles.stepOperator}>=</Text>
                <View style={styles.stepResult}>
                  <Text style={styles.stepResultText}>{step.result}</Text>
                </View>
              </View>
              
              {step.note && <Text style={styles.stepNote}>{step.note}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.finalValueBox}>
          <View>
            <Text style={styles.finalValueLabel}>Annual {driver.name} Value</Text>
            <Text style={styles.finalValueFormula}>{getFinalFormula(driver)}</Text>
          </View>
          <Text style={styles.finalValueAmount}>{formatCurrency(driver.value)}</Text>
        </View>

        <View style={styles.implicationBox}>
          <Text style={styles.implicationTitle}>What This Means</Text>
          <Text style={styles.implicationText}>{implication}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const ScalingJourneyPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const { journey } = data;
  const valueMultiple = (journey.fullScaleValue / journey.pilotValue).toFixed(1);
  const paceLabels: Record<string, string> = {
    measured: "36 months",
    steady: "24 months",
    aggressive: "18 months",
  };

  return (
    <Page size="A4" style={styles.contentPage}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderRow}>
          <Image src={abridgeLogoPath} style={styles.pageHeaderLogo} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.pageHeaderTitle}>{data.careSetting} Value Assessment</Text>
            {data.clientName && <Text style={styles.pageHeaderClient}>{data.clientName}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>
        <Text style={styles.sectionLabel}>Scaling Journey</Text>
        <Text style={styles.sectionTitle}>From Pilot to Full Deployment</Text>
        <Text style={styles.sectionSubtitle}>
          Exploring how value compounds as adoption matures—and where the math might differ for your organization.
        </Text>

        <View style={styles.educationalBox}>
          <Text style={styles.educationalLabel}>The compounding effect</Text>
          <Text style={styles.educationalText}>
            Value doesn't scale linearly. As utilization improves ({journey.pilotUtilization}% → {journey.fullScaleUtilization}%) and workflows adapt, each {data.unitName} may generate more value at maturity than at pilot. These projections assume adoption patterns we've observed—your experience could differ.
          </Text>
        </View>

        <View style={styles.journeyChart}>
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            <View style={{ width: 60, justifyContent: "space-between", paddingVertical: 4, height: 100 }}>
              <Text style={{ fontSize: 7, color: brand.slate500, textAlign: "right" }}>{formatCurrency(journey.fullScaleValue)}</Text>
              <Text style={{ fontSize: 7, color: brand.slate500, textAlign: "right" }}>{formatCurrency(Math.round(journey.fullScaleValue / 2))}</Text>
              <Text style={{ fontSize: 7, color: brand.slate500, textAlign: "right" }}>{formatCurrency(journey.pilotValue)}</Text>
              <Text style={{ fontSize: 7, color: brand.slate500, textAlign: "right" }}>$0</Text>
            </View>
            
            <View style={{ flex: 1, marginLeft: 10, height: 100, position: "relative" }}>
              <Svg width="400" height="100" viewBox="0 0 400 100">
                <Line x1="0" y1="25" x2="400" y2="25" stroke={brand.borderGray} strokeWidth="0.5" />
                <Line x1="0" y1="50" x2="400" y2="50" stroke={brand.borderGray} strokeWidth="0.5" />
                <Line x1="0" y1="75" x2="400" y2="75" stroke={brand.borderGray} strokeWidth="0.5" />
                <Line x1="0" y1="100" x2="400" y2="100" stroke={brand.slate300} strokeWidth="1" />
                
                <Line x1="20" y1="85" x2="380" y2="15" stroke={brand.slate300} strokeWidth="2" strokeDasharray="6,4" />
                <Path d="M 20 85 Q 120 55, 200 40 Q 300 20, 380 15" stroke={brand.emerald} strokeWidth="3" fill="none" />
                
                <Circle cx="20" cy="85" r="6" fill={brand.cadmiumRed} stroke={brand.white} strokeWidth="2" />
                <Circle cx="380" cy="10" r="6" fill={brand.emerald} stroke={brand.white} strokeWidth="2" />
              </Svg>
              
              <Text style={{ position: "absolute", bottom: 2, left: 4, fontSize: 8, color: brand.cadmiumRed, fontWeight: "bold" }}>Today</Text>
              <Text style={{ position: "absolute", top: -2, right: 4, fontSize: 8, color: brand.emerald, fontWeight: "bold" }}>Full Scale</Text>
              
              <View style={{ position: "absolute", top: 30, left: 150, backgroundColor: brand.emeraldLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: brand.emerald }}>
                <Text style={{ fontSize: 9, color: brand.emeraldDark, fontWeight: "bold", textAlign: "center" }}>+{formatCurrency(journey.networkEffect)}</Text>
                <Text style={{ fontSize: 6, color: brand.emeraldDark, textAlign: "center" }}>compounding effect</Text>
              </View>
            </View>
          </View>
          
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 70, paddingRight: 10 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 8, color: brand.cadmiumRed, fontWeight: "bold" }}>Pilot</Text>
              <Text style={{ fontSize: 7, color: brand.slate500 }}>{journey.pilotProviders} {data.unitNamePlural}</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 8, color: brand.emerald, fontWeight: "bold" }}>{paceLabels[journey.scalingPace]}</Text>
              <Text style={{ fontSize: 7, color: brand.slate500 }}>{journey.fullScaleProviders} {data.unitNamePlural}</Text>
            </View>
          </View>
        </View>

        <View style={styles.journeyScenario}>
          <View style={styles.journeyCard}>
            <Text style={styles.journeyCardTitle}>Starting Point</Text>
            <View style={styles.journeyCardRow}>
              <Text style={styles.journeyCardBullet}>•</Text>
              <Text style={styles.journeyCardText}><Text style={styles.journeyCardValue}>{journey.pilotProviders}</Text> {data.unitNamePlural}</Text>
            </View>
            <View style={styles.journeyCardRow}>
              <Text style={styles.journeyCardBullet}>•</Text>
              <Text style={styles.journeyCardText}><Text style={styles.journeyCardValue}>{formatNumber(journey.pilotEncounters)}</Text> encounters</Text>
            </View>
            <View style={styles.journeyCardRow}>
              <Text style={styles.journeyCardBullet}>•</Text>
              <Text style={styles.journeyCardText}><Text style={styles.journeyCardValue}>{journey.pilotUtilization}%</Text> utilization</Text>
            </View>
            <View style={styles.journeyCardRow}>
              <Text style={styles.journeyCardBullet}>•</Text>
              <Text style={styles.journeyCardText}><Text style={styles.journeyCardValueGreen}>{formatCurrency(journey.pilotValue)}</Text> /year</Text>
            </View>
          </View>

          <View style={styles.journeyCardHighlight}>
            <Text style={styles.journeyCardTitleHighlight}>Full Scale Potential</Text>
            <View style={styles.journeyCardRow}>
              <Text style={styles.journeyCardBullet}>•</Text>
              <Text style={styles.journeyCardText}><Text style={styles.journeyCardValue}>{journey.fullScaleProviders}</Text> {data.unitNamePlural}</Text>
            </View>
            <View style={styles.journeyCardRow}>
              <Text style={styles.journeyCardBullet}>•</Text>
              <Text style={styles.journeyCardText}><Text style={styles.journeyCardValue}>{journey.fullScaleUtilization}%</Text> utilization</Text>
            </View>
            <View style={styles.journeyCardRow}>
              <Text style={styles.journeyCardBullet}>•</Text>
              <Text style={styles.journeyCardText}>Scaling: <Text style={styles.journeyCardValue}>{paceLabels[journey.scalingPace]}</Text></Text>
            </View>
            <View style={styles.journeyCardRow}>
              <Text style={styles.journeyCardBullet}>•</Text>
              <Text style={styles.journeyCardText}><Text style={styles.journeyCardValueGreen}>{formatCurrency(journey.fullScaleValue)}</Text> /year</Text>
            </View>
          </View>
        </View>

        <View style={styles.compoundingBox}>
          <Text style={styles.compoundingTitle}>Value Multiplier</Text>
          <Text style={styles.compoundingValue}>{valueMultiple}x</Text>
          <Text style={styles.compoundingText}>
            From pilot to full scale, projected value grows from {formatCurrency(journey.pilotValue)} to {formatCurrency(journey.fullScaleValue)}. 
            This includes {formatCurrency(journey.networkEffect)} in compounding effects from workflow maturity and utilization improvement.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const MethodologyPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.contentPage}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderRow}>
          <Image src={abridgeLogoPath} style={styles.pageHeaderLogo} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.pageHeaderTitle}>{data.careSetting} Value Assessment</Text>
            {data.clientName && <Text style={styles.pageHeaderClient}>{data.clientName}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>
        <Text style={styles.sectionLabel}>Methodology</Text>
        <Text style={styles.sectionTitle}>How We Built This Model</Text>
        <Text style={styles.sectionSubtitle}>
          Understanding the inputs, benchmarks, and principles behind these projections.
        </Text>

        <View style={styles.educationalBox}>
          <Text style={styles.educationalLabel}>Our approach</Text>
          <Text style={styles.educationalText}>
            This model prioritizes transparency over precision. We use conservative assumptions, show our work step-by-step, and make every input editable. The goal isn't to prove a number—it's to give you a framework for thinking about value that you can stress-test and adapt.
          </Text>
        </View>

        <View style={styles.methodologyGrid}>
          <View style={styles.methodologyColumn}>
            <Text style={styles.methodologyTitle}>Your Inputs</Text>
            <Text style={styles.methodologyItem}>• {data.providers} {data.unitNamePlural}</Text>
            <Text style={styles.methodologyItem}>• {formatNumber(data.encounters)} annual encounters</Text>
            <Text style={styles.methodologyItem}>• {data.utilization}% utilization rate</Text>
            <Text style={styles.methodologyItem}>• {data.timeSavedPerEncounter} min saved per encounter</Text>
            <Text style={styles.methodologyItem}>• ${data.costPerProvider}/mo per {data.unitName}</Text>
          </View>

          <View style={styles.methodologyColumn}>
            <Text style={styles.methodologyTitle}>Enabled Drivers</Text>
            {data.drivers.map((driver) => (
              <Text key={driver.id} style={styles.methodologyItem}>
                • {driver.name}: {formatCurrency(driver.value)}
              </Text>
            ))}
          </View>

          <View style={[styles.methodologyColumn, styles.methodologyColumnLast]}>
            <Text style={styles.methodologyTitle}>Key Principles</Text>
            <Text style={styles.methodologyItem}>• Conservative realization rates</Text>
            <Text style={styles.methodologyItem}>• Medicare CF for wRVU (not commercial)</Text>
            <Text style={styles.methodologyItem}>• Audit factors for risk adjustment</Text>
            <Text style={styles.methodologyItem}>• Probabilistic retention modeling</Text>
            <Text style={styles.methodologyItem}>• All assumptions editable</Text>
          </View>
        </View>

        <View style={styles.theoryBox}>
          <Text style={styles.theoryLabel}>Realization Rates Explained</Text>
          <Text style={styles.theoryText}>
            Not every hour saved creates a dollar. Scheduling constraints, minimum shift requirements, payer mix, and other real-world factors mean only a portion of theoretical value converts to actual value. Each driver includes a realization rate—a conservative discount that reflects these constraints. You can adjust these rates to match your organization's reality.
          </Text>
        </View>

        <View style={{ backgroundColor: brand.paleGray, padding: 16, borderRadius: 8, marginTop: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: brand.black, marginBottom: 8 }}>Investment Summary</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 9, color: brand.slate700 }}>Annual Investment</Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: brand.black }}>{formatCurrency(data.investment)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 9, color: brand.slate700 }}>Projected Annual Value</Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: brand.emerald }}>{formatCurrency(data.totalValue)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: brand.black }}>Net Annual Value</Text>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: brand.emerald }}>{formatCurrency(data.netGain)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 20, padding: 16, backgroundColor: brand.slate900, borderRadius: 8 }}>
          <Text style={{ fontSize: 9, color: brand.slate300, lineHeight: 1.6 }}>
            This assessment is for strategic planning purposes. Actual results will vary based on implementation, adoption, and organizational factors. We recommend validating key assumptions with your finance and operations teams before using these projections for budgeting or business cases.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Abridge Value Assessment</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// MAIN DOCUMENT
// ============================================================================

const OutpatientPDFDocument = ({ data }: { data: OutpatientPDFData }) => {
  const totalPages = 3 + data.drivers.length + 1; // Cover + Summary + Scaling + Drivers + Methodology

  return (
    <Document>
      <CoverPage data={data} />
      <ExecutiveSummaryPage data={data} pageNum={2} totalPages={totalPages} />
      {data.drivers.map((driver, index) => (
        <DriverDetailPage 
          key={driver.id} 
          driver={driver} 
          data={data} 
          pageNum={3 + index} 
          totalPages={totalPages} 
        />
      ))}
      <ScalingJourneyPage data={data} pageNum={3 + data.drivers.length} totalPages={totalPages} />
      <MethodologyPage data={data} pageNum={totalPages} totalPages={totalPages} />
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTION
// ============================================================================

export async function generateOutpatientPDF(data: OutpatientPDFData): Promise<void> {
  const blob = await pdf(<OutpatientPDFDocument data={data} />).toBlob();
  const fileName = `abridge-value-assessment-${data.clientName?.toLowerCase().replace(/\s+/g, '-') || 'outpatient'}-${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
}

export const generateOutpatientROIPDF = generateOutpatientPDF;

export { OutpatientPDFDocument };
