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

function Badge({ type }: { type: "direct" | "indirect" | "potential" | "connected" }) {
  const config = {
    direct: { bg: brand.directMeasurableBg, text: brand.directMeasurableText, label: "DIRECTLY MEASURABLE" },
    indirect: { bg: brand.indirectBg, text: brand.indirectText, label: "INDIRECTLY ATTRIBUTABLE" },
    potential: { bg: brand.potentialBg, text: brand.potentialText, label: "POTENTIAL VALUE" },
    connected: { bg: "#E3F2FD", text: "#1565C0", label: "COMBINED WITH DRG" },
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
      <Text style={styles.footerText}>Abridge ROI Methodology - Inpatient</Text>
      <Text style={styles.footerPage}>Page {pageNum}/4</Text>
    </View>
  );
}

function Page1() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.mainTitle}>INPATIENT: HOW WE THINK ABOUT VALUE</Text>
      <Text style={styles.subtitle}>A framework for understanding value in DRG-based reimbursement</Text>
      
      <Text style={styles.sectionHeader}>THE CONTEXT</Text>
      <Text style={styles.bodyText}>
        Inpatient medicine operates on a fundamentally different economic model than outpatient care. Hospitals are paid a fixed amount per admission based on the DRG--the Diagnosis Related Group. That payment is determined by what's documented.
      </Text>
      <Text style={styles.bodyText}>
        If a condition was discussed at bedside but not documented, it doesn't exist for coding purposes. If clinical complexity isn't captured in the note, the DRG may be assigned lower than warranted. This is where ambient documentation creates value--not by adding things that weren't there, but by capturing what was actually discussed.
      </Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>DOCUMENTATION QUALITY</Text>
          <Text style={styles.cardText}>
            DRG accuracy, denial prevention, CDI efficiency. When documentation captures clinical complexity, revenue follows. The notes drive the payment.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CLINICIAN WELLBEING</Text>
          <Text style={styles.cardText}>
            Hospitalists document multiple notes per patient--H&P, daily progress, discharge summary. Reducing this burden improves work-life balance and retention.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Indirect value (no capacity expansion)</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.sectionHeader}>VALUE MECHANISMS -- DOCUMENTATION QUALITY</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>DRG ACCURACY (CC/MCC CAPTURE)</Text>
          <Badge type="direct" />
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            CCs and MCCs increase DRG weight and payment. When hospitalists discuss acute kidney injury, malnutrition, or respiratory failure at bedside but don't fully document it, that complexity isn't coded.
          </Text>
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Admissions x At-risk rate (25%) x Protection rate (20%) x DRG weight increase (0.4) x Base payment ($6K) x Realization (50%)
          </Text>
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            Documentation gaps are well-established. CC/MCC impact on DRG weight is mathematical. CMI changes are measurable.
          </Text>
        </View>
        
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CDI QUERY REDUCTION</Text>
          <Badge type="direct" />
          <Text style={styles.cardLabel}>THE MECHANISM</Text>
          <Text style={styles.cardText}>
            CDI queries often ask physicians to document what they already discussed. "Can you clarify the severity of malnutrition?" When Abridge captures these discussions, the query becomes unnecessary.
          </Text>
          <Text style={styles.cardLabel}>THE CALCULATION</Text>
          <Text style={styles.cardText}>
            Admissions x Query rate (30%) x Reduction rate (25%) x Cost per query ($50)
          </Text>
          <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
          <Text style={styles.cardText}>
            Query volume is tracked. Query types are categorized. Reduction is measurable post-implementation.
          </Text>
        </View>
      </View>
      
      <View style={styles.fullWidthCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={styles.cardTitle}>DENIAL PREVENTION</Text>
          <Badge type="connected" />
        </View>
        <Text style={styles.cardText}>
          Documentation gaps cause denials--medical necessity not supported, level of care not justified, clinical indicators missing. The same complete documentation that improves DRG accuracy also prevents denials. We combine these rather than double-count. DRG downcoding: 2-4% of inpatient revenue. Denial write-offs: 1-2%. Combined opportunity: 3-6%. We conservatively estimate Abridge captures 15-25% of this leakage.
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
      
      <Text style={styles.sectionHeader}>VALUE MECHANISMS -- CLINICIAN WELLBEING</Text>
      
      <View style={styles.fullWidthCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={styles.cardTitle}>RETENTION SAVINGS</Text>
          <Text style={[styles.cardSubtitle, { backgroundColor: brand.indirectBg, color: brand.indirectText }]}>INDIRECTLY ATTRIBUTABLE</Text>
        </View>
        <Text style={styles.cardLabel}>THE MECHANISM</Text>
        <Text style={styles.cardText}>
          Hospitalists document H&Ps, daily progress notes, and discharge summaries--significant time each day. Reducing this burden means less after-hours documentation, more time for patient care, and reduced burnout.
        </Text>
        <Text style={styles.cardLabel}>THE CALCULATION</Text>
        <Text style={styles.cardText}>
          Hospitalists x Turnover (8%) x Burnout % (45%) x Abridge impact (15%) x Replacement cost ($400K) = Retention value
        </Text>
        <Text style={styles.cardLabel}>WHY DEFENSIBLE</Text>
        <Text style={styles.cardText}>
          Documentation burden and burnout are linked in research. Turnover is measurable. The question is magnitude of impact.
        </Text>
      </View>
      
      <Text style={styles.sectionHeader}>WHAT WE DON'T CLAIM</Text>
      
      <View style={styles.threeColumn}>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[X] LENGTH OF STAY</Text>
          <Text style={styles.cardText}>
            We removed this driver. "Faster documentation = shorter stays" sounds logical but isn't supportable. LOS is driven by clinical readiness, not documentation speed.
          </Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[X] CAPACITY EXPANSION</Text>
          <Text style={styles.cardText}>
            Unlike outpatient, hospitalists can't "see more patients" with saved time. They have an assigned census. Time savings go to wellbeing, not throughput.
          </Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[X] READMISSION</Text>
          <Text style={styles.cardText}>
            Better documentation could theoretically improve handoffs and reduce readmissions. But the causal chain is too long. We don't calculate it.
          </Text>
        </View>
      </View>
      
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          Could complete documentation support faster discharge planning? Perhaps. But we won't model dollars we can't prove.
        </Text>
      </View>
      
      <Text style={styles.sectionHeader}>THE HONEST LIMITS</Text>
      
      <View style={styles.threeColumn}>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[+] WHAT WE MEASURE</Text>
          <Text style={styles.limitsSubtext}>Direct attribution</Text>
          <Text style={styles.limitsBullet}>- Documentation completeness</Text>
          <Text style={styles.limitsBullet}>- CMI changes</Text>
          <Text style={styles.limitsBullet}>- CDI query volume</Text>
          <Text style={styles.limitsBullet}>- Chart completion time</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[~] WHAT WE INFLUENCE</Text>
          <Text style={styles.limitsSubtext}>Indirect attribution</Text>
          <Text style={styles.limitsBullet}>- Denial rates (payer varies)</Text>
          <Text style={styles.limitsBullet}>- Hospitalist retention</Text>
          <Text style={styles.limitsBullet}>- DRG finalization speed</Text>
          <Text style={styles.limitsBullet}>- Coder productivity</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[ ] WHAT WE REMOVED</Text>
          <Text style={styles.limitsSubtext}>Not defensible</Text>
          <Text style={styles.limitsBullet}>- LOS reduction</Text>
          <Text style={styles.limitsBullet}>- Capacity expansion</Text>
          <Text style={styles.limitsBullet}>- Readmission reduction</Text>
          <Text style={styles.limitsBullet}>- Throughput gains</Text>
        </View>
      </View>
      
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>THE INPATIENT REALITY: </Text>
          Documentation value in inpatient is about accuracy, not speed. We capture what was discussed--that's where the DRG value lives.
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
      
      <Text style={styles.subSectionHeader}>DRG ACCURACY</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Source</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>At-risk rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20-30%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>25%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Industry research</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Protection rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15-25%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Conservative estimate</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>DRG weight increase</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>0.3-0.6</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>0.4</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Blended CC/MCC impact</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Base DRG payment</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$5-8K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$6K</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Payer mix average</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2 }]}>Realization rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>40-60%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>50%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Accounts for audits, coder discretion</Text>
        </View>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <Text style={styles.subSectionHeader}>CDI</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Query rate</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>20-40%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>30%</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Reduction rate</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>20-30%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>25%</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Cost per query</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$50-100</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$50</Text>
            </View>
          </View>
        </View>
        <View style={styles.column}>
          <Text style={styles.subSectionHeader}>TIME & RETENTION</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Assumption</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Time saved/admission</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>15-45 min</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>30 min</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Hospitalist turnover</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>6-12%</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>8%</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Replacement cost</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$300-500K</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>$400K</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>WHY 50% REALIZATION ON DRG? </Text>
          Not every documented condition becomes revenue. RAC audits, coder discretion, payer edits--we account for all of it. This is the number you can actually count on.
        </Text>
      </View>
      
      <Text style={styles.sectionHeader}>VALIDATION PATH</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>DRG ACCURACY</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>Baseline CMI by unit, CC/MCC capture rates</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Track CMI on Abridge units vs. control</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>Timeline: 3-6 months</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CDI QUERIES</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>Query rate by unit, query types</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Compare query rates pre/post</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-3 months</Text>
        </View>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>DENIALS</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>Denial rate by reason code</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Track doc-related denials Abridge vs. control</Text>
          <Text style={[styles.cardText, { marginTop: 4, fontFamily: "Helvetica-Bold" }]}>Timeline: 6-12 months</Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>RETENTION</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>Turnover rate, exit interviews</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>Track turnover on Abridge services</Text>
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
      
      <Text style={styles.sectionHeader}>CONNECTED VALUE</Text>
      
      <Text style={styles.subSectionHeader}>ED + NURSING DOCUMENTATION COMPOUNDS INPATIENT VALUE</Text>
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>ED DOCUMENTATION</Text>
          <Text style={styles.cardText}>
            For admitted patients, ED documentation establishes complexity from admission. Conditions documented in ED carry forward to inpatient coding. Medical necessity is established at arrival.
          </Text>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>NURSING DOCUMENTATION</Text>
          <Text style={styles.cardText}>
            Nursing assessments capture clinical indicators that support DRG assignment. "Patient appears malnourished" or "skin breakdown observed" feeds coding. Real-time nursing docs provide contemporaneous evidence.
          </Text>
        </View>
      </View>
      
      <Text style={styles.bodyText}>
        If your organization uses Abridge across ED, Inpatient, and Nursing, documentation creates a complete clinical picture from arrival through discharge--supporting accurate coding at every stage.
      </Text>
      
      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>WORKING WITH YOUR CDI TEAM: </Text>
          Your CDI team is your best partner for validating documentation value. They see the gaps. They know which queries repeat. Before implementation: baseline metrics, common query types, current capture rates. After: regular check-ins, collaborative review, joint celebration when metrics improve.
        </Text>
      </View>
      
      <Text style={styles.sectionHeader}>VALIDATION TIMELINES</Text>
      
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Metric</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Timeline to Meaningful Data</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Documentation completeness</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-4 weeks</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>CDI query reduction</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-3 months</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>CMI changes</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>3-6 months</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Denial rate changes</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>6-12 months</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Retention impact</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>12-18 months</Text>
        </View>
      </View>
      
      <Text style={styles.sectionHeader}>SUMMARY</Text>
      <Text style={styles.bodyText}>
        Inpatient value is fundamentally about documentation accuracy. In DRG-based payment, you get paid for what you document--not what you discussed, not what you did.
      </Text>
      
      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>DOCUMENTATION (Direct)</Text>
            <Text style={styles.summaryItem}>DRG accuracy</Text>
            <Text style={styles.summaryItem}>CDI efficiency</Text>
            <Text style={styles.summaryItem}>Denial prevention</Text>
          </View>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>WELLBEING (Indirect)</Text>
            <Text style={styles.summaryItem}>Retention value</Text>
            <Text style={styles.summaryItem}>Time back</Text>
            <Text style={styles.summaryItem}>Work-life balance</Text>
          </View>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>WHAT WE DON'T CLAIM</Text>
            <Text style={styles.summaryItem}>LOS reduction</Text>
            <Text style={styles.summaryItem}>Capacity expansion</Text>
            <Text style={styles.summaryItem}>Readmission impact</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.bodyText}>
        We model what's defensible and remove what's not. That discipline is the methodology.
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

function InpatientMethodologyDocument() {
  return (
    <Document>
      <Page1 />
      <Page2 />
      <Page3 />
      <Page4 />
    </Document>
  );
}

export async function generateInpatientMethodologyPDF(): Promise<void> {
  try {
    const blob = await pdf(<InpatientMethodologyDocument />).toBlob();
    saveAs(blob, "Abridge-Inpatient-ROI-Methodology.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
