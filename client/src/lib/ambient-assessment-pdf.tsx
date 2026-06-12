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
import abridgeFont from "../assets/fonts/abridge.otf";

Font.registerHyphenationCallback((word) => [word]);

Font.register({
  family: "Abridge",
  src: abridgeFont,
});

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
  revenuePerVisit?: number;
  conversionFactor?: number;
  deploymentTenure?: string;
  patientExperienceNoticeable?: string;
  patientExperienceSignals?: string;
  patientExperienceFormalized?: string;
  priorityDomain?: string;
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
  gapItems?: string[];
}

// ============================================================================
// CONSTANTS & UTILITIES
// ============================================================================

const TOTAL_PAGES = 10;
const DOMAIN_ORDER = ["capacity", "revenue", "workforce", "risk"];

const fmt = (n: number): string => {
  if (!n || n === 0) return "\u2014";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) {
    const k = Math.round(n / 1000);
    if (k >= 1000) return `$${(n / 1000000).toFixed(1)}M`;
    return `$${k}K`;
  }
  return `$${n.toLocaleString()}`;
};

const domainDisplayName: Record<string, string> = {
  capacity: "Capacity",
  revenue: "Revenue",
  workforce: "Workforce",
  risk: "Quality",
};

function scoreBand(score: number): string {
  if (score <= 16) return "Unmeasured";
  if (score <= 48) return "Emerging";
  if (score <= 76) return "Demonstrated";
  return "Strategic Impact";
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

const PE_SIGNAL_LABELS: Record<string, string> = {
  provider_present: 'Providers more present in the room',
  feel_heard: 'Patients report feeling more heard',
  fewer_interruptions: 'Fewer interruptions during visits',
  better_summaries: 'Better after-visit summaries and care follow-through',
  satisfaction_scores: 'Visit satisfaction or experience scores shifted',
  love_story: 'Providers sharing meaningful patient moments',
};

function computePESignal(noticeable: string, signals: string, formalized: string): string | null {
  if (!noticeable || noticeable === 'not_tracked') return null;
  const signalKeys = signals.split(',').filter(s => s && s !== 'nothing_yet' && PE_SIGNAL_LABELS[s]);
  const signalNames = signalKeys.map(s => PE_SIGNAL_LABELS[s]);
  const hasSignals = signalKeys.length > 0;
  if (noticeable === 'frequently' && hasSignals) {
    const suffix = formalized === 'yes' ? ' Connected to the formal value story.' : '';
    const listed = signalNames.length > 0 ? ` Signals present: ${signalNames.join('; ')}.` : '';
    return `Patients are noticing a difference in the room.${listed}${suffix}`;
  }
  if ((noticeable === 'occasionally' || hasSignals) && noticeable !== 'not_tracked') {
    const listed = signalNames.length > 0 ? ` Observed: ${signalNames.join('; ')}.` : '';
    return `Patient signals are present \u2014 not yet systematically captured.${listed}`;
  }
  return null;
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
        name: "Revenue Confirmed. Broader Value Story Building.",
        headline: "Revenue impact is confirmed. The rest of the value chain is next.",
        body: `The documentation-to-revenue connection is confirmed and on the books. The capacity, workforce, and quality dimensions that inform and amplify that signal ${uVerb} been formally attributed yet.${uStr ? ` ${uStr} ${unmeasured.length === 1 ? "hasn\u2019t" : "haven\u2019t"} been examined yet.` : ""}`,
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

function deriveCTAEmail(preparedBy: string | undefined): string {
  if (!preparedBy) return 'partnersuccess@abridge.com';
  const parts = preparedBy.trim().split(/\s+/);
  if (parts.length < 2) return 'partnersuccess@abridge.com';
  const firstName = parts[0].toLowerCase().replace(/[^a-z]/g, '');
  const lastName = parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, '');
  if (!firstName || !lastName) return 'partnersuccess@abridge.com';
  return `${firstName}.${lastName}@abridge.com`;
}

function deriveCTAFirstName(preparedBy: string | undefined): string {
  if (!preparedBy) return '';
  const first = preparedBy.trim().split(/\s+/)[0] || '';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

// Per-domain, per-level: generates 1–3 sentences using the user's specific inputs.
// Returns null if nothing meaningful to surface.
function buildPersonalizedContext(
  domainKey: string,
  level: number,
  userInputs: Record<string, string>,
  providers: number,
): string | null {
  const parts: string[] = [];

  if (domainKey === 'capacity') {
    const timeSaved = userInputs['Time saved per encounter'];
    const usage = userInputs['Active uses of recovered time'];
    const additionalPatients = userInputs['Additional patients/provider/month'];
    const providersInRedesign = userInputs['Providers in redesign'];
    const accessOutcomes = userInputs['Access outcomes tracked'];
    if (level === 1 && timeSaved) {
      parts.push(`Providers are saving ${timeSaved} per encounter. At ${providers > 0 ? providers.toLocaleString() + ' providers' : 'your scale'}, that\u2019s real recovered time \u2014 none of which has been formally assigned a destination yet.`);
    }
    if (level === 2) {
      if (timeSaved) parts.push(`With ${timeSaved} recovered per encounter, the time exists.`);
      if (usage) parts.push(`Recovered time is being directed toward ${usage.toLowerCase()}.`);
    }
    if (level === 3) {
      if (additionalPatients) parts.push(`You\u2019re confirming ${additionalPatients} additional patients per provider per month from recovered time.`);
      if (providersInRedesign && providers > 0) parts.push(`${providersInRedesign} of ${providers.toLocaleString()} providers have had schedules formally redesigned around the recovered time.`);
    }
    if (level === 4 && accessOutcomes) {
      parts.push(`The organization is tracking ${accessOutcomes.toLowerCase()} as access outcomes attributable to recovered time.`);
    }
  }

  if (domainKey === 'revenue') {
    const rcEngagement = userInputs['Revenue cycle engagement'];
    const emReview = userInputs['E&M distribution review'];
    const observedAreas = userInputs['Areas showing movement'];
    const wrvuEstimate = userInputs['Estimated wRVU improvement'];
    const wrvuDelta = userInputs['Measured wRVU delta'];
    const denialReduction = userInputs['Denial rate reduction'];
    const collectionsDelta = userInputs['Collections delta'];
    const attributedRevenue = userInputs['Attributed annual revenue'];
    const integrations = userInputs['Strategic integrations'];
    if (level === 1) {
      if (rcEngagement === 'Formally engaged') parts.push('Revenue cycle has been formally engaged on documentation quality \u2014 that conversation has started.');
      else if (rcEngagement === 'Conversations started') parts.push('Informal conversations with revenue cycle have started. A formal analysis is the next step.');
      else parts.push('Revenue cycle hasn\u2019t been formally engaged on documentation quality changes yet \u2014 that engagement is the entire Unmeasured-to-Emerging move.');
      if (emReview === 'Pre/post distribution reviewed') parts.push('E&M distribution has been reviewed before and after deployment \u2014 coding complexity shifts are visible.');
    }
    if (level === 2) {
      if (observedAreas) parts.push(`Movement observed in: ${observedAreas.toLowerCase()}.`);
      if (wrvuEstimate) parts.push(`Estimated a ${wrvuEstimate} wRVU improvement per encounter \u2014 directional, not yet confirmed in billing data.`);
    }
    if (level === 3) {
      const confirmed: string[] = [];
      if (wrvuDelta) confirmed.push(`a ${wrvuDelta} wRVU improvement per encounter`);
      if (denialReduction) confirmed.push(`a ${denialReduction} denial rate reduction`);
      if (collectionsDelta) confirmed.push(`${collectionsDelta} improvement in collections`);
      if (confirmed.length > 0) parts.push(`Confirmed: ${confirmed.join(' and ')} \u2014 in billing data.`);
    }
    if (level === 4) {
      if (attributedRevenue) parts.push(`${attributedRevenue} in annual revenue has been formally attributed to documentation quality.`);
      if (integrations) parts.push(`Documentation intelligence is connected to: ${integrations.toLowerCase()}.`);
    }
  }

  if (domainKey === 'workforce') {
    const inClinicSaved = userInputs['In-clinic time saved'];
    const surveyFindings = userInputs['Survey findings'];
    const behaviors = userInputs['Behavioral changes'];
    const afterHours = userInputs['After-hours reduction'];
    const beforeTurnover = userInputs['Turnover rate before deployment'];
    const afterTurnover = userInputs['Turnover rate after deployment'];
    const replacementCost = userInputs['Replacement cost per provider'];
    const strategies = userInputs['Strategic integrations'];
    const outcomes = userInputs['Measured outcomes'];
    if (level === 1) {
      if (inClinicSaved) parts.push(`Providers are saving ${inClinicSaved} per day in-clinic.`);
      if (surveyFindings) parts.push(`Survey data has surfaced: ${surveyFindings.toLowerCase()}.`);
    }
    if (level === 2) {
      if (behaviors) parts.push(`Behavioral changes documented: ${behaviors.toLowerCase()}.`);
      if (afterHours) parts.push(`After-hours documentation work has dropped by ${afterHours} per week.`);
    }
    if (level === 3) {
      if (beforeTurnover && afterTurnover) {
        parts.push(`Turnover moved from ${beforeTurnover} to ${afterTurnover} since deployment.`);
        if (replacementCost) parts.push(`At ${replacementCost} per provider, each percentage point of retention improvement has a confirmed dollar value.`);
      } else if (afterTurnover) {
        parts.push(`Post-deployment turnover: ${afterTurnover}.`);
      }
    }
    if (level === 4) {
      if (strategies) parts.push(`Provider experience data is formally integrated into: ${strategies.toLowerCase()}.`);
      if (outcomes) parts.push(`Confirmed outcomes: ${outcomes.toLowerCase()}.`);
    }
  }

  if (domainKey === 'risk') {
    const qcStatus = userInputs['Quality connection status'];
    const attrs = userInputs['Quality attributes tracked'];
    const workflows = userInputs['Connected workflows'];
    const cdiReduction = userInputs['CDI query reduction'];
    const hccImprovement = userInputs['HCC improvement'];
    const mipsValue = userInputs['MIPS / quality program'];
    const strategicAreas = userInputs['Strategic areas'];
    if (level === 1) {
      if (qcStatus && !qcStatus.includes('Quality improving')) parts.push(`${qcStatus}.`);
      else parts.push('Documentation quality has improved across encounters \u2014 the improvement hasn\u2019t been connected to any downstream program yet.');
    }
    if (level === 2 && attrs) {
      parts.push(`Quality dimensions actively tracked: ${attrs.toLowerCase()}.`);
    }
    if (level === 3) {
      if (workflows) parts.push(`Documentation quality is feeding: ${workflows.toLowerCase()}.`);
      if (cdiReduction) parts.push(`${cdiReduction}.`);
      if (hccImprovement) parts.push(`HCC improvement: ${hccImprovement}.`);
      if (mipsValue) parts.push(`Quality program value: ${mipsValue}.`);
    }
    if (level === 4 && strategicAreas) {
      parts.push(`Structured documentation is informing: ${strategicAreas.toLowerCase()}.`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

// Generates a forensic opening paragraph for the executive summary — specific to this org's situation.
function generateForensicOpening(
  data: AmbientAssessmentPDFData,
  domainLevels: Record<string, number>,
): string {
  const tenure = data.deploymentTenure || '';
  const providers = data.providers || 0;
  const confirmedDomains = DOMAIN_ORDER.filter(d => {
    const dom = data.domains?.[d as keyof typeof data.domains];
    return dom?.hasValue && !(d === 'revenue' && domainLevels[d] === 2);
  });
  const measuredDomainNames = DOMAIN_ORDER.filter(d => domainLevels[d] >= 3);
  const unmeasuredDomains = DOMAIN_ORDER.filter(d => domainLevels[d] === 1);
  const measuredTotal = confirmedDomains.reduce((sum, d) => {
    const dom = data.domains?.[d as keyof typeof data.domains];
    return sum + (dom?.gapValue || 0);
  }, 0);
  const providerStr = providers > 0 ? `${providers.toLocaleString()} providers` : 'your provider group';
  const joinD = (keys: string[]) => {
    const labels = keys.map(d => domainDisplayName[d]);
    if (!labels.length) return '';
    if (labels.length === 1) return labels[0];
    return labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
  };
  if (DOMAIN_ORDER.every(d => domainLevels[d] === 4)) {
    return `Four domains measured, connected, and managed across ${providerStr}. That profile is rare \u2014 and it reflects consistent organizational commitment over time. The work ahead is depth and compounding, not foundation-building.`;
  }
  if (tenure === '24+' && confirmedDomains.length >= 2) {
    const unmStr = unmeasuredDomains.length > 0
      ? ` ${joinD(unmeasuredDomains)} ${unmeasuredDomains.length === 1 ? 'hasn\u2019t' : 'haven\u2019t'} been formally analyzed \u2014 and at this tenure and scale, that\u2019s where the largest remaining gap lives.`
      : '';
    return `More than two years live across ${providerStr}. ${joinD(measuredDomainNames)} ${measuredDomainNames.length === 1 ? 'is' : 'are'} generating confirmed, attributable value${measuredTotal > 0 ? ' \u2014 ' + fmt(measuredTotal) + ' per year from stated inputs' : ''}.${unmStr}`;
  }
  if (tenure === '24+') {
    return `More than two years live across ${providerStr}, and the value story hasn\u2019t been formally told yet. The deployment is running \u2014 what it\u2019s returning in revenue, workforce, and quality terms hasn\u2019t been attributed. At this tenure, that\u2019s not a technology gap. It\u2019s a measurement program gap.`;
  }
  if (tenure === '12-24' && confirmedDomains.length >= 1) {
    const unmStr = unmeasuredDomains.length > 0
      ? ` ${joinD(unmeasuredDomains)} ${unmeasuredDomains.length === 1 ? 'hasn\u2019t' : 'haven\u2019t'} been examined yet \u2014 and the data to do it is likely already in your systems.`
      : '';
    return `One to two years in across ${providerStr}. ${joinD(measuredDomainNames)} ${measuredDomainNames.length === 1 ? 'is' : 'are'} yielding confirmed value${measuredTotal > 0 ? ' \u2014 ' + fmt(measuredTotal) + ' annually' : ''}.${unmStr}`;
  }
  if (tenure === '12-24') {
    return `One to two years in across ${providerStr}, and the measurement program is still forming. Value is generating across all four domains \u2014 none has been formally attributed. This is the stage where measurement habits either get built or don\u2019t. Organizations that build them now don\u2019t have to reconstruct them at year three.`;
  }
  if (tenure === '6-12' && confirmedDomains.length >= 1) {
    const unmStr = unmeasuredDomains.length > 0 ? ` ${joinD(unmeasuredDomains)} ${unmeasuredDomains.length === 1 ? 'hasn\u2019t' : 'haven\u2019t'} been looked at yet.` : '';
    return `About a year in across ${providerStr}. Measurement is underway${measuredTotal > 0 ? ' \u2014 ' + fmt(measuredTotal) + ' confirmed annually' : ''}.${unmStr} The 12-month window is when baseline data is most accessible \u2014 organizations that formalize measurement now don\u2019t have to reconstruct it later.`;
  }
  if (tenure === '6-12') {
    return `About a year in across ${providerStr}. The deployment is stabilizing and value is starting to generate. The measurement infrastructure is in its earliest stages \u2014 the expected position at this stage, and also the moment when measurement habits are cheapest to build.`;
  }
  if (tenure === '0-6') {
    return `Less than six months in across ${providerStr}. Early stage \u2014 adoption is still building and the measurement baseline hasn\u2019t been established yet. The organizations furthest ahead at 24 months started asking measurement questions before month six.`;
  }
  if (confirmedDomains.length >= 2) {
    return `${joinD(measuredDomainNames)} ${measuredDomainNames.length === 1 ? 'is' : 'are'} generating confirmed, attributable value${measuredTotal > 0 ? ' \u2014 ' + fmt(measuredTotal) + ' per year' : ''}. ${unmeasuredDomains.length > 0 ? joinD(unmeasuredDomains) + (unmeasuredDomains.length === 1 ? ' hasn\u2019t' : ' haven\u2019t') + ' been formally examined yet.' : ''}`;
  }
  return `The ambient deployment is running across ${providerStr}. The value it\u2019s generating across all four dimensions hasn\u2019t been formally attributed yet \u2014 that\u2019s where this assessment starts.`;
}

// Generates the opening paragraph for the What Comes Next page — specific to this org.
function generateWhatComesNextOpening(
  data: AmbientAssessmentPDFData,
  domainLevels: Record<string, number>,
): string {
  const confirmedDomains = DOMAIN_ORDER.filter(d => {
    const dom = data.domains?.[d as keyof typeof data.domains];
    return dom?.hasValue && !(d === 'revenue' && domainLevels[d] === 2);
  });
  const unmeasuredDomains = DOMAIN_ORDER.filter(d => domainLevels[d] === 1);
  const measuredTotal = confirmedDomains.reduce((sum, d) => {
    const dom = data.domains?.[d as keyof typeof data.domains];
    return sum + (dom?.gapValue || 0);
  }, 0);
  const tenure = data.deploymentTenure || '';
  const joinNames = (keys: string[]) => {
    const labels = keys.map(d => domainDisplayName[d]);
    if (!labels.length) return '';
    if (labels.length === 1) return labels[0];
    return labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
  };
  const confirmedNames = confirmedDomains.map(d => domainDisplayName[d]);
  const unmeasuredNames = unmeasuredDomains.map(d => domainDisplayName[d]);
  if (confirmedDomains.length >= 3) {
    return `${joinNames(confirmedNames)} are generating confirmed, attributable value${measuredTotal > 0 ? ' \u2014 ' + fmt(measuredTotal) + ' per year from stated inputs' : ''}. The measurement infrastructure is real. The work ahead is integration depth: making sure the confirmed data is reaching the decisions it should be informing${unmeasuredDomains.length > 0 ? ', and closing the gap in ' + joinNames(unmeasuredNames) : ''}.`;
  }
  if (confirmedDomains.length === 2) {
    return `Two domains are confirmed${measuredTotal > 0 ? ' \u2014 ' + fmt(measuredTotal) + ' per year' : ''}. ${joinNames(unmeasuredNames)} ${unmeasuredDomains.length === 1 ? 'represents' : 'represent'} the measurement gap. Based on this profile, the highest-return next move is the domain closest to confirmation \u2014 and the data to get there is likely already in your systems.`;
  }
  if (confirmedDomains.length === 1) {
    return `One domain is confirmed${measuredTotal > 0 ? ' \u2014 ' + fmt(measuredTotal) + ' per year' : ''}. Three are generating returns that haven\u2019t been formally attributed. Organizations that confirm a second domain within 90 days of the first tend to move faster \u2014 because the organizational habit transfers.`;
  }
  if (tenure === '24+' || tenure === '12-24') {
    return `No domain has been formally confirmed yet. The value is generating across all four dimensions \u2014 that\u2019s not in question at this tenure and scale. The question is whether there\u2019s a structured program to count it. Revenue and Workforce are typically the fastest paths, because the data exists in systems you already run.`;
  }
  return `The measurement program is in its earliest stages. The question isn\u2019t whether the value is there \u2014 it\u2019s which domain to confirm first, and what the fastest path to a defensible number looks like.`;
}

// Per-domain, per-level diagnostic questions — phrased as consultant interrogation, not checklists.
const DOMAIN_DIAGNOSTIC_QUESTIONS: Record<string, Record<number, string>> = {
  capacity: {
    1: "Has anyone formally compared scheduling data before and after documentation time recovery \u2014 not survey feedback, but actual patient volume per provider? That comparison is what turns recovered time into a confirmed access number. Organizations that make it within 90 days tend to find it changes the operational conversation.",
    2: "Recovered time is being directed somewhere. What\u2019s the confirmed change in patient volume per provider per month \u2014 in the scheduling system, not estimated? That number is the only gap between an emerging commitment and a demonstrated result.",
    3: "Is capacity recovery a formal variable in your next FTE model or care model design? Moving from Demonstrated to Strategic Impact is a governance decision: when does recovered capacity start informing hiring plans rather than just metrics reports?",
    4: "",
  },
  revenue: {
    1: "When did your revenue cycle team last formally review coding distribution before and after documentation quality changed? Most haven\u2019t been asked. The organizations that ask \u2014 even informally \u2014 find a signal worth formalizing within the first review cycle.",
    2: "You have directional signals. A single formal before/after analysis \u2014 4 to 6 weeks, with revenue cycle and clinical leadership aligned \u2014 converts a signal into a number leadership can act on. What\u2019s the barrier to scheduling that analysis?",
    3: "Is your confirmed revenue impact data in the hands of the people negotiating your payer contracts? Moving from Demonstrated to Strategic Impact is a governance decision: who owns the connection between documentation quality and payer strategy?",
    4: "",
  },
  workforce: {
    1: "At your current provider turnover rate, what\u2019s the estimated annual replacement cost \u2014 and has anyone run that against your ambient adoption data? Organizations that do this calculation find it changes how they describe the deployment to their board. It stops being a documentation story and becomes a labor cost management story.",
    2: "Behavioral changes are visible. The move to Demonstrated is a single HR data pull: ambient adopters versus non-adopters on 12-month turnover, with a dollar figure attached. That comparison is typically the most credible number in any ambient ROI presentation.",
    3: "Is provider sustainability a formal variable in your FTE model? If not, the workforce economics you\u2019ve measured are informing a presentation rather than a hiring decision. Strategic Impact is when they inform the plan.",
    4: "",
  },
  risk: {
    1: "Which downstream team \u2014 CDI, coding, quality reporting, compliance \u2014 has formally seen the documentation quality improvement from your deployment? The value compounds when the teams built to use better documentation are actually receiving it. Making that connection is a meeting, not a technology project.",
    2: "You\u2019re tracking quality attributes. Which program is structurally positioned to act on that data? Tracking without a downstream consumer is measuring without consequence. The Emerging-to-Demonstrated move is building one formal bridge \u2014 CDI, denials, or quality measures \u2014 and letting the breadth follow the first confirmed connection.",
    3: "Is documentation quality on the agenda at your next value-based care planning session? The organizations that treat it as a governance input \u2014 not a departmental metric \u2014 are the ones that reach Strategic Impact. That repositioning is a leadership decision, not a data problem.",
    4: "",
  },
};

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
  whitePage: { backgroundColor: "#FFFFFF", padding: 48, fontFamily: "Manrope", fontSize: 10 },
  beigePageBg: { backgroundColor: "#F5F0EB", padding: 48, fontFamily: "Manrope", fontSize: 10 },
  darkPage: { backgroundColor: "#1A1A1A", padding: 48, fontFamily: "Manrope", fontSize: 10 },
  eyebrow: { fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  eyebrowDark: { fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.58)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  eyebrowGray: { fontSize: 8, fontWeight: 700, color: "#888888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  headline: { fontSize: 26, fontWeight: 800, color: "#1A1A1A", lineHeight: 1.15, textTransform: "uppercase", marginBottom: 14 },
  headlineDark: { fontSize: 28, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.15, marginBottom: 12 },
  subhead: { fontSize: 13, fontWeight: 700, color: "#1A1A1A", marginBottom: 6 },
  body: { fontSize: 11, fontWeight: 400, color: "#555555", lineHeight: 1.65, marginBottom: 10 },
  bodyDark: { fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.65)", lineHeight: 1.65 },
  bodyMuted: { fontSize: 10.5, fontWeight: 400, color: "#888888", lineHeight: 1.6 },
  italic: { fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,0.62)", lineHeight: 1.6, fontStyle: "italic" },
  disclaimer: { fontSize: 8, color: "#999999", lineHeight: 1.5 },
  bigNum: { fontSize: 48, fontWeight: 800, color: "#EA2C00", lineHeight: 1 },
  bigNumDark: { fontSize: 40, fontWeight: 800, color: "#FFFFFF", lineHeight: 1 },
  bigNumGray: { fontSize: 32, fontWeight: 800, color: "rgba(255,255,255,0.55)", lineHeight: 1 },
  medNum: { fontSize: 22, fontWeight: 800, color: "#EA2C00", lineHeight: 1 },
  redRule: { height: 3, backgroundColor: "#EA2C00", width: 48, marginBottom: 14 },
  divider: { height: 1, backgroundColor: "#E5E0D9", marginVertical: 18 },
  darkDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 12 },
  redAccentBar: { width: 3, backgroundColor: "#EA2C00", marginRight: 14, borderRadius: 2 },
  tile: { backgroundColor: "#FFFFFF", borderRadius: 4, padding: 16, borderWidth: 1, borderColor: "#E5E0D9" },
  beigeBox: { backgroundColor: "#F5F0EB", borderRadius: 4, padding: 16 },
  darkTile: { backgroundColor: "#1A1A1A", borderRadius: 4, padding: 18 },
  darkCard: { backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 4, padding: 14, marginBottom: 8 },
  orangeTile: { backgroundColor: "#EA2C00", borderRadius: 4, padding: 16 },
  unmeasuredBadge: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3,
    paddingVertical: 3, paddingHorizontal: 8, alignSelf: "flex-start",
  },
  levelBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#EA2C00", alignItems: "center", justifyContent: "center" },
  levelBadgeDark: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  footerWrapper: {
    marginTop: "auto", flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E5E0D9",
  },
  footerWrapperDark: {
    marginTop: "auto", flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)",
  },
  beigeSidebar: { backgroundColor: "#F5F0EB", borderRadius: 4, padding: 20, flex: 0.9 },
  sidebarLabel: { fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 6 },
  sidebarValue: { fontSize: 44, fontWeight: 800, color: "#EA2C00", lineHeight: 1, marginBottom: 4 },
  sidebarDivider: { height: 1, backgroundColor: "#E5E0D9", marginVertical: 12 },
  gapItem: { flexDirection: "row" as const, gap: 6, marginBottom: 5 },
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
// PAGE 2: ASSESSMENT PAGE
// ============================================================================

function AssessmentPage({ data, archetype }: {
  data: AmbientAssessmentPDFData;
  archetype: { name: string; headline: string; body: string };
}) {
  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };
  const band = scoreBand(data.documentationScore);
  const peText = computePESignal(
    data.patientExperienceNoticeable || '',
    data.patientExperienceSignals || '',
    data.patientExperienceFormalized || '',
  );
  const tenureShort = data.deploymentTenure === "0-6" ? "<6 mo"
    : data.deploymentTenure === "6-12" ? "6\u201312 mo"
    : data.deploymentTenure === "12-24" ? "1\u20132 yrs"
    : data.deploymentTenure === "24+" ? "2+ yrs" : "";

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={{ flexDirection: "row", gap: 22, flex: 1 }}>

        {/* LEFT COLUMN */}
        <View style={{ flex: 1.55 }}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: "#888888", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>
            The Assessment
          </Text>

          <Text style={{ fontFamily: "Abridge", fontSize: 28, color: "#1A1A1A", lineHeight: 1.08, textTransform: "uppercase", marginBottom: 10, maxWidth: 380 }}>
            {archetype.headline}
          </Text>

          <View style={s.redRule} />

          <Text style={{ fontSize: 10.5, color: "#555555", lineHeight: 1.72, marginBottom: 14 }}>
            {generateForensicOpening(data, domainLevels)}
          </Text>

          {/* Profile badge */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <View style={{ width: 2, height: 26, backgroundColor: "#EA2C00", borderRadius: 1 }} />
            <View>
              <Text style={{ fontSize: 7, fontWeight: 700, color: "#AAAAAA", letterSpacing: 2, textTransform: "uppercase" }}>Profile</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#555555" }}>{archetype.name}</Text>
            </View>
          </View>

          {/* PE signal */}
          {peText && (
            <View style={{ backgroundColor: "#FFF5F2", borderRadius: 4, padding: 12, borderLeftWidth: 2, borderLeftColor: "#EA2C00", marginBottom: 14 }}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Patient Experience Signal</Text>
              <Text style={{ fontSize: 9.5, color: "#555555", lineHeight: 1.6 }}>{peText}</Text>
            </View>
          )}

          {/* Bridge sentence */}
          <Text style={{ fontSize: 8.5, color: "#AAAAAA", lineHeight: 1.55, fontStyle: "italic", marginTop: "auto" }}>
            {"The domain pages that follow show what each measurement step looks like and what organizations at this stage typically find."}
          </Text>
        </View>

        {/* RIGHT COLUMN */}
        <View style={{ flex: 0.9 }}>
          <View style={{ backgroundColor: "#F5F0EB", borderRadius: 6, padding: 18 }}>

            {/* Score */}
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Maturity Score</Text>
            <Text style={{ fontSize: 44, fontWeight: 800, color: "#EA2C00", lineHeight: 1 }}>{data.documentationScore}</Text>
            <Text style={{ fontSize: 10, color: "#888888", marginTop: 2, marginBottom: 8 }}>{band}</Text>
            <View style={{ height: 5, backgroundColor: "#E5E0D9", borderRadius: 3, marginBottom: 10 }}>
              <View style={{ height: 5, backgroundColor: "#EA2C00", borderRadius: 3, width: `${data.documentationScore}%` }} />
            </View>

            {/* Stats */}
            <View style={{ flexDirection: "row", gap: 14, marginBottom: 14 }}>
              {data.providers > 0 && (
                <View>
                  <Text style={{ fontSize: 7, fontWeight: 700, color: "#AAAAAA", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>Providers</Text>
                  <Text style={{ fontSize: 14, fontWeight: 800, color: "#1A1A1A" }}>{data.providers.toLocaleString()}</Text>
                </View>
              )}
              {tenureShort && (
                <View>
                  <Text style={{ fontSize: 7, fontWeight: 700, color: "#AAAAAA", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>Tenure</Text>
                  <Text style={{ fontSize: 14, fontWeight: 800, color: "#1A1A1A" }}>{tenureShort}</Text>
                </View>
              )}
            </View>

            <View style={{ height: 1, backgroundColor: "#E5E0D9", marginBottom: 12 }} />

            {/* Domain matrix */}
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Domain Status</Text>
            {DOMAIN_ORDER.map((key) => {
              const level = domainLevels[key];
              const label = data.domains?.[key as keyof typeof data.domains]?.activationLabel || "";
              const isL1 = level === 1;
              return (
                <View key={key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <View style={{
                      width: 20, height: 20, borderRadius: 10,
                      backgroundColor: isL1 ? "#E5E7EB" : "#EA2C00",
                      alignItems: "center", justifyContent: "center"
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: 800, color: isL1 ? "#888888" : "#FFFFFF" }}>{level}</Text>
                    </View>
                    <Text style={{ fontSize: 9, fontWeight: 700, color: isL1 ? "#AAAAAA" : "#1A1A1A" }}>
                      {domainDisplayName[key]}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 8, color: "#AAAAAA", maxWidth: 80, textAlign: "right" }}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>

      </View>

      <PageFooter pageNum={2} orgName={data.organizationName} />
    </Page>
  );
}

// ============================================================================
// PAGE 4: CONFIRMED AND NOT YET EXAMINED
// ============================================================================

function ConfirmedAndUnexaminedPage({ data }: { data: AmbientAssessmentPDFData }) {
  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };

  const confirmedDomains = DOMAIN_ORDER.filter(d => {
    const dom = data.domains?.[d as keyof typeof data.domains];
    return dom?.hasValue && !(d === 'revenue' && domainLevels[d] === 2);
  });

  const measuredTotal = confirmedDomains.reduce((sum, d) => {
    const dom = data.domains?.[d as keyof typeof data.domains];
    return sum + (dom?.gapValue || 0);
  }, 0);

  const unexaminedDomains = DOMAIN_ORDER.filter(d => domainLevels[d] === 1);
  const providers = data.providers || 0;

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={s.redRule} />
      <Text style={s.eyebrow}>Confirmed and Not Yet Examined</Text>

      {/* Dynamic headline */}
      <Text style={{ fontFamily: "Abridge", fontSize: 24, color: "#1A1A1A", textTransform: "uppercase", lineHeight: 1.1, marginBottom: 8, maxWidth: 500 }}>
        {measuredTotal > 0
          ? `${fmt(measuredTotal)} confirmed annually.`
          : "Four domains generating value. None formally measured yet."}
      </Text>

      {/* Framing sentence */}
      <Text style={{ fontSize: 9.5, color: "#888888", lineHeight: 1.65, marginBottom: 20, maxWidth: 500 }}>
        {measuredTotal > 0
          ? "The figures below are from stated inputs \u2014 not projections. Domains not yet formally measured are listed separately with industry benchmark ranges from published sources."
          : "The deployment is live. The value it\u2019s generating across all four dimensions hasn\u2019t been formally attributed yet. The domain pages that follow show what each measurement step looks like."}
      </Text>

      <View style={{ flexDirection: "row", gap: 16, flex: 1 }}>

        {/* Zone 1: Confirmed */}
        {confirmedDomains.length > 0 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#EA2C00", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
              Confirmed
            </Text>
            {confirmedDomains.map(d => {
              const dom = data.domains?.[d as keyof typeof data.domains]!;
              return (
                <View key={d} style={{ backgroundColor: "#1A1A1A", borderRadius: 6, padding: 16, marginBottom: 8 }}>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
                    {domainDisplayName[d]}
                  </Text>
                  <Text style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>{dom.activationLabel}</Text>
                  <Text style={{ fontSize: 30, fontWeight: 800, color: "#EA2C00", lineHeight: 1, marginBottom: 3 }}>
                    {fmt(dom.gapValue || 0)}
                  </Text>
                  <Text style={{ fontSize: 7.5, color: "rgba(255,255,255,0.45)" }}>per year \u00B7 from stated inputs</Text>
                </View>
              );
            })}
            {measuredTotal > 0 && confirmedDomains.length > 1 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E5E0D9" }}>
                <Text style={{ fontSize: 8.5, fontWeight: 700, color: "#888888" }}>Total confirmed annually</Text>
                <Text style={{ fontSize: 8.5, fontWeight: 800, color: "#EA2C00" }}>{fmt(measuredTotal)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Zone 2: Not Yet Examined */}
        {unexaminedDomains.length > 0 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
              Not Yet Examined \u00B7 Industry Benchmark Ranges
            </Text>
            {unexaminedDomains.map(d => {
              const bench = BENCH[d];
              return (
                <View key={d} style={{ borderWidth: 1, borderColor: "#E5E0D9", borderRadius: 6, padding: 14, marginBottom: 8 }}>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: "#AAAAAA", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                    {domainDisplayName[d]}
                  </Text>
                  {providers > 0 ? (
                    <>
                      <Text style={{ fontSize: 18, fontWeight: 800, color: "#888888", lineHeight: 1, marginBottom: 3 }}>
                        {`${fmt(bench.low(providers))}\u2013${fmt(bench.high(providers))}/yr`}
                      </Text>
                      <Text style={{ fontSize: 8, color: "#AAAAAA", lineHeight: 1.5, marginBottom: 4 }}>{bench.desc}</Text>
                      <Text style={{ fontSize: 7, color: "#CCCCCC", fontStyle: "italic", lineHeight: 1.4 }}>{bench.source}</Text>
                    </>
                  ) : (
                    <Text style={{ fontSize: 8.5, color: "#AAAAAA", fontStyle: "italic" }}>Not yet formally measured.</Text>
                  )}
                </View>
              );
            })}
            <Text style={{ fontSize: 7.5, color: "#BBBBBB", lineHeight: 1.55, fontStyle: "italic", marginTop: 6 }}>
              {"Benchmark ranges reflect what organizations of comparable size typically find when they measure this domain. These are published ranges, not projections for this organization."}
            </Text>
          </View>
        )}

        {/* All L1 — no confirmed, no providers */}
        {confirmedDomains.length === 0 && unexaminedDomains.length === 0 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9.5, color: "#888888", lineHeight: 1.65 }}>
              {"No domains have been formally measured yet. The domain pages that follow show what each measurement step looks like."}
            </Text>
          </View>
        )}

      </View>

      {/* Bridge sentence */}
      <Text style={{ fontSize: 8.5, color: "#AAAAAA", lineHeight: 1.55, fontStyle: "italic", marginTop: 14 }}>
        {"Each domain page that follows shows the detail behind these numbers and the specific questions that drive the next measurement step."}
      </Text>

      <PageFooter pageNum={4} orgName={data.organizationName} />
    </Page>
  );
}

// ============================================================================
// FRAMEWORK PAGE
// ============================================================================

function FrameworkPage({ data }: { data: AmbientAssessmentPDFData }) {
  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };

  const DOMAIN_CARDS = [
    { key: 'capacity', question: 'Did recovered time reach patients?', desc: 'Measures whether documentation time savings translated into additional patient access \u2014 or disappeared into the schedule.' },
    { key: 'revenue', question: 'Did documentation quality reach revenue cycle?', desc: 'Measures whether improved notes changed coding accuracy, denial rates, or wRVU capture in your billing data.' },
    { key: 'workforce', question: 'Did provider relief reach the workforce economics?', desc: 'Measures whether reduced documentation burden translated into retention improvement and measurable labor cost impact.' },
    { key: 'risk', question: 'Did documentation quality reach downstream programs?', desc: 'Measures whether improved notes are feeding CDI, quality reporting, compliance, and value-based care \u2014 or stopping at the chart.' },
  ];

  const LEVELS = [
    { label: 'L1', name: 'Unmeasured', desc: 'Value generating. Not yet attributed. Returns are real \u2014 no one has formally counted them yet.' },
    { label: 'L2', name: 'Emerging', desc: 'Signal visible. Not yet defensible. Early data suggests impact. No confirmed number exists yet.' },
    { label: 'L3', name: 'Demonstrated', desc: 'Measured, repeatable, defensible. A confirmed number derived from real data, defensible to a skeptic.' },
    { label: 'L4', name: 'Strategic Impact', desc: 'The organization does things it couldn\u2019t before. This dimension is a strategic variable, not a metric.' },
  ];

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={s.redRule} />
      <Text style={s.eyebrow}>The Ambient Value Domains</Text>
      <Text style={{ fontFamily: "Abridge", fontSize: 22, color: "#1A1A1A", textTransform: "uppercase", lineHeight: 1.1, marginBottom: 8, maxWidth: 440 }}>
        Four dimensions of ambient return.
      </Text>
      <Text style={{ fontSize: 10, color: "#555555", lineHeight: 1.7, marginBottom: 18, maxWidth: 500 }}>
        {"Ambient AI creates value across four organizational dimensions simultaneously \u2014 and almost every deployment captures some while leaving others unmeasured. The gap between what\u2019s generating returns and what\u2019s been formally counted is where most of the strategic conversation lives."}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        {DOMAIN_CARDS.map((d) => {
          const level = domainLevels[d.key];
          const isActive = level >= 2;
          return (
            <View key={d.key} style={{ width: "48%", borderWidth: 1, borderColor: isActive ? "#EA2C00" : "#E5E0D9", borderRadius: 6, padding: 14, backgroundColor: isActive ? "#FFF8F6" : "#FFFFFF" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ fontSize: 9, fontWeight: 700, color: isActive ? "#EA2C00" : "#AAAAAA", letterSpacing: 1.5, textTransform: "uppercase" }}>
                  {domainDisplayName[d.key]}
                </Text>
                <View style={{ backgroundColor: isActive ? "#EA2C00" : "#E5E7EB", borderRadius: 3, paddingVertical: 2, paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 7, fontWeight: 700, color: isActive ? "#FFFFFF" : "#999999", letterSpacing: 0.5 }}>{`L${level}`}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.4, marginBottom: 5, fontStyle: "italic" }}>
                {d.question}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#888888", lineHeight: 1.55 }}>
                {d.desc}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={{ backgroundColor: "#1A1A1A", borderRadius: 6, padding: 16, marginBottom: 10 }}>
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: "rgba(255,255,255,0.60)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
          The Four Levels of Maturity \u00B7 Applied to Each Domain
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {LEVELS.map((l, i) => (
            <View key={l.label} style={{ flex: 1, paddingRight: i < 3 ? 10 : 0, borderRightWidth: i < 3 ? 1 : 0, borderRightColor: "rgba(255,255,255,0.15)" }}>
              <Text style={{ fontSize: 16, fontWeight: 800, color: "#EA2C00", lineHeight: 1, marginBottom: 3 }}>{l.label}</Text>
              <Text style={{ fontSize: 9, fontWeight: 700, color: "#FFFFFF", marginBottom: 5 }}>{l.name}</Text>
              <Text style={{ fontSize: 7.5, color: "rgba(255,255,255,0.70)", lineHeight: 1.55 }}>{l.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={{ fontSize: 8, color: "#AAAAAA", lineHeight: 1.5, fontStyle: "italic" }}>
        {"These levels don\u2019t measure how well the technology works. They measure how far the organization has taken the value."}
      </Text>

      <Text style={{ fontSize: 8.5, color: "#AAAAAA", lineHeight: 1.55, fontStyle: "italic", marginTop: 10 }}>
        {"The financial picture that emerges from these four domain readings is on the following page."}
      </Text>

      <PageFooter pageNum={3} orgName={data.organizationName} />
    </Page>
  );
}

// ============================================================================
// PAGES 6–9: DOMAIN PAGES
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
    1: "Documentation quality is improving. Whether that improvement is changing coding accuracy, denial rates, or wRVU capture is still an open question. The revenue cycle team hasn\u2019t been asked yet.",
    2: "Your organization has observed directional signals \u2014 trends in coding, denials, or collections suggesting documentation is affecting reimbursement. The formal validation is in progress.",
    3: "A confirmed before/after number exists. The revenue cycle team is part of the ambient conversation. Documentation quality is a managed revenue lever, not incidental, but engineered.",
    4: "Documentation intelligence drives revenue cycle strategy, payer positioning, and financial planning. Documentation quality is a standing organizational metric.",
  },
  workforce: {
    1: "Documentation burden is showing signs of lifting. That relief has measurable value \u2014 but it hasn\u2019t been quantified or connected to retention or labor costs yet.",
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
    low: "The organizations moving fastest from Unmeasured to Demonstrated share one thing: they scheduled the operational conversation \u2014 with a recommendation in hand \u2014 before they thought they were ready. The number doesn\u2019t need to be perfect. It needs to be in the room.",
    high: "Connecting recovered time to access revenue is one thing. Connecting it to a hiring model is another. Strategic Impact is where ambient stops being a documentation decision and starts being a workforce strategy.",
  },
  revenue: {
    low: "The revenue cycle team almost always finds something when they look. The barrier isn\u2019t data \u2014 it\u2019s the first conversation. Organizations that formalize that conversation within 90 days of deployment typically have a number before their first contract renewal.",
    high: "A measured revenue impact is a different kind of asset than a projection. It changes the conversation with payers, with leadership, and with the board. The question at this level is: who owns maintaining it?",
  },
  workforce: {
    low: "Provider experience is the most politically powerful data in a health system \u2014 and it\u2019s consistently under-quantified. Organizations that formalize this measurement tend to use it in ways they didn\u2019t initially plan: recruitment, contracts, board presentations.",
    high: "The transition from Demonstrated to Strategic Impact is a governance decision, not a measurement decision. It\u2019s asking: is provider sustainability a formal variable in our FTE model?",
  },
  risk: {
    low: "The downstream value of better documentation compounds \u2014 but only when someone connects the improvement to the teams that depend on it. CDI, coding, quality reporting, and compliance teams need to see the change. That connection, formally structured, is the Unmeasured to Emerging move.",
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
    context: "Most organizations find they have recovered time but haven\u2019t made the operational decision about where it goes. That decision is the Emerging move.",
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
          </View>

          <View style={[s.divider, { marginVertical: 10 }]} />

          <Text style={{ fontSize: 9.5, color: "#777777", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10, borderLeftWidth: 2, borderLeftColor: "#E5E0D9", paddingLeft: 10 }}>
            {domainStrategicQuestion[domainKey]}
          </Text>

          <Text style={s.body}>{domainFrameText[domainKey]}</Text>

          <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>
            {isUnmeasured ? "THE UNMEASURED SIGNAL" : "WHERE IT STANDS"}
          </Text>
          <Text style={s.body}>
            {domain.context || domainAtThisLevel[domainKey]?.[level] || ""}
          </Text>

          {(() => {
            const personalized = buildPersonalizedContext(domainKey, level, userInputs, providers);
            return personalized ? (
              <View style={{ backgroundColor: "#F8F7F5", borderRadius: 4, padding: 10, borderLeftWidth: 2, borderLeftColor: "#EA2C00", marginBottom: 10, marginTop: -4 }}>
                <Text style={{ fontSize: 9.5, color: "#1A1A1A", lineHeight: 1.65 }}>{personalized}</Text>
              </View>
            ) : null;
          })()}

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
              <Text style={s.eyebrowGray}>WHAT ORGANIZATIONS YOUR SIZE TYPICALLY FIND</Text>
              <Text style={{ fontSize: 9, color: "#888888", lineHeight: 1.6, marginBottom: 4 }}>
                {bench.desc}
              </Text>
              <Text style={{ fontSize: 8, color: "#AAAAAA", lineHeight: 1.5 }}>
                {`Reference range: ${fmt(benchLow)}\u2013${fmt(benchHigh)} per year. This is not a projection for your organization — it reflects what comparable organizations have documented.`}
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

        <View style={[s.beigeSidebar, { flex: 0.9, padding: 20 }]}>

          {!isUnmeasured && hasValue && value > 0 ? (
            <>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                Demonstrated Impact
              </Text>
              <Text style={{ fontSize: 44, fontWeight: 800, color: "#EA2C00", lineHeight: 1, marginBottom: 4 }}>
                {fmt(value)}
              </Text>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#AAAAAA", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
                Per Year {"·"} Confirmed
              </Text>
            </>
          ) : isUnmeasured && benchLow > 0 ? (
            <>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                Not Yet Measured
              </Text>
              <Text style={{ fontSize: 9, color: "#888888", lineHeight: 1.5, marginBottom: 4 }}>
                This domain has not been formally measured yet.
              </Text>
              <Text style={{ fontSize: 8, color: "#AAAAAA", marginBottom: 14 }}>
                {`Reference range: ${fmt(benchLow)}\u2013${fmt(benchHigh)}/yr`}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                Impact
              </Text>
              <Text style={{ fontSize: 14, fontWeight: 600, color: "#BBBBBB", marginBottom: 14 }}>
                Not yet calculated
              </Text>
            </>
          )}

          {userInputEntries.length > 0 && (
            <>
              <View style={s.sidebarDivider} />
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
                WHAT'S BEEN ESTABLISHED
              </Text>
              {userInputEntries.map(([key, val], i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                  <Text style={{ fontSize: 8.5, color: "#888888", flex: 1 }}>{key}</Text>
                  <Text style={{ fontSize: 8.5, fontWeight: 600, color: "#1A1A1A", textAlign: "right", maxWidth: "50%" }}>{val}</Text>
                </View>
              ))}
            </>
          )}

          {domain.gapItems && domain.gapItems.length > 0 && (
            <>
              <View style={s.sidebarDivider} />
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
                STILL UNCAPTURED AT THIS LEVEL
              </Text>
              {domain.gapItems.map((gap, i) => (
                <View key={i} style={s.gapItem}>
                  <Text style={{ fontSize: 9, color: "#EA2C00", fontWeight: 700, marginTop: 1 }}>–</Text>
                  <Text style={{ fontSize: 8.5, color: "#555555", lineHeight: 1.5, flex: 1 }}>{gap}</Text>
                </View>
              ))}
            </>
          )}

          {domainKey === 'revenue' && data.orgContext && (
            data.orgContext.payerMixMedicare || data.orgContext.payerMixMedicaid || data.orgContext.payerMixCommercial
          ) ? (
            <>
              <View style={s.sidebarDivider} />
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
                PAYER MIX
              </Text>
              {data.orgContext.payerMixMedicare ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 8.5, color: "#888888" }}>Medicare</Text>
                  <Text style={{ fontSize: 8.5, fontWeight: 600, color: "#1A1A1A" }}>{data.orgContext.payerMixMedicare}%</Text>
                </View>
              ) : null}
              {data.orgContext.payerMixMedicaid ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 8.5, color: "#888888" }}>Medicaid</Text>
                  <Text style={{ fontSize: 8.5, fontWeight: 600, color: "#1A1A1A" }}>{data.orgContext.payerMixMedicaid}%</Text>
                </View>
              ) : null}
              {data.orgContext.payerMixCommercial ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 8.5, color: "#888888" }}>Commercial</Text>
                  <Text style={{ fontSize: 8.5, fontWeight: 600, color: "#1A1A1A" }}>{data.orgContext.payerMixCommercial}%</Text>
                </View>
              ) : null}
            </>
          ) : null}

          <View style={[s.sidebarDivider, { marginTop: 14 }]} />

          <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
            THE QUESTION FROM HERE
          </Text>
          <Text style={{ fontSize: 9.5, color: "#555555", lineHeight: 1.6 }}>
            {DOMAIN_DIAGNOSTIC_QUESTIONS[domainKey]?.[level] || coachNote}
          </Text>

          <View style={[s.sidebarDivider, { marginTop: 14 }]} />
          <Text style={{ fontSize: 8, fontWeight: 700, color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            MATURITY LEVEL
          </Text>
          <View style={{ flexDirection: "row", gap: 5 }}>
            {[1, 2, 3, 4].map((l) => (
              <View key={l} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: l <= level ? "#EA2C00" : "#E5E0D9" }} />
            ))}
          </View>
          <Text style={{ fontSize: 8, color: "#AAAAAA", marginTop: 5 }}>Level {level} of 4</Text>
        </View>
      </View>

      {bench.source && (
        <Text style={{ fontSize: 7, color: "#BBBBBB", fontStyle: "italic", marginTop: 4 }}>
          {bench.source}
        </Text>
      )}

      {domainKey === "risk" && (
        <Text style={{ fontSize: 8.5, color: "#AAAAAA", lineHeight: 1.55, fontStyle: "italic", marginTop: 8 }}>
          {"The priority domain and the questions ahead are on the following page."}
        </Text>
      )}

      <PageFooter pageNum={pageNum} orgName={data.organizationName} />
    </Page>
  );
}

// ============================================================================
// PAGE 8: THE QUESTIONS AHEAD
// ============================================================================

function TheQuestionsPage({
  data,
  archetype: archetypeProp,
}: {
  data: AmbientAssessmentPDFData;
  archetype?: { name: string; headline: string; body: string };
}) {
  const domainLevels: Record<string, number> = {
    capacity: data.domains?.capacity?.activationLevel || 1,
    revenue: data.domains?.revenue?.activationLevel || 1,
    workforce: data.domains?.workforce?.activationLevel || 1,
    risk: data.domains?.risk?.activationLevel || 1,
  };
  const archetype = archetypeProp || computeArchetype(domainLevels, data.providers);
  const band = scoreBand(data.documentationScore);

  const priorityKey = data.priorityDomain || DOMAIN_ORDER.find((k) => domainLevels[k] === 2) || DOMAIN_ORDER[0];
  const remainingKeys = DOMAIN_ORDER.filter((k) => k !== priorityKey);

  const confirmedCount = DOMAIN_ORDER.filter((k) => {
    const d = data.domains?.[k as keyof typeof data.domains];
    return (d?.activationLevel || 1) >= 3;
  }).length;

  const measuredTotal = DOMAIN_ORDER.reduce((sum, d) => {
    const dom = data.domains?.[d as keyof typeof data.domains];
    if (!dom?.hasValue) return sum;
    if (d === 'revenue' && (dom.activationLevel || 1) === 2) return sum;
    return sum + (dom.gapValue || 0);
  }, 0);

  const tenure = data.deploymentTenure || "0-6";
  const isEarlyTenure = tenure === "0-6";

  let ctaHeading: string;
  let ctaBody: string;
  if (confirmedCount >= 3) {
    ctaHeading = "Most of the story is confirmed.";
    ctaBody = "Most of the story is confirmed. The work ahead is depth and compounding \u2014 deepening the connection between the ambient data and the strategic decisions that run on it.";
  } else if (confirmedCount >= 1) {
    ctaHeading = "The measurement story has started.";
    ctaBody = "The measurement story has started. The domains not yet confirmed are the next phase of work \u2014 and the data is already in the systems.";
  } else if (!isEarlyTenure) {
    ctaHeading = "The measurement story hasn\u2019t started yet.";
    ctaBody = "The deployment is running and the value is generating \u2014 but none of it has been formally counted yet. At this tenure, that\u2019s the conversation worth having now.";
  } else {
    ctaHeading = "The measurement foundation is forming.";
    ctaBody = "The measurement foundation is still forming. The organizations that move fastest build measurement habits in the first 6 months \u2014 before the window of easiest access to baseline data closes.";
  }

  const nextMoveByLevel: Record<number, string> = {
    1: "Not yet measured \u00B7 First step: establish a baseline",
    2: "Signal captured \u00B7 Next: validate and act on it",
    3: "Demonstrated \u00B7 Next: deepen and connect to strategy",
    4: "Strategic Impact \u00B7 Compound the value",
  };

  const priorityDomainData = data.domains?.[priorityKey as keyof typeof data.domains];
  const priorityLevel = priorityDomainData?.activationLevel || 1;

  const peText = computePESignal(
    data.patientExperienceNoticeable || '',
    data.patientExperienceSignals || '',
    data.patientExperienceFormalized || '',
  );
  const hasPE = !!peText;
  const ctaEmail = deriveCTAEmail(data.preparedBy);
  const ctaFirstName = deriveCTAFirstName(data.preparedBy);

  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={s.redRule} />
      <Text style={s.eyebrow}>What Comes Next</Text>
      <Text style={{ fontSize: 10.5, color: "#555555", lineHeight: 1.7, marginBottom: 16, maxWidth: 490 }}>
        {generateWhatComesNextOpening(data, domainLevels)}
      </Text>

      <View style={{ flexDirection: "row", gap: 20, flex: 1 }}>

        {/* LEFT — Strategic questions */}
        <View style={{ flex: 1.5 }}>

          {/* Patient Experience — The Fifth Dimension */}
          {hasPE ? (
            <View style={{ backgroundColor: "#FFF5F2", borderRadius: 4, padding: 14, borderLeftWidth: 3, borderLeftColor: "#EA2C00", marginBottom: 16 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
                Patient Experience · The Fifth Dimension
              </Text>
              <Text style={{ fontSize: 10.5, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.4, marginBottom: 6 }}>
                {peText}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#888888", lineHeight: 1.55 }}>
                {"This signal doesn\u2019t generate a number in this framework \u2014 it shapes what every number in it means. The patient was in the room when this happened."}
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: "#F8F7F5", borderRadius: 4, padding: 12, borderLeftWidth: 2, borderLeftColor: "#E5E0D9", marginBottom: 16 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#AAAAAA", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
                Patient Experience · The Fifth Dimension
              </Text>
              <Text style={{ fontSize: 9.5, color: "#AAAAAA", lineHeight: 1.55, fontStyle: "italic" }}>
                {"Not yet formally tracked. The patient experience connection hasn\u2019t been looked at yet \u2014 which is a story worth telling when it is."}
              </Text>
            </View>
          )}

          {/* Priority Domain — elevated treatment */}
          <View style={{ marginBottom: 14, backgroundColor: "#F5F0EB", borderRadius: 4, padding: 14, borderLeftWidth: 2, borderLeftColor: "#EA2C00" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#EA2C00", letterSpacing: 2, textTransform: "uppercase" }}>
                Priority Domain
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E0D9" }} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: 700, color: "#EA2C00", letterSpacing: 0.8, marginBottom: 6, textTransform: "uppercase" }}>
              {domainDisplayName[priorityKey]}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.45, marginBottom: 6 }}>
              {DOMAIN_STRATEGIC_QUESTIONS[priorityKey]?.question || ""}
            </Text>
            <Text style={{ fontSize: 9, color: "#888888", lineHeight: 1.55, marginBottom: 8 }}>
              {DOMAIN_STRATEGIC_QUESTIONS[priorityKey]?.context || ""}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#EA2C00", backgroundColor: "#FFF0ED", paddingVertical: 3, paddingHorizontal: 7, borderRadius: 3 }}>
                {`L${priorityLevel}`}
              </Text>
              <Text style={{ fontSize: 8, color: "#888888", letterSpacing: 0.3 }}>
                {nextMoveByLevel[priorityLevel]}
              </Text>
            </View>
          </View>

          {/* Remaining 3 domains — compact */}
          {remainingKeys.map((key, i) => (
            <View key={key} style={{ marginBottom: i < remainingKeys.length - 1 ? 12 : 0 }}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>
                {domainDisplayName[key]}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.4, marginBottom: 3 }}>
                {DOMAIN_STRATEGIC_QUESTIONS[key]?.question || ""}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#888888", lineHeight: 1.5 }}>
                {DOMAIN_STRATEGIC_QUESTIONS[key]?.context || ""}
              </Text>
              {i < remainingKeys.length - 1 && (
                <View style={{ height: 1, backgroundColor: "#E5E0D9", marginTop: 10 }} />
              )}
            </View>
          ))}
        </View>

        {/* RIGHT — CTA */}
        <View style={{ flex: 0.85 }}>
          <View style={{ backgroundColor: "#F5F0EB", borderRadius: 4, padding: 18, marginBottom: 14 }}>
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#EA2C00", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
              What Comes Next
            </Text>
            <Text style={{ fontSize: 13, fontWeight: 800, color: "#1A1A1A", lineHeight: 1.3, marginBottom: 10 }}>
              {ctaHeading}
            </Text>
            <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6, marginBottom: 16 }}>
              {ctaBody}
            </Text>
            <View style={{ height: 1, backgroundColor: "#E5E0D9", marginBottom: 12 }} />
            {ctaFirstName ? (
              <Text style={{ fontSize: 10.5, fontWeight: 700, color: "#1A1A1A", marginBottom: 3 }}>
                {ctaFirstName}
              </Text>
            ) : null}
            <Text style={{ fontSize: 9.5, fontWeight: 700, color: "#EA2C00" }}>
              {ctaEmail}
            </Text>
          </View>

          <View style={{ borderWidth: 1, borderColor: "#E5E0D9", borderRadius: 4, padding: 14 }}>
            <Text style={{ fontSize: 7.5, fontWeight: 700, color: "#888888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
              Domain Status
            </Text>
            {DOMAIN_ORDER.map((key) => {
              const level = domainLevels[key];
              return (
                <View key={key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: 600, color: level >= 3 ? "#1A1A1A" : "#888888" }}>
                    {domainDisplayName[key]}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 3 }}>
                    {[1, 2, 3, 4].map((l) => (
                      <View key={l} style={{ width: 10, height: 4, borderRadius: 1, backgroundColor: l <= level ? "#EA2C00" : "#E5E0D9" }} />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </View>

      {/* Closing arc */}
      <Text style={{ fontSize: 8.5, color: "#AAAAAA", lineHeight: 1.55, fontStyle: "italic", marginBottom: 10 }}>
        {measuredTotal > 0
          ? "The measurement infrastructure is real. The work ahead is depth, not foundation."
          : "The deployment is running. The measurement story starts with a single domain \u2014 the one closest to confirmation."}
      </Text>

      <View style={{ marginTop: "auto" }}>
        <View style={{ height: 1, backgroundColor: "#E5E0D9", marginBottom: 10 }} />
        <Text style={{ fontSize: 8, color: "#AAAAAA", lineHeight: 1.6 }}>
          {"This assessment reflects self-reported maturity across four organizational value domains. Demonstrated figures are derived from stated inputs. Benchmark ranges are based on organizations of comparable size and are not projections for your organization. Assessment completed " + data.assessmentDate + "."}
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
// METHODOLOGY PAGE
// ============================================================================

function MethodologyPage({ data }: { data: AmbientAssessmentPDFData }) {
  return (
    <Page size="LETTER" style={s.whitePage} wrap={false}>
      <View style={s.redRule} />
      <Text style={s.eyebrow}>Methodology & Sources</Text>

      <View style={{ flexDirection: "row", gap: 28 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A", marginBottom: 4, marginTop: 0 }}>How Scores Are Calculated</Text>
          <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6, marginBottom: 14 }}>
            {"Each domain is assessed across four activation levels: Unmeasured (value generating, not yet attributed), Emerging (early signals visible, not yet defensible at scale), Demonstrated (measurable, repeatable, defensible to a skeptic), and Strategic Impact (the organization can now do things it could not do before)."}
          </Text>

          <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>Demonstrated vs. Benchmark Values</Text>
          <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6, marginBottom: 14 }}>
            {"Values labeled \u201CDemonstrated\u201D are derived directly from stated inputs using conservative formulas (11-month annual projection with confidence discounts applied based on measurement maturity). Values labeled \u201CBenchmark Range\u201D are based on organizations of comparable size and specialty mix from published sources. Benchmark ranges are illustrative, not projections."}
          </Text>

          <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>Capacity Domain</Text>
          <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6, marginBottom: 14 }}>
            {"Time recovered is calculated as: minutes saved per encounter \u00D7 annual documented encounters \u00F7 60. Access revenue at Demonstrated and above is calculated as: additional patients/provider/month \u00D7 active providers \u00D7 11 months \u00D7 revenue per visit. Source: MGMA Physician Compensation and Production Report."}
          </Text>

          <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>Revenue Domain</Text>
          <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6, marginBottom: 14 }}>
            {"wRVU lift: delta wRVU \u00D7 annual encounters \u00D7 conversion factor. Collections lift: delta collections rate \u00D7 annual billed amount. Denial reduction: denial volume \u00D7 reduction rate \u00D7 average denial value. Source: MGMA, CMS Physician Fee Schedule, published denial management literature."}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A", marginBottom: 4, marginTop: 0 }}>Workforce Domain</Text>
          <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6, marginBottom: 14 }}>
            {"Retention value: providers \u00D7 (pre-deployment turnover rate \u2212 post-deployment turnover rate) \u00D7 replacement cost. Default replacement cost: $350,000/physician (AMGA Physician Replacement Cost Study, 2022). Benchmark retention improvement assumes 0.6% net retention from documented burnout reduction, consistent with published ambient AI outcomes studies."}
          </Text>

          <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>Quality / Risk Domain</Text>
          <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6, marginBottom: 14 }}>
            {"MIPS: score improvement \u00D7 4% payment adjustment \u00D7 $10,000/provider/year. HCC capture: additional codes \u00D7 $1,200 average revenue per HCC code (CMS RAF methodology). CDI savings: query reduction \u00D7 $50/query (ACDIS CDI Benchmark Report). Quality benchmark range: $800\u2013$2,000 per provider annually (NEJM Catalyst, Vizient Quality Analytics)."}
          </Text>

          <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>Key Assumptions</Text>
          <Text style={{ fontSize: 9, color: "#555555", lineHeight: 1.6, marginBottom: 14 }}>
            {"\u2022 Annual projection uses 11 months (conservative, excludes go-live month)\n\u2022 Confidence discounts: Estimated inputs discounted 20%; Aspirational inputs discounted 40%\n\u2022 Benchmark midpoint scenario: 25% realization in Year 1 as measurement programs launch, 65% in Year 2 as data matures, 100% in Year 3. Illustrative \u2014 not a projection.\n\u2022 All dollar values in current USD; no inflation adjustment applied"}
          </Text>

          <View style={{ backgroundColor: "#F5F3EF", borderRadius: 4, padding: 12, marginTop: 4 }}>
            <Text style={{ fontSize: 8.5, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 }}>Sources</Text>
            <Text style={{ fontSize: 8, color: "#777777", lineHeight: 1.7 }}>
              {"MGMA Physician Compensation and Production Report (2023)\nAMGA Physician Replacement Cost Study (2022)\nCMS Physician Fee Schedule and RAF Methodology\nACDIS Clinical Documentation Improvement Benchmark Report\nNEJM Catalyst Value-Based Care Analytics\nVizient Quality and Accountability Study\nPublished ambient AI outcomes studies (2021\u20132024)"}
            </Text>
          </View>
        </View>
      </View>

      <PageFooter pageNum={10} orgName={data.organizationName} />
    </Page>
  );
}

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
        title={data.organizationName || "Your Organization"}
        subtitle={archetype.name}
        preparedBy={data.preparedBy || ""}
        disclaimerText="This assessment is for strategic planning purposes. All estimates are based on organizational self-assessment and your inputs. Benchmarks reflect published industry sources. Individual results vary."
      />
      <AssessmentPage data={data} archetype={archetype} />
      <FrameworkPage data={data} />
      <ConfirmedAndUnexaminedPage data={data} />
      <DomainPage domainKey="capacity" data={data} pageNum={5} />
      <DomainPage domainKey="revenue" data={data} pageNum={6} />
      <DomainPage domainKey="workforce" data={data} pageNum={7} />
      <DomainPage domainKey="risk" data={data} pageNum={8} />
      <TheQuestionsPage data={data} archetype={archetype} />
      <MethodologyPage data={data} />
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

