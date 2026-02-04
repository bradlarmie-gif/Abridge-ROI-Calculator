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

const brand = {
  black: "#000000",
  darkGray: "#333333",
  mediumGray: "#666666",
  lightGray: "#999999",
  borderGray: "#E0E0E0",
  tableHeader: "#F8F8F8",
  cardBg: "#FFFFFF",
  abridgeRed: "#EA2C00",
  warmBeige: "#F5F0EB",
  directMeasurableBg: "#E8F5E9",
  directMeasurableText: "#2E7D32",
  indirectBg: "#FFF3E0",
  indirectText: "#E65100",
  potentialBg: "#F5F5F5",
  potentialText: "#666666",
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.3,
    color: brand.darkGray,
    backgroundColor: "#FFFFFF",
  },
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
  bodyText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: brand.darkGray,
    marginBottom: 6,
  },
  twoColumn: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  column: {
    flex: 1,
  },
  threeColumn: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
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
  fullWidthCard: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 8,
    backgroundColor: brand.cardBg,
    marginBottom: 8,
  },
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

function Badge({ type }: { type: "direct" | "indirect" | "potential" | "user" | "connected" }) {
  const config = {
    direct: { bg: brand.directMeasurableBg, text: brand.directMeasurableText, label: "DIRECTLY MEASURABLE" },
    indirect: { bg: brand.indirectBg, text: brand.indirectText, label: "INDIRECTLY ATTRIBUTABLE" },
    potential: { bg: brand.potentialBg, text: brand.potentialText, label: "POTENTIAL VALUE" },
    user: { bg: brand.potentialBg, text: brand.potentialText, label: "USER-DEFINED" },
    connected: { bg: "#E3F2FD", text: "#1565C0", label: "CONNECTED VALUE" },
  };
  const c = config[type];
  return (
    <Text style={[styles.cardSubtitle, { backgroundColor: c.bg, color: c.text }]}>
      {c.label}
    </Text>
  );
}

function PageHeader() {
  return (
    <View style={styles.header}>
      <Image src={abridgeLogoPath} style={styles.logo} />
      <Text style={styles.headerTitle}>ROI METHODOLOGY</Text>
    </View>
  );
}

function PageFooter({ pageNum }: { pageNum: number }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Abridge ROI Methodology - Outpatient</Text>
      <Text style={styles.footerPage}>Page {pageNum}/4</Text>
    </View>
  );
}

function Page1() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.mainTitle}>OUTPATIENT: HOW WE THINK ABOUT VALUE</Text>
      <Text style={styles.subtitle}>A framework for understanding value when billing creates a clear value chain</Text>
      
      <Text style={styles.sectionHeader}>THE CONTEXT</Text>
      <Text style={styles.bodyText}>
        Outpatient medicine has the clearest path from documentation time to revenue. Physicians bill for each encounter. More encounters, more wRVUs, more revenue. This billing relationship creates a direct value chain.
      </Text>
      <Text style={styles.bodyText}>
        When a physician saves 4 minutes per visit, that time can become additional patient capacity, or it can stay in their pocket as work-life balance. Either way, the value is traceable. Documentation quality also matters--wRVU lift from accurate coding, HCC capture for MA populations, denial prevention.
      </Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>TIME BACK</Text>
          <Text style={styles.cardText}>
            Capacity expansion, cost reduction, clinician wellbeing. When documentation is faster, physicians can see more patients, reduce burnout, or both. The time has measurable value.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>DOCUMENTATION QUALITY</Text>
          <Text style={styles.cardText}>
            wRVU accuracy, HCC capture, denial prevention. When documentation is complete, coding is accurate, and revenue follows. The notes drive the billing.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.sectionHeader}>VALUE MECHANISMS -- TIME BACK</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>PATIENT ACCESS (CAPACITY)</Text>
          <Badge type="direct" />
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            If physicians use saved time to see more patients, that's additional revenue. 4 min/visit x 20 visits = 80 min/day. Convert some portion to additional visits.
          </Text>
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Hours saved x % to capacity (5-15%) x Revenue per visit x Realization = Access value
          </Text>
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            Time savings are measurable. Capacity conversion is a business decision. Revenue per visit is known.
          </Text>
        </View>
        
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CLINICIAN WELLBEING</Text>
          <Badge type="indirect" />
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            Documentation burden is the #1 driver of physician burnout. Burnout drives turnover. Reducing burden helps retain physicians.
          </Text>
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Physicians x Turnover x Burnout % x Abridge impact x Replacement cost = Retention value
          </Text>
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            Link between doc burden and burnout is well-established. The question is magnitude.
          </Text>
        </View>
      </View>
      
      <View style={styles.fullWidthCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={styles.cardTitle}>COST REDUCTION</Text>
          <Badge type="user" />
        </View>
        <Text style={styles.cardText}>
          Some organizations use time savings for cost reduction--reduced overtime, avoided hires, scribe replacement. We don't calculate this automatically because every organization is different. Users enter their own estimate if applicable.
        </Text>
      </View>
      
      <PageFooter pageNum={1} />
    </Page>
  );
}

function Page2() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.sectionHeader}>VALUE MECHANISMS -- DOCUMENTATION QUALITY</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>wRVU IMPROVEMENT</Text>
          <Badge type="direct" />
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            Better documentation supports accurate coding. When the note fully captures medical decision-making and complexity, codes reflect actual work performed.
          </Text>
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Encounters x Current avg wRVU x Lift % (2-7%) x Conversion factor x Realization = wRVU value
          </Text>
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            wRVU is tracked. Distribution by complexity level is measurable. Pre/post comparison is straightforward.
          </Text>
        </View>
        
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>HCC CAPTURE (MA POPULATIONS)</Text>
          <Badge type="direct" />
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            For Medicare Advantage patients, complete documentation captures HCCs that affect risk adjustment. Conditions discussed but not documented don't count.
          </Text>
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            MA patients x Gap rate x Recapture target x RAF impact x Annual payment x Realization = HCC value
          </Text>
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            HCC gaps are identifiable. RAF impact is mathematical. Recapture is measurable.
          </Text>
        </View>
      </View>
      
      <View style={styles.fullWidthCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={styles.cardTitle}>DENIAL PREVENTION</Text>
          <Badge type="direct" />
        </View>
        <Text style={styles.cardLabel}>THE MECHANISM</Text>
        <Text style={styles.cardText}>
          Documentation gaps drive 30-40% of denials that cannot be appealed--permanent revenue loss. Abridge captures clinical reasoning and medical necessity in real-time, preventing denials before they occur.
        </Text>
        <Text style={styles.cardLabel}>THE CALCULATION</Text>
        <Text style={styles.cardText}>
          Encounters x Denial rate x Unappealable % x Prevention target x Avg claim value x Realization = Denial value
        </Text>
      </View>
      
      <Text style={styles.sectionHeader}>THE HONEST LIMITS</Text>
      
      <View style={styles.threeColumn}>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[+] WHAT WE MEASURE</Text>
          <Text style={styles.limitsSubtext}>Direct attribution</Text>
          <Text style={styles.limitsBullet}>- Documentation time</Text>
          <Text style={styles.limitsBullet}>- wRVU distribution</Text>
          <Text style={styles.limitsBullet}>- HCC capture rates</Text>
          <Text style={styles.limitsBullet}>- Same-day closure</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[~] WHAT WE INFLUENCE</Text>
          <Text style={styles.limitsSubtext}>Indirect attribution</Text>
          <Text style={styles.limitsBullet}>- Retention rates</Text>
          <Text style={styles.limitsBullet}>- Patient satisfaction</Text>
          <Text style={styles.limitsBullet}>- Denial rates (payer varies)</Text>
          <Text style={styles.limitsBullet}>- Referral patterns</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[ ] DEPENDS ON BEHAVIOR</Text>
          <Text style={styles.limitsSubtext}>User decision</Text>
          <Text style={styles.limitsBullet}>- Capacity utilization</Text>
          <Text style={styles.limitsBullet}>- How time is used</Text>
          <Text style={styles.limitsBullet}>- Org priorities</Text>
          <Text style={styles.limitsBullet}>- Scheduling changes</Text>
        </View>
      </View>
      
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>THE OUTPATIENT REALITY: </Text>
          Outpatient is the clearest ROI story because every visit generates revenue. But how that value shows up depends on organizational choices.
        </Text>
      </View>
      
      <PageFooter pageNum={2} />
    </Page>
  );
}

function Page3() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.sectionHeader}>KEY ASSUMPTIONS</Text>
      
      <Text style={styles.subSectionHeader}>TIME SAVINGS</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Source</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Time saved per encounter</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-6 min</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>4 min</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Abridge customer data</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Visits per day</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15-25</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Specialty dependent</Text>
        </View>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <Text style={styles.subSectionHeader}>CAPACITY (IF ENABLED)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>% of time to capacity</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>5-25%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>10%</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Realization rate</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>15-25%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>20%</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Revenue per visit</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$150-300</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$200</Text>
            </View>
          </View>
        </View>
        <View style={styles.column}>
          <Text style={styles.subSectionHeader}>RETENTION</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Physician turnover</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>6-9%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>7%</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Burnout-related %</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>30-50%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>40%</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Replacement cost</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$250-500K</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$350K</Text>
            </View>
          </View>
        </View>
      </View>
      
      <Text style={styles.subSectionHeader}>DOCUMENTATION QUALITY</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Source</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>wRVU lift</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-7%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>5%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Coding analysis</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Realization rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>70-80%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>75%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Conservative</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>HCC gap rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>30-50%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>40%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>MA population studies</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Denial prevention target</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>25-75%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>50%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Conservative</Text>
        </View>
      </View>
      
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>WHY WE DEFAULT CONSERVATIVE: </Text>
          We'd rather show a smaller number you can defend than a larger number that falls apart under scrutiny.
        </Text>
      </View>
      
      <Text style={styles.sectionHeader}>VALIDATION PATH</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>TIME SAVINGS</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>Time-motion studies, EHR session data</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Repeat measurements, compare Abridge vs. control</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-4 weeks</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>wRVU ACCURACY</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>wRVU distribution by physician</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Compare distribution pre/post</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-3 months</Text>
        </View>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>HCC CAPTURE</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>RAF gap analysis, recapture rates</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Track recapture on Abridge patients</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>Timeline: 6-12 months (RAF lag)</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>RETENTION</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>Turnover rate, exit interviews</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Track turnover, satisfaction</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>Timeline: 12-18 months</Text>
        </View>
      </View>
      
      <PageFooter pageNum={3} />
    </Page>
  );
}

function Page4() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
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
          <Text style={[styles.tableCell, { flex: 1 }]}>Same-day closure</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>4-6 weeks</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>wRVU distribution</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-3 months</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>HCC recapture</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>6-12 months</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Denial rates</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>6-12 months</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Retention impact</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>12-18 months</Text>
        </View>
      </View>
      
      <Text style={styles.sectionHeader}>CONNECTED VALUE</Text>
      <Text style={styles.bodyText}>
        Outpatient documentation quality affects multiple revenue streams simultaneously:
      </Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>FEE-FOR-SERVICE</Text>
          <Text style={styles.cardText}>
            wRVU accuracy directly impacts reimbursement. Complete documentation of complexity = accurate coding = appropriate payment.
          </Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>VALUE-BASED CARE</Text>
          <Text style={styles.cardText}>
            HCC capture affects risk adjustment. Quality measures require documentation. Care coordination depends on complete notes.
          </Text>
        </View>
      </View>
      
      <Text style={styles.sectionHeader}>SUMMARY</Text>
      <Text style={styles.bodyText}>
        Outpatient has the clearest ROI story because billing creates a direct value chain. Time saved can become capacity or wellbeing. Complete documentation drives accurate coding and revenue capture.
      </Text>
      
      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>TIME VALUE</Text>
            <Text style={styles.summaryItem}>Patient access</Text>
            <Text style={styles.summaryItem}>Cost reduction</Text>
            <Text style={styles.summaryItem}>Clinician wellbeing</Text>
          </View>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>DOCUMENTATION</Text>
            <Text style={styles.summaryItem}>wRVU improvement</Text>
            <Text style={styles.summaryItem}>HCC capture</Text>
            <Text style={styles.summaryItem}>Denial prevention</Text>
          </View>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>CONNECTED VALUE</Text>
            <Text style={styles.summaryItem}>Complete notes</Text>
            <Text style={styles.summaryItem}>support revenue</Text>
            <Text style={styles.summaryItem}>across all payers</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.bodyText}>
        We model all drivers--but let users choose which apply to their situation.
      </Text>
      
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          "The goal isn't to prove our model right. It's to build your organization's understanding of what ambient documentation actually delivers in your context."
        </Text>
      </View>
      
      <Text style={[styles.bodyText, { textAlign: "center" as const, fontFamily: "Helvetica-Bold", marginBottom: 0 }]}>
        That honesty is the methodology.
      </Text>
      
      <PageFooter pageNum={4} />
    </Page>
  );
}

function OutpatientMethodologyDocument() {
  return (
    <Document>
      <Page1 />
      <Page2 />
      <Page3 />
      <Page4 />
    </Document>
  );
}

export async function generateOutpatientMethodologyPDF(): Promise<void> {
  try {
    const blob = await pdf(<OutpatientMethodologyDocument />).toBlob();
    saveAs(blob, "Abridge-Outpatient-ROI-Methodology.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
