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

const TOTAL_PAGES = 7;

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
  sectionPage: {
    padding: 40,
    paddingBottom: 50,
    fontFamily: "Manrope",
    fontSize: 10.5,
    color: "#1A1A1A",
    backgroundColor: "#FDFAF7",
  },
  sectionPageTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1A1A1A",
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  sectionPageSubtitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  sectionPageIntro: {
    fontSize: 9.5,
    color: "#555555",
    lineHeight: 1.6,
    marginBottom: 20,
    maxWidth: 440,
  },
  domainRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 12,
  },
  domainIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: "#C8372D",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  domainIconText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  domainContent: {
    flex: 1,
  },
  domainName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  domainDesc: {
    fontSize: 9,
    color: "#555555",
    lineHeight: 1.5,
  },
  insightBox: {
    backgroundColor: "#1A1A1A",
    padding: 20,
    marginTop: 16,
    borderRadius: 4,
  },
  insightBoxText: {
    fontSize: 9.5,
    color: "#FFFFFF",
    lineHeight: 1.65,
  },
  insightBoxHighlight: {
    fontSize: 9.5,
    color: "#E5432D",
    fontWeight: "bold",
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
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
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
  domainDescription: {
    fontSize: 9.5,
    color: "#666666",
    lineHeight: 1.5,
    marginBottom: 8,
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
  scenarioTableRow: {
    flexDirection: "row",
    paddingVertical: 6,
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

  if (score <= 30) return `Early stage across all domains. Your deployment is producing time savings that aren\u2019t yet being captured operationally, financially, or strategically.`;
  if (score <= 50) return `Emerging in some areas. Your biggest opportunity is in ${lowestName} \u2014 organizations at Level 2 here typically leave $200K\u2013$800K in annual value unmeasured.`;
  if (score <= 70) return `Actively managing in key areas. The gap between your current score and best-in-class represents real, quantifiable value. ${domainLabels[lowest]} is where the most upside lives.`;
  if (score <= 85) return `Strong foundation. You\u2019re capturing value most organizations miss. The remaining gap is in ${lowestName} \u2014 closing it typically unlocks $100K\u2013$400K in additional annual value.`;
  return "Best-in-class documentation infrastructure. You\u2019re in the top tier of Abridge deployments for strategic value capture.";
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
              <Text style={[styles.domainValueBig, { color: displayValue === "\u2014" ? colors.tertiary : colors.primary }]}>{displayValue}</Text>
              {displayValue !== "\u2014" && <Text style={styles.domainValueLabel}>measured output</Text>}
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

          <Text style={styles.domainDescription}>{meta.description}</Text>

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

function Page2Domains({ data }: { data: AmbientAssessmentPDFData }) {
  const domainOrder: Array<keyof typeof data.domains> = ["capacity", "revenue", "workforce", "risk"];
  const lowestDomain = domainOrder.reduce((lowest, d) =>
    data.domains[d].activationLevel < data.domains[lowest].activationLevel ? d : lowest
  );

  const domainIntros: Record<string, { letter: string; name?: string; desc: string }> = {
    capacity: {
      letter: "C",
      name: "Capacity Realization",
      desc: "Time saved per encounter is only valuable if it becomes something \u2014 more patients, shorter days, or reduced overtime. Level 1 organizations recover hours on paper. Level 4 organizations deploy those hours into measurable throughput gain.",
    },
    revenue: {
      letter: "R",
      name: "Revenue Integrity",
      desc: "Complete, structured clinical notes drive coding accuracy, HCC capture, and denial prevention. Organizations at higher maturity levels see measurable wRVU lift and fewer missed risk-adjustment codes \u2014 not because providers document more, but because they document completely.",
    },
    workforce: {
      letter: "W",
      name: "Workforce Stability",
      desc: "Documentation burden is the #1 driver of clinician burnout and turnover. At $100K\u2013$1M per physician departure, even a 10% retention improvement changes the financial picture fundamentally.",
    },
    risk: {
      letter: "Rx",
      name: "Risk & Compliance Posture",
      desc: "Every AI initiative your organization wants in the next three years runs on one foundation \u2014 structured, complete documentation at scale. This domain measures infrastructure readiness.",
    },
  };

  return (
    <Page size="LETTER" style={styles.sectionPage} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionPageTitle}>AMBIENT AI MATURITY FRAMEWORK</Text>
        <Text style={styles.sectionPageSubtitle}>What You{"\u2019"}re Being Assessed On {"\u2014"} And Why It Matters</Text>
        <Text style={styles.sectionPageIntro}>
          Most ambient AI evaluations stop at adoption rate. That misses 80% of the value story. Abridge measures four domains because each one represents a distinct financial lever {"\u2014"} and together, they determine whether ambient AI becomes a productivity tool or a strategic infrastructure.
        </Text>

        {domainOrder.map((key) => (
          <View key={key} style={styles.domainRow}>
            <View style={styles.domainIcon}>
              <Text style={styles.domainIconText}>{domainIntros[key].letter}</Text>
            </View>
            <View style={styles.domainContent}>
              <Text style={styles.domainName}>{domainMeta[key].name}</Text>
              <Text style={styles.domainDesc}>{domainIntros[key].desc}</Text>
            </View>
          </View>
        ))}

        <View style={styles.insightBox}>
          <Text style={styles.insightBoxText}>
            Your lowest-scoring domain is{" "}
            <Text style={styles.insightBoxHighlight}>{domainMeta[lowestDomain].name}</Text>
            {" "}(Level {data.domains[lowestDomain].activationLevel}). This is where strategic action will yield the highest return relative to current maturity. The following pages break down each domain in detail.
          </Text>
        </View>

        <PageFooter pageNum={2} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

function Page3DomainsCapacityRevenue({ data }: { data: AmbientAssessmentPDFData }) {
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

        <PageFooter pageNum={3} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

function Page4DomainsWorkforceRisk({ data }: { data: AmbientAssessmentPDFData }) {
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

        <PageFooter pageNum={4} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

function Page5ValueOpportunity({ data }: { data: AmbientAssessmentPDFData }) {
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
        <Text style={styles.sectionLabel}>YOUR VALUE OPPORTUNITY</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>What Strategic Action Could Unlock</Text>
        <Text style={styles.body}>
          This page consolidates your domain-level findings into a single view of total organizational opportunity. Values reflect measured inputs where available and conservative projections where not.
        </Text>

        <View style={styles.thickDivider} />

        <View style={[styles.twoColRow, { marginBottom: 14 }]}>
          <View style={[styles.col, styles.darkPanel]}>
            <Text style={styles.heroLabel}>Annual Value Opportunity</Text>
            <Text style={[styles.heroNumber, { color: colors.primary }]}>{hasData ? fmt(data.totalAnnualGap) : "\u2014"}</Text>
            {hasData && <Text style={{ fontSize: 8, color: "#777777", marginBottom: 4 }}>{sourceLabel}</Text>}
            <Text style={{ fontSize: 9, color: "#999999", lineHeight: 1.5 }}>
              {hasData ? "Total across all four domains" : "Enter domain data to calculate"}
            </Text>
          </View>
          <View style={styles.col}>
            <View style={[styles.cardBg, { marginBottom: 8 }]}>
              <Text style={styles.heroLabel}>Per Provider</Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primaryText, lineHeight: 1, marginBottom: 2 }}>{hasData ? fmt(perProvider) : "\u2014"}</Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary }}>annual opportunity per provider</Text>
            </View>
            <View style={styles.cardBg}>
              <Text style={styles.heroLabel}>Per Encounter</Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primaryText, lineHeight: 1, marginBottom: 2 }}>{hasData ? `$${perEncounter}` : "\u2014"}</Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary }}>value opportunity per encounter</Text>
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

        <View style={{ marginTop: 6 }}>
          <View style={[styles.calloutBox, { marginBottom: 10 }]}>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              {hasData
                ? `Your highest-value domain is ${domainValues.sort((a, b) => b.value - a.value)[0].name}. The distribution across domains indicates where operational focus will yield the greatest return.`
                : "Enter domain-specific data across all four domains to see your value distribution."}
            </Text>
          </View>
        </View>

        <PageFooter pageNum={5} orgName={data.organizationName} />
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

function Page6CostOfWaiting({ data }: { data: AmbientAssessmentPDFData }) {
  const perProvider = data.providers > 0 ? Math.round(data.totalAnnualGap / data.providers) : 0;
  const perEncounter = data.annualEncounters > 0 ? Math.round(data.totalAnnualGap / data.annualEncounters) : 0;
  const hasData = data.totalAnnualGap > 0;
  const sourceLabel = getValueSourceLabel(data);

  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>THE STRATEGIC IMPERATIVE: WHY MATURITY LEVEL MATTERS NOW</Text>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>Every Month at Current Maturity Levels</Text>
        <Text style={styles.body}>
          Based on your assessment and next-level projections. These estimates reflect what strategic action across your four domains could unlock.
        </Text>

        <View style={styles.divider} />

        <View style={[styles.twoColRow, { marginBottom: 10 }]}>
          <View style={[styles.col, styles.darkPanel]}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.tertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Monthly Value Uncaptured</Text>
            <Text style={{ fontSize: 40, fontWeight: "bold", color: colors.primary, lineHeight: 1, marginBottom: 4 }}>{hasData ? fmt(data.monthlyGap) : "\u2014"}</Text>
            {hasData && <Text style={{ fontSize: 8, color: "#777777", marginBottom: 4 }}>{sourceLabel}</Text>}
            <Text style={{ fontSize: 9, color: "#999999", lineHeight: 1.5 }}>
              {hasData ? `${fmt(perProvider)} per provider \u00B7 $${perEncounter} per encounter` : "Enter domain data to calculate cost of waiting"}
            </Text>
          </View>
          <View style={[styles.col, styles.darkPanel]}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.tertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Daily Value Uncaptured</Text>
            <Text style={{ fontSize: 40, fontWeight: "bold", color: colors.white, lineHeight: 1, marginBottom: 4 }}>{hasData ? fmt(data.dailyGap) : "\u2014"}</Text>
            {hasData && <Text style={{ fontSize: 8, color: "#777777", marginBottom: 4 }}>{sourceLabel}</Text>}
            <Text style={{ fontSize: 9, color: "#999999", lineHeight: 1.5 }}>
              {hasData ? "Every business day your organization does not systematically capture this value." : "Enter domain data to calculate cost of waiting"}
            </Text>
          </View>
        </View>

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
              <Text style={{ flex: 2, fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, textAlign: "center" }}>{hasData ? fmt(row.value3yr) : "\u2014"}</Text>
              <Text style={{ flex: 2, fontSize: 9.5, fontWeight: "bold", color: row.lost ? colors.primary : colors.tertiary, textAlign: "center" }}>{row.lost && hasData ? fmt(row.lost) : "\u2014"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.thickDivider} />

        <Text style={styles.sectionLabel}>WHAT THIS MEANS</Text>
        <Text style={styles.body}>
          {getWhatThisMeansText(data)}
        </Text>

        <PageFooter pageNum={6} orgName={data.organizationName} />
      </View>
    </Page>
  );
}

function Page7Methodology({ data }: { data: AmbientAssessmentPDFData }) {
  return (
    <Page size="LETTER" style={styles.page} wrap={false}>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>YOUR NEXT MOVE</Text>
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
            { assumption: "Time saved per encounter", yours: data.timeSavings > 0 ? `${data.timeSavings} min` : "\u2014", range: "2\u20133 min (deployment avg)" },
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
            Your lowest-scoring domain is your highest-opportunity domain. A single maturity level upgrade in your weakest domain typically unlocks $100K{"\u2013"}$500K in annualized value. Start by aligning your clinical ops team on what the next level looks like operationally.
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>2. BUILD THE INTERNAL CASE</Text>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
            The financial projections in this document are grounded in conservative benchmarks from real Abridge deployments {"\u2014"} not theoretical models. When you bring this to your CFO or CMO, you{"\u2019"}re presenting a methodology that is reproducible, auditable, and tied to your actual deployment data.
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>3. REQUEST A WORKING SESSION</Text>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
            A 30-minute strategic session to walk through your domain scores, explore your highest-opportunity areas, and discuss what the next level looks like for your organization. This is not a product demonstration {"\u2014"} it{"\u2019"}s strategic planning.
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.disclaimer}>
          All projections are estimates based on industry benchmarks and self-reported organizational data. Actual results depend on deployment quality, provider adoption rates, and operational decisions. Abridge does not guarantee specific financial outcomes. Individual results vary.
        </Text>

        <PageFooter pageNum={7} orgName={data.organizationName} />
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
    <Page2Domains data={data} />
    <Page3DomainsCapacityRevenue data={data} />
    <Page4DomainsWorkforceRisk data={data} />
    <Page5ValueOpportunity data={data} />
    <Page6CostOfWaiting data={data} />
    <Page7Methodology data={data} />
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
