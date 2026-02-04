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
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_(1)_1770226183506.png";

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
  black: "#1A1A1A",
  darkGray: "#333333",
  mediumGray: "#666666",
  lightGray: "#999999",
  borderGray: "#E5E5E5",
  tableBorder: "#E0E0E0",
  tableHeader: "#F5F5F5",
  tableAlt: "#FAFAFA",
  cardBg: "#FFFFFF",
  abridgeRed: "#EA2C00",
  warmBeige: "#F5F0EB",
  calloutBg: "#FFF8F6",
  
  directBg: "#E8F5E9",
  directText: "#1B5E20",
  directBorder: "#C8E6C9",
  
  indirectBg: "#FFF8E1",
  indirectText: "#F57F17",
  indirectBorder: "#FFECB3",
  
  potentialBg: "#F5F5F5",
  potentialText: "#616161",
  potentialBorder: "#E0E0E0",
  
  qualitativeBg: "#ECEFF1",
  qualitativeText: "#78909C",
  qualitativeBorder: "#CFD8DC",
  
  connectedBg: "#E3F2FD",
  connectedText: "#1565C0",
  connectedBorder: "#BBDEFB",
};

// ============================================================================
// STYLES - COMPACT VERSION
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 36,
    paddingBottom: 45,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.35,
    color: brand.darkGray,
    backgroundColor: "#FFFFFF",
  },
  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
    width: 65,
    height: 13,
  },
  headerTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.mediumGray,
    letterSpacing: 0,
  },
  
  mainTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: brand.mediumGray,
    marginBottom: 14,
  },
  
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 2,
    borderBottomColor: brand.black,
  },
  sectionHeaderFirst: {
    marginTop: 0,
  },
  
  bodyText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: brand.darkGray,
    marginBottom: 8,
  },
  
  twoColumn: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  threeColumn: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  column: {
    flex: 1,
  },
  
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
    marginBottom: 3,
  },
  cardLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginTop: 4,
    marginBottom: 1,
  },
  cardText: {
    fontSize: 8,
    lineHeight: 1.35,
    color: brand.darkGray,
  },
  
  callout: {
    borderLeftWidth: 3,
    borderLeftColor: brand.abridgeRed,
    backgroundColor: brand.calloutBg,
    paddingLeft: 10,
    paddingVertical: 6,
    paddingRight: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  calloutLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.abridgeRed,
  },
  calloutText: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.35,
    color: brand.darkGray,
  },
  
  table: {
    borderWidth: 1,
    borderColor: brand.tableBorder,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.tableHeader,
    borderBottomWidth: 2,
    borderBottomColor: brand.tableBorder,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  tableRowAlt: {
    backgroundColor: brand.tableAlt,
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
    fontSize: 7,
    color: brand.darkGray,
    marginBottom: 1,
  },
  
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: brand.lightGray,
  },
  footerPage: {
    fontSize: 7,
    color: brand.lightGray,
  },
});

// ============================================================================
// BADGE COMPONENT
// ============================================================================

function Badge({ type }: { type: "direct" | "indirect" | "potential" | "qualitative" | "connected" }) {
  const config = {
    direct: { bg: brand.directBg, text: brand.directText, border: brand.directBorder, label: "DIRECTLY MEASURABLE" },
    indirect: { bg: brand.indirectBg, text: brand.indirectText, border: brand.indirectBorder, label: "INDIRECTLY ATTRIBUTABLE" },
    potential: { bg: brand.potentialBg, text: brand.potentialText, border: brand.potentialBorder, label: "POTENTIAL VALUE" },
    qualitative: { bg: brand.qualitativeBg, text: brand.qualitativeText, border: brand.qualitativeBorder, label: "QUALITATIVE" },
    connected: { bg: brand.connectedBg, text: brand.connectedText, border: brand.connectedBorder, label: "CONNECTED TO RETENTION" },
  };
  const c = config[type];
  
  return (
    <Text style={{
      fontSize: 6,
      fontFamily: "Helvetica-Bold",
      letterSpacing: 0.2,
      marginBottom: 4,
      paddingVertical: 2,
      paddingHorizontal: 4,
      borderRadius: 2,
      alignSelf: "flex-start" as const,
      backgroundColor: c.bg,
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
    }}>
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

function PageFooter({ pageNum, totalPages }: { pageNum: number; totalPages: number }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Abridge ROI Methodology | Nursing</Text>
      <Text style={styles.footerPage}>Page {pageNum} of {totalPages}</Text>
    </View>
  );
}

// ============================================================================
// PAGE 1: Context + Categories + Honest Limits + Connected Value
// ============================================================================

function Page1() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.mainTitle}>NURSING: HOW WE THINK ABOUT VALUE</Text>
      <Text style={styles.subtitle}>A transparent methodology for calculating return on investment</Text>
      
      <Text style={[styles.sectionHeader, styles.sectionHeaderFirst]}>THE CONTEXT</Text>
      <Text style={styles.bodyText}>
        Nursing is the hardest setting to model ROI--and the most important to get right. In outpatient medicine, a physician saves 4 minutes per visit, and you can trace a path to wRVU lift or capacity expansion. Nurses don't bill. They don't generate wRVUs. And yet nursing documentation burden is massive--25-35% of every shift spent on flowsheets, assessments, handoffs, and charting. So where does the value live?
      </Text>
      
      <Text style={styles.sectionHeader}>TWO VALUE CATEGORIES</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>LABOR ECONOMICS</Text>
          <Text style={styles.cardText}>
            Overtime, retention, and agency spend. These are real dollars that show up in the budget. When nurses spend less time documenting, they finish shifts on time, burn out less, and the organization needs fewer expensive travel nurses.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CARE QUALITY ENABLEMENT</Text>
          <Text style={styles.cardText}>
            Falls, pressure injuries, patient satisfaction. These outcomes are influenced by bedside time. More time caring, less time charting, better outcomes. But the causal chain is indirect--documentation supports care, it doesn't replace it.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Potential value (shown separately)</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={styles.calloutLabel}>OUR APPROACH: </Text>
          We model both categories--but we're honest about what's directly measurable versus what we only enable. Labor economics value is defensible in CFO conversations. Care quality potential is real but requires clinical practice to realize.
        </Text>
      </View>
      
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
      
      <Text style={styles.sectionHeader}>CONNECTED VALUE</Text>
      <Text style={styles.bodyText}>
        When nurses document thoroughly and in real-time, it directly impacts inpatient revenue. Complete nursing documentation creates a clinical picture that supports accurate coding and stronger appeals. Nursing assessments capture clinical indicators (CC/MCC) that support accurate DRG assignment, and provide contemporaneous evidence for payer appeals. These benefits are quantified in the Inpatient Setting methodology.
      </Text>
      
      <PageFooter pageNum={1} totalPages={3} />
    </Page>
  );
}

// ============================================================================
// PAGE 2: All Value Mechanisms
// ============================================================================

function Page2() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={[styles.sectionHeader, styles.sectionHeaderFirst]}>VALUE MECHANISMS</Text>
      
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
            Hours saved x Conversion rate (15-40%) x OT rate (1.5x base) = OT Savings
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
            FTEs x Turnover x Burnout% x Abridge impact (10-25%) x Replacement cost
          </Text>
        </View>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>AGENCY LABOR REDUCTION</Text>
          <Badge type="connected" />
          <Text style={styles.cardLabel}>MECHANISM</Text>
          <Text style={styles.cardText}>
            When nurses leave, hospitals fill gaps with agency/travel nurses at 2-3x the cost. Improved retention directly reduces premium labor dependency.
          </Text>
          <Text style={styles.cardLabel}>CALCULATION</Text>
          <Text style={styles.cardText}>
            Nurses retained x Weeks of coverage (8-16) x Weekly premium ($2-4K)
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
            Current HAPIs x Doc-preventable rate (5%) x Cost per HAPI ($10-50K)
          </Text>
        </View>
      </View>
      
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
            Current falls x Doc-preventable rate (5%) x Cost per fall ($3-30K)
          </Text>
          <Text style={[styles.cardText, { marginTop: 2, fontFamily: "Helvetica-Oblique", fontSize: 7 }]}>
            Note: CMS does NOT reimburse for hospital-acquired fall injuries.
          </Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>PATIENT EXPERIENCE (HCAHPS)</Text>
          <Badge type="qualitative" />
          <Text style={styles.cardLabel}>MECHANISM</Text>
          <Text style={styles.cardText}>
            When nurses spend less time documenting, they spend more time with patients. Research shows bedside time correlates with satisfaction scores.
          </Text>
          <Text style={styles.cardLabel}>CONSIDERATION</Text>
          <Text style={styles.cardText}>
            HCAHPS is influenced by dozens of factors. Track as directional indicator.
          </Text>
          <Text style={[styles.cardText, { marginTop: 2, fontFamily: "Helvetica-Oblique", fontSize: 7 }]}>
            Top quartile HCAHPS = ~2% higher reimbursement via VBP.
          </Text>
        </View>
      </View>
      
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={styles.calloutLabel}>WHY "POTENTIAL" VALUE: </Text>
          The link between documentation and care quality is indirect. We don't cause fewer falls--we enable the visibility that helps prevent them. Clinical practice matters more than documentation.
        </Text>
      </View>
      
      <PageFooter pageNum={2} totalPages={3} />
    </Page>
  );
}

// ============================================================================
// PAGE 3: Assumptions + Validation Path
// ============================================================================

function Page3() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={[styles.sectionHeader, styles.sectionHeaderFirst]}>KEY ASSUMPTIONS</Text>
      <Text style={[styles.bodyText, { marginBottom: 6 }]}>
        Every number has a source. We don't hide assumptions--we highlight them so you can adjust based on your reality.
      </Text>
      
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
        <View style={[styles.tableRow, styles.tableRowAlt]}>
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
        <View style={[styles.tableRow, styles.tableRowAlt]}>
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
        <View style={[styles.tableRow, styles.tableRowAlt]}>
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
        <View style={[styles.tableRow, styles.tableRowAlt]}>
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
        <View style={[styles.tableRow, styles.tableRowAlt]}>
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
      
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={styles.calloutLabel}>WHY WE DEFAULT CONSERVATIVE: </Text>
          We'd rather show a smaller number you can defend than a larger number that falls apart under scrutiny.
        </Text>
      </View>
      
      <Text style={styles.sectionHeader}>VALIDATION PATH</Text>
      <Text style={[styles.bodyText, { marginBottom: 6 }]}>
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
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-4 weeks</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>OVERTIME REDUCTION</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Baseline OT hours per unit/month</Text>
          <Text style={styles.cardText}>- Note seasonal patterns</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track OT on Abridge vs. control</Text>
          <Text style={styles.cardText}>- Control for census/acuity changes</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-3 months</Text>
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
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 12-18 months</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CARE QUALITY</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Baseline HAPI/falls rates by unit</Text>
          <Text style={styles.cardText}>- Baseline HCAHPS scores</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track rates Abridge vs control</Text>
          <Text style={styles.cardText}>- Be cautious about attribution</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Oblique" }]}>Treat quality as bonus, not promise</Text>
        </View>
      </View>
      
      <PageFooter pageNum={3} totalPages={3} />
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
    </Document>
  );
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function generateNursingMethodologyPDF(): Promise<void> {
  const blob = await pdf(<NursingMethodologyDocument />).toBlob();
  saveAs(blob, "Abridge-Nursing-ROI-Methodology.pdf");
}

export async function generateNursingROIPDF(data: NursingPDFData): Promise<void> {
  const blob = await pdf(<NursingMethodologyDocument />).toBlob();
  const filename = data.organizationName 
    ? `Abridge-Nursing-ROI-${data.organizationName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
    : "Abridge-Nursing-ROI-Analysis.pdf";
  saveAs(blob, filename);
}

export async function generateNursingROIPDFBlob(data: NursingPDFData): Promise<{ blob: Blob; filename: string }> {
  const blob = await pdf(<NursingMethodologyDocument />).toBlob();
  const filename = data.organizationName 
    ? `Abridge-Nursing-ROI-${data.organizationName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
    : "Abridge-Nursing-ROI-Analysis.pdf";
  return { blob, filename };
}
