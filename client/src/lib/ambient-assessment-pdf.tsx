import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../assets/fonts/manrope-regular.ttf";
import manropeBold from "../assets/fonts/manrope-bold.ttf";

Font.registerHyphenationCallback((word) => [word]);

Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});

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

const colors = {
  background: "#FFFFFF",
  cards: "#F5F0EB",
  primary: "#EA2C00",
  primaryText: "#1A1A1A",
  secondary: "#666666",
  tertiary: "#999999",
  border: "#E0E0E0",
  dark: "#1A1A1A",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    padding: 54,
    paddingBottom: 50,
    fontFamily: "Manrope",
    fontSize: 10.5,
    color: colors.primaryText,
    backgroundColor: colors.background,
  },
  pageWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  sectionLabel: {
    fontSize: 9,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionLabelGray: {
    fontSize: 9,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  body: {
    fontSize: 10.5,
    color: colors.secondary,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 10,
  },
  thickDivider: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    marginVertical: 12,
  },
  cardBg: {
    backgroundColor: colors.cards,
    padding: 14,
    borderRadius: 4,
  },
  calloutBox: {
    backgroundColor: colors.cards,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 12,
  },
  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLeft: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "bold",
  },
  footerCenter: {
    fontSize: 8.5,
    color: colors.secondary,
  },
  footerRight: {
    fontSize: 8.5,
    color: colors.tertiary,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
});

const fmt = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString()}`;
};

const activationColors: Record<1 | 2 | 3 | 4, string> = {
  1: "#D0D0D0",
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

function PageFooter({ pageNum, total, orgName }: { pageNum: number; total: number; orgName: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerLeft}>ABRIDGE</Text>
      <Text style={styles.footerCenter}>Ambient Assessment {"\u00B7"} {orgName || "Your Organization"}</Text>
      <Text style={styles.footerRight}>Page {pageNum} of {total}</Text>
    </View>
  );
}

function Page1ScoreAndValue({ data }: { data: AmbientAssessmentPDFData }) {
  const hoursReclaimed = Math.round((data.annualEncounters * data.timeSavings) / 60);
  const fteEquivalent = (hoursReclaimed / 2080).toFixed(1);
  const perProvider = data.providers > 0 ? Math.round(data.totalAnnualGap / data.providers) : 0;

  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>YOUR SCORE</Text>

        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          <View style={[styles.col, styles.cardBg, { alignItems: "center", paddingVertical: 20 }]}>
            <Text style={{ fontSize: 56, fontWeight: "bold", color: colors.primaryText, lineHeight: 1 }}>{data.documentationScore}</Text>
            <Text style={{ fontSize: 14, color: colors.tertiary, marginBottom: 10 }}>/ 100</Text>
            <View style={{ width: 100, height: 6, backgroundColor: colors.border, borderRadius: 3, marginBottom: 8 }}>
              <View style={{ height: 6, backgroundColor: colors.primary, borderRadius: 3, width: `${data.documentationScore}%` }} />
            </View>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.tertiary, letterSpacing: 1.5, textTransform: "uppercase" }}>Documentation Intelligence</Text>
          </View>

          <View style={styles.col}>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 9.5, color: colors.secondary }}>Industry average</Text>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>34 / 100</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontSize: 9.5, color: colors.secondary }}>Top-quartile</Text>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>71 / 100</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 9.5, color: colors.secondary }}>Your organization</Text>
                <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primary }}>{data.documentationScore} / 100</Text>
              </View>
            </View>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.5 }}>
              {getScoreVerdict(data.documentationScore)}
            </Text>
          </View>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>UNREALIZED ENTERPRISE VALUE</Text>

        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          <View style={styles.col}>
            <View style={[styles.calloutBox, { marginBottom: 10 }]}>
              <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primary, lineHeight: 1 }}>{fmt(data.totalAnnualGap)}</Text>
              <Text style={{ fontSize: 10, color: colors.tertiary, marginTop: 4 }}>annually</Text>
            </View>
            <View style={[styles.twoColRow, { gap: 8 }]}>
              <View style={[styles.col, styles.cardBg, { alignItems: "center", paddingVertical: 10 }]}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{fmt(data.monthlyGap)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5 }}>Per Month</Text>
              </View>
              <View style={[styles.col, styles.cardBg, { alignItems: "center", paddingVertical: 10 }]}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{fmt(perProvider)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5 }}>Per Provider / Yr</Text>
              </View>
            </View>
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionLabelGray}>YOUR INPUTS</Text>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginBottom: 8 }}>
              {[
                { label: "Providers", value: String(data.providers) },
                { label: "Annual encounters", value: data.annualEncounters.toLocaleString() },
                { label: "Utilization rate", value: `${data.utilization}%` },
                { label: "Time saved / encounter", value: `${data.timeSavings} min` },
                { label: "Hours reclaimed", value: `${hoursReclaimed.toLocaleString()} hrs` },
                { label: "FTE equivalent", value: fteEquivalent },
              ].map((row, i, arr) => (
                <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 10, backgroundColor: i % 2 === 0 ? colors.cards : colors.background, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{row.label}</Text>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{row.value}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.4 }}>
              Already in your operations. Already earned. Not yet realized.
            </Text>
          </View>
        </View>

        <PageFooter pageNum={1} total={4} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

const domainMeta: Record<string, { name: string; question: string; description: string; drivers: string[] }> = {
  capacity: {
    name: "Capacity",
    question: "What happened to the time ambient AI returned?",
    description: "Recovered time that becomes additional patient slots, reduced overtime, or operational efficiency. At your scale, undeployed capacity represents clinical supply currently evaporating.",
    drivers: ["Panel utilization rate", "Overtime / locum dependency", "Patient access wait times", "Slot fill rate"],
  },
  revenue: {
    name: "Revenue",
    question: "What is documentation fidelity worth to your revenue cycle?",
    description: "Coding accuracy, HCC capture, and denial prevention driven by complete clinical notes. Every encounter either captures or leaks value through your documentation infrastructure.",
    drivers: ["E/M level distribution", "HCC recapture rate", "Denial rate by category", "Payer mix optimization"],
  },
  workforce: {
    name: "Workforce",
    question: "What is documentation burden costing your workforce?",
    description: "After-hours charting is the leading predictor of burnout, and burnout drives turnover. At $500K\u2013$1M per physician replacement, this is an existential budget line item.",
    drivers: ["After-hours documentation time", "Provider satisfaction scores", "Turnover rate by tenure", "Burnout survey results"],
  },
  risk: {
    name: "Risk",
    question: "Is your documentation ready for what comes next?",
    description: "Audit defensibility, quality reporting, and readiness for clinical AI. Every AI initiative your organization plans requires a structured documentation foundation.",
    drivers: ["Audit readiness score", "Note completeness rate", "Structured data usability", "Quality reporting accuracy"],
  },
};

function Page2Domains({ data }: { data: AmbientAssessmentPDFData }) {
  const domainOrder: Array<keyof typeof data.domains> = ["capacity", "revenue", "workforce", "risk"];

  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>THE FOUR DOMAINS</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Where Enterprise Value Lives</Text>
        <Text style={styles.body}>
          Each domain reflects your self-reported activation level and the enterprise value currently uncaptured. Domain weights: Capacity 30% {"\u00B7"} Revenue 25% {"\u00B7"} Workforce 25% {"\u00B7"} Risk 20%.
        </Text>

        <View style={styles.divider} />

        {domainOrder.map((key, ci) => {
          const domain = data.domains[key];
          const meta = domainMeta[key];
          const accentColor = activationColors[domain.activationLevel];

          return (
            <View key={key}>
              <Text style={{ fontSize: 9, color: accentColor, textTransform: "uppercase", letterSpacing: 2, marginTop: ci > 0 ? 8 : 0, marginBottom: 6, fontWeight: "bold" }}>{meta.name}</Text>
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 12, marginBottom: 6 }}>
                <View style={{ paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: accentColor }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{meta.question}</Text>
                      <Text style={{ fontSize: 8.5, color: colors.tertiary }}>Activation: {domain.activationLabel} {"\u00B7"} Score: {domain.score}/100</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{fmt(domain.gapValue)}</Text>
                      <Text style={{ fontSize: 8, color: colors.tertiary }}>annual gap</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
                      <View style={{ height: 4, backgroundColor: accentColor, borderRadius: 2, width: `${domain.score}%` }} />
                    </View>
                    <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primaryText, width: 30, textAlign: "right" }}>{domain.score}%</Text>
                  </View>

                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 6 }}>{meta.description}</Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {meta.drivers.map((driver) => (
                      <View key={driver} style={{ backgroundColor: colors.cards, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 3 }}>
                        <Text style={{ fontSize: 7.5, color: colors.secondary }}>{driver}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              {ci < domainOrder.length - 1 && <View style={styles.divider} />}
            </View>
          );
        })}

        <PageFooter pageNum={2} total={4} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

function Page3CostOfInaction({ data }: { data: AmbientAssessmentPDFData }) {
  const perProvider = data.providers > 0 ? Math.round(data.totalAnnualGap / data.providers) : 0;
  const perEncounter = data.annualEncounters > 0 ? Math.round(data.totalAnnualGap / data.annualEncounters) : 0;

  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>COST OF INACTION</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Every Month at Current Activation Levels</Text>
        <Text style={styles.body}>
          This is not aspirational revenue. It is value already flowing through your documentation infrastructure that is not being systematically realized.
        </Text>

        <View style={styles.divider} />

        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          <View style={[styles.col, { backgroundColor: colors.dark, borderRadius: 4, padding: 16 }]}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.tertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Monthly Value Uncaptured</Text>
            <Text style={{ fontSize: 40, fontWeight: "bold", color: colors.primary, lineHeight: 1, marginBottom: 6 }}>{fmt(data.monthlyGap)}</Text>
            <Text style={{ fontSize: 9, color: "#999999", lineHeight: 1.5 }}>
              {fmt(perProvider)} per provider {"\u00B7"} ${perEncounter} per encounter
            </Text>
          </View>
          <View style={[styles.col, { backgroundColor: colors.dark, borderRadius: 4, padding: 16 }]}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.tertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Daily Value Uncaptured</Text>
            <Text style={{ fontSize: 40, fontWeight: "bold", color: colors.white, lineHeight: 1, marginBottom: 6 }}>{fmt(data.dailyGap)}</Text>
            <Text style={{ fontSize: 9, color: "#999999", lineHeight: 1.5 }}>
              Every business day your organization does not systematically capture this value.
            </Text>
          </View>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>THREE-YEAR PROJECTION</Text>

        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.cards, paddingVertical: 7, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ flex: 2.5, fontSize: 8, fontWeight: "bold", color: colors.primaryText }}>SCENARIO</Text>
            <Text style={{ flex: 2, fontSize: 8, fontWeight: "bold", color: colors.primaryText, textAlign: "center" }}>3-YEAR VALUE</Text>
            <Text style={{ flex: 2, fontSize: 8, fontWeight: "bold", color: colors.primary, textAlign: "center" }}>PERMANENTLY LOST</Text>
          </View>
          {[
            { label: "Act now", value3yr: data.actNow3yr, lost: null },
            { label: "Wait 6 months", value3yr: data.wait6mo3yr, lost: data.permanentlyLost6mo },
            { label: "Wait 12 months", value3yr: data.wait12mo3yr, lost: data.permanentlyLost12mo },
          ].map((row, i, arr) => (
            <View key={row.label} style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 12, backgroundColor: i % 2 === 1 ? colors.cards : colors.background, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={{ flex: 2.5, fontSize: 9.5, fontWeight: i === 0 ? "bold" : "normal", color: colors.primaryText }}>{row.label}</Text>
              <Text style={{ flex: 2, fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textAlign: "center" }}>{fmt(row.value3yr)}</Text>
              <Text style={{ flex: 2, fontSize: 9.5, fontWeight: "bold", color: row.lost ? colors.primary : colors.tertiary, textAlign: "center" }}>{row.lost ? fmt(row.lost) : "\u2014"}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.calloutBox, { marginBottom: 10 }]}>
          <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
            Delay doesn{"\u2019"}t pause the loss. Every month at current activation permanently forfeits {fmt(data.monthlyGap)} in enterprise value that cannot be retroactively recovered.
          </Text>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>WHAT THIS MEANS</Text>
        <Text style={styles.body}>
          Your organization has {data.providers} providers generating {data.annualEncounters.toLocaleString()} encounters annually. At {data.utilization}% utilization and {data.timeSavings} minutes saved per encounter, the documentation infrastructure is returning value {"\u2014"} but not at the rate the underlying data supports. The gap between current performance and systematic enterprise capture is {fmt(data.totalAnnualGap)} annually.
        </Text>

        <PageFooter pageNum={3} total={4} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

function Page4NextSteps({ data }: { data: AmbientAssessmentPDFData }) {
  const topDomain = (["capacity", "revenue", "workforce", "risk"] as const)
    .map((k) => ({ key: k, gap: data.domains[k].gapValue }))
    .sort((a, b) => b.gap - a.gap)[0];
  const topDomainName = domainMeta[topDomain.key].name;

  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>TRANSPARENCY</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>How We Calculate This</Text>
        <Text style={styles.body}>
          Every number in this assessment is derived from your inputs, applied against Abridge deployment benchmarks and published healthcare data. We apply a conservative haircut to all estimates.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabelGray}>KEY ASSUMPTIONS</Text>

        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.cards, paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ flex: 3, fontSize: 8, fontWeight: "bold", color: colors.primaryText }}>ASSUMPTION</Text>
            <Text style={{ flex: 1.5, fontSize: 8, fontWeight: "bold", color: colors.primaryText }}>YOUR VALUE</Text>
            <Text style={{ flex: 2, fontSize: 8, fontWeight: "bold", color: colors.primary }}>INDUSTRY RANGE</Text>
          </View>
          {[
            { assumption: "Providers on ambient AI", yours: String(data.providers), range: "Varies by org" },
            { assumption: "Annual encounters", yours: data.annualEncounters.toLocaleString(), range: "Varies by org" },
            { assumption: "Utilization rate", yours: `${data.utilization}%`, range: "30\u201375%" },
            { assumption: "Time saved per encounter", yours: `${data.timeSavings} min`, range: "2\u20136 minutes" },
            { assumption: "Abridge utilization benchmark", yours: "76%", range: "Production data" },
            { assumption: "Abridge time benchmark", yours: "3.0 min", range: "Production data" },
            { assumption: "Conservative realization haircut", yours: "40%", range: "Standard" },
          ].map((row, i, arr) => (
            <View key={row.assumption} style={{ flexDirection: "row", paddingVertical: 4, paddingHorizontal: 10, backgroundColor: i % 2 === 1 ? colors.cards : colors.background, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={{ flex: 3, fontSize: 8.5, color: colors.primaryText }}>{row.assumption}</Text>
              <Text style={{ flex: 1.5, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>{row.yours}</Text>
              <Text style={{ flex: 2, fontSize: 8.5, color: colors.secondary }}>{row.range}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.calloutBox, { marginBottom: 10 }]}>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
            We would rather show a smaller number you can defend than a larger number that falls apart under scrutiny. All gap values reflect a 40% conservative haircut applied after calculation.
          </Text>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>NEXT STEPS</Text>
        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          <View style={[styles.col, styles.cardBg, { padding: 12 }]}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 6 }}>Validate Your Inputs</Text>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 6 }}>
              Replace self-reported estimates with actual data: EHR timestamps for documentation time, payroll records for overtime, claims data for E/M distributions.
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 5 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>Timeline: 1{"\u2013"}2 weeks</Text>
            </View>
          </View>
          <View style={[styles.col, { backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 12, paddingVertical: 10 }]}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 6 }}>Request a Working Session</Text>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 6 }}>
              A 30-minute session to walk through your domain scores, identify your highest-leverage opportunity ({topDomainName}: {fmt(topDomain.gap)}), and build a measurement plan for the first 90 days.
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 5 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>Strategic planning, not a demo</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
          This assessment is for strategic planning purposes. All calculations are based on self-reported inputs and Abridge deployment benchmarks. The models are directional {"\u2014"} the real answers come from your data.
        </Text>

        <PageFooter pageNum={4} total={4} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

const AmbientAssessmentDocument = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Document>
    <PDFCoverPage
      reportLabel="Documentation Intelligence Assessment"
      title="Ambient Assessment"
      subtitle={`A structured analysis of the enterprise value flowing through your documentation infrastructure \u2014 where it is being captured, where it is leaking, and what closing the gap is worth.`}
      clientName={data.organizationName || "Your Organization"}
      preparedBy={data.preparedBy || "Abridge Partner Success"}
      disclaimerText="This assessment is for strategic planning purposes. All calculations are based on self-reported inputs and Abridge deployment benchmarks. Conservative haircuts are applied to all estimates."
    />
    <Page1ScoreAndValue data={data} />
    <Page2Domains data={data} />
    <Page3CostOfInaction data={data} />
    <Page4NextSteps data={data} />
  </Document>
);

const opportunityText: Record<string, Record<number, string>> = {
  capacity: {
    1: "Recovered time is not being captured. At your scale, undeployed capacity represents significant clinical supply currently evaporating.",
    2: "You\u2019re capturing some capacity informally. Systematic redeployment could multiply the value being captured.",
    3: "Active management is delivering results. The next layer is systematic deployment: structured panel growth programs.",
    4: "Strong capacity activation. Focus on maintaining and expanding the redeployment infrastructure.",
  },
  revenue: {
    1: "Documentation quality is not yet connected to revenue strategy. At your volume, the cumulative impact is significant.",
    2: "Some coding improvement has been observed. The gap is in systematically connecting documentation fidelity to denial management.",
    3: "Active revenue management is delivering measurable results. HCC capture optimization represents the highest remaining opportunity.",
    4: "Documentation infrastructure is driving revenue strategy. Focus on maintaining fidelity as volume grows.",
  },
  workforce: {
    1: "After-hours documentation burden is the leading driver of burnout and the primary predictor of turnover.",
    2: "Survey improvement is a lagging indicator. Connecting documentation burden directly to after-hours charting data would reveal the retention opportunity.",
    3: "After-hours burden is measurably declining. The next step is connecting this improvement directly to retention metrics.",
    4: "Documentation burden is connected to retention strategy. This is the highest-leverage workforce infrastructure investment.",
  },
  risk: {
    1: "Documentation infrastructure is not yet positioned as a compliance or automation asset.",
    2: "Note completeness has improved. The gap is in audit defensibility and structured data usability.",
    3: "Audit posture is actively managed. The primary remaining exposure is automation readiness.",
    4: "Documentation infrastructure is positioned as a strategic asset. Focus on maintaining this foundation.",
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
