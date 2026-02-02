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
// PREMIUM DESIGN SYSTEM - BLOOMBERG/PENTAGRAM QUALITY
// ============================================================================

const brand = {
  white: "#FFFFFF",
  primaryText: "#1A1A1A",
  secondaryText: "#6B7280",
  coral: "#E85A4F",
  borderLight: "#E5E7EB",
  bgSubtle: "#F9FAFB",
  bgAccent: "#FFF5F2",
};

const styles = StyleSheet.create({
  // ==========================================
  // PAGE BASE
  // ==========================================
  page: {
    backgroundColor: brand.white,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: brand.primaryText,
  },

  // ==========================================
  // COVER PAGE - CLEAN & ELEGANT
  // ==========================================
  coverPage: {
    padding: 60,
    height: "100%",
    justifyContent: "space-between",
  },
  coverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  coverLogo: {
    width: 100,
    height: 20,
  },
  coverDate: {
    fontSize: 11,
    color: brand.secondaryText,
  },
  coverHero: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 80,
  },
  coverLabel: {
    fontSize: 12,
    color: brand.coral,
    textTransform: "uppercase",
    letterSpacing: 3,
    marginBottom: 16,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: brand.primaryText,
    marginBottom: 48,
    lineHeight: 1.1,
  },
  coverDivider: {
    borderTopWidth: 1,
    borderTopColor: brand.borderLight,
    paddingTop: 32,
    marginBottom: 32,
  },
  coverMetrics: {
    flexDirection: "row",
    gap: 60,
  },
  coverMetric: {
    alignItems: "flex-start",
  },
  coverMetricValue: {
    fontSize: 42,
    fontWeight: "bold",
    color: brand.coral,
    marginBottom: 6,
  },
  coverMetricValueDark: {
    fontSize: 42,
    fontWeight: "bold",
    color: brand.primaryText,
    marginBottom: 6,
  },
  coverMetricLabel: {
    fontSize: 10,
    color: brand.secondaryText,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  coverFooter: {
    borderTopWidth: 1,
    borderTopColor: brand.borderLight,
    paddingTop: 24,
  },
  coverContext: {
    fontSize: 11,
    color: brand.secondaryText,
    marginBottom: 24,
  },
  coverPrepared: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coverPreparedItem: {
    fontSize: 10,
    color: brand.secondaryText,
  },

  // ==========================================
  // CONTENT PAGES
  // ==========================================
  contentPage: {
    padding: 0,
    backgroundColor: brand.white,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 60,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
  },
  headerLogo: {
    width: 70,
    height: 14,
  },
  headerTitle: {
    fontSize: 10,
    color: brand.secondaryText,
  },
  content: {
    padding: 60,
    paddingTop: 40,
  },
  
  // Section labels
  sectionLabel: {
    fontSize: 12,
    color: brand.coral,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: brand.primaryText,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: brand.secondaryText,
    lineHeight: 1.6,
    marginBottom: 32,
    maxWidth: 420,
  },

  // ==========================================
  // VALUE FRAMEWORK CARDS
  // ==========================================
  twoColumn: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 32,
  },
  valueCard: {
    flex: 1,
    backgroundColor: brand.bgSubtle,
    padding: 24,
    borderRadius: 4,
  },
  valueCardAccent: {
    flex: 1,
    backgroundColor: brand.bgAccent,
    padding: 24,
    borderRadius: 4,
  },
  valueCardLabel: {
    fontSize: 10,
    color: brand.secondaryText,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  valueCardAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: brand.coral,
    marginBottom: 12,
  },
  valueCardText: {
    fontSize: 11,
    color: brand.secondaryText,
    lineHeight: 1.5,
  },

  // ==========================================
  // ALLOCATION ROWS
  // ==========================================
  divider: {
    borderTopWidth: 1,
    borderTopColor: brand.borderLight,
    marginVertical: 24,
  },
  allocationSection: {
    marginBottom: 32,
  },
  allocationTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: brand.primaryText,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  allocationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
  },
  allocationLabel: {
    fontSize: 11,
    color: brand.primaryText,
    flex: 1,
  },
  allocationPct: {
    fontSize: 11,
    color: brand.secondaryText,
    width: 60,
    textAlign: "center",
  },
  allocationValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: brand.coral,
    width: 100,
    textAlign: "right",
  },
  allocationValueQual: {
    fontSize: 11,
    fontStyle: "italic",
    color: brand.secondaryText,
    width: 100,
    textAlign: "right",
  },

  // ==========================================
  // TIME SAVINGS PAGE
  // ==========================================
  heroNumber: {
    fontSize: 48,
    fontWeight: "bold",
    color: brand.coral,
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 14,
    color: brand.secondaryText,
    marginBottom: 8,
  },
  heroContext: {
    fontSize: 12,
    color: brand.secondaryText,
    marginBottom: 32,
  },

  // ==========================================
  // CALCULATION BOXES
  // ==========================================
  calcCard: {
    backgroundColor: brand.bgSubtle,
    padding: 20,
    marginBottom: 24,
    borderRadius: 4,
  },
  calcCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calcCardTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: brand.primaryText,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  calcCardValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: brand.coral,
  },
  calcCardSubtitle: {
    fontSize: 10,
    color: brand.secondaryText,
    marginBottom: 16,
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  calcLabel: {
    fontSize: 10,
    color: brand.secondaryText,
    flex: 1,
  },
  calcValue: {
    fontSize: 10,
    color: brand.primaryText,
    textAlign: "right",
    minWidth: 80,
  },
  calcValueBold: {
    fontSize: 10,
    fontWeight: "bold",
    color: brand.primaryText,
    textAlign: "right",
    minWidth: 80,
  },
  calcNote: {
    fontSize: 9,
    color: brand.secondaryText,
    fontStyle: "italic",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: brand.borderLight,
  },

  // ==========================================
  // QUALITATIVE SECTION
  // ==========================================
  qualSection: {
    marginBottom: 24,
  },
  qualHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  qualTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: brand.primaryText,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  qualBadge: {
    fontSize: 10,
    color: brand.secondaryText,
    fontStyle: "italic",
  },
  qualSubtitle: {
    fontSize: 10,
    color: brand.secondaryText,
    marginBottom: 12,
  },
  qualText: {
    fontSize: 11,
    color: brand.primaryText,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  qualTrack: {
    fontSize: 10,
    color: brand.secondaryText,
    fontStyle: "italic",
  },

  // ==========================================
  // INVESTMENT TABLE
  // ==========================================
  table: {
    marginBottom: 32,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.bgSubtle,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: brand.borderLight,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: "bold",
    color: brand.primaryText,
    textAlign: "center",
  },
  tableHeaderCellFirst: {
    flex: 1,
    fontSize: 10,
    fontWeight: "bold",
    color: brand.primaryText,
    textAlign: "left",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
  },
  tableCell: {
    flex: 1,
    fontSize: 11,
    color: brand.primaryText,
    textAlign: "center",
  },
  tableCellFirst: {
    flex: 1,
    fontSize: 11,
    color: brand.primaryText,
    textAlign: "left",
  },
  tableCellBold: {
    flex: 1,
    fontSize: 11,
    fontWeight: "bold",
    color: brand.coral,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: brand.coral,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: brand.secondaryText,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // ==========================================
  // INVESTMENT DETAILS
  // ==========================================
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 32,
  },
  detailItem: {
    width: "45%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
  },
  detailLabel: {
    fontSize: 10,
    color: brand.secondaryText,
  },
  detailValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: brand.primaryText,
  },

  // ==========================================
  // ASSUMPTIONS PAGE
  // ==========================================
  assumptionSection: {
    marginBottom: 28,
  },
  assumptionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: brand.primaryText,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderLight,
  },
  assumptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  assumptionLabel: {
    fontSize: 10,
    color: brand.secondaryText,
  },
  assumptionValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: brand.primaryText,
  },

  // ==========================================
  // METHODOLOGY PAGE
  // ==========================================
  methodologyText: {
    fontSize: 11,
    color: brand.primaryText,
    lineHeight: 1.7,
    marginBottom: 24,
  },
  nextStepsSection: {
    marginBottom: 24,
  },
  nextStepsTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: brand.primaryText,
    marginBottom: 8,
  },
  nextStepsList: {
    paddingLeft: 16,
  },
  nextStepsItem: {
    fontSize: 10,
    color: brand.secondaryText,
    marginBottom: 4,
    lineHeight: 1.5,
  },

  // ==========================================
  // QUOTE BOX
  // ==========================================
  quoteBox: {
    backgroundColor: brand.bgSubtle,
    padding: 24,
    marginTop: 32,
    borderLeftWidth: 4,
    borderLeftColor: brand.coral,
  },
  quoteText: {
    fontSize: 12,
    color: brand.primaryText,
    fontStyle: "italic",
    lineHeight: 1.6,
  },

  // ==========================================
  // FOOTER
  // ==========================================
  footer: {
    position: "absolute",
    bottom: 24,
    left: 60,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 9,
    color: brand.secondaryText,
  },
  footerLogo: {
    width: 50,
    height: 10,
  },
});

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (value === 0) return "$0";
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value).toLocaleString()}`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

const formatCurrencyK = (value: number): string => {
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
};

const formatNumber = (value: number): string => Math.round(value).toLocaleString();

const formatDate = (): string => {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// ============================================================================
// PAGE COMPONENTS
// ============================================================================

function CoverPage({ data }: { data: OutpatientPDFData }) {
  const orgName = data.organizationName || data.clientName || "Your Organization";
  
  return (
    <Page size="LETTER" style={styles.coverPage}>
      {/* Header */}
      <View style={styles.coverHeader}>
        <Image src={abridgeLogoPath} style={styles.coverLogo} />
        <Text style={styles.coverDate}>{formatDate()}</Text>
      </View>

      {/* Hero */}
      <View style={styles.coverHero}>
        <Text style={styles.coverLabel}>VALUE ASSESSMENT</Text>
        <Text style={styles.coverTitle}>{orgName}</Text>
        
        {/* Metrics */}
        <View style={styles.coverDivider}>
          <View style={styles.coverMetrics}>
            <View style={styles.coverMetric}>
              <Text style={styles.coverMetricValue}>{formatCurrency(data.netGain)}</Text>
              <Text style={styles.coverMetricLabel}>Net Annual Value</Text>
            </View>
            <View style={styles.coverMetric}>
              <Text style={styles.coverMetricValueDark}>{data.roi.toFixed(1)}×</Text>
              <Text style={styles.coverMetricLabel}>ROI</Text>
            </View>
            <View style={styles.coverMetric}>
              <Text style={styles.coverMetricValueDark}>{formatNumber(data.hoursReturned)}</Text>
              <Text style={styles.coverMetricLabel}>Hours Returned</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.coverFooter}>
        <Text style={styles.coverContext}>
          {data.careSetting} • {formatNumber(data.providers)} providers • {formatNumber(data.eligibleEncounters)} encounters
        </Text>
        <View style={styles.coverPrepared}>
          {data.contactName && (
            <Text style={styles.coverPreparedItem}>Prepared for: {data.contactName}</Text>
          )}
          <Text style={styles.coverPreparedItem}>Prepared by: Abridge</Text>
        </View>
      </View>
    </Page>
  );
}

function PageHeader({ title }: { title: string }) {
  return (
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function PageFooter({ pageNumber }: { pageNumber: number }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Confidential</Text>
      <Text style={styles.footerText}>Page {pageNumber}</Text>
    </View>
  );
}

function ExecutiveSummaryPage({ data }: { data: OutpatientPDFData }) {
  const timeSavingsTotal = data.laborTotal;
  const docQualityTotal = data.revenueTotal;
  
  const timeAlloc = data.timeAllocation || { patientAccess: 40, patientExperience: 30, clinicianWellbeing: 30 };
  const timeVals = data.timeValues || { patientAccess: 0, patientExperience: "Qualitative", clinicianWellbeing: 0 };
  
  return (
    <Page size="LETTER" style={[styles.page, styles.contentPage]}>
      <PageHeader title={`${data.careSetting} Value Assessment`} />
      
      <View style={styles.content}>
        <Text style={styles.sectionLabel}>EXECUTIVE SUMMARY</Text>
        <Text style={styles.sectionTitle}>The Value Framework</Text>
        <Text style={styles.sectionSubtitle} wrap>
          Ambient AI documentation creates value through two distinct mechanisms—each with its own drivers and assumptions.
        </Text>

        {/* Two cards */}
        <View style={styles.twoColumn}>
          <View style={styles.valueCard}>
            <Text style={styles.valueCardLabel}>TIME SAVINGS</Text>
            <Text style={styles.valueCardAmount}>{formatCurrency(timeSavingsTotal)}</Text>
            <Text style={styles.valueCardText} wrap>
              When clinicians document faster, they choose how to use that time.
            </Text>
          </View>
          <View style={styles.valueCardAccent}>
            <Text style={styles.valueCardLabel}>DOCUMENTATION QUALITY</Text>
            <Text style={styles.valueCardAmount}>{formatCurrency(docQualityTotal)}</Text>
            <Text style={styles.valueCardText} wrap>
              Better notes capture complexity that's already being delivered.
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Time Allocation */}
        <View style={styles.allocationSection}>
          <Text style={styles.allocationTitle}>YOUR TIME ALLOCATION</Text>
          <View style={styles.allocationRow}>
            <Text style={styles.allocationLabel}>Patient Access</Text>
            <Text style={styles.allocationPct}>{timeAlloc.patientAccess}%</Text>
            <Text style={styles.allocationValue}>{formatCurrency(timeVals.patientAccess as number)}</Text>
          </View>
          <View style={styles.allocationRow}>
            <Text style={styles.allocationLabel}>Patient Experience</Text>
            <Text style={styles.allocationPct}>{timeAlloc.patientExperience}%</Text>
            <Text style={styles.allocationValueQual}>Qualitative</Text>
          </View>
          <View style={styles.allocationRow}>
            <Text style={styles.allocationLabel}>Clinician Wellbeing</Text>
            <Text style={styles.allocationPct}>{timeAlloc.clinicianWellbeing}%</Text>
            <Text style={styles.allocationValue}>{formatCurrency(timeVals.clinicianWellbeing as number)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Documentation Drivers */}
        <View style={styles.allocationSection}>
          <Text style={styles.allocationTitle}>YOUR DOCUMENTATION DRIVERS</Text>
          {data.drivers.filter(d => d.category === "revenue").map((driver, idx) => (
            <View key={idx} style={styles.allocationRow}>
              <Text style={styles.allocationLabel}>{driver.name}</Text>
              <Text style={styles.allocationValue}>{formatCurrency(driver.value)}</Text>
            </View>
          ))}
          {data.drivers.filter(d => d.category === "revenue").length === 0 && (
            <View style={styles.allocationRow}>
              <Text style={styles.allocationLabel}>No documentation drivers selected</Text>
              <Text style={styles.allocationValueQual}>—</Text>
            </View>
          )}
        </View>
      </View>

      <PageFooter pageNumber={2} />
    </Page>
  );
}

function TimeSavingsPage({ data }: { data: OutpatientPDFData }) {
  const hoursPerProvider = Math.round(data.hoursReturned / data.providers);
  const hoursPerWeek = (hoursPerProvider / 50).toFixed(1);
  
  const timeAlloc = data.timeAllocation || { patientAccess: 40, patientExperience: 30, clinicianWellbeing: 30 };
  const timeVals = data.timeValues || { patientAccess: 0, patientExperience: "Qualitative", clinicianWellbeing: 0 };
  
  const patientAccessHours = Math.round(data.hoursReturned * (timeAlloc.patientAccess / 100));
  const patientExpHours = Math.round(data.hoursReturned * (timeAlloc.patientExperience / 100));
  const wellbeingHours = Math.round(data.hoursReturned * (timeAlloc.clinicianWellbeing / 100));
  
  const visitDuration = 30;
  const potentialVisits = Math.round((patientAccessHours * 60) / visitDuration);
  const realizationRate = 15;
  const realizedVisits = Math.round(potentialVisits * (realizationRate / 100));
  const revenuePerVisit = 200;
  
  return (
    <Page size="LETTER" style={[styles.page, styles.contentPage]}>
      <PageHeader title={`${data.careSetting} Value Assessment`} />
      
      <View style={styles.content}>
        <Text style={styles.sectionLabel}>TIME SAVINGS</Text>
        
        <Text style={styles.heroNumber}>{formatNumber(data.hoursReturned)} hours</Text>
        <Text style={styles.heroLabel}>returned to your clinicians</Text>
        <Text style={styles.heroContext}>
          That's {hoursPerProvider} hours per provider per year—or {hoursPerWeek} hours per week back.
        </Text>

        <View style={styles.divider} />

        {/* Patient Access */}
        <View style={styles.calcCard}>
          <View style={styles.calcCardHeader}>
            <Text style={styles.calcCardTitle}>PATIENT ACCESS</Text>
            <Text style={styles.calcCardValue}>{formatCurrency(timeVals.patientAccess as number)}</Text>
          </View>
          <Text style={styles.calcCardSubtitle}>{timeAlloc.patientAccess}% of time allocated</Text>
          
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Hours allocated</Text>
            <Text style={styles.calcValue}>{formatNumber(patientAccessHours)} hrs</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>÷ Avg visit length</Text>
            <Text style={styles.calcValue}>{visitDuration} min</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>= Potential visits</Text>
            <Text style={styles.calcValue}>{formatNumber(potentialVisits)}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>× Realization rate</Text>
            <Text style={styles.calcValue}>{realizationRate}%</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>= Realized visits</Text>
            <Text style={styles.calcValue}>{formatNumber(realizedVisits)}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>× Revenue per visit</Text>
            <Text style={styles.calcValue}>${revenuePerVisit}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>= Annual value</Text>
            <Text style={styles.calcValueBold}>{formatCurrency(timeVals.patientAccess as number)}</Text>
          </View>
          <Text style={styles.calcNote} wrap>
            Scheduling constraints, demand variability mean not all time converts to visits.
          </Text>
        </View>

        {/* Patient Experience */}
        <View style={styles.qualSection}>
          <View style={styles.qualHeader}>
            <Text style={styles.qualTitle}>PATIENT EXPERIENCE</Text>
            <Text style={styles.qualBadge}>Qualitative</Text>
          </View>
          <Text style={styles.qualSubtitle}>{timeAlloc.patientExperience}% of time allocated</Text>
          <Text style={styles.qualText} wrap>
            {formatNumber(patientExpHours)} hours invested in deeper conversations, better education, and stronger relationships.
          </Text>
          <Text style={styles.qualTrack}>
            Track: Patient satisfaction, repeat visit rates, referral patterns.
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Clinician Wellbeing */}
        <View style={styles.calcCard}>
          <View style={styles.calcCardHeader}>
            <Text style={styles.calcCardTitle}>CLINICIAN WELLBEING</Text>
            <Text style={styles.calcCardValue}>{formatCurrency(timeVals.clinicianWellbeing as number)}</Text>
          </View>
          <Text style={styles.calcCardSubtitle}>
            {timeAlloc.clinicianWellbeing}% of time allocated • {data.wellbeingThreshold || "MINIMAL"} threshold
          </Text>
          
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Hours per provider per year</Text>
            <Text style={styles.calcValue}>{Math.round(wellbeingHours / data.providers)} hrs</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Providers</Text>
            <Text style={styles.calcValue}>{formatNumber(data.providers)}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>× Annual turnover rate</Text>
            <Text style={styles.calcValue}>8%</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>× Retention lift</Text>
            <Text style={styles.calcValue}>5%</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>× Replacement cost</Text>
            <Text style={styles.calcValue}>$250,000</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>= Annual value</Text>
            <Text style={styles.calcValueBold}>{formatCurrency(timeVals.clinicianWellbeing as number)}</Text>
          </View>
        </View>
      </View>

      <PageFooter pageNumber={3} />
    </Page>
  );
}

function DocumentationQualityPage({ data }: { data: OutpatientPDFData }) {
  const revenueDrivers = data.drivers.filter(d => d.category === "revenue");
  
  if (revenueDrivers.length === 0) return null;
  
  return (
    <Page size="LETTER" style={[styles.page, styles.contentPage]}>
      <PageHeader title={`${data.careSetting} Value Assessment`} />
      
      <View style={styles.content}>
        <Text style={styles.sectionLabel}>DOCUMENTATION QUALITY</Text>
        
        <Text style={styles.heroNumber}>{formatCurrency(data.revenueTotal)}</Text>
        <Text style={styles.heroLabel}>from capturing what's already happening</Text>
        <Text style={styles.heroContext} wrap>
          Better documentation doesn't mean doing more—it means accurately reflecting the work you're already doing.
        </Text>

        <View style={styles.divider} />

        {revenueDrivers.map((driver, idx) => {
          if (driver.id === "wrvu") {
            const inputs = driver.inputs;
            return (
              <View key={idx} style={styles.calcCard}>
                <View style={styles.calcCardHeader}>
                  <Text style={styles.calcCardTitle}>LEVEL OF SERVICE (wRVU)</Text>
                  <Text style={styles.calcCardValue}>{formatCurrency(driver.value)}</Text>
                </View>
                
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Eligible encounters</Text>
                  <Text style={styles.calcValue}>{formatNumber(data.eligibleEncounters)}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>× Current avg wRVU/visit</Text>
                  <Text style={styles.calcValue}>{inputs.avgWrvuPerEncounter || 1.5} wRVU</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>= Baseline wRVUs</Text>
                  <Text style={styles.calcValue}>{formatNumber((inputs.baselineWrvus as number) || 0)}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>× Documentation improvement</Text>
                  <Text style={styles.calcValue}>{inputs.wrvuImprovementRate || 2}%</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>= Total additional wRVUs</Text>
                  <Text style={styles.calcValue}>{formatNumber((inputs.wrvuGain as number) || 0)}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>× Conversion rate (Medicare)</Text>
                  <Text style={styles.calcValue}>${inputs.conversionFactor || 33}/wRVU</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>× Realization rate</Text>
                  <Text style={styles.calcValue}>{inputs.realizationRate || 75}%</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>= Net annual value</Text>
                  <Text style={styles.calcValueBold}>{formatCurrency(driver.value)}</Text>
                </View>
                <Text style={styles.calcNote} wrap>
                  We use Medicare conversion rates ($33/wRVU) as a conservative baseline. Commercial rates ($45-65) would yield higher results.
                </Text>
              </View>
            );
          }
          
          return (
            <View key={idx} style={styles.calcCard}>
              <View style={styles.calcCardHeader}>
                <Text style={styles.calcCardTitle}>{driver.name.toUpperCase()}</Text>
                <Text style={styles.calcCardValue}>{formatCurrency(driver.value)}</Text>
              </View>
              <Text style={styles.calcNote}>
                See detailed methodology in assumptions section.
              </Text>
            </View>
          );
        })}
      </View>

      <PageFooter pageNumber={4} />
    </Page>
  );
}

function InvestmentPage({ data }: { data: OutpatientPDFData }) {
  return (
    <Page size="LETTER" style={[styles.page, styles.contentPage]}>
      <PageHeader title={`${data.careSetting} Value Assessment`} />
      
      <View style={styles.content}>
        <Text style={styles.sectionLabel}>INVESTMENT & RETURN</Text>
        <Text style={styles.sectionTitle}>Your ROI Model</Text>

        {/* 3-Year Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCellFirst}></Text>
            <Text style={styles.tableHeaderCell}>Year 1</Text>
            <Text style={styles.tableHeaderCell}>Year 2</Text>
            <Text style={styles.tableHeaderCell}>Year 3</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellFirst}>Value</Text>
            <Text style={styles.tableCell}>{formatCurrencyK(data.year1Value)}</Text>
            <Text style={styles.tableCell}>{formatCurrencyK(data.year2Value)}</Text>
            <Text style={styles.tableCell}>{formatCurrencyK(data.year3Value)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellFirst}>Investment</Text>
            <Text style={styles.tableCell}>{formatCurrencyK(data.year1Cost)}</Text>
            <Text style={styles.tableCell}>{formatCurrencyK(data.year2Cost)}</Text>
            <Text style={styles.tableCell}>{formatCurrencyK(data.year3Cost)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellFirst}>Net Value</Text>
            <Text style={styles.tableCellBold}>{formatCurrencyK(data.year1Value - data.year1Cost)}</Text>
            <Text style={styles.tableCellBold}>{formatCurrencyK(data.year2Value - data.year2Cost)}</Text>
            <Text style={styles.tableCellBold}>{formatCurrencyK(data.year3Value - data.year3Cost)}</Text>
          </View>
        </View>

        {/* Summary Metrics */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatCurrency(data.threeYearNet)}</Text>
            <Text style={styles.summaryLabel}>3-Year Net Value</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{data.roi.toFixed(1)}×</Text>
            <Text style={styles.summaryLabel}>ROI</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Investment Details */}
        <Text style={styles.allocationTitle}>INVESTMENT DETAILS</Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Pricing model</Text>
            <Text style={styles.detailValue}>Per provider / month</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Cost per provider</Text>
            <Text style={styles.detailValue}>${data.costPerProvider}/mo</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Providers in scope</Text>
            <Text style={styles.detailValue}>{formatNumber(data.providers)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Annual investment</Text>
            <Text style={styles.detailValue}>{formatCurrency(data.investment)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Expansion */}
        <Text style={styles.allocationTitle}>THE EXPANSION OPPORTUNITY</Text>
        <Text style={styles.methodologyText} wrap>
          Your per-provider economics (${formatNumber(Math.round(data.netGain / data.providers))}/year) tend to remain consistent at scale. A full deployment to {formatNumber(data.journey.fullScaleProviders)} providers at {data.journey.fullScaleUtilization}% utilization projects to {formatCurrency(data.journey.fullScaleValue)} annual value.
        </Text>
      </View>

      <PageFooter pageNumber={5} />
    </Page>
  );
}

function AssumptionsPage({ data }: { data: OutpatientPDFData }) {
  const timeAlloc = data.timeAllocation || { patientAccess: 40, patientExperience: 30, clinicianWellbeing: 30 };
  
  return (
    <Page size="LETTER" style={[styles.page, styles.contentPage]}>
      <PageHeader title={`${data.careSetting} Value Assessment`} />
      
      <View style={styles.content}>
        <Text style={styles.sectionLabel}>YOUR ASSUMPTIONS</Text>
        <Text style={styles.sectionSubtitle} wrap>
          Every number traces back to an input you control.
        </Text>

        {/* Practice Baseline */}
        <View style={styles.assumptionSection}>
          <Text style={styles.assumptionTitle}>PRACTICE BASELINE</Text>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Providers</Text>
            <Text style={styles.assumptionValue}>{formatNumber(data.providers)}</Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Annual encounters</Text>
            <Text style={styles.assumptionValue}>{formatNumber(data.encounters)}</Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Encounters per provider</Text>
            <Text style={styles.assumptionValue}>{formatNumber(Math.round(data.encounters / data.providers))}</Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Abridge utilization</Text>
            <Text style={styles.assumptionValue}>{data.utilization}%</Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Eligible encounters</Text>
            <Text style={styles.assumptionValue}>{formatNumber(data.eligibleEncounters)}</Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Time saved per encounter</Text>
            <Text style={styles.assumptionValue}>{data.timeSavedPerEncounter} min</Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Total hours saved</Text>
            <Text style={styles.assumptionValue}>{formatNumber(data.hoursReturned)}</Text>
          </View>
        </View>

        {/* Time Allocation */}
        <View style={styles.assumptionSection}>
          <Text style={styles.assumptionTitle}>TIME ALLOCATION</Text>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Patient Access</Text>
            <Text style={styles.assumptionValue}>{timeAlloc.patientAccess}%</Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Patient Experience</Text>
            <Text style={styles.assumptionValue}>{timeAlloc.patientExperience}%</Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Clinician Wellbeing</Text>
            <Text style={styles.assumptionValue}>{timeAlloc.clinicianWellbeing}%</Text>
          </View>
        </View>

        {/* Realization Rates */}
        <View style={styles.assumptionSection}>
          <Text style={styles.assumptionTitle}>REALIZATION RATES</Text>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Patient access realization</Text>
            <Text style={styles.assumptionValue}>15%</Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>wRVU realization (payer mix)</Text>
            <Text style={styles.assumptionValue}>75%</Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Retention improvement rate</Text>
            <Text style={styles.assumptionValue}>3-5%</Text>
          </View>
        </View>

        <View style={styles.quoteBox}>
          <Text style={styles.quoteText} wrap>
            "We intentionally use conservative assumptions. Organizations that execute well typically outperform these projections."
          </Text>
        </View>
      </View>

      <PageFooter pageNumber={6} />
    </Page>
  );
}

function MethodologyPage({ data }: { data: OutpatientPDFData }) {
  return (
    <Page size="LETTER" style={[styles.page, styles.contentPage]}>
      <PageHeader title={`${data.careSetting} Value Assessment`} />
      
      <View style={styles.content}>
        <Text style={styles.sectionLabel}>METHODOLOGY</Text>
        <Text style={styles.sectionTitle}>How We Built This Model</Text>
        
        <Text style={styles.methodologyText} wrap>
          This model prioritizes transparency over precision. We use conservative assumptions, show our work step-by-step, and make every input adjustable.
        </Text>
        <Text style={styles.methodologyText} wrap>
          The goal isn't to prove a predetermined outcome—it's to give you a defensible framework for thinking about value that you can stress-test and adapt.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.allocationTitle}>WHAT'S NEXT</Text>

        <View style={styles.nextStepsSection}>
          <Text style={styles.nextStepsTitle}>Validate</Text>
          <View style={styles.nextStepsList}>
            <Text style={styles.nextStepsItem}>• Review assumptions with your finance team</Text>
            <Text style={styles.nextStepsItem}>• Compare baseline metrics to your actual data</Text>
            <Text style={styles.nextStepsItem}>• Adjust realization rates based on your context</Text>
          </View>
        </View>

        <View style={styles.nextStepsSection}>
          <Text style={styles.nextStepsTitle}>Pilot</Text>
          <View style={styles.nextStepsList}>
            <Text style={styles.nextStepsItem}>• Start with a focused cohort (20-50 providers)</Text>
            <Text style={styles.nextStepsItem}>• Measure time savings directly via EHR timestamps</Text>
            <Text style={styles.nextStepsItem}>• Track satisfaction and adoption weekly</Text>
          </View>
        </View>

        <View style={styles.nextStepsSection}>
          <Text style={styles.nextStepsTitle}>Scale</Text>
          <View style={styles.nextStepsList}>
            <Text style={styles.nextStepsItem}>• Expand based on pilot learnings</Text>
            <Text style={styles.nextStepsItem}>• Build internal champions</Text>
            <Text style={styles.nextStepsItem}>• Connect to existing quality initiatives</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.methodologyText}>
          Questions? Contact your Abridge representative.
        </Text>

        <View style={{ marginTop: 40, alignItems: "center" }}>
          <Image src={abridgeLogoPath} style={{ width: 80, height: 16 }} />
        </View>
      </View>

      <PageFooter pageNumber={7} />
    </Page>
  );
}

// ============================================================================
// MAIN DOCUMENT
// ============================================================================

function OutpatientValueDocument({ data }: { data: OutpatientPDFData }) {
  const hasRevenueDrivers = data.drivers.filter(d => d.category === "revenue").length > 0;
  
  return (
    <Document>
      <CoverPage data={data} />
      <ExecutiveSummaryPage data={data} />
      <TimeSavingsPage data={data} />
      {hasRevenueDrivers && <DocumentationQualityPage data={data} />}
      <InvestmentPage data={data} />
      <AssumptionsPage data={data} />
      <MethodologyPage data={data} />
    </Document>
  );
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function generateOutpatientPDF(data: OutpatientPDFData): Promise<void> {
  const blob = await pdf(<OutpatientValueDocument data={data} />).toBlob();
  const filename = `Abridge_Value_Assessment_${data.organizationName || "Outpatient"}_${new Date().toISOString().split("T")[0]}.pdf`;
  saveAs(blob, filename);
}

export async function generateOutpatientPDFBlob(data: OutpatientPDFData): Promise<Blob> {
  return await pdf(<OutpatientValueDocument data={data} />).toBlob();
}

// Aliases for backwards compatibility
export const generateOutpatientROIPDF = generateOutpatientPDF;
export const generateOutpatientROIPDFBlob = generateOutpatientPDFBlob;
