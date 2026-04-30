import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import abridgeWordmark from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import type {
  ExplorePDFData,
  ExploreCareSetting,
  ExplorePDFQuadrantData,
} from "./ExplorePDFExport";

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
    padding: 54,
    // paddingBottom must reserve room for the fixed footer:
    //   footer.bottom (28) + footer height (~border 1 + paddingTop 10 + content ~12) ≈ 51pt.
    // Leave ~21pt of breathing room above the footer to prevent collisions.
    // See pdf_layout_guidelines.md §1 for the canonical math check.
    paddingBottom: 72,
    fontFamily: "Manrope",
    fontSize: 10.5,
    color: colors.primaryText,
    backgroundColor: colors.background,
  },
  pageWrapper: {
    flex: 1,
    flexDirection: "column",
  },
  // Section label is restrained near-black with strong tracking, rendered by
  // the SectionLabel component below alongside a small red square accent.
  // Brand red is reserved for accent moments (figures, callouts, dividers)
  // so it lands when it appears instead of shouting on every page header.
  sectionLabel: {
    fontSize: 8.5,
    color: colors.primaryText,
    textTransform: "uppercase",
    letterSpacing: 2.5,
    fontWeight: "bold",
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabelMark: {
    width: 5,
    height: 5,
    backgroundColor: colors.primary,
    marginRight: 9,
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
  // Footer mirrors the Nursing PDF's executive-document chrome with the same
  // 3-slot geometry codified in pdf_layout_guidelines.md §1a:
  //   • footerLeft  (width: 90, fixed)  — Abridge wordmark image
  //   • footerCenter (flex: 1, padded)  — org name only, numberOfLines: 1
  //   • footerRight (width: 90, fixed)  — `Page X / Y`
  // The center slot is JUST the org name — never glued to a document-title
  // suffix. Unbounded text in a flex row physically overflows into the
  // adjacent slot when the org name is long, producing the
  // "ORGNAMEPAGE 4/7" glyph collision the Nursing PDF originally shipped
  // and that this contract exists to prevent.
  footer: {
    position: "absolute",
    bottom: 28,
    left: 54,
    right: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.footerRule,
  },
  footerLeft: {
    width: 90,
    flexDirection: "row",
    alignItems: "center",
  },
  footerLogo: {
    width: 56,
    height: 12,
    objectFit: "contain",
  },
  footerCenter: {
    flex: 1,
    fontSize: 7.5,
    color: colors.footerMeta,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  footerCenterOrg: {
    fontWeight: "bold",
    color: colors.primaryText,
  },
  footerRight: {
    width: 90,
    fontSize: 7.5,
    color: colors.footerMeta,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    textAlign: "right",
  },
  footerRightNum: {
    color: colors.primaryText,
    fontWeight: "bold",
    letterSpacing: 0.4,
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

const settingThesisIntro: Record<Exclude<ExploreCareSetting, "nursing">, string> = {
  outpatient:
    "Ambient documentation creates value across four buckets in outpatient — and they don't all carry the same kind of math. We separate them so the financial story stays defensible and the qualitative signals don't get lost in the totals.",
  ed:
    "In the emergency department, every minute of charting is a minute not seeing the next patient. Ambient documentation moves four levers — and they don't all carry the same kind of math. We separate them so the financial story stays defensible and the qualitative signals don't get lost in the totals.",
  inpatient:
    "Inpatient value follows information flow. Ambient documentation moves four levers — and they don't all carry the same kind of math. We separate them so the financial story stays defensible and the qualitative signals don't get lost in the totals.",
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
      "Reclaimed documentation time becomes patient access — more visits per provider, shorter waits, complex patients getting the time their care requires.",
    Workforce:
      "Documentation burden is among the most-cited reasons clinicians leave outpatient practice. Reducing after-hours charting protects retention — and the locum spend that follows every vacancy.",
    Revenue:
      "Faster, more complete notes mean cleaner E/M leveling, fewer denials, and HCC capture that reflects the conditions actually addressed during the visit.",
    Quality:
      "Outpatient quality outcomes — care continuity, note quality, and diagnosis capture — are tracked post-deployment as the leading indicators that documentation lift translates to clinical impact.",
  },
  ed: {
    Capacity:
      "In the ED, every minute saved on charting is a minute back to the next patient. Recovered LWBS volume is the most measurable line — patients seen and treated instead of walking out the door.",
    Workforce:
      "Shift-based documentation burden drives ED burnout. Reducing end-of-shift charting protects retention — and the locum / agency spend that follows every gap in coverage.",
    Revenue:
      "Defensible E/M leveling and clean-claim performance both depend on how completely the encounter is documented. Down-coding and denial losses are recovered as documentation tightens.",
    Quality:
      "ED quality outcomes — note quality, patient experience, and admission hand-off completeness — are tracked post-deployment as leading indicators of clinical impact.",
  },
  inpatient: {
    Capacity:
      "Inpatient capacity follows information flow. Faster H&Ps, signed progress notes, and complete discharge summaries free beds, accelerate consults, and shorten care-transition lag.",
    Workforce:
      "After-hours charting and the 24-hour H&P signature requirement are the two most-cited burden drivers in hospital medicine. Reducing both protects hospitalist retention — and the locum spend behind every vacancy.",
    Revenue:
      "Inpatient revenue lift centers on CMI integrity — DRG accuracy, CC/MCC capture, and CDI query reduction all reflect notes that fully describe the admission's clinical complexity.",
    Quality:
      "Inpatient quality outcomes — hand-off completeness, discharge documentation, and Leapfrog safety posture — are tracked post-deployment as signals of documentation impact.",
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

const buildChoicesReveal = (
  data: ExplorePDFData,
  setting: Exclude<ExploreCareSetting, "nursing">,
): string => {
  const cap = data.quadrants.find((q) => q.quadrant === "Capacity");
  const wf = data.quadrants.find((q) => q.quadrant === "Workforce");
  const rev = data.quadrants.find((q) => q.quadrant === "Revenue");
  const capDollars = (cap?.annualTotal ?? 0) > 0;
  const wfDollars = (wf?.annualTotal ?? 0) > 0;
  const revDollars = (rev?.annualTotal ?? 0) > 0;
  const dollarCount = [capDollars, wfDollars, revDollars].filter(Boolean).length;

  if (dollarCount === 3) {
    return `Your model layers throughput, workforce economics, and revenue capture — all three financial quadrants where ambient documentation moves dollars in ${settingShortLabel[setting].toLowerCase()}. The qualitative quality signals on the following pages serve as the leading indicators that the upstream lift is doing its work.`;
  }
  if (dollarCount === 2 && revDollars && wfDollars) {
    return "Your model is anchored by revenue capture and workforce economics — the two quadrants where the dollar math is most directly attributable. Worth pairing with capacity drivers (throughput, access) once those baselines are in hand.";
  }
  if (dollarCount === 2 && capDollars && wfDollars) {
    return "Your model is anchored by throughput and workforce economics. Adding revenue drivers — coding accuracy, denial prevention — would close the loop on the financial story.";
  }
  if (dollarCount === 2 && capDollars && revDollars) {
    return "Your model leans on throughput and revenue capture. Workforce drivers (retention, locum avoidance) are usually where the most defensible savings sit — worth modeling once turnover data is available.";
  }
  if (dollarCount === 1 && revDollars) {
    return "Your model is anchored by revenue capture — the most directly measurable line. Worth pairing with workforce and capacity drivers for the full picture.";
  }
  if (dollarCount === 1 && wfDollars) {
    return "Your model is anchored by workforce economics — retention savings and the locum spend behind every vacancy. Worth pairing with throughput and revenue drivers for the full picture.";
  }
  if (dollarCount === 1 && capDollars) {
    return "Your model is anchored by capacity / throughput. Worth pairing with workforce and revenue drivers for a complete financial story.";
  }
  return "Your model leans on qualitative outcomes. Validate each driver against your organization's actual data to convert tracked signals into committed value over the contract period.";
};

// ───────────────────────── Reusable components ─────────────────────────

// PageFooter mirrors NursingValueAssessmentPDF.tsx — Bloomberg/McKinsey
// executive-document chrome with the 3-slot geometry codified in
// pdf_layout_guidelines.md §1a:
//   • Left  (width: 90, fixed)  — Abridge wordmark image
//   • Center (flex: 1, padded)  — org name only, single-line, never glued
//     to a document-title suffix
//   • Right (width: 90, fixed)  — `Page X / Y`
// The center text used to be `ORG · DOCUMENT TITLE`. The suffix was removed
// because every page already carries a SectionLabel naming the section, and
// the suffix was the long-string that overflowed into the right slot in the
// shipped Nursing PDF bug ("ASSESSPAMGEENT 1/10"). We now refuse the
// suffix structurally — even on short org names — so the bug class cannot
// recur regardless of input.
const PageFooter = ({ orgName }: { orgName: string }) => (
  <View style={styles.footer} fixed>
    <View style={styles.footerLeft}>
      <Image src={abridgeWordmark} style={styles.footerLogo} />
    </View>
    {/*
      `wrap={false}` + the parent slot's `flex: 1` means an unusually long
      org name is clipped at the slot boundary instead of wrapping
      vertically (which would push the footer off its 23pt height
      contract) or growing into the right "PAGE X / Y" slot (the shipped
      collision bug). This is the geometric belt-and-braces; the snapshot
      test asserts the structural part (no document-title suffix glued
      onto the org name).
    */}
    <Text style={styles.footerCenter} wrap={false}>
      <Text style={styles.footerCenterOrg}>{orgName}</Text>
    </Text>
    {/* Subtract 1 to skip the unnumbered cover page (currently always page 1). */}
    <Text
      style={styles.footerRight}
      render={({ pageNumber, totalPages }) => (
        <>
          <Text>Page </Text>
          <Text style={styles.footerRightNum}>
            {`${pageNumber - 1} / ${totalPages - 1}`}
          </Text>
        </>
      )}
    />
  </View>
);

// SectionLabel: small red square accent + near-black uppercase text. Used at
// the top of every page section. Replaces the previous loud-red text-only
// label that competed with section headlines for visual weight. Mirrors
// the Nursing PDF's SectionLabel one-for-one — see pdf_layout_guidelines §9.
const SectionLabel = ({ children }: { children: string }) => (
  <View style={styles.sectionLabelRow}>
    <View style={styles.sectionLabelMark} />
    <Text style={styles.sectionLabel}>{children}</Text>
  </View>
);

const QuadrantThesisCard = ({
  label,
  bigNumber,
  bigNumberItalic,
  bigNumberLight,
  framing,
}: {
  label: string;
  bigNumber: string;
  bigNumberItalic?: boolean;
  bigNumberLight?: boolean;
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
        marginBottom: 8,
      }}
    >
      {bigNumber}
    </Text>
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
}) => (
  <View
    style={{
      backgroundColor: colors.cards,
      padding: 12,
      borderRadius: 4,
      marginBottom: 8,
    }}
    wrap={false}
  >
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 4,
      }}
    >
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
      <Text
        style={{
          fontSize: 7.5,
          color: colors.primary,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          fontWeight: "bold",
          marginBottom: 4,
        }}
      >
        ↳ Linked driver
      </Text>
    ) : null}
    <Text
      style={{
        fontSize: 9,
        color: colors.secondary,
        lineHeight: 1.45,
        marginBottom: formula ? 4 : 0,
      }}
    >
      {body}
    </Text>
    {formula ? (
      <Text
        style={{
          fontSize: 8.5,
          fontStyle: "italic",
          color: colors.primaryText,
          lineHeight: 1.4,
          marginTop: 2,
        }}
      >
        {formula}
      </Text>
    ) : null}
  </View>
);

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
      paddingVertical: 14,
      marginTop: 6,
      marginBottom: 8,
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
  isQualityForNonNursing,
}: {
  q: ExplorePDFQuadrantData;
  setting: Exclude<ExploreCareSetting, "nursing">;
  orgName: string;
  isQualityForNonNursing: boolean;
}) => {
  const quantified = q.drivers.filter((d) => d.visibility === "quantified");
  const qualitative = q.drivers.filter((d) => d.visibility === "qualitative");
  const isEmpty =
    q.drivers.length === 0 && q.otherFinancialBenefits.length === 0;

  const headlineForQuadrant: Record<ExplorePDFQuadrantData["quadrant"], string> = {
    Capacity: "Capacity is what reclaimed time buys.",
    Workforce: "Documentation burden is the burnout-and-turnover lever.",
    Revenue: "Complete notes are the cleanest path to defensible coding.",
    Quality: isQualityForNonNursing
      ? "Quality outcomes are tracked post-deployment."
      : "Quality outcomes follow documentation completeness.",
  };

  // HeroSubtotal copy: the bottom-of-page anchor. For Quality on non-nursing
  // settings the underlying drivers are intentionally qualitative-only — the
  // total renders as italic "Tracked" instead of "$0", per the edge-case
  // numerics rule (pdf_layout_guidelines.md §9 > Edge-case numerics).
  const subtotalLabel = `${q.quadrant} Subtotal`;
  const subtotalIsTracked =
    isQualityForNonNursing && q.annualTotal === 0;
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
        <SectionLabel>{q.quadrant.toUpperCase()}</SectionLabel>
        <Text style={styles.sectionHeadline}>{headlineForQuadrant[q.quadrant]}</Text>
        <Text style={styles.body}>{settingQuadrantFraming[setting][q.quadrant]}</Text>

        {isEmpty ? (
          <Text
            style={{
              fontSize: 10,
              color: colors.tertiary,
              fontStyle: "italic",
              paddingVertical: 6,
            }}
          >
            No drivers selected for this quadrant. Enable drivers on the
            corresponding {q.quadrant} page in the model to populate this
            section.
          </Text>
        ) : (
          <>
            {quantified.map((d) => (
              <CompactDriverCard
                key={d.id}
                name={d.label}
                value={fmtCurrency(d.value)}
                body={d.shortDescription}
                formula={d.calcSummary}
                linkedTag={d.isChild}
              />
            ))}
            {q.otherFinancialBenefits.map((b, i) => (
              <CompactDriverCard
                key={`b-${i}`}
                name={b.label}
                value={`${fmtCurrency(b.amount)} ${b.type === "annual" ? "annual" : "one-time"}`}
                body="Other financial benefit configured for this quadrant — reported separately so it is not folded into the recurring annual total."
              />
            ))}
            {qualitative.map((d) => (
              <CompactDriverCard
                key={d.id}
                name={d.label}
                value="Tracked"
                valueIsTracked
                body={d.shortDescription}
              />
            ))}
          </>
        )}

        <HeroSubtotal
          label={subtotalLabel}
          total={subtotalTotal}
          caption={subtotalCaption}
          totalIsTracked={subtotalIsTracked}
        />

        <PageFooter orgName={orgName} />
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
      fontSize: 9,
      color: colors.secondary,
      lineHeight: 1.5,
      marginBottom: 4,
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
  const cumulativeMultiple =
    data.threeYearInvestmentTotal > 0
      ? data.threeYearNetTotal / data.threeYearInvestmentTotal
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

      {/* PAGE — THESIS */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>THE THESIS</SectionLabel>
          <Text style={styles.sectionHeadline}>{settingThesisHeadline[setting]}</Text>
          <Text style={styles.body}>{settingThesisIntro[setting]}</Text>

          <View style={[styles.cardBg, { marginBottom: 14 }]}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: colors.primaryText,
                marginBottom: 6,
              }}
            >
              {settingThesisCardTitle[setting]}
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              {settingThesisCardBody[setting]}
            </Text>
          </View>

          <View style={{ flexDirection: "row" }}>
            <QuadrantThesisCard
              label="CAPACITY"
              bigNumber={renderQuadrantBigNumber(capValue, "tracked")}
              bigNumberItalic={capValue === 0}
              framing={settingQuadrantFraming[setting].Capacity}
            />
            <QuadrantThesisCard
              label="WORKFORCE"
              bigNumber={renderQuadrantBigNumber(wfValue, "value")}
              bigNumberLight={wfValue === 0}
              framing={settingQuadrantFraming[setting].Workforce}
            />
          </View>
          <View style={{ flexDirection: "row" }}>
            <QuadrantThesisCard
              label="REVENUE"
              bigNumber={renderQuadrantBigNumber(revValue, "value")}
              bigNumberLight={revValue === 0}
              framing={settingQuadrantFraming[setting].Revenue}
            />
            <QuadrantThesisCard
              label="QUALITY"
              bigNumber={qlValue > 0 ? fmtCurrency(qlValue) : "Tracked"}
              bigNumberItalic={qlValue === 0}
              framing={settingQuadrantFraming[setting].Quality}
            />
          </View>

          <View style={[styles.redBorderCallout, { marginTop: 14 }]}>
            <Text
              style={{
                fontSize: 9,
                color: colors.primary,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                fontWeight: "bold",
                marginBottom: 6,
              }}
            >
              What Your Choices Reveal
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              {buildChoicesReveal(data, setting)}
            </Text>
          </View>

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE — PRACTICE & SETUP + TIME SAVINGS */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>PRACTICE &amp; SETUP</SectionLabel>
          <Text style={styles.sectionHeadline}>The unit we're modeling</Text>
          <Text style={styles.body}>
            All financial drivers in this assessment scale off the same
            baseline. The numbers below ground the rest of the document — change
            them in the model and every quadrant total moves with them.
          </Text>

          <View style={[styles.cardBg, { marginBottom: 18 }]}>
            <Text style={{ fontSize: 10.5, marginBottom: 4 }}>
              <Text style={{ fontWeight: "bold" }}>Setting:</Text> {settingLabel}
            </Text>
            <Text style={{ fontSize: 10.5, marginBottom: 4 }}>
              <Text style={{ fontWeight: "bold" }}>Providers:</Text>{" "}
              {fmtNum(data.numberOfProviders)}
            </Text>
            <Text style={{ fontSize: 10.5, marginBottom: 4 }}>
              <Text style={{ fontWeight: "bold" }}>Annual encounters:</Text>{" "}
              {fmtNum(data.annualEncounters)}
            </Text>
            <Text style={{ fontSize: 10.5 }}>
              <Text style={{ fontWeight: "bold" }}>Adoption / utilization:</Text>{" "}
              {data.utilizationPercent}%
            </Text>
          </View>

          <SectionLabel>TIME SAVINGS</SectionLabel>
          <Text style={styles.sectionHeadline}>
            {fmtNum(data.totalHoursSaved)} hours returned annually
          </Text>
          <Text style={styles.body}>
            Modeled at {data.minutesSavedPerEncounter} minutes saved per
            encounter using the {(data.timePathScenario || "custom").toLowerCase()}{" "}
            time-savings scenario. Recovered time fuels the quadrant value
            drivers on the following pages — it is not double-counted.
          </Text>

          <View style={styles.redBorderCallout}>
            <Text
              style={{
                fontSize: 9,
                color: colors.primary,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                fontWeight: "bold",
                marginBottom: 6,
              }}
            >
              Reading the rest of this document
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              The next four pages walk through Capacity, Workforce, Revenue, and
              Quality one quadrant at a time. Each driver shows the framing,
              the dollar value (where modeled), and the formula we used so the
              math is auditable end-to-end.
            </Text>
          </View>

          <PageFooter orgName={orgName} />
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
            isQualityForNonNursing={q === "Quality"}
          />
        );
      })}

      {/* PAGE — INVESTMENT CASE */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>THE INVESTMENT CASE</SectionLabel>
          <Text style={styles.sectionHeadline}>Infrastructure, Not Expense.</Text>
          <Text style={styles.body}>
            {/* Implementation fee is intentionally NOT folded into the
                recurring Year 1–3 rows so multi-year ROI math compares
                apples-to-apples (a one-time setup charge would distort Year 1
                economics and the 3-year cumulative multiple). It surfaces as
                its own row at the top of the table and a "true Year 1
                outlay" footnote below — see replit.md > Implementation Fee
                Treatment for the canonical three-part articulation pattern. */}
            {`Recurring investment is ${pricingPhrase}.${implPhrase} Years 2–3 apply ${data.year2GrowthPercent}% and ${data.year3GrowthPercent}% growth to recurring annual value as adoption matures and documentation habits stabilize.`}
          </Text>

          {/* 3-Year Projection table.
              When an implementation fee is configured, a dedicated "One-Time
              · Implementation" row renders ABOVE Year 1 with a tinted
              background and italic "tracked separately" cells in the Net /
              Cumulative columns. This makes the fee visually unmissable
              (users were searching the Year 1 row for it before this
              change) without folding it into the recurring multi-year
              math — see the canonical implementation on the Nursing PDF. */}
          <View style={{ marginBottom: 10 }}>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: colors.cards,
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 8.5,
                  fontWeight: "bold",
                  color: colors.secondary,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Period
              </Text>
              <Text
                style={{
                  flex: 1.2,
                  fontSize: 8.5,
                  fontWeight: "bold",
                  color: colors.secondary,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  textAlign: "right",
                }}
              >
                Value
              </Text>
              <Text
                style={{
                  flex: 1.2,
                  fontSize: 8.5,
                  fontWeight: "bold",
                  color: colors.secondary,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  textAlign: "right",
                }}
              >
                Investment
              </Text>
              <Text
                style={{
                  flex: 1.2,
                  fontSize: 8.5,
                  fontWeight: "bold",
                  color: colors.secondary,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  textAlign: "right",
                }}
              >
                Net Value
              </Text>
              <Text
                style={{
                  flex: 1.2,
                  fontSize: 8.5,
                  fontWeight: "bold",
                  color: colors.secondary,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  textAlign: "right",
                }}
              >
                Cumulative
              </Text>
            </View>

            {/* One-Time Implementation row — only renders when impl fee > 0.
                Visually demarcated with cardBg tint + italic Net/Cumulative
                cells reading "tracked separately" so it cannot be misread
                as a recurring annual line. Bold investment figure makes it
                the first thing the eye lands on. */}
            {showImplFeeRow && (
              <View
                style={{
                  flexDirection: "row",
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  backgroundColor: colors.cards,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.separator,
                }}
                wrap={false}
              >
                <Text style={{ flex: 1, fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>
                  One-Time
                  <Text style={{ fontSize: 9, fontWeight: "normal", color: colors.secondary }}> · Implementation</Text>
                </Text>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.secondary, textAlign: "right" }}>—</Text>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText, textAlign: "right", fontWeight: "bold" }}>
                  {fmtCurrency(data.implementationFee)}
                </Text>
                <Text style={{ flex: 1.2, fontSize: 9, fontStyle: "italic", color: colors.secondary, textAlign: "right" }}>
                  Setup investment
                </Text>
                <Text style={{ flex: 1.2, fontSize: 9, fontStyle: "italic", color: colors.secondary, textAlign: "right" }}>
                  Tracked separately
                </Text>
              </View>
            )}

            {[
              {
                label: "Year 1",
                value: data.year1Value,
                inv: data.year1Investment,
                net: data.year1Net,
                cum: data.year1Net,
              },
              {
                label: "Year 2",
                value: data.year2Value,
                inv: data.year2Investment,
                net: data.year2Net,
                cum: data.year1Net + data.year2Net,
              },
              {
                label: "Year 3",
                value: data.year3Value,
                inv: data.year3Investment,
                net: data.year3Net,
                cum: data.year1Net + data.year2Net + data.year3Net,
              },
            ].map((row, idx) => (
              <View
                key={row.label}
                style={{
                  flexDirection: "row",
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderBottomWidth: idx === 2 ? 0 : 1,
                  borderBottomColor: colors.separator,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 10,
                    fontWeight: "bold",
                    color: colors.primaryText,
                  }}
                >
                  {row.label}
                </Text>
                <Text
                  style={{
                    flex: 1.2,
                    fontSize: 10,
                    color: colors.primaryText,
                    textAlign: "right",
                  }}
                >
                  {fmtCurrency(row.value)}
                </Text>
                <Text
                  style={{
                    flex: 1.2,
                    fontSize: 10,
                    color: colors.secondary,
                    textAlign: "right",
                  }}
                >
                  {fmtCurrency(row.inv)}
                </Text>
                <Text
                  style={{
                    flex: 1.2,
                    fontSize: 10,
                    color: colors.primary,
                    fontWeight: "bold",
                    textAlign: "right",
                  }}
                >
                  {fmtCurrency(row.net)}
                </Text>
                <Text
                  style={{
                    flex: 1.2,
                    fontSize: 10,
                    color: colors.primaryText,
                    textAlign: "right",
                  }}
                >
                  {fmtCurrency(row.cum)}
                </Text>
              </View>
            ))}
          </View>

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

          {/* Cumulative-multiple HERO. Replaces the previous redBorderCallout
              that buried the punchline in body copy. Eyebrow / number /
              footnote stack — three separate Text nodes — so the multiple
              can stand at 36pt without wrapping. Mirrors the Nursing PDF's
              Investment-page hero geometry exactly (pdf_layout_guidelines.md
              §9 > Investment page hero). */}
          {cumulativeMultiple > 0 ? (
            <View
              style={{
                backgroundColor: colors.cards,
                borderRadius: 4,
                paddingHorizontal: 18,
                paddingVertical: 18,
                marginBottom: 14,
              }}
              wrap={false}
            >
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
                By Year 3, For Every $1 Invested
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
                {`${cumulativeMultiple.toFixed(1)}×`}
              </Text>
              <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.5 }}>
                {`Cumulative net under the modeled assumptions — alongside ${
                  setting === "ed"
                    ? "ED clinicians spending more time at the bedside and less time charting at end of shift."
                    : setting === "inpatient"
                      ? "hospitalists spending less time finishing notes after hours."
                      : "providers spending more face-time with patients and less time charting after clinic."
                }`}
              </Text>
            </View>
          ) : null}

          {/* The previous version of this page included a "Key Metrics To
              Track" section with hardcoded targets like "−40%", "+15 pts",
              "≥ 95%". Removed for the same reason the equivalent block was
              removed from the Nursing PDF: those numbers were placeholder
              targets, not partner data. The cumulative-multiple callout
              above is the page's punchline; nothing else is needed. */}

          <PageFooter orgName={orgName} />
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

          {(["Capacity", "Workforce", "Revenue", "Quality"] as const).map((qLabel) => {
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
                value:
                  d.visibility === "quantified"
                    ? fmtCurrency(d.value)
                    : "Tracked",
              })),
              ...q.otherFinancialBenefits.map((b) => ({
                label: b.label,
                value: `${fmtCurrency(b.amount)} ${b.type === "annual" ? "annual" : "one-time"}`,
              })),
            ];
            return (
              <SummaryGroup
                key={qLabel}
                label={qLabel.toUpperCase()}
                total={total}
                rows={rows}
              />
            );
          })}

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

          {/* METHODOLOGY */}
          <Text style={styles.subSectionHeader}>Methodology</Text>
          <View>
            <MethodologyLine
              text={`Time-savings scenario: ${(data.timePathScenario || "custom").toLowerCase()} — ${data.minutesSavedPerEncounter} minutes per encounter, ${fmtNum(data.totalHoursSaved)} hours returned annually across ${fmtNum(data.numberOfProviders)} providers.`}
            />
            <MethodologyLine
              text="Quadrant structure: Value is grouped into Capacity, Workforce, Revenue, and Quality. Each quadrant is an audit-ready slice — financial drivers carry $ math, qualitative drivers are tracked post-deployment as leading indicators."
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
                    text={`${d.label} (${qLabel}): ${d.calcSummary || d.shortDescription} = ${fmtCurrency(d.value)}.`}
                  />
                ));
              },
            )}
            <MethodologyLine
              text={`Year-over-year growth: Year 2 +${data.year2GrowthPercent}%, Year 3 +${data.year3GrowthPercent}%. ${
                data.pricingModel === "perEncounter"
                  ? "Per-encounter pricing scales investment alongside volume."
                  : "Per-provider and annual pricing hold investment constant across all three years."
              }`}
            />
            <MethodologyLine
              text="Realization & confidence: Each driver applies a realization rate that haircuts the gross modeled value to reflect operational adoption and partner-specific factors. Validate against historical data when available."
            />
          </View>

          <Text
            style={{
              fontSize: 8.5,
              fontStyle: "italic",
              color: colors.tertiary,
              lineHeight: 1.5,
              marginTop: 14,
            }}
          >
            This assessment is for planning purposes. Hard value projections are
            based on user-provided inputs. Qualitative drivers are tracked
            post-deployment and not monetized in totals. Validate with your
            organization's data after implementation.
          </Text>

          <PageFooter orgName={orgName} />
        </View>
      </Page>
    </Document>
  );
};
