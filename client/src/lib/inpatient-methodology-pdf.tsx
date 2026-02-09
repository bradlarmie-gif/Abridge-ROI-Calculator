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
// PAGE 1: Context + Value Categories + Value Mechanisms (Documentation Quality)
// ============================================================================

function Page1() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.mainTitle}>INPATIENT: HOW WE THINK ABOUT VALUE</Text>
      <Text style={styles.subtitle}>A framework for understanding value in DRG-based reimbursement</Text>
      
      <SectionHeader title="THE CONTEXT" isFirst />
      <Text style={styles.bodyText}>
        Inpatient medicine operates on a fundamentally different economic model than outpatient care. Hospitals are paid a fixed amount per admission based on the DRG--the Diagnosis Related Group. That payment is determined by what's documented.
      </Text>
      <Text style={styles.bodyText}>
        If a condition was discussed at bedside but not documented, it doesn't exist for coding purposes. If clinical complexity isn't captured in the note, the DRG may be assigned lower than warranted. This is where ambient documentation creates value--not by adding things that weren't there, but by capturing what was actually discussed.
      </Text>
      
      <SectionHeader title="TWO VALUE CATEGORIES" />
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>DOCUMENTATION QUALITY</Text>
          <Text style={styles.cardText}>
            DRG accuracy, denial prevention, CDI efficiency. When documentation captures clinical complexity, revenue follows. The notes drive the payment.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>CLINICIAN WELLBEING</Text>
          <Text style={styles.cardText}>
            Hospitalists document multiple notes per patient--H&P, daily progress, discharge summary. Reducing this burden improves work-life balance and retention.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Indirect value (no capacity expansion)</Text>
          </View>
        </View>
      </View>
      
      <SectionHeader title="VALUE MECHANISMS — DOCUMENTATION QUALITY" />
      
      <View style={styles.twoColumn}>
        <View style={[styles.mechanismCard, styles.column, { borderTopColor: brand.directAccent }]}>
          <Badge type="direct" />
          <Text style={styles.mechanismTitle}>DRG ACCURACY (CC/MCC CAPTURE)</Text>
          <Text style={styles.mechanismText}>
            CCs and MCCs increase DRG weight and payment. When hospitalists discuss acute kidney injury, malnutrition, or respiratory failure at bedside but don't fully document it, that complexity isn't coded.
          </Text>
          <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
          <Text style={styles.mechanismText}>
            Admissions × At-risk rate (25%) × Protection rate (20%) × DRG weight increase (0.4) × Base payment ($6K) × Realization (50%)
          </Text>
        </View>
        
        <View style={[styles.mechanismCard, styles.column, { borderTopColor: brand.directAccent }]}>
          <Badge type="direct" />
          <Text style={styles.mechanismTitle}>CDI QUERY REDUCTION</Text>
          <Text style={styles.mechanismText}>
            CDI queries often ask physicians to document what they already discussed. "Can you clarify the severity of malnutrition?" When Abridge captures these discussions, the query becomes unnecessary.
          </Text>
          <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
          <Text style={styles.mechanismText}>
            Admissions × Query rate (30%) × Reduction rate (25%) × Cost per query ($50)
          </Text>
        </View>
      </View>
      
      <View style={[styles.mechanismCard, { marginBottom: 8, borderTopColor: brand.connectedAccent }]}>
        <Badge type="connected" />
        <Text style={styles.mechanismTitle}>DENIAL PREVENTION</Text>
        <Text style={styles.mechanismText}>
          Documentation gaps cause denials--medical necessity not supported, level of care not justified, clinical indicators missing. The same complete documentation that improves DRG accuracy also prevents denials. We combine these rather than double-count. DRG downcoding: 2-4% of inpatient revenue. Denial write-offs: 1-2%. Combined opportunity: 3-6%. We conservatively estimate Abridge captures 15-25% of this leakage.
        </Text>
      </View>
      
      <PageFooter pageNum={1} totalPages={3} careSetting="Inpatient" />
    </Page>
  );
}

// ============================================================================
// PAGE 2: Clinician Wellbeing + What We Don't Claim + Honest Limits
// ============================================================================

function Page2() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <SectionHeader title="VALUE MECHANISMS — CLINICIAN WELLBEING" isFirst />
      
      <View style={[styles.mechanismCard, { marginBottom: 10, borderTopColor: brand.indirectAccent }]}>
        <Badge type="indirect" />
        <Text style={styles.mechanismTitle}>RETENTION SAVINGS</Text>
        <Text style={styles.mechanismText}>
          Hospitalists document H&Ps, daily progress notes, and discharge summaries--significant time each day. Reducing this burden means less after-hours documentation, more time for patient care, and reduced burnout.
        </Text>
        <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
        <Text style={styles.mechanismText}>
          Hospitalists × Turnover (8%) × Burnout % (45%) × Abridge impact (15%) × Replacement cost ($400K) = Retention value
        </Text>
      </View>
      
      <SectionHeader title="WHAT WE DON'T CLAIM" />
      
      <View style={styles.threeColumn}>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={[styles.cardTitle, { color: brand.mediumGray }]}>[X] LENGTH OF STAY</Text>
          <Text style={styles.cardText}>
            We removed this driver. "Faster documentation = shorter stays" sounds logical but isn't supportable. LOS is driven by clinical readiness, not documentation speed.
          </Text>
        </View>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={[styles.cardTitle, { color: brand.mediumGray }]}>[X] CAPACITY EXPANSION</Text>
          <Text style={styles.cardText}>
            Unlike outpatient, hospitalists can't "see more patients" with saved time. They have an assigned census. Time savings go to wellbeing, not throughput.
          </Text>
        </View>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={[styles.cardTitle, { color: brand.mediumGray }]}>[X] READMISSION</Text>
          <Text style={styles.cardText}>
            Better documentation could theoretically improve handoffs and reduce readmissions. But the causal chain is too long. We don't calculate it.
          </Text>
        </View>
      </View>
      
      <SectionHeader title="THE HONEST LIMITS" />
      
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
      
      <Callout 
        label="THE INPATIENT REALITY" 
        text="Documentation value in inpatient is about accuracy, not speed. We capture what was discussed--that's where the DRG value lives."
      />
      
      <PageFooter pageNum={2} totalPages={3} careSetting="Inpatient" />
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
          <Text style={[styles.tableCell, { flex: 2.5 }]}>At-risk rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20-30%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>25%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Industry research</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Protection rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>15-25%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Conservative estimate</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>DRG weight increase</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>0.3-0.6</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>0.4</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Blended CC/MCC impact</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>CDI query rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20-40%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>30%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>CDI benchmarks</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Hospitalist turnover</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>6-10%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>8%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Industry benchmarks</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Replacement cost</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$300-500K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$400K</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Hospitalist recruitment data</Text>
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
          <Text style={styles.cardTitle}>DRG ACCURACY</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- CMI by physician/unit; CC/MCC capture rates</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Compare CMI Abridge vs. control; Track CC/MCC changes</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 3-6 months</Text>
        </View>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={styles.cardTitle}>CDI QUERIES</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Query volume by physician; Query types</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track query rates Abridge vs. control</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-3 months</Text>
        </View>
      </View>
      
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={styles.cardTitle}>DENIAL RATES</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Denial rates by reason code; Documentation gaps</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track denials on Abridge admissions vs. control</Text>
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
      
      <PageFooter pageNum={3} totalPages={3} careSetting="Inpatient" />
    </Page>
  );
}

// ============================================================================
// METHODOLOGY DOCUMENT
// ============================================================================

function InpatientMethodologyDocument() {
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

export async function generateInpatientMethodologyPDF(): Promise<void> {
  try {
    const blob = await pdf(<InpatientMethodologyDocument />).toBlob();
    await savePdfBlob(blob, "Abridge-Inpatient-ROI-Methodology.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
