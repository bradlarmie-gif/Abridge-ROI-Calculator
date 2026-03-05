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
    { src: manropeBold, fontWeight: 600 },
    { src: manropeBold, fontWeight: 700 },
    { src: manropeBold, fontWeight: 800 },
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

const TOTAL_PAGES = 8;

const fmt = (n: number): string => {
  if (!n || n === 0) return "\u2014";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString()}`;
};

const scoreBand = (score: number): string => {
  if (score <= 50) return "Foundation building";
  if (score <= 64) return "Value in motion";
  if (score <= 79) return "Strategically managed";
  return "Leading practice";
};

const domainDisplayName: Record<string, string> = {
  capacity: "Capacity",
  revenue: "Revenue",
  workforce: "Workforce",
  risk: "Quality",
};

const domainOrder = ["capacity", "revenue", "workforce", "risk"];

const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: "#F5F0EB",
    padding: 48,
    fontFamily: "Manrope",
    fontSize: 10,
  },
  whitePage: {
    backgroundColor: "#FFFFFF",
    padding: 48,
    fontFamily: "Manrope",
    fontSize: 10,
  },
  darkPage: {
    backgroundColor: "#1A1A1A",
    padding: 48,
    fontFamily: "Manrope",
    fontSize: 10,
  },
  eyebrow: {
    fontSize: 8,
    fontWeight: 600,
    color: "#EA2C00",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  headline: {
    fontSize: 26,
    fontWeight: 800,
    color: "#1A1A1A",
    lineHeight: 1.15,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  subhead: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1A1A1A",
    marginBottom: 8,
  },
  body: {
    fontSize: 10.5,
    fontWeight: 400,
    color: "#555555",
    lineHeight: 1.65,
    marginBottom: 10,
  },
  bodyDark: {
    fontSize: 10.5,
    fontWeight: 400,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 1.65,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 800,
    color: "#EA2C00",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: "#888888",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statUnit: {
    fontSize: 9,
    fontWeight: 400,
    color: "#888888",
    marginTop: 3,
  },
  redRule: {
    height: 2,
    backgroundColor: "#EA2C00",
    width: 48,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E0D9",
    marginVertical: 16,
  },
  darkDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 14,
  },
  tile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E0D9",
  },
  darkTile: {
    backgroundColor: "#1A1A1A",
    borderRadius: 4,
    padding: 16,
  },
  beigeBox: {
    backgroundColor: "#F5F0EB",
    borderRadius: 4,
    padding: 16,
  },
  redAccentBar: {
    width: 3,
    backgroundColor: "#EA2C00",
    marginRight: 14,
    borderRadius: 2,
  },
  footerWrapper: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E0D9",
  },
  footerText: {
    fontSize: 8,
    color: "#AAAAAA",
    fontWeight: 400,
  },
  domainLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#EA2C00",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  levelBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EA2C00",
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: 800,
    color: "#FFFFFF",
  },
  nextLevelLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#888888",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 5,
    marginTop: 12,
  },
  nextLevelText: {
    fontSize: 10,
    fontWeight: 400,
    color: "#555555",
    lineHeight: 1.6,
  },
  coachText: {
    fontSize: 9.5,
    fontWeight: 400,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 1.6,
  },
  coachLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#EA2C00",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  disclaimer: {
    fontSize: 8.5,
    color: "#999999",
    lineHeight: 1.5,
  },
});

function PageFooter({ pageNum, orgName }: { pageNum: number; orgName: string }) {
  return (
    <View style={pdfStyles.footerWrapper} fixed>
      <Text style={{ fontSize: 10, color: "#EA2C00", fontWeight: 700 }}>ABRIDGE</Text>
      <Text style={{ fontSize: 8.5, color: "#888888" }}>
        Ambient Assessment {"\u00B7"} {orgName || "Your Organization"}
      </Text>
      <Text style={{ fontSize: 8.5, color: "#AAAAAA" }}>
        Page {pageNum} of {TOTAL_PAGES}
      </Text>
    </View>
  );
}

function FrameworkPage({ data }: { data: AmbientAssessmentPDFData }) {
  const e = data;
  const hoursRecovered =
    e.timeSavings > 0 ? Math.round((e.annualEncounters * e.timeSavings) / 60) : 0;
  const fteEquivalent = hoursRecovered > 0 ? (hoursRecovered / 2080).toFixed(1) : "\u2014";
  const encountersFormatted = e.annualEncounters.toLocaleString();

  return (
    <Page size="LETTER" style={pdfStyles.whitePage} wrap={false}>
      <Text style={pdfStyles.eyebrow}>THE FRAMEWORK</Text>
      <Text style={pdfStyles.headline}>
        {"Most organizations treat ambient AI as a documentation tool.\nThe ones creating the most value treat it as infrastructure."}
      </Text>
      <View style={pdfStyles.redRule} />
      <Text style={pdfStyles.body}>
        {
          "The distinction isn't about the technology \u2014 it's about the decision. Organizations that have crossed that line share a pattern: they stopped asking \"is ambient saving time?\" and started asking \"what is our organization doing with the time it's saving?\" That shift in question is what this assessment measures.\n\nAmbient documentation, at scale, creates recoverable value across four domains \u2014 Capacity, Revenue, Workforce, and Quality. Most organizations are capturing one. Leading organizations are managing all four as a coordinated strategy. The framework below is built from your deployment."
        }
      </Text>
      <View style={pdfStyles.divider} />
      <Text style={[pdfStyles.eyebrow, { marginBottom: 12 }]}>YOUR DEPLOYMENT AT A GLANCE</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <View style={[pdfStyles.tile, { flex: 1 }]}>
          <Text style={pdfStyles.statLabel}>Providers on Ambient</Text>
          <Text style={pdfStyles.statNumber}>{e.providers || "\u2014"}</Text>
          <Text style={pdfStyles.statUnit}>providers</Text>
        </View>
        <View style={[pdfStyles.tile, { flex: 1 }]}>
          <Text style={pdfStyles.statLabel}>Encounters Documented</Text>
          <Text style={pdfStyles.statNumber}>{encountersFormatted}</Text>
          <Text style={pdfStyles.statUnit}>annually</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <View style={[pdfStyles.tile, { flex: 1 }]}>
          <Text style={pdfStyles.statLabel}>Clinical Time Returned</Text>
          <Text style={pdfStyles.statNumber}>
            {hoursRecovered > 0 ? hoursRecovered.toLocaleString() : "\u2014"}
          </Text>
          <Text style={pdfStyles.statUnit}>hrs/yr recovered</Text>
        </View>
        <View style={[pdfStyles.tile, { flex: 1 }]}>
          <Text style={pdfStyles.statLabel}>FTE Equivalent</Text>
          <Text style={pdfStyles.statNumber}>{fteEquivalent}</Text>
          <Text style={pdfStyles.statUnit}>FTE of recovered time</Text>
        </View>
      </View>
      <View style={[pdfStyles.darkTile, { flexDirection: "row", alignItems: "flex-start" }]}>
        <View style={[pdfStyles.redAccentBar, { alignSelf: "stretch" }]} />
        <View style={{ flex: 1 }}>
          <Text style={[pdfStyles.coachLabel, { color: "#EA2C00" }]}>
            THE QUESTION YOUR NUMBERS RAISE
          </Text>
          <Text style={pdfStyles.bodyDark}>
            {hoursRecovered > 0
              ? `At ${e.timeSavings} minutes returned per encounter across ${encountersFormatted} documented encounters, your deployment is generating ${hoursRecovered.toLocaleString()} hours of recovered clinical time annually \u2014 ${fteEquivalent} FTE equivalent. That number is the raw material. What follows in this assessment measures what your organization has decided to do with it.`
              : `Your deployment is generating recovered clinical time across ${encountersFormatted} documented encounters. What follows in this assessment measures what your organization has decided to do with it.`}
          </Text>
        </View>
      </View>
      <Text style={[pdfStyles.footerText, { marginTop: 14 }]}>
        {`Financial assumptions: $${e.revenuePerVisit || 200}/visit \u00B7 $${e.providerRate || 150}/hr \u00B7 $${e.conversionFactor || 33} wRVU conversion factor`}
      </Text>
      <PageFooter pageNum={1} orgName={e.organizationName} />
    </Page>
  );
}

function MaturityPositionPage({ data }: { data: AmbientAssessmentPDFData }) {
  const e = data;
  const band = scoreBand(e.documentationScore);
  const domainScores: Record<string, number> = {
    capacity: e.domains?.capacity?.score || 0,
    revenue: e.domains?.revenue?.score || 0,
    workforce: e.domains?.workforce?.score || 0,
    risk: e.domains?.risk?.score || 0,
  };
  const domainLabels: Record<string, string> = {
    capacity: e.domains?.capacity?.activationLabel || "",
    revenue: e.domains?.revenue?.activationLabel || "",
    workforce: e.domains?.workforce?.activationLabel || "",
    risk: e.domains?.risk?.activationLabel || "",
  };

  const narrativeByBand: Record<string, string> = {
    low: `Your organization has established the foundation. Ambient is deployed, time is being recovered, and at least one domain is beginning to produce signal. This is the right starting position \u2014 but the organizations that extract the most value from ambient don't stay here. The next stage is a decision: what is this recovered time for? That decision, made deliberately, is what separates a ${e.documentationScore}/100 organization from a 65/100 one.`,
    mid: `Your organization is beginning to connect ambient to outcomes. Some domains are producing measurable data; others are still establishing signal. The pattern in organizations at this maturity level is typically the same: one or two domains move first, and the discipline from those domains pulls the others forward. ${e.assessmentNarrative || ""}`,
    high: `Your organization is managing ambient as a strategic asset in multiple domains. The remaining opportunity is in the domains that haven't yet been connected to operational outcomes \u2014 and the compounding effect of closing those gaps is significant. ${e.assessmentNarrative || ""}`,
    leading: `Your organization has institutionalized ambient ROI across all four domains. This is strategic-level documentation intelligence \u2014 a genuine competitive differentiator. The opportunity at this stage is governance and sustainability: ensuring the discipline that got you here is encoded into operations, not dependent on individual champions.`,
  };

  const narrative =
    e.documentationScore <= 30
      ? narrativeByBand.low
      : e.documentationScore <= 64
        ? narrativeByBand.mid
        : e.documentationScore <= 85
          ? narrativeByBand.high
          : narrativeByBand.leading;

  return (
    <Page size="LETTER" style={pdfStyles.whitePage} wrap={false}>
      <Text style={pdfStyles.eyebrow}>YOUR MATURITY POSITION</Text>
      <View style={{ flexDirection: "row", gap: 20, marginBottom: 16 }}>
        <View style={{ flex: 1.1 }}>
          <Text
            style={[pdfStyles.subhead, { fontSize: 18, fontWeight: 800, color: "#1A1A1A", marginBottom: 4 }]}
          >
            {band}.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 10, gap: 4 }}>
            <Text style={{ fontSize: 64, fontWeight: 800, color: "#EA2C00", lineHeight: 1 }}>
              {e.documentationScore}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: 400, color: "#AAAAAA", marginBottom: 8, lineHeight: 1 }}>
              /100
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: "#E5E0D9", borderRadius: 3, marginBottom: 14, width: "100%" }}>
            <View
              style={{
                height: 6,
                backgroundColor: "#EA2C00",
                borderRadius: 3,
                width: `${e.documentationScore}%`,
              }}
            />
          </View>
          <Text style={pdfStyles.body}>{narrative}</Text>
        </View>
        <View style={{ flex: 0.9 }}>
          <Text style={pdfStyles.eyebrow}>SCORE BY DOMAIN</Text>
          {domainOrder.map((key) => {
            const score = domainScores[key];
            const level = e.domains?.[key as keyof typeof e.domains]?.activationLevel || 1;
            const label = domainLabels[key];
            const pct = (score / 25) * 100;
            return (
              <View key={key} style={{ marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 3,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A" }}>
                    {domainDisplayName[key]}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: 700, color: "#1A1A1A" }}>
                    {score} / 25
                  </Text>
                </View>
                <Text style={{ fontSize: 9, fontWeight: 400, color: "#888888", marginBottom: 5 }}>
                  {`Level ${level} \u2014 ${label}`}
                </Text>
                <View style={{ height: 4, backgroundColor: "#E5E0D9", borderRadius: 2, width: "100%" }}>
                  <View
                    style={{ height: 4, backgroundColor: "#EA2C00", borderRadius: 2, width: `${pct}%` }}
                  />
                </View>
              </View>
            );
          })}
          <View style={pdfStyles.divider} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: "#1A1A1A" }}>TOTAL SCORE</Text>
            <Text style={{ fontSize: 16, fontWeight: 800, color: "#EA2C00" }}>
              {e.documentationScore} / 100
            </Text>
          </View>
        </View>
      </View>
      <View
        style={[pdfStyles.beigeBox, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
      >
        {[
          { label: "Foundation building", range: "0\u201350" },
          { label: "Value in motion", range: "51\u201364" },
          { label: "Strategically managed", range: "65\u201379" },
          { label: "Leading practice", range: "80\u2013100" },
        ].map((b, i) => {
          const isCurrent = scoreBand(e.documentationScore) === b.label;
          return (
            <View key={i} style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isCurrent ? "#EA2C00" : "#CCCCCC",
                  marginBottom: 4,
                }}
              />
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: isCurrent ? 700 : 400,
                  color: isCurrent ? "#EA2C00" : "#888888",
                  textAlign: "center",
                }}
              >
                {b.label}
              </Text>
              <Text style={{ fontSize: 8, color: "#AAAAAA", textAlign: "center" }}>{b.range}</Text>
            </View>
          );
        })}
      </View>
      <PageFooter pageNum={2} orgName={e.organizationName} />
    </Page>
  );
}

const domainFrame: Record<
  string,
  { what: string; atThisLevel: (level: number) => string }
> = {
  capacity: {
    what: "Recovered time is ambient's most universal output. Every organization sees it. The strategic divide is between organizations that measure it and stop \u2014 and organizations that assign it a destination. Capacity is the domain that measures that decision.",
    atThisLevel: (level: number) =>
      `At Level ${level}, your organization has ${
        level === 1
          ? "established that time is being recovered. The total picture hasn't been formally assembled yet."
          : level === 2
            ? "quantified the recovered time and brought it to leadership. The next move is deciding what the hours are for."
            : level === 3
              ? "connected recovered time to a specific operational outcome \u2014 more patients seen, schedules redesigned, or panels expanded."
              : "fully operationalized recovered capacity as a variable in strategic planning, hiring, and growth decisions."
      }`,
  },
  revenue: {
    what: "Every encounter is coded. The question is whether it's coded at the specificity your documentation now supports \u2014 and whether your revenue cycle team is part of that conversation. Organizations that close that loop systematically find it is worth millions. Most organizations haven't asked the question yet.",
    atThisLevel: (level: number) =>
      `At Level ${level}, your organization has ${
        level === 1
          ? "deployed ambient without formally engaging revenue cycle. The documentation has improved. The financial signal from that improvement is invisible."
          : level === 2
            ? "opened the conversation with revenue cycle. Analysis is in motion. The value isn't confirmed yet, but the gap is becoming visible."
            : level === 3
              ? "measured a before/after impact. A number exists that leadership can stand behind \u2014 and that's a different kind of credibility than a projection."
              : "integrated documentation quality into revenue cycle operations as a managed, ongoing input. This is systematic revenue integrity."
      }`,
  },
  workforce: {
    what: "Provider burnout is one of the most expensive problems in health system operations \u2014 and ambient documentation is one of the few interventions that measurably addresses it. But the value only becomes visible when someone is looking for it. Most organizations have the signal. Very few have the measurement.",
    atThisLevel: (level: number) =>
      `At Level ${level}, your organization has ${
        level === 1
          ? "reduced after-hours documentation burden \u2014 providers feel it. That signal hasn't been formally quantified or connected to a retention or workforce strategy."
          : level === 2
            ? "measured the burden reduction. In-clinic and after-hours data exists. The next step is wiring that measurement into operational and HR decisions."
            : level === 3
              ? "connected burden reduction to retention risk. Turnover exposure has been modeled. Documentation quality is a named variable in how you manage your workforce."
              : "made provider experience data a full strategic input. Staffing, scheduling, and labor cost decisions account for what ambient has changed."
      }`,
  },
  risk: {
    what: "When documentation improves, the clinical record becomes more complete, more specific, and more useful \u2014 to coders, quality teams, compliance officers, and care managers. Whether that improved signal reaches those downstream functions is what this domain measures.",
    atThisLevel: (level: number) =>
      `At Level ${level}, your organization has ${
        level === 1
          ? "improved its documentation quality. Nothing downstream has changed yet \u2014 not because the value isn't there, but because no one has connected the pipes."
          : level === 2
            ? "begun tracking documentation quality. Gaps are becoming visible. The data exists. It isn't yet an active input to the workflows that depend on it."
            : level === 3
              ? "connected documentation quality to downstream workflows \u2014 CDI, coding, prior auth, or quality reporting. The improved signal is reaching the teams built to use it."
              : "made documentation quality a governed strategic asset \u2014 an input to payer strategy, value-based care contracts, and compliance governance."
      }`,
  },
};

const levelNextUnlock: Record<string, Record<number, string>> = {
  capacity: {
    1: "A full accounting of hours recovered across your deployment \u2014 the number that anchors every downstream conversation about what to do with that time.",
    2: "A documented redeployment strategy \u2014 whether that's access expansion, administrative offload, or revenue-generating visits \u2014 that turns recovered hours into a planned organizational outcome.",
    3: "Continuous monitoring of recovered capacity and redeployment efficiency \u2014 so the value stays captured, not just planned.",
    4: "",
  },
  revenue: {
    1: "Visibility into wRVU accuracy and documentation specificity gaps \u2014 the starting point for understanding what revenue integrity looks like at your scale.",
    2: "A closed-loop process connecting documentation quality to coding correction \u2014 so that specificity gaps get fixed before they become denials or underpayments.",
    3: "Documentation governance tied to payer strategy \u2014 where your coding accuracy data directly informs contract negotiations and prior auth workflows.",
    4: "",
  },
  workforce: {
    1: "Structured measurement of in-clinic and after-hours time savings \u2014 turning anecdotal relief into an organizational data point that supports retention decisions and provider contracts.",
    2: "Workforce data wired into operational planning \u2014 informing scheduling, staffing ratios, and provider engagement in a way that's defensible to leadership and HR.",
    3: "A direct connection between documentation burden reduction and retention outcomes \u2014 giving your organization a measurable ROI story on provider experience investment.",
    4: "",
  },
  risk: {
    1: "Visibility into documentation completeness, specificity, and accuracy at scale \u2014 the foundation that CDI, coding, and compliance workflows all depend on.",
    2: "Quality data wired into CDI workflows, coding accuracy, and prior auth \u2014 so documentation intelligence becomes an active input to revenue cycle and compliance, not just a report.",
    3: "Documentation infrastructure positioned for value-based care \u2014 where quality data supports risk adjustment, population health reporting, and payer negotiations.",
    4: "",
  },
};

function getCoachingNote(domainKey: string, level: number): string {
  if (domainKey === "capacity" && level <= 2)
    return "The organizations moving fastest from Level 2 to Level 3 share one thing: they scheduled the operational conversation \u2014 with a recommendation in hand \u2014 before they thought they were ready. The number doesn't need to be perfect. It needs to be in the room.";
  if (domainKey === "capacity" && level >= 3)
    return "Connecting recovered time to access revenue is one thing. Connecting it to a hiring model is another. Level 4 is where ambient stops being a documentation decision and starts being a workforce strategy.";
  if (domainKey === "revenue" && level <= 2)
    return "The revenue cycle team almost always finds something when they look. The barrier isn't data \u2014 it's the first conversation. Organizations that formalize that conversation within 90 days of deployment typically have a number before their first contract renewal.";
  if (domainKey === "revenue" && level >= 3)
    return "A measured revenue impact is a different kind of asset than a projection. It changes the conversation with payers, with leadership, and with the board. The question at this level is: who owns maintaining it?";
  if (domainKey === "workforce" && level <= 2)
    return "Provider experience is the most politically powerful data in a health system \u2014 and it's consistently under-quantified. Organizations that formalize this measurement tend to use it in ways they didn't initially plan: recruitment, contracts, board presentations.";
  if (domainKey === "workforce" && level >= 3)
    return "The transition from Level 3 to Level 4 is a governance decision, not a measurement decision. It's asking: is provider sustainability a formal variable in our FTE model? The organizations that say yes are building a moat.";
  if (domainKey === "risk" && level <= 2)
    return "The downstream value of better documentation compounds \u2014 but only when someone has built the pipe. CDI, coding, and prior auth teams need to know documentation has changed. That notification, formally structured, is the Level 2 to Level 3 move.";
  return "Documentation quality as a payer strategy input is where ambient AI's long-term value gets locked in. It's also the domain where most organizations have done the least work. That gap is an opportunity.";
}

function DomainPage({
  domainKey,
  data,
  pageNum,
}: {
  domainKey: string;
  data: AmbientAssessmentPDFData;
  pageNum: number;
}) {
  const domain = data.domains?.[domainKey as keyof typeof data.domains] || ({} as DomainData);
  const level = domain.activationLevel || 1;
  const label = domain.activationLabel || "";
  const headlineMetric = domain.headlineMetric || "";
  const hasValue = domain.hasValue || false;
  const value = domain.gapValue || 0;
  const name = domainDisplayName[domainKey];
  const frame = domainFrame[domainKey];
  const nextUnlock = level < 4 ? levelNextUnlock[domainKey][level] : "";

  return (
    <Page size="LETTER" style={pdfStyles.whitePage} wrap={false}>
      <View style={{ flexDirection: "row", gap: 20, flex: 1 }}>
        <View style={{ flex: 1.55 }}>
          <Text style={pdfStyles.domainLabel}>{name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <View style={pdfStyles.levelBadge}>
              <Text style={pdfStyles.levelBadgeText}>{level}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A", flex: 1, lineHeight: 1.2 }}>
              {label}
            </Text>
          </View>
          <Text style={pdfStyles.body}>{frame.what}</Text>
          <View style={pdfStyles.divider} />
          <Text style={[pdfStyles.eyebrow, { marginBottom: 6 }]}>WHERE YOU STAND</Text>
          <Text style={pdfStyles.body}>{frame.atThisLevel(level)}</Text>
          {headlineMetric ? (
            <View style={[pdfStyles.beigeBox, { marginTop: 8 }]}>
              <Text style={pdfStyles.eyebrow}>MEASURED IMPACT</Text>
              <Text style={{ fontSize: 18, fontWeight: 800, color: "#EA2C00", lineHeight: 1.2 }}>
                {headlineMetric}
              </Text>
            </View>
          ) : null}
          {nextUnlock ? (
            <View style={{ marginTop: 14 }}>
              <Text style={pdfStyles.nextLevelLabel}>NEXT LEVEL UNLOCKS</Text>
              <Text style={pdfStyles.nextLevelText}>{nextUnlock}</Text>
            </View>
          ) : null}
        </View>
        <View style={[pdfStyles.darkTile, { flex: 0.95, padding: 20 }]}>
          <Text style={[pdfStyles.eyebrow, { color: "rgba(255,255,255,0.4)" }]}>ESTIMATED IMPACT</Text>
          {hasValue && value > 0 ? (
            <Text style={{ fontSize: 32, fontWeight: 800, color: "#EA2C00", lineHeight: 1.1, marginBottom: 4 }}>
              {fmt(value)}
            </Text>
          ) : headlineMetric ? (
            <Text style={{ fontSize: 16, fontWeight: 700, color: "#EA2C00", lineHeight: 1.3, marginBottom: 8 }}>
              {headlineMetric}
            </Text>
          ) : (
            <Text style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
              Enter domain inputs to calculate
            </Text>
          )}
          <View style={pdfStyles.darkDivider} />
          <Text style={pdfStyles.coachLabel}>A THOUGHT ON THIS</Text>
          <Text style={pdfStyles.coachText}>{getCoachingNote(domainKey, level)}</Text>
          <View style={[pdfStyles.darkDivider, { marginTop: 16 }]} />
          <Text style={[pdfStyles.coachLabel, { marginBottom: 8 }]}>MATURITY LEVEL</Text>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            {[1, 2, 3, 4].map((l) => (
              <View
                key={l}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: l <= level ? "#EA2C00" : "rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </View>
          <Text style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 5 }}>
            {`Level ${level} of 4`}
          </Text>
        </View>
      </View>
      <PageFooter pageNum={pageNum} orgName={data.organizationName} />
    </Page>
  );
}

function RoadmapPage({ data }: { data: AmbientAssessmentPDFData }) {
  const e = data;
  const hasGap = e.totalAnnualGap > 0;
  const threeYearGap = hasGap ? e.totalAnnualGap * 3 : 0;

  const nextUnlocksByDomain: Record<string, string[]> = {
    capacity: [
      "",
      "Quantify recovered hours across the full deployment and bring the number to leadership with a recommended use.",
      "Assign recovered time a destination \u2014 more patients, administrative offload, or a reduced hiring need \u2014 and track the conversion.",
      "Wire recovered capacity into your annual FTE and growth model as a standing variable.",
    ],
    revenue: [
      "",
      "Formally engage your revenue cycle team in a conversation about what documentation quality change means for coding accuracy and reimbursement.",
      "Complete a before/after analysis that produces a number revenue cycle leadership can stand behind.",
      "Tie documentation governance to payer strategy so coding accuracy data informs contract negotiations.",
    ],
    workforce: [
      "",
      "Formalize measurement of in-clinic and after-hours burden reduction \u2014 turning provider feedback into an organizational data point.",
      "Wire workforce data into operational decisions \u2014 scheduling, staffing ratios, and provider engagement strategy.",
      "Connect burden reduction to retention outcomes and make provider sustainability a formal variable in your FTE model.",
    ],
    risk: [
      "",
      "Begin tracking documentation completeness, specificity, and accuracy at scale \u2014 the foundation that CDI, coding, and compliance all depend on.",
      "Wire quality data into CDI workflows, coding accuracy, and prior auth so documentation intelligence becomes an active operational input.",
      "Position documentation infrastructure for value-based care \u2014 supporting risk adjustment, population health reporting, and payer negotiations.",
    ],
  };

  return (
    <Page size="LETTER" style={pdfStyles.whitePage} wrap={false}>
      <Text style={pdfStyles.eyebrow}>YOUR ROADMAP</Text>
      <Text style={pdfStyles.headline}>{"Four domains.\nFour next levels.\nOne direction."}</Text>
      <View style={pdfStyles.redRule} />
      {hasGap ? (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {[
            {
              label: "Annual Trajectory Gap",
              value: fmt(e.totalAnnualGap),
              sub: "projected annually at next-level maturity",
            },
            {
              label: "6-Month Gap",
              value: fmt(e.monthlyGap * 6),
              sub: "value in the next 6 months",
            },
            {
              label: "36-Month Gap",
              value: fmt(threeYearGap),
              sub: "full period, conservative estimates",
            },
          ].map((stat, i) => (
            <View key={i} style={[pdfStyles.beigeBox, { flex: 1 }]}>
              <Text style={pdfStyles.statLabel}>{stat.label}</Text>
              <Text style={{ fontSize: 22, fontWeight: 800, color: "#EA2C00", lineHeight: 1.1, marginBottom: 3 }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#888888", lineHeight: 1.4 }}>{stat.sub}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {domainOrder.map((key) => {
        const domain = e.domains?.[key as keyof typeof e.domains] || ({} as DomainData);
        const level = domain.activationLevel || 1;
        const label = domain.activationLabel || "";
        const name = domainDisplayName[key];
        const nextAction = level < 4 ? nextUnlocksByDomain[key][level] : "";

        return (
          <View key={key} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: "#EA2C00",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: 800, color: "#FFFFFF" }}>{level}</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: 700, color: "#1A1A1A" }}>{name}</Text>
              <Text style={{ fontSize: 9, fontWeight: 400, color: "#888888" }}>
                {label}
              </Text>
            </View>
            {nextAction ? (
              <View style={{ paddingLeft: 26 }}>
                <Text style={{ fontSize: 9, fontWeight: 600, color: "#888888", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3 }}>
                  NEXT MOVE
                </Text>
                <Text style={{ fontSize: 9.5, fontWeight: 400, color: "#555555", lineHeight: 1.55 }}>
                  {nextAction}
                </Text>
              </View>
            ) : (
              <View style={{ paddingLeft: 26 }}>
                <Text style={{ fontSize: 9.5, fontWeight: 400, color: "#888888", lineHeight: 1.55 }}>
                  Leading practice achieved. Focus on governance and sustainability.
                </Text>
              </View>
            )}
            {key !== "risk" && (
              <View style={{ height: 1, backgroundColor: "#E5E0D9", marginTop: 8 }} />
            )}
          </View>
        );
      })}
      <View style={{ marginTop: "auto" }}>
        <Text style={pdfStyles.disclaimer}>
          All projections are estimates based on industry benchmarks and self-reported organizational data. Actual results depend on deployment quality, provider adoption rates, and operational decisions. Abridge does not guarantee specific financial outcomes. Individual results vary.
        </Text>
      </View>
      <PageFooter pageNum={7} orgName={e.organizationName} />
    </Page>
  );
}

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

const AmbientAssessmentDocument = ({ data }: { data: AmbientAssessmentPDFData }) => (
  <Document>
    <PDFCoverPage
      reportLabel="Ambient Assessment"
      title={data.organizationName || "Your Organization"}
      subtitle={"Ambient AI Maturity Assessment — Prepared by Abridge"}
      clientName={data.organizationName || "Your Organization"}
      preparedBy={data.preparedBy || "Abridge Partner Success"}
      disclaimerText="This assessment is for strategic planning purposes. All estimates are based on organizational self-assessment and your inputs. Benchmarks reflect aggregated deployment data. Individual results vary."
    />
    <FrameworkPage data={data} />
    <MaturityPositionPage data={data} />
    <DomainPage domainKey="capacity" data={data} pageNum={3} />
    <DomainPage domainKey="revenue" data={data} pageNum={4} />
    <DomainPage domainKey="workforce" data={data} pageNum={5} />
    <DomainPage domainKey="risk" data={data} pageNum={6} />
    <RoadmapPage data={data} />
  </Document>
);

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
