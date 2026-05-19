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
// PAGE 1: Context + Value Categories + Value Mechanisms (Time Back)
// ============================================================================

function Page1() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <Text style={styles.mainTitle}>OUTPATIENT: HOW WE THINK ABOUT VALUE</Text>
      <Text style={styles.subtitle}>A framework for understanding value when billing creates a clear value chain</Text>
      
      <SectionHeader title="THE CONTEXT" isFirst />
      <Text style={styles.bodyText}>
        Outpatient medicine has the clearest path from documentation time to revenue. Physicians bill for each encounter. More encounters, more wRVUs, more revenue. This billing relationship creates a direct value chain.
      </Text>
      <Text style={styles.bodyText}>
        When a physician saves 3 minutes per visit, that time can become additional patient capacity, or it can stay in their pocket as work-life balance. Either way, the value is traceable. Documentation quality also matters--wRVU lift from accurate coding, HCC capture for MA populations, denial prevention.
      </Text>
      
      <SectionHeader title="TWO VALUE CATEGORIES" />
      
      <View style={styles.twoColumn}>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>TIME BACK</Text>
          <Text style={styles.cardText}>
            Capacity expansion, cost reduction, provider wellbeing. When documentation is faster, physicians can see more patients, reduce burnout, or both. The time has measurable value.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
        <View style={[styles.card, styles.column]}>
          <Text style={styles.cardTitle}>DOCUMENTATION QUALITY</Text>
          <Text style={styles.cardText}>
            wRVU accuracy, HCC capture, denial prevention. When documentation is complete, coding is accurate, and revenue follows. The notes drive the billing.
          </Text>
          <View style={{ marginTop: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: brand.borderGray }}>
            <Text style={[styles.cardText, { fontFamily: "Helvetica-Bold" }]}>Direct, measurable value</Text>
          </View>
        </View>
      </View>
      
      <SectionHeader title="VALUE MECHANISMS — TIME BACK" />
      
      <View style={styles.twoColumn}>
        <View style={[styles.mechanismCard, styles.column, { borderTopColor: brand.directAccent }]}>
          <Badge type="direct" />
          <Text style={styles.mechanismTitle}>PATIENT ACCESS (CAPACITY)</Text>
          <Text style={styles.mechanismText}>
            If physicians use saved time to see more patients, that's additional revenue. 3 min/visit × 20 visits = 60 min/day. Convert some portion to additional visits.
          </Text>
          <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
          <Text style={styles.mechanismText}>
            Hours saved × % to capacity (5-15%) × Revenue per visit × Realization = Access value
          </Text>
        </View>
        
        <View style={[styles.mechanismCard, styles.column, { borderTopColor: brand.indirectAccent }]}>
          <Badge type="indirect" />
          <Text style={styles.mechanismTitle}>PROVIDER WELLBEING</Text>
          <Text style={styles.mechanismText}>
            Documentation burden is the #1 driver of physician burnout. Burnout drives turnover. Reducing burden helps retain physicians.
          </Text>
          <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
          <Text style={styles.mechanismText}>
            Physicians × Turnover × Burnout % × Abridge impact × Replacement cost = Retention value
          </Text>
        </View>
      </View>
      
      <View style={[styles.card, { marginBottom: 8 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={styles.cardTitle}>COST REDUCTION</Text>
          <Badge type="potential" />
        </View>
        <Text style={styles.cardText}>
          Some organizations use time savings for cost reduction--reduced overtime, avoided hires, scribe replacement. We don't calculate this automatically because every organization is different. Users enter their own estimate if applicable.
        </Text>
      </View>
      
      <PageFooter pageNum={1} totalPages={3} careSetting="Outpatient" />
    </Page>
  );
}

// ============================================================================
// PAGE 2: Value Mechanisms (Documentation Quality) + Honest Limits + Assumptions
// ============================================================================

function Page2() {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      
      <SectionHeader title="VALUE MECHANISMS — DOCUMENTATION QUALITY" isFirst />
      
      <View style={styles.twoColumn}>
        <View style={[styles.mechanismCard, styles.column, { borderTopColor: brand.directAccent }]}>
          <Badge type="direct" />
          <Text style={styles.mechanismTitle}>E/M LEVEL ACCURACY</Text>
          <Text style={styles.mechanismText}>
            Better documentation supports accurate coding. When the note fully captures medical decision-making and complexity, codes reflect actual work performed.
          </Text>
          <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
          <Text style={styles.mechanismText}>
            Encounters × Current avg wRVU × Lift % (2-9%) × Conversion factor × Realization = E/M value
          </Text>
        </View>
        
        <View style={[styles.mechanismCard, styles.column, { borderTopColor: brand.directAccent }]}>
          <Badge type="direct" />
          <Text style={styles.mechanismTitle}>HCC CAPTURE (MA POPULATIONS)</Text>
          <Text style={styles.mechanismText}>
            For Medicare Advantage patients, complete documentation captures HCCs that affect risk adjustment. Conditions discussed but not documented don't count.
          </Text>
          <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
          <Text style={styles.mechanismText}>
            MA patients × Gap rate × Recapture target × RAF impact × Annual payment × Realization = HCC value
          </Text>
        </View>
      </View>
      
      <View style={[styles.mechanismCard, { marginBottom: 10, borderTopColor: brand.directAccent }]}>
        <Badge type="direct" />
        <Text style={styles.mechanismTitle}>DENIAL PREVENTION</Text>
        <Text style={styles.mechanismText}>
          Documentation gaps drive 30-40% of denials that cannot be appealed--permanent revenue loss. Abridge captures clinical reasoning and medical necessity in real-time, preventing denials before they occur.
        </Text>
        <Text style={[styles.cardLabel, { marginTop: 4 }]}>THE CALCULATION</Text>
        <Text style={styles.mechanismText}>
          Encounters × Denial rate × Unappealable % × Prevention target × Avg claim value × Realization = Denial value
        </Text>
      </View>
      
      <SectionHeader title="THE HONEST LIMITS" />
      
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
      
      <Callout 
        label="THE OUTPATIENT REALITY" 
        text="Outpatient is the clearest ROI story because every visit generates revenue. But how that value shows up depends on organizational choices."
      />
      
      <PageFooter pageNum={2} totalPages={3} careSetting="Outpatient" />
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
          <Text style={[styles.tableCell, { flex: 1 }]}>2–4 min</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>3 min</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Abridge customer data</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>% of time to capacity</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>5-25%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>10%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Org-dependent choice</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>E/M lift</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>2-9%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>5%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Coding analysis</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt]}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>HCC gap rate</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>20-30%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>25%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>MA population studies</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Physician turnover</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>6-9%</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>7%</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>Industry benchmarks</Text>
        </View>
        <View style={[styles.tableRow, styles.tableRowAlt, styles.tableRowLast]}>
          <Text style={[styles.tableCell, { flex: 2.5 }]}>Replacement cost</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$250-500K</Text>
          <Text style={[styles.tableCell, { flex: 1 }]}>$350K</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>AAFP/AMA data</Text>
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
          <Text style={styles.cardTitle}>TIME SAVINGS</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Time-motion studies; EHR session data</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Repeat measurements; Compare Abridge vs. control</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-4 weeks</Text>
        </View>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={styles.cardTitle}>wRVU ACCURACY</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- wRVU distribution by physician</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Compare distribution pre/post; Track by complexity</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 2-3 months</Text>
        </View>
      </View>
      
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={styles.cardTitle}>HCC CAPTURE</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- RAF gap analysis; Current recapture rates</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track recapture on Abridge patients</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 6-12 months (RAF lag)</Text>
        </View>
        <View style={[styles.card, styles.column, { padding: 7 }]}>
          <Text style={styles.cardTitle}>RETENTION</Text>
          <Text style={styles.cardLabel}>Before:</Text>
          <Text style={styles.cardText}>- Baseline turnover rate; Exit interview data</Text>
          <Text style={styles.cardLabel}>After:</Text>
          <Text style={styles.cardText}>- Track turnover; Survey on satisfaction</Text>
          <Text style={[styles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>Timeline: 12-18 months</Text>
        </View>
      </View>
      
      <PageFooter pageNum={3} totalPages={3} careSetting="Outpatient" />
    </Page>
  );
}

// ============================================================================
// METHODOLOGY DOCUMENT
// ============================================================================

function OutpatientMethodologyDocument() {
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

export async function generateOutpatientMethodologyPDF(): Promise<void> {
  try {
    const blob = await pdf(<OutpatientMethodologyDocument />).toBlob();
    await savePdfBlob(blob, "Abridge-Outpatient-ROI-Methodology.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
