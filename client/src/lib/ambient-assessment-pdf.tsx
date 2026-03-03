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
  revenuePerVisit?: number;
  providerRate?: number;
  conversionFactor?: number;
  assessmentNarrative: string;
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
  hasValue?: boolean;
  headlineMetric?: string;
  keyInput?: string;
  primaryOpportunity: string;
}

const TOTAL_PAGES = 5;

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
  positive: "#059669",
};

const styles = StyleSheet.create({
  page: {
    padding: 54,
    paddingBottom: 50,
    fontFamily: "Manrope",
    fontSize: 10.5,
    color: "#1A1A1A",
    backgroundColor: "#FFFFFF",
  },
  pageWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  sectionLabel: {
    fontSize: 9,
    color: "#EA2C00",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionLabelGray: {
    fontSize: 9,
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  body: {
    fontSize: 10.5,
    color: "#666666",
    lineHeight: 1.5,
    marginBottom: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginVertical: 10,
  },
  thickDivider: {
    borderBottomWidth: 2,
    borderBottomColor: "#E0E0E0",
    marginVertical: 12,
  },
  cardBg: {
    backgroundColor: "#F5F0EB",
    padding: 14,
    borderRadius: 4,
  },
  calloutBox: {
    backgroundColor: "#F5F0EB",
    borderLeftWidth: 3,
    borderLeftColor: "#EA2C00",
    padding: 12,
  },
  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  footerLeft: {
    fontSize: 10,
    color: "#EA2C00",
    fontWeight: "bold",
  },
  footerCenter: {
    fontSize: 8.5,
    color: "#666666",
  },
  footerRight: {
    fontSize: 8.5,
    color: "#999999",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
  heroNumber: {
    fontSize: 44,
    fontWeight: "bold",
    color: "#EA2C00",
    lineHeight: 1,
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#999999",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 9,
    color: "#666666",
  },
  metricValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  domainHeader: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
    fontWeight: "bold",
  },
  domainCard: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 4,
    padding: 14,
    marginBottom: 8,
  },
  domainQuestion: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  domainLevel: {
    fontSize: 8.5,
    color: "#999999",
    marginBottom: 6,
  },
  domainValueBig: {
    fontSize: 18,
    fontWeight: "bold",
  },
  domainValueLabel: {
    fontSize: 8,
    color: "#999999",
  },
  opportunityBox: {
    backgroundColor: "#F5F0EB",
    padding: 10,
    borderRadius: 3,
    marginTop: 6,
  },
  opportunityLabel: {
    fontSize: 7.5,
    color: "#EA2C00",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "bold",
    marginBottom: 4,
  },
  opportunityText: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.45,
  },
  barTrack: {
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
  },
  driverPillActive: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 3,
  },
  driverPillInactive: {
    backgroundColor: "#F5F0EB",
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 3,
  },
  driverTextActive: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  driverTextInactive: {
    fontSize: 7.5,
    color: "#999999",
  },
  scenarioTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F5F0EB",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  valueBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  valueBarLabel: {
    width: 70,
    fontSize: 9,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  valueBarAmount: {
    width: 60,
    fontSize: 9,
    fontWeight: "bold",
    color: "#1A1A1A",
    textAlign: "right",
    marginLeft: 8,
  },
  darkPanel: {
    backgroundColor: "#1A1A1A",
    borderRadius: 4,
    padding: 16,
  },
  disclaimer: {
    fontSize: 8.5,
    color: "#999999",
    lineHeight: 1.5,
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

const TIEBREAKER_ORDER = ['risk', 'revenue', 'workforce', 'capacity'] as const;

const getScoreVerdict = (score: number, data: AmbientAssessmentPDFData): string => {
  const domainOrder = ['capacity', 'revenue', 'workforce', 'risk'] as const;
  const levels = Object.fromEntries(domainOrder.map(d => [d, data.domains[d].activationLevel]));
  let lowest = TIEBREAKER_ORDER[0] as string;
  let lowestLevel = levels[lowest];
  for (const d of TIEBREAKER_ORDER) {
    if (levels[d] < lowestLevel) { lowest = d; lowestLevel = levels[d]; }
  }
  const domainLabels: Record<string, string> = { capacity: 'Capacity', revenue: 'Revenue', workforce: 'Workforce', risk: 'Risk' };
  const lowestName = domainLabels[lowest].toLowerCase();

  if (score <= 30) return `Your organization is in the early stages of building ambient AI value. Time savings are being generated \u2014 the opportunity now is building the infrastructure to capture them.`;
  if (score <= 50) return `Progress in some areas. Your biggest opportunity is in ${lowestName} \u2014 organizations that strengthen this area typically see $200K\u2013$800K in additional measurable value annually.`;
  if (score <= 70) return `Solid foundation across most domains. The gap between your current score and best-in-class represents real, quantifiable value \u2014 closing this gap is typically where the next layer of value becomes visible.`;
  if (score <= 85) return `Strong deployment. You\u2019re capturing value that most organizations haven\u2019t yet reached. The remaining gap is in ${lowestName} \u2014 closing it typically unlocks $100K\u2013$400K in additional annual value.`;
  return "Best-in-class across all four domains. This deployment reflects the kind of intentional, strategic approach that defines top-performing Abridge health systems.";
};

function PageFooter({ pageNum, orgName }: { pageNum: number; orgName: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerLeft}>ABRIDGE</Text>
      <Text style={styles.footerCenter}>Ambient Assessment {"\u00B7"} {orgName || "Your Organization"}</Text>
      <Text style={styles.footerRight}>Page {pageNum} of {TOTAL_PAGES}</Text>
    </View>
  );
}

function Page1ScoreAndValue({ data }: { data: AmbientAssessmentPDFData }) {
  const timeSavedEntered = data.timeSavings > 0;
  const hoursReclaimed = timeSavedEntered ? Math.round((data.annualEncounters * data.timeSavings) / 60) : 0;
  const fteEquivalent = timeSavedEntered ? (hoursReclaimed / 2080).toFixed(1) : null;

  const combinedNarrative = `${getScoreVerdict(data.documentationScore, data)} ${data.assessmentNarrative}`;

  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>EXECUTIVE SUMMARY</Text>

        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          <View style={[styles.col, styles.cardBg, { alignItems: "center", paddingVertical: 20 }]}>
            <Text style={{ fontSize: 56, fontWeight: "bold", color: colors.primaryText, lineHeight: 1 }}>{data.documentationScore}</Text>
            <Text style={{ fontSize: 14, color: colors.tertiary, marginBottom: 10 }}>/ 100</Text>
            <View style={{ width: 100, height: 6, backgroundColor: colors.border, borderRadius: 3, marginBottom: 8 }}>
              <View style={{ height: 6, backgroundColor: colors.primary, borderRadius: 3, width: `${data.documentationScore}%` }} />
            </View>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.tertiary, letterSpacing: 1.5, textTransform: "uppercase" }}>Ambient Assessment Score</Text>
          </View>

          <View style={styles.col}>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 12, marginBottom: 8 }}>
              {[
                { label: "Early deployment", value: "25" },
                { label: "Measured", value: "50" },
                { label: "Strategically managed", value: "75" },
                { label: "Best in class", value: "100" },
              ].map((band, i, arr) => (
                <View key={band.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: i < arr.length - 1 ? 6 : 0, paddingBottom: i < arr.length - 1 ? 6 : 0, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 9.5, color: colors.secondary }}>{band.label}</Text>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>{band.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.calloutBox, { marginBottom: 14 }]}>
          <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.6 }}>
            {combinedNarrative}
          </Text>
        </View>

        <Text style={styles.sectionLabelGray}>YOUR INPUTS</Text>
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginBottom: 8 }}>
          {[
            { label: "Providers", value: String(data.providers) },
            { label: "Annual encounters", value: data.annualEncounters.toLocaleString() },
            { label: "Utilization rate", value: `${data.utilization}%` },
            { label: "Time saved / encounter", value: timeSavedEntered ? `${data.timeSavings} min` : "Benchmark used" },
            { label: "Hours reclaimed", value: timeSavedEntered ? `${hoursReclaimed.toLocaleString()} hrs` : "See domain analysis" },
            { label: "FTE equivalent", value: fteEquivalent ? `${fteEquivalent} FTE` : "See domain analysis" },
          ].map((row, i, arr) => (
            <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 10, backgroundColor: i % 2 === 0 ? colors.cards : colors.background, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={styles.metricLabel}>{row.label}</Text>
              <Text style={styles.metricValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <PageFooter pageNum={1} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

const domainMeta: Record<string, { name: string; question: string; drivers: string[] }> = {
  capacity: {
    name: "Capacity",
    question: "What happened to the time ambient AI returned?",
    drivers: ["Time saved per encounter", "Recovered hours annually", "Additional patients per month", "FTEs avoided or redeployed"],
  },
  revenue: {
    name: "Revenue",
    question: "What is documentation fidelity worth to your revenue cycle?",
    drivers: ["Revenue signals observed", "wRVU or collections change", "Yield improvement measured", "Revenue formally attributed"],
  },
  workforce: {
    name: "Workforce",
    question: "What is documentation burden costing your workforce?",
    drivers: ["After-hours reduction", "In-clinic time saved", "Clinician survey findings", "Turnover exposure quantified"],
  },
  risk: {
    name: "Risk",
    question: "Is your documentation ready for what comes next?",
    drivers: ["Quality dimensions tracked", "Downstream workflows connected", "Hours saved in reporting", "Strategic integrations active"],
  },
};

const RELEVANT_DRIVERS: Record<string, Record<number, number[]>> = {
  capacity: { 1: [0, 1], 2: [0, 1], 3: [2], 4: [3] },
  revenue: { 1: [0], 2: [0], 3: [1, 2], 4: [3] },
  workforce: { 1: [0], 2: [1, 2], 3: [3], 4: [3] },
  risk: { 1: [0], 2: [0, 1], 3: [1, 2], 4: [3] },
};

function getDomainDisplayValue(domain: DomainData): string {
  if (domain.headlineMetric && domain.headlineMetric !== '\u2014' && domain.headlineMetric !== '\u2014' && domain.headlineMetric !== 'Not yet entered') {
    return domain.headlineMetric;
  }
  if (domain.hasValue !== false && domain.gapValue > 0) {
    return fmt(domain.gapValue);
  }
  return "Not yet entered";
}

function DomainCard({ domainKey, data, isLast }: { domainKey: string; data: AmbientAssessmentPDFData; isLast: boolean }) {
  const domain = data.domains[domainKey as keyof typeof data.domains];
  const meta = domainMeta[domainKey];
  const accentColor = activationColors[domain.activationLevel];
  const SCORE_MAP: Record<number, number> = { 1: 6, 2: 12, 3: 19, 4: 25 };
  const domainScore = SCORE_MAP[domain.activationLevel] || domain.score;
  const barPercent = (domainScore / 25) * 100;
  const displayValue = getDomainDisplayValue(domain);
  const relevantIdx = RELEVANT_DRIVERS[domainKey]?.[domain.activationLevel] || [];
  const oppText = opportunityText[domainKey]?.[domain.activationLevel] || domain.primaryOpportunity;

  return (
    <View>
      <Text style={[styles.domainHeader, { color: accentColor }]}>{meta.name}</Text>
      <View style={styles.domainCard}>
        <View style={{ paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: accentColor }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.domainQuestion}>{meta.question}</Text>
              <Text style={styles.domainLevel}>Level {domain.activationLevel}: {domain.activationLabel} {"\u00B7"} Score: {domainScore}/25</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.domainValueBig, { color: displayValue === "Not yet entered" ? colors.tertiary : colors.primary }]}>{displayValue}</Text>
              {displayValue !== "Not yet entered" && <Text style={styles.domainValueLabel}>your measured value</Text>}
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <View style={{ flex: 1 }}>
              <View style={styles.barTrack}>
                <View style={{ height: 4, backgroundColor: accentColor, borderRadius: 2, width: `${barPercent}%` }} />
              </View>
            </View>
            <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primaryText, width: 40, textAlign: "right" }}>{domainScore}/25</Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {meta.drivers.map((driver, di) => {
              const isRelevant = relevantIdx.includes(di);
              return (
                <View key={driver} style={isRelevant ? styles.driverPillActive : styles.driverPillInactive}>
                  <Text style={isRelevant ? styles.driverTextActive : styles.driverTextInactive}>{driver}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.opportunityBox}>
            <Text style={styles.opportunityLabel}>Opportunity Ahead</Text>
            <Text style={styles.opportunityText}>{oppText}</Text>
          </View>
        </View>
      </View>
      {!isLast && <View style={styles.divider} />}
    </View>
  );
}

function Page2DomainsCapacityRevenue({ data }: { data: AmbientAssessmentPDFData }) {
  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>DOMAIN DETAIL</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Capacity & Revenue</Text>
        <Text style={styles.body}>
          These domains capture how recovered time and documentation quality convert to operational capacity and financial performance.
        </Text>
        <View style={styles.divider} />

        <DomainCard domainKey="capacity" data={data} isLast={false} />
        <DomainCard domainKey="revenue" data={data} isLast={true} />

        <PageFooter pageNum={2} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

function Page3DomainsWorkforceRisk({ data }: { data: AmbientAssessmentPDFData }) {
  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>DOMAIN DETAIL (CONTINUED)</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Workforce & Risk</Text>
        <Text style={styles.body}>
          These domains capture the workforce and infrastructure dimensions of your documentation strategy {"\u2014"} often the largest and most overlooked sources of value.
        </Text>
        <View style={styles.divider} />

        <DomainCard domainKey="workforce" data={data} isLast={false} />
        <DomainCard domainKey="risk" data={data} isLast={true} />

        <PageFooter pageNum={3} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

function getValueSourceLabel(data: AmbientAssessmentPDFData): string {
  const domainsWithValue = (['capacity', 'revenue', 'workforce', 'risk'] as const).filter(d => data.domains[d].hasValue && data.domains[d].gapValue > 0);
  const domainsWithoutValue = (['capacity', 'revenue', 'workforce', 'risk'] as const).filter(d => !data.domains[d].hasValue || data.domains[d].gapValue <= 0);
  if (domainsWithValue.length === 0) return "Based on next-level projections across your domains";
  if (domainsWithoutValue.length === 0) return "Based on your measured inputs";
  return "Based on measured inputs and next-level projections";
}

function Page4ValueAndUrgency({ data }: { data: AmbientAssessmentPDFData }) {
  const hasData = data.totalAnnualGap > 0;
  const perProvider = data.providers > 0 ? Math.round(data.totalAnnualGap / data.providers) : 0;
  const perEncounter = data.annualEncounters > 0 ? Math.round(data.totalAnnualGap / data.annualEncounters) : 0;
  const sourceLabel = getValueSourceLabel(data);

  const domainOrder: Array<keyof typeof data.domains> = ["capacity", "revenue", "workforce", "risk"];
  const domainValues = domainOrder.map(d => ({
    key: d,
    name: domainMeta[d].name,
    value: data.domains[d].gapValue,
    hasValue: data.domains[d].hasValue,
    level: data.domains[d].activationLevel,
  }));
  const maxValue = Math.max(...domainValues.map(d => d.value), 1);
  const domainColors: Record<string, string> = {
    capacity: "#EA2C00",
    revenue: "#C17B3E",
    workforce: "#D4B896",
    risk: "#1A1A1A",
  };

  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>VALUE OPPORTUNITY & COST OF WAITING</Text>

        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          <View style={[styles.col, styles.darkPanel]}>
            <Text style={styles.heroLabel}>Annual Value Opportunity</Text>
            <Text style={[styles.heroNumber, { color: colors.primary }]}>{hasData ? fmt(data.totalAnnualGap) : "Not yet entered"}</Text>
            {hasData && <Text style={{ fontSize: 8, color: "#777777", marginBottom: 4 }}>{sourceLabel}</Text>}
            <Text style={{ fontSize: 9, color: "#999999", lineHeight: 1.5 }}>
              {hasData ? `${fmt(perProvider)} per provider \u00B7 $${perEncounter} per encounter` : "Enter domain data to calculate"}
            </Text>
          </View>
          <View style={styles.col}>
            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <Text style={styles.heroLabel}>Monthly Uncaptured</Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primaryText, lineHeight: 1, marginBottom: 2 }}>{hasData ? fmt(data.monthlyGap) : "Pending inputs"}</Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary }}>value left on the table each month</Text>
            </View>
            <View style={styles.cardBg}>
              <Text style={styles.heroLabel}>Daily Uncaptured</Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primaryText, lineHeight: 1, marginBottom: 2 }}>{hasData ? fmt(data.dailyGap) : "Pending inputs"}</Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary }}>every business day at current maturity</Text>
            </View>
          </View>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>VALUE BY DOMAIN</Text>

        {domainValues.map((d) => {
          const barWidth = d.value > 0 ? Math.max(2, (d.value / maxValue) * 100) : 0;
          return (
            <View key={d.key} style={styles.valueBarContainer}>
              <Text style={styles.valueBarLabel}>{d.name}</Text>
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <View style={styles.barTrack}>
                  <View style={{ height: 4, backgroundColor: domainColors[d.key], borderRadius: 2, width: `${barWidth}%` }} />
                </View>
              </View>
              <Text style={styles.valueBarAmount}>{d.value > 0 ? fmt(d.value) : "\u2014"}</Text>
            </View>
          );
        })}

        {hasData && (
          <View style={[styles.calloutBox, { marginBottom: 6 }]}>
            <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.5 }}>
              Your highest-value domain is {[...domainValues].sort((a, b) => b.value - a.value)[0].name}. The distribution across domains indicates where operational focus will yield the greatest return.
            </Text>
          </View>
        )}

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>THREE-YEAR PROJECTION</Text>

        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginBottom: 10 }}>
          <View style={styles.scenarioTableHeader}>
            <Text style={{ flex: 2.5, fontSize: 8, fontWeight: "bold", color: colors.primaryText }}>SCENARIO</Text>
            <Text style={{ flex: 2, fontSize: 8, fontWeight: "bold", color: colors.primaryText, textAlign: "center" }}>3-YEAR VALUE</Text>
            <Text style={{ flex: 2, fontSize: 8, fontWeight: "bold", color: colors.primary, textAlign: "center" }}>VALUE LEFT BEHIND</Text>
          </View>
          {[
            { label: "Act now", value3yr: data.actNow3yr, lost: null },
            { label: "Wait 6 months", value3yr: data.wait6mo3yr, lost: data.permanentlyLost6mo },
            { label: "Wait 12 months", value3yr: data.wait12mo3yr, lost: data.permanentlyLost12mo },
          ].map((row, i, arr) => (
            <View key={row.label} style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 12, backgroundColor: i % 2 === 1 ? colors.cards : colors.background, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={{ flex: 2.5, fontSize: 9.5, fontWeight: i === 0 ? "bold" : "normal", color: colors.primaryText }}>{row.label}</Text>
              <Text style={{ flex: 2, fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textAlign: "center" }}>{hasData ? fmt(row.value3yr) : "Not yet entered"}</Text>
              <Text style={{ flex: 2, fontSize: 9.5, fontWeight: "bold", color: row.lost ? colors.primary : colors.tertiary, textAlign: "center" }}>{row.lost && hasData ? fmt(row.lost) : "Not yet entered"}</Text>
            </View>
          ))}
        </View>

        <PageFooter pageNum={4} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

function Page5Methodology({ data }: { data: AmbientAssessmentPDFData }) {
  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>METHODOLOGY & NEXT STEPS</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>How We Calculate This</Text>
        <Text style={styles.body}>
          Every number in this assessment traces directly to your inputs and the assumptions listed below. We use published industry data and conservative benchmark ranges. No additional discounting is applied {"\u2014"} the estimates are designed to be defensible as presented.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabelGray}>KEY ASSUMPTIONS</Text>

        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.cards, paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ flex: 3, fontSize: 8, fontWeight: "bold", color: colors.primaryText }}>ASSUMPTION</Text>
            <Text style={{ flex: 1.5, fontSize: 8, fontWeight: "bold", color: colors.primaryText }}>YOUR VALUE</Text>
            <Text style={{ flex: 2, fontSize: 8, fontWeight: "bold", color: colors.primary }}>BENCHMARK</Text>
          </View>
          {[
            { assumption: "Providers on ambient", yours: String(data.providers), range: "Varies by org" },
            { assumption: "Annual encounters", yours: data.annualEncounters.toLocaleString(), range: "Varies by org" },
            { assumption: "Utilization rate", yours: `${data.utilization}%`, range: "76% (deployment avg)" },
            { assumption: "Time saved per encounter", yours: data.timeSavings > 0 ? `${data.timeSavings} min` : "Not yet entered", range: "2\u20133 min (deployment avg)" },
            { assumption: "Revenue per visit", yours: `$${data.revenuePerVisit || 200}`, range: "$200 default" },
            { assumption: "Provider hourly rate", yours: `$${data.providerRate || 150}`, range: "$150 default" },
            { assumption: "Working days per year", yours: "230", range: "Clinical standard" },
            { assumption: "CMS wRVU conversion factor", yours: `$${data.conversionFactor || 33}`, range: "CMS published" },
            { assumption: "FTE hours", yours: "2,080", range: "Standard" },
          ].map((row, i, arr) => (
            <View key={row.assumption} style={{ flexDirection: "row", paddingVertical: 4, paddingHorizontal: 10, backgroundColor: i % 2 === 1 ? colors.cards : colors.background, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={{ flex: 3, fontSize: 8.5, color: colors.primaryText }}>{row.assumption}</Text>
              <Text style={{ flex: 1.5, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>{row.yours}</Text>
              <Text style={{ flex: 2, fontSize: 8.5, color: colors.secondary }}>{row.range}</Text>
            </View>
          ))}
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>NEXT STEPS</Text>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>1. DEFINE YOUR TARGET STATE</Text>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
            Your lowest-scoring domain represents your clearest near-term opportunity. Moving one maturity level in your weakest domain typically unlocks $100K{"\u2013"}$500K in measurable annual value. The right starting point is a conversation with your clinical operations team about what that next level looks like in practice.
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>2. BUILD THE INTERNAL CASE</Text>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
            The projections in this document are built on conservative benchmarks from actual Abridge deployments. When you bring this into an internal conversation, you{"\u2019"}re presenting an approach that is transparent, reproducible, and tied to your organization{"\u2019"}s own deployment data.
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>3. PARTNER WITH INTENTION</Text>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
            The organizations seeing the greatest returns from Abridge share one trait: they treat ambient AI as clinical infrastructure, not just a documentation tool. That shift {"\u2014"} building the operational model around it {"\u2014"} is what turns a strong deployment into a category-defining one.
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.disclaimer}>
          All projections are estimates based on industry benchmarks and self-reported organizational data. Actual results depend on deployment quality, provider adoption rates, and operational decisions. Abridge does not guarantee specific financial outcomes. Individual results vary.
        </Text>

        <PageFooter pageNum={5} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

const AmbientAssessmentDocument = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Document>
    <PDFCoverPage
      reportLabel="Ambient Assessment"
      title="Ambient Assessment"
      subtitle="Ambient AI Maturity Assessment \u2014 Prepared by Abridge"
      clientName={data.organizationName || "Your Organization"}
      preparedBy={data.preparedBy || "Abridge Partner Success"}
      disclaimerText="This assessment is for strategic planning purposes. All estimates are based on organizational self-assessment and your inputs. Benchmarks reflect aggregated deployment data. Individual results vary."
    />
    <Page1ScoreAndValue data={data} />
    <Page2DomainsCapacityRevenue data={data} />
    <Page3DomainsWorkforceRisk data={data} />
    <Page4ValueAndUrgency data={data} />
    <Page5Methodology data={data} />
  </Document>
);

const opportunityText: Record<string, Record<number, string>> = {
  capacity: {
    1: "Deployment exists, but no operational response has followed. Recovered time isn't being tracked or deployed.",
    2: "Aggregate hours are known and presented to leadership, but not yet converted to additional access or volume.",
    3: "Schedules, panels, or slots have been changed based on the recovered time. Capacity is being redeployed into patient access.",
    4: "Recovered FTE equivalent is a variable in hiring, expansion, and build planning. Capacity drives staffing and growth decisions.",
  },
  revenue: {
    1: "No one has connected ambient deployment to coding or billing. Revenue cycle has not been asked.",
    2: "CDI, coding, or billing leadership has an active analysis in progress. Revenue cycle is investigating.",
    3: "Before/after analysis complete; a dollar number exists that leadership can stand behind. Revenue impact measured and attributed.",
    4: "Ongoing, real-time integration between documentation quality and revenue cycle operations. Documentation quality is a managed revenue input.",
  },
  workforce: {
    1: "Providers report less after-hours work, but it has not been measured yet. Anecdotal feedback only; no structured data.",
    2: "In-clinic and after-hours time formally quantified; survey data captured. Burden reduction measured and validated.",
    3: "Turnover exposure modeled; documentation burden is a named variable in retention strategy. Retention risk calculated against burden reduction.",
    4: "Agency and locum costs measurably reduced; workforce economics improving. Labor spend is structurally declining.",
  },
  risk: {
    1: "Notes are better; no system is translating that into financial or compliance value. Exposure is still invisible.",
    2: "Completeness, specificity, and HCC capture are tracked; gaps are visible. Documentation quality is being monitored.",
    3: "CDI, coding, quality reporting, and prior auth workflows are actively using improved documentation. Documentation quality is closing revenue and compliance gaps.",
    4: "Payer contracts, value-based care programs, compliance governance, and quality strategy are all built on documentation quality as a formal input.",
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
