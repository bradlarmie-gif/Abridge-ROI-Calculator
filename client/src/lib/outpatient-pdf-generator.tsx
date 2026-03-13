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
import { savePdfBlob } from "@/lib/pdf-save";
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
  scalingPace: "measured" | "steady" | "aggressive";
  scalingMonths: number;
  networkEffect: number;
}

export interface OutpatientPDFData {
  clientName?: string;
  preparedBy?: string;
  organizationName?: string;
  contactName?: string;
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
    patientAccess: number;
    patientExperience: number;
    clinicianWellbeing: number;
    reducingLocums?: number;
  };

  timeValues?: {
    patientAccess: number;
    patientExperience: number | string;
    clinicianWellbeing: number;
    reducingLocums?: number;
  };

  wellbeingThreshold?: string;

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

const CoverPage = ({ data }: { data: OutpatientPDFData }) => {
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
          A framework for understanding the economics of ambient clinical documentation
        </Text>

        <View style={styles.coverMetricBlock}>
          <Text style={styles.coverMetricValue}>{formatCurrency(data.netGain)}</Text>
          <Text style={styles.coverMetricLabel}>Projected Net Annual Value</Text>
        </View>
      </View>

      <View style={styles.coverBottom}>
        <Text style={styles.coverMeta}>
          {data.providers} {data.unitNamePlural || "providers"} · {formatNumber(data.encounters)} encounters · {
            data.careSetting === "ed" ? "Emergency Department" :
            data.careSetting === "inpatient" ? "Inpatient" :
            data.careSetting === "nursing" ? "Nursing" : "Outpatient"
          }
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

const ThesisPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const timeReturned = data.laborTotal;
  const docImproved = data.revenueTotal;
  
  const allocations = [];
  if (data.timeAllocation?.patientAccess) {
    allocations.push({ category: "Patient Access", allocation: data.timeAllocation.patientAccess, implication: "Growth-oriented" });
  }
  if (data.timeAllocation?.clinicianWellbeing) {
    allocations.push({ category: "Clinician Wellbeing", allocation: data.timeAllocation.clinicianWellbeing, implication: "Sustainability-oriented" });
  }
  if (data.timeAllocation?.reducingLocums) {
    allocations.push({ category: "Locum Reduction", allocation: data.timeAllocation.reducingLocums, implication: "Cost-reduction" });
  }

  const primaryAllocation = allocations.length > 0 ? allocations.sort((a, b) => b.allocation - a.allocation)[0] : null;
  const strategyInsight = primaryAllocation?.implication === "Growth-oriented" 
    ? `This allocation reveals a growth-leaning strategy. You're betting that capacity—not retention—is your binding constraint. If that changes, the math changes. The model adapts.`
    : primaryAllocation?.implication === "Sustainability-oriented"
    ? `This allocation prioritizes sustainability. You're betting that keeping your clinicians healthy and engaged is the primary constraint. This is a long-term play.`
    : `This allocation balances multiple priorities. You're hedging across growth, sustainability, and cost reduction.`;

  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerMeta}>The Thesis</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>The Thesis</Text>
        <Text style={styles.sectionTitle}>Two Sources of Value, One Strategic Choice</Text>
        <Text style={styles.sectionIntro}>
          Ambient documentation creates value through two distinct mechanisms: time returned and documentation improved. Most analyses conflate these. We separate them—because the strategic implications are different.
        </Text>
        <Text style={[styles.sectionIntro, { marginTop: -12 }]}>
          Time returned is a resource. You decide how to deploy it. Documentation improved is a capture. It happens automatically.
        </Text>
        <Text style={[styles.sectionIntro, { marginTop: -12, fontWeight: 600, color: brand.textPrimary }]}>
          This distinction matters because it puts the ROI question where it belongs: What would you do with {formatNumber(data.hoursReturned)} hours back?
        </Text>

        <View style={styles.frameworkContainer}>
          <View style={styles.frameworkColumn}>
            <Text style={styles.frameworkLabel}>Time Returned</Text>
            <Text style={styles.frameworkValue}>{formatCurrency(timeReturned)}</Text>
            <Text style={styles.frameworkDescription}>
              A resource you deploy. The ROI depends on your strategic choices.
            </Text>
            <Text style={styles.frameworkTagline}>You control this.</Text>
          </View>
          <View style={styles.frameworkColumn}>
            <Text style={styles.frameworkLabel}>Documentation Improved</Text>
            <Text style={styles.frameworkValue}>{formatCurrency(docImproved)}</Text>
            <Text style={styles.frameworkDescription}>
              Value that accrues automatically when notes capture reality.
            </Text>
            <Text style={styles.frameworkTagline}>We deliver this.</Text>
          </View>
        </View>

        {allocations.length > 0 && (
          <View style={styles.allocationSection}>
            <Text style={styles.allocationLabel}>
              You've chosen to allocate your {formatNumber(data.hoursReturned)} hours as follows:
            </Text>
            <View style={styles.allocationTable}>
              <View style={styles.allocationHeader}>
                <Text style={[styles.allocationHeaderCell, { flex: 2 }]}>Category</Text>
                <Text style={[styles.allocationHeaderCell, { flex: 1, textAlign: "center" }]}>Allocation</Text>
                <Text style={[styles.allocationHeaderCell, { flex: 2 }]}>Implication</Text>
              </View>
              {allocations.map((item, i) => (
                <View key={i} style={[styles.allocationRow, i === allocations.length - 1 ? styles.allocationRowLast : {}]}>
                  <Text style={[styles.allocationCell, { flex: 2 }]}>{item.category}</Text>
                  <Text style={[styles.allocationCellBold, { flex: 1, textAlign: "center" }]}>{item.allocation}%</Text>
                  <Text style={[styles.allocationCell, { flex: 2 }]}>{item.implication}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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

function getDriverLogic(driver: DriverCalculation, data: OutpatientPDFData): DriverLogic {
  const inputs = driver.inputs;
  const allocation = data.timeAllocation || { patientAccess: 35, clinicianWellbeing: 35 };
  
  switch (driver.id) {
    case "patientAccess": {
      const hoursAllocated = Math.round(data.hoursReturned * (allocation.patientAccess / 100));
      const hoursRealized = Math.round(hoursAllocated * 0.15);
      const visits = Math.round(hoursRealized / 0.25);
      return {
        theory: `Every minute a physician spends documenting is a minute they're not seeing patients. This is elementary—but the implications are not.\n\nIf documentation time compresses, capacity expands. The question becomes: Can you convert that capacity to volume?\n\nThe answer depends on demand (do patients want to be seen?), operations (can you schedule them?), and physician willingness (will they see more?). We account for all three.`,
        steps: [
          {
            label: "STEP 1: TIME CREATED",
            formula: `${formatNumber(data.eligibleEncounters)} encounters × ${data.timeSavedPerEncounter} min saved = ${formatNumber(data.hoursReturned)} hours`,
            explanation: "This is the raw material. What happens next depends on your allocation.",
          },
          {
            label: "STEP 2: TIME ALLOCATED",
            formula: `${formatNumber(data.hoursReturned)} hours × ${allocation.patientAccess}% to access = ${formatNumber(hoursAllocated)} hours`,
            explanation: "You've chosen to deploy this portion of your time dividend toward growth. This is a strategic bet.",
          },
          {
            label: "STEP 3: TIME CONVERTED",
            formula: `${formatNumber(hoursAllocated)} hours × 15% realization = ${formatNumber(hoursRealized)} hours of visits`,
            explanation: "Why 15%? Not all freed time converts to volume. Scheduling friction, demand variability, physician preferences all constrain conversion. We're conservative because over-promising destroys credibility.",
          },
          {
            label: "STEP 4: VALUE REALIZED",
            formula: `${formatNumber(visits)} visits × $${inputs.revenuePerVisit || 200}/visit = ${formatCurrency(driver.value)}`,
            explanation: "This is revenue you're currently leaving on the table. Patients who want appointments but can't get them. Demand you're turning away.",
          },
        ],
        calibration: "The 15% realization rate is intentionally conservative. Top-quartile organizations convert 20-25% of freed time to volume. If you execute well, you'll beat this projection.",
      };
    }

    case "clinicianWellbeing":
    case "workforce": {
      // Get wellbeing allocation - try from inputs first (wellbeingPct), then from timeAllocation
      const wellbeingPct = (inputs.wellbeingPct as number) ?? allocation.clinicianWellbeing ?? 30;
      const docQualityPct = (inputs.docQualityPct as number) ?? allocation.documentationQuality ?? 30;
      const burdenReliefPct = docQualityPct + wellbeingPct;
      const hoursAllocated = (inputs.wellbeingHours as number) || Math.round(data.hoursReturned * (burdenReliefPct / 100));
      const hoursPerProvider = (inputs.hoursPerProvider as number) || Math.round(hoursAllocated / data.providers);
      const turnoverRate = (inputs.turnoverRate as number) || 8;
      const burnoutAttribution = (inputs.burnoutAttribution as number) || 50;
      const annualDepartures = (inputs.annualDepartures as number) || (data.providers * (turnoverRate / 100));
      const burnoutDepartures = (inputs.burnoutDepartures as number) || (annualDepartures * (burnoutAttribution / 100));
      const retentionLift = (inputs.retentionLift as number) || 4;
      const departuresAvoided = (inputs.departuresAvoided as number) || (burnoutDepartures * (retentionLift / 100));
      const replacementCost = (inputs.replacementCost as number) || 250000;
      
      const tier = hoursPerProvider < 50 ? "MINIMAL (3-5% turnover reduction)" 
                 : hoursPerProvider < 100 ? "MODERATE (8-12% reduction)" 
                 : hoursPerProvider < 150 ? "SIGNIFICANT (15-20% reduction)"
                 : "MAXIMUM (25-30% reduction)";
      
      const weeklyMinutes = Math.round(hoursPerProvider * 60 / 52);
      
      return {
        theory: `Documentation burden is the number one driver of physician burnout. Burnout drives turnover. Turnover is expensive—$250K to $500K per physician when you factor recruiting, onboarding, ramp time, and lost revenue.\n\nThe math is straightforward: reduce burden → reduce burnout → reduce turnover → avoid replacement costs.\n\nThe challenge is attribution. We can't claim that every hour saved prevents a departure. So we use a threshold model that acknowledges diminishing returns and realistic impact windows.`,
        steps: [
          {
            label: "STEP 1: TIME RETURNED TO PROVIDERS",
            formula: `${formatNumber(data.hoursReturned)} total hours × ${burdenReliefPct}% burden relief = ${formatNumber(hoursAllocated)} hours`,
            explanation: `Per provider: ${hoursPerProvider} hours/year (~${weeklyMinutes} minutes back per week). This includes documentation quality and sustainability time — all time that reduces burden, excluding only patient capacity hours reinvested into additional visits.`,
          },
          {
            label: "STEP 2: IMPACT THRESHOLD",
            formula: `At ${hoursPerProvider} hrs/provider/year → ${tier}`,
            explanation: "Research shows time-back interventions follow a threshold model:\n• < 50 hrs/yr: MINIMAL impact (3-5% retention lift)\n• 50-100 hrs/yr: MODERATE impact (8-12% lift)\n• 100-150 hrs/yr: SIGNIFICANT impact (15-20% lift)\n• 150+ hrs/yr: MAXIMUM impact (25-30% lift)",
          },
          {
            label: "STEP 3: BASELINE TURNOVER",
            formula: `${data.providers} providers × ${turnoverRate}% turnover = ${annualDepartures.toFixed(1)} departures/year`,
            explanation: `Of these, approximately ${burnoutAttribution}% (${burnoutDepartures.toFixed(1)} departures) are burnout-related and addressable through documentation burden reduction.`,
          },
          {
            label: "STEP 4: RETENTION VALUE",
            formula: `${burnoutDepartures.toFixed(1)} burnout departures × ${retentionLift}% retention lift × $${formatNumber(replacementCost)} = ${formatCurrency(driver.value)}`,
            explanation: `${departuresAvoided.toFixed(2)} departures avoided annually. Replacement costs include recruiting ($30-50K), signing bonus ($20-50K), onboarding (3-6 months reduced productivity), and revenue loss during vacancy.`,
          },
        ],
        calibration: `Your allocation (${burdenReliefPct}% to burden relief, ${hoursPerProvider} hrs/provider) produces ${hoursPerProvider < 50 ? "modest but measurable" : hoursPerProvider < 100 ? "moderate" : "significant"} retention impact. ${hoursPerProvider < 50 ? "Organizations that allocate more time away from patient capacity see stronger retention effects." : "You're investing meaningfully in workforce sustainability—this compounds year over year."}`,
      };
    }

    case "wrvu": {
      return {
        theory: `Complex medical decision-making often goes undocumented in the rush between patients. When notes capture the complete picture, coding reflects the actual work performed.\n\nThe gap between what clinicians do and what gets documented is real and measurable.`,
        steps: [
          {
            label: "STEP 1: BASELINE GENERATION",
            formula: `${formatNumber(data.eligibleEncounters)} encounters × ${inputs.avgWrvuPerEncounter || 1.5} wRVU/encounter = ${formatNumber((inputs.baselineWrvus as number) || 0)} wRVUs`,
            explanation: "Your current documented productivity.",
          },
          {
            label: "STEP 2: IMPROVEMENT RATE",
            formula: `${formatNumber((inputs.baselineWrvus as number) || 0)} × ${inputs.wrvuImprovementRate || 3}% improvement = ${formatNumber((inputs.wrvuGain as number) || 0)} additional wRVUs`,
            explanation: "Complete documentation captures complexity that's currently being left out.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `${formatNumber((inputs.wrvuGain as number) || 0)} wRVUs × $${inputs.conversionFactor || 40} × 75% realization = ${formatCurrency(driver.value)}`,
            explanation: "The 75% realization accounts for payer mix variation and fee schedule differences.",
          },
        ],
        calibration: "Studies show 8-15% of encounters are systematically undercoded due to documentation gaps. Our 3% improvement assumption is deliberately modest.",
      };
    }

    case "hcc": {
      return {
        theory: `Hierarchical Condition Categories drive risk adjustment in value-based contracts. Conditions that aren't documented can't be coded. Gaps compound year over year.\n\nThe average Medicare Advantage patient has 3.2 undocumented HCCs worth $1,200-2,400 annually.`,
        steps: [
          {
            label: "STEP 1: PATIENTS WITH GAPS",
            formula: `${formatNumber(data.eligibleEncounters)} × ${inputs.maPercentage || 25}% MA × ${inputs.gapRate || 15}% gap rate = ${formatNumber((inputs.patientsWithGaps as number) || 0)} patients`,
            explanation: "These are patients with conditions you're treating but not fully documenting.",
          },
          {
            label: "STEP 2: CAPTURED CONDITIONS",
            formula: `${formatNumber((inputs.patientsWithGaps as number) || 0)} × ${inputs.captureRate || 70}% capture = ${formatNumber((inputs.capturedHccs as number) || 0)} HCCs`,
            explanation: "Complete notes surface conditions that were previously missed.",
          },
          {
            label: "STEP 3: RAF VALUE",
            formula: `${formatNumber((inputs.capturedHccs as number) || 0)} HCCs × $${inputs.rafValue || 1200} × 40% realization = ${formatCurrency(driver.value)}`,
            explanation: "The 40% realization accounts for RADV audits, payment delays, and rejections.",
          },
        ],
        calibration: "HCC capture represents revenue you've already earned through patient care—you're just not capturing it in documentation.",
      };
    }

    case "denials": {
      return {
        theory: `Claims denied for documentation gaps require expensive rework—when they're appealed at all. Prevention is dramatically more efficient than recovery.\n\n45% of denials stem from documentation issues. 60% of those are preventable with complete notes.`,
        steps: [
          {
            label: "STEP 1: CURRENT DENIALS",
            formula: `${formatNumber(data.eligibleEncounters)} × ${inputs.denialRate || 8}% = ${formatNumber((inputs.totalDenials as number) || 0)} denials`,
            explanation: "Your baseline denial volume.",
          },
          {
            label: "STEP 2: DOCUMENTATION-RELATED",
            formula: `${formatNumber((inputs.totalDenials as number) || 0)} × ${inputs.docRelatedPercent || 50}% = ${formatNumber((inputs.docRelatedDenials as number) || 0)} doc-related`,
            explanation: "These are the denials that better documentation can prevent.",
          },
          {
            label: "STEP 3: PREVENTABLE VALUE",
            formula: `${formatNumber((inputs.writtenOffDenials as number) || 0)} × ${inputs.abridgeCaptureRate || 70}% × $${inputs.avgClaimValue || 350} = ${formatCurrency(driver.value)}`,
            explanation: "Denial prevention is among the most measurable value drivers. You can track before and after with clear attribution.",
          },
        ],
        calibration: "Most organizations write off 40-50% of denials without appeal. Complete documentation prevents the denial from occurring in the first place.",
      };
    }

    default:
      return {
        theory: "This driver represents measurable value from improved documentation efficiency and quality.",
        steps: [
          {
            label: "VALUE CALCULATION",
            formula: `Total: ${formatCurrency(driver.value)}`,
            explanation: "Based on your practice inputs and conservative realization rates.",
          },
        ],
        calibration: "All projections use conservative estimates that account for real-world constraints.",
      };
  }
}

const DriverPage = ({ 
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
  const logic = getDriverLogic(driver, data);
  const isTimeBenefit = ['patientAccess', 'reducingLocums', 'clinicianWellbeing', 'retention', 'workforce'].includes(driver.id);
  const benefitLabel = isTimeBenefit ? "TIME BENEFIT" : "DOCUMENTATION BENEFIT";

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

const InvestmentPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
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
              {data.journey.pilotProviders} providers · {data.journey.pilotUtilization}% utilization
            </Text>
          </View>
          <View style={styles.scaleCard}>
            <Text style={styles.scaleLabel}>Full Scale Potential</Text>
            <Text style={styles.scaleValue}>{formatCurrency(data.journey.fullScaleValue)}/yr</Text>
            <Text style={styles.scaleMeta}>
              {data.journey.fullScaleProviders} providers · {data.journey.fullScaleUtilization}% utilization
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 9, color: brand.textSecondary, lineHeight: 1.5 }}>
          Per-provider economics remain consistent at scale. Operational learning often improves them.
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

const TransparencyPage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
  const realizationRates = [
    { rate: "Access realization", value: "15%", why: "Scheduling friction, demand variability" },
    { rate: "wRVU realization", value: "75%", why: "Payer mix variation" },
    { rate: "HCC realization", value: "40%", why: "Payer validation timing" },
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
              <Text style={styles.inputLabel}>{data.unitNamePlural || "Providers"}</Text>
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
          <Text style={styles.insightLabel}>Methodology Statement</Text>
          <Text style={styles.insightText}>
            We intentionally err conservative. Organizations that execute well beat these projections. We'd rather you be pleasantly surprised than disappointed.
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

const HowToUsePage = ({ data, pageNum, totalPages }: { data: OutpatientPDFData; pageNum: number; totalPages: number }) => {
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
          This analysis is a starting point, not a conclusion. Here's how to make it useful:
        </Text>

        <View style={styles.actionSection}>
          <Text style={styles.actionNumber}>1.</Text>
          <Text style={styles.actionTitle}>Stress Test</Text>
          <Text style={styles.actionText}>
            Challenge the assumptions. If you think 15% realization is too conservative (or too aggressive), change it. The model updates in real-time. Find the inputs that matter most to your context.
          </Text>
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.actionNumber}>2.</Text>
          <Text style={styles.actionTitle}>Scenario Plan</Text>
          <Text style={styles.actionText}>
            Run multiple versions. What if utilization reaches 85%? What if you prioritize retention over access? What if commercial rates apply instead of Medicare? The model handles all of these.
          </Text>
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.actionNumber}>3.</Text>
          <Text style={styles.actionTitle}>Track Outcomes</Text>
          <Text style={styles.actionText}>
            Pick 3 metrics to track post-implementation:{"\n"}
            • Documentation time per encounter (target: -50%){"\n"}
            • Provider satisfaction score (target: +15 pts){"\n"}
            • One financial metric aligned to your allocation
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

const OutpatientPDFDocument = ({ data }: { data: OutpatientPDFData }) => {
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

export async function generateOutpatientROIPDF(data: OutpatientPDFData): Promise<void> {
  const blob = await pdf(<OutpatientPDFDocument data={data} />).toBlob();
  const today = new Date().toISOString().split("T")[0];
  const orgName = data.clientName || data.organizationName || "Organization";
  const careSettingLabel = data.careSetting === "ed" ? "Emergency Department" : 
                           data.careSetting === "nursing" ? "Nursing" :
                           data.careSetting === "inpatient" ? "Inpatient" : "Outpatient";
  const fileName = `${careSettingLabel}_ROI_Model_${orgName.replace(/\s+/g, "_")}_${today}.pdf`;
  
  await savePdfBlob(blob, fileName);
}

export async function generateOutpatientROIPDFBlob(data: OutpatientPDFData): Promise<Blob> {
  return await pdf(<OutpatientPDFDocument data={data} />).toBlob();
}

export { OutpatientPDFDocument };
