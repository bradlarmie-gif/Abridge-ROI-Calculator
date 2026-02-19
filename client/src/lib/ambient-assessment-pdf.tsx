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
import { savePdfBlob } from "@/lib/pdf-save";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

Font.registerHyphenationCallback((word) => [word]);

export interface AmbientAssessmentPDFData {
  organizationName: string;
  preparedBy?: string;
  assessmentDate: string;
  providers: number;
  annualEncounters: number;
  utilization: number;
  timeSavings: number;
  documentationScore: number;
  totalAnnualGap: number;
  monthlyGap: number;
  dailyGap: number;
  actNow3yr: number;
  wait6mo3yr: number;
  wait12mo3yr: number;
  permanentlyLost6mo: number;
  permanentlyLost12mo: number;
  domains: {
    capacity: DomainData;
    revenue: DomainData;
    workforce: DomainData;
    risk: DomainData;
  };
}

export interface DomainData {
  activationLevel: 1 | 2 | 3 | 4;
  activationLabel: string;
  score: number;
  gapValue: number;
  keyInput?: string;
  primaryOpportunity: string;
}

const brand = {
  black: "#1A1A1A",
  white: "#FFFFFF",
  red: "#EA2C00",
  warmBg: "#F5F0EB",
  warmGray: "#F7F6F4",
  lightGray: "#F0EFED",
  midGray: "#E8E8E8",
  textPrimary: "#1A1A1A",
  textSecondary: "#525252",
  textTertiary: "#A3A3A3",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: brand.white },
  coverPage: { backgroundColor: brand.white, padding: 0 },
  coverTop: { paddingHorizontal: 56, paddingTop: 52 },
  coverLogo: { width: 88, height: 18, marginBottom: 0 },
  coverContent: { paddingHorizontal: 56, paddingTop: 160 },
  coverEyebrow: { fontSize: 9, color: brand.textTertiary, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 },
  coverTitle: { fontSize: 42, fontFamily: "Helvetica-Bold", color: brand.textPrimary, lineHeight: 1.1, marginBottom: 12 },
  coverAccentLine: { width: 48, height: 3, backgroundColor: brand.red, marginBottom: 20 },
  coverSubtitle: { fontSize: 13, color: brand.textSecondary, lineHeight: 1.6, marginBottom: 40 },
  coverMeta: { fontSize: 10, color: brand.textTertiary, lineHeight: 1.6, marginBottom: 6 },
  coverPreparedLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textTertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  coverPreparedBy: { fontSize: 12, color: brand.textPrimary },
  coverFooter: { position: "absolute", bottom: 32, left: 56, right: 56 },
  coverFooterText: { fontSize: 8, color: brand.textTertiary, borderTopWidth: 1, borderTopColor: brand.midGray, paddingTop: 12, lineHeight: 1.6 },
  cp: { paddingHorizontal: 52, paddingTop: 44, paddingBottom: 64 },
  ph: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: brand.midGray },
  phLogo: { width: 64, height: 13 },
  phRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  phMeta: { fontSize: 8, color: brand.textTertiary, letterSpacing: 1, textTransform: "uppercase" },
  phOrg: { fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textSecondary },
  secLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.red, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 },
  secTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: brand.textPrimary, lineHeight: 1.2, marginBottom: 6 },
  body: { fontSize: 9.5, color: brand.textSecondary, lineHeight: 1.65 },
  bodySmall: { fontSize: 8.5, color: brand.textSecondary, lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 24, left: 52, right: 52, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: brand.midGray, paddingTop: 8 },
  footerText: { fontSize: 7, color: brand.textTertiary },
});

const fmt = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString()}`;
};

const fmtFull = (value: number): string => `$${value.toLocaleString()}`;

const activationColors: Record<1 | 2 | 3 | 4, string> = {
  1: "#EDEDED",
  2: "#D4B896",
  3: "#C17B3E",
  4: "#EA2C00",
};

const getScoreVerdict = (score: number): string => {
  if (score < 34) return "Below the industry average. Significant enterprise value is available across all four domains.";
  if (score <= 50) return "At the industry average. The gap to top quartile is not incremental \u2014 it is structural.";
  if (score <= 70) return "Above the industry average. The remaining gap is concentrated in specific domains.";
  if (score <= 85) return "Approaching top-quartile performance. The remaining opportunity is in optimization.";
  return "Top-quartile documentation intelligence. Focused on continuous optimization.";
};

const PageHeader = ({ data, label }: { data: AmbientAssessmentPDFData; label: string }) => (
  <View style={s.ph}>
    <Image src={abridgeLogoPath} style={s.phLogo} />
    <View style={s.phRight}>
      <Text style={s.phOrg}>{data.organizationName || "Your Organization"}</Text>
      <Text style={s.phMeta}>{label}</Text>
    </View>
  </View>
);

const PageFooter = ({ data, page, total }: { data: AmbientAssessmentPDFData; page: number; total: number }) => (
  <View style={s.footer}>
    <Text style={s.footerText}>
      {data.preparedBy ? `Prepared by: ${data.preparedBy}` : "Abridge Ambient Assessment"}
    </Text>
    <Text style={s.footerText}>Page {page} of {total}</Text>
  </View>
);

const CoverPage = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Page size="A4" style={[s.page, s.coverPage]} wrap={false}>
    <View style={{ position: "absolute", bottom: 80, right: -40, width: 380, height: 420, backgroundColor: brand.red, opacity: 0.06, transform: "rotate(-15deg)" }} />
    <View style={s.coverTop}>
      <Image src={abridgeLogoPath} style={s.coverLogo} />
    </View>
    <View style={s.coverContent}>
      <Text style={s.coverEyebrow}>Documentation Intelligence Assessment</Text>
      <Text style={s.coverTitle}>{data.organizationName || "Your Organization"}</Text>
      <View style={s.coverAccentLine} />
      <Text style={s.coverSubtitle}>
        A structured analysis of the enterprise value flowing through your documentation infrastructure {"\u2014"} where it is being captured, where it is leaking, and what closing the gap is worth.
      </Text>
      <View style={{ flexDirection: "row", gap: 32, marginBottom: 40 }}>
        <View>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textTertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Providers</Text>
          <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: brand.textPrimary }}>{data.providers}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textTertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Annual Encounters</Text>
          <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: brand.textPrimary }}>{data.annualEncounters.toLocaleString()}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textTertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Date</Text>
          <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: brand.textPrimary }}>{data.assessmentDate}</Text>
        </View>
      </View>
      {data.preparedBy && (
        <>
          <Text style={s.coverPreparedLabel}>Prepared by</Text>
          <Text style={s.coverPreparedBy}>{data.preparedBy}</Text>
        </>
      )}
    </View>
    <View style={s.coverFooter}>
      <Text style={s.coverFooterText}>
        This assessment is for strategic planning purposes. All calculations are based on your self-reported inputs and Abridge deployment benchmarks. Conservative haircuts are applied to all estimates. Full methodology is included in this document.
      </Text>
    </View>
  </Page>
);

const ContextPage = ({ data }: { data: AmbientAssessmentPDFData }) => {
  const hoursReclaimed = Math.round((data.annualEncounters * data.timeSavings) / 60);
  const fteEquivalent = (hoursReclaimed / 2080).toFixed(1);

  return (
    <Page size="A4" style={[s.page, s.cp]} wrap={false}>
      <PageHeader data={data} label="The Framework" />

      <Text style={s.secLabel}>Why This Assessment Exists</Text>
      <Text style={[s.secTitle, { marginBottom: 14 }]}>
        Most organizations measure ambient AI by time saved.{"\n"}That misses 80% of the value.
      </Text>

      <Text style={[s.body, { marginBottom: 16 }]}>
        Time savings are real and measurable. But they are the starting input, not the ending output. The enterprise question is: what happens to recaptured time? Does it become additional patient capacity? Improved documentation quality that drives coding accuracy? Reduced after-hours burden that prevents turnover? Each answer has a different dollar value {"\u2014"} and most organizations are not systematically capturing any of them.
      </Text>

      <Text style={[s.body, { marginBottom: 20 }]}>
        This assessment measures your organization across four domains of documentation intelligence {"\u2014"} not just whether you have ambient AI, but whether the value flowing through that infrastructure is being captured at enterprise scale.
      </Text>

      <View style={{ height: 1, backgroundColor: brand.midGray, marginBottom: 20 }} />

      <Text style={s.secLabel}>Your Operating Context</Text>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
        <View style={{ flex: 1, backgroundColor: brand.warmBg, padding: 16 }}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textTertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Time Recaptured</Text>
          <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: brand.textPrimary, marginBottom: 2 }}>{hoursReclaimed.toLocaleString()} hrs</Text>
          <Text style={{ fontSize: 8, color: brand.textTertiary }}>annually ({data.timeSavings} min {"\u00D7"} {data.annualEncounters.toLocaleString()} encounters)</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: brand.warmBg, padding: 16 }}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textTertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>FTE Equivalent</Text>
          <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: brand.textPrimary, marginBottom: 2 }}>{fteEquivalent}</Text>
          <Text style={{ fontSize: 8, color: brand.textTertiary }}>full-time clinical equivalents of recovered time</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: brand.warmBg, padding: 16 }}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textTertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Utilization</Text>
          <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: brand.textPrimary, marginBottom: 2 }}>{data.utilization}%</Text>
          <Text style={{ fontSize: 8, color: brand.textTertiary }}>self-reported current activation level</Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: brand.midGray, marginBottom: 20 }} />

      <Text style={s.secLabel}>The Four Domains</Text>
      <Text style={[s.body, { marginBottom: 14 }]}>
        Documentation intelligence is not a single metric. It operates across four domains, each with its own activation level, measurement challenge, and dollar value:
      </Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        {([
          { label: "Capacity", q: "What happened to the time ambient AI returned?", desc: "Recovered time that becomes additional patient slots, reduced overtime, or operational efficiency." },
          { label: "Revenue", q: "What is documentation fidelity worth to your revenue cycle?", desc: "Coding accuracy, HCC capture, and denial prevention driven by complete clinical notes." },
          { label: "Workforce", q: "What is documentation burden costing your workforce?", desc: "After-hours charting, burnout, and turnover risk directly linked to documentation load." },
          { label: "Risk", q: "Is your documentation ready for what comes next?", desc: "Audit defensibility, quality reporting, and readiness for clinical AI initiatives." },
        ] as const).map((d) => (
          <View key={d.label} style={{ flex: 1, borderWidth: 1, borderColor: brand.midGray, padding: 12 }}>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary, marginBottom: 4 }}>{d.label}</Text>
            <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Oblique", color: brand.red, marginBottom: 6, lineHeight: 1.4 }}>{d.q}</Text>
            <Text style={{ fontSize: 7.5, color: brand.textTertiary, lineHeight: 1.5 }}>{d.desc}</Text>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: brand.black, padding: 16 }}>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.white, lineHeight: 1.5 }}>
          Your organization scored {data.documentationScore} out of 100. {getScoreVerdict(data.documentationScore)}
        </Text>
      </View>

      <PageFooter data={data} page={2} total={5} />
    </Page>
  );
};

const ExecutiveSummaryPage = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Page size="A4" style={[s.page, s.cp]} wrap={false}>
    <PageHeader data={data} label="Executive Summary" />

    <Text style={s.secLabel}>Documentation Intelligence Score</Text>

    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 24, marginBottom: 24 }}>
      <View style={{ width: 120, alignItems: "center", paddingVertical: 20, paddingHorizontal: 16, backgroundColor: brand.warmGray, borderWidth: 1, borderColor: brand.midGray }}>
        <Text style={{ fontSize: 48, fontFamily: "Helvetica-Bold", color: brand.textPrimary, lineHeight: 1 }}>{data.documentationScore}</Text>
        <Text style={{ fontSize: 13, color: brand.textTertiary, marginBottom: 12 }}>/ 100</Text>
        <View style={{ width: 80, height: 5, backgroundColor: brand.midGray, marginBottom: 10 }}>
          <View style={{ height: 5, backgroundColor: brand.red, width: `${data.documentationScore}%` }} />
        </View>
        <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: brand.textTertiary, letterSpacing: 1, textTransform: "uppercase", textAlign: "center" }}>Your Score</Text>
      </View>

      <View style={{ flex: 1, paddingTop: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: brand.midGray }}>
          <Text style={{ fontSize: 9, color: brand.textTertiary }}>Industry average {"\u2014"} organizations using ambient AI today</Text>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary }}>34 / 100</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8, paddingBottom: 0 }}>
          <Text style={{ fontSize: 9, color: brand.textTertiary }}>Top-quartile organizations</Text>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary }}>71 / 100</Text>
        </View>
        <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: brand.textPrimary, lineHeight: 1.5, marginTop: 8 }}>
          {getScoreVerdict(data.documentationScore)}
        </Text>
      </View>
    </View>

    <View style={{ height: 1, backgroundColor: brand.midGray, marginBottom: 20 }} />

    <Text style={s.secLabel}>Unrealized Enterprise Value</Text>

    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 40, fontFamily: "Helvetica-Bold", color: brand.red, lineHeight: 1 }}>{fmt(data.totalAnnualGap)}</Text>
      <Text style={{ fontSize: 11, color: brand.textTertiary, marginTop: 4, marginBottom: 8 }}>annually</Text>
    </View>

    <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
      {[
        { value: fmt(data.monthlyGap), label: "Per Month" },
        { value: fmt(data.dailyGap), label: "Per Day" },
        { value: fmt(data.providers > 0 ? Math.round(data.totalAnnualGap / data.providers) : 0), label: "Per Provider / Year" },
      ].map((item) => (
        <View key={item.label} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: brand.warmGray, borderWidth: 1, borderColor: brand.midGray, alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: brand.textPrimary, marginBottom: 3 }}>{item.value}</Text>
          <Text style={{ fontSize: 7, color: brand.textTertiary, letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center" }}>{item.label}</Text>
        </View>
      ))}
    </View>

    <Text style={{ fontSize: 8.5, color: brand.textTertiary, fontFamily: "Helvetica-Oblique", textAlign: "center", marginBottom: 20 }}>
      Already in your operations. Already earned. Not yet realized.
    </Text>

    <View style={{ height: 1, backgroundColor: brand.midGray, marginBottom: 20 }} />

    <Text style={s.secLabel}>Cost of Waiting</Text>

    <View style={{ borderWidth: 1, borderColor: brand.midGray, marginBottom: 16 }}>
      <View style={{ flexDirection: "row", backgroundColor: brand.lightGray, paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: brand.midGray }}>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 0.3, flex: 2 }}> </Text>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 0.3, flex: 1.5, textAlign: "center" }}>Act Now</Text>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 0.3, flex: 1.5, textAlign: "center" }}>Wait 6 Mo</Text>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 0.3, flex: 1.5, textAlign: "center" }}>Wait 12 Mo</Text>
      </View>
      <View style={{ flexDirection: "row", paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: brand.midGray }}>
        <Text style={{ fontSize: 9, color: brand.textPrimary, flex: 2 }}>3-Year Value</Text>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary, flex: 1.5, textAlign: "center" }}>{fmt(data.actNow3yr)}</Text>
        <Text style={{ fontSize: 9, color: brand.textTertiary, flex: 1.5, textAlign: "center" }}>{fmt(data.wait6mo3yr)}</Text>
        <Text style={{ fontSize: 9, color: brand.textTertiary, flex: 1.5, textAlign: "center" }}>{fmt(data.wait12mo3yr)}</Text>
      </View>
      <View style={{ flexDirection: "row", paddingVertical: 9, paddingHorizontal: 14 }}>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary, flex: 2 }}>Permanently Lost</Text>
        <Text style={{ fontSize: 9, color: brand.textTertiary, flex: 1.5, textAlign: "center" }}>{"\u2014"}</Text>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.red, flex: 1.5, textAlign: "center" }}>{fmt(data.permanentlyLost6mo)}</Text>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.red, flex: 1.5, textAlign: "center" }}>{fmt(data.permanentlyLost12mo)}</Text>
      </View>
    </View>

    <View style={{ backgroundColor: brand.black, padding: 18 }}>
      <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: brand.white, lineHeight: 1.5, marginBottom: 4 }}>
        Every month at current activation levels leaves
      </Text>
      <Text style={{ fontSize: 26, fontFamily: "Helvetica-Bold", color: brand.red, marginBottom: 4 }}>{fmt(data.monthlyGap)}</Text>
      <Text style={{ fontSize: 9, color: "#A3A3A3", lineHeight: 1.6 }}>
        in enterprise value permanently uncaptured. This is not aspirational revenue {"\u2014"} it is value already flowing through your documentation infrastructure that is not being systematically realized.
      </Text>
    </View>

    <PageFooter data={data} page={3} total={5} />
  </Page>
);

const domainLabels: Record<string, string> = {
  capacity: "Capacity",
  revenue: "Revenue",
  workforce: "Workforce",
  risk: "Risk",
};

const domainReframes: Record<string, string> = {
  capacity: "What happened to the time ambient AI returned?",
  revenue: "What is documentation fidelity worth to your revenue cycle?",
  workforce: "What is documentation burden costing your workforce?",
  risk: "Is your documentation infrastructure ready for what comes next?",
};

const domainDescriptions: Record<string, string> = {
  capacity: "Measures how your organization converts recaptured documentation time into enterprise value. This includes additional patient capacity (if demand exists), operational savings from reduced overtime and locum dependency, and the systematic redeployment of clinical hours that ambient AI returns.",
  revenue: "Measures how documentation quality connects to your revenue cycle. Every encounter either captures or leaks value through coding accuracy, HCC recapture rates, and denial prevention. This domain evaluates whether your documentation infrastructure is systematically protecting revenue integrity.",
  workforce: "Measures the relationship between documentation burden and workforce stability. After-hours charting is the leading measurable predictor of clinician burnout, and burnout is the leading driver of turnover. At $500K\u2013$1M per physician replacement, this is not a soft metric \u2014 it is an existential budget line item.",
  risk: "Measures your documentation infrastructure's readiness for increasing payer scrutiny, regulatory requirements, and clinical AI initiatives. Every AI capability your organization plans in the next three years \u2014 clinical decision support, population health, predictive analytics \u2014 requires a structured documentation foundation.",
};

const domainDrivers: Record<string, string[]> = {
  capacity: ["Panel utilization rate", "Overtime / locum dependency", "Patient access wait times", "Slot fill rate"],
  revenue: ["E/M level distribution", "HCC recapture rate", "Denial rate by category", "Payer mix optimization"],
  workforce: ["After-hours documentation time", "Provider satisfaction scores", "Turnover rate by tenure", "Burnout survey results"],
  risk: ["Audit readiness score", "Note completeness rate", "Structured data usability", "Quality reporting accuracy"],
};

const FourDomainsPage = ({ data }: { data: AmbientAssessmentPDFData }) => {
  const domainOrder: Array<keyof typeof data.domains> = ["capacity", "revenue", "workforce", "risk"];

  return (
    <Page size="A4" style={[s.page, s.cp]} wrap={false}>
      <PageHeader data={data} label="Domain Analysis" />

      <Text style={s.secLabel}>Documentation Intelligence {"\u2014"} Domain Breakdown</Text>
      <Text style={[s.body, { marginBottom: 6 }]}>
        Each domain reflects your self-reported activation level and the enterprise value currently uncaptured.
      </Text>
      <Text style={[s.bodySmall, { fontFamily: "Helvetica-Oblique", color: brand.textTertiary, marginBottom: 16 }]}>
        Domain weights: Capacity 30% {"\u00B7"} Revenue 25% {"\u00B7"} Workforce 25% {"\u00B7"} Risk 20%. All values include a conservative haircut.
      </Text>

      {domainOrder.map((key) => {
        const domain = data.domains[key];
        const borderColor = activationColors[domain.activationLevel];

        return (
          <View key={key} style={{ marginBottom: 12, borderWidth: 1, borderColor: brand.midGray, borderLeftWidth: 4, borderLeftColor: borderColor, padding: 14, paddingLeft: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: brand.textPrimary, marginBottom: 2 }}>{domainLabels[key]}</Text>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Oblique", color: brand.red, marginBottom: 2 }}>{domainReframes[key]}</Text>
                <Text style={{ fontSize: 8, color: brand.textTertiary }}>Activation: {domain.activationLabel}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: brand.textPrimary, textAlign: "right" }}>{fmt(domain.gapValue)}</Text>
                <Text style={{ fontSize: 7, color: brand.textTertiary, textAlign: "right" }}>annual gap</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Text style={{ fontSize: 8, color: brand.textTertiary, width: 36 }}>Score</Text>
              <View style={{ flex: 1, height: 4, backgroundColor: brand.midGray }}>
                <View style={{ height: 4, backgroundColor: borderColor, width: `${domain.score}%` }} />
              </View>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textPrimary, width: 40, textAlign: "right" }}>{domain.score} / 100</Text>
            </View>

            <Text style={{ fontSize: 8, color: brand.textSecondary, lineHeight: 1.5, borderTopWidth: 1, borderTopColor: brand.midGray, paddingTop: 6, marginBottom: 4 }}>
              {domainDescriptions[key]}
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {domainDrivers[key].map((driver) => (
                <View key={driver} style={{ backgroundColor: brand.warmBg, paddingVertical: 3, paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 7, color: brand.textSecondary }}>{driver}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <PageFooter data={data} page={4} total={5} />
    </Page>
  );
};

const MethodologyPage = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Page size="A4" style={[s.page, s.cp]} wrap={false}>
    <PageHeader data={data} label="Methodology & Next Steps" />

    <Text style={s.secLabel}>How We Calculate This</Text>
    <Text style={[s.secTitle, { marginBottom: 12 }]}>Transparent methodology. Conservative defaults.</Text>

    <Text style={[s.body, { marginBottom: 16 }]}>
      Every number in this assessment is derived from your inputs, applied against Abridge deployment benchmarks and published healthcare data. We apply a conservative haircut to all estimates because we would rather show a smaller number you can defend than a larger number that falls apart under scrutiny.
    </Text>

    <View style={{ borderWidth: 1, borderColor: brand.midGray, marginBottom: 18 }}>
      <View style={{ flexDirection: "row", backgroundColor: brand.lightGray, paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: brand.midGray }}>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 0.3, flex: 2.5 }}>Your Input</Text>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 0.3, flex: 1.5, textAlign: "center" }}>Your Value</Text>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 0.3, flex: 2, textAlign: "center" }}>Industry Range</Text>
      </View>
      {[
        { label: "Providers", value: String(data.providers), range: "Varies by org" },
        { label: "Annual encounters", value: data.annualEncounters.toLocaleString(), range: "Varies by org" },
        { label: "Current utilization", value: `${data.utilization}%`, range: "30\u201375%" },
        { label: "Time saved per encounter", value: `${data.timeSavings} min`, range: "2\u20136 minutes" },
        { label: "Conservative haircut applied", value: "40%", range: "Standard" },
      ].map((row, i, arr) => (
        <View key={row.label} style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: brand.midGray }}>
          <Text style={{ fontSize: 9, color: brand.textPrimary, flex: 2.5 }}>{row.label}</Text>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary, flex: 1.5, textAlign: "center" }}>{row.value}</Text>
          <Text style={{ fontSize: 9, color: brand.textTertiary, flex: 2, textAlign: "center" }}>{row.range}</Text>
        </View>
      ))}
    </View>

    <View style={{ height: 1, backgroundColor: brand.midGray, marginBottom: 18 }} />

    <Text style={s.secLabel}>What We Can {"\u2014"} And Cannot {"\u2014"} Claim</Text>

    <View style={{ gap: 10, marginBottom: 18 }}>
      <View style={{ backgroundColor: brand.warmGray, borderWidth: 1, borderColor: brand.midGray, padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <View style={{ width: 8, height: 8, backgroundColor: "#22C55E", borderRadius: 4 }} />
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary, textTransform: "uppercase", letterSpacing: 0.5 }}>We Can Measure This</Text>
        </View>
        <Text style={s.bodySmall}>Documentation time reduction (EHR timestamps). E/M level distribution changes (claims data). Denial rate trends by root cause (RCM data). After-hours charting hours (payroll and EHR). These are verifiable within weeks to months.</Text>
      </View>

      <View style={{ backgroundColor: brand.warmGray, borderWidth: 1, borderColor: brand.midGray, padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <View style={{ width: 8, height: 8, backgroundColor: "#F59E0B", borderRadius: 4 }} />
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary, textTransform: "uppercase", letterSpacing: 0.5 }}>We Can Influence This</Text>
        </View>
        <Text style={s.bodySmall}>Patient capacity expansion (requires demand and scheduling changes). HCC recapture improvement (requires coding workflow integration). Throughput gains (multi-factorial). The direction is clear; the magnitude depends on your operational decisions.</Text>
      </View>

      <View style={{ backgroundColor: brand.warmGray, borderWidth: 1, borderColor: brand.midGray, padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <View style={{ width: 8, height: 8, backgroundColor: "#EF4444", borderRadius: 4 }} />
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary, textTransform: "uppercase", letterSpacing: 0.5 }}>We Can Only Enable This</Text>
        </View>
        <Text style={s.bodySmall}>Retention improvement (12{"\u2013"}18 months to measure, multiple drivers). Automation readiness (strategic, not operational). Patient experience gains (many variables). We include these because the value is real, but we label them honestly.</Text>
      </View>
    </View>

    <View style={{ height: 1, backgroundColor: brand.midGray, marginBottom: 18 }} />

    <Text style={s.secLabel}>Suggested Next Steps</Text>

    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ flex: 1, borderWidth: 1, borderColor: brand.midGray, padding: 14 }}>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary, marginBottom: 6 }}>Validate Your Inputs</Text>
        <Text style={s.bodySmall}>Replace self-reported estimates with actual data: EHR timestamps for documentation time, payroll records for overtime, claims data for E/M distributions. The more precise your inputs, the more defensible your business case.</Text>
      </View>
      <View style={{ flex: 1, borderWidth: 1, borderColor: brand.midGray, padding: 14 }}>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: brand.textPrimary, marginBottom: 6 }}>Request a Working Session</Text>
        <Text style={s.bodySmall}>A 30-minute session with Abridge to walk through your domain scores, identify your highest-leverage opportunity, and build a measurement plan for the first 90 days. This is not a product demonstration {"\u2014"} it is a strategic planning exercise.</Text>
      </View>
    </View>

    <PageFooter data={data} page={5} total={5} />
  </Page>
);

const AmbientAssessmentDocument = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Document>
    <CoverPage data={data} />
    <ContextPage data={data} />
    <ExecutiveSummaryPage data={data} />
    <FourDomainsPage data={data} />
    <MethodologyPage data={data} />
  </Document>
);

const opportunityText: Record<string, Record<number, string>> = {
  capacity: {
    1: "Recovered time is not being captured. At your scale, undeployed capacity represents significant clinical supply \u2014 equivalent to additional FTE \u2014 currently evaporating.",
    2: "You're capturing some capacity informally. Systematic redeployment \u2014 structured panel growth or OT reduction \u2014 could multiply the value being captured.",
    3: "Active management is delivering results. The next layer is systematic deployment: structured panel growth programs that turn recovered time into measured revenue.",
    4: "Strong capacity activation. Focus on maintaining and expanding the redeployment infrastructure as provider count and encounter volume grow.",
  },
  revenue: {
    1: "Documentation quality is not yet connected to revenue strategy. Every encounter is either capturing or leaking revenue \u2014 at your volume, the cumulative impact is significant.",
    2: "Some coding improvement has been observed. The gap is in systematically connecting documentation fidelity to denial management and HCC capture strategy.",
    3: "Active revenue management is delivering measurable results. HCC capture optimization represents the highest remaining opportunity at your payer mix.",
    4: "Documentation infrastructure is driving revenue strategy. Focus on maintaining fidelity as encounter volume grows and payer mix evolves.",
  },
  workforce: {
    1: "After-hours documentation burden is the leading driver of burnout and the primary predictor of turnover. Measuring it is the first step to managing it.",
    2: "Survey improvement is a lagging indicator. Connecting documentation burden reduction directly to after-hours charting data would reveal the retention opportunity more precisely.",
    3: "After-hours burden is measurably declining. The next step is connecting this improvement directly to retention metrics and premium labor cost reduction.",
    4: "Documentation burden is connected to retention strategy. This is the highest-leverage workforce infrastructure investment available.",
  },
  risk: {
    1: "Documentation infrastructure is not yet positioned as a compliance or automation asset. Every AI initiative your organization plans in the next three years requires this foundation.",
    2: "Note completeness has improved. The gap is in audit defensibility and structured data usability \u2014 two dimensions that compound risk as payer scrutiny increases.",
    3: "Audit posture is actively managed. The primary remaining exposure is automation readiness \u2014 documentation as the foundation for your next-generation clinical initiatives.",
    4: "Documentation infrastructure is positioned as a strategic asset. The focus is on maintaining this foundation as automation initiatives scale.",
  },
};

export { opportunityText };

export async function generateAmbientAssessmentPDF(
  data: AmbientAssessmentPDFData
): Promise<void> {
  const blob = await pdf(<AmbientAssessmentDocument data={data} />).toBlob();
  const today = new Date().toISOString().split("T")[0];
  const orgName = (data.organizationName || "Organization").replace(/\s+/g, "_");
  const fileName = `Ambient_Assessment_${orgName}_${today}.pdf`;
  await savePdfBlob(blob, fileName);
}

export async function generateAmbientAssessmentPDFBlob(
  data: AmbientAssessmentPDFData
): Promise<Blob> {
  return await pdf(<AmbientAssessmentDocument data={data} />).toBlob();
}
