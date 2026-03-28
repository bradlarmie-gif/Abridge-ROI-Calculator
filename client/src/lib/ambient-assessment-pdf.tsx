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
  providerRate?: number;
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

const TOTAL_PAGES = 9;
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
  if (score <= 16) return "Quantifying";
  if (score <= 38) return "Measuring";
  if (score <= 60) return "Acting";
  if (score <= 79) return "Managing";
  return "Full Capture";
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

function tenureIsLong(tenure: string): boolean {
  return tenure === "12-24" || tenure === "24+";
}

function tenureMonthsMidpoint(tenure: string): number {
  const map: Record<string, number> = { "0-6": 3, "6-12": 9, "12-24": 18, "24+": 30 };
  return map[tenure] || 0;
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
      low: "One to two years in, and most of the value story hasn\u2019t been told yet. The window to build measurement infrastructure is narrowing \u2014 not because it closes, but because every month without it is a month of value sitting uncounted.",
      mid: "One to two years in with moderate maturity. Some domains are yielding confirmed value; others haven\u2019t been analyzed. At this stage, the next chapter is about measurement discipline, not adoption \u2014 it\u2019s about whether there\u2019s a structured program to capture what\u2019s already generating returns.",
      high: "One to two years in with strong maturity. You\u2019ve used the deployment period to build real infrastructure. The work ahead is integration and depth.",
    },
    "24+": {
      low: "Two or more years live, and the measurement foundation hasn\u2019t been built. This profile has the most immediate strategic opportunity in this assessment \u2014 not because the deployment has failed, but because value is already generating \u2014 this is the measurement story waiting to be told. What you find when you look will be surprising.",
      mid: "Two or more years live with mixed maturity. Some domains are yielding confirmed value; others have been generating returns that no one has looked at yet. At this tenure, that\u2019s a prioritization problem, not a knowledge problem.",
      high: "Two or more years live with strong maturity. This is where few organizations arrive. The deployment isn\u2019t just generating value \u2014 it\u2019s being managed as a strategic asset.",
    },
  };
  return matrix[tenure]?.[band] ?? "";
}

function computeInvitationCopy(
  totalScore: number,
  scoreBandLabel: string,
  tenure: string
): { opening: string; body: string; tenureAppend: string } {
  const band = tenureScoreBand(totalScore);
  const opening = `The organizations that move from ${scoreBandLabel} to Level 3+ across multiple domains in under 12 months don\u2019t do it alone.`;
  const bodies: Record<string, string> = {
    low: `What they have in common isn\u2019t a better deployment \u2014 it\u2019s a measurement program. A structured CDI and coding review process connected to their ambient data. A formal provider satisfaction measurement program that runs on a cadence. Executive ownership of the maturity roadmap, not just the deployment. Your current profile \u2014 ${scoreBandLabel} \u2014 is the most common starting point for organizations that reach Level 3+ within 12 months. Not because the gap is small. Because the gap is visible.`,
    mid: `What they have in common is that the domains they\u2019ve measured have given them leverage. The signal you\u2019ve built is real. The organizations that move quickly from here use that signal to accelerate the unmeasured domains \u2014 not one at a time, but as a connected program. The measurement infrastructure you\u2019ve started is the hardest part to build from scratch. You\u2019re not starting from scratch.`,
    high: `What they have in common is governance \u2014 ensuring the measurement capability is institutional, not dependent on champions, and that it scales as the deployment grows. Your profile suggests you\u2019re closer to that frontier than most. The question is whether it\u2019s owned by the organization or by a few people inside it.`,
  };
  const tenureAppends: Record<string, string> = {
    "0-6": "At less than 6 months, you\u2019re in the window where the measurement habits get set. The organizations that build them now don\u2019t have to rebuild them at 24 months.",
    "6-12": "At 6\u201312 months, you\u2019re at the decision point. The deployment is stable. The question is whether measurement becomes a program or stays informal.",
    "12-24": "At 1\u20132 years, the opportunity is sharpening. Every month the measurement infrastructure doesn\u2019t exist, value that\u2019s already there goes uncounted.",
    "24+": "At 2+ years, the conversation is different. It\u2019s not about building measurement habits. It\u2019s about what\u2019s been sitting on the table \u2014 and what it takes to count it this year.",
  };
  return {
    opening,
    body: bodies[band],
    tenureAppend: tenure ? (tenureAppends[tenure] || "") : "",
  };
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
// PAGE 1: EXECUTIVE SUMMARY
// ============================================================================

function ExecutiveSummaryPage({ data }: { data: AmbientAssessmentPDFData }) {
  const band = scoreBand(data.documentationScore);
  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };
  const measuredTotal = DOMAIN_ORDER.reduce((sum, d) => {
    const dom = data.domains?.[d as keyof typeof data.domains];
    return dom?.hasValue ? sum + (dom.gapValue || 0) : sum;
  }, 0);
  const unmeasuredLow = DOMAIN_ORDER.reduce((sum, d) => {
    if (domainLevels[d] === 1 && data.providers > 0) return sum + BENCH[d].low(data.providers);
    return sum;
  }, 0);
  const unmeasuredHigh = DOMAIN_ORDER.reduce((sum, d) => {
    if (domainLevels[d] === 1 && data.providers > 0) return sum + BENCH[d].high(data.providers);
    return sum;
  }, 0);
  const measuredDomains = DOMAIN_ORDER.filter(d => domainLevels[d] >= 2);
  const unmeasuredDomains = DOMAIN_ORDER.filter(d => domainLevels[d] === 1);
  const archetype = computeArchetype(domainLevels, data.providers);

  const unmeasuredMid = Math.round((unmeasuredLow + unmeasuredHigh) / 2);
  const yr1 = Math.round(measuredTotal + unmeasuredMid * 0.25);
  const yr2 = Math.round(measuredTotal + unmeasuredMid * 0.65);
  const yr3 = Math.round(measuredTotal + unmeasuredMid);
  const maxBar = yr3 > 0 ? yr3 : 1;

  const findings: string[] = [];
  if (measuredDomains.length > 0) {
    const topDomain = measuredDomains.reduce((best, d) => {
      const bv = data.domains?.[best as keyof typeof data.domains]?.gapValue || 0;
      const dv = data.domains?.[d as keyof typeof data.domains]?.gapValue || 0;
      return dv > bv ? d : best;
    });
    const topVal = data.domains?.[topDomain as keyof typeof data.domains]?.gapValue || 0;
    if (topVal > 0) findings.push(`${domainDisplayName[topDomain]} is your strongest measured domain at ${fmt(topVal)}/year \u2014 confirmed from your data and stated inputs.`);
  }
  if (unmeasuredDomains.length > 0) {
    const names = unmeasuredDomains.map(d => domainDisplayName[d]);
    const nameStr = names.length === 1 ? names[0] : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
    findings.push(`${nameStr} ${unmeasuredDomains.length === 1 ? "has" : "have"} not been formally analyzed. Based on organizations your size, the range when they look is ${fmt(unmeasuredLow)}\u2013${fmt(unmeasuredHigh)}/year.`);
  }
  const tenureInsights: Record<string, string> = {
    "0-6": "You are in the window where measurement habits form. Organizations that build them before 12 months don\u2019t have to rebuild them at 24.",
    "6-12": "The deployment is stable. The question now is whether measurement becomes a structured program or stays informal.",
    "12-24": "One to two years in. Every month the unmeasured domains stay unmeasured is a month of value sitting uncounted.",
    "24+": "Two or more years live. The unmeasured domains have been generating value without being formally counted for a long time.",
  };
  if (data.deploymentTenure && tenureInsights[data.deploymentTenure]) {
    findings.push(tenureInsights[data.deploymentTenure]);
  }

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={s.redRule} />
      <Text style={s.eyebrow}>EXECUTIVE SUMMARY</Text>
      <Text style={{ fontSize: 10.5, color: "#444444", lineHeight: 1.7, marginBottom: 16 }}>
        {"This isn\u2019t a summary of your deployment. It\u2019s a measurement of what your deployment is producing across four organizational value domains \u2014 and a map of what hasn\u2019t been measured yet. The numbers that appear below are either confirmed from your stated inputs or labeled as benchmark ranges. Nothing is projected. Nothing is extrapolated without being labeled."}
      </Text>

      <Text style={{
        fontSize: 11,
        color: "#555555",
        lineHeight: 1.65,
        marginBottom: 20,
        maxWidth: 460,
      }}>
        {`This assessment is based on ${data.providers} providers and the activation levels your team reported across four domains. The first number below reflects value the math can confirm. The second reflects what organizations your size typically find when they analyze domains you haven't measured yet.`}
      </Text>

      <View style={{ flexDirection: "row", borderWidth: 1, borderColor: "#E5E0D9", borderRadius: 4, marginBottom: 16, overflow: "hidden" }}>
        <View style={{ flex: 1, padding: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>MATURITY SCORE</Text>
          <Text style={{ fontSize: 44, fontWeight: 800, color: "#EA2C00", lineHeight: 1 }}>{data.documentationScore}</Text>
          <Text style={{ fontSize: 8, color: "#AAAAAA", marginTop: 2 }}>/100</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, color: "#1A1A1A", marginTop: 6 }}>{band}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: "#E5E0D9" }} />
        <View style={{ flex: 1, padding: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>CONFIRMED VALUE</Text>
          {measuredTotal > 0 ? (
            <>
              <Text style={{ fontSize: 36, fontWeight: 800, color: "#EA2C00", lineHeight: 1 }}>{fmt(measuredTotal)}</Text>
              <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>{"per year \u00B7 from your data"}</Text>
            </>
          ) : (
            <Text style={{ fontSize: 13, fontWeight: 600, color: "#CCCCCC", marginTop: 8 }}>Not yet measured</Text>
          )}
        </View>
        <View style={{ width: 1, backgroundColor: "#E5E0D9" }} />
        <View style={{ flex: 1, padding: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>UNMEASURED RANGE</Text>
          {unmeasuredLow > 0 ? (
            <>
              <Text style={{ fontSize: 28, fontWeight: 800, color: "#555555", lineHeight: 1 }}>{fmt(unmeasuredLow)}</Text>
              <Text style={{ fontSize: 10, fontWeight: 800, color: "#555555", lineHeight: 1 }}>{"\u2013"}{fmt(unmeasuredHigh)}</Text>
              <Text style={{ fontSize: 8, color: "#888888", marginTop: 4 }}>{"per year \u00B7 benchmark range"}</Text>
            </>
          ) : (
            <Text style={{ fontSize: 11, fontWeight: 400, color: "#CCCCCC", marginTop: 8 }}>All domains measured</Text>
          )}
        </View>
      </View>

      {(() => {
        const confirmedAnnual = measuredTotal;
        const totalLow = confirmedAnnual + unmeasuredLow;
        const totalHigh = confirmedAnnual + unmeasuredHigh;
        const fmtCoi = (n: number) =>
          n >= 1_000_000
            ? `$${(n / 1_000_000).toFixed(1)}M`
            : `$${(n / 1_000).toFixed(0)}K`;
        return (
          <View style={{
            marginTop: 16,
            backgroundColor: "#1A1A1A",
            borderRadius: 8,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 8,
                color: "#EA2C00",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 4,
              }}>
                Cost of a 12-Month Delay
              </Text>
              <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                {`Every year at your current maturity level, the full gap persists. At your scale, waiting 12 months costs between ${fmtCoi(totalLow)} and ${fmtCoi(totalHigh)} in value not yet captured \u2014 the confirmed portion plus the unmeasured range.`}
              </Text>
            </View>
            <View style={{ marginLeft: 20, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Per Year Delayed</Text>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#FFFFFF" }}>
                {`${fmtCoi(totalLow)}\u2013${fmtCoi(totalHigh)}`}
              </Text>
            </View>
          </View>
        );
      })()}

      <View style={s.divider} />
      <Text style={[s.eyebrow, { marginBottom: 6 }]}>WHAT THIS ASSESSMENT FOUND</Text>
      <Text style={{ fontSize: 9, fontWeight: 700, color: "#EA2C00", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>{archetype.name}</Text>
      <Text style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.35, marginBottom: 8 }}>{archetype.headline}</Text>
      <Text style={[s.body, { color: "#444444", lineHeight: 1.7, marginBottom: 12 }]}>{archetype.body}</Text>

      {findings.length > 0 && (
        <View style={[s.beigeBox, { marginBottom: 16 }]}>
          {findings.map((f, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: i < findings.length - 1 ? 8 : 0 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#EA2C00", marginTop: 4, flexShrink: 0 }} />
              <Text style={{ fontSize: 10, color: "#444444", lineHeight: 1.6, flex: 1 }}>{f}</Text>
            </View>
          ))}
        </View>
      )}

      {unmeasuredLow > 0 && yr3 > measuredTotal && (
        <View>
          <Text style={[s.eyebrow, { marginBottom: 8 }]}>VALUE OF ACTING NOW — 36-MONTH TRAJECTORY</Text>
          <View style={[s.beigeBox, { paddingVertical: 12 }]}>
            {[
              { label: "TODAY", value: measuredTotal, note: "confirmed", highlight: false },
              { label: "YEAR 1", value: yr1, note: "if measurement begins", highlight: false },
              { label: "YEAR 2", value: yr2, note: "domains formalized", highlight: false },
              { label: "YEAR 3", value: yr3, note: "full capture", highlight: true },
            ].map((item, i) => {
              const pct = Math.round((item.value / maxBar) * 100);
              return (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: i < 3 ? 6 : 0 }}>
                  <Text style={{ fontSize: 7, fontWeight: 700, color: "#888888", letterSpacing: 1, width: 34 }}>{item.label}</Text>
                  <View style={{ flex: 1, height: 7, backgroundColor: "#E5E0D9", borderRadius: 3 }}>
                    <View style={{ width: pct + "%", height: 7, backgroundColor: i === 0 ? "#CCCCCC" : "#EA2C00", borderRadius: 3, opacity: i === 0 ? 1 : 0.5 + i * 0.15 }} />
                  </View>
                  <Text style={{ fontSize: 8.5, fontWeight: 700, color: item.highlight ? "#EA2C00" : "#555555", width: 62, textAlign: "right" }}>{fmt(item.value)}</Text>
                  <Text style={{ fontSize: 7.5, color: "#AAAAAA", width: 80 }}>{item.note}</Text>
                </View>
              );
            })}
            <Text style={{ fontSize: 7.5, color: "#AAAAAA", marginTop: 8, fontStyle: "italic" }}>
              Accelerated path assumes benchmark mid-range capture as unmeasured domains are formally analyzed. Not a projection for your organization.
            </Text>
          </View>
        </View>
      )}

      <PageFooter pageNum={1} orgName={data.organizationName} />
    </Page>
  );
}

// ============================================================================
// PAGE 2: YOUR STRATEGIC PROFILE
// ============================================================================

function StrategicProfilePage({ data }: { data: AmbientAssessmentPDFData }) {
  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };
  const archetype = computeArchetype(domainLevels, data.providers);
  const tenureMod = computeTenureModifier(data.deploymentTenure || "", data.documentationScore);
  const band = scoreBand(data.documentationScore);
  const tenure = data.deploymentTenure || "";

  const measuredTotal = DOMAIN_ORDER.reduce((sum, d) => {
    const dom = data.domains?.[d as keyof typeof data.domains];
    return dom?.hasValue ? sum + (dom.gapValue || 0) : sum;
  }, 0);
  const unmeasuredLow = DOMAIN_ORDER.reduce((sum, d) => {
    if (domainLevels[d] === 1 && data.providers > 0) return sum + BENCH[d].low(data.providers);
    return sum;
  }, 0);
  const unmeasuredHigh = DOMAIN_ORDER.reduce((sum, d) => {
    if (domainLevels[d] === 1 && data.providers > 0) return sum + BENCH[d].high(data.providers);
    return sum;
  }, 0);
  const unmeasuredCount = DOMAIN_ORDER.filter((d) => domainLevels[d] === 1).length;

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={s.redRule} />
      <Text style={s.eyebrow}>THE DIAGNOSIS</Text>

      <View style={{ flexDirection: "row", gap: 24, marginBottom: 20 }}>
        <View style={{ flex: 1.6 }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: "#EA2C00", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>
            {archetype.name}
          </Text>
          <Text style={{ fontSize: 26, fontWeight: 800, color: "#1A1A1A", lineHeight: 1.2, marginBottom: 10 }}>
            {archetype.headline}
          </Text>
          <Text style={[s.body, { fontSize: 11, color: "#444444", lineHeight: 1.7 }]}>
            {archetype.body}
          </Text>
          {tenureMod ? (
            <View style={{ borderLeftWidth: 3, borderLeftColor: "#EA2C00", paddingLeft: 12, marginTop: 12 }}>
              <Text style={{ fontSize: 7, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
                WHERE THIS PROFILE SITS IN THE ADOPTION CURVE
              </Text>
              <Text style={{ fontSize: 9.5, color: "#555555", lineHeight: 1.6 }}>
                {tenureMod}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 0.8 }}>
          <View style={[s.beigeBox, { alignItems: "center", paddingVertical: 20 }]}>
            <Text style={s.eyebrow}>THE FULL PICTURE</Text>
            <Text style={{ fontSize: 64, fontWeight: 800, color: "#EA2C00", lineHeight: 1 }}>
              {data.documentationScore}
            </Text>
            <Text style={{ fontSize: 16, color: "#AAAAAA", fontWeight: 400 }}>/100</Text>
            <View style={{ height: 4, backgroundColor: "#E5E0D9", borderRadius: 2, width: "80%", marginTop: 10, marginBottom: 8 }}>
              <View style={{ height: 4, backgroundColor: "#EA2C00", borderRadius: 2, width: `${data.documentationScore}%` }} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: 700, color: "#1A1A1A" }}>{band}</Text>
            <View style={{ height: 1, backgroundColor: "#E5E0D9", width: "80%", marginVertical: 10 }} />
            <Text style={{ fontSize: 8, color: "#888888", textAlign: "center", lineHeight: 1.5 }}>
              {measuredTotal > 0 ? fmt(measuredTotal) + " confirmed" : "No domains measured yet"}
              {unmeasuredLow > 0 ? "\n" + fmt(unmeasuredLow) + "\u2013" + fmt(unmeasuredHigh) + " unmeasured range" : ""}
            </Text>
            {tenure && (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 3, paddingVertical: 4, paddingHorizontal: 10, marginTop: 8 }}>
                <Text style={{ fontSize: 8, color: "#888888", textAlign: "center" }}>
                  {tenureLabel(tenure)} in deployment
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={s.divider} />

      <Text style={[s.eyebrow, { marginBottom: 10 }]}>WHAT THIS ASSESSMENT FOUND</Text>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: "#FFF0ED", borderRadius: 4, padding: 16, borderWidth: 1, borderColor: "#FDDDD5" }}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            WHAT THE MATH SHOWS
          </Text>
          {measuredTotal > 0 ? (
            <>
              <Text style={{ fontSize: 36, fontWeight: 800, color: "#EA2C00", lineHeight: 1, marginBottom: 4 }}>
                {fmt(measuredTotal)}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#888888" }}>per year {"·"} from measured domains</Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 16, fontWeight: 700, color: "#CCCCCC", lineHeight: 1, marginBottom: 4 }}>
                Not yet measured
              </Text>
              <Text style={{ fontSize: 8.5, color: "#AAAAAA" }}>
                {unmeasuredCount === 4 ? "All four domains at Level 1" : "No calculated value yet"}
              </Text>
            </>
          )}
        </View>

        {unmeasuredLow > 0 && (
          <View style={{ flex: 1, backgroundColor: "#F5F0EB", borderRadius: 4, padding: 16, borderWidth: 1, borderColor: "#E5E0D9" }}>
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
              WHAT HASN'T BEEN MEASURED
            </Text>
            <Text style={{ fontSize: 28, fontWeight: 800, color: "#555555", lineHeight: 1, marginBottom: 4 }}>
              {fmt(unmeasuredLow)}{"–"}{fmt(unmeasuredHigh)}
            </Text>
            <Text style={{ fontSize: 8.5, color: "#888888" }}>per year {"·"} benchmark range</Text>
          </View>
        )}

      </View>

      {unmeasuredLow > 0 && (
        <Text style={{ fontSize: 8.5, color: "#888888", lineHeight: 1.6, fontStyle: "italic" }}>
          The first number is what the math shows based on your data and stated assumptions. The second is a benchmark range — what organizations your size typically find when they analyze domains they haven't measured yet. Not a projection for your organization.
        </Text>
      )}

      <PageFooter pageNum={2} orgName={data.organizationName} />
    </Page>
  );
}

// ============================================================================
// PAGE 3: MATURITY POSITION
// ============================================================================

function MaturityPositionPage({ data }: { data: AmbientAssessmentPDFData }) {
  const band = scoreBand(data.documentationScore);
  const tenure = data.deploymentTenure || "";
  const domainScores: Record<string, number> = {
    capacity: data.domains?.capacity?.score || 0,
    revenue: data.domains?.revenue?.score || 0,
    workforce: data.domains?.workforce?.score || 0,
    risk: data.domains?.risk?.score || 0,
  };

  const narrativeByBandAndTenure = (): string => {
    const hasLongTenure = tenureIsLong(tenure);
    const tLabel = tenureLabel(tenure);
    if (data.documentationScore <= 30) {
      if (!tenure || tenure === "0-6") {
        return `Your organization is establishing its measurement foundation. This profile is common in early deployments \u2014 the technology is running, time is being recovered, and the measurement
infrastructure is still being built. The organizations that build it deliberately at this stage don\u2019t have to rebuild it later.`;
      }
      if (hasLongTenure) {
        return `${tLabel} in deployment with a ${data.documentationScore}/100 maturity score. Most of the value generating from your ambient deployment hasn\u2019t been formally captured yet. That
isn\u2019t a judgment \u2014 it\u2019s a description of where the measurement infrastructure is. The opportunity is real, it\u2019s specific, and it\u2019s in this document.`;
      }
      return `Your organization is in the early stages of capturing ambient ROI. Time is being saved, but value capture is largely unmeasured and unstructured. The organizations that move fastest from here
 share one pattern: they make measurement deliberate before 12 months.`;
    }
    if (data.documentationScore <= 60) {
      if (hasLongTenure) {
        return `${tLabel} in deployment, and your organization is measuring across some domains with real results. The gap is in the domains that haven\u2019t been formally analyzed yet. At this tenure,
that\u2019s not an adoption question \u2014 it\u2019s a prioritization question. ${data.assessmentNarrative || ""}`;
      }
      return `Your organization is beginning to connect ambient to outcomes. Some domains are producing measurable data; others are still establishing signal. ${data.assessmentNarrative || "The pattern in organizations at this stage: one or two domains move first, and the discipline from those domains pulls the others forward."}`;
    }
    if (data.documentationScore <= 85) {
      return `Your organization is managing ambient as a strategic asset in multiple domains.${hasLongTenure ? ` At ${tLabel}, that maturity is hard-earned.` : ""} The remaining opportunity is in the
domains that haven\u2019t yet been connected to operational outcomes \u2014 and the compounding effect of closing those gaps is significant.`;
    }
    return `Your organization has institutionalized ambient ROI across all four domains. This is strategic-level documentation intelligence. The opportunity at this stage is governance and
sustainability.`;
  };

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <Text style={s.eyebrow}>MATURITY POSITION</Text>
      <View style={{ flexDirection: "row", gap: 24, marginBottom: 16 }}>
        <View style={{ flex: 1.1 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginBottom: 10 }}>
            <Text style={{ fontSize: 72, fontWeight: 800, color: "#EA2C00", lineHeight: 1 }}>
              {data.documentationScore}
            </Text>
            <View style={{ paddingBottom: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: 400, color: "#CCCCCC", lineHeight: 1 }}>/100</Text>
              <Text style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{band}</Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: "#E5E0D9", borderRadius: 4, marginBottom: 16, width: "100%" }}>
            <View style={{ height: 8, backgroundColor: "#EA2C00", borderRadius: 4, width: `${data.documentationScore}%` }} />
          </View>
          <Text style={s.body}>{narrativeByBandAndTenure()}</Text>
        </View>

        <View style={{ flex: 0.9 }}>
          <Text style={s.eyebrow}>FOUR ORGANIZATIONAL DECISIONS</Text>
          <Text style={{ fontSize: 8.5, color: "#888888", lineHeight: 1.6, marginBottom: 10 }}>
            {"Each domain represents a distinct question. Capacity: did the time ambient saved get redeployed into patient access? Revenue: did documentation quality reach coding and denial management? Workforce: did provider relief translate to measurable retention economics? Quality: did improved accuracy produce downstream clinical and compliance value? These are four separate decisions, four separate measurement programs, four separate conversations with four separate stakeholders."}
          </Text>
          {DOMAIN_ORDER.map((key) => {
            const score = domainScores[key];
            const level = data.domains?.[key as keyof typeof data.domains]?.activationLevel || 1;
            const label = data.domains?.[key as keyof typeof data.domains]?.activationLabel || "";
            const pct = (score / 25) * 100;
            const isUnmeasured = level === 1;
            return (
              <View key={key} style={{ marginBottom: 13 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: 700, color: isUnmeasured ? "#AAAAAA" : "#1A1A1A" }}>
                    {domainDisplayName[key]}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: 700, color: isUnmeasured ? "#AAAAAA" : "#1A1A1A" }}>
                    {score} / 25
                  </Text>
                </View>
                <Text style={{ fontSize: 8.5, color: isUnmeasured ? "#BBBBBB" : "#888888", marginBottom: 4 }}>
                  {`L${level} \u2014 ${label}`}
                </Text>
                <View style={{ height: 4, backgroundColor: "#E5E0D9", borderRadius: 2 }}>
                  <View style={{ height: 4, backgroundColor: isUnmeasured ? "#D1D5DB" : "#EA2C00", borderRadius: 2, width: `${pct}%` }} />
                </View>
              </View>
            );
          })}
          <View style={s.divider} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A" }}>TOTAL</Text>
            <Text style={{ fontSize: 16, fontWeight: 800, color: "#EA2C00" }}>
              {data.documentationScore} / 100
            </Text>
          </View>
        </View>
      </View>

      <View style={[s.beigeBox, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 }]}>
        {[
          { label: "Quantifying", range: "\u226416" },
          { label: "Measuring", range: "17\u201338" },
          { label: "Acting", range: "39\u201360" },
          { label: "Managing", range: "61\u201379" },
          { label: "Full Capture", range: "80\u2013100" },
        ].map((b, i) => {
          const isCurrent = scoreBand(data.documentationScore) === b.label;
          return (
            <View key={i} style={{ alignItems: "center", flex: 1 }}>
              <View style={{
                width: 10, height: 10, borderRadius: 5, marginBottom: 4,
                backgroundColor: isCurrent ? "#EA2C00" : "#CCCCCC",
              }} />
              <Text style={{ fontSize: 8, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? "#EA2C00" : "#999999", textAlign: "center" }}>
                {b.label}
              </Text>
              <Text style={{ fontSize: 7.5, color: "#AAAAAA", textAlign: "center" }}>{b.range}</Text>
            </View>
          );
        })}
      </View>

      <PageFooter pageNum={3} orgName={data.organizationName} />
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
  const tenure = data.deploymentTenure || "";
  const providers = data.providers || 0;

  const isUnmeasured = level === 1;
  const nextUnlock = level < 4 ? domainNextUnlock[domainKey]?.[level] || "" : "";
  const coachNote = domainCoachingNote[domainKey]?.[level <= 2 ? "low" : "high"] || "";
  const formula = domain.formula || "";
  const footnote = domain.footnote || "";
  const userInputs = domain.userInputs || {};
  const userInputEntries = Object.entries(userInputs).filter(([, v]) => v);

  const bench = BENCH[domainKey];
  const benchLow = bench && providers > 0 ? bench.low(providers) : 0;
  const benchHigh = bench && providers > 0 ? bench.high(providers) : 0;

  const showCostOfTime = isUnmeasured && tenureIsLong(tenure) && benchLow > 0;
  const months = tenureMonthsMidpoint(tenure);
  const years = months / 12;
  const costLow = Math.round(benchLow * years);
  const costHigh = Math.round(benchHigh * years);
  const tenureDesc = tenure === "12-24" ? "roughly 18 months" : "2+ years";

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

          {showCostOfTime && (
            <View style={{ backgroundColor: "#FEF9F0", borderRadius: 4, padding: 14, borderWidth: 1, borderColor: "#F5E0C0", marginBottom: 10 }}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#C8372D", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>
                WHAT MAY ALREADY BE ON THE TABLE
              </Text>
              <Text style={{ fontSize: 10, fontWeight: 400, color: "#555555", lineHeight: 1.6 }}>
                {tenure === "12-24"
                  ? `At your scale, ${name} has been generating approximately ${fmt(benchLow)}–${fmt(benchHigh)} per year for ${tenureDesc}. That's approximately ${fmt(costLow)}–${fmt(costHigh)} in value over 18 months that hasn't been formally measured. The first step is measuring it — which takes weeks, not quarters.`
                  : `At your scale, ${name} has been generating approximately ${fmt(benchLow)}–${fmt(benchHigh)} per year for 2+ years. That's approximately ${fmt(costLow)}–${fmt(costHigh)} in cumulative value that has existed, at minimum, without being formally counted.`
                }
              </Text>
              <Text style={{ fontSize: 7.5, color: "#AAAAAA", marginTop: 5, fontStyle: "italic" }}>
                Approximate range. Not a projection for your organization. Actual results vary.
              </Text>
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

          {footnote ? (
            <Text style={{ fontSize: 8, color: "#AAAAAA", lineHeight: 1.5, fontStyle: "italic", marginTop: 8 }}>
              {footnote}
            </Text>
          ) : null}

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

          {formula ? (
            <>
              <View style={s.darkDivider} />
              <Text style={{ fontSize: 8, fontWeight: 700, color: isUnmeasured ? "rgba(255,255,255,0.3)" : "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
                {isUnmeasured ? "BENCHMARK BASIS" : "HOW THIS WAS CALCULATED"}
              </Text>
              {formula.split("\n").map((line, i) => (
                <Text key={i} style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, fontStyle: "italic" }}>
                  {line}
                </Text>
              ))}
            </>
          ) : null}

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

function MethodologyPage({ data }: { data: AmbientAssessmentPDFData }) {
  const capacityLevel = data.domains?.capacity?.activationLevel ?? 1;
  const revenueLevel = data.domains?.revenue?.activationLevel ?? 1;
  const workforceLevel = data.domains?.workforce?.activationLevel ?? 1;
  const qualityLevel = data.domains?.risk?.activationLevel ?? 1;

  const assumptions: { domain: string; level: number; lines: string[] }[] = [];

  if (capacityLevel >= 2) {
    assumptions.push({
      domain: "Capacity",
      level: capacityLevel,
      lines: [
        `Providers in scope: ${data.providers.toLocaleString()}`,
        `Encounters/year: ${data.annualEncounters.toLocaleString()}`,
        `Current utilization: ${data.utilization ?? 0}%`,
        "Time savings applied: 8 min/encounter (Abridge deployment average)",
        "Conversion to access: 25% of recovered time converts to new encounters",
        "Revenue per new encounter: $150 (adjustable by org)",
        capacityLevel === 2
          ? "Confidence adjustment: 30% reduction applied (estimated data, not confirmed)"
          : capacityLevel === 3
          ? "Confidence adjustment: 50% reduction applied (aspirational target, not current state)"
          : "No confidence adjustment (confirmed deployment data)",
      ],
    });
  }

  if (revenueLevel >= 2) {
    assumptions.push({
      domain: "Revenue",
      level: revenueLevel,
      lines: [
        `Providers in scope: ${data.providers.toLocaleString()}`,
        `Encounters/year: ${data.annualEncounters.toLocaleString()}`,
        revenueLevel === 2
          ? "Method: Benchmark range from Abridge deployments at similar scale ($4K\u2013$12K/provider/year)"
          : "Coding accuracy improvement: 2\u20134% lift in HCC capture rate",
        revenueLevel >= 3 ? "Denial reduction: 0.5\u20131.5% of total claims affected" : "",
        "Note: Revenue figures are directional. Actual impact depends on payer mix and billing workflow.",
      ].filter(Boolean),
    });
  }

  if (workforceLevel >= 2) {
    assumptions.push({
      domain: "Workforce",
      level: workforceLevel,
      lines: [
        `Providers in scope: ${data.providers.toLocaleString()}`,
        "Annual turnover rate: 15%",
        "Replacement cost per provider: $350K",
        workforceLevel >= 3
          ? "Burnout share of turnover: 40% (Medscape 2023 benchmark)"
          : "",
        workforceLevel >= 3
          ? "Documentation burden of burnout: 20% (AMA data)"
          : "",
        workforceLevel >= 3
          ? "Formula: Departures \u00D7 Burnout% \u00D7 DocBurden% \u00D7 Replacement Cost"
          : "Formula: Departures \u00D7 Replacement Cost (full attribution, conservative baseline)",
      ].filter(Boolean),
    });
  }

  if (qualityLevel >= 2) {
    assumptions.push({
      domain: "Quality",
      level: qualityLevel,
      lines: [
        `Providers in scope: ${data.providers.toLocaleString()}`,
        "Readmission reduction: 0.3\u20130.8% of applicable discharges",
        "CMS penalty avoidance basis: HRRP program benchmarks",
        "Note: Quality figures require confirmed outcome tracking data to move from directional to validated.",
      ],
    });
  }

  const unmeasuredDomains = [
    capacityLevel < 2 ? "Capacity" : null,
    revenueLevel < 2 ? "Revenue" : null,
    workforceLevel < 2 ? "Workforce" : null,
    qualityLevel < 2 ? "Quality" : null,
  ].filter(Boolean);

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <Text style={{
        fontSize: 8, color: "#EA2C00", letterSpacing: 2.5,
        textTransform: "uppercase", marginBottom: 6,
      }}>
        Methodology
      </Text>
      <Text style={{
        fontSize: 22, fontWeight: "bold", color: "#1A1A1A",
        marginBottom: 4,
      }}>
        How These Numbers Were Built
      </Text>
      <View style={{ width: 40, height: 2, backgroundColor: "#EA2C00", marginBottom: 16 }} />
      <Text style={{
        fontSize: 10, color: "#555555", lineHeight: 1.6, marginBottom: 24, maxWidth: 460,
      }}>
        {"Every number in this report can be traced to a specific formula, a specific input you provided, and a specific assumption. The assumptions are listed here so that any figure can be challenged, validated, or updated as you collect better data."}
      </Text>

      {assumptions.map((a) => (
        <View key={a.domain} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Text style={{
              fontSize: 9, fontWeight: "bold", color: "#1A1A1A",
              textTransform: "uppercase", letterSpacing: 1.5, marginRight: 8,
            }}>
              {a.domain}
            </Text>
            <Text style={{
              fontSize: 8, color: "#EA2C00", letterSpacing: 1,
              textTransform: "uppercase",
            }}>
              {`Level ${a.level}`}
            </Text>
          </View>
          {a.lines.map((line, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 3, paddingLeft: 8 }}>
              <Text style={{ fontSize: 9, color: "#888888", marginRight: 6 }}>{"\u00B7"}</Text>
              <Text style={{ fontSize: 9, color: "#444444", lineHeight: 1.55, flex: 1 }}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {unmeasuredDomains.length > 0 && (
        <View style={{
          marginTop: 8, backgroundColor: "#F5F0EB", borderRadius: 6,
          padding: 14,
        }}>
          <Text style={{
            fontSize: 8, color: "#888888", letterSpacing: 1.5,
            textTransform: "uppercase", marginBottom: 6,
          }}>
            Unmeasured Domains
          </Text>
          <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6 }}>
            {`${unmeasuredDomains.join(", ")} ${unmeasuredDomains.length === 1 ? "was" : "were"} reported at Level 1 (not yet measured). The benchmark ranges shown for ${unmeasuredDomains.length === 1 ? "this domain" : "these domains"} are derived from Abridge deployment data at comparable organization sizes \u2014 they are ranges, not projections, and are explicitly labeled as such throughout this report.`}
          </Text>
        </View>
      )}

      <PageFooter pageNum={8} orgName={data.organizationName} />
    </Page>
  );
}

function getHighPerformerInsights(data: AmbientAssessmentPDFData): string[] {
  const insights: string[] = [];
  const score = data.documentationScore ?? 0;
  const hasCapacity = (data.domains?.capacity?.activationLevel ?? 1) >= 2;
  const hasRevenue = (data.domains?.revenue?.activationLevel ?? 1) >= 2;
  const hasWorkforce = (data.domains?.workforce?.activationLevel ?? 1) >= 2;
  const hasQuality = (data.domains?.risk?.activationLevel ?? 1) >= 2;
  const unmeasuredCount = [hasCapacity, hasRevenue, hasWorkforce, hasQuality].filter(v => !v).length;

  if (score >= 61) {
    insights.push("They measure across all four domains \u2014 not because every number is perfect, but because visibility changes the conversation.");
  } else if (score >= 39) {
    insights.push("They\u2019ve moved beyond measuring one domain in isolation \u2014 they track how Capacity, Revenue, and Workforce interact.");
  } else {
    insights.push("They picked one domain to measure rigorously and used that data to earn internal support for expanding the analysis.");
  }

  if (unmeasuredCount >= 2) {
    insights.push("They didn\u2019t wait until they had perfect data. They started with the domains they could measure, built the case, then expanded.");
  }

  if (!hasRevenue) {
    insights.push("Revenue impact is often the last domain organizations measure \u2014 and consistently the largest when they do.");
  }

  if (!hasWorkforce) {
    insights.push("Workforce numbers become defensible when you separate documentation burden from total burnout causes \u2014 not when you claim all retention impact.");
  }

  if (data.providers >= 200) {
    insights.push("At your scale, a half-point improvement in documentation efficiency across all providers is a material budget line.");
  }

  if (data.deploymentTenure && (data.deploymentTenure === "12-24" || data.deploymentTenure === "24+")) {
    insights.push("Long-tenure organizations find that ambient adoption stabilizes faster \u2014 providers aren\u2019t unlearning a workflow, they\u2019re replacing a burden.");
  }

  return insights.slice(0, 3);
}

// ============================================================================
// PAGE 8: THE CONVERSATION AHEAD
// ============================================================================

function ConversationAheadPage({ data }: { data: AmbientAssessmentPDFData }) {
  const band = scoreBand(data.documentationScore);
  const tenure = data.deploymentTenure || "";
  const invCopy = computeInvitationCopy(data.documentationScore, band, tenure);

  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };

  const sortedDomains = [...DOMAIN_ORDER].sort((a, b) => {
    const la = domainLevels[a];
    const lb = domainLevels[b];
    if (la !== lb) return la - lb;
    return 0;
  });

  const domainNextActionMap: Record<string, Record<number, string>> = {
    capacity: {
      1: "Engage operations on a decision about converting recovered time into patient access. The question isn\u2019t whether the time exists \u2014 it does. The question is what it\u2019s for.",
      2: "Complete a patient volume measurement that confirms how many additional patients are actually being seen per provider per month.",
      3: "Wire recovered capacity into your annual FTE and growth model as a standing variable.",
    },
    revenue: {
      1: "Schedule a formal conversation with your revenue cycle team. Ask whether they\u2019ve seen changes in coding accuracy, denial rates, or wRVU capture since ambient went live. Most organizations are surprised by what surfaces.",
      2: "Complete a formal before/after analysis that produces a dollar number revenue cycle leadership can stand behind.",
      3: "Tie documentation governance to payer strategy so coding accuracy data informs contract negotiations.",
    },
    workforce: {
      1: "Formalize measurement of in-clinic and after-hours burden reduction \u2014 turning provider feedback into an organizational data point.",
      2: "Model turnover costs with documentation burden as a contributing factor. Connect provider experience data to retention economics.",
      3: "Make provider sustainability a formal variable in your FTE model. Connect retention outcomes to the documentation burden measurement already in place.",
    },
    risk: {
      1: "Begin tracking documentation completeness, specificity, and accuracy at scale \u2014 the foundation CDI, coding, and compliance all depend on.",
      2: "Wire quality data into CDI workflows, coding accuracy, and prior auth so documentation intelligence becomes an active operational input.",
      3: "Position documentation infrastructure for value-based care \u2014 supporting risk adjustment, population health reporting, and payer negotiations.",
    },
  };

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <Text style={s.eyebrow}>THE PATH FORWARD</Text>
      <View style={s.redRule} />

      <View style={[s.darkTile, { marginBottom: 14 }]}>
        <Text style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.4, marginBottom: 10 }}>
          {invCopy.opening}
        </Text>
        <Text style={{ fontSize: 9.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, marginBottom: 8 }}>
          {invCopy.body}
        </Text>
        {invCopy.tenureAppend ? (
          <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, fontStyle: "italic" }}>
            {invCopy.tenureAppend}
          </Text>
        ) : null}
      </View>

      <Text style={[s.eyebrow, { marginBottom: 8 }]}>WHAT THE PATTERN SHOWS</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        {(() => {
          const sorted = [...DOMAIN_ORDER].sort((a, b) => domainLevels[a] - domainLevels[b]);
          const priority = sorted[0];
          const isUnmeasured = domainLevels[priority] === 1;
          const cards = [
            {
              label: isUnmeasured ? "HIGHEST-LEVERAGE MOVE" : "TOP PRIORITY DOMAIN",
              title: domainDisplayName[priority],
              body: isUnmeasured
                ? `${domainDisplayName[priority]} hasn\u2019t been formally analyzed. At your scale, that analysis typically takes 4\u20138 weeks and produces a defensible number. It\u2019s the highest-return investment of measurement time at this stage.`
                : `${domainDisplayName[priority]} has measurement underway but hasn\u2019t been pushed to validated, actionable impact. The infrastructure is in place. The next move is pushing it to Level 3.`,
              accent: true,
            },
            {
              label: "WHAT HIGH PERFORMERS SHARE",
              title: "",
              body: "__DYNAMIC_INSIGHTS__",
              accent: false,
            },
            {
              label: "THE PATTERN AT YOUR SCORE",
              title: band,
              body: band === "Quantifying" || band === "Measuring"
                ? "This is the most common starting point for organizations that reach Level 3+ within 12 months. Not because the gap is small. Because at this stage, the gap is visible and the next move is defined."
                : band === "Acting"
                ? "Some domains are generating confirmed value. The ones that haven\u2019t been measured yet are the highest-return opportunities \u2014 because the infrastructure to measure them already exists."
                : "You\u2019re in the top tier of ambient maturity. The work at this stage is governance \u2014 making sure the measurement capability is institutional, not dependent on champions.",
              accent: false,
            },
          ];
          return cards.map((card, i) => (
            <View key={i} style={[s.beigeBox, { flex: 1, paddingVertical: 12 }]}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: card.accent ? "#EA2C00" : "#1A1A1A", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>
                {card.label}
              </Text>
              {card.title ? (
                <Text style={{ fontSize: 9.5, fontWeight: 700, color: "#1A1A1A", marginBottom: 5, lineHeight: 1.3 }}>{card.title}</Text>
              ) : null}
              {card.body === "__DYNAMIC_INSIGHTS__" ? (
                getHighPerformerInsights(data).map((insight, idx) => (
                  <View key={idx} style={{ flexDirection: "row", marginBottom: 8, alignItems: "flex-start" }}>
                    <View style={{
                      width: 4, height: 4, borderRadius: 2,
                      backgroundColor: "#EA2C00",
                      marginTop: 4, marginRight: 8, flexShrink: 0
                    }} />
                    <Text style={{ fontSize: 10, color: "#333333", lineHeight: 1.6, flex: 1 }}>
                      {insight}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.55 }}>{card.body}</Text>
              )}
            </View>
          ));
        })()}
      </View>

      <Text style={[s.eyebrow, { marginBottom: 8 }]}>YOUR NEXT MOVES</Text>
      {sortedDomains.map((key, idx) => {
        const level = domainLevels[key];
        const isUnmeasured = level === 1;
        const nextAction = level < 4 ? (domainNextActionMap[key]?.[level] || "") : "";
        const gapVal = data.domains?.[key as keyof typeof data.domains]?.gapValue || 0;
        const bench = BENCH[key];
        const benchRange = isUnmeasured && data.providers > 0
          ? `${fmt(bench.low(data.providers))}\u2013${fmt(bench.high(data.providers))} benchmark range`
          : "";

        return (
          <View key={key} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <View style={{
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: isUnmeasured ? "#E5E7EB" : "#EA2C00",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 9, fontWeight: 800, color: isUnmeasured ? "#888888" : "#FFFFFF" }}>
                  {level}
                </Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: 700, color: isUnmeasured ? "#888888" : "#1A1A1A" }}>
                {domainDisplayName[key]}
              </Text>
              {gapVal > 0 && (
                <Text style={{ fontSize: 9.5, fontWeight: 700, color: "#EA2C00" }}>{fmt(gapVal)}</Text>
              )}
              {isUnmeasured && benchRange && (
                <Text style={{ fontSize: 8.5, color: "#AAAAAA", fontStyle: "italic" }}>{benchRange}</Text>
              )}
              {idx === 0 && level < 4 && (
                <View style={{ backgroundColor: isUnmeasured ? "#E5E7EB" : "#EA2C00", borderRadius: 3, paddingVertical: 2, paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 7, fontWeight: 700, color: isUnmeasured ? "#555555" : "#FFFFFF", letterSpacing: 0.8 }}>
                    {isUnmeasured ? "UNMEASURED" : "TOP PRIORITY"}
                  </Text>
                </View>
              )}
            </View>
            {nextAction ? (
              <View style={{ paddingLeft: 26 }}>
                <Text style={{ fontSize: 9.5, color: "#555555", lineHeight: 1.55 }}>{nextAction}</Text>
              </View>
            ) : (
              <View style={{ paddingLeft: 26 }}>
                <Text style={{ fontSize: 9.5, color: "#888888", lineHeight: 1.55 }}>
                  Leading practice achieved. Focus on governance and sustainability.
                </Text>
              </View>
            )}
            {idx < sortedDomains.length - 1 && (
              <View style={{ height: 1, backgroundColor: "#E5E0D9", marginTop: 7 }} />
            )}
          </View>
        );
      })}

      <View style={{ marginTop: "auto" }}>
        <View style={[s.darkTile, { marginBottom: 10, padding: 20 }]}>
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>WHAT THIS ASSESSMENT REPRESENTS</Text>
          <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.9)", lineHeight: 1.75, marginBottom: 12 }}>
            {"Most vendors show you a number. This assessment shows you a measurement architecture \u2014 four domains, four levels of rigor, each with a defined formula and a defined gap between where you are and what full capture looks like. The organizations that reach Level 3+ across multiple domains in 12 months don\u2019t do it because they had a better deployment. They do it because they built a structured measurement program around what the deployment was producing. That program has a methodology. The methodology is what this assessment is built on."}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: 700, color: "#EA2C00", lineHeight: 1.5 }}>
            {"That\u2019s the conversation Abridge is built to have."}
          </Text>
        </View>
        <Text style={s.disclaimer}>
          Confirmed values are derived from your stated inputs using Abridge deployment methodology. Level 1 domain figures are benchmark ranges from health systems of comparable size {"\u2014"} not projections for your organization. Actual results depend on execution, organizational readiness, and market conditions. Assessment date: {data.assessmentDate}.
        </Text>
      </View>

      <PageFooter pageNum={9} orgName={data.organizationName} />
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
  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };
  const archetype = computeArchetype(domainLevels, data.providers);

  return (
    <Document>
      <PDFCoverPage
        reportLabel="Ambient Assessment"
        title="Ambient Maturity Assessment"
        clientName={data.organizationName || "Your Organization"}
        preparedBy={data.preparedBy || "Abridge Partner Success"}
        disclaimerText="This assessment is for strategic planning purposes. All estimates are based on organizational self-assessment and your inputs. Benchmarks reflect aggregated deployment data. Individual results vary."
      />
      <ExecutiveSummaryPage data={data} />
      <StrategicProfilePage data={data} />
      <MaturityPositionPage data={data} />
      <DomainPage domainKey="capacity" data={data} pageNum={4} />
      <DomainPage domainKey="revenue" data={data} pageNum={5} />
      <DomainPage domainKey="workforce" data={data} pageNum={6} />
      <DomainPage domainKey="risk" data={data} pageNum={7} />
      <MethodologyPage data={data} />
      <ConversationAheadPage data={data} />
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

