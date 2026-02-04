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
  category: "labor" | "quality" | "qualitative";
  inputs: Record<string, number | string>;
  isPotentialValue?: boolean;
}

export interface JourneyData {
  pilotBeds: number;
  pilotEvents: number;
  pilotUtilization: number;
  pilotValue: number;
  fullScaleBeds: number;
  fullScaleUtilization: number;
  fullScaleValue: number;
  scalingPace: string;
  scalingMonths: number;
  networkEffect: number;
}

export interface NursingPDFData {
  clientName?: string;
  preparedBy?: string;
  organizationName?: string;
  careSetting: string;
  unitName: string;
  unitNamePlural: string;

  staffedBeds: number;
  nurseFTEs: number;
  documentationEvents: number;
  eligibleEvents: number;
  utilization: number;
  timeSavedPerEvent: number;
  hoursReturned: number;

  totalValue: number;
  potentialValue: number;
  investment: number;
  netGain: number;
  roi: number;
  costPerBed: number;

  drivers: DriverCalculation[];
  laborTotal: number;
  qualityTotal: number;
  laborPct: number;
  qualityPct: number;

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

const CoverPage = ({ data }: { data: NursingPDFData }) => {
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
          A framework for understanding the economics of ambient nursing documentation
        </Text>

        <View style={styles.coverMetricBlock}>
          <Text style={styles.coverMetricValue}>{formatCurrency(data.netGain)}</Text>
          <Text style={styles.coverMetricLabel}>Projected Net Annual Value</Text>
        </View>
      </View>

      <View style={styles.coverBottom}>
        <Text style={styles.coverMeta}>
          {data.staffedBeds} staffed beds · {data.nurseFTEs} nurse FTEs · {formatNumber(data.documentationEvents)} documentation events · Nursing
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

const ThesisPage = ({ data, pageNum, totalPages }: { data: NursingPDFData; pageNum: number; totalPages: number }) => {
  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const qualityDrivers = data.drivers.filter(d => d.category === "quality" || d.category === "qualitative");

  const laborValue = laborDrivers.reduce((sum, d) => sum + d.value, 0);
  const qualityValue = qualityDrivers.reduce((sum, d) => sum + d.value, 0);

  const strategyInsight = laborValue > qualityValue
    ? "Your model emphasizes staffing efficiency—reducing overtime, optimizing ratios. This is the playbook of organizations managing margin pressure while maintaining safety."
    : "Your model emphasizes care quality—reducing adverse events, improving outcomes. This is the playbook of organizations pursuing excellence in clinical outcomes.";

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
          Most ROI models ask: "How much will you save?" We ask: "If we give nurses time back, what happens to your patients?"
        </Text>
        <Text style={[styles.sectionIntro, { marginTop: -12 }]}>
          The answer reveals your strategy. There are two fundamental ways nursing documentation time creates value:
        </Text>

        <View style={styles.frameworkContainer}>
          <View style={styles.frameworkColumn}>
            <Text style={styles.frameworkLabel}>Staffing Efficiency</Text>
            <Text style={styles.frameworkValue}>{formatCurrency(laborValue)}</Text>
            <Text style={styles.frameworkDescription}>
              Hours returned to direct patient care. Reduced overtime. Optimized nurse-to-patient ratios. Improved retention.
            </Text>
            <Text style={styles.frameworkTagline}>Time at the bedside, not the screen.</Text>
          </View>
          <View style={styles.frameworkColumn}>
            <Text style={styles.frameworkLabel}>Care Quality</Text>
            <Text style={styles.frameworkValue}>{formatCurrency(qualityValue)}</Text>
            <Text style={styles.frameworkDescription}>
              Better documentation, fewer adverse events. Complete handoffs. Reduced falls, pressure injuries, missed medications.
            </Text>
            <Text style={styles.frameworkTagline}>The notes prevent the harm.</Text>
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

function getDriverLogic(driver: DriverCalculation, data: NursingPDFData): DriverLogic {
  const inputs = driver.inputs;
  
  switch (driver.id) {
    case "staffingEfficiency":
    case "overtimeReduction": {
      const overtimeHours = Math.round(data.hoursReturned * 0.15);
      const hourlyRate = (inputs.avgHourlyRate as number) || 45;
      return {
        theory: `Nursing overtime is expensive—1.5x hourly rates, plus burnout, plus quality degradation. Every hour a nurse spends on documentation is an hour that could be spent on direct care.\n\nThe math is direct: reduce documentation burden → reduce overtime → reduce cost. But the real benefit is upstream: nurses who aren't drowning in documentation don't burn out as fast.`,
        steps: [
          {
            label: "STEP 1: TIME CREATED",
            formula: `${formatNumber(data.eligibleEvents)} events × ${data.timeSavedPerEvent} min = ${formatNumber(data.hoursReturned)} hours`,
            explanation: "Raw documentation time returned to clinical work.",
          },
          {
            label: "STEP 2: OVERTIME IMPACT",
            formula: `${formatNumber(data.hoursReturned)} hours × 15% overtime conversion = ${formatNumber(overtimeHours)} OT hours avoided`,
            explanation: "Not all freed time directly reduces overtime—but a meaningful portion does.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `${formatNumber(overtimeHours)} hrs × $${hourlyRate} × 1.5x = ${formatCurrency(driver.value)}`,
            explanation: "Overtime premium avoided, plus downstream retention benefits.",
          },
        ],
        calibration: "We're conservative on overtime conversion because workflow dynamics vary. Organizations with tight staffing may see higher conversion rates.",
      };
    }

    case "nurseRetention": {
      // Get wellbeing allocation from inputs
      const wellbeingPct = (inputs.wellbeingPct as number) || 30;
      const wellbeingHours = (inputs.wellbeingHours as number) || Math.round(data.hoursReturned * (wellbeingPct / 100));
      const hoursPerNurse = (inputs.hoursPerProvider as number) || Math.round(wellbeingHours / data.nurseFTEs);
      const turnoverRate = (inputs.turnoverRate as number) || 18;
      const burnoutAttribution = (inputs.burnoutAttribution as number) || 55;
      const annualDepartures = (inputs.annualDepartures as number) || (data.nurseFTEs * (turnoverRate / 100));
      const burnoutDepartures = (inputs.burnoutDepartures as number) || (annualDepartures * (burnoutAttribution / 100));
      const retentionLift = (inputs.retentionLift as number) || 12;
      const departuresAvoided = (inputs.departuresAvoided as number) || (burnoutDepartures * (retentionLift / 100));
      const replacementCost = (inputs.replacementCost as number) || (inputs.turnoverCost as number) || 56000;
      
      const weeklyMinutes = Math.round(hoursPerNurse * 60 / 52);
      const tier = hoursPerNurse < 30 ? "MINIMAL (3-5% turnover reduction)" 
                 : hoursPerNurse < 60 ? "MODERATE (8-12% reduction)" 
                 : hoursPerNurse < 100 ? "SIGNIFICANT (15-20% reduction)"
                 : "MAXIMUM (25-30% reduction)";
      
      return {
        theory: `Nurse turnover is a crisis—averaging 18% annually with replacement costs of $40K-$75K per nurse. Documentation burden is consistently cited as a top driver of burnout.\n\nThe causal chain is clear: excessive documentation → time away from patients → burnout → turnover → replacement costs. Break the first link, and the chain unravels.`,
        steps: [
          {
            label: "STEP 1: TIME ALLOCATED TO WELLBEING",
            formula: `${formatNumber(data.hoursReturned)} total hours × ${wellbeingPct}% to wellbeing = ${formatNumber(wellbeingHours)} hours`,
            explanation: `Per nurse: ${hoursPerNurse} hours/year (~${weeklyMinutes} minutes back per week). This time goes directly to reducing documentation burden.`,
          },
          {
            label: "STEP 2: IMPACT THRESHOLD",
            formula: `At ${hoursPerNurse} hrs/nurse/year → ${tier}`,
            explanation: "Nursing retention follows a threshold model:\n• < 30 hrs/yr: MINIMAL impact (3-5% lift)\n• 30-60 hrs/yr: MODERATE impact (8-12% lift)\n• 60-100 hrs/yr: SIGNIFICANT impact (15-20% lift)\n• 100+ hrs/yr: MAXIMUM impact (25-30% lift)",
          },
          {
            label: "STEP 3: BASELINE TURNOVER",
            formula: `${data.nurseFTEs} nurses × ${turnoverRate}% turnover = ${annualDepartures.toFixed(1)} departures/year`,
            explanation: `Of these, approximately ${burnoutAttribution}% (${burnoutDepartures.toFixed(1)} departures) are burnout-related and addressable.`,
          },
          {
            label: "STEP 4: RETENTION VALUE",
            formula: `${burnoutDepartures.toFixed(1)} burnout departures × ${retentionLift}% retention lift × $${formatNumber(replacementCost)} = ${formatCurrency(driver.value)}`,
            explanation: `${departuresAvoided.toFixed(2)} departures avoided annually. Nurse replacement includes recruiting, training, preceptor time, and productivity ramp.`,
          },
        ],
        calibration: `Your allocation (${wellbeingPct}% to wellbeing, ${hoursPerNurse} hrs/nurse) produces ${hoursPerNurse < 30 ? "modest but measurable" : hoursPerNurse < 60 ? "moderate" : "significant"} retention impact. ${hoursPerNurse < 30 ? "Units prioritizing retention often allocate 40-50% to wellbeing." : "You're investing meaningfully in workforce sustainability—a key differentiator in today's nursing shortage."}`,
      };
    }

    case "fallPrevention":
    case "adverseEvents": {
      const avgFallCost = (inputs.avgFallCost as number) || 14000;
      return {
        theory: `Falls are expensive—averaging $14K in direct costs, plus liability exposure. Most falls happen when nurses are away from patients. Where are they? Often, documenting.\n\nTime returned to the bedside is time spent on surveillance, ambulation assistance, and early intervention. The documentation-to-presence connection is direct.`,
        steps: [
          {
            label: "STEP 1: TIME AT BEDSIDE",
            formula: `${formatNumber(data.hoursReturned)} hours returned to direct patient care`,
            explanation: "Every hour freed from documentation is an hour available for patient monitoring.",
          },
          {
            label: "STEP 2: FALL REDUCTION",
            formula: `Increased presence → earlier intervention → fewer falls`,
            explanation: "Studies show direct correlation between nursing presence and fall prevention.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `Prevented falls × $${formatNumber(avgFallCost)} cost = ${formatCurrency(driver.value)}`,
            explanation: "Direct cost avoidance plus reduced liability exposure.",
          },
        ],
        calibration: "Fall prevention is conservative. We only count falls directly attributable to improved surveillance time.",
      };
    }

    case "pressureInjuries": {
      const avgInjuryCost = (inputs.avgInjuryCost as number) || 43000;
      return {
        theory: `Hospital-acquired pressure injuries are never events—expensive, preventable, and harmful. Prevention requires regular repositioning, skin assessment, and early intervention.\n\nNurses know what to do. They often lack time to do it. Documentation burden is frequently the culprit.`,
        steps: [
          {
            label: "STEP 1: CARE TIME FREED",
            formula: `${formatNumber(data.hoursReturned)} hours available for preventive care`,
            explanation: "Time for repositioning, skin checks, and early intervention.",
          },
          {
            label: "STEP 2: PREVENTION IMPACT",
            formula: `More prevention time → fewer pressure injuries`,
            explanation: "Literature strongly supports time-on-task correlation with HAPI prevention.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `Prevented injuries × $${formatNumber(avgInjuryCost)} cost = ${formatCurrency(driver.value)}`,
            explanation: "Full cost including treatment, extended stay, and potential liability.",
          },
        ],
        calibration: "Conservative estimate. Some organizations see 30-50% reduction in HAPIs with improved care time.",
      };
    }

    case "handoffQuality": {
      return {
        theory: `Handoffs are high-risk moments. Information lost in transition creates safety gaps. Complete, timely documentation means complete handoffs.\n\nAmbient documentation captures the clinical story in real-time—no details forgotten, no context lost. The receiving nurse gets the full picture.`,
        steps: [
          {
            label: "STEP 1: DOCUMENTATION COMPLETENESS",
            formula: `Real-time capture → comprehensive clinical narrative`,
            explanation: "Every intervention, every observation, every patient response documented at point of care.",
          },
          {
            label: "STEP 2: HANDOFF IMPROVEMENT",
            formula: `Complete notes → complete verbal handoffs → fewer gaps`,
            explanation: "Structured handoff quality improves when supporting documentation is complete.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `Prevented errors/adverse events = ${formatCurrency(driver.value)}`,
            explanation: "Value from avoided errors attributable to improved handoff quality.",
          },
        ],
        calibration: "Handoff quality is harder to isolate than other drivers. We use conservative attribution.",
      };
    }

    default: {
      return {
        theory: `This value driver represents operational improvements from ambient nursing documentation. The logic follows the pattern of time savings creating capacity for direct patient care, which converts to measurable value.`,
        steps: [
          {
            label: "STEP 1: EFFICIENCY GAIN",
            formula: `Documentation improvement → time returned to care`,
            explanation: "Every minute saved on documentation is a minute available for patients.",
          },
          {
            label: "STEP 2: VALUE CONVERSION",
            formula: `Care time × opportunity = value`,
            explanation: "Time at the bedside converts to improved outcomes and reduced costs.",
          },
          {
            label: "STEP 3: VALUE REALIZED",
            formula: `Annual value = ${formatCurrency(driver.value)}`,
            explanation: "Conservative estimate with realization adjustments.",
          },
        ],
        calibration: "Estimates are conservative to account for implementation variability across units and shifts.",
      };
    }
  }
}

const DriverPage = ({ driver, data, pageNum, totalPages }: { driver: DriverCalculation; data: NursingPDFData; pageNum: number; totalPages: number }) => {
  const logic = getDriverLogic(driver, data);
  const benefitLabel = driver.category === "labor" ? "STAFFING" : "CARE QUALITY";

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

const InvestmentPage = ({ data, pageNum, totalPages }: { data: NursingPDFData; pageNum: number; totalPages: number }) => {
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
          The right frame: ambient documentation is infrastructure for nursing excellence. It creates capacity that compounds.
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
            Notice the asymmetry: investment stays flat while value grows. This is the signature of infrastructure—fixed cost, scaling returns. By Year 3, you're generating ${year3ROI} for every $1 invested. That's not a line item to be cut in a downturn. It's a competitive advantage in the nursing labor market.
          </Text>
        </View>

        <View style={styles.scaleContainer}>
          <View style={styles.scaleCard}>
            <Text style={styles.scaleLabel}>Current Model</Text>
            <Text style={styles.scaleValue}>{formatCurrency(data.journey.pilotValue)}/yr</Text>
            <Text style={styles.scaleMeta}>
              {data.journey.pilotBeds} beds · {data.journey.pilotUtilization}% utilization
            </Text>
          </View>
          <View style={styles.scaleCard}>
            <Text style={styles.scaleLabel}>Full Scale Potential</Text>
            <Text style={styles.scaleValue}>{formatCurrency(data.journey.fullScaleValue)}/yr</Text>
            <Text style={styles.scaleMeta}>
              {data.journey.fullScaleBeds} beds · {data.journey.fullScaleUtilization}% utilization
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 9, color: brand.textSecondary, lineHeight: 1.5 }}>
          Per-bed economics remain consistent at scale. Adoption maturity often improves them.
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

const TransparencyPage = ({ data, pageNum, totalPages }: { data: NursingPDFData; pageNum: number; totalPages: number }) => {
  const realizationRates = [
    { rate: "Overtime conversion", value: "15%", why: "Workflow dynamics vary by unit" },
    { rate: "Fall prevention impact", value: "10%", why: "Multi-factorial event causation" },
    { rate: "HAPI reduction", value: "12%", why: "Conservative attribution to time freed" },
    { rate: "Retention impact", value: "5%", why: "Burnout has multiple drivers" },
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
              <Text style={styles.inputLabel}>Staffed Beds</Text>
              <Text style={styles.inputValue}>{data.staffedBeds}</Text>
            </View>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Nurse FTEs</Text>
              <Text style={styles.inputValue}>{data.nurseFTEs}</Text>
            </View>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Doc Events</Text>
              <Text style={styles.inputValue}>{formatNumber(data.documentationEvents)}</Text>
            </View>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Utilization</Text>
              <Text style={styles.inputValue}>{data.utilization}%</Text>
            </View>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Time Saved</Text>
              <Text style={styles.inputValue}>{data.timeSavedPerEvent} min</Text>
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
            Our philosophy: conservative inputs, transparent logic. We'd rather you be pleasantly surprised than disappointed. These realization rates are based on observed nursing implementations, not theoretical maximums.
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

const HowToUsePage = ({ data, pageNum, totalPages }: { data: NursingPDFData; pageNum: number; totalPages: number }) => {
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
            What if adoption is slower than projected? What if time savings are more modest? Run scenarios. The value of this model is in its flexibility, not its point estimate.
          </Text>
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.actionNumber}>2.</Text>
          <Text style={styles.actionTitle}>Scenario Plan</Text>
          <Text style={styles.actionText}>
            Map the pilots and rollouts. Which units first? Which shifts are most likely to benefit? Build the sequencing logic before the implementation plan.
          </Text>
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.actionNumber}>3.</Text>
          <Text style={styles.actionTitle}>Track Outcomes</Text>
          <Text style={styles.actionText}>
            Pick 3 metrics to track post-implementation:{"\n"}
            • Documentation time per event (target: -40%){"\n"}
            • Nurse satisfaction scores (target: +10 pts){"\n"}
            • One quality metric aligned to your value drivers (falls, HAPIs, etc.)
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

const NursingPDFDocument = ({ data }: { data: NursingPDFData }) => {
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

export async function generateNursingROIPDF(data: NursingPDFData): Promise<void> {
  const blob = await pdf(<NursingPDFDocument data={data} />).toBlob();
  const today = new Date().toISOString().split("T")[0];
  const orgName = data.clientName || data.organizationName || "Organization";
  const fileName = `Nursing_ROI_Model_${orgName.replace(/\s+/g, "_")}_${today}.pdf`;
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile && navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Nursing ROI Model',
          text: `Abridge Nursing ROI Assessment for ${orgName}`,
        });
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        }
        return;
      }
    }
  }
  
  if (isMobile) {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } else {
    saveAs(blob, fileName);
  }
}

export async function generateNursingROIPDFBlob(data: NursingPDFData): Promise<Blob> {
  return await pdf(<NursingPDFDocument data={data} />).toBlob();
}

export { NursingPDFDocument };
