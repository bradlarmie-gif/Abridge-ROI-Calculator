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
import abridgeLogoWhitePath from "@assets/abridge-logo-wordmark-white_1769912213277.png";

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
// PREMIUM COLOR PALETTE
// ============================================================================

const brand = {
  // Core colors
  black: "#1A1A1A",
  white: "#FFFFFF",
  abridgeRed: "#EA2C00",
  warmBeige: "#F5F0EB",
  
  // Grays
  lightGray: "#F8F7F6",
  midGray: "#E5E4E3",
  borderGray: "#D4D4D4",
  
  // Text
  textPrimary: "#1A1A1A",
  textSecondary: "#666666",
  textTertiary: "#9CA3AF",
  
  // Badge colors
  badgeGreen: "#059669",
  badgeGreenBg: "#D1FAE5",
  badgeAmber: "#B45309",
  badgeAmberBg: "#FEF3C7",
  badgeGray: "#4B5563",
  badgeGrayBg: "#F3F4F6",
  badgeBlue: "#1D4ED8",
  badgeBlueBg: "#DBEAFE",
};

// ============================================================================
// PREMIUM STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Base page
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: brand.textPrimary,
    backgroundColor: brand.white,
  },
  
  // =====================
  // DARK COVER PAGE
  // =====================
  darkPage: {
    backgroundColor: brand.black,
    padding: 48,
    height: "100%",
    justifyContent: "space-between",
  },
  darkPageTop: {
    marginBottom: 40,
  },
  whiteLogo: {
    width: 100,
    height: 20,
  },
  coverCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  coverTitle: {
    fontSize: 48,
    fontWeight: 700,
    color: brand.white,
    textAlign: "center",
    lineHeight: 1.1,
    marginBottom: 16,
  },
  coverSetting: {
    fontSize: 28,
    color: brand.abridgeRed,
    textAlign: "center",
    marginBottom: 40,
  },
  coverTagline: {
    fontSize: 13,
    color: brand.textTertiary,
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 360,
  },
  darkPageBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  coverLabel: {
    fontSize: 9,
    color: brand.textTertiary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  
  // =====================
  // SECTION DIVIDER (WARM BEIGE)
  // =====================
  dividerPage: {
    backgroundColor: brand.warmBeige,
    padding: 48,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  dividerEyebrow: {
    fontSize: 10,
    color: brand.textSecondary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  dividerTitle: {
    fontSize: 44,
    fontWeight: 700,
    color: brand.textPrimary,
    textAlign: "center",
    lineHeight: 1.1,
    marginBottom: 20,
  },
  dividerSubtitle: {
    fontSize: 14,
    color: brand.textSecondary,
    textAlign: "center",
    lineHeight: 1.5,
    maxWidth: 400,
  },
  dividerFooter: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "center",
  },
  
  // =====================
  // CONTENT PAGES
  // =====================
  contentPage: {
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 56,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  headerLogo: {
    width: 70,
    height: 14,
  },
  headerSection: {
    fontSize: 9,
    color: brand.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerPage: {
    fontSize: 9,
    color: brand.textTertiary,
  },
  
  // =====================
  // TYPOGRAPHY
  // =====================
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: brand.textPrimary,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 12,
    color: brand.textSecondary,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: 600,
    color: brand.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 20,
  },
  bodyText: {
    fontSize: 11,
    color: brand.textSecondary,
    lineHeight: 1.7,
    marginBottom: 16,
  },
  
  // =====================
  // STAT CALLOUT BOX
  // =====================
  statBox: {
    backgroundColor: brand.lightGray,
    borderWidth: 1,
    borderColor: brand.midGray,
    padding: 24,
    alignItems: "center",
    marginVertical: 20,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 700,
    color: brand.textPrimary,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: brand.textSecondary,
    textAlign: "center",
  },
  
  // =====================
  // TWO COLUMN BOXES
  // =====================
  twoColContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  colBox: {
    flex: 1,
    backgroundColor: brand.lightGray,
    borderWidth: 1,
    borderColor: brand.midGray,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: brand.abridgeRed,
  },
  colBoxNumber: {
    fontSize: 10,
    fontWeight: 600,
    color: brand.abridgeRed,
    letterSpacing: 1,
    marginBottom: 8,
  },
  colBoxTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: brand.textPrimary,
    marginBottom: 10,
  },
  colBoxText: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.6,
  },
  
  // =====================
  // DRIVER PAGES
  // =====================
  driverTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: brand.textPrimary,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  horizontalRule: {
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
    marginVertical: 16,
  },
  mechanismText: {
    fontSize: 11,
    color: brand.textSecondary,
    lineHeight: 1.7,
    marginBottom: 12,
  },
  
  // =====================
  // CALCULATION BOX
  // =====================
  calculationBox: {
    backgroundColor: brand.lightGray,
    borderWidth: 1,
    borderColor: brand.midGray,
    padding: 24,
    marginVertical: 16,
    alignItems: "center",
  },
  formulaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  formulaElement: {
    alignItems: "center",
  },
  formulaValue: {
    fontSize: 11,
    fontWeight: 600,
    color: brand.textPrimary,
    marginBottom: 2,
  },
  formulaLabel: {
    fontSize: 8,
    color: brand.textTertiary,
    textAlign: "center",
  },
  formulaOperator: {
    fontSize: 16,
    fontWeight: 600,
    color: brand.textTertiary,
  },
  formulaDivider: {
    borderBottomWidth: 2,
    borderBottomColor: brand.textPrimary,
    width: "80%",
    marginVertical: 12,
  },
  formulaResult: {
    fontSize: 13,
    fontWeight: 700,
    color: brand.abridgeRed,
  },
  
  // =====================
  // CALLOUT BOX (RED BORDER)
  // =====================
  calloutBox: {
    backgroundColor: brand.lightGray,
    borderLeftWidth: 4,
    borderLeftColor: brand.abridgeRed,
    padding: 16,
    marginTop: 16,
  },
  calloutTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: brand.textPrimary,
    marginBottom: 8,
  },
  calloutText: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.6,
  },
  
  // =====================
  // ASSUMPTIONS TABLE
  // =====================
  table: {
    borderWidth: 1,
    borderColor: brand.midGray,
    marginVertical: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.lightGray,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 10,
    color: brand.textPrimary,
  },
  tableCellMuted: {
    fontSize: 10,
    color: brand.textSecondary,
  },
  tableGroupLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.abridgeRed,
    letterSpacing: 0.5,
    backgroundColor: brand.warmBeige,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  
  // =====================
  // HONEST LIMITS BOXES
  // =====================
  limitsBox: {
    backgroundColor: brand.lightGray,
    borderWidth: 1,
    borderColor: brand.midGray,
    padding: 16,
    marginBottom: 12,
  },
  limitsTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: brand.textPrimary,
    marginBottom: 4,
  },
  limitsSubtitle: {
    fontSize: 9,
    color: brand.textSecondary,
    marginBottom: 10,
  },
  limitsList: {
    marginTop: 4,
  },
  limitsItem: {
    fontSize: 10,
    color: brand.textSecondary,
    marginBottom: 4,
    paddingLeft: 12,
  },
  
  // =====================
  // VALIDATION PATH
  // =====================
  validationCard: {
    backgroundColor: brand.lightGray,
    borderWidth: 1,
    borderColor: brand.midGray,
    padding: 16,
    marginBottom: 12,
  },
  validationTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: brand.textPrimary,
    marginBottom: 10,
  },
  validationSection: {
    marginBottom: 8,
  },
  validationLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: brand.textSecondary,
    marginBottom: 4,
  },
  validationText: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.5,
    marginBottom: 2,
    paddingLeft: 8,
  },
  validationNote: {
    fontSize: 9,
    color: brand.abridgeRed,
    fontStyle: "italic",
    marginTop: 6,
  },
  
  // =====================
  // TIMELINE TABLE
  // =====================
  timelineTable: {
    borderWidth: 1,
    borderColor: brand.midGray,
    marginTop: 16,
  },
  timelineRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  
  // =====================
  // CLOSING PAGE
  // =====================
  closingText: {
    fontSize: 16,
    color: brand.white,
    lineHeight: 1.7,
    marginBottom: 24,
    textAlign: "center",
    maxWidth: 420,
  },
  closingHighlight: {
    fontSize: 16,
    fontWeight: 700,
    color: brand.white,
  },
  closingSummaryBox: {
    borderTopWidth: 1,
    borderTopColor: brand.textTertiary,
    borderBottomWidth: 1,
    borderBottomColor: brand.textTertiary,
    paddingVertical: 24,
    marginVertical: 24,
    width: "100%",
    maxWidth: 380,
  },
  closingSummaryRow: {
    marginBottom: 12,
  },
  closingSummaryLabel: {
    fontSize: 10,
    color: brand.abridgeRed,
    letterSpacing: 1,
    marginBottom: 2,
  },
  closingSummaryText: {
    fontSize: 11,
    color: brand.textTertiary,
  },
  closingFinal: {
    fontSize: 14,
    color: brand.white,
    lineHeight: 1.7,
    textAlign: "center",
    maxWidth: 400,
    marginTop: 20,
  },
  closingAccent: {
    fontSize: 15,
    fontWeight: 700,
    color: brand.abridgeRed,
    textAlign: "center",
    marginTop: 8,
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

const getCurrentDate = (): string => {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
};

// ============================================================================
// PAGE 1: DARK COVER
// ============================================================================

const CoverPage = () => (
  <Page size="A4" style={[styles.page, styles.darkPage]} wrap={false}>
    <View style={styles.darkPageTop}>
      <Image src={abridgeLogoWhitePath} style={styles.whiteLogo} />
    </View>
    
    <View style={styles.coverCenter}>
      <Text style={styles.coverTitle}>HOW WE THINK{"\n"}ABOUT VALUE</Text>
      <Text style={styles.coverSetting}>Nursing</Text>
      <Text style={styles.coverTagline}>
        A framework for understanding where value lives when there's no billing relationship
      </Text>
    </View>
    
    <View style={styles.darkPageBottom}>
      <Text style={styles.coverLabel}>ROI METHODOLOGY</Text>
      <Text style={styles.coverLabel}>{getCurrentDate()}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 2: THE CONTEXT - WHY NURSING IS DIFFERENT
// ============================================================================

const ContextPage1 = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>THE CONTEXT</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={styles.pageTitle}>Why Nursing Value{"\n"}Is Different</Text>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.bodyText}>
        Nursing is the hardest setting to model ROI—and the most important to get right.
      </Text>
      
      <Text style={styles.bodyText}>
        In outpatient medicine, a physician saves 4 minutes per visit, and you can trace a path to wRVU lift or capacity expansion. The billing relationship creates a clear value chain.
      </Text>
      
      <Text style={styles.bodyText}>
        Nurses don't bill. They don't generate wRVUs. And yet nursing documentation burden is massive—25-35% of every shift spent on flowsheets, assessments, handoffs, and charting.
      </Text>
      
      <View style={styles.statBox}>
        <Text style={styles.statValue}>25-35%</Text>
        <Text style={styles.statLabel}>of every nursing shift{"\n"}spent on documentation</Text>
      </View>
      
      <Text style={[styles.bodyText, { fontWeight: 600, color: brand.textPrimary }]}>
        So where does the value live?
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 3: THE TWO VALUE PATHS
// ============================================================================

const ContextPage2 = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>THE CONTEXT</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={[styles.pageTitle, { fontSize: 22 }]}>It lives in two places.</Text>
      
      <View style={styles.horizontalRule} />
      
      <View style={styles.twoColContainer}>
        <View style={styles.colBox}>
          <Text style={styles.colBoxNumber}>1. LABOR ECONOMICS</Text>
          <Text style={styles.colBoxText}>
            Overtime, retention, and agency spend. These are real dollars that show up in the budget.
          </Text>
          <Text style={[styles.colBoxText, { marginTop: 10 }]}>
            When nurses spend less time documenting, they're more likely to finish shifts on time, less likely to burn out and leave, and the organization is less dependent on expensive travel nurses.
          </Text>
        </View>
        
        <View style={styles.colBox}>
          <Text style={styles.colBoxNumber}>2. CARE QUALITY ENABLEMENT</Text>
          <Text style={styles.colBoxText}>
            Falls, pressure injuries, patient satisfaction. These outcomes are influenced by how much time nurses spend at bedside.
          </Text>
          <Text style={[styles.colBoxText, { marginTop: 10 }]}>
            More time caring, less time charting, better outcomes. But the causal chain is indirect—documentation supports care, it doesn't replace it.
          </Text>
        </View>
      </View>
      
      <Text style={[styles.bodyText, { marginTop: 16, fontWeight: 600, color: brand.textPrimary }]}>
        We model both—but we're honest about which value is direct and which is potential.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 4: SECTION DIVIDER - LABOR ECONOMICS
// ============================================================================

const LaborEconomicsDivider = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.dividerPage]} wrap={false}>
    <Text style={styles.dividerEyebrow}>VALUE MECHANISM 01</Text>
    <Text style={styles.dividerTitle}>Labor{"\n"}Economics</Text>
    <Text style={styles.dividerSubtitle}>
      Time saved → OT reduced → Nurses retained → Agency spend avoided
    </Text>
    <View style={styles.dividerFooter}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 5: OVERTIME REDUCTION
// ============================================================================

const OvertimePage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>LABOR ECONOMICS</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={styles.driverTitle}>Overtime Reduction</Text>
      
      <View style={[styles.badge, { backgroundColor: brand.badgeGreenBg }]}>
        <Text style={[styles.badgeText, { color: brand.badgeGreen }]}>DIRECTLY MEASURABLE</Text>
      </View>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE MECHANISM</Text>
      <Text style={styles.mechanismText}>
        When nurses spend less time documenting, they're more likely to complete their shift on time. Not all time saved converts to OT reduction—some goes to care time, some to shift efficiency—but a portion does.
      </Text>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE CALCULATION</Text>
      
      <View style={styles.calculationBox}>
        <View style={styles.formulaRow}>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Hours saved</Text>
            <Text style={styles.formulaLabel}>per year</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Conversion rate</Text>
            <Text style={styles.formulaLabel}>(15-40%)</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>OT hourly rate</Text>
            <Text style={styles.formulaLabel}>(1.5× base)</Text>
          </View>
        </View>
        <View style={styles.formulaDivider} />
        <Text style={styles.formulaResult}>OT Savings</Text>
      </View>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE KEY ASSUMPTION</Text>
      <Text style={styles.mechanismText}>
        We use a 15-40% conversion rate depending on how documentation-driven your current overtime is. Not all time saved becomes OT reduction—we account for that.
      </Text>
      
      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>WHY THIS IS DEFENSIBLE</Text>
        <Text style={styles.calloutText}>
          Overtime is measurable. Documentation time is measurable. The link between them is logical and can be validated post-implementation.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 6: RETENTION SAVINGS
// ============================================================================

const RetentionPage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>LABOR ECONOMICS</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={styles.driverTitle}>Retention Savings</Text>
      
      <View style={[styles.badge, { backgroundColor: brand.badgeAmberBg }]}>
        <Text style={[styles.badgeText, { color: brand.badgeAmber }]}>INDIRECTLY ATTRIBUTABLE</Text>
      </View>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE MECHANISM</Text>
      <Text style={styles.mechanismText}>
        Documentation burden is consistently cited as a top driver of nurse burnout. Burnout is a top driver of turnover. Reducing the burden can help retain nurses who would otherwise leave.
      </Text>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE CALCULATION</Text>
      
      <View style={styles.calculationBox}>
        <View style={styles.formulaRow}>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Nurse FTEs</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Turnover rate</Text>
            <Text style={styles.formulaLabel}>(15-25%)</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Burnout %</Text>
            <Text style={styles.formulaLabel}>(30-50%)</Text>
          </View>
        </View>
        <View style={[styles.formulaRow, { marginTop: 8 }]}>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Abridge impact</Text>
            <Text style={styles.formulaLabel}>(10-25%)</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Replacement cost</Text>
            <Text style={styles.formulaLabel}>($40-65K)</Text>
          </View>
        </View>
        <View style={styles.formulaDivider} />
        <Text style={styles.formulaResult}>Retention Value</Text>
      </View>
      
      <Text style={styles.sectionHeading}>WHY WE USE LOWER IMPACT RATES FOR NURSING</Text>
      <Text style={styles.mechanismText}>
        We use 10-25% Abridge impact for nursing (vs. higher rates for physicians) because documentation is one of many burnout factors for nurses. Staffing ratios, patient acuity, and emotional toll all matter.
      </Text>
      
      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>WHY THIS IS DEFENSIBLE</Text>
        <Text style={styles.calloutText}>
          The link between documentation burden and burnout is well-established in nursing research. The question is magnitude, not direction.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 7: AGENCY LABOR REDUCTION
// ============================================================================

const AgencyPage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>LABOR ECONOMICS</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={styles.driverTitle}>Agency Labor Reduction</Text>
      
      <View style={[styles.badge, { backgroundColor: brand.badgeBlueBg }]}>
        <Text style={[styles.badgeText, { color: brand.badgeBlue }]}>CONNECTED TO RETENTION</Text>
      </View>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE MECHANISM</Text>
      <Text style={styles.mechanismText}>
        When nurses leave, hospitals fill gaps with agency or travel nurses at 2-3× the cost. Improved retention directly reduces this premium labor dependency.
      </Text>
      
      <View style={styles.statBox}>
        <Text style={styles.statValue}>2-3×</Text>
        <Text style={styles.statLabel}>the cost of permanent staff{"\n"}for travel/agency nurses</Text>
      </View>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE CALCULATION</Text>
      
      <View style={styles.calculationBox}>
        <View style={styles.formulaRow}>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Nurses retained</Text>
            <Text style={styles.formulaLabel}>(from retention)</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Weeks of coverage</Text>
            <Text style={styles.formulaLabel}>(8-16 weeks)</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Weekly premium</Text>
            <Text style={styles.formulaLabel}>($2,000-$4,000)</Text>
          </View>
        </View>
        <View style={styles.formulaDivider} />
        <Text style={styles.formulaResult}>Agency Savings</Text>
      </View>
      
      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>THE CONNECTION</Text>
        <Text style={styles.calloutText}>
          This driver is connected to Retention Savings. If you retain more nurses, you need fewer travelers. We don't double-count—retention captures replacement cost, agency captures the premium labor cost during the vacancy period.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 8: SECTION DIVIDER - CARE QUALITY
// ============================================================================

const CareQualityDivider = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.dividerPage]} wrap={false}>
    <Text style={styles.dividerEyebrow}>VALUE MECHANISM 02</Text>
    <Text style={styles.dividerTitle}>Care Quality{"\n"}Enablement</Text>
    <Text style={styles.dividerSubtitle}>
      More time at bedside → Better assessments → Earlier intervention → Better outcomes
    </Text>
    <View style={styles.dividerFooter}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 9: WHY WE CALL THIS POTENTIAL VALUE
// ============================================================================

const PotentialValuePage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>CARE QUALITY ENABLEMENT</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={[styles.pageTitle, { fontSize: 24 }]}>Why We Call This{"\n"}"Potential" Value</Text>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.bodyText}>
        The link between documentation and care quality outcomes is INDIRECT—we don't cause fewer falls, we enable the visibility that helps prevent them.
      </Text>
      
      <View style={styles.calculationBox}>
        <View style={styles.formulaRow}>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Documentation</Text>
            <Text style={styles.formulaLabel}>We control this</Text>
          </View>
          <Text style={styles.formulaOperator}>→</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Visibility</Text>
            <Text style={styles.formulaLabel}>We support this</Text>
          </View>
          <Text style={styles.formulaOperator}>→</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Intervention</Text>
            <Text style={styles.formulaLabel}>Clinical team controls</Text>
          </View>
          <Text style={styles.formulaOperator}>→</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Outcome</Text>
            <Text style={styles.formulaLabel}>Patient experiences</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.bodyText}>
        The distance between "documentation" and "outcome" is where traditional ROI models break down. We can prove time savings. We can't prove falls prevention with the same rigor.
      </Text>
      
      <Text style={[styles.bodyText, { fontWeight: 600, color: brand.textPrimary }]}>
        That's why we show this value separately—with appropriate caveats.
      </Text>
      
      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>THE HONEST TRUTH</Text>
        <Text style={styles.calloutText}>
          Falls and pressure injuries are prevented through clinical care—turning, positioning, nutrition, skin care. Documentation SUPPORTS this but doesn't REPLACE it. We show this separately because honesty builds trust.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 10: HAPI PREVENTION
// ============================================================================

const HAPIPage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>CARE QUALITY ENABLEMENT</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={styles.driverTitle}>HAPI Prevention</Text>
      
      <View style={[styles.badge, { backgroundColor: brand.badgeGrayBg }]}>
        <Text style={[styles.badgeText, { color: brand.badgeGray }]}>POTENTIAL VALUE — INDIRECT CAUSAL LINK</Text>
      </View>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE MECHANISM</Text>
      <Text style={styles.mechanismText}>
        Hospital-acquired pressure injuries happen when assessments are missed or interventions are delayed. Real-time documentation ensures skin assessments, turning schedules, and risk factors are captured as they're observed—enabling earlier intervention.
      </Text>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE CALCULATION</Text>
      
      <View style={styles.calculationBox}>
        <View style={styles.formulaRow}>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Current HAPIs</Text>
            <Text style={styles.formulaLabel}>per year</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Documentation-preventable</Text>
            <Text style={styles.formulaLabel}>(3-10%)</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Cost per HAPI avoided</Text>
            <Text style={styles.formulaLabel}>($10K-$50K)</Text>
          </View>
        </View>
        <View style={styles.formulaDivider} />
        <Text style={styles.formulaResult}>Potential Value</Text>
      </View>
      
      <Text style={styles.sectionHeading}>WHY 5% PREVENTION RATE</Text>
      <Text style={styles.mechanismText}>
        Not all HAPIs are documentation-preventable. Our 5% default is conservative—it represents cases where real-time assessment documentation would have triggered earlier intervention.
      </Text>
      
      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>THE HONEST TRUTH</Text>
        <Text style={styles.calloutText}>
          HAPIs are prevented through clinical care—turning, positioning, nutrition, skin care. Documentation SUPPORTS this but doesn't REPLACE it. We show this separately because honesty builds trust.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 11: FALLS PREVENTION
// ============================================================================

const FallsPage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>CARE QUALITY ENABLEMENT</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={styles.driverTitle}>Falls Prevention</Text>
      
      <View style={[styles.badge, { backgroundColor: brand.badgeGrayBg }]}>
        <Text style={[styles.badgeText, { color: brand.badgeGray }]}>POTENTIAL VALUE — INDIRECT CAUSAL LINK</Text>
      </View>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE MECHANISM</Text>
      <Text style={styles.mechanismText}>
        Falls happen when risk assessments are missed or interventions are delayed. Real-time documentation ensures fall risk scores, mobility assessments, and environmental factors are captured as they're observed—enabling earlier intervention.
      </Text>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE CALCULATION</Text>
      
      <View style={styles.calculationBox}>
        <View style={styles.formulaRow}>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Current falls</Text>
            <Text style={styles.formulaLabel}>per year</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Documentation-preventable</Text>
            <Text style={styles.formulaLabel}>(3-10%)</Text>
          </View>
          <Text style={styles.formulaOperator}>×</Text>
          <View style={styles.formulaElement}>
            <Text style={styles.formulaValue}>Cost per fall avoided</Text>
            <Text style={styles.formulaLabel}>($3K-$30K)</Text>
          </View>
        </View>
        <View style={styles.formulaDivider} />
        <Text style={styles.formulaResult}>Potential Value</Text>
      </View>
      
      <Text style={styles.sectionHeading}>BENCHMARK: COST PER FALL</Text>
      
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>No injury fall</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>$3K - $5K</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Minor injury</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>$5K - $8K</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Major injury (fracture)</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>$15K - $30K</Text>
        </View>
      </View>
      
      <Text style={[styles.mechanismText, { fontSize: 10, fontStyle: "italic" }]}>
        CMS does NOT reimburse for hospital-acquired fall injuries. This is pure cost to the hospital.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 12: PATIENT EXPERIENCE (HCAHPS)
// ============================================================================

const HCAHPSPage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>CARE QUALITY ENABLEMENT</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={styles.driverTitle}>Patient Experience (HCAHPS)</Text>
      
      <View style={[styles.badge, { backgroundColor: brand.lightGray, borderWidth: 1, borderColor: brand.midGray }]}>
        <Text style={[styles.badgeText, { color: brand.textSecondary }]}>QUALITATIVE — WE DON'T CALCULATE A DOLLAR VALUE</Text>
      </View>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>THE CONNECTION</Text>
      <Text style={styles.mechanismText}>
        When nurses spend less time on documentation, they spend more time with patients. Research consistently shows bedside time correlates with patient satisfaction.
      </Text>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>WHY WE DON'T CALCULATE THIS</Text>
      <Text style={styles.mechanismText}>
        HCAHPS scores are influenced by dozens of factors:
      </Text>
      
      <View style={{ marginLeft: 12, marginBottom: 16 }}>
        <Text style={[styles.mechanismText, { marginBottom: 4 }]}>• Wait times</Text>
        <Text style={[styles.mechanismText, { marginBottom: 4 }]}>• Pain management</Text>
        <Text style={[styles.mechanismText, { marginBottom: 4 }]}>• Communication quality</Text>
        <Text style={[styles.mechanismText, { marginBottom: 4 }]}>• Physical environment</Text>
        <Text style={[styles.mechanismText, { marginBottom: 4 }]}>• Staffing levels</Text>
        <Text style={[styles.mechanismText, { marginBottom: 4 }]}>• Discharge process</Text>
      </View>
      
      <Text style={[styles.mechanismText, { fontWeight: 600, color: brand.textPrimary }]}>
        We can't credibly attribute HCAHPS improvement to documentation alone. So we don't try.
      </Text>
      
      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>BUT CONSIDER</Text>
        <Text style={styles.calloutText}>
          Hospitals in the top quartile of HCAHPS receive approximately 2% higher reimbursement through Value-Based Purchasing.{"\n\n"}Even small improvements matter.{"\n\n"}Track HCAHPS as a leading indicator after implementation.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 13: SECTION DIVIDER - ASSUMPTIONS
// ============================================================================

const AssumptionsDivider = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.dividerPage]} wrap={false}>
    <Text style={styles.dividerEyebrow}>THE ASSUMPTIONS</Text>
    <Text style={styles.dividerTitle}>Every Number{"\n"}Has a Source</Text>
    <Text style={styles.dividerSubtitle}>
      We don't hide assumptions.{"\n"}We highlight them.
    </Text>
    <View style={styles.dividerFooter}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 14: KEY ASSUMPTIONS TABLE
// ============================================================================

const AssumptionsPage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>THE ASSUMPTIONS</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={[styles.pageTitle, { fontSize: 24 }]}>Key Assumptions</Text>
      
      <View style={styles.horizontalRule} />
      
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>ASSUMPTION</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>RANGE</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>DEFAULT</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>SOURCE</Text>
        </View>
        
        <Text style={styles.tableGroupLabel}>TIME SAVINGS</Text>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Time saved per shift</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>15-30 min</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20 min</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>Abridge data</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>OT conversion rate</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>15-40%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>25%</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>Studies</Text>
        </View>
        
        <Text style={styles.tableGroupLabel}>RETENTION</Text>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Nurse turnover rate</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>15-25%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>18%</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>NSI 2024</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Burnout-related %</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>30-50%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>40%</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>ANA research</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Abridge retention impact</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>10-25%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15%</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>Conservative</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Replacement cost</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>$40-65K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$52K</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>NSI 2024</Text>
        </View>
        
        <Text style={styles.tableGroupLabel}>AGENCY</Text>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Weeks of coverage</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>8-16 weeks</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>12 weeks</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>HR data</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Weekly premium</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>$2-4K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$2,500</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>Market rates</Text>
        </View>
        
        <Text style={styles.tableGroupLabel}>CARE QUALITY</Text>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>HAPI rate</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>1.5-3.5/1K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2.5/1K</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>AHRQ</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Falls rate</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>2.5-5/1K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>3.5/1K</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>AHRQ</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Prevention rate</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>3-10%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>5%</Text>
          <Text style={[styles.tableCellMuted, { flex: 1 }]}>Conservative</Text>
        </View>
      </View>
      
      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>WHY WE DEFAULT CONSERVATIVE</Text>
        <Text style={styles.calloutText}>
          We'd rather show a smaller number you can defend than a larger number that falls apart under scrutiny.{"\n\n"}If the conservative projection shows positive ROI, you can be confident. If your experience exceeds it, that's upside.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 15: THE HONEST LIMITS
// ============================================================================

const HonestLimitsPage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>THE ASSUMPTIONS</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={[styles.pageTitle, { fontSize: 24 }]}>The Honest Limits</Text>
      <Text style={styles.pageSubtitle}>What we can measure vs. what we can influence</Text>
      
      <View style={styles.horizontalRule} />
      
      <View style={styles.limitsBox}>
        <Text style={styles.limitsTitle}>✓ WHAT WE CAN MEASURE</Text>
        <Text style={styles.limitsSubtitle}>Strong causal chain, direct attribution</Text>
        <View style={styles.limitsList}>
          <Text style={styles.limitsItem}>• Overtime hours before/after</Text>
          <Text style={styles.limitsItem}>• Documentation time per shift</Text>
          <Text style={styles.limitsItem}>• Shift completion rates</Text>
          <Text style={styles.limitsItem}>• Chart completion time</Text>
        </View>
      </View>
      
      <View style={styles.limitsBox}>
        <Text style={styles.limitsTitle}>~ WHAT WE CAN INFLUENCE</Text>
        <Text style={styles.limitsSubtitle}>Correlated, but indirect attribution</Text>
        <View style={styles.limitsList}>
          <Text style={styles.limitsItem}>• Turnover rates (documentation is one factor among many)</Text>
          <Text style={styles.limitsItem}>• Agency utilization (connected to retention)</Text>
          <Text style={styles.limitsItem}>• Nurse satisfaction (documentation burden is significant but not the only driver)</Text>
        </View>
      </View>
      
      <View style={styles.limitsBox}>
        <Text style={styles.limitsTitle}>○ WHAT WE CAN ENABLE</Text>
        <Text style={styles.limitsSubtitle}>Supportive, but not causal</Text>
        <View style={styles.limitsList}>
          <Text style={styles.limitsItem}>• Falls prevention (requires clinical practice)</Text>
          <Text style={styles.limitsItem}>• HAPI prevention (requires clinical practice)</Text>
          <Text style={styles.limitsItem}>• HCAHPS improvement (requires many factors)</Text>
        </View>
        <Text style={[styles.limitsItem, { marginTop: 8, fontStyle: "italic" }]}>
          Documentation creates visibility. Clinical teams act on it. We provide the foundation—not the outcome.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 16: VALIDATION PATH
// ============================================================================

const ValidationPage1 = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>VALIDATION PATH</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={[styles.pageTitle, { fontSize: 24 }]}>How to Prove This{"\n"}With Your Own Data</Text>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.bodyText}>
        Our projections are starting points. The real answers come from your organization's experience.
      </Text>
      
      <View style={styles.validationCard}>
        <Text style={styles.validationTitle}>TIME SAVINGS</Text>
        <View style={styles.validationSection}>
          <Text style={styles.validationLabel}>Before:</Text>
          <Text style={styles.validationText}>• Survey nurses on documentation time per shift</Text>
          <Text style={styles.validationText}>• Review EHR session data for charting duration</Text>
        </View>
        <View style={styles.validationSection}>
          <Text style={styles.validationLabel}>After:</Text>
          <Text style={styles.validationText}>• Repeat the same measurements</Text>
          <Text style={styles.validationText}>• Compare with utilization data to isolate Abridge impact</Text>
        </View>
      </View>
      
      <View style={styles.validationCard}>
        <Text style={styles.validationTitle}>OVERTIME REDUCTION</Text>
        <View style={styles.validationSection}>
          <Text style={styles.validationLabel}>Before:</Text>
          <Text style={styles.validationText}>• Establish baseline OT hours per unit/month</Text>
          <Text style={styles.validationText}>• Note any seasonal patterns</Text>
        </View>
        <View style={styles.validationSection}>
          <Text style={styles.validationLabel}>After:</Text>
          <Text style={styles.validationText}>• Track OT hours on units using Abridge vs. control units</Text>
          <Text style={styles.validationText}>• Control for census and acuity changes</Text>
        </View>
      </View>
      
      <View style={styles.validationCard}>
        <Text style={styles.validationTitle}>RETENTION</Text>
        <View style={styles.validationSection}>
          <Text style={styles.validationLabel}>Before:</Text>
          <Text style={styles.validationText}>• Document baseline turnover rate by unit</Text>
          <Text style={styles.validationText}>• Include exit interview data on burnout/documentation burden</Text>
        </View>
        <View style={styles.validationSection}>
          <Text style={styles.validationLabel}>After:</Text>
          <Text style={styles.validationText}>• Track turnover on Abridge units vs. control units</Text>
          <Text style={styles.validationText}>• Survey nurses on burnout and documentation satisfaction</Text>
        </View>
        <Text style={styles.validationNote}>Note: Retention impact takes 12-18 months to measure meaningfully.</Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 17: VALIDATION PATH (CONTINUED)
// ============================================================================

const ValidationPage2 = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>VALIDATION PATH</Text>
    </View>
    
    <View style={styles.content}>
      <View style={styles.validationCard}>
        <Text style={styles.validationTitle}>CARE QUALITY</Text>
        <View style={styles.validationSection}>
          <Text style={styles.validationLabel}>Before:</Text>
          <Text style={styles.validationText}>• Baseline HAPI and falls rates by unit</Text>
          <Text style={styles.validationText}>• Baseline HCAHPS scores</Text>
        </View>
        <View style={styles.validationSection}>
          <Text style={styles.validationLabel}>After:</Text>
          <Text style={styles.validationText}>• Track rates on Abridge units vs. control units</Text>
          <Text style={styles.validationText}>• Be cautious about attribution—many factors influence these</Text>
        </View>
        <Text style={styles.validationNote}>
          Recommendation: Treat quality improvements as bonus, not expectation. If they show up, celebrate them. Don't promise them upfront.
        </Text>
      </View>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.sectionHeading}>TIMELINES</Text>
      
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>METRIC</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>TIMELINE TO MEANINGFUL DATA</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Documentation time</Text>
          <Text style={[styles.tableCellMuted, { flex: 1.5 }]}>2-4 weeks</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Overtime reduction</Text>
          <Text style={[styles.tableCellMuted, { flex: 1.5 }]}>2-3 months</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Nurse satisfaction</Text>
          <Text style={[styles.tableCellMuted, { flex: 1.5 }]}>3-6 months</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>HAC rates</Text>
          <Text style={[styles.tableCellMuted, { flex: 1.5 }]}>6-12 months</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Turnover/retention</Text>
          <Text style={[styles.tableCellMuted, { flex: 1.5 }]}>12-18 months</Text>
        </View>
      </View>
      
      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>THE VALIDATION MINDSET</Text>
        <Text style={styles.calloutText}>
          Start measuring before implementation. The baseline data you collect now is what makes post-implementation claims credible.
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 18: CONNECTED VALUE
// ============================================================================

const ConnectedValuePage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>CONNECTED VALUE</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={[styles.pageTitle, { fontSize: 24 }]}>Nursing Documentation{"\n"}Feeds Revenue</Text>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.bodyText}>
        Nursing value isn't limited to labor economics and care quality. In inpatient settings, nursing documentation directly supports revenue capture.
      </Text>
      
      <View style={styles.colBox}>
        <Text style={styles.colBoxNumber}>DRG OPTIMIZATION</Text>
        <Text style={styles.colBoxText}>
          Nursing notes often contain clinical details that support higher-acuity DRG assignments. When documentation is complete and timely, CDI teams can identify coding opportunities that would otherwise be missed.
        </Text>
      </View>
      
      <View style={[styles.colBox, { marginTop: 16 }]}>
        <Text style={styles.colBoxNumber}>DENIAL PREVENTION</Text>
        <Text style={styles.colBoxText}>
          Real-time nursing documentation provides contemporaneous evidence of patient acuity and care needs—critical for payer appeals.
        </Text>
      </View>
      
      <View style={[styles.colBox, { marginTop: 16 }]}>
        <Text style={styles.colBoxNumber}>CDI EFFICIENCY</Text>
        <Text style={styles.colBoxText}>
          When nursing documentation is complete, CDI teams have better source material for identifying coding opportunities.
        </Text>
      </View>
      
      <View style={styles.horizontalRule} />
      
      <Text style={styles.bodyText}>
        These benefits are quantified in the Inpatient Setting methodology. If your organization uses Abridge for both Nursing and Hospitalists, the documentation creates a complete clinical picture that supports accurate coding from admission through discharge.
      </Text>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

// ============================================================================
// PAGE 19: DARK CLOSING
// ============================================================================

const ClosingPage = ({ pageNum }: { pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.darkPage]} wrap={false}>
    <View style={styles.darkPageTop}>
      <Image src={abridgeLogoWhitePath} style={styles.whiteLogo} />
    </View>
    
    <View style={styles.coverCenter}>
      <Text style={styles.closingText}>
        Nursing ROI is harder to model than physician ROI because nurses don't bill.
      </Text>
      <Text style={styles.closingHighlight}>
        But the value is real.
      </Text>
      
      <View style={styles.closingSummaryBox}>
        <View style={styles.closingSummaryRow}>
          <Text style={styles.closingSummaryLabel}>TIME VALUE (direct)</Text>
          <Text style={styles.closingSummaryText}>OT reduction · Retention savings · Agency avoidance</Text>
        </View>
        <View style={styles.closingSummaryRow}>
          <Text style={styles.closingSummaryLabel}>CARE QUALITY (potential)</Text>
          <Text style={styles.closingSummaryText}>Falls · HAPIs · Patient experience</Text>
        </View>
        <View style={[styles.closingSummaryRow, { marginBottom: 0 }]}>
          <Text style={styles.closingSummaryLabel}>CONNECTED VALUE</Text>
          <Text style={styles.closingSummaryText}>Nursing documentation feeds inpatient revenue</Text>
        </View>
      </View>
      
      <Text style={styles.closingFinal}>
        We model all three—but we're honest about which is measurable, which is influenceable, and which is only enabled.
      </Text>
      <Text style={styles.closingAccent}>
        That honesty is the methodology.
      </Text>
    </View>
    
    <View style={styles.darkPageBottom}>
      <Text style={styles.coverLabel}>Page {pageNum}</Text>
      <Text style={styles.coverLabel}></Text>
    </View>
  </Page>
);

// ============================================================================
// MAIN DOCUMENT
// ============================================================================

const NursingMethodologyDocument = () => (
  <Document>
    <CoverPage />
    <ContextPage1 pageNum={2} />
    <ContextPage2 pageNum={3} />
    <LaborEconomicsDivider pageNum={4} />
    <OvertimePage pageNum={5} />
    <RetentionPage pageNum={6} />
    <AgencyPage pageNum={7} />
    <CareQualityDivider pageNum={8} />
    <PotentialValuePage pageNum={9} />
    <HAPIPage pageNum={10} />
    <FallsPage pageNum={11} />
    <HCAHPSPage pageNum={12} />
    <AssumptionsDivider pageNum={13} />
    <AssumptionsPage pageNum={14} />
    <HonestLimitsPage pageNum={15} />
    <ValidationPage1 pageNum={16} />
    <ValidationPage2 pageNum={17} />
    <ConnectedValuePage pageNum={18} />
    <ClosingPage pageNum={19} />
  </Document>
);

// ============================================================================
// EXPORT FUNCTION
// ============================================================================

export async function generateNursingMethodologyPDF(): Promise<void> {
  const blob = await pdf(<NursingMethodologyDocument />).toBlob();
  saveAs(blob, `Abridge-Nursing-ROI-Methodology.pdf`);
}

// ============================================================================
// ROI PDF DOCUMENT (for personalized results from the model)
// ============================================================================

const ROICoverPage = ({ data }: { data: NursingPDFData }) => {
  const today = getCurrentDate();
  const displayName = data.clientName || data.organizationName || "Your Organization";

  return (
    <Page size="A4" style={[styles.page, styles.darkPage]} wrap={false}>
      <View style={styles.darkPageTop}>
        <Image src={abridgeLogoWhitePath} style={styles.whiteLogo} />
      </View>
      
      <View style={styles.coverCenter}>
        <Text style={[styles.coverTitle, { fontSize: 36 }]}>Nursing ROI{"\n"}Assessment</Text>
        <Text style={styles.coverSetting}>{displayName}</Text>
        <Text style={[styles.coverTagline, { marginBottom: 40 }]}>
          {formatNumber(data.staffedBeds)} staffed beds · {formatNumber(data.nurseFTEs)} nurse FTEs
        </Text>
        
        <Text style={{ fontSize: 56, fontWeight: 700, color: brand.abridgeRed, marginBottom: 8 }}>
          {formatCurrency(data.netGain)}
        </Text>
        <Text style={{ fontSize: 13, color: brand.textTertiary }}>
          Projected Net Annual Value
        </Text>
      </View>
      
      <View style={styles.darkPageBottom}>
        <Text style={styles.coverLabel}>ABRIDGE VALUE ASSESSMENT</Text>
        <Text style={styles.coverLabel}>{today}</Text>
      </View>
    </Page>
  );
};

const ROISummaryPage = ({ data, pageNum }: { data: NursingPDFData; pageNum: number }) => {
  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const qualityDrivers = data.drivers.filter(d => d.category === "quality" || d.category === "qualitative");
  
  const laborValue = laborDrivers.reduce((sum, d) => sum + d.value, 0);
  const qualityValue = qualityDrivers.reduce((sum, d) => sum + d.value, 0);

  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <Text style={styles.headerSection}>VALUE SUMMARY</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.pageTitle, { fontSize: 24 }]}>Two Sources of Value</Text>
        
        <View style={styles.horizontalRule} />
        
        <View style={styles.twoColContainer}>
          <View style={styles.colBox}>
            <Text style={styles.colBoxNumber}>LABOR ECONOMICS</Text>
            <Text style={{ fontSize: 28, fontWeight: 700, color: brand.abridgeRed, marginBottom: 8 }}>
              {formatCurrency(laborValue)}
            </Text>
            <Text style={styles.colBoxText}>
              Overtime reduction, improved retention, reduced agency dependency
            </Text>
          </View>
          
          <View style={styles.colBox}>
            <Text style={styles.colBoxNumber}>CARE QUALITY</Text>
            <Text style={{ fontSize: 28, fontWeight: 700, color: brand.abridgeRed, marginBottom: 8 }}>
              {formatCurrency(qualityValue)}
            </Text>
            <Text style={styles.colBoxText}>
              Falls prevention, HAPI reduction, patient experience improvement
            </Text>
          </View>
        </View>
        
        <View style={styles.horizontalRule} />
        
        <Text style={styles.sectionHeading}>VALUE DRIVERS</Text>
        
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>DRIVER</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>CATEGORY</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>VALUE</Text>
          </View>
          {data.drivers.map((driver, idx) => (
            <View key={driver.id} style={idx === data.drivers.length - 1 ? [styles.tableRow, styles.tableRowLast] : styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{driver.name}</Text>
              <Text style={[styles.tableCellMuted, { flex: 1 }]}>
                {driver.category === "labor" ? "Labor" : driver.category === "quality" ? "Quality" : "Qualitative"}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right" as const, color: brand.abridgeRed, fontWeight: 600 }]}>
                {formatCurrency(driver.value)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerPage}>Page {pageNum}</Text>
      </View>
    </Page>
  );
};

const ROIInvestmentPage = ({ data, pageNum }: { data: NursingPDFData; pageNum: number }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <Text style={styles.headerSection}>INVESTMENT ANALYSIS</Text>
    </View>
    
    <View style={styles.content}>
      <Text style={[styles.pageTitle, { fontSize: 24 }]}>Three-Year Projection</Text>
      
      <View style={styles.horizontalRule} />
      
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}></Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>YEAR 1</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>YEAR 2</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>YEAR 3</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>TOTAL</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 600 }]}>Value Generated</Text>
          <Text style={[styles.tableCellMuted, { flex: 1, textAlign: "center" }]}>{formatCurrency(data.year1Value)}</Text>
          <Text style={[styles.tableCellMuted, { flex: 1, textAlign: "center" }]}>{formatCurrency(data.year2Value)}</Text>
          <Text style={[styles.tableCellMuted, { flex: 1, textAlign: "center" }]}>{formatCurrency(data.year3Value)}</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: "center", fontWeight: 600 }]}>{formatCurrency(data.threeYearValue)}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 600 }]}>Investment</Text>
          <Text style={[styles.tableCellMuted, { flex: 1, textAlign: "center" }]}>{formatCurrency(data.year1Cost)}</Text>
          <Text style={[styles.tableCellMuted, { flex: 1, textAlign: "center" }]}>{formatCurrency(data.year2Cost)}</Text>
          <Text style={[styles.tableCellMuted, { flex: 1, textAlign: "center" }]}>{formatCurrency(data.year3Cost)}</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: "center", fontWeight: 600 }]}>{formatCurrency(data.threeYearCost)}</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 600 }]}>Net Value</Text>
          <Text style={[styles.tableCellMuted, { flex: 1, textAlign: "center" }]}>{formatCurrency(data.year1Value - data.year1Cost)}</Text>
          <Text style={[styles.tableCellMuted, { flex: 1, textAlign: "center" }]}>{formatCurrency(data.year2Value - data.year2Cost)}</Text>
          <Text style={[styles.tableCellMuted, { flex: 1, textAlign: "center" }]}>{formatCurrency(data.year3Value - data.year3Cost)}</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: "center", fontWeight: 700, color: brand.abridgeRed }]}>{formatCurrency(data.threeYearNet)}</Text>
        </View>
      </View>
      
      <View style={[styles.statBox, { marginTop: 24 }]}>
        <Text style={styles.statValue}>{data.roi > 0 ? `${Math.round(data.roi)}%` : "N/A"}</Text>
        <Text style={styles.statLabel}>Return on Investment</Text>
      </View>
      
      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>INVESTMENT DETAILS</Text>
        <Text style={styles.calloutText}>
          Annual investment of {formatCurrency(data.investment)} ({formatCurrency(data.costPerBed)}/bed/month) for {formatNumber(data.staffedBeds)} staffed beds
        </Text>
      </View>
    </View>
    
    <View style={styles.footer}>
      <Text style={styles.footerPage}>Page {pageNum}</Text>
    </View>
  </Page>
);

const NursingROIDocument = ({ data }: { data: NursingPDFData }) => (
  <Document>
    <ROICoverPage data={data} />
    <ROISummaryPage data={data} pageNum={2} />
    <ROIInvestmentPage data={data} pageNum={3} />
  </Document>
);

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function generateNursingROIPDF(data: NursingPDFData): Promise<void> {
  const clientSlug = data.clientName ? data.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
  const today = new Date().toISOString().split('T')[0];
  const fileName = clientSlug 
    ? `Abridge_Nursing_ROI_${clientSlug}_${today}.pdf`
    : `Abridge_Nursing_ROI_${today}.pdf`;
  
  const blob = await pdf(<NursingROIDocument data={data} />).toBlob();
  saveAs(blob, fileName);
}

export async function generateNursingROIPDFBlob(data: NursingPDFData): Promise<{ blob: Blob; filename: string }> {
  const clientSlug = data.clientName ? data.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
  const today = new Date().toISOString().split('T')[0];
  const filename = clientSlug 
    ? `Abridge_Nursing_ROI_${clientSlug}_${today}.pdf`
    : `Abridge_Nursing_ROI_${today}.pdf`;
  
  const blob = await pdf(<NursingROIDocument data={data} />).toBlob();
  return { blob, filename };
}

// Legacy export for backward compatibility
export async function generateNursingPDF(data: NursingPDFData): Promise<void> {
  return generateNursingROIPDF(data);
}
