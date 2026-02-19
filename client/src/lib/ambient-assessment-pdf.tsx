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
  warmGray: "#F7F6F4",
  lightGray: "#F0EFED",
  midGray: "#E8E8E8",
  textPrimary: "#1A1A1A",
  textSecondary: "#525252",
  textTertiary: "#A3A3A3",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: brand.white,
  },
  coverPage: {
    backgroundColor: brand.white,
    padding: 0,
  },
  coverTop: {
    paddingHorizontal: 56,
    paddingTop: 52,
  },
  coverLogo: {
    width: 88,
    height: 18,
    marginBottom: 0,
  },
  coverContent: {
    paddingHorizontal: 56,
    paddingTop: 180,
  },
  coverEyebrow: {
    fontSize: 9,
    fontFamily: "Helvetica",
    color: brand.textTertiary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  coverTitle: {
    fontSize: 44,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
    lineHeight: 1.1,
    marginBottom: 12,
  },
  coverAccentLine: {
    width: 48,
    height: 3,
    backgroundColor: brand.red,
    marginBottom: 24,
  },
  coverMeta: {
    fontSize: 13,
    color: brand.textSecondary,
    lineHeight: 1.6,
    marginBottom: 48,
  },
  coverPreparedLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.textTertiary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  coverPreparedBy: {
    fontSize: 12,
    color: brand.textPrimary,
  },
  coverFooter: {
    position: "absolute",
    bottom: 32,
    left: 56,
    right: 56,
  },
  coverFooterText: {
    fontSize: 8,
    color: brand.textTertiary,
    borderTopWidth: 1,
    borderTopColor: brand.midGray,
    paddingTop: 12,
  },
  contentPage: {
    paddingHorizontal: 52,
    paddingTop: 44,
    paddingBottom: 64,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 36,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  headerLogo: {
    width: 64,
    height: 13,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerMeta: {
    fontSize: 8,
    color: brand.textTertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerOrg: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.textSecondary,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.red,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  body: {
    fontSize: 10,
    color: brand.textSecondary,
    lineHeight: 1.65,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
    marginBottom: 28,
  },
  scoreBlock: {
    width: 120,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: brand.warmGray,
    borderWidth: 1,
    borderColor: brand.midGray,
  },
  scoreNumber: {
    fontSize: 48,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
    lineHeight: 1,
  },
  scoreDenominator: {
    fontSize: 13,
    color: brand.textTertiary,
    marginBottom: 12,
  },
  scoreBarContainer: {
    width: 80,
    height: 5,
    backgroundColor: brand.midGray,
    marginBottom: 10,
  },
  scoreBarFill: {
    height: 5,
    backgroundColor: brand.red,
  },
  scoreLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: brand.textTertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  scoreContext: {
    flex: 1,
    paddingTop: 4,
  },
  scoreBenchmarkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  scoreBenchmarkLabel: {
    fontSize: 9,
    color: brand.textTertiary,
  },
  scoreBenchmarkValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
  },
  scoreVerdict: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
    lineHeight: 1.5,
    marginTop: 8,
  },
  gapHero: {
    marginBottom: 24,
  },
  gapValue: {
    fontSize: 40,
    fontFamily: "Helvetica-Bold",
    color: brand.red,
    lineHeight: 1,
  },
  gapUnit: {
    fontSize: 11,
    color: brand.textTertiary,
    marginTop: 4,
    marginBottom: 12,
  },
  gapBreakdownRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  gapBreakdownCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: brand.warmGray,
    borderWidth: 1,
    borderColor: brand.midGray,
    alignItems: "center",
  },
  gapBreakdownValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
    marginBottom: 4,
  },
  gapBreakdownLabel: {
    fontSize: 8,
    color: brand.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  gapReframe: {
    fontSize: 9,
    color: brand.textTertiary,
    fontFamily: "Helvetica-Oblique",
    textAlign: "center",
    marginBottom: 24,
  },
  table: {
    borderWidth: 1,
    borderColor: brand.midGray,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.lightGray,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 9,
    color: brand.textPrimary,
  },
  tableCellRed: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.red,
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
  },
  tableCellMuted: {
    fontSize: 9,
    color: brand.textTertiary,
  },
  darkCard: {
    backgroundColor: brand.black,
    padding: 20,
    marginBottom: 20,
  },
  darkCardHeadline: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: brand.white,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  darkCardValue: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: brand.red,
    marginBottom: 4,
  },
  darkCardBody: {
    fontSize: 9,
    color: "#A3A3A3",
    lineHeight: 1.6,
  },
  domainCard: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: brand.midGray,
    borderLeftWidth: 4,
    padding: 16,
    paddingLeft: 14,
  },
  domainCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  domainName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
    marginBottom: 3,
  },
  domainActivation: {
    fontSize: 8,
    color: brand.textTertiary,
  },
  domainGapValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
    textAlign: "right",
  },
  domainGapLabel: {
    fontSize: 8,
    color: brand.textTertiary,
    textAlign: "right",
  },
  domainScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  domainScoreLabel: {
    fontSize: 8,
    color: brand.textTertiary,
    width: 44,
  },
  domainScoreBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: brand.midGray,
  },
  domainScoreBarFill: {
    height: 4,
    backgroundColor: brand.red,
  },
  domainScoreValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
    width: 40,
    textAlign: "right",
  },
  domainOpportunity: {
    fontSize: 9,
    color: brand.textSecondary,
    lineHeight: 1.55,
    borderTopWidth: 1,
    borderTopColor: brand.midGray,
    paddingTop: 8,
  },
  domainKeyInput: {
    fontSize: 8,
    color: brand.textTertiary,
    fontFamily: "Helvetica-Oblique",
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: brand.midGray,
    paddingTop: 8,
  },
  footerLeft: {
    fontSize: 7,
    color: brand.textTertiary,
  },
  footerRight: {
    fontSize: 7,
    color: brand.textTertiary,
  },
});

const fmt = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value.toLocaleString()}`;
};

const activationColors: Record<1 | 2 | 3 | 4, string> = {
  1: "#EDEDED",
  2: "#D4B896",
  3: "#C17B3E",
  4: "#EA2C00",
};

const getScoreVerdict = (score: number): string => {
  if (score < 34) return "Below the industry average. Significant enterprise value is available across all four domains.";
  if (score <= 50) return "At the industry average. The gap to top quartile is not incremental. It is structural.";
  if (score <= 70) return "Above the industry average. The remaining gap is concentrated in specific domains.";
  if (score <= 85) return "Approaching top-quartile performance. The remaining opportunity is in optimization.";
  return "Top-quartile documentation intelligence. Focused on continuous optimization.";
};

const CoverPage = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Page size="A4" style={[styles.page, styles.coverPage]} wrap={false}>
    <View style={{
      position: "absolute",
      bottom: 80,
      right: -40,
      width: 380,
      height: 420,
      backgroundColor: brand.red,
      opacity: 0.06,
      transform: "rotate(-15deg)",
    }} />

    <View style={styles.coverTop}>
      <Image src={abridgeLogoPath} style={styles.coverLogo} />
    </View>

    <View style={styles.coverContent}>
      <Text style={styles.coverEyebrow}>Ambient Assessment</Text>
      <Text style={styles.coverTitle}>
        {data.organizationName || "Your Organization"}
      </Text>
      <View style={styles.coverAccentLine} />
      <Text style={styles.coverMeta}>
        {data.providers} providers {"\u00B7"} {data.annualEncounters.toLocaleString()} annual encounters
      </Text>
      {data.preparedBy && (
        <>
          <Text style={styles.coverPreparedLabel}>Prepared by</Text>
          <Text style={styles.coverPreparedBy}>
            {data.preparedBy} {"\u00B7"} {data.assessmentDate}
          </Text>
        </>
      )}
    </View>

    <View style={styles.coverFooter}>
      <Text style={styles.coverFooterText}>
        This assessment is for planning purposes. Calculations are based on your inputs and Abridge methodology.
      </Text>
    </View>
  </Page>
);

const ExecutiveSummaryPage = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
    <View style={styles.pageHeader}>
      <Image src={abridgeLogoPath} style={styles.headerLogo} />
      <View style={styles.headerRight}>
        <Text style={styles.headerOrg}>
          {data.organizationName || "Your Organization"}
        </Text>
        <Text style={styles.headerMeta}>Executive Summary</Text>
      </View>
    </View>

    <Text style={styles.sectionLabel}>Documentation Intelligence Score</Text>

    <View style={styles.scoreRow}>
      <View style={styles.scoreBlock}>
        <Text style={styles.scoreNumber}>{data.documentationScore}</Text>
        <Text style={styles.scoreDenominator}>/ 100</Text>
        <View style={styles.scoreBarContainer}>
          <View style={[styles.scoreBarFill, { width: `${data.documentationScore}%` }]} />
        </View>
        <Text style={styles.scoreLabel}>Your Score</Text>
      </View>

      <View style={styles.scoreContext}>
        <View style={styles.scoreBenchmarkRow}>
          <Text style={styles.scoreBenchmarkLabel}>
            Industry average {"\u2014"} organizations using ambient AI today
          </Text>
          <Text style={styles.scoreBenchmarkValue}>34 / 100</Text>
        </View>
        <View style={[styles.scoreBenchmarkRow, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
          <Text style={styles.scoreBenchmarkLabel}>Top-quartile organizations</Text>
          <Text style={styles.scoreBenchmarkValue}>71 / 100</Text>
        </View>
        <Text style={styles.scoreVerdict}>
          {getScoreVerdict(data.documentationScore)}
        </Text>
      </View>
    </View>

    <View style={{ height: 1, backgroundColor: brand.midGray, marginBottom: 24 }} />

    <Text style={styles.sectionLabel}>Unrealized Enterprise Value</Text>

    <View style={styles.gapHero}>
      <Text style={styles.gapValue}>{fmt(data.totalAnnualGap)}</Text>
      <Text style={styles.gapUnit}>annually</Text>
    </View>

    <View style={styles.gapBreakdownRow}>
      <View style={styles.gapBreakdownCard}>
        <Text style={styles.gapBreakdownValue}>{fmt(data.monthlyGap)}</Text>
        <Text style={styles.gapBreakdownLabel}>Per Month</Text>
      </View>
      <View style={styles.gapBreakdownCard}>
        <Text style={styles.gapBreakdownValue}>{fmt(data.dailyGap)}</Text>
        <Text style={styles.gapBreakdownLabel}>Per Day</Text>
      </View>
      <View style={styles.gapBreakdownCard}>
        <Text style={styles.gapBreakdownValue}>
          {fmt(data.providers > 0 ? Math.round(data.totalAnnualGap / data.providers) : 0)}
        </Text>
        <Text style={styles.gapBreakdownLabel}>Per Provider / Year</Text>
      </View>
    </View>

    <Text style={styles.gapReframe}>
      Already in your operations. Already earned. Not yet realized.
    </Text>

    <View style={{ height: 1, backgroundColor: brand.midGray, marginBottom: 24 }} />

    <Text style={styles.sectionLabel}>Cost of Waiting</Text>

    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}> </Text>
        <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "center" }]}>Act Now</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "center" }]}>Wait 6 Mo</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "center" }]}>Wait 12 Mo</Text>
      </View>

      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { flex: 2 }]}>3-Year Value</Text>
        <Text style={[styles.tableCellBold, { flex: 1.5, textAlign: "center" }]}>
          {fmt(data.actNow3yr)}
        </Text>
        <Text style={[styles.tableCell, { flex: 1.5, textAlign: "center", color: brand.textTertiary }]}>
          {fmt(data.wait6mo3yr)}
        </Text>
        <Text style={[styles.tableCell, { flex: 1.5, textAlign: "center", color: brand.textTertiary }]}>
          {fmt(data.wait12mo3yr)}
        </Text>
      </View>

      <View style={[styles.tableRow, styles.tableRowLast]}>
        <Text style={[styles.tableCellBold, { flex: 2 }]}>Permanently Lost</Text>
        <Text style={[styles.tableCellMuted, { flex: 1.5, textAlign: "center" }]}>{"\u2014"}</Text>
        <Text style={[styles.tableCellRed, { flex: 1.5, textAlign: "center" }]}>
          {fmt(data.permanentlyLost6mo)}
        </Text>
        <Text style={[styles.tableCellRed, { flex: 1.5, textAlign: "center" }]}>
          {fmt(data.permanentlyLost12mo)}
        </Text>
      </View>
    </View>

    <View style={styles.darkCard}>
      <Text style={styles.darkCardHeadline}>
        Every month at current activation levels leaves
      </Text>
      <Text style={styles.darkCardValue}>{fmt(data.monthlyGap)}</Text>
      <Text style={styles.darkCardBody}>
        in enterprise value permanently uncaptured.{"\n"}
        Conservative estimate. Based on your inputs. Methodology available on request.
      </Text>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerLeft}>
        {data.preparedBy
          ? `Prepared by: ${data.preparedBy}`
          : "Abridge Ambient Assessment"}
      </Text>
      <Text style={styles.footerRight}>Page 2 of 3</Text>
    </View>
  </Page>
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

const FourDomainsPage = ({ data }: { data: AmbientAssessmentPDFData }) => {
  const domainOrder: Array<keyof typeof data.domains> =
    ['capacity', 'revenue', 'workforce', 'risk'];

  const domainLabels = {
    capacity: 'Capacity',
    revenue: 'Revenue',
    workforce: 'Workforce',
    risk: 'Risk',
  };

  const domainReframes = {
    capacity: 'What happened to the time ambient AI returned?',
    revenue: 'What is documentation fidelity worth to your revenue cycle?',
    workforce: 'What is documentation burden costing your workforce?',
    risk: 'Is your documentation infrastructure ready for what comes next?',
  };

  return (
    <Page size="A4" style={[styles.page, styles.contentPage]} wrap={false}>
      <View style={styles.pageHeader}>
        <Image src={abridgeLogoPath} style={styles.headerLogo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerOrg}>
            {data.organizationName || "Your Organization"}
          </Text>
          <Text style={styles.headerMeta}>Four Domains</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Documentation Intelligence {"\u2014"} Domain Breakdown</Text>
      <Text style={[styles.body, { marginBottom: 20 }]}>
        Each domain reflects your self-reported activation level and the enterprise
        value currently uncaptured. The opportunity column shows what closing the gap
        to the next activation level would deliver.
      </Text>

      {domainOrder.map((key) => {
        const domain = data.domains[key];
        const borderColor = activationColors[domain.activationLevel];

        return (
          <View key={key} style={[styles.domainCard, { borderLeftColor: borderColor }]}>
            <View style={styles.domainCardTop}>
              <View>
                <Text style={styles.domainName}>{domainLabels[key]}</Text>
                <Text style={styles.domainActivation}>
                  Activation: {domain.activationLabel}
                </Text>
              </View>
              <View>
                <Text style={styles.domainGapValue}>{fmt(domain.gapValue)}</Text>
                <Text style={styles.domainGapLabel}>annual gap</Text>
              </View>
            </View>

            <View style={styles.domainScoreRow}>
              <Text style={styles.domainScoreLabel}>Score</Text>
              <View style={styles.domainScoreBarBg}>
                <View style={[
                  styles.domainScoreBarFill,
                  { width: `${domain.score}%`, backgroundColor: borderColor }
                ]} />
              </View>
              <Text style={styles.domainScoreValue}>{domain.score} / 100</Text>
            </View>

            {domain.keyInput && (
              <Text style={styles.domainKeyInput}>
                Your input: {domain.keyInput}
              </Text>
            )}

            <Text style={styles.domainOpportunity}>
              {domain.primaryOpportunity}
            </Text>
          </View>
        );
      })}

      <Text style={{
        fontSize: 8,
        color: brand.textTertiary,
        fontFamily: "Helvetica-Oblique",
        textAlign: "center",
        marginTop: 8,
      }}>
        Domain scores are weighted: Capacity 30% {"\u00B7"} Revenue 25% {"\u00B7"}
        Workforce 25% {"\u00B7"} Risk 20%.{"\n"}
        All values are conservative estimates based on your inputs
        and Abridge deployment benchmarks.
      </Text>

      <View style={styles.footer}>
        <Text style={styles.footerLeft}>
          {data.preparedBy
            ? `Prepared by: ${data.preparedBy}`
            : "Abridge Ambient Assessment"}
        </Text>
        <Text style={styles.footerRight}>Page 3 of 3</Text>
      </View>
    </Page>
  );
};

const AmbientAssessmentDocument = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Document>
    <CoverPage data={data} />
    <ExecutiveSummaryPage data={data} />
    <FourDomainsPage data={data} />
  </Document>
);

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
