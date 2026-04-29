import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import {
  calcHapi,
  calcFalls,
  calcCauti,
  calcClabsi,
  calcSepsis,
} from "@/lib/nursingQualityCalcs";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import abridgeWordmark from "@assets/abridge-logo-wordmark-red_1769187440253.png";

Font.registerHyphenationCallback((word) => [word]);

// Italic variants point at the same TTFs as the upright weights — react-pdf
// synthesizes the slant from the upright glyphs (faux italic). Without these
// explicit entries, any `fontStyle: "italic"` span (e.g. the "Tracked" /
// "Tracked separately" hero subtotals, the formula tail in CompactDriverCard)
// throws "Could not resolve font" when rendered server-side, and silently
// falls back to a default sans-serif in some browser versions. Registering
// faux variants makes the PDF render identically in node and the browser.
Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
    { src: manropeRegular, fontWeight: 400, fontStyle: "italic" },
    { src: manropeBold, fontWeight: 700, fontStyle: "italic" },
  ],
});

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
  footerRule: "#DDD5C8", // warm hairline tuned to the Abridge palette (same family as `cards`)
  footerMeta: "#5C5751",
  footerMetaSoft: "#8F8A82",
};

const styles = StyleSheet.create({
  page: {
    padding: 54,
    // paddingBottom must reserve room for the fixed footer:
    //   footer.bottom (24) + footer height (~border 1 + paddingTop 8 + text ~12) ≈ 45pt
    // Add ~24pt of visual breathing room above the footer to prevent content collisions.
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
  // Section label uses near-black with strong letter-spacing — restrained,
  // publication-grade. Brand red is reserved for accent moments (figures,
  // callouts, dividers) so it lands when it appears instead of shouting on
  // every page header. A 4pt red square sits to the left of the text as the
  // visual brand mark (rendered by the SectionLabel component below).
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
  subHeadline: {
    fontSize: 12,
    color: colors.secondary,
    marginBottom: 12,
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
  driverCard: {
    backgroundColor: colors.cards,
    padding: 12,
    borderRadius: 4,
    marginBottom: 10,
  },
  driverHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  driverHeader: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primaryText,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    flex: 1,
  },
  driverValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.primary,
  },
  driverBody: {
    fontSize: 9.5,
    color: colors.secondary,
    lineHeight: 1.45,
    marginBottom: 4,
  },
  driverCalc: {
    fontSize: 8.5,
    fontStyle: "italic",
    color: colors.tertiary,
    marginTop: 2,
  },
  driverSource: {
    fontSize: 8.5,
    color: colors.tertiary,
    marginTop: 2,
  },
  redBorderCallout: {
    backgroundColor: colors.cards,
    padding: 14,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: 10,
  },
  // ───── Page footer ──────────────────────────────────────────────────────
  // Total reserved height (must fit inside `page.paddingBottom: 72`):
  //   bottom (28) + content (~12 wordmark or text) + paddingTop (10) + rule (1)
  //   = 51pt, leaving ~21pt of breathing room above. Do not shrink paddingBottom
  //   without re-running the visual review checklist in pdf_layout_guidelines.md.
  //
  // Geometry: three FIXED-WIDTH slots (left logo / center org / right page-no)
  // — never `justifyContent: space-between` with unconstrained Text in any
  // slot. Unbounded Text in a flex row will physically overflow into the
  // adjacent slot when the org name is long, producing the
  // "ORGNAMEPAGE 4/7" glyph collision we shipped to a customer.
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
    // Matches the spec in pdf_layout_guidelines.md §1a — keep the inset
    // small so a long org name has the maximum room before truncation,
    // while still preserving a visible gutter against the right slot.
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

// ───────────────────────── Types ─────────────────────────

export interface NursingPDFInput {
  clientName: string;
  preparedBy: string;
  dateLabel: string;

  staffedBeds: number;
  nurseFTEs: number;
  occupancyPercent: number;
  utilizationPercent: number;
  minutesSavedPerShift: number;
  hoursReturnedAnnual: number;
  patientDaysAnnual: number;

  bedsideTimeEnabled: boolean;

  retention: { enabled: boolean; value: number; turnoverPct: number; replacementCost: number; impactPct: number; burnoutRelatedPct: number };
  agency: { enabled: boolean; value: number; weeksPerVacancy: number; weeklyPremium: number };
  overtime: { enabled: boolean; value: number; otHrsPerNurseWeek: number; reductionPct: number; otHourlyRate: number };

  hapi: { enabled: boolean; value: number; rate: number; preventionPct: number; costPerEvent: number };
  falls: { enabled: boolean; value: number; rate: number; preventionPct: number; costPerEvent: number };
  cauti: { enabled: boolean; value: number; rate: number; preventionPct: number; costPerEvent: number; utilizationPct: number };
  clabsi: { enabled: boolean; value: number; rate: number; preventionPct: number; costPerEvent: number; utilizationPct: number };
  sepsis: { enabled: boolean; value: number; ratePerThousand: number; complianceGapPct: number; docLagPct: number; excessCostPerCase: number; realizationPct: number };

  hcahpsEnabled: boolean;
  medErrorEnabled: boolean;

  pricingModel: 'perProvider' | 'perEncounter' | 'annual';
  costPerBedPerMonth: number;
  costPerEncounter?: number;
  annualLicenseFee?: number;
  year2Encounters?: number;
  annualInvestment: number;
  implementationFee: number;

  year1Net: number;
  year2Net: number;
  year3Net: number;
  threeYearCumulativeNet: number;
  year2GrowthPct: number;
  year3GrowthPct: number;

  workforceTotal: number;
  qualityTotal: number;
  totalAnnualValue: number;
  netAnnualValue: number;
  costPerBedPerYear: number;
}

// ───────────────────────── Helpers ─────────────────────────

const fmtCurrency = (n: number): string => {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
};

const fmtCurrencyExact = (n: number): string => `$${Math.round(n).toLocaleString()}`;
const fmtNum = (n: number): string => Math.round(n).toLocaleString();

// ───────────────────────── Reusable components ─────────────────────────

// PageFooter is a Bloomberg/McKinsey-style report footer:
//   • Left: fixed-width slot holding the rendered Abridge wordmark image
//     (NOT lowercase text — the brand mark must read as a logo, not as
//     un-capitalized prose).
//   • Center: small-caps org name (no document-title slug — every page
//     already has a SectionLabel that names the section; repeating
//     "NURSING VALUE ASSESSMENT" in the footer was redundant and was the
//     long-string that overflowed the right slot in the shipped bug).
//   • Right: fixed-width slot holding small-caps "PAGE X / Y" with the
//     numerals in bold near-black, right-aligned.
// All three slots have explicit widths/flex so the center can never grow
// into the right slot regardless of org-name length. Hairline rule above
// is tuned to the warm Abridge palette (not slate gray).
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
      test asserts the structural part (no document-title suffix is glued
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

const StatBlock = ({
  label,
  value,
  caption,
  emphasis,
}: {
  label: string;
  value: string;
  caption?: string;
  emphasis?: boolean;
}) => (
  <View style={{ flex: 1, paddingHorizontal: 8 }}>
    <Text
      style={{
        fontSize: 8,
        color: colors.secondary,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: emphasis ? 18 : 14,
        fontWeight: "bold",
        color: emphasis ? colors.primary : colors.primaryText,
        marginBottom: 2,
      }}
    >
      {value}
    </Text>
    {caption ? (
      <Text style={{ fontSize: 8.5, color: colors.tertiary }}>{caption}</Text>
    ) : null}
  </View>
);

// QuadrantThesisCard typography is intentionally tiered so the eye lands
// on real-dollar figures first:
//   • Live dollars (e.g. "$6.83M")     → 24pt bold near-black, lineHeight 1.0
//   • "Tracked" / italic accent state  → 18pt italic primary
//   • "Tracked Separately" light state → 15pt regular tertiary
// Live dollars are intentionally near-black (not red) so brand red can be
// reserved for the italic "Tracked" accent and the SectionLabel mark —
// otherwise three different reds compete on one page.
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
}) => {
  const numberSize = bigNumberLight ? 15 : bigNumberItalic ? 18 : 24;
  const numberColor = bigNumberLight
    ? colors.tertiary
    : bigNumberItalic
      ? colors.primary
      : colors.primaryText;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cards,
        padding: 14,
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
          marginBottom: 10,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: numberSize,
          fontWeight: bigNumberLight ? 400 : "bold",
          fontStyle: bigNumberItalic ? "italic" : "normal",
          color: numberColor,
          lineHeight: 1.0,
          marginBottom: 10,
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
};

// HeroSubtotal is a full-width tinted band that promotes a quadrant's
// dollar total to the page's punchline. Replaces the hairline right-aligned
// "Subtotal $X" text that buried the number on the original Workforce/
// Quality pages — readers couldn't find the bottom-line per quadrant
// without scanning all the cards. Pattern:
//   ┌───────────────────────────────────────────────┐
//   │ WORKFORCE SUBTOTAL                  $6.83M    │
//   │ Three labor lines, one upstream factor        │
//   └───────────────────────────────────────────────┘
const HeroSubtotal = ({
  label,
  total,
  caption,
}: {
  label: string;
  total: string;
  caption?: string;
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
          fontSize: 24,
          fontWeight: "bold",
          color: colors.primary,
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

// CompactDriverCard is the dense executive-style card we use on Workforce
// and Quality pages. The original tall "header + body + 6-row math grid +
// source" cards (≈250pt each) caused two compounding problems:
//   1. With wrap={false}, only 1 driver fit per page after the headline
//      and intro — Quality forced 5 single-driver orphan pages.
//   2. The math grid carried the same data as the printed inline formula,
//      so readers ended up with two ways to read the same calculation
//      stacked on top of each other (textbook "AI slop" feel).
// CompactDriverCard collapses each driver into ~95pt:
//   • Header row     (driver name + value)
//   • Optional link tag (↳ LINKED TO RETENTION)
//   • 1–2 line body
//   • Inline italic formula line (the printed math)
//   • Optional source line
// Multiple cards can sit side-by-side in a flex row, or full-width in a
// column. `flex: 1` makes them grid-friendly out of the box.
const CompactDriverCard = ({
  name,
  value,
  body,
  formula,
  source,
  linkedTo,
}: {
  name: string;
  value: string;
  body: string;
  formula?: string;
  source?: string;
  linkedTo?: string;
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor: colors.cards,
      padding: 12,
      borderRadius: 4,
      marginHorizontal: 4,
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
          fontSize: 13,
          fontWeight: "bold",
          color: colors.primary,
        }}
      >
        {value}
      </Text>
    </View>
    {linkedTo ? (
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
        {`↳ Linked to ${linkedTo}`}
      </Text>
    ) : null}
    <Text
      style={{
        fontSize: 9,
        color: colors.secondary,
        lineHeight: 1.45,
        marginBottom: 4,
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
    {source ? (
      <Text
        style={{
          fontSize: 7.5,
          color: colors.tertiary,
          marginTop: 3,
        }}
      >
        {source}
      </Text>
    ) : null}
  </View>
);

// SectionLabel: small red square accent + near-black uppercase text. Used
// at the top of every page section. Replaces the previous loud-red text-only
// label that competed with section headlines for visual weight.
const SectionLabel = ({ children }: { children: string }) => (
  <View style={styles.sectionLabelRow}>
    <View style={styles.sectionLabelMark} />
    <Text style={styles.sectionLabel}>{children}</Text>
  </View>
);

// Bloomberg-style compact key/value math grid
const MathGrid = ({ rows }: { rows: { label: string; value: string }[] }) => (
  <View
    style={{
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: colors.separatorHeavy,
      borderRadius: 4,
      marginTop: 6,
      marginBottom: 4,
    }}
  >
    {rows.map((r, i) => (
      <View
        key={i}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderTopWidth: i === 0 ? 0 : 0.5,
          borderTopColor: colors.separator,
        }}
      >
        <Text style={{ fontSize: 8.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {r.label}
        </Text>
        <Text style={{ fontSize: 9, color: colors.primaryText, fontWeight: "bold" }}>
          {r.value}
        </Text>
      </View>
    ))}
  </View>
);

// ───────────────────────── WHAT YOUR CHOICES REVEAL ─────────────────────────

function buildChoicesReveal(data: NursingPDFInput): string {
  const retOn = data.retention.enabled;
  const otOn = data.overtime.enabled;
  const qualityOn = data.hapi.enabled || data.falls.enabled || data.cauti.enabled || data.clabsi.enabled || data.sepsis.enabled;
  const workforceOn = retOn || data.agency.enabled || otOn;

  if (retOn && otOn) {
    return "Your model combines overtime reduction with retention savings. OT reduction is grounded in your current overtime spend; retention reflects the burnout-related turnover that documentation burden accelerates. Together they form a defensible staffing ROI.";
  }
  if (otOn && !retOn) {
    return "Your model is anchored by overtime reduction — the most directly measurable line in the staffing budget. Worth pairing with retention and agency analysis once turnover data is in hand.";
  }
  if (qualityOn && !workforceOn) {
    return "Your model is anchored by quality outcomes — preventable harm events that documentation timing influences. Worth pairing with workforce drivers (retention, OT, agency) for a complete labor-and-quality story.";
  }
  return "Your model spans labor economics and care quality. Validate each driver against your unit's actual data to convert potential into committed value.";
}

// ───────────────────────── Document ─────────────────────────

export const NursingPDFDocument = ({ data }: { data: NursingPDFInput }) => {
  const orgName = data.clientName || "Organization";
  const subtitle = `${fmtNum(data.staffedBeds)} beds · ${fmtNum(data.nurseFTEs)} nurse FTEs · Inpatient Nursing`;

  // Derived event counts come from the same shared math helpers used by the
  // engine, so the printed formula is guaranteed to reconcile with the
  // engine-computed `value` shown next to each driver header.
  const hapiCalc = calcHapi({
    patientDays: data.patientDaysAnnual,
    rate: data.hapi.rate,
    preventionPct: data.hapi.preventionPct,
    cost: data.hapi.costPerEvent,
  });
  const fallsCalc = calcFalls({
    patientDays: data.patientDaysAnnual,
    rate: data.falls.rate,
    preventionPct: data.falls.preventionPct,
    cost: data.falls.costPerEvent,
  });
  const cautiCalc = calcCauti({
    patientDays: data.patientDaysAnnual,
    utilizationPct: data.cauti.utilizationPct,
    rate: data.cauti.rate,
    preventionPct: data.cauti.preventionPct,
    cost: data.cauti.costPerEvent,
  });
  const clabsiCalc = calcClabsi({
    patientDays: data.patientDaysAnnual,
    utilizationPct: data.clabsi.utilizationPct,
    rate: data.clabsi.rate,
    preventionPct: data.clabsi.preventionPct,
    cost: data.clabsi.costPerEvent,
  });
  const sepsisCalc = calcSepsis({
    patientDays: data.patientDaysAnnual,
    ratePerThousand: data.sepsis.ratePerThousand,
    currentCompliancePct: 100 - data.sepsis.complianceGapPct,
    docLagPct: data.sepsis.docLagPct,
    excessCostPerCase: data.sepsis.excessCostPerCase,
    realizationPct: data.sepsis.realizationPct,
  });

  const hapiEvents = hapiCalc.events;
  const fallsEvents = fallsCalc.events;
  const cathDays = cautiCalc.catheterDays;
  const lineDays = clabsiCalc.lineDays;
  const cautiEvents = cautiCalc.events;
  const clabsiEvents = clabsiCalc.events;
  const sepsisCases = sepsisCalc.events;

  const hasTrackedMetrics = data.hcahpsEnabled || data.medErrorEnabled;

  // Year math (recurring, investment held constant)
  const y1Recurring = data.year1Net + data.annualInvestment;
  const y2Recurring = Math.round(y1Recurring * (1 + data.year2GrowthPct / 100));
  const y3Recurring = Math.round(y2Recurring * (1 + data.year3GrowthPct / 100));
  const cumY1 = data.year1Net;
  const cumY2 = data.year1Net + data.year2Net;
  const cumY3 = data.year1Net + data.year2Net + data.year3Net;

  const cumulativeMultiple = data.annualInvestment > 0
    ? data.threeYearCumulativeNet / (data.annualInvestment * 3)
    : 0;

  return (
    <Document>
      {/* PAGE 1 — COVER */}
      <PDFCoverPage
        reportLabel="NURSING VALUE ASSESSMENT"
        title={orgName}
        subtitle={subtitle}
        preparedBy={`${data.preparedBy} · ${data.dateLabel}`}
      />

      {/* PAGE 2 — THE THESIS */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>THE THESIS</SectionLabel>
          <Text style={styles.sectionHeadline}>Where Nursing Value Actually Lives</Text>
          <Text style={styles.body}>
            Ambient documentation creates value across four distinct buckets. For nursing,
            three of them carry real dollars in this model — and the fourth, revenue, is
            tracked separately in the physician and APP models where billing originates.
            We separate them because the strategic implications of each are different.
          </Text>

          {/* 2x2 quadrant grid. Each cell adapts to whether the underlying drivers
              are enabled — a quadrant with no enabled drivers shows "Tracked" in
              italic accent rather than a literal "$0", which would otherwise
              make a perfectly valid scenario read as broken. */}
          <View style={{ flexDirection: "row" }}>
            <QuadrantThesisCard
              label="CAPACITY"
              bigNumber="Tracked"
              bigNumberItalic
              framing="Reclaimed documentation time goes back to bedside care. We track the ratio of bedside-to-charting time post-deployment as a leading indicator that the model is working."
            />
            <QuadrantThesisCard
              label="WORKFORCE"
              bigNumber={data.workforceTotal > 0 ? fmtCurrency(data.workforceTotal) : "Tracked"}
              bigNumberItalic={data.workforceTotal === 0}
              framing="Documentation burden is among the top drivers of nurse turnover. The hypothesis we model: reducing end-of-shift charting moves retention, the agency spend that follows every vacancy, and the overtime budget — three distinct labor lines that all share one root cause."
            />
          </View>
          <View style={{ flexDirection: "row" }}>
            <QuadrantThesisCard
              label="QUALITY"
              bigNumber={
                data.qualityTotal > 0
                  ? `${fmtCurrency(data.qualityTotal)} (potential)`
                  : "Tracked"
              }
              bigNumberItalic={data.qualityTotal === 0}
              framing="Preventable harm events — HAPIs, falls, CAUTI, CLABSI — and sepsis bundle compliance are sensitive to documentation timing. The hypothesis we model: real-time flowsheet capture surfaces the visibility for earlier intervention, with each unit's actual outcome shaped by clinical practice."
            />
            <QuadrantThesisCard
              label="REVENUE"
              bigNumber="Tracked Separately"
              bigNumberLight
              framing="Revenue impact from documentation is captured in the physician and APP models, where billing originates. Nursing's measurable value lives in quality outcomes and labor economics — which is what this model focuses on."
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
              {buildChoicesReveal(data)}
            </Text>
          </View>

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 2 — WORKFORCE
          Layout discipline note: this page used to ship 3 tall driver cards
          (≈250pt each) with full 6-row MathGrids that duplicated the printed
          formula in two visual styles. The cards are now CompactDriverCard
          (~95pt) — same data, same reconciliation, but the page now has
          enough vertical room for a proper HeroSubtotal band at the bottom
          that promotes the workforce total to the punchline. */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>WORKFORCE</SectionLabel>
          <Text style={styles.sectionHeadline}>
            Documentation burden is among the top reasons nurses leave — and stay late.
          </Text>
          <Text style={styles.body}>
            Three labor lines — turnover, agency premium, and overtime — all linked
            to the same upstream factor: how long it takes to finish charting at the
            end of a shift.
          </Text>

          {/* Cards stack full-width (each in its own row) so the formula
              line has room to breathe — the agency formula in particular
              prints all four multiplicands and would wrap in a half-width
              column. The negative marginHorizontal here cancels the +4pt
              CompactDriverCard inset so the card edges align to the page
              gutter. */}
          <View style={{ marginHorizontal: -4, marginBottom: 4 }}>
            {data.retention.enabled ? (
              <CompactDriverCard
                name="RN Retention"
                value={fmtCurrency(data.retention.value)}
                body="Documentation burden is among the factors associated with burnout and turnover. Reducing burden is modeled to help retain experienced nurses."
                formula={`${fmtNum(data.nurseFTEs)} FTE × ${data.retention.turnoverPct}% turnover × ${data.retention.burnoutRelatedPct}% burnout-related × ${data.retention.impactPct}% doc impact × ${fmtCurrencyExact(data.retention.replacementCost)} → ${fmtCurrency(data.retention.value)}`}
                source="Source: NSI Nursing Solutions 2024 turnover benchmark."
              />
            ) : null}

            {data.agency.enabled ? (
              // Formula must reconcile to `computeAllDriverValues` in
              // exploreDriverCalcs.ts: engine value = retained × wks ×
              // premium, where retained = nurseFTEs × turnoverPct% ×
              // burnoutRelatedPct% × impactPct%. Earlier this card printed
              // only `wks × premium → $value`, which was mathematically
              // incomplete — the multiplicands didn't multiply out to the
              // displayed dollar value, so the card lost its defensibility
              // (the entire point of the math tail). Surface every factor
              // the engine uses, even though the line is dense — that's
              // why this card sits in the full-width stacked column rather
              // than a 2-col grid.
              <CompactDriverCard
                name="Agency & Travel Nurse Reduction"
                value={fmtCurrency(data.agency.value)}
                linkedTo={data.retention.enabled ? "retention" : undefined}
                body="When nurses leave, hospitals typically fill gaps with agency labor at 2–3× the cost. Improved retention reduces that premium-labor dependency."
                formula={`${fmtNum(data.nurseFTEs)} FTE × ${data.retention.turnoverPct}% turnover × ${data.retention.burnoutRelatedPct}% burnout × ${data.retention.impactPct}% impact × ${data.agency.weeksPerVacancy} wks/vacancy × ${fmtCurrencyExact(data.agency.weeklyPremium)}/wk → ${fmtCurrency(data.agency.value)}`}
              />
            ) : null}

            {data.overtime.enabled ? (
              <CompactDriverCard
                name="Overtime Reduction"
                value={fmtCurrency(data.overtime.value)}
                body="When nurses spend less time documenting at end of shift, OT hours decrease. The most directly measurable line in the payroll budget."
                formula={`${fmtNum(data.nurseFTEs)} FTE × ${data.overtime.otHrsPerNurseWeek} OT hrs/wk × ${data.overtime.reductionPct}% reduction × $${data.overtime.otHourlyRate}/hr × 52 wks → ${fmtCurrency(data.overtime.value)}`}
              />
            ) : null}
          </View>

          <HeroSubtotal
            label="Workforce Subtotal"
            total={data.workforceTotal > 0 ? fmtCurrency(data.workforceTotal) : "Tracked"}
            caption="Three labor lines, one upstream factor: end-of-shift charting time."
          />

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 3 — CAPACITY (Leading Indicator) */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>CAPACITY</SectionLabel>
          <Text style={styles.sectionHeadline}>
            A leading indicator, not a billable line.
          </Text>
          <Text style={styles.body}>
            When nurses finish charting on shift, more of the next hour can go to
            direct patient care rather than catch-up documentation. We track the
            ratio of bedside-to-charting time as a leading indicator that the model
            is taking hold — workforce and quality outcomes are typically downstream
            of that shift, though the magnitude is unit-specific.
          </Text>

          <View style={[styles.cardBg, { flexDirection: "row", paddingVertical: 18, marginBottom: 14 }]}>
            <StatBlock
              label="Patient days/yr"
              value={fmtNum(data.patientDaysAnnual)}
            />
            <StatBlock
              label="Hrs returned/yr"
              value={fmtNum(data.hoursReturnedAnnual)}
              emphasis
            />
            <StatBlock
              label="Min saved/shift"
              value={fmtNum(data.minutesSavedPerShift)}
            />
            <StatBlock
              label="Staffed beds"
              value={fmtNum(data.staffedBeds)}
            />
          </View>

          <Text style={styles.subSectionHeader}>How To Read It</Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: "bold", color: colors.primaryText }}>Hours returned/yr</Text> is the
            headline — it's what reclaimed end-of-shift documentation time looks like
            when aggregated across the unit. <Text style={{ fontWeight: "bold", color: colors.primaryText }}>Minutes saved/shift</Text>{" "}
            is the per-nurse experience that supports adoption. <Text style={{ fontWeight: "bold", color: colors.primaryText }}>Patient days/yr</Text>{" "}
            and <Text style={{ fontWeight: "bold", color: colors.primaryText }}>staffed beds</Text> anchor
            the math to your actual operating footprint.
          </Text>

          <Text style={styles.body}>
            We deliberately don't price capacity. Translating reclaimed minutes into
            dollars requires assumptions about what the next hour gets used for —
            assumptions that vary by unit, shift, and patient mix. Tracking the leading
            indicator is more defensible than monetizing it.
          </Text>

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 4 — QUALITY
          The previous version of this page rendered 5 wrap={false} driver
          cards (≈280pt each) inside a `<Page wrap>` — pagination math
          guaranteed exactly 1 driver per page after the headline + intro,
          producing 5 single-driver orphan pages instead of one cohesive
          quality story. This rewrite collapses each driver into a
          CompactDriverCard arranged in a 2-column grid (5 cards = 3 rows
          with the 5th sharing a row with the qualitative-metrics card),
          and lands the quality subtotal as a HeroSubtotal at the bottom.
          The full per-driver math still reconciles via the inline italic
          formula on each card and the Methodology page bullets. */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>QUALITY</SectionLabel>
          <Text style={styles.sectionHeadline}>
            Real-time documentation is the visibility layer that makes early intervention possible.
          </Text>
          <Text style={styles.body}>
            Preventable harm events happen when risk signals are missed or delayed.
            The hypothesis we model: real-time flowsheet capture surfaces those
            signals while there's still time to act — with the actual outcome
            determined by clinical practice on each unit. The values below are
            <Text style={{ fontWeight: "bold", color: colors.primaryText }}> potential</Text>;
            documentation creates the visibility, the care team creates the outcome.
          </Text>

          {/* 2-column grid. Each <View flexDirection: row> is a row of up to
              two compact cards. The negative marginHorizontal cancels the
              CompactDriverCard's +4pt marginHorizontal so the row's outer
              edges align to the page gutter. */}
          <View style={{ marginHorizontal: -4 }}>
            <View style={{ flexDirection: "row" }}>
              {data.hapi.enabled ? (
                <CompactDriverCard
                  name="HAPI Risk Reduction"
                  value={`${fmtCurrency(data.hapi.value)} (pot.)`}
                  body="Skin assessments at the point of care surface risk earlier than charts reconstructed at shift end."
                  formula={`${hapiEvents.toFixed(1)} events × ${data.hapi.preventionPct}% prevention × ${fmtCurrencyExact(data.hapi.costPerEvent)} → ${fmtCurrency(data.hapi.value)}`}
                  source="Source: Dowding et al., JAMIA 2012."
                />
              ) : null}
              {data.falls.enabled ? (
                <CompactDriverCard
                  name="Fall Risk Visibility"
                  value={`${fmtCurrency(data.falls.value)} (pot.)`}
                  body="Morse Fall Scale assessments completed in real time make risk escalations visible when they matter."
                  formula={`${fallsEvents.toFixed(1)} falls × ${data.falls.preventionPct}% prevention × ${fmtCurrencyExact(data.falls.costPerEvent)} → ${fmtCurrency(data.falls.value)}`}
                  source="Source: AHRQ inpatient fall cost benchmarks."
                />
              ) : null}
            </View>

            <View style={{ flexDirection: "row" }}>
              {data.cauti.enabled ? (
                <CompactDriverCard
                  name="CAUTI Prevention"
                  value={`${fmtCurrency(data.cauti.value)} (pot.)`}
                  body="Daily catheter-necessity documentation supports earlier removal and bundle adherence."
                  formula={`${cautiEvents.toFixed(1)} CAUTIs × ${data.cauti.preventionPct}% prevention × ${fmtCurrencyExact(data.cauti.costPerEvent)} → ${fmtCurrency(data.cauti.value)}`}
                  source="Source: Meddings et al., JAMA Internal Medicine 2014."
                />
              ) : null}
              {data.clabsi.enabled ? (
                <CompactDriverCard
                  name="CLABSI Prevention"
                  value={`${fmtCurrency(data.clabsi.value)} (pot.)`}
                  body="Timely line documentation supports bundle compliance and is associated with fewer central-line bloodstream infections."
                  formula={`${clabsiEvents.toFixed(1)} CLABSIs × ${data.clabsi.preventionPct}% prevention × ${fmtCurrencyExact(data.clabsi.costPerEvent)} → ${fmtCurrency(data.clabsi.value)}`}
                  source="Source: CDC CLABSI cost-of-illness estimates."
                />
              ) : null}
            </View>

            {/* Sepsis sits on its own row paired with a "Tracked Metrics"
                summary card so the row reads as one symmetric pair instead
                of leaving sepsis as an orphan half-row. The tracked-metrics
                card collapses HCAHPS + medication errors into one block —
                each was a full driverCard previously, which was three
                paragraphs to deliver "we are not putting a dollar on this."
                One block, one beat. */}
            <View style={{ flexDirection: "row" }}>
              {data.sepsis.enabled ? (
                <CompactDriverCard
                  name="Sepsis Bundle Compliance"
                  value={`${fmtCurrency(data.sepsis.value)} (pot.)`}
                  body="Time-stamped vitals and antibiotic documentation lift SEP-1 compliance. The model captures only the documentation-lag share."
                  formula={`${sepsisCases.toFixed(1)} cases × ${data.sepsis.complianceGapPct}% non-comp × ${data.sepsis.docLagPct}% doc-lag × ${fmtCurrencyExact(data.sepsis.excessCostPerCase)} × ${data.sepsis.realizationPct}% real. → ${fmtCurrency(data.sepsis.value)}`}
                />
              ) : null}
              {hasTrackedMetrics ? (
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.cards,
                    padding: 12,
                    borderRadius: 4,
                    marginHorizontal: 4,
                    marginBottom: 8,
                    borderLeftWidth: 2,
                    borderLeftColor: colors.tertiary,
                  }}
                  wrap={false}
                >
                  <Text
                    style={{
                      fontSize: 8.5,
                      color: colors.secondary,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      fontWeight: "bold",
                      marginBottom: 6,
                    }}
                  >
                    Tracked Qualitatively
                  </Text>
                  {data.hcahpsEnabled ? (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 4 }}>
                      <Text style={{ fontWeight: "bold", color: colors.primaryText }}>HCAHPS / Patient Experience.</Text>{" "}
                      Affects Value-Based Purchasing, but the causal chain to documentation is indirect and organization-specific.
                    </Text>
                  ) : null}
                  {data.medErrorEnabled ? (
                    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45 }}>
                      <Text style={{ fontWeight: "bold", color: colors.primaryText }}>Medication Errors.</Text>{" "}
                      Cleaner real-time MAR documentation is associated with fewer near misses; track post-deployment via safety-event reporting.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

          <HeroSubtotal
            label="Quality Subtotal (Potential)"
            total={data.qualityTotal > 0 ? fmtCurrency(data.qualityTotal) : "Tracked"}
            caption="Validate baseline rates with your infection-control and quality teams before presenting."
          />

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 5 — REVENUE (Tracked Separately) */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>REVENUE</SectionLabel>
          <Text style={styles.sectionHeadline}>
            Why revenue lives elsewhere in this model.
          </Text>
          <Text style={styles.subHeadline}>
            The nursing ROI story is a quality and workforce story.
          </Text>

          <Text style={styles.body}>
            In the physician and APP care settings, ambient documentation creates a
            measurable revenue story — wRVU capture, DRG accuracy, denial prevention.
            For nursing, the picture is different: nursing documentation primarily
            informs care decisions and shapes labor outcomes rather than driving the
            revenue cycle, so the financial impact shows up in quality and workforce
            instead of billing.
          </Text>

          <Text style={styles.body}>
            This model focuses on the value drivers where nursing has the strongest,
            most defensible footprint: the QUALITY bucket (preventable harm events,
            sepsis bundle compliance) and the WORKFORCE bucket (retention, agency cost
            avoidance, overtime reduction). Keeping the revenue narrative with the
            care settings that actually drive billing makes both stories more credible.
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
              The Indirect Connection
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              Complete nursing documentation does create downstream organizational value:
              HCAHPS performance affects Value-Based Purchasing scores. HAC scores affect
              Medicare payment rates. Sepsis SEP-1 compliance affects public reporting
              and payer relationships. These flow through the model as quality outcomes
              rather than revenue line items — which keeps the framing both honest and
              defensible.
            </Text>
          </View>

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 7 — INVESTMENT CASE */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>THE INVESTMENT CASE</SectionLabel>
          <Text style={styles.sectionHeadline}>Infrastructure, Not Expense.</Text>
          <Text style={styles.body}>
            {(() => {
              const beds = fmtNum(data.staffedBeds);
              const annual = fmtCurrency(data.annualInvestment);
              let pricingPhrase: string;
              if (data.pricingModel === "perProvider") {
                pricingPhrase = `$${data.costPerBedPerMonth}/bed/month at ${beds} staffed beds`;
              } else if (data.pricingModel === "perEncounter" && data.costPerEncounter) {
                pricingPhrase = `${fmtCurrencyExact(data.costPerEncounter)}/encounter applied to projected volume`;
              } else if (data.pricingModel === "annual" && data.annualLicenseFee) {
                pricingPhrase = `a fixed annual license of ${fmtCurrency(data.annualLicenseFee)} across ${beds} staffed beds`;
              } else {
                pricingPhrase = `${beds} staffed beds`;
              }
              // The implementation fee is intentionally NOT folded into the
              // recurring Year 1–3 rows so the multi-year ROI math compares
              // apples-to-apples (a one-time setup charge would otherwise
              // distort Year 1 economics and the 3-year cumulative multiple).
              // Instead it surfaces as its own row at the top of the table
              // and a "true Year 1 outlay" footnote below — see also
              // pdf_layout_guidelines.md and replit.md > Implementation Fee
              // Treatment for the cross-surface convention.
              const implPhrase = data.implementationFee > 0
                ? ` A one-time implementation fee of ${fmtCurrency(data.implementationFee)} is shown separately on its own row above the recurring stream so the Year 1–3 economics below stay comparable.`
                : "";
              return `Recurring investment is ${annual} annually — ${pricingPhrase}.${implPhrase} Years 2–3 assume ${data.year2GrowthPct}% growth as adoption matures and documentation habits stabilize across the unit.`;
            })()}
          </Text>

          {/* 3-Year Projection table.
              When an implementation fee is configured, a dedicated "One-Time
              · Implementation" row renders ABOVE Year 1 with a tinted
              background and italic "tracked separately" cells in the Net /
              Cumulative columns. This makes the fee visually unmissable
              (users were searching the Year 1 row for it before this
              change) without folding it into recurring multi-year math. */}
          <View style={{ marginBottom: 10 }}>
            {/* Header row */}
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
              <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1 }}>Period</Text>
              <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Value</Text>
              <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Investment</Text>
              <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Net Value</Text>
              <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Cumulative</Text>
            </View>

            {/* One-Time Implementation row — only renders when impl fee > 0.
                Visually demarcated with cardBg tint + italic Net/Cumulative
                cells reading "tracked separately" so it cannot be misread
                as a recurring annual line. */}
            {data.implementationFee > 0 && (
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
                <Text style={{ flex: 1.4, fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>
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
              { label: "Year 1", value: y1Recurring, inv: data.annualInvestment, net: data.year1Net, cum: cumY1 },
              { label: "Year 2", value: y2Recurring, inv: data.annualInvestment, net: data.year2Net, cum: cumY2 },
              { label: "Year 3", value: y3Recurring, inv: data.annualInvestment, net: data.year3Net, cum: cumY3 },
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
                <Text style={{ flex: 1.4, fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{row.label}</Text>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(row.value)}</Text>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(row.inv)}</Text>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.net)}</Text>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(row.cum)}</Text>
              </View>
            ))}
          </View>

          {/* True Year 1 outlay footnote — only renders when an impl fee
              exists. Directly answers the most common reader question:
              "why isn't the implementation fee in Year 1?" Pre-computes
              the sum so the reader doesn't have to do mental math. */}
          {data.implementationFee > 0 && (
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
                {` ${fmtCurrency(data.annualInvestment + data.implementationFee)} `}
                <Text style={{ color: colors.secondary }}>
                  ({fmtCurrency(data.annualInvestment)} recurring + {fmtCurrency(data.implementationFee)} one-time implementation).
                  The Year 1 row above shows recurring economics only so the 3-year cumulative multiple isn't distorted by a one-time setup charge.
                </Text>
              </Text>
            </View>
          )}

          {/* Cumulative-multiple HERO. Replaces a small redBorderCallout
              that buried the punchline in body copy. Eyebrow / number /
              footnote stack — three separate Text nodes — so the multiple
              can stand at 36pt without wrapping. This is the page's
              takeaway and should land like one. */}
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
              Cumulative net under the modeled assumptions — alongside more time at
              the bedside and less end-of-shift charting for nursing staff.
            </Text>
          </View>

          {/* The previous version of this page included an "At Scale" projection
              (multiplied by a hardcoded 4×) and a "Key Metrics To Track" list with
              illustrative target percentages. Both were removed because they
              presented fabricated/placeholder figures alongside the real,
              data-driven 3-year table — creating exactly the "AI slop" feel a
              premium executive document must avoid. The cumulative-multiple
              callout above is the page's punchline; nothing else is needed. */}

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 8 — ASSESSMENT SUMMARY + METHODOLOGY */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.pageWrapper}>
          <SectionLabel>YOUR ASSESSMENT SUMMARY</SectionLabel>

          {/* Hero card — eyebrow / headline number / footnote pattern. The
              figure stands alone at hero size (36pt) so it can carry the page;
              descriptive context lives in the eyebrow above and the metadata
              footer below. Previously the figure was glued inline to the words
              "projected net value" in a single 24pt Text node, which capped
              how big the number could go without wrapping. */}
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
              {`${fmtNum(data.staffedBeds)} staffed beds · ${fmtNum(data.nurseFTEs)} nurse FTEs · $${fmtNum(data.costPerBedPerYear)}/bed per year`}
            </Text>
          </View>

          <Text style={styles.subSectionHeader}>Value Summary</Text>

          {/* Group totals must obey the same zero-state rule as the Page 2
              quadrants: when no quality/workforce drivers are enabled, render
              "Tracked" / "—" rather than literal "$0 (potential)" / "$0".
              Mismatched zero handling between Page 2 and Page 8 was an
              architect-flagged inconsistency. */}
          {/* QUALITY group */}
          <SummaryGroup
            label="QUALITY"
            total={
              data.qualityTotal > 0
                ? `${fmtCurrency(data.qualityTotal)} (potential)`
                : "Tracked"
            }
            rows={[
              { label: "HAPI Prevention", value: data.hapi.enabled ? fmtCurrency(data.hapi.value) : "—" },
              { label: "Falls Prevention", value: data.falls.enabled ? fmtCurrency(data.falls.value) : "—" },
              { label: "CAUTI Prevention", value: data.cauti.enabled ? fmtCurrency(data.cauti.value) : "—" },
              { label: "CLABSI Prevention", value: data.clabsi.enabled ? fmtCurrency(data.clabsi.value) : "—" },
              { label: "Sepsis Bundle Compliance", value: data.sepsis.enabled ? fmtCurrency(data.sepsis.value) : "—" },
              { label: "HAC Penalty Exposure", value: "Risk display only" },
              { label: "HCAHPS / Patient Experience", value: data.hcahpsEnabled ? "Qualitative" : "—" },
              { label: "Medication Error Reduction", value: data.medErrorEnabled ? "Qualitative" : "—" },
            ]}
          />

          <SummaryGroup
            label="WORKFORCE"
            total={data.workforceTotal > 0 ? fmtCurrency(data.workforceTotal) : "Tracked"}
            rows={[
              { label: "RN Retention", value: data.retention.enabled ? fmtCurrency(data.retention.value) : "—" },
              { label: "Agency & Travel Nurse Reduction", value: data.agency.enabled ? fmtCurrency(data.agency.value) : "—" },
              { label: "Overtime Reduction", value: data.overtime.enabled ? fmtCurrency(data.overtime.value) : "—" },
            ]}
          />

          <SummaryGroup
            label="CAPACITY"
            total="Tracked"
            rows={[
              { label: "Bedside / Direct Care Time", value: data.bedsideTimeEnabled ? "Tracked" : "—" },
            ]}
          />

          {/* REVENUE summary group: the explanatory sentence does not belong
              inside a label/value row — it broke the visual rhythm of the
              other groups. The group total carries the message; explanatory
              prose lives on Page 5 (Revenue) where it has room to breathe. */}
          <SummaryGroup
            label="REVENUE"
            total="Tracked Separately"
            rows={[
              { label: "Captured in the physician & APP models", value: "—" },
            ]}
          />

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
            <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 1 }}>
              Net Annual Value (Hard)
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>
              {fmtCurrency(data.netAnnualValue)}
            </Text>
          </View>

          {/* METHODOLOGY — only enabled drivers */}
          {/* minPresenceAhead keeps the section header from orphaning at the
              bottom of a page; if there isn't 60pt of room below it, react-pdf
              will break before the header instead of after. */}
          <Text style={styles.subSectionHeader} minPresenceAhead={60}>Methodology</Text>
          <View>
            {data.hapi.enabled ? (
              <MethodologyLine
                text={`HAPI: ${data.hapi.rate}/1,000 patient days. ${data.hapi.preventionPct}% documentation-attributable prevention rate. ${fmtCurrencyExact(data.hapi.costPerEvent)}/event. Source: Dowding et al., JAMIA 2012.`}
              />
            ) : null}
            {data.falls.enabled ? (
              <MethodologyLine
                text={`Falls: ${data.falls.rate}/1,000 patient days. ${data.falls.preventionPct}% documentation-attributable prevention rate. ${fmtCurrencyExact(data.falls.costPerEvent)}/event. Source: AHRQ inpatient fall cost benchmarks.`}
              />
            ) : null}
            {data.cauti.enabled ? (
              <MethodologyLine
                text={`CAUTI: ${data.cauti.rate}/1,000 cath-days at ${data.cauti.utilizationPct}% catheter utilization. ${data.cauti.preventionPct}% documentation-attributable prevention rate. ${fmtCurrencyExact(data.cauti.costPerEvent)}/event. Source: Meddings et al., JAMA Internal Medicine 2014.`}
              />
            ) : null}
            {data.clabsi.enabled ? (
              <MethodologyLine
                text={`CLABSI: ${data.clabsi.rate}/1,000 line-days at ${data.clabsi.utilizationPct}% central-line utilization. ${data.clabsi.preventionPct}% documentation-attributable prevention rate. ${fmtCurrencyExact(data.clabsi.costPerEvent)}/event. Source: CDC CLABSI cost-of-illness estimates.`}
              />
            ) : null}
            {data.sepsis.enabled ? (
              <MethodologyLine
                text={`Sepsis SEP-1: ${data.sepsis.ratePerThousand}/1,000 sepsis cases. ${data.sepsis.complianceGapPct}% non-compliant × ${data.sepsis.docLagPct}% doc-lag share. ${fmtCurrencyExact(data.sepsis.excessCostPerCase)} excess cost per case. ${data.sepsis.realizationPct}% realization.`}
              />
            ) : null}
            {data.hcahpsEnabled ? (
              <MethodologyLine
                text="HCAHPS: Tracked qualitatively. Patient-experience scores affect Value-Based Purchasing but the causal chain to documentation is indirect; no monetary impact is modeled."
              />
            ) : null}
            {data.medErrorEnabled ? (
              <MethodologyLine
                text="Medication Errors: Tracked qualitatively. Real-time MAR documentation supports earlier interception; outcome is unit-specific and not monetized in this assessment."
              />
            ) : null}
            {data.retention.enabled ? (
              <MethodologyLine
                text={`Retention: ${data.retention.turnoverPct}% annual turnover, ${data.retention.burnoutRelatedPct}% burnout-related. ${data.retention.impactPct}% impact scenario. ${fmtCurrencyExact(data.retention.replacementCost)} replacement cost. Source: NSI Nursing Solutions 2024.`}
              />
            ) : null}
            {data.agency.enabled ? (
              <MethodologyLine
                text={`Agency: ${data.agency.weeksPerVacancy} weeks coverage per vacancy at ${fmtCurrencyExact(data.agency.weeklyPremium)}/week premium.`}
              />
            ) : null}
            {data.overtime.enabled ? (
              <MethodologyLine
                text={`OT Reduction: ${data.overtime.otHrsPerNurseWeek} OT hrs/nurse/week at ${data.overtime.reductionPct}% reduction. $${data.overtime.otHourlyRate}/hour.`}
              />
            ) : null}
            {/* Closing tail: keep the last two universal methodology lines and
                the planning-purposes disclaimer together so they break to a
                new page as one block. Prevents single-bullet orphan pages. */}
            <View wrap={false}>
              <MethodologyLine
                text="HAC Penalty: 1% of Medicare revenue if in bottom quartile. Risk display only — not included in ROI total."
              />
              <MethodologyLine
                text="Revenue: Tracked separately in the physician and APP models, where billing originates."
              />
              <Text
                style={{
                  fontSize: 8.5,
                  fontStyle: "italic",
                  color: colors.tertiary,
                  lineHeight: 1.5,
                  marginTop: 14,
                }}
              >
                This assessment is for planning purposes. Hard value projections are based on
                user-provided staffing inputs. Potential value uses published clinical rates
                with documentation-attributable prevention rates that reflect the indirect
                causal chain. Validate with your organization's data post-implementation.
              </Text>
            </View>
          </View>

          <PageFooter orgName={orgName} />
        </View>
      </Page>
    </Document>
  );
};

// ───────────────────────── Summary Group helper ─────────────────────────

// SummaryGroup wraps as a single atomic block — splitting a 3-row summary
// across pages produces the orphan label / dangling-row layouts the visual
// review explicitly forbids. The wrap protection here is per-group, not per-
// row, because each group is small enough to always fit on one page.
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
      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary, textTransform: "uppercase", letterSpacing: 1.2 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{total}</Text>
    </View>
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
        <Text style={{ fontSize: 9.5, color: colors.secondary, flex: 1 }}>{row.label}</Text>
        <Text style={{ fontSize: 9.5, color: colors.primaryText }}>{row.value}</Text>
      </View>
    ))}
  </View>
);

// Wrap in a wrap={false} View so an individual bullet never splits across pages.
// This keeps multi-line bullets atomic and prevents the half-line collisions
// we saw when react-pdf broke a Text node across the page boundary.
// Body sits at 9pt (was 8.5pt — borderline unreadable on a Letter page).
const MethodologyLine = ({ text }: { text: string }) => (
  <View wrap={false}>
    <Text
      style={{
        fontSize: 9,
        color: colors.secondary,
        lineHeight: 1.5,
        marginBottom: 5,
      }}
    >
      {`• ${text}`}
    </Text>
  </View>
);

// ───────────────────────── Public API ─────────────────────────

export const generateNursingValueAssessmentPDF = async (
  data: NursingPDFInput,
): Promise<void> => {
  const blob = await pdf(<NursingPDFDocument data={data} />).toBlob();
  const safeOrg = (data.clientName || "abridge").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeDate = new Date().toISOString().slice(0, 10);
  await savePdfBlob(blob, `abridge-nursing-${safeOrg}-${safeDate}.pdf`);
};
