import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import type {
  ExplorePDFData,
  ExploreCareSetting,
  ExplorePDFQuadrantData,
} from "./ExplorePDFExport";
import { settingData as methodologySettingData } from "@/lib/methodology-pdf-export";

Font.registerHyphenationCallback((word) => [word]);

// Italic variants point at the same TTFs as the upright weights — react-pdf
// synthesizes the slant from the upright glyphs (faux italic). Without these
// explicit entries, any `fontStyle: "italic"` span (the inline italic formula
// tail in CompactDriverCard, the "Tracked"/"Tracked separately" tags) throws
// "Could not resolve font" when rendered server-side and silently falls back
// to a system sans-serif in some browser versions. Mirrors the Nursing PDF
// registration block — see pdf_layout_guidelines.md §9 (italic font
// registration).
Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
    { src: manropeRegular, fontWeight: 400, fontStyle: "italic" },
    { src: manropeBold, fontWeight: 700, fontStyle: "italic" },
  ],
});

// Palette mirrors NursingValueAssessmentPDF.tsx so the Explore family of PDFs
// is visually indistinguishable from the Nursing reference. Any palette tweak
// must be applied to both files in lockstep.
const colors = {
  background: "#FFFFFF",
  cards: "#F5F0EB",
  primary: "#EA2C00",
  primaryText: "#1A1A1A",
  secondary: "#666666",
  tertiary: "#999999",
  border: "#E0E0E0",
  separator: "#F0EBE4",
  separatorHeavy: "#E5DCD0",
  footerRule: "#DDD5C8",
  footerMeta: "#5C5751",
};


const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingLeft: 54,
    paddingRight: 54,
    paddingBottom: 0,
    fontFamily: "Manrope",
    fontSize: 10.5,
    color: colors.primaryText,
    backgroundColor: colors.background,
  },
  pageWrapper: {
    flex: 1,
    flexDirection: "column",
    paddingBottom: 72,
  },
  // Section label is restrained near-black with strong tracking, rendered by
  // the SectionLabel component below alongside a small red square accent.
  // Brand red is reserved for accent moments (figures, callouts, dividers)
  // so it lands when it appears instead of shouting on every page header.
  sectionLabel: {
    fontSize: 8.5,
    color: "#EA2C00",
    textTransform: "uppercase",
    letterSpacing: 2.5,
    fontWeight: "bold",
  },
  sectionHeadline: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.primaryText,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  body: {
    fontSize: 10.5,
    color: colors.secondary,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  cardBg: {
    backgroundColor: colors.cards,
    padding: 14,
    borderRadius: 4,
  },
  subSectionHeader: {
    fontSize: 9,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 8,
  },
  // The previous `driverCard` / `driverHeaderRow` / `driverHeader` /
  // `driverValue` / `driverBody` / `driverCalc` style block belonged to the
  // tall spreadsheet-style cards (≈220pt) that powered the original
  // QuantifiedDriverCard / QualitativeDriverCard / BenefitCard helpers.
  // Those helpers were collapsed into the inline-styled CompactDriverCard
  // (see below) to match the Nursing PDF's executive-document rhythm and
  // to fit 4–6 drivers per quadrant page without orphaning. The styles
  // were deleted with the helpers — keeping dead StyleSheet entries was
  // forbidden by pdf_layout_guidelines.md §9 ("Dead helper components").
  redBorderCallout: {
    backgroundColor: colors.cards,
    padding: 14,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: 10,
  },
  // Footer: two-slot layout (left flex:1, right width:72) separated by a
  // hairline rule. No wordmark — cover page carries branding. Explicit widths
  // prevent overflow regardless of org name length.
  footer: {
    // position: absolute + fixed = always at the physical page bottom,
    // never pushed to an orphan page by overflowing content above it.
    // left/right match the page's horizontal padding (54pt each side).
    position: "absolute",
    bottom: 28,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DDD5C8",
  },
  footerLeftText: {
    fontSize: 8.5,
    color: "#666666",
    flex: 1,
  },
  footerRightText: {
    fontSize: 8.5,
    color: "#999999",
    textAlign: "right",
    width: 72,
  },
});

// ───────────────────────── Helpers ─────────────────────────

const fmtCurrency = (n: number): string => {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
};

const fmtCurrencyExact = (n: number): string => `$${Math.round(n).toLocaleString()}`;
const fmtNum = (n: number): string => Math.round(n).toLocaleString();

// ───────────────────────── Setting-aware copy ─────────────────────────

const settingShortLabel: Record<Exclude<ExploreCareSetting, "nursing">, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  inpatient: "Inpatient",
};

const settingThesisHeadline: Record<Exclude<ExploreCareSetting, "nursing">, string> = {
  outpatient: "Where Outpatient Documentation Value Lives",
  ed: "Where ED Documentation Value Lives",
  inpatient: "Where Inpatient Documentation Value Lives",
};

const getThesisIntro = (
  data: ExplorePDFData,
  setting: Exclude<ExploreCareSetting, "nursing">,
): string => {
  const providers = fmtNum(data.numberOfProviders);
  const encounters = fmtNum(data.annualEncounters);
  const hours = fmtNum(data.totalHoursSaved);
  switch (setting) {
    case "outpatient":
      return `For a ${providers}-provider practice seeing ${encounters} patients annually, ${hours} hours of documentation time reclaimed per year. That time creates value across four buckets — and they don't all carry the same kind of math. We separate them so the financial story stays defensible and the qualitative signals don't get lost in the totals.`;
    case "ed":
      return `In an ED seeing ${encounters} visits annually across ${providers} providers, ${hours} hours of documentation time reclaimed per year. Every minute of charting saved is a minute back to the next patient — and that time moves four levers. We separate them so the financial story stays defensible and the qualitative signals don't get lost in the totals.`;
    case "inpatient":
      return `On a hospitalist service covering ${encounters} annual admissions with ${providers} providers, ${hours} hours of documentation time reclaimed per year. Ambient documentation moves four levers — and they don't all carry the same kind of math. We separate them so the financial story stays defensible and the qualitative signals don't get lost in the totals.`;
  }
};

const settingThesisCardTitle: Record<Exclude<ExploreCareSetting, "nursing">, string> = {
  outpatient: "What does Abridge actually move in outpatient?",
  ed: "What does Abridge actually move in the ED?",
  inpatient: "What does Abridge actually move on the inpatient floor?",
};

const settingThesisCardBody: Record<Exclude<ExploreCareSetting, "nursing">, string> = {
  outpatient:
    "Faster documentation reclaims time that becomes patient access (Capacity), reduces the burden behind provider turnover (Workforce), and lifts coding accuracy on E/M and HCC capture (Revenue). Quality outcomes — care continuity and note completeness — are tracked post-deployment as the leading indicators of clinical impact.",
  ed:
    "Faster note-write per encounter compresses door-to-disposition time and recovers LWBS volume (Capacity), protects retention against shift-based burnout (Workforce), and tightens E/M leveling and clean-claim performance (Revenue). Quality is tracked post-deployment as the leading indicator that documentation lift translated to clinical signal.",
  inpatient:
    "Faster H&Ps, signed progress notes, and complete discharge summaries unlock bed turnover and consult flow (Capacity), reduce after-hours charting that drives hospitalist attrition (Workforce), and lift CMI integrity through DRG accuracy and CC/MCC capture (Revenue). Quality is tracked post-deployment as documentation completeness translates to clinical signal.",
};

const settingQuadrantFraming: Record<
  Exclude<ExploreCareSetting, "nursing">,
  Record<ExplorePDFQuadrantData["quadrant"], string>
> = {
  outpatient: {
    Capacity:
      "Reclaimed documentation time becomes patient access — more visits per provider, shorter waits, complex patients getting the time their care requires. The model estimates the access value of returning charting time to the schedule.",
    Workforce:
      "Documentation burden is among the most-cited reasons clinicians leave outpatient practice. Reducing after-hours charting protects retention — and the locum spend that follows every vacancy.",
    Revenue:
      "Faster, more complete notes mean cleaner E/M leveling, fewer denials, and HCC capture that reflects the conditions actually addressed during the visit. Revenue lifts when documentation stops understating the encounter.",
    Quality:
      "Quality metrics in outpatient care are only as accurate as the documentation feeding them. When problem lists are incomplete, gaps appear in care continuity, care gap closure rates, and quality program performance — not because care was bad, but because it wasn't documented. These are the downstream proofs that documentation completeness improved.",
  },
  ed: {
    Capacity:
      "In the ED, every minute saved on charting is a minute back to the next patient. Recovered LWBS volume is the most measurable line — patients seen and treated instead of walking out the door.",
    Workforce:
      "Shift-based documentation burden drives ED burnout. Reducing end-of-shift charting protects retention — and the locum and agency spend that follows every gap in coverage.",
    Revenue:
      "Defensible E/M leveling and clean-claim performance both depend on how completely the encounter is documented. Down-coding and denial losses are recovered as documentation tightens.",
    Quality:
      "ED quality metrics — risk-adjusted outcomes, admission hand-off completeness, patient experience — are calculated from the documentation generated during the encounter. When that documentation is complete and specific, quality metrics reflect actual care quality. When it isn't, risk adjustment understates complexity and performance looks worse than it is. CDI query rate on admissions is the earliest observable signal of improvement.",
  },
  inpatient: {
    Capacity:
      "Inpatient capacity follows information flow. Faster H&Ps, signed progress notes, and complete discharge summaries free beds, accelerate consults, and shorten care-transition lag.",
    Workforce:
      "After-hours charting and the 24-hour H&P signature requirement are the two most-cited burden drivers in hospital medicine. Reducing both protects hospitalist retention — and the locum spend behind every vacancy.",
    Revenue:
      "Inpatient revenue lift centers on CMI integrity — DRG accuracy, CC/MCC capture, and CDI query reduction all reflect notes that fully describe the admission's clinical complexity.",
    Quality:
      "Risk-adjusted quality scores — observed-to-expected mortality, readmission rates, VBP performance — are calculated from documented patient complexity. When documentation understates severity, expected outcomes are set too low and care looks worse than it was. Ambient capture of clinical complexity at the point of care feeds accurate risk adjustment upstream, so downstream quality scores reflect what actually happened.",
  },
};

// NOTE: A `settingMetricsToTrack` dictionary used to live here, feeding a
// "Key Metrics To Track" section on the Investment Case page with hardcoded
// targets like "−40%", "+15 pts", "−25%". Both were removed for the same
// reason the equivalent block was removed from the Nursing PDF: those
// numbers were fabricated placeholder targets, not partner data. The
// premium-aesthetic rule in pdf_layout_guidelines.md §9 forbids
// "illustrative target percentages" — if we don't have real benchmarks for
// a given partner, we don't fabricate them. The cumulative-multiple
// callout on the Investment Case page is now the page's punchline; nothing
// else is needed.


// ───────────────────────── Reusable components ─────────────────────────

// PageFooter: two-slot layout — org name + setting label (left, flex: 1) and
// page number (right, fixed width: 72). No Abridge wordmark — the cover page
// carries the brand; repeating it on every footer is visual noise. The left
// slot uses flex: 1 so it never overflows into the right slot regardless of
// org name length.
const PageFooter = ({ orgName, settingLabel }: { orgName: string; settingLabel: string }) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerLeftText}>{orgName} · {settingLabel}</Text>
    <Text
      style={styles.footerRightText}
      render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        `Page ${pageNumber - 1} / ${totalPages - 1}`
      }
    />
  </View>
);

// SectionLabel: small red square accent + near-black uppercase text. Used at
// the top of every page section. Replaces the previous loud-red text-only
// label that competed with section headlines for visual weight. Mirrors
// the Nursing PDF's SectionLabel one-for-one — see pdf_layout_guidelines §9.
const SectionLabel = ({ children }: { children: string }) => (
  <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>{children}</Text>
);

// per-setting quality arc data — used by QualityThesisCard to replace the
// generic "Tracked" big-number with an arc that educates the reader about
// what moves first and what the downstream proof looks like.
const settingQualityArcCard: Record<
  Exclude<ExploreCareSetting, "nursing">,
  { signal: string; proof: string; framing: string }
> = {
  outpatient: {
    signal: "Documentation completeness ↑",
    proof: "Quality program performance ↑",
    framing:
      "Problem list accuracy and care gap closure typically move first. Quality program performance tends to follow at Month 9–12 as documentation completeness is sustained — timing varies by organization.",
  },
  ed: {
    signal: "CDI query rate on admissions ↓",
    proof: "Risk-adjusted quality score ↑",
    framing:
      "CDI query rate is typically the first quality signal to move. Risk-adjusted scores tend to follow at Month 9–18 as documentation captures clinical complexity consistently — timing varies by organization.",
  },
  inpatient: {
    signal: "Progress note completeness ↑",
    proof: "O/E mortality ratio improves",
    framing:
      "Complete progress notes feed accurate risk adjustment. Observed-to-expected ratios typically begin to improve at Month 6–12 as clinical complexity is more fully captured at point of care — timing varies by organization.",
  },
};

// Validation roadmap — 3-phase milestones for post-deployment measurement.
// Setting-specific because the data sources and owners differ meaningfully:
// outpatient (E/M + HCC), ED (LWBS + level distribution), inpatient (LOS + CMI).
const settingValidationMilestones: Record<
  Exclude<ExploreCareSetting, "nursing">,
  Array<{ window: string; metric: string; source: string; owner: string }>
> = {
  outpatient: [
    { window: "Month 1–3", metric: "Documentation time per note and note completion rate", source: "EHR audit logs", owner: "IT / Informatics" },
    { window: "Month 3–6", metric: "E/M level distribution and first-pass denial rate", source: "RCM system", owner: "Revenue Cycle" },
    { window: "Month 6–12+", metric: "Provider retention rate and HCC capture vs. prior year", source: "HR + Coding audit", owner: "Operations / Revenue Integrity" },
  ],
  ed: [
    { window: "Month 1–3", metric: "Documentation time per encounter and note completion before shift end", source: "EHR audit logs", owner: "IT / Quality" },
    { window: "Month 3–6", metric: "LWBS rate and E/M level distribution", source: "ED operations + Coding", owner: "ED Operations / RCM" },
    { window: "Month 6–12+", metric: "ED physician retention and CDI query rate on admissions", source: "HR + CDI program", owner: "HR / CDI team" },
  ],
  inpatient: [
    { window: "Month 1–3", metric: "H&P completion time and progress note completion rate", source: "EHR audit logs", owner: "IT / Quality" },
    { window: "Month 3–6", metric: "Average LOS trend and case mix index movement", source: "Care Management + Coding", owner: "Care Management / Revenue Integrity" },
    { window: "Month 6–12+", metric: "Hospitalist retention and observed-to-expected mortality ratio", source: "HR + Quality scorecard", owner: "HR / Quality" },
  ],
};

const QuadrantThesisCard = ({
  label,
  bigNumber,
  bigNumberItalic,
  bigNumberLight,
  framing,
  driverNames,
}: {
  label: string;
  bigNumber: string;
  bigNumberItalic?: boolean;
  bigNumberLight?: boolean;
  framing: string;
  driverNames?: string[];
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor: colors.cards,
      padding: 12,
      borderRadius: 4,
      marginHorizontal: 4,
      marginVertical: 4,
    }}
  >
    <Text
      style={{
        fontSize: 8,
        color: colors.secondary,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        fontWeight: "bold",
        marginBottom: 6,
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: bigNumberLight ? 16 : 18,
        fontWeight: bigNumberLight ? 400 : "bold",
        fontStyle: bigNumberItalic ? "italic" : "normal",
        color: bigNumberLight
          ? colors.tertiary
          : bigNumberItalic
            ? colors.primary
            : colors.primaryText,
        marginBottom: driverNames && driverNames.length > 0 ? 5 : 8,
        lineHeight: 1.0,
      }}
    >
      {bigNumber}
    </Text>
    {driverNames && driverNames.length > 0 ? (
      <Text
        style={{
          fontSize: 7.5,
          color: colors.primary,
          lineHeight: 1.4,
          marginBottom: 7,
          letterSpacing: 0.3,
        }}
      >
        {driverNames.join("  ·  ")}
      </Text>
    ) : null}
    <Text
      style={{
        fontSize: 8.5,
        color: colors.secondary,
        lineHeight: 1.45,
      }}
    >
      {framing}
    </Text>
  </View>
);

// QualityThesisCard replaces the generic "Tracked" treatment for the Quality
// quadrant on the Thesis page with a mini Signal → Proof arc. This educates
// the reader about what moves first (documentation completeness at Wk 4–8)
// and what the downstream proof looks like (quality scores at Month 6–18)
// without fabricating a dollar figure.
const QualityThesisCard = ({
  signal,
  proof,
  framing,
}: {
  signal: string;
  proof: string;
  framing: string;
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor: colors.cards,
      padding: 12,
      borderRadius: 4,
      marginHorizontal: 4,
      marginVertical: 4,
    }}
  >
    <Text
      style={{
        fontSize: 8,
        color: colors.secondary,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        fontWeight: "bold",
        marginBottom: 8,
      }}
    >
      QUALITY
    </Text>
    <View style={{ flexDirection: "row", alignItems: "stretch", marginBottom: 8 }}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          borderRadius: 3,
          padding: 6,
        }}
      >
        <Text
          style={{
            fontSize: 6.5,
            color: colors.tertiary,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 3,
          }}
        >
          Signal · Wk 4–8
        </Text>
        <Text
          style={{
            fontSize: 8.5,
            fontWeight: "bold",
            color: colors.primaryText,
            lineHeight: 1.3,
          }}
        >
          {signal}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 11,
          color: colors.tertiary,
          paddingHorizontal: 5,
          alignSelf: "center",
        }}
      >
        →
      </Text>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          borderRadius: 3,
          padding: 6,
        }}
      >
        <Text
          style={{
            fontSize: 6.5,
            color: colors.tertiary,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 3,
          }}
        >
          Proof · Mo 6–18
        </Text>
        <Text
          style={{
            fontSize: 8.5,
            fontWeight: "bold",
            color: colors.primaryText,
            lineHeight: 1.3,
          }}
        >
          {proof}
        </Text>
      </View>
    </View>
    <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
      {framing}
    </Text>
  </View>
);

// DomainPill — colored pill matching the methodology PDF domain color scheme.
const DomainPill = ({ domain }: { domain: string }) => {
  const pillColors: Record<string, { bg: string; text: string }> = {
    CAPACITY:  { bg: "#1A1A1A", text: "#FFFFFF" },
    WORKFORCE: { bg: "#4A3728", text: "#FFFFFF" },
    REVENUE:   { bg: "#EA2C00", text: "#FFFFFF" },
    QUALITY:   { bg: "#666666", text: "#FFFFFF" },
  };
  const c = pillColors[domain] ?? { bg: "#1A1A1A", text: "#FFFFFF" };
  return (
    <View
      style={{
        backgroundColor: c.bg,
        paddingVertical: 3,
        paddingHorizontal: 9,
        borderRadius: 12,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: 7,
          fontWeight: "bold",
          color: c.text,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {domain}
      </Text>
    </View>
  );
};

// CompactDriverCard mirrors the dense executive-style card the Nursing PDF
// canonized in pdf_layout_guidelines.md §9. The original tall
// "header + body + bordered CalcCallout" cards (≈220pt each) caused two
// compounding problems on the OP/ED/IP quadrant pages:
//   1. With wrap={false}, only 2–3 drivers fit per page after the headline,
//      framing paragraph, and the right-aligned "Quadrant total" header —
//      producing orphan single-driver pages on quadrants with 4+ drivers.
//   2. The bordered "How it's calculated" callout box stacked a second
//      visual frame inside an already-tinted card, making the rhythm read
//      as nested boxes instead of one driver tile.
// CompactDriverCard collapses each driver into ~95pt:
//   • Header row     (driver name + value/tag)
//   • Optional link tag (↳ LINKED DRIVER)
//   • 1–2 line body
//   • Inline italic formula line (the printed math, no border)
// Multiple cards stack vertically with the HeroSubtotal anchoring the page.
const CompactDriverCard = ({
  name,
  value,
  body,
  formula,
  linkedTag,
  valueIsTracked,
}: {
  name: string;
  value: string;
  body: string;
  formula?: string;
  linkedTag?: boolean;
  valueIsTracked?: boolean;
}) => {
  // Parse "A × B × C" into an array so each factor gets its own line.
  const formulaSteps = formula ? formula.split(" × ") : [];
  return (
    <View
      style={{
        backgroundColor: colors.cards,
        borderRadius: 4,
        padding: 10,
        marginBottom: 6,
      }}
      wrap={false}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <Text
          style={{
            fontSize: 10.5,
            fontWeight: "bold",
            color: colors.primaryText,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            flex: 1,
            paddingRight: 6,
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            fontSize: valueIsTracked ? 10 : 13,
            fontWeight: "bold",
            color: valueIsTracked ? colors.secondary : colors.primary,
            fontStyle: valueIsTracked ? "italic" : "normal",
            textTransform: valueIsTracked ? "uppercase" : "none",
            letterSpacing: valueIsTracked ? 1.2 : 0,
          }}
        >
          {value}
        </Text>
      </View>

      {linkedTag ? (
        <Text style={{ fontSize: 7.5, color: colors.primary, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "bold", marginBottom: 4 }}>
          ↳ Linked driver
        </Text>
      ) : null}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.5 }} {...({ numberOfLines: 2 } as any)}>
        {body}
      </Text>

      {formulaSteps.length > 0 ? (
        <View
          style={{
            marginTop: 7,
            backgroundColor: "#FDF7F4",
            borderLeftWidth: 2.5,
            borderLeftColor: colors.primary,
            paddingLeft: 10,
            paddingRight: 8,
            paddingVertical: 6,
            borderRadius: 2,
          }}
        >
          {formulaSteps.map((step, i) => (
            <Text
              key={i}
              style={{
                fontSize: 9,
                color: i === 0 ? colors.primaryText : colors.secondary,
                lineHeight: 1.55,
                fontWeight: i === 0 ? "bold" : "normal",
              }}
            >
              {i === 0 ? step : `× ${step}`}
            </Text>
          ))}
          <View style={{ marginTop: 4, borderTopWidth: 0.5, borderTopColor: "#E8DDD5", paddingTop: 3 }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>
              = {value}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

// HeroSubtotal — full-width tinted band that promotes a quadrant's dollar
// total to the page's punchline. Replaces the right-aligned "Quadrant
// total" line that used to sit at the TOP of each page (where readers had
// to scan back up after reading the drivers to see the total). The
// punchline now lands at the bottom where it's been earned.
//   ┌───────────────────────────────────────────────┐
//   │ CAPACITY SUBTOTAL                    $2.40M   │
//   │ One-time benefits ($100K) reported separately │
//   └───────────────────────────────────────────────┘
const HeroSubtotal = ({
  label,
  total,
  caption,
  totalIsTracked,
}: {
  label: string;
  total: string;
  caption?: string;
  totalIsTracked?: boolean;
}) => (
  <View
    style={{
      backgroundColor: colors.cards,
      borderRadius: 4,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginTop: 4,
      marginBottom: 6,
    }}
    wrap={false}
  >
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <Text
        style={{
          fontSize: 9,
          color: colors.secondary,
          textTransform: "uppercase",
          letterSpacing: 2,
          fontWeight: "bold",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: totalIsTracked ? 18 : 24,
          fontWeight: "bold",
          color: totalIsTracked ? colors.secondary : colors.primary,
          fontStyle: totalIsTracked ? "italic" : "normal",
          lineHeight: 1.0,
        }}
      >
        {total}
      </Text>
    </View>
    {caption ? (
      <Text
        style={{
          fontSize: 8.5,
          color: colors.tertiary,
          marginTop: 6,
        }}
      >
        {caption}
      </Text>
    ) : null}
  </View>
);

const QuadrantPage = ({
  q,
  setting,
  orgName,
  settingLabel,
  isQualityForNonNursing,
}: {
  q: ExplorePDFQuadrantData;
  setting: Exclude<ExploreCareSetting, "nursing">;
  orgName: string;
  settingLabel: string;
  isQualityForNonNursing: boolean;
}) => {
  const quantified = q.drivers.filter((d) => d.visibility === "quantified");
  const qualitative = q.drivers.filter((d) => d.visibility === "qualitative");
  const isEmpty = q.drivers.length === 0 && q.otherFinancialBenefits.length === 0;
  // Quantified drivers that are included — used to determine "last card" for
  // the wrap={false} block that keeps HeroSubtotal on the same page.
  const visibleQuantified = quantified.filter((d) => d.isIncluded !== false);

  // Pull the methodology domain entry so we can embed its rich narrative
  // content (North Star, sub narrative, causal chain, S/T/P callouts) directly
  // into the Explore value assessment.
  const domainKey = q.quadrant.toUpperCase() as "CAPACITY" | "WORKFORCE" | "REVENUE" | "QUALITY";
  const domainData = methodologySettingData[setting]?.domains.find(
    (d) => d.domain === domainKey,
  );

  const subtotalLabel = `${q.quadrant} Subtotal`;
  const subtotalIsTracked = isQualityForNonNursing && q.annualTotal === 0;
  const subtotalTotal = subtotalIsTracked
    ? "Tracked"
    : q.annualTotal > 0
      ? fmtCurrency(q.annualTotal)
      : "—";
  const subtotalCaption = (() => {
    if (subtotalIsTracked) {
      return "Tracked post-deployment as the leading indicator that documentation lift translates to clinical signal.";
    }
    if (q.oneTimeTotal > 0) {
      return `Plus ${fmtCurrency(q.oneTimeTotal)} one-time benefit reported separately above so multi-year ROI math stays comparable.`;
    }
    return undefined;
  })();

  return (
    <Page size="LETTER" style={styles.page} wrap>
      <View style={styles.pageWrapper}>

        {/* ─── Domain header ─── */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <DomainPill domain={domainKey} />
          {domainData ? (
            <Text style={{ fontSize: 8, color: colors.tertiary, marginLeft: 8 }}>
              {domainData.badge}
            </Text>
          ) : null}
        </View>

        {domainData ? (
          <>
            {/* North Star */}
            <Text
              style={{
                fontSize: 7.5,
                fontWeight: "bold",
                color: colors.tertiary,
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 2,
              }}
            >
              North Star Metric
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: colors.primaryText,
                lineHeight: 1.1,
                marginBottom: 5,
              }}
            >
              {domainData.northStar}{" "}
              <Text style={{ color: colors.primary }}>{domainData.direction}</Text>
            </Text>

            {/* Sub narrative — capped at 3 lines to fit within one-page budget */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Text
              style={{ fontSize: 9.5, color: "#444444", lineHeight: 1.5, marginBottom: 8 }}
              {...({ numberOfLines: 3 } as any)}
            >
              {domainData.sub}
            </Text>

            {/* Matters most if */}
            <View
              style={{
                backgroundColor: colors.cards,
                padding: 8,
                borderRadius: 4,
                marginBottom: 8,
              }}
              wrap={false}
            >
              <Text
                style={{
                  fontSize: 7.5,
                  fontWeight: "bold",
                  color: colors.secondary,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  marginBottom: 3,
                }}
              >
                Matters most if…
              </Text>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Text style={{ fontSize: 8.5, color: "#555555", lineHeight: 1.45 }} {...({ numberOfLines: 3 } as any)}>
                {domainData.matterMostIf}
              </Text>
            </View>

            {/* Divider */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.separator, marginBottom: 6 }} />

            {/* Causal chain */}
            <Text
              style={{
                fontSize: 7.5,
                fontWeight: "bold",
                color: colors.tertiary,
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              How Abridge Gets There
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 4,
                  marginRight: 5,
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#FFFFFF" }}>
                  Abridge Ambient
                </Text>
              </View>
              {domainData.chain.map((step, i) => (
                <View
                  key={i}
                  style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}
                >
                  <Text style={{ fontSize: 9, color: "#C4BBAD", marginRight: 5 }}>→</Text>
                  <View
                    style={{
                      backgroundColor: colors.cards,
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      borderRadius: 4,
                      marginRight: 5,
                    }}
                  >
                    <Text style={{ fontSize: 7.5, color: "#444444" }}>{step}</Text>
                  </View>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: "#C4BBAD", marginRight: 5 }}>→</Text>
                <View
                  style={{
                    borderWidth: 1.5,
                    borderColor: colors.primary,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 7.5, fontWeight: "bold", color: colors.primary }}>
                    {domainData.chainOutput}
                  </Text>
                </View>
              </View>
            </View>

          </>
        ) : null}

        {/* ─── Divider before model section ─── */}
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: colors.separator,
            marginTop: 4,
            marginBottom: 8,
          }}
        />

        {/* ─── What's modeled ─── */}
        <Text style={[styles.subSectionHeader, { marginTop: 2, marginBottom: 5 }]}>What's Included in Your Model</Text>

        {isEmpty ? (
          <Text
            style={{ fontSize: 10, color: colors.tertiary, fontStyle: "italic", paddingVertical: 6 }}
          >
            No drivers selected for this quadrant. Enable drivers in the model to
            populate this section.
          </Text>
        ) : (
          <>
            {visibleQuantified.map((d, idx) => {
              // When no benefit cards follow, the last quantified card wraps
              // with HeroSubtotal so they always land on the same physical page.
              const isLast = q.otherFinancialBenefits.length === 0 && idx === visibleQuantified.length - 1;
              if (isLast) {
                return (
                  <View key={d.id} wrap={false}>
                    <CompactDriverCard
                      name={d.label}
                      value={fmtCurrency(d.value)}
                      body={d.shortDescription}
                      formula={d.calcSummary}
                      linkedTag={d.isChild}
                    />
                    <HeroSubtotal
                      label={subtotalLabel}
                      total={subtotalTotal}
                      caption={subtotalCaption}
                      totalIsTracked={subtotalIsTracked}
                    />
                  </View>
                );
              }
              return (
                <CompactDriverCard
                  key={d.id}
                  name={d.label}
                  value={fmtCurrency(d.value)}
                  body={d.shortDescription}
                  formula={d.calcSummary}
                  linkedTag={d.isChild}
                />
              );
            })}
            {q.otherFinancialBenefits.map((b, i, arr) => {
              const isLast = i === arr.length - 1;
              if (isLast) {
                return (
                  <View key={`b-${i}`} wrap={false}>
                    <CompactDriverCard
                      name={b.label}
                      value={`${fmtCurrency(b.amount)} ${b.type === "annual" ? "annual" : "one-time"}`}
                      body="Other financial benefit configured for this quadrant."
                    />
                    <HeroSubtotal
                      label={subtotalLabel}
                      total={subtotalTotal}
                      caption={subtotalCaption}
                      totalIsTracked={subtotalIsTracked}
                    />
                  </View>
                );
              }
              return (
                <CompactDriverCard
                  key={`b-${i}`}
                  name={b.label}
                  value={`${fmtCurrency(b.amount)} ${b.type === "annual" ? "annual" : "one-time"}`}
                  body="Other financial benefit configured for this quadrant."
                />
              );
            })}
            {/* Qualitative drivers rendered separately below the subtotal */}
          </>
        )}

        {/* Standalone HeroSubtotal for: (a) isEmpty — no drivers at all, or
            (b) all drivers are qualitative-only (e.g. Quality quadrant tracked state) */}
        {(isEmpty || (visibleQuantified.length === 0 && q.otherFinancialBenefits.length === 0)) && (
          <HeroSubtotal
            label={subtotalLabel}
            total={subtotalTotal}
            caption={subtotalCaption}
            totalIsTracked={subtotalIsTracked}
          />
        )}

        {/* ─── Tracked Signals — qualitative drivers with their own section ─── */}
        {qualitative.filter((d) => d.isIncluded !== false).length > 0 ? (
          <>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.separator, marginTop: 4, marginBottom: 6 }} />
            <Text style={{ fontSize: 7.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
              Tracked Signals
            </Text>
            {qualitative.filter((d) => d.isIncluded !== false).map((d) => (
              <View key={d.id} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }} wrap={false}>
                <Text style={{ fontSize: 7.5, color: colors.tertiary, marginRight: 5, marginTop: 1 }}>·</Text>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Text style={{ fontSize: 8.5, color: colors.secondary, flex: 1, lineHeight: 1.35 }} {...({ numberOfLines: 2 } as any)}>
                  {d.label}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        <PageFooter orgName={orgName} settingLabel={settingLabel} />
      </View>
    </Page>
  );
};

// ───────────────────────── Summary helpers ─────────────────────────

const SummaryGroup = ({
  label,
  total,
  rows,
}: {
  label: string;
  total: string;
  rows: { label: string; value: string }[];
}) => (
  <View style={{ marginBottom: 10 }} wrap={false}>
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
        paddingBottom: 4,
        marginBottom: 4,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "bold",
          color: colors.primaryText,
          textTransform: "uppercase",
          letterSpacing: 1.2,
        }}
      >
        {label}
      </Text>
      <Text
        style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}
      >
        {total}
      </Text>
    </View>
    {rows.length === 0 ? (
      <Text
        style={{ fontSize: 9.5, color: colors.tertiary, paddingLeft: 8 }}
      >
        — Not modeled in this assessment.
      </Text>
    ) : null}
    {rows.map((row, i) => (
      <View
        key={i}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingVertical: 2,
          paddingLeft: 8,
        }}
      >
        <Text style={{ fontSize: 9.5, color: colors.secondary, flex: 1 }}>
          {row.label}
        </Text>
        <Text style={{ fontSize: 9.5, color: colors.primaryText }}>{row.value}</Text>
      </View>
    ))}
  </View>
);

// Methodology bullets render at 9pt (not 8.5) — the reference Nursing PDF
// settled on 9pt as the readable floor for executive-document body copy.
// Each bullet is wrap={false}'d so a single bullet never splits across
// pages; the parent View is what wraps when the methodology section grows.
const MethodologyLine = ({ text }: { text: string }) => (
  <Text
    style={{
      fontSize: 8.5,
      color: colors.secondary,
      lineHeight: 1.4,
      marginBottom: 3,
    }}
    wrap={false}
  >
    {`• ${text}`}
  </Text>
);

// ───────────────────────── Document ─────────────────────────

export const ExploreNarrativePDFDocument = ({
  data,
}: {
  data: ExplorePDFData;
}) => {
  // Routing in ExploreModel sends nursing to its own dedicated generator, so
  // this document is only ever invoked for outpatient/ed/inpatient. If a
  // future regression routes nursing here, fall back to outpatient copy
  // rather than crashing on a missing dictionary lookup.
  const rawSetting = data.careSetting as ExploreCareSetting;
  const setting: Exclude<ExploreCareSetting, "nursing"> =
    rawSetting === "ed" || rawSetting === "inpatient" ? rawSetting : "outpatient";
  const orgName = data.clientName || "Organization";
  const settingLabel = data.careSettingLabel || settingShortLabel[setting];

  const subtitle = `${fmtNum(data.numberOfProviders)} providers · ${fmtNum(
    data.annualEncounters,
  )} encounters · ${settingLabel}`;

  const coverLabel = (() => {
    switch (setting) {
      case "ed":
        return "EMERGENCY DEPARTMENT VALUE ASSESSMENT";
      case "inpatient":
        return "INPATIENT VALUE ASSESSMENT";
      case "outpatient":
      default:
        return "OUTPATIENT VALUE ASSESSMENT";
    }
  })();

  const cap = data.quadrants.find((q) => q.quadrant === "Capacity");
  const wf = data.quadrants.find((q) => q.quadrant === "Workforce");
  const rev = data.quadrants.find((q) => q.quadrant === "Revenue");
  const ql = data.quadrants.find((q) => q.quadrant === "Quality");

  const capValue = cap?.annualTotal ?? 0;
  const wfValue = wf?.annualTotal ?? 0;
  const revValue = rev?.annualTotal ?? 0;
  const qlValue = ql?.annualTotal ?? 0;

  const renderQuadrantBigNumber = (value: number, framing: "tracked" | "value") => {
    if (value > 0) return fmtCurrency(value);
    if (framing === "tracked") return "Tracked";
    return "Not modeled";
  };

  // Investment / 3-year math
  // Use gross value / investment (same formula as Year 1 ROI and the Expansion card)
  // so all three multiples in the PDF are directly comparable.
  const cumulativeMultiple =
    data.threeYearInvestmentTotal > 0
      ? data.threeYearGrossTotal / data.threeYearInvestmentTotal
      : 0;

  const pricingPhrase = (() => {
    const annual = fmtCurrency(data.annualInvestment);
    if (data.pricingModel === "perProvider" && data.costPerProvider) {
      return `$${data.costPerProvider}/provider/month at ${fmtNum(
        data.numberOfProviders,
      )} providers totals ${annual}`;
    }
    if (data.pricingModel === "perEncounter" && data.costPerEncounter) {
      return `${fmtCurrencyExact(data.costPerEncounter)}/encounter applied to ${fmtNum(
        data.annualEncounters,
      )} encounters totals ${annual}`;
    }
    if (data.pricingModel === "annual" && data.annualLicenseFee) {
      return `a fixed annual license of ${fmtCurrency(data.annualLicenseFee)}`;
    }
    return `${annual} annually`;
  })();

  // The impl-fee phrase tells the reader exactly WHERE the fee shows up
  // (its own row above the recurring stream) rather than the vague
  // "applies separately." This matches the Nursing PDF prose convention
  // codified in replit.md > Implementation Fee Treatment.
  const showImplFeeRow =
    data.includeImplementation && data.implementationFee > 0;
  const implPhrase = showImplFeeRow
    ? ` A one-time implementation fee of ${fmtCurrency(
        data.implementationFee,
      )} is shown separately on its own row above the recurring stream so the Year 1–3 economics below stay comparable.`
    : "";

  return (
    <Document>
      <PDFCoverPage
        reportLabel={coverLabel}
        title={orgName}
        subtitle={subtitle}
        preparedBy={`${data.preparedBy} · ${data.date}`}
      />

      {/* PAGE — MODEL SNAPSHOT
          Executive brief: who this was built for, what was modeled on the
          call, and the bottom-line financials. Works as a standalone
          leave-behind — a CFO forwarded this page alone has everything
          needed to understand the investment case. */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>MODEL SNAPSHOT</SectionLabel>

          {/* Org identity */}
          <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.1, marginBottom: 4 }}>
            {orgName}
          </Text>
          <Text style={{ fontSize: 8.5, color: colors.tertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
            {`${settingShortLabel[setting]}  ·  ${fmtNum(data.numberOfProviders)} Providers  ·  ${fmtNum(data.annualEncounters)} Encounters / Yr`}
          </Text>

          <View style={{ borderBottomWidth: 1.5, borderBottomColor: colors.separatorHeavy, marginBottom: 14 }} />

          {/* ─── Thesis — frames the "why" before the numbers ─── */}
          <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.3, marginBottom: 4 }}>
            {settingThesisHeadline[setting]}
          </Text>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }} {...({ numberOfLines: 3 } as any)}>
            {getThesisIntro(data, setting)}
          </Text>

          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.separator, marginBottom: 10 }} />

          {/* ─── The Bottom Line — hero first ─── */}
          <View
            style={{
              backgroundColor: colors.cards,
              borderRadius: 4,
              paddingHorizontal: 18,
              paddingVertical: 12,
              marginBottom: 10,
            }}
            wrap={false}
          >
            <Text style={{ fontSize: 7.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 8 }}>
              The Bottom Line
            </Text>
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1.2, paddingRight: 14, borderRightWidth: 1, borderRightColor: colors.separator }}>
                <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Net Annual Value</Text>
                <Text style={{ fontSize: 34, fontWeight: "bold", color: colors.primary, lineHeight: 1.0, marginBottom: 5 }}>
                  {fmtCurrency(data.netAnnualValue)}
                </Text>
                <Text style={{ fontSize: 8, color: colors.tertiary }}>After recurring investment, Year 1</Text>
              </View>
              <View style={{ flex: 0.65, paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: colors.separator }}>
                <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Year 1 ROI</Text>
                <Text style={{ fontSize: 34, fontWeight: "bold", color: colors.primary, lineHeight: 1.0, marginBottom: 5 }}>
                  {`${data.roi.toFixed(1)}×`}
                </Text>
                <Text style={{ fontSize: 8, color: colors.tertiary }}>Per dollar invested (projected)</Text>
              </View>
              <View style={{ flex: 1.1, paddingLeft: 14 }}>
                <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>3-Year Net Value</Text>
                <Text style={{ fontSize: 34, fontWeight: "bold", color: colors.primary, lineHeight: 1.0, marginBottom: 5 }}>
                  {fmtCurrency(data.threeYearNetTotal)}
                </Text>
                <Text style={{ fontSize: 8, color: colors.tertiary }}>
                  {`Yr 2 +${data.year2GrowthPercent}%  ·  Yr 3 +${data.year3GrowthPercent}%`}
                </Text>
              </View>
            </View>
          </View>

          {/* ─── What was modeled ─── */}
          <Text style={{ fontSize: 7.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 6 }}>
            What Was Modeled on This Call
          </Text>

          <View style={{ flexDirection: "row", marginBottom: 10 }} wrap={false}>
            <View style={{ flex: 1.3, backgroundColor: colors.cards, borderRadius: 4, padding: 12, marginRight: 6 }}>
              <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Time Path</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.0, marginBottom: 5 }}>
                {data.timePathScenario || "Custom"}
              </Text>
              <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.4 }}>
                {`${data.minutesSavedPerEncounter} min saved/encounter  ·  ${fmtNum(data.totalHoursSaved)} hrs returned/yr`}
              </Text>
            </View>
            <View style={{ flex: 0.75, backgroundColor: colors.cards, borderRadius: 4, padding: 12, marginRight: 6 }}>
              <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Utilization</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.0, marginBottom: 5 }}>
                {`${data.utilizationPercent}%`}
              </Text>
              <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.4 }}>
                Of encounters on ambient
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.cards, borderRadius: 4, padding: 12 }}>
              <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Annual Investment</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.0, marginBottom: 5 }}>
                {fmtCurrency(data.annualInvestment)}
              </Text>
              <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.4 }}>
                {data.pricingModel === "perProvider" && data.costPerProvider
                  ? `$${data.costPerProvider}/provider/mo · ${fmtNum(data.numberOfProviders)} providers`
                  : data.pricingModel === "perEncounter" && data.costPerEncounter
                    ? `$${data.costPerEncounter}/encounter · recurring`
                    : "Annual license · recurring"}
              </Text>
            </View>
          </View>

          {/* ─── Value by Domain + Drivers side-by-side ─── */}
          {(() => {
            const allQ = data.quadrants.flatMap((q) =>
              q.drivers.filter((d) => d.visibility === "quantified" && d.isIncluded !== false && !d.isChild)
            );
            const allT = data.quadrants.flatMap((q) =>
              q.drivers.filter((d) => d.visibility === "qualitative" && d.isIncluded !== false)
            );

            const domainTile = (q: typeof cap, marginRight: number) => {
              if (!q) return null;
              const isTracked = q.quadrant === "Quality" && q.annualTotal === 0;
              const value = isTracked ? "Tracked" : q.annualTotal > 0 ? fmtCurrency(q.annualTotal) : "—";
              const domKey = q.quadrant.toUpperCase() as "CAPACITY" | "WORKFORCE" | "REVENUE" | "QUALITY";
              const qCount = q.drivers.filter((d) => d.visibility === "quantified" && d.isIncluded !== false).length;
              const tCount = q.drivers.filter((d) => d.visibility === "qualitative" && d.isIncluded !== false).length;
              const caption = [qCount > 0 ? `${qCount} quantified` : null, tCount > 0 ? `${tCount} tracked` : null].filter(Boolean).join("  ·  ");
              return (
                <View style={{ flex: 1, backgroundColor: colors.cards, borderRadius: 4, padding: 12, marginRight }}>
                  <DomainPill domain={domKey} />
                  <Text style={{ fontSize: isTracked ? 13 : 22, fontWeight: "bold", fontStyle: isTracked ? "italic" : "normal", color: isTracked ? colors.secondary : colors.primaryText, lineHeight: 1.0, marginTop: 8, marginBottom: 4 }}>
                    {value}
                  </Text>
                  <Text style={{ fontSize: 7.5, color: colors.tertiary }}>{caption || "—"}</Text>
                </View>
              );
            };

            return (
              <View style={{ flexDirection: "row" }}>
                {/* Left: 2×2 domain tiles using explicit rows — no flexWrap */}
                <View style={{ flex: 1, marginRight: 14 }}>
                  <Text style={{ fontSize: 7.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 6 }}>
                    Value by Domain
                  </Text>
                  <View style={{ flexDirection: "row", marginBottom: 4 }} wrap={false}>
                    {domainTile(cap, 6)}
                    {domainTile(wf, 0)}
                  </View>
                  <View style={{ flexDirection: "row" }} wrap={false}>
                    {domainTile(rev, 6)}
                    {domainTile(ql, 0)}
                  </View>
                </View>

                {/* Right: quantified drivers + tracked signals */}
                <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: colors.separator, paddingLeft: 14 }}>
                  {allQ.length > 0 && (
                    <>
                      <Text style={{ fontSize: 7.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 6 }}>
                        Quantified Drivers
                      </Text>
                      {allQ.map((d) => {
                        const parentQ = data.quadrants.find((q) => q.drivers.some((dr) => dr.id === d.id));
                        return (
                          <View key={d.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.separator }} wrap={false}>
                            <Text style={{ fontSize: 9, color: colors.primaryText, flex: 1, paddingRight: 8, lineHeight: 1.3 }}>
                              {d.label}
                              {parentQ ? <Text style={{ fontSize: 7.5, color: colors.tertiary }}>{`  ${parentQ.quadrant}`}</Text> : null}
                            </Text>
                            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>
                              {fmtCurrency(d.value)}
                            </Text>
                          </View>
                        );
                      })}
                    </>
                  )}
                  {allT.length > 0 && (
                    <View style={{ marginTop: allQ.length > 0 ? 10 : 0 }}>
                      <Text style={{ fontSize: 7.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 5 }}>
                        Tracked Signals
                      </Text>
                      <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>
                        {allT.map((d) => d.label).join("  ·  ")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })()}

          <PageFooter orgName={orgName} settingLabel={settingLabel} />
        </View>
      </Page>


      {/* PAGES — One per quadrant in fixed order */}
      {(["Capacity", "Workforce", "Revenue", "Quality"] as const).map((q) => {
        const quadrant = data.quadrants.find((x) => x.quadrant === q);
        if (!quadrant) return null;
        return (
          <QuadrantPage
            key={q}
            q={quadrant}
            setting={setting}
            orgName={orgName}
            settingLabel={settingLabel}
            isQualityForNonNursing={q === "Quality"}
          />
        );
      })}

      {/* PAGE — INVESTMENT CASE */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>THE INVESTMENT CASE</SectionLabel>
          <Text style={styles.sectionHeadline}>The Investment Case.</Text>
          <Text style={styles.body}>
            {`Recurring investment is ${pricingPhrase}.${implPhrase} The table below shows Year 1 outcomes at three adoption levels — conservative (−25% of modeled value), base case, and optimistic (+25%). No growth assumptions are applied; each column reflects the annual value at that utilization level held constant.`}
          </Text>

          {/* Sensitivity Analysis table — Year 1 at ±25% adoption */}
          {(() => {
            const baseValue = data.totalAnnualValue;
            const inv = data.annualInvestment;
            const conservativeValue = Math.round(baseValue * 0.75);
            const optimisticValue = Math.round(baseValue * 1.25);
            const conservativeNet = conservativeValue - inv;
            const baseNet = baseValue - inv;
            const optimisticNet = optimisticValue - inv;
            const conservativeRoi = inv > 0 ? conservativeValue / inv : 0;
            const baseRoi = inv > 0 ? baseValue / inv : 0;
            const optimisticRoi = inv > 0 ? optimisticValue / inv : 0;

            const rows = [
              { label: "Annual Value", conservative: fmtCurrency(conservativeValue), base: fmtCurrency(baseValue), optimistic: fmtCurrency(optimisticValue), highlight: false, muted: false },
              { label: "Annual Investment", conservative: fmtCurrency(inv), base: fmtCurrency(inv), optimistic: fmtCurrency(inv), highlight: false, muted: true },
              { label: "Net Annual Value", conservative: fmtCurrency(conservativeNet), base: fmtCurrency(baseNet), optimistic: fmtCurrency(optimisticNet), highlight: true, muted: false },
              { label: "Year 1 ROI", conservative: `${conservativeRoi.toFixed(1)}×`, base: `${baseRoi.toFixed(1)}×`, optimistic: `${optimisticRoi.toFixed(1)}×`, highlight: true, muted: false },
            ];

            return (
              <View style={{ marginBottom: 10, borderRadius: 4, borderWidth: 1, borderColor: "#E5DCD0" }}>
                {/* Header */}
                <View style={{ flexDirection: "row", backgroundColor: colors.cards, paddingVertical: 8, paddingHorizontal: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
                  <View style={{ flex: 1.5 }} />
                  <View style={{ flex: 1.1, alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 7.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 0.8 }}>Conservative</Text>
                    <Text style={{ fontSize: 7, color: colors.tertiary }}>−25% adoption</Text>
                  </View>
                  <View style={{ flex: 1.1, alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 7.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 0.8 }}>Base Case</Text>
                    <Text style={{ fontSize: 7, color: colors.secondary }}>configured model</Text>
                  </View>
                  <View style={{ flex: 1.1, alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 7.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 0.8 }}>Optimistic</Text>
                    <Text style={{ fontSize: 7, color: colors.tertiary }}>+25% adoption</Text>
                  </View>
                </View>
                {/* Rows */}
                {rows.map((row, idx) => (
                  <View
                    key={row.label}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 7,
                      paddingHorizontal: 10,
                      backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F5F0EB",
                      borderTopWidth: row.highlight ? 1.5 : 0,
                      borderTopColor: "#E5DCD0",
                    }}
                  >
                    <Text style={{ flex: 1.5, fontSize: 9, color: row.highlight ? colors.primaryText : colors.secondary, fontWeight: row.highlight ? "bold" : "normal" }}>{row.label}</Text>
                    <Text style={{ flex: 1.1, fontSize: 9, color: row.muted ? colors.tertiary : colors.secondary, textAlign: "right" }}>{row.conservative}</Text>
                    <Text style={{ flex: 1.1, fontSize: row.highlight ? 10 : 9, fontWeight: row.highlight ? "bold" : "normal", color: row.highlight ? colors.primary : (row.muted ? colors.tertiary : colors.primaryText), textAlign: "right" }}>{row.base}</Text>
                    <Text style={{ flex: 1.1, fontSize: 9, color: row.muted ? colors.tertiary : colors.secondary, textAlign: "right" }}>{row.optimistic}</Text>
                  </View>
                ))}
                {showImplFeeRow && (
                  <View style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.cards, borderTopWidth: 1, borderTopColor: "#E5DCD0" }}>
                    <Text style={{ fontSize: 8, fontStyle: "italic", color: colors.secondary }}>
                      {`One-time implementation: ${fmtCurrency(data.implementationFee)} — tracked separately, not included in rows above.`}
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}


          {/* True Year 1 outlay footnote — only renders when an impl fee
              exists. Directly answers the most common reader question:
              "why isn't the implementation fee in Year 1?" Pre-computes
              the sum so the reader doesn't have to do mental math. This
              footnote + the One-Time row above + the named-location prose
              are the three-part articulation pattern codified in
              replit.md > Implementation Fee Treatment. */}
          {showImplFeeRow && (
            <View
              style={{
                marginBottom: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: colors.cards,
                borderRadius: 4,
                borderLeftWidth: 2,
                borderLeftColor: colors.secondary,
              }}
              wrap={false}
            >
              <Text style={{ fontSize: 9, color: colors.primaryText, lineHeight: 1.55 }}>
                <Text style={{ fontWeight: "bold" }}>True Year 1 cash outlay:</Text>
                {` ${fmtCurrency(data.year1Investment + data.implementationFee)} `}
                <Text style={{ color: colors.secondary }}>
                  ({fmtCurrency(data.year1Investment)} recurring + {fmtCurrency(data.implementationFee)} one-time implementation).
                  The Year 1 row above shows recurring economics only so the 3-year cumulative multiple isn't distorted by a one-time setup charge.
                </Text>
              </Text>
            </View>
          )}

          {/* Cost Displacement callout — only renders when items are present */}
          {(data.costDisplacementItems ?? []).length > 0 && (
            <SectionLabel>COST DISPLACEMENT</SectionLabel>
          )}
          {(data.costDisplacementItems ?? []).length > 0 && (() => {
            const items = data.costDisplacementItems!;
            const totals = data.costDisplacementTotals ?? (() => {
              const annual = items.reduce((s, item) => s + (item.annualSpend * item.displacementPct / 100), 0);
              return { year1: Math.round(annual * 0.5), year2: Math.round(annual), year3: Math.round(annual) };
            })();
            const threeYear = totals.year1 + totals.year2 + totals.year3;
            return (
              <View
                style={{
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: "#E5DCD0",
                  borderRadius: 4,
                }}
              >
                {/* Dark header */}
                <View style={{ backgroundColor: "#1A1A1A", paddingHorizontal: 12, paddingVertical: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 1 }}>
                      Cost Displacement
                    </Text>
                    <Text style={{ fontSize: 7.5, color: "#999999" }}>
                      Existing tool spend displaced by Abridge — separate from clinical value above
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: "#FFFFFF" }}>
                    {fmtCurrency(threeYear)}
                  </Text>
                </View>
                {/* Items */}
                {items.map((item, i) => {
                  const displaced = item.annualSpend * item.displacementPct / 100;
                  return (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderBottomWidth: i < items.length - 1 ? 1 : 0,
                        borderBottomColor: "#F0EDED",
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, flex: 2 }}>
                        {item.label || "Unnamed tool"}
                      </Text>
                      <Text style={{ fontSize: 8.5, color: colors.secondary, flex: 1.2, textAlign: "right" }}>
                        {`${item.displacementPct}% of ${fmtCurrency(item.annualSpend)}/yr`}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary, flex: 0.8, textAlign: "right" }}>
                        {`${fmtCurrency(displaced)}/yr`}
                      </Text>
                    </View>
                  );
                })}
                {/* Per-year summary footer — single row: label inline with value */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.cards, paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#E5DCD0" }}>
                  <View style={{ flexDirection: "row" }}>
                    {[
                      { label: "Yr 1", value: totals.year1 },
                      { label: "Yr 2", value: totals.year2 },
                      { label: "Yr 3", value: totals.year3 },
                    ].map(({ label, value }) => (
                      <View key={label} style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                        <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.8, marginRight: 4 }}>{label}</Text>
                        <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(value)}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.8, marginRight: 4 }}>3-Yr Total</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(threeYear)}</Text>
                  </View>
                </View>
                {/* Combined case footer — single row */}
                {(() => {
                  const combinedNetY1 = data.netAnnualValue + totals.year1;
                  const combinedRoiY1 = data.annualInvestment > 0
                    ? (data.roi * data.annualInvestment + totals.year1) / data.annualInvestment
                    : 0;
                  const combinedThreeYear = data.threeYearNetTotal + threeYear;
                  return (
                    <View style={{ backgroundColor: "#1A1A1A", paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ fontSize: 6.5, color: "#555555", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "bold", marginRight: 14 }}>
                        w/ displacement:
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                        <Text style={{ fontSize: 6.5, color: "#777777", textTransform: "uppercase", letterSpacing: 0.8, marginRight: 4 }}>Net Annual</Text>
                        <Text style={{ fontSize: 11, fontWeight: "bold", color: "#FFFFFF" }}>{fmtCurrency(combinedNetY1)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                        <Text style={{ fontSize: 6.5, color: "#777777", textTransform: "uppercase", letterSpacing: 0.8, marginRight: 4 }}>Yr 1 ROI</Text>
                        <Text style={{ fontSize: 11, fontWeight: "bold", color: "#FFFFFF" }}>{combinedRoiY1.toFixed(1)}×</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ fontSize: 6.5, color: "#777777", textTransform: "uppercase", letterSpacing: 0.8, marginRight: 4 }}>3-Yr Net</Text>
                        <Text style={{ fontSize: 11, fontWeight: "bold", color: "#FFFFFF" }}>{fmtCurrency(combinedThreeYear)}</Text>
                      </View>
                    </View>
                  );
                })()}
              </View>
            );
          })()}

          {/* Expansion Opportunity — nursing-style two-card layout */}
          {data.expansionProviders && (data.expansionProviders > data.numberOfProviders || (data.expansionUtilizationPercent ?? 0) > data.utilizationPercent) ? (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 8, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 4 }}>
                The Expansion Opportunity
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 5, lineHeight: 1.2 }}>
                The same model, applied at full deployment.
              </Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }}>
                {`The base case above reflects your current configuration — ${fmtNum(data.numberOfProviders)} providers at ${data.utilizationPercent}% utilization. The scenario below applies identical unit economics at full-scale deployment. Cost per provider is unchanged; the return scales with volume.`}
              </Text>
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                {/* Left — Today's Value (gray) */}
                <View style={{ flex: 1, backgroundColor: colors.cards, borderRadius: 4, padding: 10, marginRight: 6 }}>
                  <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 5 }}>
                    Today's Value
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.0, marginBottom: 1 }}>
                    {fmtCurrency(data.netAnnualValue)}
                  </Text>
                  <Text style={{ fontSize: 7.5, color: colors.secondary, marginBottom: 6 }}>/ year net</Text>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 6 }}>
                    {`${data.roi.toFixed(1)}× ROI`}
                  </Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: 6, flexDirection: "row", gap: 10 }}>
                    <Text style={{ fontSize: 8, color: colors.secondary }}>
                      {`${fmtNum(data.numberOfProviders)} providers`}
                    </Text>
                    <Text style={{ fontSize: 8, color: colors.secondary }}>
                      {`${data.utilizationPercent}% util`}
                    </Text>
                    {data.annualEncounters ? (
                      <Text style={{ fontSize: 8, color: colors.secondary }}>
                        {`${fmtNum(data.annualEncounters)} enc/yr`}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {/* Right — Full Scale Value (red) */}
                <View style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 4, padding: 10 }}>
                  <Text style={{ fontSize: 7, color: "#FFCABB", textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 5 }}>
                    Full Scale Value
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: "bold", color: "#FFFFFF", lineHeight: 1.0, marginBottom: 1 }}>
                    {fmtCurrency(data.expansionAnnualValue ?? 0)}
                  </Text>
                  <Text style={{ fontSize: 7.5, color: "#FFCABB", marginBottom: 6 }}>/ year net</Text>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: "#FFFFFF", marginBottom: 6 }}>
                    {`${(data.expansionRoi ?? 0).toFixed(1)}× ROI`}
                  </Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: "#EF6140", paddingTop: 6, flexDirection: "row", gap: 10 }}>
                    <Text style={{ fontSize: 8, color: "#FFCABB" }}>
                      {`${fmtNum(data.expansionProviders)} providers`}
                    </Text>
                    <Text style={{ fontSize: 8, color: "#FFCABB" }}>
                      {`${data.expansionUtilizationPercent ?? data.utilizationPercent}% util`}
                    </Text>
                    {data.expansionEncounters ? (
                      <Text style={{ fontSize: 8, color: "#FFCABB" }}>
                        {`${fmtNum(data.expansionEncounters)} enc/yr`}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          ) : null}

          <PageFooter orgName={orgName} settingLabel={settingLabel} />
        </View>
      </Page>

      {/* PAGE — ASSESSMENT SUMMARY + METHODOLOGY */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.pageWrapper}>
          <SectionLabel>YOUR ASSESSMENT SUMMARY</SectionLabel>

          {/* Hero card — eyebrow / headline number / footnote pattern. The
              figure stands alone at hero size (36pt) so it can carry the
              page; descriptive context lives in the eyebrow above and the
              metadata footer below. Previously the figure was glued inline
              to the words "projected net value" in a single 24pt Text
              node, which capped how big the number could go without
              wrapping. Mirrors the Nursing PDF's hero geometry exactly. */}
          <View style={[styles.cardBg, { marginBottom: 16, paddingVertical: 18 }]}>
            <Text
              style={{
                fontSize: 8.5,
                color: colors.secondary,
                textTransform: "uppercase",
                letterSpacing: 2.5,
                fontWeight: "bold",
                marginBottom: 8,
              }}
            >
              Projected Net Annual Value
            </Text>
            <Text
              style={{
                fontSize: 36,
                fontWeight: "bold",
                color: colors.primary,
                lineHeight: 1.0,
                marginBottom: 10,
              }}
            >
              {fmtCurrency(data.netAnnualValue)}
            </Text>
            <Text style={{ fontSize: 9.5, color: colors.secondary }}>
              {`${fmtNum(data.numberOfProviders)} providers · ${fmtNum(
                data.annualEncounters,
              )} encounters · ${fmtCurrency(data.valuePerProvider)}/provider per year · ${data.roi.toFixed(1)}× Year 1 ROI`}
            </Text>
          </View>

          <Text style={styles.subSectionHeader}>Value Summary</Text>

          {/* Row 1 */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
            {(["Capacity", "Workforce"] as const).map((qLabel) => {
              const q = data.quadrants.find((x) => x.quadrant === qLabel);
              if (!q) return null;
              const total =
                q.annualTotal > 0
                  ? fmtCurrency(q.annualTotal)
                  : "—";
              const rows = [
                ...q.drivers.map((d) => ({
                  label: d.label,
                  value: d.visibility === "quantified" ? fmtCurrency(d.value) : "Tracked",
                })),
                ...q.otherFinancialBenefits.map((b) => ({
                  label: b.label,
                  value: `${fmtCurrency(b.amount)} ${b.type === "annual" ? "annual" : "one-time"}`,
                })),
              ];
              return (
                <View key={qLabel} style={{ flex: 1 }}>
                  <SummaryGroup label={qLabel.toUpperCase()} total={total} rows={rows} />
                </View>
              );
            })}
          </View>
          {/* Row 2 */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            {(["Revenue", "Quality"] as const).map((qLabel) => {
              const q = data.quadrants.find((x) => x.quadrant === qLabel);
              if (!q) return null;
              const total =
                qLabel === "Quality" && q.annualTotal === 0
                  ? "Tracked"
                  : q.annualTotal > 0
                    ? fmtCurrency(q.annualTotal)
                    : "—";
              const rows = [
                ...q.drivers.map((d) => ({
                  label: d.label,
                  value: d.visibility === "quantified" ? fmtCurrency(d.value) : "Tracked",
                })),
                ...q.otherFinancialBenefits.map((b) => ({
                  label: b.label,
                  value: `${fmtCurrency(b.amount)} ${b.type === "annual" ? "annual" : "one-time"}`,
                })),
              ];
              return (
                <View key={qLabel} style={{ flex: 1 }}>
                  <SummaryGroup label={qLabel.toUpperCase()} total={total} rows={rows} />
                </View>
              );
            })}
          </View>

          {/* Net annual value row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopWidth: 1,
              borderTopColor: colors.separatorHeavy,
              paddingTop: 10,
              marginTop: 4,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: colors.primaryText,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Net Annual Value (Year 1)
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "bold",
                color: colors.primary,
              }}
            >
              {fmtCurrency(data.netAnnualValue)}
            </Text>
          </View>

          {/* HOW TO VALIDATE — turns the modeled case into a defended case */}
          <Text style={[styles.subSectionHeader, { marginTop: 6 }]}>How to Validate</Text>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }}>
              These milestones map to data your team already has access to — each one converts a modeled assumption into an observed result.
            </Text>
            {settingValidationMilestones[setting].map((m, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  paddingVertical: 7,
                  borderBottomWidth: i < 2 ? 1 : 0,
                  borderBottomColor: colors.separator,
                }}
                wrap={false}
              >
                <View style={{ width: 68 }}>
                  <Text style={{ fontSize: 7.5, fontWeight: "bold", color: colors.primary, letterSpacing: 0.3, lineHeight: 1.3 }}>
                    {m.window}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 2, lineHeight: 1.3 }}>
                    {m.metric}
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, lineHeight: 1.3 }}>
                    {m.source}
                  </Text>
                </View>
                <View style={{ width: 90, paddingLeft: 8 }}>
                  <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.4 }}>
                    {m.owner}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <PageFooter orgName={orgName} settingLabel={settingLabel} />
        </View>
      </Page>

      {/* PAGE — METHODOLOGY */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.pageWrapper}>
          <SectionLabel>METHODOLOGY</SectionLabel>
          <Text style={styles.sectionHeadline}>How the Model Works.</Text>
          <View>
            <MethodologyLine
              text={`Time-savings scenario: ${(data.timePathScenario || "custom").toLowerCase()} — ${data.minutesSavedPerEncounter} minutes saved per encounter, totaling ${fmtNum(data.totalHoursSaved)} hours returned annually across ${fmtNum(data.numberOfProviders)} providers at ${fmtNum(data.annualEncounters)} encounters per year. Recovered time is not counted as value itself — it is the resource pool that drives Capacity and Workforce calculations downstream.`}
            />
            <MethodologyLine
              text="Quadrant structure: Value is organized into four independent domains. Capacity captures time freed for additional patient volume or visit throughput. Workforce captures burnout reduction, turnover avoidance, and time-on-task improvements. Revenue captures new or recovered billing opportunity from documentation completeness and care gap closure. Quality captures documentation accuracy and compliance improvements that drive downstream program performance. Each quadrant is modeled independently so individual assumptions can be tested or replaced without affecting others. Financial drivers carry explicit $ math; qualitative drivers are excluded from totals and tracked post-deployment as leading indicators."
            />
            {(["Capacity", "Workforce", "Revenue", "Quality"] as const).map(
              (qLabel) => {
                const q = data.quadrants.find((x) => x.quadrant === qLabel);
                if (!q) return null;
                const quantified = q.drivers.filter(
                  (d) => d.visibility === "quantified",
                );
                if (quantified.length === 0) return null;
                return quantified.map((d) => (
                  <MethodologyLine
                    key={`${qLabel}-${d.id}`}
                    text={`${d.label} (${qLabel}): ${d.shortDescription} The modeled value for this driver is ${fmtCurrency(d.value)} annually, based on the inputs configured for this assessment. This figure reflects the realization-adjusted estimate; the gross calculation and per-factor breakdown appear on the ${qLabel} page.`}
                  />
                ));
              },
            )}
            <MethodologyLine
              text={`Investment basis: The recurring annual investment is calculated ${data.pricingModel === "perProvider" ? `per provider at the configured rate across ${fmtNum(data.numberOfProviders)} providers` : data.pricingModel === "perEncounter" ? `per encounter across ${fmtNum(data.annualEncounters)} annual encounters — investment scales proportionally with volume` : "as a fixed annual license fee regardless of provider count or volume"}. ${data.includeImplementation && data.implementationFee > 0 ? `A one-time implementation fee of ${fmtCurrency(data.implementationFee)} is excluded from the Year 1 base case and surfaced separately so the ROI reflects steady-state economics, not a setup-loaded first year.` : "No implementation fee is included in this assessment."}`}
            />
            <MethodologyLine
              text={`Scenario sensitivity: Instead of projecting multi-year growth, this assessment presents Year 1 outcomes across three adoption levels — conservative (−25%), base case (configured inputs), and optimistic (+25%). Investment is held constant in each scenario. This framing is more defensible than applying assumed annual growth rates, which carry meaningful uncertainty in early-stage deployments. If utilization and adoption play out as modeled, the base case is the expected outcome; conservative and optimistic bound the realistic range.`}
            />
            <MethodologyLine
              text="Realization & confidence: Every financial driver applies a realization rate that scales back the gross modeled figure to reflect real-world operational adoption, workflow variation, and partner-specific factors. Rates are calibrated to published benchmarks from comparable deployments and are visible on each driver card. This assessment uses inputs you provided; no figure is fabricated or extrapolated beyond the configured scenario. Treat this as a planning-stage estimate — validate all key assumptions against your organization's own operational data before using these projections in contracting or budgeting decisions."
            />
          </View>

          <Text
            style={{
              fontSize: 8.5,
              fontStyle: "italic",
              color: colors.tertiary,
              lineHeight: 1.45,
              marginTop: 10,
            }}
          >
            This assessment is for planning purposes only. Financial projections
            are based on user-provided inputs and published benchmarks; actual
            results will vary based on implementation, clinical workflow, and
            adoption factors specific to your organization. Qualitative drivers
            are tracked post-deployment and excluded from financial totals.
            Validate all assumptions with your organization's data before
            making financial decisions.
          </Text>

          <PageFooter orgName={orgName} settingLabel={settingLabel} />
        </View>
      </Page>
    </Document>
  );
};
