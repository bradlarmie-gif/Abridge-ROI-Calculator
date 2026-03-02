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

  if (score <= 30) return `Early stage across all domains. Your deployment is producing time savings that aren\u2019t yet being captured operationally, financially, or strategically.`;
  if (score <= 50) return `Emerging in some areas. Your biggest opportunity is in ${lowestName} \u2014 organizations at Level 2 here typically leave $200K\u2013$800K in annual value unmeasured.`;
  if (score <= 70) return `Actively managing in key areas. The gap between your current score and best-in-class represents real, quantifiable value. ${domainLabels[lowest]} is where the most upside lives.`;
  if (score <= 85) return `Strong foundation. You\u2019re capturing value most organizations miss. The remaining gap is in ${lowestName} \u2014 closing it typically unlocks $100K\u2013$400K in additional annual value.`;
  return "Best-in-class documentation infrastructure. You\u2019re in the top tier of Abridge deployments for strategic value capture.";
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
  const timeSavedEntered = data.timeSavings > 0;
  const hoursReclaimed = timeSavedEntered ? Math.round((data.annualEncounters * data.timeSavings) / 60) : 0;
  const fteEquivalent = timeSavedEntered ? (hoursReclaimed / 2080).toFixed(1) : null;

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
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.5 }}>
              {getScoreVerdict(data.documentationScore, data)}
            </Text>
          </View>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>YOUR ASSESSMENT</Text>

        <View style={[styles.calloutBox, { marginBottom: 14 }]}>
          <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.6 }}>
            {data.assessmentNarrative}
          </Text>
        </View>

        <Text style={styles.sectionLabelGray}>YOUR INPUTS</Text>
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginBottom: 8 }}>
          {[
            { label: "Providers", value: String(data.providers) },
            { label: "Annual encounters", value: data.annualEncounters.toLocaleString() },
            { label: "Utilization rate", value: `${data.utilization}%` },
            { label: "Time saved / encounter", value: timeSavedEntered ? `${data.timeSavings} min` : "\u2014" },
            { label: "Hours reclaimed", value: timeSavedEntered ? `${hoursReclaimed.toLocaleString()} hrs` : "\u2014" },
            { label: "FTE equivalent", value: fteEquivalent || "\u2014" },
          ].map((row, i, arr) => (
            <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 10, backgroundColor: i % 2 === 0 ? colors.cards : colors.background, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 9, color: colors.secondary }}>{row.label}</Text>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{row.value}</Text>
            </View>
          ))}
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
    description: "Where does recovered time actually go? Most organizations save time with ambient but haven't structurally converted it to capacity. Your level reflects how intentionally your organization deploys recovered time.",
    drivers: ["Time saved per encounter", "Recovered hours annually", "Additional patients per month", "FTEs avoided or redeployed"],
  },
  revenue: {
    name: "Revenue",
    question: "What is documentation fidelity worth to your revenue cycle?",
    description: "Coding accuracy, HCC capture, and denial prevention driven by complete clinical notes. Every encounter either captures or leaks revenue through your documentation infrastructure.",
    drivers: ["Revenue signals observed", "wRVU or collections change", "Yield improvement measured", "Revenue formally attributed"],
  },
  workforce: {
    name: "Workforce",
    question: "What is documentation burden costing your workforce?",
    description: "Documentation burden drives after-hours work, in-clinic inefficiency, and turnover. Your level reflects how deeply your organization is measuring and managing the workforce impact of burden reduction.",
    drivers: ["After-hours reduction", "In-clinic time saved", "Clinician survey findings", "Turnover exposure quantified"],
  },
  risk: {
    name: "Risk",
    question: "Is your documentation ready for what comes next?",
    description: "Every AI initiative your organization wants in the next three years runs on one foundation \u2014 structured, complete documentation at scale. Your level reflects whether your organization is building on that foundation or sitting on it.",
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
  if (domain.headlineMetric && domain.headlineMetric !== '\u2014' && domain.headlineMetric !== '—') {
    return domain.headlineMetric;
  }
  if (domain.hasValue !== false && domain.gapValue > 0) {
    return fmt(domain.gapValue);
  }
  return "\u2014";
}

function Page2Domains({ data }: { data: AmbientAssessmentPDFData }) {
  const domainOrder: Array<keyof typeof data.domains> = ["capacity", "revenue", "workforce", "risk"];
  const SCORE_MAP: Record<number, number> = { 1: 6, 2: 12, 3: 19, 4: 25 };

  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>THE FOUR DOMAINS</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Where Enterprise Value Lives</Text>
        <Text style={styles.body}>
          Each domain reflects your organization{"\u2019"}s self-assessed maturity level. All four domains contribute equally to your Ambient Assessment Score.
        </Text>

        <View style={styles.divider} />

        {domainOrder.map((key, ci) => {
          const domain = data.domains[key];
          const meta = domainMeta[key];
          const accentColor = activationColors[domain.activationLevel];
          const domainScore = SCORE_MAP[domain.activationLevel] || domain.score;
          const barPercent = (domainScore / 25) * 100;
          const displayValue = getDomainDisplayValue(domain);
          const relevantIdx = RELEVANT_DRIVERS[key]?.[domain.activationLevel] || [];

          return (
            <View key={key}>
              <Text style={{ fontSize: 9, color: accentColor, textTransform: "uppercase", letterSpacing: 2, marginTop: ci > 0 ? 8 : 0, marginBottom: 6, fontWeight: "bold" }}>{meta.name}</Text>
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 12, marginBottom: 6 }}>
                <View style={{ paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: accentColor }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{meta.question}</Text>
                      <Text style={{ fontSize: 8.5, color: colors.tertiary }}>Level {domain.activationLevel}: {domain.activationLabel} {"\u00B7"} Score: {domainScore}/25</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: displayValue === "\u2014" ? colors.tertiary : colors.primary }}>{displayValue}</Text>
                      {displayValue !== "\u2014" && <Text style={{ fontSize: 8, color: colors.tertiary }}>measured output</Text>}
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
                      <View style={{ height: 4, backgroundColor: accentColor, borderRadius: 2, width: `${barPercent}%` }} />
                    </View>
                    <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primaryText, width: 40, textAlign: "right" }}>{domainScore}/25</Text>
                  </View>

                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 6 }}>{meta.description}</Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {meta.drivers.map((driver, di) => {
                      const isRelevant = relevantIdx.includes(di);
                      return (
                        <View key={driver} style={{ backgroundColor: isRelevant ? colors.dark : colors.cards, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 3 }}>
                          <Text style={{ fontSize: 7.5, fontWeight: isRelevant ? "bold" : "normal", color: isRelevant ? colors.white : colors.tertiary }}>{driver}</Text>
                        </View>
                      );
                    })}
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

function getValueSourceLabel(data: AmbientAssessmentPDFData): string {
  const domainsWithValue = (['capacity', 'revenue', 'workforce', 'risk'] as const).filter(d => data.domains[d].hasValue && data.domains[d].gapValue > 0);
  const domainsWithoutValue = (['capacity', 'revenue', 'workforce', 'risk'] as const).filter(d => !data.domains[d].hasValue || data.domains[d].gapValue <= 0);
  if (domainsWithValue.length === 0) return "Based on next-level projections across your domains";
  if (domainsWithoutValue.length === 0) return "Based on your measured inputs";
  return "Based on measured inputs and next-level projections";
}

function getWhatThisMeansText(data: AmbientAssessmentPDFData): string {
  const domainLabels: Record<string, string> = { capacity: 'Capacity', revenue: 'Revenue', workforce: 'Workforce', risk: 'Risk' };
  const lowestDomain = (['risk', 'revenue', 'workforce', 'capacity'] as const).reduce((lowest, d) =>
    data.domains[d].activationLevel < data.domains[lowest].activationLevel ? d : lowest
  );
  const lowestName = domainLabels[lowestDomain].toLowerCase();
  const hasData = data.totalAnnualGap > 0;
  const timeSavedEntered = data.timeSavings > 0;

  let text = `Your organization has ${data.providers} providers generating ${data.annualEncounters.toLocaleString()} encounters annually. `;

  if (timeSavedEntered) {
    const hoursReclaimed = Math.round((data.annualEncounters * data.timeSavings) / 60);
    text += `At ${data.utilization}% utilization and ${data.timeSavings} minutes saved per encounter, your documentation infrastructure is returning ${hoursReclaimed.toLocaleString()} hours annually. `;
  } else {
    text += `At ${data.utilization}% utilization, your organization hasn\u2019t yet measured time savings per encounter. Establishing this metric is the foundation for understanding capacity value. `;
  }

  if (hasData) {
    text += `Your biggest opportunity is in ${lowestName}. The gap between current performance and strategic action represents approximately ${fmt(data.totalAnnualGap)} annually. Your lowest-scoring domain is ${domainLabels[lowestDomain]}. This is where the most immediate opportunity lives.`;
  } else {
    text += `Enter domain-specific data to calculate the gap between current performance and strategic action.`;
  }
  return text;
}

function Page3CostOfInaction({ data }: { data: AmbientAssessmentPDFData }) {
  const perProvider = data.providers > 0 ? Math.round(data.totalAnnualGap / data.providers) : 0;
  const perEncounter = data.annualEncounters > 0 ? Math.round(data.totalAnnualGap / data.annualEncounters) : 0;
  const hasData = data.totalAnnualGap > 0;
  const sourceLabel = getValueSourceLabel(data);

  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>COST OF INACTION</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Every Month at Current Maturity Levels</Text>
        <Text style={styles.body}>
          Based on your assessment and next-level projections. These estimates reflect what strategic action across your four domains could unlock.
        </Text>

        <View style={styles.divider} />

        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          <View style={[styles.col, { backgroundColor: colors.dark, borderRadius: 4, padding: 16 }]}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.tertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Monthly Value Uncaptured</Text>
            <Text style={{ fontSize: 40, fontWeight: "bold", color: colors.primary, lineHeight: 1, marginBottom: 4 }}>{hasData ? fmt(data.monthlyGap) : "\u2014"}</Text>
            {hasData && <Text style={{ fontSize: 8, color: "#777777", marginBottom: 4 }}>{sourceLabel}</Text>}
            <Text style={{ fontSize: 9, color: "#999999", lineHeight: 1.5 }}>
              {hasData ? `${fmt(perProvider)} per provider \u00B7 $${perEncounter} per encounter` : "Enter domain data to calculate cost of inaction"}
            </Text>
          </View>
          <View style={[styles.col, { backgroundColor: colors.dark, borderRadius: 4, padding: 16 }]}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.tertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Daily Value Uncaptured</Text>
            <Text style={{ fontSize: 40, fontWeight: "bold", color: colors.white, lineHeight: 1, marginBottom: 4 }}>{hasData ? fmt(data.dailyGap) : "\u2014"}</Text>
            {hasData && <Text style={{ fontSize: 8, color: "#777777", marginBottom: 4 }}>{sourceLabel}</Text>}
            <Text style={{ fontSize: 9, color: "#999999", lineHeight: 1.5 }}>
              {hasData ? "Every business day your organization does not systematically capture this value." : "Enter domain data to calculate cost of inaction"}
            </Text>
          </View>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>THREE-YEAR PROJECTION</Text>

        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.cards, paddingVertical: 7, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
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
              <Text style={{ flex: 2, fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textAlign: "center" }}>{hasData ? fmt(row.value3yr) : "\u2014"}</Text>
              <Text style={{ flex: 2, fontSize: 9.5, fontWeight: "bold", color: row.lost ? colors.primary : colors.tertiary, textAlign: "center" }}>{row.lost && hasData ? fmt(row.lost) : "\u2014"}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.calloutBox, { marginBottom: 10 }]}>
          <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
            Every month at current maturity levels represents an opportunity to capture additional value across your four domains.
          </Text>
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>WHAT THIS MEANS</Text>
        <Text style={styles.body}>
          {getWhatThisMeansText(data)}
        </Text>

        <PageFooter pageNum={3} total={4} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

function Page4NextSteps({ data }: { data: AmbientAssessmentPDFData }) {
  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>TRANSPARENCY</Text>
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
            { assumption: "Time saved per encounter", yours: data.timeSavings > 0 ? `${data.timeSavings} min` : "\u2014", range: "3.0 min (deployment avg)" },
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
        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          <View style={[styles.col, styles.cardBg, { padding: 12 }]}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 6 }}>Validate Your Inputs</Text>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 6 }}>
              Replace self-reported estimates with operational data where available: EHR timestamps for documentation time, HR records for turnover and replacement costs, revenue cycle data for coding yield.
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 5 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>Timeline: 2{"\u2013"}4 weeks</Text>
            </View>
          </View>
          <View style={[styles.col, { backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 12, paddingVertical: 10 }]}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 6 }}>Request a Working Session</Text>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 6 }}>
              A 30-minute strategic session to walk through your domain scores, explore your highest-opportunity areas, and discuss what the next level looks like for your organization. This is not a product demonstration.
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 5 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>Strategic planning, not a demo</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
          All projections are estimates based on industry benchmarks and self-reported organizational data. Actual results depend on deployment quality, provider adoption rates, and operational decisions. Abridge does not guarantee specific financial outcomes. Individual results vary.
        </Text>

        <PageFooter pageNum={4} total={4} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

const AmbientAssessmentDocument = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Document>
    <PDFCoverPage
      reportLabel="Ambient Assessment"
      title="Ambient Assessment"
      subtitle={`A structured analysis of how your organization is capturing value from ambient documentation \u2014 across capacity, revenue, workforce, and infrastructure readiness.`}
      clientName={data.organizationName || "Your Organization"}
      preparedBy={data.preparedBy || "Abridge Partner Success"}
      disclaimerText="This assessment is for strategic planning purposes. All estimates are based on organizational self-assessment and your inputs. Benchmarks reflect aggregated deployment data. Individual results vary."
    />
    <Page1ScoreAndValue data={data} />
    <Page2Domains data={data} />
    <Page3CostOfInaction data={data} />
    <Page4NextSteps data={data} />
  </Document>
);

const opportunityText: Record<string, Record<number, string>> = {
  capacity: {
    1: "Providers are faster. No operational change has followed. Recovered time isn't being tracked or deployed.",
    2: "Time savings are measured but not being converted to additional access or volume. No scheduling or template changes implemented.",
    3: "Structured access expansion is delivering results. Schedules and templates are redesigned based on recovered capacity.",
    4: "Recovered capacity is embedded into workforce planning, hiring decisions, and FTE models.",
  },
  revenue: {
    1: "Revenue cycle has not evaluated how ambient documentation is affecting coding, billing, or collections.",
    2: "Coding or billing teams report changes, but no formal before/after analysis completed.",
    3: "Before/after analysis completed. Documentation-driven revenue change quantified and measured.",
    4: "Documentation quality is an ongoing, managed input to revenue cycle performance and financial reporting.",
  },
  workforce: {
    1: "After-hours burden reduced, improving provider satisfaction, but labor strategy remains unchanged.",
    2: "In-clinic documentation burden measured and validated. Provider sentiment captured through surveys.",
    3: "Turnover exposure calculated against documentation burden. Retention risk quantified.",
    4: "Agency and locum spend declining. Workforce costs structurally improving through burden reduction.",
  },
  risk: {
    1: "Notes are better. No system is monitoring what that means for revenue, compliance, or risk.",
    2: "Documentation completeness and specificity are being tracked. Quality monitoring is active.",
    3: "Quality reporting, CDI, or coding workflows are leveraging improved documentation.",
    4: "Structured documentation informs payer, quality, and compliance strategy as a strategic data asset.",
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
