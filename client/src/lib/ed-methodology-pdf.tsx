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
    marginBottom: 10,
    marginTop: -36,
    marginLeft: -36,
    marginRight: -36,
    paddingVertical: 10,
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
    marginTop: 14,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: brand.black,
  },
  subSectionHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 6,
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
  bodyText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: brand.darkGray,
    marginBottom: 8,
  },
  twoColumn: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  column: {
    flex: 1,
  },
  threeColumn: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 10,
    backgroundColor: brand.cardBg,
  },
  cardTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  cardLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginTop: 8,
    marginBottom: 2,
  },
  cardText: {
    fontSize: 8,
    lineHeight: 1.35,
    color: brand.darkGray,
  },
  fullWidthCard: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 10,
    backgroundColor: brand.cardBg,
    marginBottom: 10,
  },
  callout: {
    borderLeftWidth: 3,
    borderLeftColor: brand.abridgeRed,
    paddingLeft: 12,
    paddingVertical: 8,
    backgroundColor: brand.warmBeige,
    marginBottom: 10,
  },
  calloutText: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.4,
    color: brand.darkGray,
  },
  table: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    marginBottom: 10,
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
    paddingVertical: 4,
    paddingHorizontal: 6,
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
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  limitsColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 8,
    backgroundColor: brand.cardBg,
  },
  limitsHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 3,
  },
  limitsSubtext: {
    fontSize: 7,
    color: brand.mediumGray,
    marginBottom: 5,
  },
  limitsBullet: {
    fontSize: 8,
    color: brand.darkGray,
    marginBottom: 2,
  },
  summaryBox: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 12,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryColumn: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 4,
    textDecoration: "underline",
  },
  summaryItem: {
    fontSize: 8,
    color: brand.darkGray,
    marginBottom: 2,
  },
  quoteBox: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 12,
    marginTop: 8,
    marginBottom: 10,
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
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: brand.borderGray,
    paddingTop: 8,
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

function Badge({ type }: { type: "direct" | "indirect" | "potential" | "connected" }) {
  const config = {
    direct: { bg: brand.directMeasurableBg, text: brand.directMeasurableText, label: "DIRECTLY MEASURABLE" },
    indirect: { bg: brand.indirectBg, text: brand.indirectText, label: "INDIRECTLY ATTRIBUTABLE" },
    potential: { bg: brand.potentialBg, text: brand.potentialText, label: "POTENTIAL VALUE" },
    connected: { bg: "#E3F2FD", text: "#1565C0", label: "CONNECTED TO RETENTION" },
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
      <Text style={styles.footerText}>Abridge ROI Methodology - Emergency Department</Text>
      <Text style={styles.footerPage}>Page {pageNum}/4</Text>
    </View>
  );
}

function Page1() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.mainTitle}>ED: HOW WE THINK ABOUT VALUE</Text>
      <Text style={styles.subtitle}>A framework for understanding value in high-volume, fast-paced emergency settings</Text>
      
      <Text style={styles.sectionHeader}>THE CONTEXT</Text>
      <Text style={styles.bodyText}>
        Emergency departments operate differently than any other care setting. High volume, unpredictable flow, and templated workflows mean documentation happens in compressed windows--often after the patient encounter, sometimes hours later.
      </Text>
      <Text style={styles.bodyText}>
        ED physicians don't lack time per encounter the way outpatient physicians do. They lack time in aggregate--the cumulative burden of documentation across a shift of 20-40 patients creates fatigue, extends shifts, and contributes to the highest burnout rates in medicine. Value in the ED shows up in two places:
      </Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>THROUGHPUT & EFFICIENCY</Text>
          <Text style={styles.cardText}>
            LWBS reduction, faster door-to-doc, admission capture. When documentation doesn't bottleneck the department, patients move through faster. The ED is a flow problem--documentation is often the constraint.
          </Text>
          <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>DOCUMENTATION QUALITY</Text>
          <Text style={styles.cardText}>
            E&M accuracy, denial prevention, and downstream inpatient revenue. ED documentation is the foundation for admitted patients--what's captured here affects the entire inpatient stay.
          </Text>
          <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct + downstream value</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.sectionHeader}>VALUE MECHANISMS -- THROUGHPUT & EFFICIENCY</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>LWBS REDUCTION</Text>
          <Badge type="direct" />
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            When ED physicians document faster, they can see the next patient sooner. Reduced wait times mean fewer patients leave without being seen. Every LWBS patient is lost revenue and a liability risk.
          </Text>
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Current LWBS rate x Reduction % (10-30%) x Avg ED revenue per visit = LWBS value
          </Text>
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            LWBS is tracked. Door-to-doc time is tracked. The link between documentation speed and throughput is operational reality.
          </Text>
        </View>
        
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>ADMISSION CAPTURE</Text>
          <Badge type="indirect" />
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            Patients who might be discharged due to documentation burden or shift-end pressure can be properly worked up and admitted when appropriate.
          </Text>
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Potential admissions captured x Admission revenue = Capture value. This is harder to measure--we show it as directional.
          </Text>
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            Requires baseline data on admission patterns. Best validated through physician feedback.
          </Text>
        </View>
      </View>
      
      <View style={styles.fullWidthCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Text style={styles.cardTitle}>CLINICIAN WELLBEING</Text>
          <Badge type="connected" />
        </View>
        <Text style={styles.cardText}>
          ED has the highest burnout rate of any specialty (65%+). Documentation burden is a primary driver. Time saved per shift directly impacts whether physicians finish on time or stay late charting. Calculation: Same retention model as other settings but with ED-specific defaults: 12% turnover, 50% burnout-related, $500K replacement cost.
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
      
      <Text style={styles.subSectionHeader}>WHY ED DOCUMENTATION MATTERS BEYOND THE ED</Text>
      <Text style={styles.bodyText}>
        For patients who are admitted, ED documentation becomes the foundation of the inpatient record. What's captured in the ED affects DRG assignment, medical necessity justification, and denial risk for the entire stay.
      </Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>E&M ACCURACY</Text>
          <Badge type="direct" />
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            ED E&M coding is driven by documentation of medical decision-making, history, and exam. Templated workflows often under-capture complexity. Ambient documentation captures the full clinical picture.
          </Text>
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Encounters x Current E&M distribution x Lift % x Revenue difference = E&M value
          </Text>
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            E&M distribution is measurable. Level changes are trackable. Pre/post comparison is straightforward.
          </Text>
        </View>
        
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>DENIAL PREVENTION</Text>
          <Badge type="direct" />
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            ED encounters face high denial rates--medical necessity, level of care, observation vs. inpatient status. Complete documentation at the point of care creates contemporaneous evidence for appeals.
          </Text>
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Denial rate x Documentation-preventable % x Avg claim value = Denial prevention value
          </Text>
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            Denial rates by reason code are tracked. Documentation-related denials are identifiable.
          </Text>
        </View>
      </View>
      
      <View style={styles.fullWidthCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Text style={styles.cardTitle}>DOWNSTREAM INPATIENT VALUE</Text>
          <Text style={[styles.cardSubtitle, { backgroundColor: "#E3F2FD", color: "#1565C0" }]}>CONNECTED TO INPATIENT</Text>
        </View>
        <Text style={styles.cardText}>
          For admitted patients, ED documentation affects the entire inpatient stay. Conditions documented in ED carry forward to coding. Medical necessity established in ED supports the admission. This value is quantified in the Inpatient methodology--we note it here as connected value.
        </Text>
      </View>
      
      <Text style={styles.sectionHeader}>THE HONEST LIMITS</Text>
      
      <View style={styles.threeColumn}>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[+] WHAT WE MEASURE</Text>
          <Text style={styles.limitsSubtext}>Direct attribution</Text>
          <Text style={styles.limitsBullet}>- Door-to-doc time</Text>
          <Text style={styles.limitsBullet}>- Documentation time</Text>
          <Text style={styles.limitsBullet}>- E&M level distribution</Text>
          <Text style={styles.limitsBullet}>- Shift end time</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[~] WHAT WE INFLUENCE</Text>
          <Text style={styles.limitsSubtext}>Indirect attribution</Text>
          <Text style={styles.limitsBullet}>- LWBS rates (many factors)</Text>
          <Text style={styles.limitsBullet}>- Admission decisions</Text>
          <Text style={styles.limitsBullet}>- Physician retention</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[ ] WHAT WE ENABLE</Text>
          <Text style={styles.limitsSubtext}>Supportive only</Text>
          <Text style={styles.limitsBullet}>- Downstream DRG accuracy</Text>
          <Text style={styles.limitsBullet}>- Inpatient denial prevention</Text>
          <Text style={styles.limitsBullet}>- Patient experience</Text>
        </View>
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
          <Text style={[styles.tableCell, { flex: 1 }]}>1-3 min</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2 min</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Abridge ED data</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Encounters per shift</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15-30</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>22</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>ED benchmarks</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Shift time savings</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>22-66 min</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>44 min</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Calculated</Text>
        </View>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <Text style={styles.subSectionHeader}>THROUGHPUT</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Baseline LWBS rate</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>2-5%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>3%</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>LWBS reduction</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>10-30%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>20%</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Avg ED visit revenue</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$400-800</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$500</Text>
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
              <Text style={[styles.tableCell, { flex: 2 }]}>ED physician turnover</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>10-15%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>12%</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Burnout-related %</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>40-60%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>50%</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Replacement cost</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$400-600K</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$500K</Text>
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
          <Text style={[styles.tableCell, { flex: 2 }]}>E&M uplift potential</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>3-8%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>5%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Coding analysis</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Denial rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>5-10%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>7%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Industry average</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Realization rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>70-85%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>75%</Text>
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
          <Text style={styles.cardText}>Track door-to-doc, doc time per encounter</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Compare Abridge shifts vs. control</Text>
          <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-4 weeks</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>LWBS REDUCTION</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>Baseline LWBS rate by shift/day</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Track LWBS on Abridge shifts</Text>
          <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-3 months</Text>
        </View>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>E&M ACCURACY</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>E&M level distribution by physician</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Compare distribution pre/post</Text>
          <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-3 months</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>RETENTION</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>Turnover rate, exit interview data</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Track turnover, satisfaction surveys</Text>
          <Text style={[styles.cardText, { marginTop: 6, fontFamily: "Helvetica-Bold" }]}>Timeline: 12-18 months</Text>
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
      
      <Text style={styles.sectionHeader}>CONNECTED VALUE</Text>
      
      <Text style={styles.subSectionHeader}>ED DOCUMENTATION FEEDS INPATIENT REVENUE</Text>
      <Text style={styles.bodyText}>
        For patients admitted through the ED, documentation quality at admission directly impacts inpatient value:
      </Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>ADMISSION DOCUMENTATION</Text>
          <Text style={styles.cardText}>
            Conditions documented in ED carry forward to inpatient coding. "Acute respiratory failure" or "severe sepsis" captured at admission establishes complexity from day one.
          </Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>MEDICAL NECESSITY</Text>
          <Text style={styles.cardText}>
            The admission decision and its justification are documented in ED. This is your first line of defense against "not medically necessary" denials.
          </Text>
        </View>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>STATUS DETERMINATION</Text>
          <Text style={styles.cardText}>
            IP vs. Observation status is often established in ED. Complete documentation supports correct status assignment.
          </Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CDI FOUNDATION</Text>
          <Text style={styles.cardText}>
            When ED documentation is complete, CDI teams have better source material for the entire stay.
          </Text>
        </View>
      </View>
      
      <Text style={[styles.bodyText, { marginTop: 4 }]}>
        These benefits are quantified in the Inpatient Setting methodology. If your organization uses Abridge in both ED and Inpatient, documentation creates continuity from arrival through discharge.
      </Text>
      
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
          <Text style={[styles.tableCell, { flex: 1 }]}>LWBS reduction</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-3 months</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>E&M distribution</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-3 months</Text>
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
      
      <Text style={styles.sectionHeader}>SUMMARY</Text>
      <Text style={styles.bodyText}>
        ED value shows up in throughput and documentation quality. The fast pace makes both harder--and more valuable.
      </Text>
      
      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>TIME VALUE (Direct)</Text>
            <Text style={styles.summaryItem}>LWBS reduction</Text>
            <Text style={styles.summaryItem}>Shift efficiency</Text>
            <Text style={styles.summaryItem}>Retention savings</Text>
          </View>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>DOCUMENTATION (Direct)</Text>
            <Text style={styles.summaryItem}>E&M accuracy</Text>
            <Text style={styles.summaryItem}>Denial prevention</Text>
          </View>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>CONNECTED VALUE</Text>
            <Text style={styles.summaryItem}>ED documentation</Text>
            <Text style={styles.summaryItem}>feeds inpatient</Text>
            <Text style={styles.summaryItem}>revenue cycle</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.bodyText}>
        We model all three--but we're honest about which is measurable, which is influenceable, and which connects to other settings.
      </Text>
      
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          "The goal isn't to prove our model right. It's to build your organization's understanding of what ambient documentation actually delivers in your context."
        </Text>
      </View>
      
      <Text style={[styles.bodyText, { textAlign: "center" as const, fontFamily: "Helvetica-Bold" }]}>
        That honesty is the methodology.
      </Text>
      
      <PageFooter pageNum={4} />
    </Page>
  );
}

function EDMethodologyDocument() {
  return (
    <Document>
      <Page1 />
      <Page2 />
      <Page3 />
      <Page4 />
    </Document>
  );
}

export async function generateEDMethodologyPDF(): Promise<void> {
  try {
    const blob = await pdf(<EDMethodologyDocument />).toBlob();
    saveAs(blob, "Abridge-ED-ROI-Methodology.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
