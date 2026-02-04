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
// DENSE COLOR PALETTE - Bloomberg/Economist Style
// ============================================================================

const brand = {
  black: "#000000",
  darkGray: "#333333",
  mediumGray: "#666666",
  lightGray: "#999999",
  borderGray: "#D0D0D0",  // FIX 4: More visible borders
  tableHeader: "#F8F8F8",
  cardBg: "#FAFAFA",  // FIX 4: Subtle card background
  abridgeRed: "#EA2C00",
  warmBeige: "#F5F0EB",  // Abridge brand beige for headers
  
  // FIX 5: Bolder badge colors
  directMeasurableBg: "#D4EDDA",
  directMeasurableText: "#155724",
  indirectBg: "#FFF3CD",
  indirectText: "#856404",
  potentialBg: "#E9ECEF",
  potentialText: "#495057",
  qualitativeBg: "#F8F9FA",
  qualitativeText: "#6C757D",
  connectedBg: "#D1ECF1",
  connectedText: "#0C5460",
};

// ============================================================================
// DENSE TYPOGRAPHY - Bloomberg Style
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 36, // 0.5" margins
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.3,
    color: brand.darkGray,
    backgroundColor: "#FFFFFF",
  },
  
  // Header - Premium beige bar (FIX 6: smaller logo, FIX 2: reduced letter-spacing)
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,  // FIX 7: reduced from 8
    marginTop: -36,
    marginLeft: -36,
    marginRight: -36,
    paddingVertical: 6,  // FIX 7: reduced from 8
    paddingHorizontal: 36,
    backgroundColor: brand.warmBeige,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderGray,
  },
  logo: {
    width: 54,  // FIX 6: reduced from 72 (25% smaller)
    height: 14, // FIX 6: reduced from 18
  },
  headerTitle: {
    fontSize: 9,  // FIX 2: reduced from 10
    fontFamily: "Helvetica-Bold",
    color: brand.mediumGray,
    letterSpacing: 0.5,  // FIX 2: reduced from 1.5 (subtle tracking, not separated)
  },
  
  // Section headers (FIX 7: tighter spacing)
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    letterSpacing: 0.5,
    marginTop: 10,  // FIX 7: reduced from 12
    marginBottom: 5,  // FIX 7: reduced from 6
    paddingBottom: 2,  // FIX 7: reduced from 3
    borderBottomWidth: 2,
    borderBottomColor: brand.black,
  },
  subSectionHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 3,  // FIX 7: reduced from 4
  },
  
  // Title section (FIX 7: tighter spacing)
  mainTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 2,  // FIX 7: reduced from 3
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: brand.mediumGray,
    marginBottom: 8,  // FIX 7: reduced from 10
  },
  
  // Body text - readable (FIX 7: tighter spacing)
  bodyText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: brand.darkGray,
    marginBottom: 5,  // FIX 7: reduced from 6
  },
  
  // Two-column layout (FIX 7: tighter spacing)
  twoColumn: {
    flexDirection: "row",
    gap: 6,  // FIX 7: reduced from 8
    marginBottom: 6,  // FIX 7: reduced from 8
  },
  column: {
    flex: 1,
  },
  
  // Three-column layout (FIX 7: tighter spacing)
  threeColumn: {
    flexDirection: "row",
    gap: 5,  // FIX 7: reduced from 6
    marginBottom: 6,  // FIX 7: reduced from 8
  },
  thirdColumn: {
    flex: 1,
  },
  
  // Cards - readable (FIX 7: tighter spacing)
  card: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 6,  // FIX 7: reduced from 8
    backgroundColor: brand.cardBg,
  },
  cardTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,  // Slightly reduced
    marginBottom: 5,  // FIX 7: reduced from 6
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  cardLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginTop: 5,  // FIX 7: reduced from 6
    marginBottom: 1,
  },
  cardText: {
    fontSize: 8,
    lineHeight: 1.3,
    color: brand.darkGray,
  },
  
  // Full-width card (FIX 7: tighter spacing)
  fullWidthCard: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 6,  // FIX 7: reduced from 8
    backgroundColor: brand.cardBg,
    marginBottom: 6,  // FIX 7: reduced from 8
  },
  
  // Callout box - beige background (FIX 7: tighter spacing)
  callout: {
    borderLeftWidth: 3,
    borderLeftColor: brand.abridgeRed,
    paddingLeft: 8,  // FIX 7: reduced from 10
    paddingVertical: 5,  // FIX 7: reduced from 6
    backgroundColor: brand.warmBeige,
    marginBottom: 6,  // FIX 7: reduced from 8
  },
  calloutText: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.35,
    color: brand.darkGray,
  },
  
  // Tables - readable (FIX 7: tighter spacing)
  table: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    marginBottom: 6,  // FIX 7: reduced from 8
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.tableHeader,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderGray,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    paddingVertical: 2,  // FIX 7: reduced from 3
    paddingHorizontal: 4,  // FIX 7: reduced from 5
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: brand.borderGray,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 8,
    color: brand.darkGray,
    paddingVertical: 2,  // FIX 7: reduced from 3
    paddingHorizontal: 4,  // FIX 7: reduced from 5
  },
  
  // Flow diagram
  flowDiagram: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 6,
    gap: 5,
  },
  flowBox: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 2,
  },
  flowBoxText: {
    fontSize: 8,
    color: brand.darkGray,
    textAlign: "center" as const,
  },
  flowArrow: {
    fontSize: 10,
    color: brand.lightGray,
  },
  flowCaption: {
    fontSize: 7,
    color: brand.lightGray,
    textAlign: "center" as const,
    marginTop: 1,
  },
  
  // Honest limits columns (FIX 7: tighter spacing)
  limitsColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 5,  // FIX 7: reduced from 6
    backgroundColor: brand.cardBg,
  },
  limitsHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 2,
  },
  limitsSubtext: {
    fontSize: 7,
    color: brand.mediumGray,
    marginBottom: 3,  // FIX 7: reduced from 4
  },
  limitsBullet: {
    fontSize: 8,
    color: brand.darkGray,
    marginBottom: 1,
  },
  
  // Summary box (FIX 7: tighter spacing)
  summaryBox: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 8,  // FIX 7: reduced from 10
    marginBottom: 6,  // FIX 7: reduced from 8
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryColumn: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 2,  // FIX 7: reduced from 3
    textDecoration: "underline",
  },
  summaryItem: {
    fontSize: 8,
    color: brand.darkGray,
    marginBottom: 1,
  },
  
  // Quote box (FIX 7: tighter spacing)
  quoteBox: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 8,  // FIX 7: reduced from 10
    marginTop: 5,  // FIX 7: reduced from 6
    marginBottom: 6,  // FIX 7: reduced from 8
  },
  quoteText: {
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.4,
    color: brand.darkGray,
    textAlign: "center" as const,
  },
  
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: brand.borderGray,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: brand.lightGray,
  },
  footerPage: {
    fontSize: 8,
    color: brand.lightGray,
  },
});

// ============================================================================
// BADGE COMPONENT
// ============================================================================

function Badge({ type }: { type: "direct" | "indirect" | "potential" | "qualitative" | "connected" }) {
  const config = {
    direct: { bg: brand.directMeasurableBg, text: brand.directMeasurableText, label: "DIRECTLY MEASURABLE" },
    indirect: { bg: brand.indirectBg, text: brand.indirectText, label: "INDIRECTLY ATTRIBUTABLE" },
    potential: { bg: brand.potentialBg, text: brand.potentialText, label: "POTENTIAL VALUE" },
    qualitative: { bg: brand.qualitativeBg, text: brand.qualitativeText, label: "QUALITATIVE" },
    connected: { bg: brand.connectedBg, text: brand.connectedText, label: "CONNECTED TO RETENTION" },  // FIX 5: bolder colors
  };
  const c = config[type];
  
  return (
    <Text style={[styles.cardSubtitle, { backgroundColor: c.bg, color: c.text }]}>
      {c.label}
    </Text>
  );
}

// ============================================================================
// PAGE HEADER
// ============================================================================

function PageHeader() {
  return (
    <View style={styles.header}>
      <Image src={abridgeLogoPath} style={styles.logo} />
      <Text style={styles.headerTitle}>ROI METHODOLOGY</Text>
    </View>
  );
}

// ============================================================================
// PAGE FOOTER
// ============================================================================

function PageFooter({ pageNum }: { pageNum: number }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Abridge ROI Methodology · Nursing</Text>
      <Text style={styles.footerPage}>Page {pageNum}/4</Text>
    </View>
  );
}

// ============================================================================
// PAGE 1: COVER + CONTEXT (breathing room)
// ============================================================================

function Page1() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      {/* Title Section */}
      <Text style={styles.mainTitle}>NURSING: HOW WE THINK ABOUT VALUE</Text>
      <Text style={styles.subtitle}>A transparent methodology for calculating return on investment</Text>
      
      {/* Context Section */}
      <Text style={styles.sectionHeader}>THE CONTEXT</Text>
      <Text style={styles.bodyText}>
        Nursing is the hardest setting to model ROI--and the most important to get right. In outpatient medicine, a physician saves 4 minutes per visit, and you can trace a path to wRVU lift or capacity expansion. The billing relationship creates a clear value chain.
      </Text>
      <Text style={styles.bodyText}>
        Nurses don't bill. They don't generate wRVUs. And yet nursing documentation burden is massive--25-35% of every shift spent on flowsheets, assessments, handoffs, and charting. So where does the value live?
      </Text>
      
      {/* Two Value Buckets */}
      <Text style={styles.sectionHeader}>TWO VALUE CATEGORIES</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>LABOR ECONOMICS</Text>
          <Text style={styles.cardText}>
            Overtime, retention, and agency spend. These are real dollars that show up in the budget. When nurses spend less time documenting, they finish shifts on time, burn out less, and the organization needs fewer expensive travel nurses.
          </Text>
          <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CARE QUALITY ENABLEMENT</Text>
          <Text style={styles.cardText}>
            Falls, pressure injuries, patient satisfaction. These outcomes are influenced by bedside time. More time caring, less time charting, better outcomes. But the causal chain is indirect--documentation supports care, it doesn't replace it.
          </Text>
          <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Potential value (we show separately)</Text>
          </View>
        </View>
      </View>
      
      {/* Key Philosophy */}
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>OUR APPROACH: </Text>
          We model both categories--but we're honest about what's directly measurable versus what we only enable. Labor economics value is defensible in CFO conversations. Care quality potential is real but requires clinical practice to realize.
        </Text>
      </View>
      
      {/* Framework Preview */}
      <Text style={styles.sectionHeader}>WHAT WE MODEL</Text>
      
      <View style={styles.threeColumn}>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>DIRECT VALUE</Text>
          <Text style={styles.limitsSubtext}>Measurable, attributable</Text>
          <Text style={styles.limitsBullet}>- Overtime reduction</Text>
          <Text style={styles.limitsBullet}>- Agency labor avoidance</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>INDIRECT VALUE</Text>
          <Text style={styles.limitsSubtext}>Influenced, not controlled</Text>
          <Text style={styles.limitsBullet}>- Retention savings</Text>
          <Text style={styles.limitsBullet}>- Burnout reduction</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>POTENTIAL VALUE</Text>
          <Text style={styles.limitsSubtext}>Enabled, not caused</Text>
          <Text style={styles.limitsBullet}>- Falls prevention</Text>
          <Text style={styles.limitsBullet}>- HAPI prevention</Text>
          <Text style={styles.limitsBullet}>- Patient experience</Text>
        </View>
      </View>
      
      <PageFooter pageNum={1} />
    </Page>
  );
}

// ============================================================================
// PAGE 2: ALL VALUE MECHANISMS
// ============================================================================

function Page2() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.sectionHeader}>VALUE MECHANISMS</Text>
      
      {/* Row 1: Overtime + Retention */}
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>OVERTIME REDUCTION</Text>
          <Badge type="direct" />
          <Text style={styles.cardLabel}>MECHANISM</Text>
          <Text style={styles.cardText}>
            When nurses spend less time documenting, they complete shifts on time. Not all time saved becomes OT reduction--some goes to care--but a measurable portion does.
          </Text>
          <Text style={styles.cardLabel}>CALCULATION</Text>
          <Text style={styles.cardText}>
            Hours saved × Conversion rate (15-40%) × OT rate (1.5× base) = OT Savings
          </Text>
        </View>
        
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>RETENTION SAVINGS</Text>
          <Badge type="indirect" />
          <Text style={styles.cardLabel}>MECHANISM</Text>
          <Text style={styles.cardText}>
            Documentation burden is a top driver of nurse burnout. Burnout drives turnover. Reducing burden can help retain nurses who would otherwise leave.
          </Text>
          <Text style={styles.cardLabel}>CALCULATION</Text>
          <Text style={styles.cardText}>
            FTEs × Turnover × Burnout% × Abridge impact (10-25%) × Replacement cost
          </Text>
        </View>
      </View>
      
      {/* Row 2: Agency + HAPI */}
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>AGENCY LABOR REDUCTION</Text>
          <Badge type="connected" />
          <Text style={styles.cardLabel}>MECHANISM</Text>
          <Text style={styles.cardText}>
            When nurses leave, hospitals fill gaps with agency/travel nurses at 2-3× the cost. Improved retention directly reduces premium labor dependency.
          </Text>
          <Text style={styles.cardLabel}>CALCULATION</Text>
          <Text style={styles.cardText}>
            Nurses retained × Weeks of coverage (8-16) × Weekly premium ($2-4K)
          </Text>
        </View>
        
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>HAPI PREVENTION</Text>
          <Badge type="potential" />
          <Text style={styles.cardLabel}>MECHANISM</Text>
          <Text style={styles.cardText}>
            Real-time documentation ensures skin assessments, turning schedules, and risk factors are captured--enabling earlier intervention for pressure injuries.
          </Text>
          <Text style={styles.cardLabel}>CALCULATION</Text>
          <Text style={styles.cardText}>
            Current HAPIs × Doc-preventable rate (5%) × Cost per HAPI ($10-50K)
          </Text>
        </View>
      </View>
      
      {/* Row 3: Falls + HCAHPS */}
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>FALLS PREVENTION</Text>
          <Badge type="potential" />
          <Text style={styles.cardLabel}>MECHANISM</Text>
          <Text style={styles.cardText}>
            Real-time documentation ensures fall risk scores, mobility status, and environmental factors are captured--enabling earlier preventive action.
          </Text>
          <Text style={styles.cardLabel}>CALCULATION</Text>
          <Text style={styles.cardText}>
            Current falls × Doc-preventable rate (5%) × Cost per fall ($3-30K)
          </Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Oblique", fontSize: 7 }]}>
            CMS does NOT reimburse for hospital-acquired fall injuries.
          </Text>
        </View>
        
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>PATIENT EXPERIENCE</Text>
          <Badge type="qualitative" />
          <Text style={styles.cardLabel}>MECHANISM</Text>
          <Text style={styles.cardText}>
            When nurses spend less time documenting, they spend more time with patients. Research shows bedside time correlates with satisfaction scores.
          </Text>
          <Text style={styles.cardLabel}>CONSIDERATION</Text>
          <Text style={styles.cardText}>
            HCAHPS is influenced by dozens of factors. Track as directional indicator.
          </Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Oblique", fontSize: 7 }]}>
            Top quartile HCAHPS = ~2% higher reimbursement via VBP.
          </Text>
        </View>
      </View>
      
      {/* Why Potential Value Callout */}
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>WHY "POTENTIAL" VALUE: </Text>
          The link between documentation and care quality is indirect. We don't cause fewer falls--we enable the visibility that helps prevent them. Clinical practice matters more than documentation.
        </Text>
      </View>
      
      <PageFooter pageNum={2} />
    </Page>
  );
}

// ============================================================================
// PAGE 3: ASSUMPTIONS + HONEST LIMITS
// ============================================================================

function Page3() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.sectionHeader}>KEY ASSUMPTIONS</Text>
      <Text style={styles.bodyText}>
        Every number has a source. We don't hide assumptions--we highlight them so you can adjust based on your reality.
      </Text>
      
      {/* Combined Assumptions Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Assumption</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Source</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Time saved per shift</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15-30 min</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20 min</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Abridge customer data</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>OT conversion rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15-40%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>25%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Implementation studies</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Nurse turnover rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15-25%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>18%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>NSI Nursing Solutions 2024</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Burnout-related turnover %</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>30-50%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>40%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>ANA research</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Abridge retention impact</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>10-25%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Conservative estimate</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Nurse replacement cost</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$40-65K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$52K</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>NSI 2024 Report</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Agency coverage weeks</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>8-16 wks</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>12 wks</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Industry average</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Weekly agency premium</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$2-4K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$2,500</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Travel nurse rates</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Doc-preventable HAC rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>3-8%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>5%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Conservative estimate</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Cost per HAPI</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$10-50K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$26K</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>AHRQ data</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Cost per fall with injury</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$3-30K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$6.5K</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>CMS data</Text>
        </View>
      </View>
      
      {/* Conservative Callout */}
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>WHY WE DEFAULT CONSERVATIVE: </Text>
          We'd rather show a smaller number you can defend than a larger number that falls apart under scrutiny. If conservative projection shows positive ROI, you can be confident. If experience exceeds it, that's upside.
        </Text>
      </View>
      
      {/* Honest Limits Section */}
      <Text style={styles.sectionHeader}>THE HONEST LIMITS</Text>
      
      <View style={styles.threeColumn}>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[+] WHAT WE MEASURE</Text>
          <Text style={styles.limitsSubtext}>Direct attribution</Text>
          <Text style={styles.limitsBullet}>- OT hours pre/post</Text>
          <Text style={styles.limitsBullet}>- Doc time per shift</Text>
          <Text style={styles.limitsBullet}>- Shift completion rates</Text>
          <Text style={styles.limitsBullet}>- Chart completion timing</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[~] WHAT WE INFLUENCE</Text>
          <Text style={styles.limitsSubtext}>Indirect attribution</Text>
          <Text style={styles.limitsBullet}>- Turnover rates (one factor)</Text>
          <Text style={styles.limitsBullet}>- Agency utilization</Text>
          <Text style={styles.limitsBullet}>- Nurse satisfaction</Text>
          <Text style={styles.limitsBullet}>- Burnout indicators</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[ ] WHAT WE ENABLE</Text>
          <Text style={styles.limitsSubtext}>Supportive only</Text>
          <Text style={styles.limitsBullet}>- Falls prevention</Text>
          <Text style={styles.limitsBullet}>- HAPI prevention</Text>
          <Text style={styles.limitsBullet}>- HCAHPS improvement</Text>
          <Text style={styles.limitsBullet}>- Clinical outcomes</Text>
        </View>
      </View>
      
      <Text style={[styles.bodyText, { fontSize: 8, marginTop: 6 }]}>
        We are explicit about these limits because credibility matters. When we say something is measurable, it is. When we say something is influenced, we acknowledge the complexity. When we say we only enable something, we're being honest that clinical practice is what delivers outcomes.
      </Text>
      
      <PageFooter pageNum={3} />
    </Page>
  );
}

// ============================================================================
// PAGE 4: VALIDATION PATH + SUMMARY
// ============================================================================

function Page4() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.sectionHeader}>VALIDATION PATH</Text>
      <Text style={styles.bodyText}>
        Our projections are starting points. The real answers come from your data.
      </Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>TIME SAVINGS</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Survey nurses on doc time/shift</Text>
          <Text style={styles.cardText}>- Review EHR session data</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Repeat measurements</Text>
          <Text style={styles.cardText}>- Compare with utilization data</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-4 weeks</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>OVERTIME REDUCTION</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Baseline OT hours per unit/month</Text>
          <Text style={styles.cardText}>- Note seasonal patterns</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track OT on Abridge vs. control</Text>
          <Text style={styles.cardText}>- Control for census/acuity changes</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-3 months</Text>
        </View>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>RETENTION</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Baseline turnover by unit</Text>
          <Text style={styles.cardText}>- Exit interview data on burnout</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track turnover Abridge vs control</Text>
          <Text style={styles.cardText}>- Survey on burnout/doc satisfaction</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>Timeline: 12-18 months</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CARE QUALITY</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Baseline HAPI/falls rates by unit</Text>
          <Text style={styles.cardText}>- Baseline HCAHPS scores</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track rates Abridge vs control</Text>
          <Text style={styles.cardText}>- Be cautious about attribution</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Oblique" }]}>Treat quality as bonus, not promise</Text>
        </View>
      </View>
      
      {/* Summary Section */}
      <Text style={styles.sectionHeader}>SUMMARY</Text>
      <Text style={styles.bodyText}>
        Nursing ROI is harder to model than physician ROI because nurses don't bill. But the value is real.
      </Text>
      
      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>TIME VALUE (Direct)</Text>
            <Text style={styles.summaryItem}>OT reduction</Text>
            <Text style={styles.summaryItem}>Retention savings</Text>
            <Text style={styles.summaryItem}>Agency avoidance</Text>
          </View>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>CARE QUALITY (Potential)</Text>
            <Text style={styles.summaryItem}>Falls prevention</Text>
            <Text style={styles.summaryItem}>HAPI prevention</Text>
            <Text style={styles.summaryItem}>Patient experience</Text>
          </View>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>CONNECTED VALUE</Text>
            <Text style={styles.summaryItem}>Nursing documentation</Text>
            <Text style={styles.summaryItem}>feeds inpatient</Text>
            <Text style={styles.summaryItem}>revenue cycle</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.bodyText}>
        We model all three--but we're honest about which is measurable, which is influenceable, and which is only enabled.
      </Text>
      
      {/* Quote Box */}
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          "The goal isn't to prove our model right. It's to build your organization's understanding of what ambient documentation actually delivers in your context. Adjust the model based on what you learn."
        </Text>
      </View>
      
      <Text style={[styles.bodyText, { textAlign: "center" as const, fontFamily: "Helvetica-Bold", marginTop: 4 }]}>
        That honesty is the methodology.
      </Text>
      
      <PageFooter pageNum={4} />
    </Page>
  );
}

// ============================================================================
// METHODOLOGY DOCUMENT
// ============================================================================

function NursingMethodologyDocument() {
  return (
    <Document>
      <Page1 />
      <Page2 />
      <Page3 />
      <Page4 />
    </Document>
  );
}

// ============================================================================
// EXPORT FUNCTIONS - METHODOLOGY PDF
// ============================================================================

export async function generateNursingMethodologyPDF(): Promise<void> {
  try {
    const blob = await pdf(<NursingMethodologyDocument />).toBlob();
    saveAs(blob, "Abridge-Nursing-ROI-Methodology.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

export async function generateNursingMethodologyPDFBlob(): Promise<Blob> {
  try {
    const blob = await pdf(<NursingMethodologyDocument />).toBlob();
    return blob;
  } catch (error) {
    console.error("Error generating PDF blob:", error);
    throw error;
  }
}

// ============================================================================
// ROI PDF EXPORTS - For Summary/Model pages
// ============================================================================

const roiStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333333",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  logo: {
    width: 100,
    height: 25,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: "#666666",
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  label: {
    fontSize: 10,
    color: "#666666",
  },
  value: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
  },
  valueRed: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#EA2C00",
  },
  summaryBox: {
    backgroundColor: "#F8F8F8",
    padding: 16,
    borderRadius: 4,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#EA2C00",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#999999",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 9,
    color: "#333333",
  },
  tableCellMuted: {
    fontSize: 9,
    color: "#666666",
  },
});

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function NursingROIDocument({ data }: { data: NursingPDFData }) {
  return (
    <Document>
      {/* Page 1: Executive Summary */}
      <Page size="LETTER" style={roiStyles.page}>
        <View style={roiStyles.header}>
          <Image src={abridgeLogoPath} style={roiStyles.logo} />
          <Text style={{ fontSize: 9, color: "#999999" }}>ROI Analysis</Text>
        </View>
        
        <Text style={roiStyles.title}>Nursing ROI Analysis</Text>
        <Text style={roiStyles.subtitle}>
          {data.organizationName || "Healthcare Organization"} · {data.careSetting}
        </Text>
        
        <View style={roiStyles.section}>
          <Text style={roiStyles.sectionTitle}>Practice Overview</Text>
          <View style={roiStyles.row}>
            <Text style={roiStyles.label}>Staffed Beds</Text>
            <Text style={roiStyles.value}>{data.staffedBeds}</Text>
          </View>
          <View style={roiStyles.row}>
            <Text style={roiStyles.label}>Nurse FTEs</Text>
            <Text style={roiStyles.value}>{data.nurseFTEs}</Text>
          </View>
          <View style={roiStyles.row}>
            <Text style={roiStyles.label}>Documentation Events/Month</Text>
            <Text style={roiStyles.value}>{data.documentationEvents.toLocaleString()}</Text>
          </View>
          <View style={roiStyles.row}>
            <Text style={roiStyles.label}>Time Saved per Event</Text>
            <Text style={roiStyles.value}>{data.timeSavedPerEvent} min</Text>
          </View>
        </View>
        
        <View style={roiStyles.section}>
          <Text style={roiStyles.sectionTitle}>Value Breakdown</Text>
          {data.drivers.map((driver) => (
            <View key={driver.id} style={roiStyles.row}>
              <Text style={roiStyles.label}>{driver.name}</Text>
              <Text style={driver.isPotentialValue ? roiStyles.value : roiStyles.valueRed}>
                {formatCurrency(driver.value)}
              </Text>
            </View>
          ))}
        </View>
        
        <View style={roiStyles.summaryBox}>
          <Text style={roiStyles.summaryTitle}>Total Annual Value</Text>
          <Text style={roiStyles.summaryValue}>{formatCurrency(data.totalValue)}</Text>
        </View>
        
        <View style={roiStyles.footer}>
          <Text style={roiStyles.footerText}>Abridge Nursing ROI Analysis</Text>
          <Text style={roiStyles.footerText}>Page 1/2</Text>
        </View>
      </Page>
      
      {/* Page 2: Investment & ROI */}
      <Page size="LETTER" style={roiStyles.page}>
        <View style={roiStyles.header}>
          <Image src={abridgeLogoPath} style={roiStyles.logo} />
          <Text style={{ fontSize: 9, color: "#999999" }}>Investment Analysis</Text>
        </View>
        
        <View style={roiStyles.section}>
          <Text style={roiStyles.sectionTitle}>Investment Summary</Text>
          <View style={roiStyles.row}>
            <Text style={roiStyles.label}>Annual Investment</Text>
            <Text style={roiStyles.value}>{formatCurrency(data.investment)}</Text>
          </View>
          <View style={roiStyles.row}>
            <Text style={roiStyles.label}>Cost per Bed</Text>
            <Text style={roiStyles.value}>{formatCurrency(data.costPerBed)}</Text>
          </View>
          <View style={roiStyles.row}>
            <Text style={roiStyles.label}>Net Annual Gain</Text>
            <Text style={roiStyles.valueRed}>{formatCurrency(data.netGain)}</Text>
          </View>
          <View style={roiStyles.row}>
            <Text style={roiStyles.label}>ROI</Text>
            <Text style={roiStyles.valueRed}>{formatPercent(data.roi)}</Text>
          </View>
        </View>
        
        <View style={roiStyles.section}>
          <Text style={roiStyles.sectionTitle}>3-Year Projection</Text>
          <View style={{ borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 4 }}>
            <View style={roiStyles.tableHeader}>
              <Text style={[roiStyles.tableHeaderCell, { flex: 1 }]}>Year</Text>
              <Text style={[roiStyles.tableHeaderCell, { flex: 1, textAlign: "right" as const }]}>Value</Text>
              <Text style={[roiStyles.tableHeaderCell, { flex: 1, textAlign: "right" as const }]}>Cost</Text>
              <Text style={[roiStyles.tableHeaderCell, { flex: 1, textAlign: "right" as const }]}>Net</Text>
            </View>
            <View style={roiStyles.tableRow}>
              <Text style={[roiStyles.tableCell, { flex: 1 }]}>Year 1</Text>
              <Text style={[roiStyles.tableCell, { flex: 1, textAlign: "right" as const }]}>{formatCurrency(data.year1Value)}</Text>
              <Text style={[roiStyles.tableCell, { flex: 1, textAlign: "right" as const }]}>{formatCurrency(data.year1Cost)}</Text>
              <Text style={[roiStyles.tableCell, { flex: 1, textAlign: "right" as const, color: brand.abridgeRed }]}>{formatCurrency(data.year1Value - data.year1Cost)}</Text>
            </View>
            <View style={roiStyles.tableRow}>
              <Text style={[roiStyles.tableCell, { flex: 1 }]}>Year 2</Text>
              <Text style={[roiStyles.tableCell, { flex: 1, textAlign: "right" as const }]}>{formatCurrency(data.year2Value)}</Text>
              <Text style={[roiStyles.tableCell, { flex: 1, textAlign: "right" as const }]}>{formatCurrency(data.year2Cost)}</Text>
              <Text style={[roiStyles.tableCell, { flex: 1, textAlign: "right" as const, color: brand.abridgeRed }]}>{formatCurrency(data.year2Value - data.year2Cost)}</Text>
            </View>
            <View style={[roiStyles.tableRow, roiStyles.tableRowLast]}>
              <Text style={[roiStyles.tableCell, { flex: 1 }]}>Year 3</Text>
              <Text style={[roiStyles.tableCell, { flex: 1, textAlign: "right" as const }]}>{formatCurrency(data.year3Value)}</Text>
              <Text style={[roiStyles.tableCell, { flex: 1, textAlign: "right" as const }]}>{formatCurrency(data.year3Cost)}</Text>
              <Text style={[roiStyles.tableCell, { flex: 1, textAlign: "right" as const, color: brand.abridgeRed }]}>{formatCurrency(data.year3Value - data.year3Cost)}</Text>
            </View>
          </View>
        </View>
        
        <View style={roiStyles.summaryBox}>
          <Text style={roiStyles.summaryTitle}>3-Year Net Value</Text>
          <Text style={roiStyles.summaryValue}>{formatCurrency(data.threeYearNet)}</Text>
        </View>
        
        <View style={roiStyles.footer}>
          <Text style={roiStyles.footerText}>Abridge Nursing ROI Analysis</Text>
          <Text style={roiStyles.footerText}>Page 2/2</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateNursingROIPDF(data: NursingPDFData): Promise<void> {
  try {
    const blob = await pdf(<NursingROIDocument data={data} />).toBlob();
    saveAs(blob, `Abridge-Nursing-ROI-${data.organizationName || "Analysis"}.pdf`);
  } catch (error) {
    console.error("Error generating ROI PDF:", error);
    throw error;
  }
}

export async function generateNursingROIPDFBlob(data: NursingPDFData): Promise<Blob> {
  try {
    const blob = await pdf(<NursingROIDocument data={data} />).toBlob();
    return blob;
  } catch (error) {
    console.error("Error generating ROI PDF blob:", error);
    throw error;
  }
}
