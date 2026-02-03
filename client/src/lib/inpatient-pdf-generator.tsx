import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

Font.registerHyphenationCallback((word) => [word]);

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
  scalingPace: string;
  scalingMonths: number;
  networkEffect: number;
}

export interface InpatientPDFData {
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

  timeAllocation?: {
    throughput: number;
    lengthOfStay: number;
    readmissions: number;
    physicianEfficiency: number;
  };

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
// MCKINSEY/BLOOMBERG COLOR PALETTE
// ============================================================================

const brand = {
  black: "#1A1A1A",
  white: "#FFFFFF",
  coral: "#E85A4F",
  warmGray: "#F8F7F6",
  lightGray: "#F5F4F3",
  midGray: "#E5E4E3",
  borderGray: "#D4D4D4",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
};

// ============================================================================
// PREMIUM TYPOGRAPHY & STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: brand.textPrimary,
    backgroundColor: brand.white,
  },

  // COVER PAGE
  coverPage: {
    backgroundColor: brand.black,
    height: "100%",
    padding: 0,
  },
  coverTop: {
    padding: 48,
    paddingBottom: 0,
  },
  coverLogo: {
    width: 90,
    height: 18,
    marginBottom: 80,
  },
  coverHero: {
    paddingHorizontal: 48,
    flex: 1,
    justifyContent: "center",
  },
  coverEyebrow: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 20,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: brand.white,
    lineHeight: 1.1,
    marginBottom: 16,
  },
  coverSubtitle: {
    fontSize: 12,
    fontWeight: 400,
    color: brand.textTertiary,
    lineHeight: 1.6,
    maxWidth: 380,
    marginBottom: 48,
  },
  coverMetricBlock: {
    marginBottom: 40,
  },
  coverMetricValue: {
    fontSize: 64,
    fontWeight: 700,
    color: brand.coral,
    letterSpacing: -2,
    lineHeight: 1,
  },
  coverMetricLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: brand.textTertiary,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  coverBottom: {
    padding: 48,
    paddingTop: 0,
  },
  coverMeta: {
    fontSize: 10,
    color: brand.textTertiary,
    marginBottom: 4,
    lineHeight: 1.5,
  },
  coverDate: {
    fontSize: 10,
    color: brand.textTertiary,
    marginTop: 16,
  },

  // CONTENT PAGES
  contentPage: {
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 60,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  headerLogo: {
    width: 60,
    height: 12,
  },
  headerMeta: {
    fontSize: 9,
    color: brand.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
  },

  // TYPOGRAPHY
  sectionLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: brand.textPrimary,
    lineHeight: 1.2,
    marginBottom: 12,
  },
  sectionIntro: {
    fontSize: 11,
    color: brand.textSecondary,
    lineHeight: 1.7,
    marginBottom: 24,
    maxWidth: 480,
  },

  // TWO COLUMN FRAMEWORK BOX
  frameworkContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 24,
  },
  frameworkColumn: {
    flex: 1,
    padding: 20,
    backgroundColor: brand.warmGray,
    borderWidth: 1,
    borderColor: brand.midGray,
  },
  frameworkLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  frameworkValue: {
    fontSize: 28,
    fontWeight: 700,
    color: brand.coral,
    marginBottom: 12,
  },
  frameworkDescription: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  frameworkTagline: {
    fontSize: 10,
    fontWeight: 600,
    color: brand.textPrimary,
    marginTop: 8,
  },

  // ALLOCATION TABLE
  allocationSection: {
    marginBottom: 24,
  },
  allocationLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: brand.textPrimary,
    marginBottom: 12,
  },
  allocationTable: {
    borderWidth: 1,
    borderColor: brand.midGray,
  },
  allocationHeader: {
    flexDirection: "row",
    backgroundColor: brand.lightGray,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  allocationHeaderCell: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  allocationRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  allocationRowLast: {
    borderBottomWidth: 0,
  },
  allocationCell: {
    fontSize: 10,
    color: brand.textPrimary,
  },
  allocationCellBold: {
    fontSize: 10,
    fontWeight: 600,
    color: brand.coral,
  },

  // INSIGHT BOX
  insightBox: {
    backgroundColor: brand.lightGray,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: brand.coral,
  },
  insightLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  insightText: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.6,
  },

  // DRIVER PAGE - STEP BOXES
  driverHeader: {
    marginBottom: 24,
  },
  driverEyebrow: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  driverTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: brand.textPrimary,
    marginBottom: 4,
  },
  driverValueBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  driverValueAmount: {
    fontSize: 32,
    fontWeight: 700,
    color: brand.coral,
  },
  driverValueLabel: {
    fontSize: 10,
    color: brand.textSecondary,
    marginLeft: 8,
  },
  theLogicSection: {
    marginBottom: 24,
  },
  theLogicLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  theLogicText: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.7,
  },
  stepBox: {
    backgroundColor: brand.lightGray,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: brand.midGray,
  },
  stepBoxLast: {
    marginBottom: 0,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textPrimary,
    marginBottom: 10,
  },
  stepFormula: {
    fontSize: 11,
    fontWeight: 600,
    color: brand.coral,
    marginBottom: 8,
  },
  stepExplanation: {
    fontSize: 9,
    color: brand.textSecondary,
    lineHeight: 1.6,
  },
  calibrationNote: {
    backgroundColor: brand.warmGray,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: brand.textSecondary,
  },
  calibrationLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  calibrationText: {
    fontSize: 9,
    color: brand.textSecondary,
    lineHeight: 1.6,
  },

  // PROJECTION TABLE
  projectionTable: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: brand.midGray,
  },
  projectionHeader: {
    flexDirection: "row",
    backgroundColor: brand.lightGray,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  projectionHeaderCell: {
    flex: 1,
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  projectionHeaderCellFirst: {
    flex: 1.2,
    textAlign: "left",
  },
  projectionRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  projectionRowLast: {
    borderBottomWidth: 0,
  },
  projectionCell: {
    flex: 1,
    fontSize: 10,
    color: brand.textPrimary,
    textAlign: "center",
  },
  projectionCellFirst: {
    flex: 1.2,
    textAlign: "left",
    fontWeight: 600,
  },
  projectionCellBold: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
    color: brand.textPrimary,
    textAlign: "center",
  },
  projectionCellCoral: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
    color: brand.coral,
    textAlign: "center",
  },

  // SCALE ECONOMICS
  scaleContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 24,
  },
  scaleCard: {
    flex: 1,
    backgroundColor: brand.black,
    padding: 20,
  },
  scaleLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  scaleValue: {
    fontSize: 24,
    fontWeight: 700,
    color: brand.white,
    marginBottom: 6,
  },
  scaleMeta: {
    fontSize: 10,
    color: brand.textTertiary,
    lineHeight: 1.5,
  },

  // TRANSPARENCY PAGE
  transparencyIntro: {
    fontSize: 11,
    color: brand.textSecondary,
    lineHeight: 1.7,
    marginBottom: 24,
    maxWidth: 480,
  },
  inputsSection: {
    marginBottom: 20,
  },
  inputsSectionLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  inputsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  inputCard: {
    width: "31%",
    backgroundColor: brand.lightGray,
    padding: 12,
    borderWidth: 1,
    borderColor: brand.midGray,
  },
  inputLabel: {
    fontSize: 8,
    color: brand.textSecondary,
    marginBottom: 4,
  },
  inputValue: {
    fontSize: 14,
    fontWeight: 700,
    color: brand.textPrimary,
  },
  realizationTable: {
    borderWidth: 1,
    borderColor: brand.midGray,
    marginBottom: 16,
  },
  realizationHeader: {
    flexDirection: "row",
    backgroundColor: brand.lightGray,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  realizationHeaderCell: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  realizationRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  realizationRowLast: {
    borderBottomWidth: 0,
  },
  realizationCell: {
    fontSize: 10,
    color: brand.textPrimary,
  },
  realizationCellBold: {
    fontSize: 10,
    fontWeight: 600,
    color: brand.coral,
  },
  realizationCellWhy: {
    fontSize: 9,
    color: brand.textSecondary,
    lineHeight: 1.4,
  },

  // HOW TO USE PAGE
  actionSection: {
    marginBottom: 20,
  },
  actionNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: brand.coral,
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: brand.textPrimary,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.6,
  },
  closingBox: {
    backgroundColor: brand.black,
    padding: 24,
    marginTop: 24,
  },
  closingText: {
    fontSize: 11,
    color: brand.white,
    lineHeight: 1.7,
  },

  // FOOTER
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: brand.textTertiary,
  },
  footerPage: {
    fontSize: 8,
    fontWeight: 600,
    color: brand.textSecondary,
  },
});

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString()}K`;
  }
  return `$${value.toLocaleString()}`;
};

const formatNumber = (value: number): string => value.toLocaleString();

// ============================================================================
// PAGE 1: COVER
// ============================================================================

const CoverPage = ({ data }: { data: InpatientPDFData }) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
  const displayName = data.clientName || data.organizationName || "Your Organization";

  return (
    <Page size="A4" style={[styles.page, styles.coverPage]} wrap={false}>
      <View style={styles.coverTop}>
        <Image src={abridgeLogoPath} style={styles.coverLogo} />
      </View>

      <View style={styles.coverHero}>
        <Text style={styles.coverEyebrow}>Strategic Value Assessment</Text>
        <Text style={styles.coverTitle}>{displayName}</Text>
        <Text style={styles.coverSubtitle}>
          A framework for understanding the economics of ambient clinical documentation in inpatient settings
        </Text>

        <View style={styles.coverMetricBlock}>
          <Text style={styles.coverMetricValue}>{formatCurrency(data.netGain)}</Text>
          <Text style={styles.coverMetricLabel}>Projected Net Annual Value</Text>
        </View>
      </View>

      <View style={styles.coverBottom}>
        <Text style={styles.coverMeta}>
          {data.providers} {data.unitNamePlural || "hospitalists"} · {formatNumber(data.encounters)} encounters · Inpatient
        </Text>
        <Text style={styles.coverDate}>{today}</Text>
        {data.preparedBy && (
          <Text style={[styles.coverMeta, { marginTop: 12 }]}>Prepared for {data.preparedBy}</Text>
        )}
      </View>
    </Page>
  );
};

// ============================================================================
// PAGE 2: THE THESIS
// ============================================================================

const ThesisPage = ({ data, pageNum, totalPages }: { data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const revenueDrivers = data.drivers.filter(d => d.category === "revenue");

  const laborValue = laborDrivers.reduce((sum, d) => sum + d.value, 0);
  const revenueValue = revenueDrivers.reduce((sum, d) => sum + d.value, 0);

  const strategyInsight = laborValue > revenueValue
    ? "Your model emphasizes operational efficiency—reducing length of stay, improving throughput. This is the playbook of capacity-constrained hospitals."
    : "Your model emphasizes revenue optimization—better documentation, improved coding. This is the playbook of hospitals seeking margin improvement.";

  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Value Framework</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>The Thesis</Text>
        <Text style={styles.sectionTitle}>Two Sources of Value</Text>
        <Text style={styles.sectionIntro}>
          Most ROI models ask: "How much will you save?" We ask: "If we give hospitalists time back, what happens to your hospital?"
        </Text>
        <Text style={[styles.sectionIntro, { marginTop: -12 }]}>
          The answer reveals your strategy. There are two fundamental ways inpatient documentation time creates value:
        </Text>

        <View style={styles.frameworkContainer}>
          <View style={styles.frameworkColumn}>
            <Text style={styles.frameworkLabel}>Capacity Unlocked</Text>
            <Text style={styles.frameworkValue}>{formatCurrency(laborValue)}</Text>
            <Text style={styles.frameworkDescription}>
              Hours returned to rounding, patient care, and throughput. Beds freed by earlier discharges. Admits processed faster.
            </Text>
            <Text style={styles.frameworkTagline}>The constraint is time. Remove it.</Text>
          </View>
          <View style={styles.frameworkColumn}>
            <Text style={styles.frameworkLabel}>Revenue Optimized</Text>
            <Text style={styles.frameworkValue}>{formatCurrency(revenueValue)}</Text>
            <Text style={styles.frameworkDescription}>
              Better documentation, higher CMI, reduced denials. Every encounter captured completely, coded correctly.
            </Text>
            <Text style={styles.frameworkTagline}>The notes drive the revenue.</Text>
          </View>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>Strategic Observation</Text>
          <Text style={styles.insightText}>{strategyInsight}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.preparedBy ? `Prepared by: ${data.preparedBy}` : "Abridge Value Assessment"}</Text>
        <Text style={styles.footerPage}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// DRIVER PAGES - EDUCATIONAL FORMAT WITH STEP BOXES
// ============================================================================

interface DriverLogic {
  theory: string;
  steps: Array<{
    label: string;
    formula: string;
    explanation: string;
  }>;
  calibration: string;
}

function getDriverLogic(driver: DriverCalculation, data: InpatientPDFData): DriverLogic {
  const inputs = driver.inputs;
  
  switch (driver.id) {
    case "throughput": {
      const additionalAdmits = Math.round(driver.value / ((inputs.avgAdmitRevenue as number) || 15000));
      return {
        theory: `In inpatient medicine, throughput is king. Every hour a hospitalist spends documenting is an hour not spent rounding, discharging, or admitting. Documentation creates bottlenecks.\n\nThe math is direct: reduce documentation burden → accelerate discharges → free beds → admit more patients. The constraint isn't beds. It's the velocity of patients through those beds.`,
        steps: [
          {
            label: "STEP 1: TIME CREATED",
            formula: `${formatNumber(data.eligibleEncounters)} encounters × ${data.timeSavedPerEncounter} min = ${formatNumber(data.hoursReturned)} hours`,
            explanation: "Raw documentation time returned to clinical work.",
          },
          {
            label: "STEP 2: THROUGHPUT IMPACT",
            formula: `${formatNumber(data.hoursReturned)} hours × efficiency factor = ${additionalAdmits} additional admits`,
            explanation: "Not all time converts directly. We account for workflow constraints and ramp-up periods.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `${additionalAdmits} admits × $${formatNumber((inputs.avgAdmitRevenue as number) || 15000)}/admit = ${formatCurrency(driver.value)}`,
            explanation: "Additional admits at your average revenue per admission.",
          },
        ],
        calibration: "We apply conservative realization rates because throughput gains require operational coordination. Top performers exceed these projections.",
      };
    }

    case "lengthOfStay": {
      const losReduction = (inputs.losReductionHours as number) || 2;
      return {
        theory: `Length of stay is the most expensive metric in hospital operations. Every hour a patient stays costs money—nursing hours, supplies, opportunity cost of that bed.\n\nFaster documentation means faster discharges. Faster discharges mean lower costs and freed capacity. The compound effect is significant.`,
        steps: [
          {
            label: "STEP 1: DISCHARGE ACCELERATION",
            formula: `Improved documentation turnaround → ${losReduction} hour LOS reduction`,
            explanation: "Faster notes mean faster discharge orders, earlier transport coordination.",
          },
          {
            label: "STEP 2: COST SAVINGS",
            formula: `${formatNumber(data.encounters)} discharges × ${losReduction} hrs × hourly cost = savings`,
            explanation: "Each hour saved reduces variable costs and frees capacity.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `Total savings × realization = ${formatCurrency(driver.value)}`,
            explanation: "Conservative estimate accounting for cases where LOS is driven by clinical factors beyond documentation.",
          },
        ],
        calibration: "LOS is multi-factorial. Documentation is one lever among many. We're conservative to account for this complexity.",
      };
    }

    case "readmissions": {
      return {
        theory: `Readmissions are expensive—clinically and financially. Better documentation during the index admission improves discharge planning, care transitions, and follow-up.\n\nComplete notes mean complete handoffs. Complete handoffs mean fewer gaps. Fewer gaps mean fewer bouncebacks.`,
        steps: [
          {
            label: "STEP 1: DOCUMENTATION QUALITY",
            formula: `Comprehensive ambient notes → improved discharge summaries`,
            explanation: "Every clinical detail captured means better transition of care documentation.",
          },
          {
            label: "STEP 2: READMISSION REDUCTION",
            formula: `Better handoffs → reduced 30-day readmissions`,
            explanation: "Even a 0.5% reduction in readmission rate generates significant value.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `Avoided readmissions × penalty/cost = ${formatCurrency(driver.value)}`,
            explanation: "Includes both penalty avoidance and direct cost savings.",
          },
        ],
        calibration: "Readmission reduction is conservative. The documentation-to-outcome chain is real but hard to isolate.",
      };
    }

    case "inpatientRetention":
    case "physicianEfficiency": {
      // Get wellbeing allocation from inputs
      const wellbeingPct = (inputs.wellbeingPct as number) || 30;
      const wellbeingHours = (inputs.wellbeingHours as number) || Math.round(data.hoursReturned * (wellbeingPct / 100));
      const hoursPerProvider = (inputs.hoursPerProvider as number) || Math.round(wellbeingHours / data.providers);
      const turnoverRate = (inputs.turnoverRate as number) || 10;
      const burnoutAttribution = (inputs.burnoutAttribution as number) || (inputs.burnoutPct as number) || 60;
      const annualDepartures = (inputs.annualDepartures as number) || (data.providers * (turnoverRate / 100));
      const burnoutDepartures = (inputs.burnoutDepartures as number) || (annualDepartures * (burnoutAttribution / 100));
      const retentionLift = (inputs.retentionLift as number) || 15;
      const departuresAvoided = (inputs.departuresAvoided as number) || (burnoutDepartures * (retentionLift / 100));
      const replacementCost = (inputs.replacementCost as number) || (inputs.turnoverCost as number) || 350000;
      
      const weeklyMinutes = Math.round(hoursPerProvider * 60 / 52);
      const tier = hoursPerProvider < 50 ? "MINIMAL (3-5% turnover reduction)" 
                 : hoursPerProvider < 100 ? "MODERATE (8-12% reduction)" 
                 : hoursPerProvider < 150 ? "SIGNIFICANT (15-20% reduction)"
                 : "MAXIMUM (25-30% reduction)";
      
      return {
        theory: `Hospitalist turnover is epidemic—and expensive. Recruiting, credentialing, onboarding, lost productivity. The full replacement cost often exceeds $350K.\n\nThe root cause is frequently burnout. The root cause of burnout is frequently documentation burden. The math is direct: reduce documentation time → reduce after-hours charting → reduce burnout → reduce turnover → avoid replacement costs.`,
        steps: [
          {
            label: "STEP 1: TIME ALLOCATED TO WELLBEING",
            formula: `${formatNumber(data.hoursReturned)} total hours × ${wellbeingPct}% to wellbeing = ${formatNumber(wellbeingHours)} hours`,
            explanation: `Per hospitalist: ${hoursPerProvider} hours/year (~${weeklyMinutes} minutes back per week). This time goes directly to reducing pajama-time charting.`,
          },
          {
            label: "STEP 2: IMPACT THRESHOLD",
            formula: `At ${hoursPerProvider} hrs/provider/year → ${tier}`,
            explanation: "Time-back interventions follow a threshold model:\n• < 50 hrs/yr: MINIMAL impact (3-5% lift)\n• 50-100 hrs/yr: MODERATE impact (8-12% lift)\n• 100-150 hrs/yr: SIGNIFICANT impact (15-20% lift)\n• 150+ hrs/yr: MAXIMUM impact (25-30% lift)",
          },
          {
            label: "STEP 3: BASELINE TURNOVER",
            formula: `${data.providers} hospitalists × ${turnoverRate}% turnover = ${annualDepartures.toFixed(1)} departures/year`,
            explanation: `Of these, approximately ${burnoutAttribution}% (${burnoutDepartures.toFixed(1)} departures) are burnout-related and addressable.`,
          },
          {
            label: "STEP 4: RETENTION VALUE",
            formula: `${burnoutDepartures.toFixed(1)} burnout departures × ${retentionLift}% retention lift × $${formatNumber(replacementCost)} = ${formatCurrency(driver.value)}`,
            explanation: `${departuresAvoided.toFixed(2)} departures avoided annually. Hospitalist replacement costs include recruiting, signing bonus, credentialing, onboarding, and lost revenue during ramp-up.`,
          },
        ],
        calibration: `Your allocation (${wellbeingPct}% to wellbeing, ${hoursPerProvider} hrs/hospitalist) produces ${hoursPerProvider < 50 ? "modest but measurable" : hoursPerProvider < 100 ? "moderate" : "significant"} retention impact. ${hoursPerProvider < 50 ? "Organizations prioritizing retention often allocate 40-50% to wellbeing." : "You're investing meaningfully in workforce sustainability."}`,
      };
    }

    case "cdi":
    case "denials": {
      return {
        theory: `Revenue integrity starts with documentation. Better notes mean better coding. Better coding means fewer denials, higher CMI, and captured complexity.\n\nAmbient documentation captures the clinical story as it happens—not as it's remembered hours later.`,
        steps: [
          {
            label: "STEP 1: DOCUMENTATION COMPLETENESS",
            formula: `Real-time capture → comprehensive clinical detail`,
            explanation: "Every diagnosis, every intervention, every clinical decision documented at the point of care.",
          },
          {
            label: "STEP 2: CODING IMPROVEMENT",
            formula: `Complete notes → accurate coding → reduced denials`,
            explanation: "Coders work with complete information. Queries decrease. Accuracy increases.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `Revenue captured/recovered = ${formatCurrency(driver.value)}`,
            explanation: "Combination of higher initial coding accuracy and reduced denial rates.",
          },
        ],
        calibration: "CDI and denial improvements are measurable but require CDI workflow integration for full benefit.",
      };
    }

    default: {
      return {
        theory: `This value driver represents operational improvements from ambient documentation. The logic follows the pattern of time savings creating capacity, which converts to measurable value.`,
        steps: [
          {
            label: "STEP 1: EFFICIENCY GAIN",
            formula: `Documentation improvement → operational efficiency`,
            explanation: "Time saved translates to improved workflows.",
          },
          {
            label: "STEP 2: VALUE CONVERSION",
            formula: `Efficiency × opportunity = value`,
            explanation: "Operational improvements convert to financial impact.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `Annual value = ${formatCurrency(driver.value)}`,
            explanation: "Conservative estimate with realization adjustments.",
          },
        ],
        calibration: "Estimates are conservative to account for implementation variability.",
      };
    }
  }
}

const DriverPage = ({ driver, data, pageNum, totalPages }: { driver: DriverCalculation; data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  const logic = getDriverLogic(driver, data);
  const benefitLabel = driver.category === "labor" ? "CAPACITY" : "REVENUE";

  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Value Driver</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.driverHeader}>
          <Text style={styles.driverEyebrow}>VALUE DRIVER · {benefitLabel}</Text>
          <Text style={styles.driverTitle}>{driver.name}</Text>
          <View style={styles.driverValueBadge}>
            <Text style={styles.driverValueAmount}>{formatCurrency(driver.value)}</Text>
            <Text style={styles.driverValueLabel}>annual value</Text>
          </View>
        </View>

        <View style={styles.theLogicSection}>
          <Text style={styles.theLogicLabel}>The Logic</Text>
          <Text style={styles.theLogicText}>{logic.theory}</Text>
        </View>

        {logic.steps.map((step, i) => (
          <View key={i} style={[styles.stepBox, i === logic.steps.length - 1 ? styles.stepBoxLast : {}]}>
            <Text style={styles.stepLabel}>{step.label}</Text>
            <Text style={styles.stepFormula}>{step.formula}</Text>
            <Text style={styles.stepExplanation}>{step.explanation}</Text>
          </View>
        ))}

        <View style={styles.calibrationNote}>
          <Text style={styles.calibrationLabel}>Calibration Note</Text>
          <Text style={styles.calibrationText}>{logic.calibration}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.preparedBy ? `Prepared by: ${data.preparedBy}` : "Abridge Value Assessment"}</Text>
        <Text style={styles.footerPage}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// PAGE: INVESTMENT & RETURN
// ============================================================================

const InvestmentPage = ({ data, pageNum, totalPages }: { data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  const year3ROI = ((data.threeYearNet / data.threeYearCost) + 1).toFixed(2);

  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Financial Framework</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Financial Framework</Text>
        <Text style={styles.sectionTitle}>The Investment Case</Text>
        <Text style={styles.sectionIntro}>
          ROI calculations are necessary but insufficient. They answer 'Is this worth it?' but not 'How should we think about it?'
        </Text>
        <Text style={[styles.sectionIntro, { marginTop: -12 }]}>
          The right frame: ambient documentation is infrastructure, not an expense. It creates capacity that compounds.
        </Text>

        <View style={styles.projectionTable}>
          <View style={styles.projectionHeader}>
            <Text style={[styles.projectionHeaderCell, styles.projectionHeaderCellFirst]}>Period</Text>
            <Text style={styles.projectionHeaderCell}>Value</Text>
            <Text style={styles.projectionHeaderCell}>Investment</Text>
            <Text style={styles.projectionHeaderCell}>Net Value</Text>
            <Text style={styles.projectionHeaderCell}>Cumulative</Text>
          </View>
          <View style={styles.projectionRow}>
            <Text style={[styles.projectionCell, styles.projectionCellFirst]}>Year 1</Text>
            <Text style={styles.projectionCell}>{formatCurrency(data.year1Value)}</Text>
            <Text style={styles.projectionCell}>{formatCurrency(data.year1Cost)}</Text>
            <Text style={styles.projectionCellCoral}>{formatCurrency(data.year1Value - data.year1Cost)}</Text>
            <Text style={styles.projectionCellBold}>{formatCurrency(data.year1Value - data.year1Cost)}</Text>
          </View>
          <View style={styles.projectionRow}>
            <Text style={[styles.projectionCell, styles.projectionCellFirst]}>Year 2</Text>
            <Text style={styles.projectionCell}>{formatCurrency(data.year2Value)}</Text>
            <Text style={styles.projectionCell}>{formatCurrency(data.year2Cost)}</Text>
            <Text style={styles.projectionCellCoral}>{formatCurrency(data.year2Value - data.year2Cost)}</Text>
            <Text style={styles.projectionCellBold}>{formatCurrency((data.year1Value - data.year1Cost) + (data.year2Value - data.year2Cost))}</Text>
          </View>
          <View style={[styles.projectionRow, styles.projectionRowLast]}>
            <Text style={[styles.projectionCell, styles.projectionCellFirst]}>Year 3</Text>
            <Text style={styles.projectionCell}>{formatCurrency(data.year3Value)}</Text>
            <Text style={styles.projectionCell}>{formatCurrency(data.year3Cost)}</Text>
            <Text style={styles.projectionCellCoral}>{formatCurrency(data.year3Value - data.year3Cost)}</Text>
            <Text style={styles.projectionCellBold}>{formatCurrency(data.threeYearNet)}</Text>
          </View>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>Economics Insight</Text>
          <Text style={styles.insightText}>
            Notice the asymmetry: investment stays flat while value grows. This is the signature of infrastructure—fixed cost, scaling returns. By Year 3, you're generating ${year3ROI} for every $1 invested. That's not a line item to be cut in a downturn. It's a competitive advantage to be protected.
          </Text>
        </View>

        <View style={styles.scaleContainer}>
          <View style={styles.scaleCard}>
            <Text style={styles.scaleLabel}>Current Model</Text>
            <Text style={styles.scaleValue}>{formatCurrency(data.journey.pilotValue)}/yr</Text>
            <Text style={styles.scaleMeta}>
              {data.journey.pilotProviders} hospitalists · {data.journey.pilotUtilization}% utilization
            </Text>
          </View>
          <View style={styles.scaleCard}>
            <Text style={styles.scaleLabel}>Full Scale Potential</Text>
            <Text style={styles.scaleValue}>{formatCurrency(data.journey.fullScaleValue)}/yr</Text>
            <Text style={styles.scaleMeta}>
              {data.journey.fullScaleProviders} hospitalists · {data.journey.fullScaleUtilization}% utilization
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 9, color: brand.textSecondary, lineHeight: 1.5 }}>
          Per-hospitalist economics remain consistent at scale. Operational learning often improves them.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.preparedBy ? `Prepared by: ${data.preparedBy}` : "Abridge Value Assessment"}</Text>
        <Text style={styles.footerPage}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// PAGE: MODEL TRANSPARENCY
// ============================================================================

const TransparencyPage = ({ data, pageNum, totalPages }: { data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  const realizationRates = [
    { rate: "Throughput realization", value: "15%", why: "Operational coordination required" },
    { rate: "LOS impact", value: "20%", why: "Multi-factorial LOS drivers" },
    { rate: "Readmission reduction", value: "10%", why: "Documentation is one of many factors" },
    { rate: "Retention impact", value: "4%", why: "Multi-factor burnout attribution" },
  ];

  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Model Transparency</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Model Transparency</Text>
        <Text style={styles.sectionTitle}>Every Number Has a Source</Text>
        <Text style={styles.transparencyIntro}>
          We don't hide assumptions. We highlight them. If you disagree with an input, change it. The model adapts. This isn't a black box designed to produce a predetermined answer. It's a thinking tool designed to stress-test scenarios.
        </Text>

        <View style={styles.inputsSection}>
          <Text style={styles.inputsSectionLabel}>Your Inputs</Text>
          <View style={styles.inputsGrid}>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>{data.unitNamePlural || "Hospitalists"}</Text>
              <Text style={styles.inputValue}>{data.providers}</Text>
            </View>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Annual Encounters</Text>
              <Text style={styles.inputValue}>{formatNumber(data.encounters)}</Text>
            </View>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Utilization</Text>
              <Text style={styles.inputValue}>{data.utilization}%</Text>
            </View>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Time Saved</Text>
              <Text style={styles.inputValue}>{data.timeSavedPerEncounter} min</Text>
            </View>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Hours Returned</Text>
              <Text style={styles.inputValue}>{formatNumber(data.hoursReturned)}</Text>
            </View>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Investment</Text>
              <Text style={styles.inputValue}>{formatCurrency(data.investment)}/yr</Text>
            </View>
          </View>
        </View>

        <View style={styles.inputsSection}>
          <Text style={styles.inputsSectionLabel}>Realization Rates</Text>
          <View style={styles.realizationTable}>
            <View style={styles.realizationHeader}>
              <Text style={[styles.realizationHeaderCell, { flex: 2 }]}>Rate</Text>
              <Text style={[styles.realizationHeaderCell, { flex: 1, textAlign: "center" }]}>Value</Text>
              <Text style={[styles.realizationHeaderCell, { flex: 3 }]}>Why This Conservative</Text>
            </View>
            {realizationRates.map((item, i) => (
              <View key={i} style={[styles.realizationRow, i === realizationRates.length - 1 ? styles.realizationRowLast : {}]}>
                <Text style={[styles.realizationCell, { flex: 2 }]}>{item.rate}</Text>
                <Text style={[styles.realizationCellBold, { flex: 1, textAlign: "center" }]}>{item.value}</Text>
                <Text style={[styles.realizationCellWhy, { flex: 3 }]}>{item.why}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.insightBox}>
          <Text style={styles.insightLabel}>Methodology Note</Text>
          <Text style={styles.insightText}>
            Our philosophy: conservative inputs, transparent logic. We'd rather you be pleasantly surprised than disappointed. These realization rates are based on observed implementations, not theoretical maximums.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.preparedBy ? `Prepared by: ${data.preparedBy}` : "Abridge Value Assessment"}</Text>
        <Text style={styles.footerPage}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// PAGE: HOW TO USE THIS DOCUMENT
// ============================================================================

const HowToUsePage = ({ data, pageNum, totalPages }: { data: InpatientPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>Next Steps</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Next Steps</Text>
        <Text style={styles.sectionTitle}>How to Use This Document</Text>
        <Text style={styles.sectionIntro}>
          This isn't a sales document. It's a decision-support tool. Here's how to get the most from it:
        </Text>

        <View style={styles.actionSection}>
          <Text style={styles.actionNumber}>1.</Text>
          <Text style={styles.actionTitle}>Stress Test the Inputs</Text>
          <Text style={styles.actionText}>
            What if utilization is lower than projected? What if time savings are more modest? Run scenarios. The value of this model is in its flexibility, not its point estimate.
          </Text>
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.actionNumber}>2.</Text>
          <Text style={styles.actionTitle}>Scenario Plan</Text>
          <Text style={styles.actionText}>
            Map the pilots and rollouts. Which service lines first? Which hospitalist groups are most likely to adopt? Build the sequencing logic before the implementation plan.
          </Text>
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.actionNumber}>3.</Text>
          <Text style={styles.actionTitle}>Track Outcomes</Text>
          <Text style={styles.actionText}>
            Pick 3 metrics to track post-implementation:{"\n"}
            • Documentation time per encounter (target: -50%){"\n"}
            • Hospitalist satisfaction score (target: +15 pts){"\n"}
            • One operational metric aligned to your value drivers
          </Text>
        </View>

        <View style={styles.closingBox}>
          <Text style={styles.closingText}>
            The goal isn't to predict the future with precision. It's to give you a framework for making decisions with confidence—and adjusting as reality unfolds.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{data.preparedBy ? `Prepared by: ${data.preparedBy}` : "Abridge Value Assessment"}</Text>
        <Text style={styles.footerPage}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

// ============================================================================
// DOCUMENT COMPONENT
// ============================================================================

const InpatientPDFDocument = ({ data }: { data: InpatientPDFData }) => {
  // Cover + Thesis + Drivers + Investment + Transparency + HowToUse
  const totalPages = 5 + data.drivers.length;
  let pageNum = 1;

  return (
    <Document>
      <CoverPage data={data} />
      <ThesisPage data={data} pageNum={++pageNum} totalPages={totalPages} />
      {data.drivers.map((driver) => (
        <DriverPage
          key={driver.id}
          driver={driver}
          data={data}
          pageNum={++pageNum}
          totalPages={totalPages}
        />
      ))}
      <InvestmentPage data={data} pageNum={++pageNum} totalPages={totalPages} />
      <TransparencyPage data={data} pageNum={++pageNum} totalPages={totalPages} />
      <HowToUsePage data={data} pageNum={++pageNum} totalPages={totalPages} />
    </Document>
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function generateInpatientROIPDF(data: InpatientPDFData): Promise<void> {
  const blob = await pdf(<InpatientPDFDocument data={data} />).toBlob();
  const today = new Date().toISOString().split("T")[0];
  const orgName = data.clientName || data.organizationName || "Organization";
  const fileName = `Inpatient_ROI_Model_${orgName.replace(/\s+/g, "_")}_${today}.pdf`;
  saveAs(blob, fileName);
}

export async function generateInpatientROIPDFBlob(data: InpatientPDFData): Promise<Blob> {
  return await pdf(<InpatientPDFDocument data={data} />).toBlob();
}

export { InpatientPDFDocument };
