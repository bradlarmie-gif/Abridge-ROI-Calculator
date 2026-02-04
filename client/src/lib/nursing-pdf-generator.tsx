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
  borderGray: "#E0E0E0",
  tableHeader: "#F8F8F8",
  cardBg: "#FFFFFF",
  abridgeRed: "#EA2C00",
  warmBeige: "#F5F0EB",  // Abridge brand beige for headers
  
  // Badge colors
  directMeasurableBg: "#E8F5E9",
  directMeasurableText: "#2E7D32",
  indirectBg: "#FFF3E0",
  indirectText: "#E65100",
  potentialBg: "#F5F5F5",
  potentialText: "#666666",
  qualitativeBg: "#FAFAFA",
  qualitativeText: "#999999",
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
  
  // Header - Premium beige bar
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: -36,
    marginLeft: -36,
    marginRight: -36,
    paddingVertical: 8,
    paddingHorizontal: 36,
    backgroundColor: brand.warmBeige,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderGray,
  },
  logo: {
    width: 72,
    height: 18,
  },
  headerTitle: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: brand.mediumGray,
    letterSpacing: 1.5,
  },
  
  // Section headers
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 2,
    borderBottomColor: brand.black,
  },
  subSectionHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 4,
  },
  
  // Title section
  mainTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: brand.mediumGray,
    marginBottom: 10,
  },
  
  // Body text - readable
  bodyText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: brand.darkGray,
    marginBottom: 6,
  },
  
  // Two-column layout
  twoColumn: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  column: {
    flex: 1,
  },
  
  // Three-column layout
  threeColumn: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  thirdColumn: {
    flex: 1,
  },
  
  // Cards - readable
  card: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 8,
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
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  cardLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginTop: 6,
    marginBottom: 1,
  },
  cardText: {
    fontSize: 8,
    lineHeight: 1.3,
    color: brand.darkGray,
  },
  
  // Full-width card
  fullWidthCard: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 8,
    backgroundColor: brand.cardBg,
    marginBottom: 8,
  },
  
  // Callout box - beige background
  callout: {
    borderLeftWidth: 3,
    borderLeftColor: brand.abridgeRed,
    paddingLeft: 10,
    paddingVertical: 6,
    backgroundColor: brand.warmBeige,
    marginBottom: 8,
  },
  calloutText: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.35,
    color: brand.darkGray,
  },
  
  // Tables - readable
  table: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    marginBottom: 8,
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
    paddingVertical: 3,
    paddingHorizontal: 5,
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
    paddingVertical: 3,
    paddingHorizontal: 5,
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
  
  // Honest limits columns
  limitsColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 6,
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
    marginBottom: 4,
  },
  limitsBullet: {
    fontSize: 8,
    color: brand.darkGray,
    marginBottom: 1,
  },
  
  // Summary box
  summaryBox: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 10,
    marginBottom: 8,
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
    marginBottom: 3,
    textDecoration: "underline",
  },
  summaryItem: {
    fontSize: 8,
    color: brand.darkGray,
    marginBottom: 1,
  },
  
  // Quote box
  quoteBox: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 10,
    marginTop: 6,
    marginBottom: 8,
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
    connected: { bg: "#E3F2FD", text: "#1565C0", label: "CONNECTED TO RETENTION" },
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
// PAGE 1: COVER + CONTEXT + LABOR ECONOMICS
// ============================================================================

function Page1() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      {/* Title Section */}
      <Text style={styles.mainTitle}>NURSING: HOW WE THINK ABOUT VALUE</Text>
      <Text style={styles.subtitle}>A framework for understanding where value lives when there's no billing</Text>
      
      {/* Context Section */}
      <Text style={styles.sectionHeader}>THE CONTEXT</Text>
      <Text style={styles.bodyText}>
        Nursing is the hardest setting to model ROI--and the most important to get right. In outpatient medicine, a physician saves 4 minutes per visit, and you can trace a path to wRVU lift or capacity expansion. The billing relationship creates a clear value chain.
      </Text>
      <Text style={styles.bodyText}>
        Nurses don't bill. They don't generate wRVUs. And yet nursing documentation burden is massive--25-35% of every shift spent on flowsheets, assessments, handoffs, and charting. So where does the value live?
      </Text>
      
      {/* Two Value Buckets */}
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>LABOR ECONOMICS</Text>
          <Text style={styles.cardText}>
            Overtime, retention, and agency spend. These are real dollars that show up in the budget. When nurses spend less time documenting, they finish shifts on time, burn out less, and the organization needs fewer expensive travel nurses.
          </Text>
          <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CARE QUALITY ENABLEMENT</Text>
          <Text style={styles.cardText}>
            Falls, pressure injuries, patient satisfaction. These outcomes are influenced by bedside time. More time caring, less time charting, better outcomes. But the causal chain is indirect--documentation supports care, it doesn't replace it.
          </Text>
          <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Potential value (we show separately)</Text>
          </View>
        </View>
      </View>
      
      {/* Labor Economics Section */}
      <Text style={styles.sectionHeader}>VALUE MECHANISMS -- LABOR ECONOMICS</Text>
      
      <View style={styles.twoColumn}>
        {/* Overtime Reduction */}
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>OVERTIME REDUCTION</Text>
          <Badge type="direct" />
          
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            When nurses spend less time documenting, they complete shifts on time. Not all time saved becomes OT reduction--some goes to care--but a portion does.
          </Text>
          
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Hours saved × Conversion rate (15-40%) × OT rate (1.5× base) = OT Savings
          </Text>
          
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            OT hours and doc time are both measurable. The link is logical and validatable post-implementation.
          </Text>
        </View>
        
        {/* Retention Savings */}
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>RETENTION SAVINGS</Text>
          <Badge type="indirect" />
          
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            Documentation burden is a top driver of nurse burnout. Burnout drives turnover. Reducing burden can help retain nurses who would otherwise leave.
          </Text>
          
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            FTEs × Turnover × Burnout% × Abridge impact (10-25%) × Replacement cost = Retention value
          </Text>
          
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            Link between doc burden and burnout is well-established in nursing research. Question is magnitude, not direction.
          </Text>
        </View>
      </View>
      
      {/* Agency Labor - Full Width */}
      <View style={styles.fullWidthCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Text style={styles.cardTitle}>AGENCY LABOR REDUCTION</Text>
          <Badge type="connected" />
        </View>
        <Text style={styles.cardText}>
          When nurses leave, hospitals fill gaps with agency/travel nurses at 2-3× the cost. Improved retention directly reduces this premium labor dependency.
        </Text>
        <Text style={[styles.cardText, { marginTop: 6 }]}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Calculation:</Text> Nurses retained × Weeks of coverage (8-16) × Weekly premium ($2-4K) = Agency savings. This is separate from replacement cost--retention captures replacement, agency captures premium labor during vacancy.
        </Text>
      </View>
      
      <PageFooter pageNum={1} />
    </Page>
  );
}

// ============================================================================
// PAGE 2: CARE QUALITY + HONEST LIMITS
// ============================================================================

function Page2() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.sectionHeader}>VALUE MECHANISMS -- CARE QUALITY ENABLEMENT</Text>
      
      {/* Why Potential Value */}
      <Text style={styles.subSectionHeader}>WHY WE CALL THIS "POTENTIAL" VALUE</Text>
      <Text style={styles.bodyText}>
        The link between documentation and care quality is indirect. We don't cause fewer falls--we enable the visibility that helps prevent them.
      </Text>
      
      {/* Flow Diagram */}
      <View style={styles.flowDiagram}>
        <View style={styles.flowBox}>
          <Text style={styles.flowBoxText}>Documentation</Text>
          <Text style={styles.flowCaption}>We control this</Text>
        </View>
        <Text style={styles.flowArrow}>&gt;</Text>
        <View style={styles.flowBox}>
          <Text style={styles.flowBoxText}>Visibility</Text>
          <Text style={styles.flowCaption}>We support this</Text>
        </View>
        <Text style={styles.flowArrow}>&gt;</Text>
        <View style={styles.flowBox}>
          <Text style={styles.flowBoxText}>Intervention</Text>
          <Text style={styles.flowCaption}>Clinical team controls</Text>
        </View>
        <Text style={styles.flowArrow}>&gt;</Text>
        <View style={styles.flowBox}>
          <Text style={styles.flowBoxText}>Outcome</Text>
          <Text style={styles.flowCaption}>Patient experiences</Text>
        </View>
      </View>
      
      <Text style={[styles.bodyText, { fontSize: 8 }]}>
        We show care quality separately because: clinical practice matters more than documentation, many factors influence outcomes, and we want to be honest.
      </Text>
      
      <View style={styles.twoColumn}>
        {/* HAPI Prevention */}
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>HAPI PREVENTION</Text>
          <Badge type="potential" />
          
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            HAPIs happen when assessments are missed or interventions delayed. Real-time documentation ensures skin assessments, turning schedules, and risk factors are captured--enabling earlier intervention.
          </Text>
          
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Current HAPIs × Documentation-preventable rate (5%) × Cost per HAPI ($10-50K) = Potential value
          </Text>
          
          <Text style={styles.cardLabel}>WHY 5%?</Text>
          <Text style={styles.cardText}>
            Not all HAPIs are doc-preventable. 5% represents cases where real-time assessment would have triggered earlier intervention.
          </Text>
          
          <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Oblique" }]}>
            HONEST TRUTH: HAPIs are prevented through clinical care--turning, positioning, nutrition. Doc SUPPORTS this, doesn't REPLACE it.
          </Text>
        </View>
        
        {/* Falls Prevention */}
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>FALLS PREVENTION</Text>
          <Badge type="potential" />
          
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            Falls happen when risk assessments are missed or interventions delayed. Real-time documentation ensures fall risk scores, mobility status, and environmental factors are captured--enabling earlier action.
          </Text>
          
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Current falls × Documentation-preventable rate (5%) × Cost per fall ($3-30K) = Potential value
          </Text>
          
          <Text style={styles.cardLabel}>WHY 5%?</Text>
          <Text style={styles.cardText}>
            Not all falls are doc-preventable. 5% represents cases where real-time risk documentation would have triggered intervention.
          </Text>
          
          <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Oblique" }]}>
            CMS does NOT reimburse for hospital-acquired fall injuries. This is pure cost to the hospital.
          </Text>
        </View>
      </View>
      
      {/* HCAHPS - Full Width */}
      <View style={styles.fullWidthCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Text style={styles.cardTitle}>PATIENT EXPERIENCE (HCAHPS)</Text>
          <Badge type="qualitative" />
        </View>
        <Text style={styles.cardText}>
          When nurses spend less time documenting, they spend more time with patients. Research shows bedside time correlates with satisfaction. But HCAHPS is influenced by dozens of factors--wait times, pain management, communication, environment, staffing. We can't credibly attribute improvement to docs alone.
        </Text>
        <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Bold" }]}>
          BUT CONSIDER: Top quartile HCAHPS = ~2% higher reimbursement via VBP. Track as leading indicator post-implementation.
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
          <Text style={styles.limitsBullet}>- Shift completion</Text>
          <Text style={styles.limitsBullet}>- Chart completion</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[~] WHAT WE INFLUENCE</Text>
          <Text style={styles.limitsSubtext}>Indirect attribution</Text>
          <Text style={styles.limitsBullet}>- Turnover rates (one factor of many)</Text>
          <Text style={styles.limitsBullet}>- Agency utilization (tied to retention)</Text>
          <Text style={styles.limitsBullet}>- Nurse satisfaction (doc burden is one)</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[ ] WHAT WE ENABLE</Text>
          <Text style={styles.limitsSubtext}>Supportive only</Text>
          <Text style={styles.limitsBullet}>- Falls prevention (clinical practice)</Text>
          <Text style={styles.limitsBullet}>- HAPI prevention (clinical practice)</Text>
          <Text style={styles.limitsBullet}>- HCAHPS improvement (many factors)</Text>
        </View>
      </View>
      
      <PageFooter pageNum={2} />
    </Page>
  );
}

// ============================================================================
// PAGE 3: ASSUMPTIONS + VALIDATION PATH
// ============================================================================

function Page3() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.sectionHeader}>KEY ASSUMPTIONS</Text>
      <Text style={styles.bodyText}>
        Every number has a source. We don't hide assumptions--we highlight them.
      </Text>
      
      {/* Time Savings Table */}
      <Text style={styles.subSectionHeader}>TIME SAVINGS</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Source</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Time saved per shift</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15-30 min</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20 min</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Abridge customer data</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>OT conversion rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15-40%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>25%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Implementation studies</Text>
        </View>
      </View>
      
      {/* Retention Table */}
      <Text style={styles.subSectionHeader}>RETENTION</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Source</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Nurse turnover rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15-25%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>18%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>NSI Nursing Solutions '24</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Burnout-related %</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>30-50%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>40%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>ANA research</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Abridge retention impact</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>10-25%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Conservative estimate</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Replacement cost</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$40-65K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$52K</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>NSI 2024 Report</Text>
        </View>
      </View>
      
      {/* Agency & Care Quality Tables - Side by Side */}
      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <Text style={styles.subSectionHeader}>AGENCY</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Weeks of coverage</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>8-16 wks</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>12 wks</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Weekly agency premium</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$2-4K</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$2,500</Text>
            </View>
          </View>
        </View>
        <View style={styles.column}>
          <Text style={styles.subSectionHeader}>CARE QUALITY</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Doc-preventable rate</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>3-8%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>5%</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Cost per HAPI</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$10-50K</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$26K</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Cost per fall</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$3-30K</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$6.5K</Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Conservative Callout */}
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>WHY WE DEFAULT CONSERVATIVE: </Text>
          We'd rather show a smaller number you can defend than a larger number that falls apart under scrutiny. If conservative projection shows positive ROI, you can be confident. If experience exceeds it, that's upside.
        </Text>
      </View>
      
      {/* Validation Path Section */}
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
          <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-4 weeks</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>OVERTIME REDUCTION</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Baseline OT hours per unit/month</Text>
          <Text style={styles.cardText}>- Note seasonal patterns</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track OT on Abridge vs. control</Text>
          <Text style={styles.cardText}>- Control for census/acuity changes</Text>
          <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-3 months</Text>
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
          <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Bold" }]}>Timeline: 12-18 months</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CARE QUALITY</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Baseline HAPI/falls rates by unit</Text>
          <Text style={styles.cardText}>- Baseline HCAHPS scores</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track rates Abridge vs control</Text>
          <Text style={styles.cardText}>- Be cautious about attribution</Text>
          <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Oblique" }]}>Treat quality as bonus, not promise</Text>
        </View>
      </View>
      
      <PageFooter pageNum={3} />
    </Page>
  );
}

// ============================================================================
// PAGE 4: CONNECTED VALUE + SUMMARY
// ============================================================================

function Page4() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.sectionHeader}>CONNECTED VALUE</Text>
      
      <Text style={styles.subSectionHeader}>NURSING DOCUMENTATION FEEDS THE REVENUE CYCLE</Text>
      <Text style={styles.bodyText}>
        When nurses document thoroughly and in real-time, it directly impacts inpatient revenue. Complete nursing documentation creates a clinical picture that supports accurate coding and stronger appeals.
      </Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CC/MCC CAPTURE</Text>
          <Text style={styles.cardText}>
            Nursing assessments capture clinical indicators that support accurate DRG assignment. "Patient appears malnourished" or "skin breakdown observed" feeds coding directly.
          </Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>MEDICAL NECESSITY SUPPORT</Text>
          <Text style={styles.cardText}>
            Real-time nursing documentation provides contemporaneous evidence of patient acuity and care needs--critical for payer appeals.
          </Text>
          <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>CDI EFFICIENCY</Text>
            <Text style={styles.cardText}>
              When nursing documentation is complete, CDI teams have better source material for identifying coding opportunities.
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.bodyText, { marginTop: 4 }]}>
        These benefits are quantified in the Inpatient Setting methodology. If your organization uses Abridge for both Nursing and Hospitalists, documentation creates a complete clinical picture supporting accurate coding from admission through discharge.
      </Text>
      
      {/* Validation Timelines Table */}
      <Text style={styles.sectionHeader}>VALIDATION TIMELINES</Text>
      
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Metric</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Timeline to Meaningful Data</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Documentation time</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-4 weeks</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Overtime reduction</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-3 months</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Nurse satisfaction</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>3-6 months</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>HAC rates</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>6-12 months</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Retention impact</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>12-18 months</Text>
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
      
      <Text style={[styles.bodyText, { textAlign: "center" as const, fontFamily: "Helvetica-Bold" }]}>
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
