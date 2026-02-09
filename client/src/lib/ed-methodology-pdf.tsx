import {
  Document,
  Page,
  Text,
  View,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import {
  brand,
  sharedStyles as styles,
  Badge,
  SectionHeader,
  PageHeader,
  PageFooter,
  Callout,
} from "./pdf-theme";

Font.registerHyphenationCallback((word) => [word]);

// ============================================================================
// PAGE 1: Context + Value Categories + Value Mechanisms (Throughput)
// ============================================================================

function Page1() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.mainTitle}>ED: HOW WE THINK ABOUT VALUE</Text>
      <Text style={styles.subtitle}>A framework for understanding value in high-volume, fast-paced emergency settings</Text>
      
      <SectionHeader title="THE CONTEXT" isFirst />
      <Text style={styles.bodyText}>
        Emergency departments operate differently than any other care setting. High volume, unpredictable flow, and templated workflows mean documentation happens in compressed windows--often after the patient encounter, sometimes hours later.
      </Text>
      <Text style={styles.bodyText}>
        ED physicians don't lack time per encounter the way outpatient physicians do. They lack time in aggregate--the cumulative burden of documentation across a shift of 20-40 patients creates fatigue, extends shifts, and contributes to the highest burnout rates in medicine.
      </Text>
      
      <SectionHeader title="TWO VALUE CATEGORIES" />
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>THROUGHPUT & EFFICIENCY</Text>
          <Text style={styles.cardText}>
            LWBS reduction, faster door-to-doc, admission capture. When documentation doesn't bottleneck the department, patients move through faster. The ED is a flow problem--documentation is often the constraint.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>DOCUMENTATION QUALITY</Text>
          <Text style={styles.cardText}>
            E&M accuracy, denial prevention, and downstream inpatient revenue. ED documentation is the foundation for admitted patients--what's captured here affects the entire inpatient stay.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct + downstream value</Text>
          </View>
        </View>
      </View>
      
      <SectionHeader title="VALUE MECHANISMS — THROUGHPUT" />
      
      <View style={styles.twoColumn}>
        <View style={[styles.mechanismCard, styles.column, { borderTopColor: brand.directAccent }]}>
          <Badge type="direct" />
          <Text style={styles.mechanismTitle}>LWBS REDUCTION</Text>
          <Text style={styles.mechanismText}>
            When ED physicians document faster, they can see the next patient sooner. Reduced wait times mean fewer patients leave without being seen.
          </Text>
          <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
          <Text style={styles.mechanismText}>
            Current LWBS rate × Reduction % (10-30%) × Avg ED revenue per visit = LWBS value
          </Text>
        </View>
        
        <View style={[styles.mechanismCard, styles.column, { borderTopColor: brand.indirectAccent }]}>
          <Badge type="indirect" />
          <Text style={styles.mechanismTitle}>ADMISSION CAPTURE</Text>
          <Text style={styles.mechanismText}>
            Patients who might be discharged due to documentation burden or shift-end pressure can be properly worked up and admitted when appropriate.
          </Text>
          <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
          <Text style={styles.mechanismText}>
            Potential admissions captured × Admission revenue = Capture value
          </Text>
        </View>
      </View>
      
      <View style={[styles.mechanismCard, { marginBottom: 8, borderTopColor: brand.connectedAccent }]}>
        <Badge type="connected" />
        <Text style={styles.mechanismTitle}>CLINICIAN WELLBEING</Text>
        <Text style={styles.mechanismText}>
          ED has the highest burnout rate of any specialty (65%+). Documentation burden is a primary driver. Time saved per shift directly impacts whether physicians finish on time or stay late charting. Same retention model as other settings with ED-specific defaults: 12% turnover, 50% burnout-related, $500K replacement cost.
        </Text>
      </View>
      
      <PageFooter pageNum={1} totalPages={3} careSetting="Emergency Department" />
    </Page>
  );
}

// ============================================================================
// PAGE 2: Value Mechanisms (Documentation Quality) + Honest Limits
// ============================================================================

function Page2() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <SectionHeader title="VALUE MECHANISMS — DOCUMENTATION QUALITY" isFirst />
      
      <View style={styles.twoColumn}>
        <View style={[styles.mechanismCard, styles.column, { borderTopColor: brand.directAccent }]}>
          <Badge type="direct" />
          <Text style={styles.mechanismTitle}>E&M ACCURACY</Text>
          <Text style={styles.mechanismText}>
            ED E&M coding is driven by documentation of medical decision-making, history, and exam. Templated workflows often under-capture complexity. Ambient documentation captures the full clinical picture.
          </Text>
          <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
          <Text style={styles.mechanismText}>
            Encounters × Current E&M distribution × Lift % × Revenue difference = E&M value
          </Text>
        </View>
        
        <View style={[styles.mechanismCard, styles.column, { borderTopColor: brand.directAccent }]}>
          <Badge type="direct" />
          <Text style={styles.mechanismTitle}>DENIAL PREVENTION</Text>
          <Text style={styles.mechanismText}>
            ED encounters face high denial rates--medical necessity, level of care, observation vs. inpatient status. Complete documentation creates contemporaneous evidence for appeals.
          </Text>
          <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
          <Text style={styles.mechanismText}>
            Denial rate × Documentation-preventable % × Avg claim value = Denial prevention value
          </Text>
        </View>
      </View>
      
      <View style={[styles.mechanismCard, { marginBottom: 10, borderTopColor: brand.connectedAccent }]}>
        <Badge type="connected" />
        <Text style={styles.mechanismTitle}>DOWNSTREAM INPATIENT VALUE</Text>
        <Text style={styles.mechanismText}>
          For admitted patients, ED documentation affects the entire inpatient stay. Conditions documented in ED carry forward to coding. Medical necessity established in ED supports the admission. This value is quantified in the Inpatient methodology--we note it here as connected value.
        </Text>
      </View>
      
      <SectionHeader title="THE HONEST LIMITS" />
      
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
          <Text style={styles.limitsBullet}>- Patient throughput</Text>
        </View>
        <View style={styles.limitsColumn}>
          <Text style={styles.limitsHeader}>[ ] WHAT WE ENABLE</Text>
          <Text style={styles.limitsSubtext}>Supportive only</Text>
          <Text style={styles.limitsBullet}>- Downstream DRG accuracy</Text>
          <Text style={styles.limitsBullet}>- Inpatient denial prevention</Text>
          <Text style={styles.limitsBullet}>- Patient experience</Text>
          <Text style={styles.limitsBullet}>- Care continuity</Text>
        </View>
      </View>
      
      <Callout 
        label="THE ED REALITY" 
        text="ED is the hardest setting to isolate documentation impact because so many variables affect throughput. We're honest about what we can measure directly vs. what we influence indirectly."
      />
      
      <PageFooter pageNum={2} totalPages={3} careSetting="Emergency Department" />
    </Page>
  );
}

// ============================================================================
// PAGE 3: Key Assumptions + Validation Path
// ============================================================================

function Page3() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <SectionHeader title="KEY ASSUMPTIONS" isFirst />
      
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Input</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Range</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Default</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Rationale</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Time saved per encounter</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>1-3 min</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2 min</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Abridge ED data</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Baseline LWBS rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-5%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>3%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>ED benchmarks</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>LWBS reduction</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>10-30%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Conservative estimate</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>ED physician turnover</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>10-15%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>12%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Specialty benchmarks</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Burnout-related turnover</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>40-60%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>50%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>EM literature</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Replacement cost</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$400-600K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$500K</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>EM recruitment data</Text>
        </View>
      </View>
      
      <Callout 
        label="WHY WE DEFAULT CONSERVATIVE" 
        text="We'd rather show a smaller number you can defend than a larger number that falls apart under scrutiny."
      />
      
      <SectionHeader title="VALIDATION PATH" />
      <Text style={[styles.bodyText, { marginBottom: 6 }]}>
        Our projections are starting points. The real answers come from your data.
      </Text>
      
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 6 }}>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={styles.cardTitle}>THROUGHPUT</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Door-to-doc time; LWBS rates; Shift end times</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Compare metrics Abridge vs. control shifts</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 4-8 weeks</Text>
        </View>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={styles.cardTitle}>E&M ACCURACY</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- E&M level distribution by physician</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Compare distribution pre/post; Track by acuity</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-3 months</Text>
        </View>
      </View>
      
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={styles.cardTitle}>DENIAL RATES</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Denial rates by reason code; Documentation gaps</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track denials on Abridge encounters vs. control</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 6-12 months</Text>
        </View>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={styles.cardTitle}>RETENTION</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Baseline turnover; Exit interview data on burnout</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track turnover; Survey on satisfaction</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 12-18 months</Text>
        </View>
      </View>
      
      <PageFooter pageNum={3} totalPages={3} careSetting="Emergency Department" />
    </Page>
  );
}

// ============================================================================
// METHODOLOGY DOCUMENT
// ============================================================================

function EDMethodologyDocument() {
  return (
    <Document>
      <Page1 />
      <Page2 />
      <Page3 />
    </Document>
  );
}

// ============================================================================
// EXPORT FUNCTION
// ============================================================================

export async function generateEDMethodologyPDF(): Promise<void> {
  try {
    const blob = await pdf(<EDMethodologyDocument />).toBlob();
    await savePdfBlob(blob, "Abridge-ED-ROI-Methodology.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
