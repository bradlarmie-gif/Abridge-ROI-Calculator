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
    { src: manropeRegular, fontWeight: 400, fontStyle: "italic" },
    { src: manropeBold, fontWeight: 600 },
    { src: manropeBold, fontWeight: 700 },
    { src: manropeBold, fontWeight: 800 },
  ],
});

// ============================================================================
// INTERFACES
// ============================================================================

export interface OrgContext {
  systemSize?: number;
  orgType?: string;
  payerMixMedicare?: number;
  payerMixMedicaid?: number;
  payerMixCommercial?: number;
}

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
  conversionFactor?: number;
  assessmentNarrative: string;
  deploymentTenure?: string;
  orgContext?: OrgContext;
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
  context?: string;
  formula?: string;
  footnote?: string;
  userInputs?: Record<string, string>;
}

// ============================================================================
// CONSTANTS & UTILITIES
// ============================================================================

const TOTAL_PAGES = 8;
const DOMAIN_ORDER = ["capacity", "revenue", "workforce", "risk"];

const fmt = (n: number): string => {
  if (!n || n === 0) return "\u2014";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString()}`;
};

const domainDisplayName: Record<string, string> = {
  capacity: "Capacity",
  revenue: "Revenue",
  workforce: "Workforce",
  risk: "Quality",
};

function scoreBand(score: number): string {
  if (score <= 16) return "Pre-Measurement";
  if (score <= 38) return "Signal";
  if (score <= 60) return "Confirmed";
  if (score <= 79) return "Managed ROI";
  return "Strategic Asset";
}

function tenureLabel(tenure: string): string {
  const map: Record<string, string> = {
    "0-6": "Less than 6 months",
    "6-12": "6\u201312 months",
    "12-24": "1\u20132 years",
    "24+": "2+ years",
  };
  return map[tenure] || "";
}

function tenureScoreBand(score: number): "low" | "mid" | "high" {
  if (score <= 30) return "low";
  if (score <= 60) return "mid";
  return "high";
}

const BENCH: Record<string, { low: (p: number) => number; high: (p: number) => number; desc: string; source: string }> = {
  capacity: {
    low: (p) => Math.round(p * 1000),
    high: (p) => Math.round(p * 3000),
    desc: "in access revenue from recovered time, annually",
    source: "Source: MGMA Physician Compensation data; published literature on access revenue from documentation efficiency",
  },
  revenue: {
    low: (p) => Math.round(p * 4000),
    high: (p) => Math.round(p * 12000),
    desc: "from documentation-driven coding and denial impact, annually",
    source: "Source: AMA/MGMA coding benchmarks; published studies on documentation-driven revenue improvement (2\u20137%)",
  },
  workforce: {
    low: (p) => Math.round(p * 1500),
    high: (p) => Math.round(p * 4000),
    desc: "in avoided turnover and reduced burden costs, annually",
    source: "Source: AMGA Physician Retention Survey; replacement cost literature range $250K\u2013$500K per physician",
  },
  risk: {
    low: (p) => Math.round(p * 1000),
    high: (p) => Math.round(p * 3000),
    desc: "in downstream quality and compliance value, annually",
    source: "Source: CMS quality penalty exposure data; CDI program ROI literature",
  },
};

// ============================================================================
// ARCHETYPE COMPUTATION
// ============================================================================

function computeArchetype(
  domainLevels: Record<string, number>,
  providers: number
): { name: string; headline: string; body: string } {
  const DOMAIN_KEYS = ["capacity", "revenue", "workforce", "risk"];
  const LABELS: Record<string, string> = {
    capacity: "Capacity", revenue: "Revenue", workforce: "Workforce", risk: "Quality",
  };
  const join = (arr: string[]) => {
    if (arr.length === 0) return "";
    if (arr.length === 1) return arr[0];
    return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
  };
  const high = DOMAIN_KEYS.filter((d) => domainLevels[d] >= 3);
  const unmeasured = DOMAIN_KEYS.filter((d) => domainLevels[d] === 1);
  const allL1 = unmeasured.length === 4;
  const allHigh = DOMAIN_KEYS.every((d) => domainLevels[d] >= 3);

  if (allL1) {
    return {
      name: "Live. Not Yet Measured.",
      headline: "The deployment is running. The measurement story hasn\u2019t started.",
      body: `The deployment is running across ${providers > 0 ? providers.toLocaleString() + " providers" : "your organization"}. What it\u2019s returning \u2014 in revenue, workforce, and quality terms \u2014 hasn\u2019t been formally analyzed yet. That\u2019s where most organizations begin. It\u2019s also where most stay longest.`,
    };
  }
  if (allHigh) {
    return {
      name: "Strategic Maturity.",
      headline: "Four domains measured, connected, and managed.",
      body: "This is where most ambient deployments aspire to be and few reach. The work ahead is deepening strategic integration \u2014 not building the measurement foundation.",
    };
  }
  if (high.length === 0) {
    const l2count = DOMAIN_KEYS.filter((d) => domainLevels[d] === 2).length;
    if (l2count >= 3) {
      return {
        name: "Early Measurement Across All Domains.",
        headline: "Every domain has moved from awareness to data.",
        body: "None has been pushed to validated, actionable impact yet. The measurement foundation is in place \u2014 the question is which domain gets pushed first, and what it unlocks.",
      };
    }
    return {
      name: "Measuring the Basics. Opportunity Ahead.",
      headline: "Some measurement is underway. Most of the value story is still ahead.",
      body: `Some domains have moved from awareness to data. Most of the ambient value story hasn\u2019t been told yet.${providers > 0 ? ` At ${providers.toLocaleString()} providers, the confirmed value is a starting point \u2014 not the ceiling.` : ""}`,
    };
  }
  if (high.length === 1) {
    const d = high[0];
    const uStr = unmeasured.length > 0 ? join(unmeasured.map((k) => LABELS[k])) : "";
    const uVerb = unmeasured.length === 1 ? "hasn\u2019t" : "haven\u2019t";
    const profiles: Record<string, { name: string; headline: string; body: string }> = {
      capacity: {
        name: "Time Captured. Financial Story Unwritten.",
        headline: "Recovered time is in operational action. The broader value story is next.",
        body: `Recovered time has moved into operational action. The revenue, workforce, and quality implications of that decision haven\u2019t been formally analyzed.${uStr ? ` ${uStr} ${uVerb} been measured yet.` : ""}`,
      },
      revenue: {
        name: "Revenue Signal Measured. Ecosystem Unmeasured.",
        headline: "Revenue impact is on the radar. The rest of the value chain awaits.",
        body: `The documentation-to-revenue connection is on your radar and being measured. The capacity, workforce, and quality dimensions that inform and amplify that signal ${uVerb} been connected yet.${uStr ? ` ${uStr} remain${unmeasured.length === 1 ? "s" : ""} unmeasured.` : ""}`,
      },
      workforce: {
        name: "Provider Experience Quantified. Broader Picture Unmeasured.",
        headline: "Provider relief is quantified. Organizational implications are next.",
        body: `You\u2019ve quantified what ambient is doing for your providers. The organizational implications \u2014 what that relief means for access capacity, revenue, and downstream quality \u2014 ${uVerb} been formally connected yet.`,
      },
      risk: {
        name: "Quality Infrastructure Present. Value Chain Not Yet Built.",
        headline: "Quality tracking is in place. The downstream connections are next.",
        body: `Documentation quality is being tracked and monitored. The connection from that quality improvement to coding accuracy, CDI, and compliance programs ${uVerb} been formalized yet.${uStr ? ` ${uStr} remain${unmeasured.length === 1 ? "s" : ""} unmeasured.` : ""}`,
      },
    };
    return profiles[d] || { name: "Single Domain Measured.", headline: "", body: "" };
  }
  if (high.length >= 3) {
    const gap = DOMAIN_KEYS.filter((d) => domainLevels[d] < 3);
    const gapStr = join(gap.map((k) => LABELS[k]));
    return {
      name: "Measuring Across Most Domains.",
      headline: "Three or more domains are generating confirmed value.",
      body: `Three or more domains are generating confirmed, validated value.${gapStr ? ` ${gapStr} is the remaining gap \u2014 and at your scale, it\u2019s worth closing before the next planning cycle.` : " The work ahead is deepening each domain, not widening the foundation."}`,
    };
  }
  const pair = [...high].sort().join("+");
  const uStr = unmeasured.length > 0 ? join(unmeasured.map((k) => LABELS[k])) : "";
  const pairMap: Record<string, { name: string; headline: string; body: string }> = {
    "capacity+revenue": {
      name: "Operational and Financial Capture Underway.",
      headline: "Time recovery and revenue impact are both being measured.",
      body: `Time recovery is in action and revenue impact is measured.${uStr ? ` ${uStr} remain${unmeasured.length === 1 ? "s" : ""} unmeasured \u2014 and at your scale, those domains typically carry significant additional value.` : ""}`,
    },
    "capacity+workforce": {
      name: "Provider and Operational Value Captured.",
      headline: "Time recovery and workforce dimensions are connected.",
      body: "The time recovery and workforce dimensions are measured and connected. Revenue impact and quality downstream effects \u2014 often the highest-value domains per provider \u2014 haven\u2019t been formally analyzed yet.",
    },
    "capacity+risk": {
      name: "Operations and Quality Tracked. Revenue and Workforce Unmeasured.",
      headline: "Time conversion and quality monitoring are in place.",
      body: "Time conversion and quality monitoring are in place. Revenue impact and workforce implications \u2014 which typically represent the largest financial returns at scale \u2014 haven\u2019t been formally measured.",
    },
    "revenue+workforce": {
      name: "Financial and Provider Value Both Measured.",
      headline: "Revenue impact and workforce implications are both on the table.",
      body: "Revenue impact and workforce implications are both on the table. Capacity conversion strategy and quality downstream effects haven\u2019t been connected yet \u2014 and they compound the value of what you\u2019ve already built.",
    },
    "revenue+risk": {
      name: "Financial and Clinical Intelligence Present.",
      headline: "Revenue and quality dimensions are being measured.",
      body: "Revenue and quality dimensions are measured. Capacity conversion and workforce implications \u2014 often where the largest per-provider ROI lives \u2014 haven\u2019t been formally analyzed yet.",
    },
    "risk+workforce": {
      name: "Clinical Quality and Provider Experience Measured.",
      headline: "Documentation quality and workforce impact are tracked.",
      body: "Documentation quality and workforce impact are tracked. The capacity and revenue dimensions \u2014 what recovered time produces and what documentation quality is worth in billing \u2014 remain unmeasured.",
    },
  };
  return pairMap[pair] || {
    name: "Multiple Domains Measured.",
    headline: "Multiple dimensions of ambient value are being captured.",
    body: `Multiple dimensions of ambient value are being captured.${uStr ? ` ${uStr} ${unmeasured.length === 1 ? "hasn\u2019t" : "haven\u2019t"} been formally analyzed yet.` : ""}`,
  };
}

function computeTenureModifier(tenure: string, totalScore: number): string {
  if (!tenure) return "";
  const band = tenureScoreBand(totalScore);
  const matrix: Record<string, Record<string, string>> = {
    "0-6": {
      low: "You\u2019re early. Most organizations at this stage are still stabilizing adoption \u2014 this profile is expected. The question at 6 months isn\u2019t your score. It\u2019s whether you\u2019re building the measurement habits now.",
      mid: "Six months in with meaningful measurement already underway. You\u2019re ahead of the typical adoption curve.",
      high: "Less than 6 months in with strong measurement across multiple domains. That\u2019s unusual \u2014 it typically signals a pre-existing measurement culture or a focused implementation team.",
    },
    "6-12": {
      low: "A year in, and the measurement infrastructure is still forming. This is common \u2014 and also when the pattern gets set. Organizations that build measurement habits at 12 months don\u2019t usually have to rebuild them at 24.",
      mid: "A year in with several domains measured. You\u2019re past early adoption and moving into deliberate value realization. The next 12 months determine whether this becomes a strategic capability or stays informal.",
      high: "One year in with strong maturity. This pace is uncommon. Organizations that move this fast typically have explicit executive sponsorship of the measurement work \u2014 not just the deployment.",
    },
    "12-24": {
      low: "One to two years in, and most of the value story hasn\u2019t been told yet. The foundation is there \u2014 the question is whether the measurement program gets built this planning cycle or the next one.",
      mid: "One to two years in with moderate maturity. Some domains are yielding confirmed value; others haven\u2019t been analyzed. At this stage, the next chapter is about measurement discipline, not adoption \u2014 it\u2019s about whether there\u2019s a structured program to capture what\u2019s already generating returns.",
      high: "One to two years in with strong maturity. You\u2019ve used the deployment period to build real infrastructure. The work ahead is integration and depth.",
    },
    "24+": {
      low: "Two or more years live, and the measurement foundation hasn\u2019t been built. This profile has the most immediate strategic opportunity \u2014 not because the deployment has failed, but because value has been generating without being counted for a long time. What you find when you look will be surprising.",
      mid: "Two or more years live with mixed maturity. Some domains are yielding confirmed value; others have been generating returns that no one has looked at yet. At this tenure, that\u2019s a prioritization problem, not a knowledge problem.",
      high: "Two or more years live with strong maturity. This is where few organizations arrive. The deployment isn\u2019t just generating value \u2014 it\u2019s being managed as a strategic asset.",
    },
  };
  return matrix[tenure]?.[band] ?? "";
}

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
  whitePage: { backgroundColor: "#FFFFFF", padding: 48, fontFamily: "Manrope", fontSize: 10 },
  beigePageBg: { backgroundColor: "#F5F0EB", padding: 48, fontFamily: "Manrope", fontSize: 10 },
  darkPage: { backgroundColor: "#1A1A1A", padding: 48, fontFamily: "Manrope", fontSize: 10 },
  eyebrow: { fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  eyebrowDark: { fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  eyebrowGray: { fontSize: 8, fontWeight: 700, color: "#888888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  headline: { fontSize: 26, fontWeight: 800, color: "#1A1A1A", lineHeight: 1.15, textTransform: "uppercase", marginBottom: 14 },
  headlineDark: { fontSize: 28, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.15, marginBottom: 12 },
  subhead: { fontSize: 13, fontWeight: 700, color: "#1A1A1A", marginBottom: 6 },
  body: { fontSize: 11, fontWeight: 400, color: "#555555", lineHeight: 1.65, marginBottom: 10 },
  bodyDark: { fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.65)", lineHeight: 1.65 },
  bodyMuted: { fontSize: 10.5, fontWeight: 400, color: "#888888", lineHeight: 1.6 },
  italic: { fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, fontStyle: "italic" },
  disclaimer: { fontSize: 8, color: "#999999", lineHeight: 1.5 },
  bigNum: { fontSize: 48, fontWeight: 800, color: "#EA2C00", lineHeight: 1 },
  bigNumDark: { fontSize: 40, fontWeight: 800, color: "#FFFFFF", lineHeight: 1 },
  bigNumGray: { fontSize: 32, fontWeight: 800, color: "rgba(255,255,255,0.3)", lineHeight: 1 },
  medNum: { fontSize: 22, fontWeight: 800, color: "#EA2C00", lineHeight: 1 },
  redRule: { height: 3, backgroundColor: "#EA2C00", width: 48, marginBottom: 14 },
  divider: { height: 1, backgroundColor: "#E5E0D9", marginVertical: 18 },
  darkDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 12 },
  redAccentBar: { width: 3, backgroundColor: "#EA2C00", marginRight: 14, borderRadius: 2 },
  tile: { backgroundColor: "#FFFFFF", borderRadius: 4, padding: 16, borderWidth: 1, borderColor: "#E5E0D9" },
  beigeBox: { backgroundColor: "#F5F0EB", borderRadius: 4, padding: 16 },
  darkTile: { backgroundColor: "#1A1A1A", borderRadius: 4, padding: 18 },
  darkCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 4, padding: 14, marginBottom: 8 },
  orangeTile: { backgroundColor: "#EA2C00", borderRadius: 4, padding: 16 },
  unmeasuredBadge: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3,
    paddingVertical: 3, paddingHorizontal: 8, alignSelf: "flex-start",
  },
  levelBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#EA2C00", alignItems: "center", justifyContent: "center" },
  levelBadgeDark: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  footerWrapper: {
    marginTop: "auto", flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E5E0D9",
  },
  footerWrapperDark: {
    marginTop: "auto", flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)",
  },
});

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function PageFooter({ pageNum, orgName, dark = false }: { pageNum: number; orgName: string; dark?: boolean }) {
  return (
    <View style={dark ? s.footerWrapperDark : s.footerWrapper} fixed>
      <Text style={{ fontSize: 10, color: "#EA2C00", fontWeight: 700 }}>ABRIDGE</Text>
      <Text style={{ fontSize: 8, color: dark ? "rgba(255,255,255,0.4)" : "#888888" }}>
        Ambient Assessment {"\u00B7"} {orgName || "Your Organization"}
      </Text>
      <Text style={{ fontSize: 8, color: dark ? "rgba(255,255,255,0.3)" : "#AAAAAA" }}>
        Page {pageNum} of {TOTAL_PAGES}
      </Text>
    </View>
  );
}

// ============================================================================
// PAGE 3: THE FINANCIAL SHAPE
// ============================================================================

function FinancialShapePage({ data }: { data: AmbientAssessmentPDFData }) {
  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };
  const measuredTotal = DOMAIN_ORDER.reduce((sum, d) => {
    const dom = data.domains?.[d as keyof typeof data.domains];
    if (!dom?.hasValue) return sum;
    if (d === 'revenue' && dom.activationLevel === 2) return sum;
    return sum + (dom.gapValue || 0);
  }, 0);
  const revL2Value = (domainLevels.revenue === 2 && data.domains?.revenue?.hasValue)
    ? (data.domains.revenue.gapValue || 0) : 0;
  const unmeasuredLow = DOMAIN_ORDER.reduce((sum, d) => {
    if (domainLevels[d] === 1 && data.providers > 0) return sum + BENCH[d].low(data.providers);
    return sum;
  }, 0);
  const unmeasuredHigh = DOMAIN_ORDER.reduce((sum, d) => {
    if (domainLevels[d] === 1 && data.providers > 0) return sum + BENCH[d].high(data.providers);
    return sum;
  }, 0);

  const unmeasuredMid = Math.round((unmeasuredLow + unmeasuredHigh) / 2);
  const yr1 = Math.round(measuredTotal + unmeasuredMid * 0.25);
  const yr2 = Math.round(measuredTotal + unmeasuredMid * 0.65);
  const yr3 = Math.round(measuredTotal + unmeasuredMid);
  const maxBar = yr3 > 0 ? yr3 : 1;
  const showTrajectory = yr3 > measuredTotal;

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={s.redRule} />
      <Text style={s.eyebrow}>The Financial Shape</Text>
      <Text style={{ fontSize: 9, color: "#888888", lineHeight: 1.6, marginBottom: 20, maxWidth: 460 }}>
        {"The numbers below are either confirmed from your stated inputs or labeled as benchmark ranges. Nothing is projected without being labeled. The confirmed figures belong to your organization. The range reflects what organizations your size typically find when they analyze the domains you haven\u2019t measured yet."}
      </Text>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 6 }}>
        <View style={{ flex: 1, backgroundColor: "#1A1A1A", borderRadius: 6, padding: 20 }}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
            Confirmed Annual Value
          </Text>
          {measuredTotal > 0 ? (
            <>
              <Text style={{ fontSize: 42, fontWeight: 800, color: "#EA2C00", lineHeight: 1, marginBottom: 4 }}>
                {fmt(measuredTotal)}
              </Text>
              <Text style={{ fontSize: 8.5, color: "rgba(255,255,255,0.3)" }}>
                {"per year \u00B7 from your inputs"}
              </Text>
              <Text style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>
                {`Confirmed across ${DOMAIN_ORDER.filter(d => {
                  const dom = data.domains?.[d as keyof typeof data.domains];
                  return dom?.hasValue && !(d === 'revenue' && domainLevels[d] === 2);
                }).length} of 4 domains`}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.2)", lineHeight: 1, marginBottom: 4 }}>
                {"\u2014"}
              </Text>
              <Text style={{ fontSize: 8.5, color: "rgba(255,255,255,0.2)" }}>No domains formally measured yet</Text>
            </>
          )}
          {unmeasuredLow > 0 && (
            <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
                Not Yet in the Picture
              </Text>
              <Text style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.4)", lineHeight: 1, marginBottom: 3 }}>
                {`+ ${fmt(unmeasuredLow)}\u2013${fmt(unmeasuredHigh)}`}
              </Text>
              <Text style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>per year {"\u00B7"} benchmark range</Text>
            </View>
          )}
          {revL2Value > 0 && (
            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "rgba(245,158,11,0.7)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
                Revenue Signal
              </Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,158,11,0.8)", lineHeight: 1 }}>
                {`~${fmt(revL2Value)}/yr`}
              </Text>
              <Text style={{ fontSize: 7.5, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>
                Signals observed {"\u00B7"} not yet confirmed in billing data {"\u00B7"} Next: retrospective coding audit
              </Text>
            </View>
          )}
        </View>
      </View>

      {showTrajectory && (
        <View style={[s.beigeBox, { marginTop: 16 }]}>
          <Text style={s.eyebrow}>Value of Acting Now</Text>
          <Text style={{ fontSize: 8.5, color: "#888888", marginBottom: 12 }}>
            {"What the measurement program is worth over 36 months \u2014 at your scale."}
          </Text>
          {[
            { label: "TODAY", value: measuredTotal, note: "confirmed", highlight: false },
            { label: "YEAR 1", value: yr1, note: "if measurement begins now", highlight: false },
            { label: "YEAR 2", value: yr2, note: "domains formalized", highlight: false },
            { label: "YEAR 3", value: yr3, note: "full measurement", highlight: true },
          ].map((item, i) => {
            const pct = Math.round((item.value / maxBar) * 100);
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: i < 3 ? 6 : 0 }}>
                <Text style={{ fontSize: 7, fontWeight: 700, color: "#888888", letterSpacing: 1, width: 34 }}>{item.label}</Text>
                <View style={{ flex: 1, height: 7, backgroundColor: "#E5E0D9", borderRadius: 3 }}>
                  <View style={{ width: pct + "%", height: 7, backgroundColor: i === 0 ? "#CCCCCC" : "#EA2C00", borderRadius: 3, opacity: i === 0 ? 0.6 : 0.4 + i * 0.2 }} />
                </View>
                <Text style={{ fontSize: 8.5, fontWeight: 700, color: item.highlight ? "#EA2C00" : "#555555", width: 62, textAlign: "right" }}>{fmt(item.value)}</Text>
                <Text style={{ fontSize: 7.5, color: "#AAAAAA", width: 90 }}>{item.note}</Text>
              </View>
            );
          })}
          <Text style={{ fontSize: 7.5, color: "#AAAAAA", marginTop: 10, fontStyle: "italic" }}>
            {"Compounds because measurement enables optimization \u2014 organizations that measure early improve faster, widening the gap with each passing quarter. Not a projection for your organization."}
          </Text>
        </View>
      )}

      <View style={{ marginTop: "auto" }}>
        <Text style={s.disclaimer}>
          {"Confirmed values derived from stated inputs using conservative 11-month projection with confidence discounts. Benchmark ranges for unmeasured domains are based on organizations of comparable size and are not projections for your organization. Actual results vary."}
        </Text>
      </View>

      <PageFooter pageNum={3} orgName={data.organizationName} />
    </Page>
  );
}

// ============================================================================
// PAGE 1: YOUR ASSESSMENT
// ============================================================================

function YourAssessmentPage({ data }: { data: AmbientAssessmentPDFData }) {
  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };
  const archetype = computeArchetype(domainLevels, data.providers);
  const tenureMod = computeTenureModifier(data.deploymentTenure || "", data.documentationScore);
  const band = scoreBand(data.documentationScore);
  const domainScores: Record<string, number> = {
    capacity: data.domains?.capacity?.score || 0,
    revenue: data.domains?.revenue?.score || 0,
    workforce: data.domains?.workforce?.score || 0,
    risk: data.domains?.risk?.score || 0,
  };

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={s.redRule} />
      <Text style={s.eyebrow}>Your Assessment</Text>

      <View style={{ flexDirection: "row", gap: 24, marginBottom: 20 }}>
        <View style={{ flex: 1.6 }}>
          <Text style={{ fontSize: 9, fontWeight: 700, color: "#888888", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>
            {`Your Ambient Profile \u00B7 ${archetype.name}`}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A", lineHeight: 1.2, marginBottom: 10 }}>
            {archetype.name}
          </Text>
          <View style={{ height: 1, backgroundColor: "#E5E0D9", marginBottom: 10 }} />
          {tenureMod ? (
            <Text style={{ fontSize: 10, color: "rgba(26,26,26,0.6)", lineHeight: 1.6, marginBottom: 8 }}>
              {tenureMod}
            </Text>
          ) : null}
          <Text style={{ fontSize: 10, color: "#555555", lineHeight: 1.65, marginBottom: 14 }}>
            {archetype.body}
          </Text>
        </View>

        <View style={{ flex: 0.75 }}>
          <View style={[s.beigeBox, { alignItems: "center", paddingVertical: 18 }]}>
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
              Maturity Score
            </Text>
            <Text style={{ fontSize: 56, fontWeight: 800, color: "#EA2C00", lineHeight: 1 }}>
              {data.documentationScore}
            </Text>
            <Text style={{ fontSize: 13, color: "#AAAAAA", marginTop: 2 }}>/100</Text>
            <View style={{ height: 4, backgroundColor: "#E5E0D9", borderRadius: 2, width: "80%", marginTop: 8, marginBottom: 6 }}>
              <View style={{ height: 4, backgroundColor: "#EA2C00", borderRadius: 2, width: `${data.documentationScore}%` }} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A" }}>{band}</Text>
            {data.deploymentTenure && (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 3, paddingVertical: 4, paddingHorizontal: 10, marginTop: 8 }}>
                <Text style={{ fontSize: 8, color: "#888888", textAlign: "center" }}>
                  {tenureLabel(data.deploymentTenure) + " in deployment"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={s.divider} />
      <Text style={[s.eyebrowGray, { marginBottom: 10 }]}>Domain Breakdown</Text>

      {DOMAIN_ORDER.map((key) => {
        const score = domainScores[key];
        const level = data.domains?.[key as keyof typeof data.domains]?.activationLevel || 1;
        const label = data.domains?.[key as keyof typeof data.domains]?.activationLabel || "";
        const pct = (score / 25) * 100;
        const isUnmeasured = level === 1;
        return (
          <View key={key} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: isUnmeasured ? "#AAAAAA" : "#1A1A1A" }}>
                  {domainDisplayName[key]}
                </Text>
                <Text style={{ fontSize: 8.5, color: isUnmeasured ? "#BBBBBB" : "#888888" }}>
                  {`L${level} \u00B7 ${label}`}
                </Text>
              </View>
              <Text style={{ fontSize: 10, fontWeight: 700, color: isUnmeasured ? "#AAAAAA" : "#1A1A1A" }}>
                {score} / 25
              </Text>
            </View>
            <View style={{ height: 5, backgroundColor: "#E5E0D9", borderRadius: 2 }}>
              <View style={{ height: 5, backgroundColor: isUnmeasured ? "#D1D5DB" : "#EA2C00", borderRadius: 2, width: `${pct}%` }} />
            </View>
          </View>
        );
      })}

      <View style={[s.beigeBox, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, marginTop: 8 }]}>
        {[
          { label: "Pre-Measurement", range: "\u226416" },
          { label: "Signal", range: "17\u201338" },
          { label: "Confirmed", range: "39\u201360" },
          { label: "Managed ROI", range: "61\u201379" },
          { label: "Strategic Asset", range: "80\u2013100" },
        ].map((b, i) => {
          const isCurrent = scoreBand(data.documentationScore) === b.label;
          return (
            <View key={i} style={{ alignItems: "center", flex: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginBottom: 3, backgroundColor: isCurrent ? "#EA2C00" : "#CCCCCC" }} />
              <Text style={{ fontSize: 7.5, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? "#EA2C00" : "#999999", textAlign: "center" }}>
                {b.label}
              </Text>
              <Text style={{ fontSize: 7, color: "#AAAAAA", textAlign: "center" }}>{b.range}</Text>
            </View>
          );
        })}
      </View>

      <PageFooter pageNum={1} orgName={data.organizationName} />
    </Page>
  );
}

// ============================================================================
// PAGE 2: WHAT YOU TOLD US
// ============================================================================

function WhatYouToldUsPage({ data }: { data: AmbientAssessmentPDFData }) {
  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={s.redRule} />
      <Text style={s.eyebrow}>What You Told Us</Text>
      <Text style={{ fontSize: 9, color: "#888888", lineHeight: 1.6, marginBottom: 18, maxWidth: 460 }}>
        {"This page reflects what your organization reported across four domains. These are your words \u2014 organized by how far each domain has traveled."}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {DOMAIN_ORDER.map((key) => {
          const domain = data.domains?.[key as keyof typeof data.domains];
          const level = domain?.activationLevel || 1;
          const label = domain?.activationLabel || "";
          const userInputs = domain?.userInputs || {};
          const inputEntries = Object.entries(userInputs).filter(([, v]) => v);
          const isUnmeasured = level === 1;
          const nextStep = level < 4 ? (domainNextUnlock[key]?.[level] || "") : "";

          return (
            <View key={key} style={{ width: "48%", borderWidth: 1, borderColor: "#E5E0D9", borderRadius: 6, padding: 14, backgroundColor: "#FFFFFF" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: 800, color: isUnmeasured ? "#AAAAAA" : "#1A1A1A" }}>
                  {domainDisplayName[key]}
                </Text>
                <View style={{
                  backgroundColor: isUnmeasured ? "#F3F4F6" : "#FFF0ED",
                  borderRadius: 3, paddingVertical: 2, paddingHorizontal: 7,
                }}>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: isUnmeasured ? "#888888" : "#EA2C00", letterSpacing: 0.8 }}>
                    {`L${level}`}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 8, color: isUnmeasured ? "#BBBBBB" : "#888888", marginBottom: 8, fontStyle: "italic" }}>
                {label}
              </Text>

              <View style={{ height: 1, backgroundColor: "#F0EDEA", marginBottom: 8 }} />

              {isUnmeasured ? (
                <Text style={{ fontSize: 9, color: "#BBBBBB", fontStyle: "italic", lineHeight: 1.5 }}>
                  Not yet formally measured.
                </Text>
              ) : inputEntries.length > 0 ? (
                inputEntries.map(([k, v], i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 6, marginBottom: 5, alignItems: "flex-start" }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#EA2C00", marginTop: 3.5, flexShrink: 0 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 8, color: "#888888" }}>{k}</Text>
                      <Text style={{ fontSize: 9, fontWeight: 700, color: "#1A1A1A" }}>{v}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 9, color: "#AAAAAA", fontStyle: "italic" }}>No specific inputs recorded.</Text>
              )}

              {nextStep ? (
                <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0EDEA" }}>
                  <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
                    Next
                  </Text>
                  <Text style={{ fontSize: 8.5, color: "#888888", lineHeight: 1.5 }}>{nextStep}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <PageFooter pageNum={2} orgName={data.organizationName} />
    </Page>
  );
}

// ============================================================================
// PAGES 4–7: DOMAIN PAGES
// ============================================================================

const domainFrameText: Record<string, string> = {
  capacity: "Recovered time is ambient\u2019s most universal output. The strategic divide is between organizations that measure it and stop \u2014 and organizations that assign it a destination. Capacity measures that decision.",
  revenue: "Every encounter is coded. The question is whether it\u2019s coded at the specificity your documentation now supports \u2014 and whether your revenue cycle team is part of that conversation. Organizations that close that loop find it is worth millions. Most haven\u2019t asked the question yet.",
  workforce: "Provider burnout is one of the most expensive problems in health system operations \u2014 and ambient documentation is one of the few interventions that measurably addresses it. The value only becomes visible when someone is looking for it.",
  risk: "Improved notes are the starting point. The real value depends on whether that improvement reaches CDI, coding, quality reporting, compliance, and future AI initiatives. This domain measures how far downstream the documentation improvement has traveled.",
};

const domainAtThisLevel: Record<string, Record<number, string>> = {
  capacity: {
    1: "Time is being recovered. No operational decision has been made about how to use it \u2014 that\u2019s the gap. The hours exist, but without a decision to convert them into patient access, they remain undeployed capacity.",
    2: "Your organization has committed to converting recovered time into patient access. The measurement is beginning. The next move is confirming how many additional patients are actually being seen.",
    3: "Additional patients are being seen with recovered time. Access revenue is measured. The next level tracks downstream outcomes \u2014 panel growth, same-day access \u2014 attributed to recovered time.",
    4: "Recovered capacity is fully integrated into your operating model. Hiring decisions, panel targets, and access strategy all reflect what ambient has made possible.",
  },
  revenue: {
    1: "Documentation quality has improved across your deployment. Whether that improvement is changing coding accuracy, denial rates, or wRVU capture is still an open question. The revenue cycle team hasn\u2019t been asked yet.",
    2: "Your organization has observed directional signals \u2014 trends in coding, denials, or collections suggesting documentation is affecting reimbursement. The formal validation is in progress.",
    3: "A confirmed before/after number exists. The revenue cycle team is part of the ambient conversation. Documentation quality is a managed revenue lever, not incidental, but engineered.",
    4: "Documentation intelligence drives revenue cycle strategy, payer positioning, and financial planning. Documentation quality is a standing organizational metric.",
  },
  workforce: {
    1: "Providers are reporting less after-hours documentation time. That burden reduction has measurable value \u2014 but it hasn\u2019t been quantified or connected to retention or labor costs yet.",
    2: "Effort reduction is measured. In-clinic and after-hours time savings are quantified. What hasn\u2019t been asked yet is what turnover is costing \u2014 and how much of it traces back to documentation burden.",
    3: "Documentation burden is connected to turnover risk. The workforce economics are being understood. Provider experience data is informing staffing and recruitment decisions.",
    4: "Provider sustainability is fully integrated into workforce strategy. Documentation burden reduction is a variable in the FTE model, recruitment positioning, and labor cost management.",
  },
  risk: {
    1: "Documentation quality is improving across every encounter. Without systematic monitoring, that signal never reaches coding, CDI, or quality teams \u2014 and the risk-adjusted revenue it represents stays invisible.",
    2: "Documentation quality attributes are being tracked systematically. The signal is there and starting to reach the teams that depend on it. The next step is connecting that measurement to downstream programs.",
    3: "Documentation quality improvements are connected to downstream workflows \u2014 CDI, coding, quality measures, prior authorization, chart abstraction, or risk adjustment. The improved signal is reaching the teams built to use it.",
    4: "Structured documentation is organizational infrastructure. CDI, quality programs, value-based care strategy, and AI readiness all build on it \u2014 and it\u2019s governed accordingly.",
  },
};

const domainNextUnlock: Record<string, Record<number, string>> = {
  capacity: {
    1: "A decision about converting recovered time into patient access \u2014 whether evaluating, planning, piloting, or implementing scheduling changes.",
    2: "Confirmed additional patients per provider per month attributed to recovered time, with access revenue calculated.",
    3: "Tracking of downstream access outcomes \u2014 panel growth, same-day access, referral conversion \u2014 attributed to recovered time.",
    4: "",
  },
  revenue: {
    1: "Engagement with your revenue cycle team \u2014 asking whether they\u2019ve seen changes in coding accuracy, denial rates, or wRVU capture since ambient went live.",
    2: "A formal before/after analysis that produces a number revenue cycle leadership can stand behind.",
    3: "Documentation governance tied to payer strategy \u2014 where your coding accuracy data directly informs contract negotiations.",
    4: "",
  },
  workforce: {
    1: "Structured measurement of in-clinic and after-hours time savings \u2014 turning anecdotal relief into an organizational data point.",
    2: "Modeling turnover costs with documentation burden as a contributing factor \u2014 connecting provider experience data to retention economics.",
    3: "Documentation burden reduction as a formal variable in workforce strategy \u2014 informing recruitment, retention programs, and staffing model decisions.",
    4: "",
  },
  risk: {
    1: "Systematic tracking of documentation quality attributes \u2014 completeness, specificity, compliance readiness, and risk adjustment capture.",
    2: "Connecting documentation quality to at least one downstream program \u2014 CDI, coding, quality measures, prior authorization, or risk adjustment.",
    3: "Documentation quality positioned as a strategic organizational asset \u2014 informing quality program design, value-based care, compliance governance, and AI readiness.",
    4: "",
  },
};

const domainCoachingNote: Record<string, Record<string, string>> = {
  capacity: {
    low: "The organizations moving fastest from Level 1 to Level 3 share one thing: they scheduled the operational conversation \u2014 with a recommendation in hand \u2014 before they thought they were ready. The number doesn\u2019t need to be perfect. It needs to be in the room.",
    high: "Connecting recovered time to access revenue is one thing. Connecting it to a hiring model is another. Level 4 is where ambient stops being a documentation decision and starts being a workforce strategy.",
  },
  revenue: {
    low: "The revenue cycle team almost always finds something when they look. The barrier isn\u2019t data \u2014 it\u2019s the first conversation. Organizations that formalize that conversation within 90 days of deployment typically have a number before their first contract renewal.",
    high: "A measured revenue impact is a different kind of asset than a projection. It changes the conversation with payers, with leadership, and with the board. The question at this level is: who owns maintaining it?",
  },
  workforce: {
    low: "Provider experience is the most politically powerful data in a health system \u2014 and it\u2019s consistently under-quantified. Organizations that formalize this measurement tend to use it in ways they didn\u2019t initially plan: recruitment, contracts, board presentations.",
    high: "The transition from Level 3 to Level 4 is a governance decision, not a measurement decision. It\u2019s asking: is provider sustainability a formal variable in our FTE model?",
  },
  risk: {
    low: "The downstream value of better documentation compounds \u2014 but only when someone connects the improvement to the teams that depend on it. CDI, coding, quality reporting, and compliance teams need to see the change. That connection, formally structured, is the Level 1 to Level 2 move.",
    high: "Documentation quality as a strategic organizational asset is where ambient AI\u2019s long-term value gets locked in. Quality program design, VBC strategy, AI readiness, payer negotiations \u2014 these all depend on structured, complete documentation.",
  },
};

const DOMAIN_SOURCE_ATTRIBUTIONS: Record<string, string> = {
  capacity: "Based on MGMA Physician Compensation data and published literature on time-to-access in ambulatory care.",
  revenue: "Based on published studies reporting 2\u20137% revenue improvement from documentation specificity; AMA and MGMA coding benchmarks.",
  workforce: "Based on AMGA Physician Retention Survey; replacement cost literature range $250K\u2013$500K per physician.",
  risk: "Based on CMS quality penalty exposure data and CDI program ROI literature.",
};

const DOMAIN_STRATEGIC_QUESTIONS: Record<string, { question: string; context: string }> = {
  capacity: {
    question: "If the time your providers recover from documentation was fully converted to patient access \u2014 what would your access metrics look like in 18 months, and does your scheduling infrastructure support that conversion today?",
    context: "Most organizations find they have recovered time but haven\u2019t made the operational decision about where it goes. That decision is the Level 2 move.",
  },
  revenue: {
    question: "When did your revenue cycle team last formally look at documentation quality as a driver of coding accuracy and denial prevention? A before/after analysis at your scale typically takes 4\u20136 weeks. What would that number change about your next planning cycle?",
    context: "The revenue cycle team almost always finds something when they look. The barrier isn\u2019t data \u2014 it\u2019s the first formal conversation.",
  },
  workforce: {
    question: "At your current provider turnover rate, what percentage of ambient\u2019s workforce benefit is being offset by recruitment and retention costs that haven\u2019t been formally connected to the deployment?",
    context: "Provider experience is the most politically powerful data in a health system \u2014 and it\u2019s consistently under-quantified.",
  },
  risk: {
    question: "Your documentation quality has measurably improved. Which downstream programs \u2014 CDI, coding, prior authorization, value-based care \u2014 are structurally designed to benefit from that improvement, and has any of them been formally connected to it?",
    context: "The downstream value of better documentation compounds \u2014 but only when someone builds the connection between the improvement and the teams that depend on it.",
  },
};

function DomainPage({
  domainKey,
  data,
  pageNum,
}: {
  domainKey: string;
  data: AmbientAssessmentPDFData;
  pageNum: number;
}) {
  const domainStrategicQuestion: Record<string, string> = {
    capacity: "Did the time ambient saved get redeployed into patient access \u2014 or did it disappear?",
    revenue: "Did documentation quality improvements reach revenue cycle \u2014 or stop at the note?",
    workforce: "Did provider relief translate into measurable retention economics \u2014 or stay anecdotal?",
    risk: "Did improved documentation accuracy produce downstream clinical and compliance value \u2014 or stay untracked?",
  };

  const domain = data.domains?.[domainKey as keyof typeof data.domains] || ({} as DomainData);
  const level = domain.activationLevel || 1;
  const label = domain.activationLabel || "";
  const hasValue = domain.hasValue || false;
  const value = domain.gapValue || 0;
  const name = domainDisplayName[domainKey];
  const providers = data.providers || 0;

  const isUnmeasured = level === 1;
  const nextUnlock = level < 4 ? domainNextUnlock[domainKey]?.[level] || "" : "";
  const coachNote = domainCoachingNote[domainKey]?.[level <= 2 ? "low" : "high"] || "";
  const footnote = domain.footnote || "";
  const userInputs = domain.userInputs || {};
  const userInputEntries = Object.entries(userInputs).filter(([, v]) => v);

  const bench = BENCH[domainKey];
  const benchLow = bench && providers > 0 ? bench.low(providers) : 0;
  const benchHigh = bench && providers > 0 ? bench.high(providers) : 0;

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={{ flexDirection: "row", gap: 20, flex: 1 }}>

        <View style={{ flex: 1.55 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <View style={isUnmeasured ? s.levelBadgeDark : s.levelBadge}>
              <Text style={{ fontSize: 11, fontWeight: 800, color: isUnmeasured ? "#888888" : "#FFFFFF" }}>
                {level}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, color: isUnmeasured ? "#AAAAAA" : "#EA2C00", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>
                {name}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: 800, color: isUnmeasured ? "#888888" : "#1A1A1A", lineHeight: 1.2 }}>
                {label}
              </Text>
            </View>
            {isUnmeasured && (
              <View style={{ backgroundColor: "#F3F4F6", borderRadius: 3, paddingVertical: 3, paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 1, textTransform: "uppercase" }}>
                  NOT YET MEASURED
                </Text>
              </View>
            )}
            {!isUnmeasured && hasValue && value > 0 && (
              <View style={{ backgroundColor: "#FFF0ED", borderRadius: 3, paddingVertical: 4, paddingHorizontal: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: 800, color: "#EA2C00", lineHeight: 1 }}>
                  {fmt(value)}
                </Text>
                <Text style={{ fontSize: 7.5, color: "#EA2C00", marginTop: 1 }}>per year</Text>
              </View>
            )}
          </View>

          <View style={[s.divider, { marginVertical: 10 }]} />

          <Text style={{ fontSize: 9.5, color: "#777777", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10, borderLeftWidth: 2, borderLeftColor: "#E5E0D9", paddingLeft: 10 }}>
            {domainStrategicQuestion[domainKey]}
          </Text>

          <Text style={s.body}>{domainFrameText[domainKey]}</Text>

          <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>
            {isUnmeasured ? "THE UNMEASURED SIGNAL" : "WHERE YOU STAND"}
          </Text>
          <Text style={s.body}>
            {domain.context || domainAtThisLevel[domainKey]?.[level] || ""}
          </Text>

          {!isUnmeasured && domain.headlineMetric && (
            <View style={[s.beigeBox, { marginBottom: 10 }]}>
              <Text style={s.eyebrow}>MEASURED IMPACT</Text>
              <Text style={{ fontSize: 16, fontWeight: 800, color: "#EA2C00", lineHeight: 1.2 }}>
                {domain.headlineMetric}
              </Text>
            </View>
          )}

          {isUnmeasured && benchLow > 0 && (
            <View style={[s.beigeBox, { marginBottom: 10 }]}>
              <Text style={s.eyebrowGray}>BENCHMARK RANGE</Text>
              <Text style={{ fontSize: 26, fontWeight: 800, color: "#555555", lineHeight: 1.1, marginBottom: 4 }}>
                {fmt(benchLow)}{"–"}{fmt(benchHigh)}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#888888" }}>{bench.desc}</Text>
              <Text style={{ fontSize: 8, color: "#AAAAAA", marginTop: 4, fontStyle: "italic" }}>
                Benchmark range based on organizations your size. Not a projection for your organization.
              </Text>
              {bench.source && (
                <Text style={{ fontSize: 7, color: "#BBBBBB", marginTop: 3, fontStyle: "italic" }}>
                  {bench.source}
                </Text>
              )}
            </View>
          )}

          {nextUnlock ? (
            <View>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
                THE MOVE FROM HERE
              </Text>
              <Text style={{ fontSize: 10, color: "#555555", lineHeight: 1.6 }}>{nextUnlock}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E0D9" }}>
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>
              The Question This Domain Raises
            </Text>
            <Text style={{ fontSize: 9.5, color: "#444444", lineHeight: 1.6, fontStyle: "italic" }}>
              {DOMAIN_STRATEGIC_QUESTIONS[domainKey]?.question || ""}
            </Text>
          </View>

          {footnote ? (
            <Text style={{ fontSize: 8, color: "#AAAAAA", lineHeight: 1.5, fontStyle: "italic", marginTop: 8 }}>
              {footnote}
            </Text>
          ) : null}

          <Text style={{ fontSize: 7.5, color: "#AAAAAA", lineHeight: 1.5, marginTop: 10, fontStyle: "italic" }}>
            {DOMAIN_SOURCE_ATTRIBUTIONS[domainKey] || ""}
          </Text>

          {domainKey === "workforce" && (
            (() => {
              const rc = userInputs["Replacement cost per physician"] || userInputs["replacementCost"];
              const isDefault = !rc || rc === "$350,000" || rc === "350000" || rc === "$350K";
              return isDefault ? (
                <Text style={{ fontSize: 7.5, color: "#AAAAAA", lineHeight: 1.4, fontStyle: "italic", marginTop: 6 }}>
                  Replacement cost uses AMGA benchmark default ($350K). Source: AMGA Physician Retention Survey; industry range $250K–$500K per physician.
                </Text>
              ) : null;
            })()
          )}
        </View>

        <View style={[s.darkTile, { flex: 0.9, padding: 20 }]}>

          {!isUnmeasured && hasValue && value > 0 ? (
            <>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
                CALCULATED IMPACT
              </Text>
              <Text style={{ fontSize: 34, fontWeight: 800, color: "#EA2C00", lineHeight: 1, marginBottom: 3 }}>
                {fmt(value)}
              </Text>
              <Text style={{ fontSize: 8.5, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>per year</Text>
            </>
          ) : isUnmeasured && benchLow > 0 ? (
            <>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
                BENCHMARK RANGE
              </Text>
              <Text style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.4)", lineHeight: 1, marginBottom: 3 }}>
                {fmt(benchLow)}{"–"}{fmt(benchHigh)}
              </Text>
              <Text style={{ fontSize: 8.5, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>
                typical range at your scale {"·"} not a projection
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
                IMPACT
              </Text>
              <Text style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>
                Not yet calculated
              </Text>
            </>
          )}

          {userInputEntries.length > 0 && (
            <>
              <View style={s.darkDivider} />
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
                YOUR INPUTS
              </Text>
              {userInputEntries.map(([key, val], i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                  <Text style={{ fontSize: 8.5, color: "rgba(255,255,255,0.4)", flex: 1 }}>{key}</Text>
                  <Text style={{ fontSize: 8.5, fontWeight: 600, color: "rgba(255,255,255,0.75)", textAlign: "right", maxWidth: "50%" }}>{val}</Text>
                </View>
              ))}
            </>
          )}

          <View style={[s.darkDivider, { marginTop: 14 }]} />

          <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
            WHAT HIGH PERFORMERS DO
          </Text>
          <Text style={{ fontSize: 9.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
            {coachNote}
          </Text>

          <View style={[s.darkDivider, { marginTop: 14 }]} />
          <Text style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            MATURITY LEVEL
          </Text>
          <View style={{ flexDirection: "row", gap: 5 }}>
            {[1, 2, 3, 4].map((l) => (
              <View key={l} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: l <= level ? "#EA2C00" : "rgba(255,255,255,0.1)" }} />
            ))}
          </View>
          <Text style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 5 }}>Level {level} of 4</Text>
        </View>
      </View>

      {bench.source && (
        <Text style={{ fontSize: 7, color: "#BBBBBB", fontStyle: "italic", marginTop: 4 }}>
          {bench.source}
        </Text>
      )}

      <PageFooter pageNum={pageNum} orgName={data.organizationName} />
    </Page>
  );
}

// ============================================================================
// PAGE 8: THE QUESTIONS AHEAD
// ============================================================================

function TheQuestionsPage({ data }: { data: AmbientAssessmentPDFData }) {
  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };
  const archetype = computeArchetype(domainLevels, data.providers);
  const band = scoreBand(data.documentationScore);

  return (
    <Page size="LETTER" style={s.darkPage} wrap={false}>
      <View style={s.redRule} />
      <Text style={s.eyebrowDark}>The Questions Ahead</Text>
      <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 4, maxWidth: 460 }}>
        {`${archetype.name} \u2014 ${band}.`}
      </Text>
      <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, marginBottom: 24, maxWidth: 460 }}>
        {"These are the questions worth taking into your next internal conversation. They don\u2019t have easy answers \u2014 and they shouldn\u2019t. The organizations that move fastest are the ones that decide, in a room like this one, that they want to find out."}
      </Text>

      {DOMAIN_ORDER.map((key, i) => (
        <View key={key} style={{ marginBottom: i < DOMAIN_ORDER.length - 1 ? 20 : 0 }}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
            {domainDisplayName[key]}
          </Text>
          <Text style={{ fontSize: 11.5, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.5, marginBottom: 6 }}>
            {DOMAIN_STRATEGIC_QUESTIONS[key]?.question || ""}
          </Text>
          <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", lineHeight: 1.55 }}>
            {DOMAIN_STRATEGIC_QUESTIONS[key]?.context || ""}
          </Text>
          {i < DOMAIN_ORDER.length - 1 && (
            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginTop: 18 }} />
          )}
        </View>
      ))}

      <View style={{ marginTop: "auto" }}>
        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 12 }} />
        <Text style={{ fontSize: 8.5, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
          {"This assessment reflects self-reported maturity across four organizational value domains. Confirmed figures are derived from your stated inputs. Benchmark ranges are based on organizations of comparable size and are not projections for your organization. Assessment completed " + data.assessmentDate + "."}
        </Text>
      </View>

      <PageFooter pageNum={8} orgName={data.organizationName} dark />
    </Page>
  );
}

// ============================================================================
// OPPORTUNITY TEXT (preserved for Screen6Invitation import)
// ============================================================================

const opportunityText: Record<string, Record<number, string>> = {
  capacity: {
    1: "Deployment exists, but no operational response has followed. Recovered time isn\u2019t being tracked or deployed.",
    2: "Aggregate hours are known and presented to leadership, but not yet converted to additional access or volume.",
    3: "Schedules, panels, or slots have been changed based on the recovered time. Capacity is being redeployed into patient access.",
    4: "Recovered FTE equivalent is a variable in hiring, expansion, and build planning. Capacity drives staffing and growth decisions.",
  },
  revenue: {
    1: "No one has analyzed whether documentation changes are affecting reimbursement. Revenue cycle has not been asked.",
    2: "Your organization has observed directional signals \u2014 trends in coding, denials, or collections suggesting documentation is affecting reimbursement.",
    3: "Before/after analysis complete; a dollar number exists that leadership can stand behind. Revenue impact measured and attributed.",
    4: "Documentation intelligence drives revenue cycle strategy, payer positioning, and financial planning.",
  },
  workforce: {
    1: "Providers report less after-hours work, but it has not been measured yet. Anecdotal feedback only.",
    2: "In-clinic and after-hours time formally quantified; survey data captured. Burden reduction measured and validated.",
    3: "Turnover exposure modeled; documentation burden is a named variable in retention strategy.",
    4: "Agency and locum costs measurably reduced; workforce economics improving.",
  },
  risk: {
    1: "Notes are better; no system is translating that into financial or compliance value.",
    2: "Completeness, specificity, and HCC capture are tracked; gaps are visible.",
    3: "CDI, coding, quality reporting, and prior auth workflows are actively using improved documentation.",
    4: "Payer contracts, value-based care programs, compliance governance, and quality strategy are all built on documentation quality as a formal input.",
  },
};

export { opportunityText };

// ============================================================================
// DOCUMENT ASSEMBLY
// ============================================================================

const AmbientAssessmentDocument = ({ data }: { data: AmbientAssessmentPDFData }) => {
  return (
    <Document>
      <PDFCoverPage
        reportLabel="Ambient Assessment"
        title="Ambient Maturity Assessment"
        clientName={data.organizationName || "Your Organization"}
        preparedBy={data.preparedBy || "Abridge Partner Success"}
        disclaimerText="This assessment is for strategic planning purposes. All estimates are based on organizational self-assessment and your inputs. Benchmarks reflect published industry sources. Individual results vary."
      />
      <YourAssessmentPage data={data} />
      <WhatYouToldUsPage data={data} />
      <FinancialShapePage data={data} />
      <DomainPage domainKey="capacity" data={data} pageNum={4} />
      <DomainPage domainKey="revenue" data={data} pageNum={5} />
      <DomainPage domainKey="workforce" data={data} pageNum={6} />
      <DomainPage domainKey="risk" data={data} pageNum={7} />
      <TheQuestionsPage data={data} />
    </Document>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

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

