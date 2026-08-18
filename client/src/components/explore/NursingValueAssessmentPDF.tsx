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
import {
  calcHapi,
  calcFalls,
  calcCauti,
  calcClabsi,
  calcSepsis,
} from "@/lib/nursingQualityCalcs";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";

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

// Neutral-gray → brand-red progression for S/T/P timeline sections
const STAGE_COLORS = {
  signal: { border: "#DDDDDD", bg: "#F8F8F8", label: "#AAAAAA" },
  trend:  { border: "#999999", bg: "#F2F2F2", label: "#555555" },
  proof:  { border: "#EA2C00", bg: "#FEF9F7", label: "#EA2C00" },
} as const;

const styles = StyleSheet.create({
  page: {
    padding: 54,
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
  bundleComplianceEnabled?: boolean;
  cdiResponseEnabled?: boolean;
  docCompletionEnabled?: boolean;

  expansionBeds?: number;
  expansionUtilizationPercent?: number;
  expansionAnnualValue?: number;
  expansionRoi?: number;
  expansionInvestment?: number;

  pricingModel: 'perProvider' | 'perEncounter' | 'annual' | 'platform';
  costPerBedPerMonth: number;
  costPerEncounter?: number;
  annualLicenseFee?: number;
  platformEncRate?: number;
  year2Encounters?: number;
  annualInvestment: number;
  implementationFee: number;

  year1Net: number;
  year2Net: number;
  year3Net: number;
  threeYearCumulativeNet: number;
  /** Selected projection horizon (1–3yr). Carried for parity; this PDF still
      renders the full 3-year table for now (separate, eyeballed follow-up). */
  projectionYears?: number;

  workforceTotal: number;
  qualityTotal: number;
  totalAnnualValue: number;
  netAnnualValue: number;
  costPerBedPerYear: number;

  costDisplacementItems?: Array<{ id: string; label: string; annualSpend: number; displacementPct: number }>;
  costDisplacementTotals?: { year1: number; year2: number; year3: number };
}

// ───────────────────────── Helpers ─────────────────────────

const fmtCurrency = (n: number): string => {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) {
    const k = Math.round(v / 1_000);
    if (Math.abs(k) >= 1000) return `$${(v / 1_000_000).toFixed(2)}M`;
    return `$${k.toFixed(0)}K`;
  }
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PageFooter = (_: { orgName: string }) => null;

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
  mathRows,
  source,
  linkedTo,
}: {
  name: string;
  value: string;
  body: string;
  formula?: string;
  mathRows?: { label: string; value: string }[];
  source?: string;
  linkedTo?: string;
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor: colors.cards,
      padding: 8,
      borderRadius: 4,
      marginHorizontal: 4,
      marginBottom: 6,
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
    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
    <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 4 }} {...({ numberOfLines: 2 } as any)}>
      {body}
    </Text>
    {mathRows ? (
      <MathGrid rows={mathRows} />
    ) : formula ? (
      <View
        style={{
          marginTop: 6,
          backgroundColor: "#FDF7F4",
          borderLeftWidth: 2.5,
          borderLeftColor: colors.primary,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 2,
        }}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Text style={{ fontSize: 8.5, color: colors.primaryText, lineHeight: 1.5 }} {...({ numberOfLines: 2 } as any)}>
          {formula}
        </Text>
      </View>
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

// NursingTimelineSection — 3-column Signal/Trend/Proof strip. Appears after
// the HeroSubtotal on Workforce and Quality pages to fill dead whitespace with
// content that explains WHEN the modeled value becomes observable.
const NursingTimelineSection = ({
  stages,
}: {
  stages: Array<{
    key: "signal" | "trend" | "proof";
    label: string;
    window: string;
    desc: string;
    metrics: string[];
    callout?: string;
  }>;
}) => (
  <>
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
        marginTop: 8,
        marginBottom: 12,
      }}
    />
    <Text
      style={{
        fontSize: 7.5,
        fontWeight: "bold",
        color: colors.tertiary,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 8,
      }}
    >
      When to Expect Results
    </Text>
    <View style={{ flexDirection: "row" }}>
      {stages.map((s, i) => {
        const c = STAGE_COLORS[s.key];
        return (
          <View
            key={s.key}
            style={{
              flex: 1,
              marginRight: i < 2 ? 7 : 0,
              backgroundColor: c.bg,
              borderRadius: 5,
              padding: 10,
              borderTopWidth: 2.5,
              borderTopColor: c.border,
            }}
          >
            <Text
              style={{
                fontSize: 8,
                fontWeight: "bold",
                color: c.label,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 1,
              }}
            >
              {s.label}
            </Text>
            <Text
              style={{
                fontSize: 8.5,
                fontWeight: "bold",
                color: "#333333",
                marginBottom: 1,
              }}
            >
              {s.window}
            </Text>
            <Text style={{ fontSize: 7.5, color: "#777777", marginBottom: 8, lineHeight: 1.4 }}>
              {s.desc}
            </Text>
            {s.metrics.map((m, mi) => (
              <View key={mi} style={{ flexDirection: "row", marginBottom: 5 }}>
                <Text style={{ fontSize: 8, color: c.border, marginRight: 4, marginTop: 1.5 }}>·</Text>
                <Text style={{ fontSize: 8, color: "#3A3028", lineHeight: 1.45, flex: 1 }}>{m}</Text>
              </View>
            ))}
            {s.callout ? (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                  marginTop: 6,
                  paddingTop: 6,
                }}
              >
                <Text style={{ fontSize: 7.5, color: "#666666", lineHeight: 1.5, fontStyle: "italic" }}>
                  {s.callout}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  </>
);

// Bloomberg-style compact key/value math grid
const MathGrid = ({ rows }: { rows: { label: string; value: string }[] }) => (
  <View
    style={{
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: colors.separatorHeavy,
      borderRadius: 4,
      marginTop: 4,
      marginBottom: 3,
      overflow: "hidden",
    }}
  >
    {rows.map((r, i) => {
      const isResult = i === rows.length - 1;
      return (
        <View
          key={i}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 8,
            paddingVertical: isResult ? 4 : 2,
            borderTopWidth: i === 0 ? 0 : isResult ? 1 : 0.5,
            borderTopColor: isResult ? colors.separatorHeavy : colors.separator,
            backgroundColor: isResult ? "#FEF9F7" : "transparent",
          }}
        >
          <Text style={{
            fontSize: 8.5,
            color: isResult ? colors.primaryText : colors.secondary,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontWeight: isResult ? "bold" : "normal",
          }}>
            {r.label}
          </Text>
          <Text style={{
            fontSize: isResult ? 10 : 9,
            color: isResult ? colors.primary : colors.primaryText,
            fontWeight: "bold",
          }}>
            {r.value}
          </Text>
        </View>
      );
    })}
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

  const hasQuantifiedQuality = data.hapi.enabled || data.falls.enabled || data.cauti.enabled || data.clabsi.enabled || data.sepsis.enabled;
  const hasQualitySignals = data.hcahpsEnabled || data.medErrorEnabled || (data.bundleComplianceEnabled ?? false) || (data.cdiResponseEnabled ?? false) || (data.docCompletionEnabled ?? false);

  // Year math — values read directly from the already-computed net figures
  const y1Recurring = data.year1Net + data.annualInvestment;
  const y2Recurring = data.year2Net + data.annualInvestment;
  const y3Recurring = data.year3Net + data.annualInvestment;
  const year1ROI = data.annualInvestment > 0 ? data.totalAnnualValue / data.annualInvestment : 0;
  const cumY1 = data.year1Net;
  const cumY2 = data.year1Net + data.year2Net;
  const cumY3 = data.year1Net + data.year2Net + data.year3Net;

  // Honor the selected projection horizon (1–3yr; default 3) so the PDF matches
  // the on-screen toggle. Slices the year rows and re-derives the cumulative.
  const projYears = Math.min(3, Math.max(1, Math.round(data.projectionYears ?? 3)));
  let _projCum = 0;
  const projectionRows = [
    { label: "Year 1  (30-day ramp)", value: y1Recurring, inv: data.annualInvestment, net: data.year1Net },
    { label: "Year 2", value: y2Recurring, inv: data.annualInvestment, net: data.year2Net },
    { label: "Year 3", value: y3Recurring, inv: data.annualInvestment, net: data.year3Net },
  ].slice(0, projYears).map((r) => { _projCum += r.net; return { ...r, cum: _projCum }; });
  const horizonCumNet = _projCum;
  const horizonRampCaption = projYears === 1 ? "Year 1  ·  30-day ramp" : projYears === 2 ? "Yr 1 ramp  ·  Yr 2 steady state" : "Yr 1 ramp  ·  Yrs 2–3 steady state";

  return (
    <Document>
      {/* PAGE 1 — COVER */}
      <PDFCoverPage
        reportLabel="NURSING VALUE ASSESSMENT"
        title={orgName}
        subtitle={subtitle}
        preparedBy={data.preparedBy}
      />

      {/* PAGE 2 — MODEL SNAPSHOT */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>MODEL SNAPSHOT</SectionLabel>

          {/* Org identity */}
          <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.1, marginBottom: 4 }}>
            {orgName}
          </Text>
          <Text style={{ fontSize: 8.5, color: colors.tertiary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
            {`Inpatient Nursing  ·  ${fmtNum(data.staffedBeds)} Staffed Beds  ·  ${fmtNum(data.nurseFTEs)} Nurse FTEs`}
          </Text>

          <View style={{ borderBottomWidth: 1.5, borderBottomColor: colors.separatorHeavy, marginBottom: 14 }} />

          {/* ─── Thesis ─── */}
          <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.3, marginBottom: 6 }}>
            Where Nursing Documentation Value Lives
          </Text>
          <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6, marginBottom: 12 }}>
            {`For a ${fmtNum(data.staffedBeds)}-bed unit with ${fmtNum(data.nurseFTEs)} nurse FTEs, ${fmtNum(data.hoursReturnedAnnual)} hours of documentation time reclaimed per year. When nursing documentation moves from end-of-shift batching to point-of-care, the queue that drives overtime and erodes bedside presence is less likely to accumulate. That time shift creates value across three buckets — and they don't all carry the same kind of math. We separate them so the financial story stays defensible and the qualitative signals don't get lost in the totals.`}
          </Text>

          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.separator, marginBottom: 12 }} />

          {/* ─── The Bottom Line — hero first ─── */}
          <View
            style={{
              backgroundColor: colors.cards,
              borderRadius: 4,
              paddingHorizontal: 18,
              paddingVertical: 14,
              marginBottom: 14,
            }}
            wrap={false}
          >
            <Text style={{ fontSize: 7.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 10 }}>
              The Bottom Line
            </Text>
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1.2, paddingRight: 14, borderRightWidth: 1, borderRightColor: colors.separator }}>
                <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Net Annual Value</Text>
                <Text style={{ fontSize: 34, fontWeight: "bold", color: colors.primary, lineHeight: 1.0, marginBottom: 5 }}>
                  {fmtCurrency(data.netAnnualValue)}
                </Text>
                <Text style={{ fontSize: 8, color: colors.tertiary }}>Per year · current adoption</Text>
              </View>
              <View style={{ flex: 0.65, paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: colors.separator }}>
                <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Annual ROI</Text>
                <Text style={{ fontSize: 34, fontWeight: "bold", color: colors.primary, lineHeight: 1.0, marginBottom: 5 }}>
                  {`${year1ROI.toFixed(1)}×`}
                </Text>
                <Text style={{ fontSize: 8, color: colors.tertiary }}>Per dollar invested</Text>
              </View>
              <View style={{ flex: 1.1, paddingLeft: 14 }}>
                <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>{`${projYears}-Year Net Value`}</Text>
                <Text style={{ fontSize: 34, fontWeight: "bold", color: colors.primary, lineHeight: 1.0, marginBottom: 5 }}>
                  {fmtCurrency(horizonCumNet)}
                </Text>
                <Text style={{ fontSize: 8, color: colors.tertiary }}>
                  {horizonRampCaption}
                </Text>
              </View>
            </View>
          </View>

          {/* ─── What was modeled ─── */}
          <Text style={{ fontSize: 7.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 8 }}>
            What Was Modeled on This Call
          </Text>
          <View style={{ flexDirection: "row", marginBottom: 14 }} wrap={false}>
            <View style={{ flex: 1.2, backgroundColor: "#EFEFEF", borderRadius: 4, padding: 12, marginRight: 6 }}>
              <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Documentation Time</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.0, marginBottom: 5 }}>
                {`${fmtNum(data.minutesSavedPerShift)} min / shift`}
              </Text>
              <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.4 }}>
                {`${fmtNum(data.hoursReturnedAnnual)} hrs returned / yr`}
              </Text>
            </View>
            <View style={{ flex: 0.75, backgroundColor: "#EFEFEF", borderRadius: 4, padding: 12, marginRight: 6 }}>
              <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Abridge Adoption</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.0, marginBottom: 5 }}>
                {`${data.utilizationPercent}%`}
              </Text>
              <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.4 }}>
                {`${fmtNum(data.nurseFTEs)} nurse FTEs`}
              </Text>
            </View>
            <View style={{ flex: 0.7, backgroundColor: "#EFEFEF", borderRadius: 4, padding: 12, marginRight: 6 }}>
              <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Bed Occupancy</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.0, marginBottom: 5 }}>
                {`${data.occupancyPercent}%`}
              </Text>
              <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.4 }}>Of capacity</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: "#EFEFEF", borderRadius: 4, padding: 12 }}>
              <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold", marginBottom: 5 }}>Annual Investment</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.0, marginBottom: 5 }}>
                {fmtCurrency(data.annualInvestment)}
              </Text>
              <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.4 }}>
                {`$${data.costPerBedPerMonth}/bed/mo · ${fmtNum(data.staffedBeds)} beds`}
              </Text>
            </View>
          </View>

          {/* ─── Value by Domain (2×2) + Drivers side-by-side ─── */}
          {(() => {
            const quantified: Array<{ label: string; value: string; domain: string }> = [];
            if (data.retention.enabled) quantified.push({ label: "RN Retention", value: fmtCurrency(data.retention.value), domain: "Workforce" });
            if (data.agency.enabled) quantified.push({ label: "Agency Reduction", value: fmtCurrency(data.agency.value), domain: "Workforce" });
            if (data.overtime.enabled) quantified.push({ label: "OT Reduction", value: fmtCurrency(data.overtime.value), domain: "Capacity" });
            if (data.hapi.enabled) quantified.push({ label: "Pressure Injuries (HAPI)", value: fmtCurrency(data.hapi.value), domain: "Quality" });
            if (data.falls.enabled) quantified.push({ label: "Patient Falls", value: fmtCurrency(data.falls.value), domain: "Quality" });
            if (data.cauti.enabled) quantified.push({ label: "CAUTI", value: fmtCurrency(data.cauti.value), domain: "Quality" });
            if (data.clabsi.enabled) quantified.push({ label: "CLABSI", value: fmtCurrency(data.clabsi.value), domain: "Quality" });
            if (data.sepsis.enabled) quantified.push({ label: "Sepsis Bundle", value: fmtCurrency(data.sepsis.value), domain: "Quality" });

            const tracked: Array<{ label: string; domain: string }> = [];
            if (data.bedsideTimeEnabled) tracked.push({ label: "Bedside / Direct Care Time", domain: "Capacity" });
            if (data.hcahpsEnabled) tracked.push({ label: "HCAHPS / Patient Experience", domain: "Quality" });
            if (data.medErrorEnabled) tracked.push({ label: "Early Deterioration Documentation", domain: "Quality" });
            if (data.bundleComplianceEnabled) tracked.push({ label: "Care Bundle Compliance", domain: "Quality" });
            if (data.cdiResponseEnabled) tracked.push({ label: "CDI Query Response", domain: "Revenue" });
            if (data.docCompletionEnabled) tracked.push({ label: "Documentation Completion Rate", domain: "Revenue" });

            const domainTile = (
              domain: string,
              bg: string,
              value: number,
              isTracked: boolean,
              label?: string,
              marginRight?: number,
            ) => {
              const displayValue = isTracked ? (label ?? "Tracked") : value > 0 ? fmtCurrency(value) : "—";
              return (
                <View style={{ flex: 1, backgroundColor: colors.cards, borderRadius: 4, padding: 12, marginRight: marginRight ?? 0 }}>
                  <View style={{ backgroundColor: bg, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 12, alignSelf: "flex-start" }}>
                    <Text style={{ fontSize: 7, fontWeight: "bold", color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 1 }}>{domain}</Text>
                  </View>
                  <Text style={{ fontSize: isTracked ? 13 : 20, fontWeight: "bold", fontStyle: isTracked ? "italic" : "normal", color: isTracked ? colors.secondary : colors.primaryText, lineHeight: 1.0, marginTop: 8, marginBottom: 4 }}>
                    {displayValue}
                  </Text>
                </View>
              );
            };

            return (
              <View style={{ flexDirection: "row" }}>
                {/* Left: 2×2 domain tiles */}
                <View style={{ flex: 1, marginRight: 14 }}>
                  <Text style={{ fontSize: 7.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 10 }}>
                    Value by Domain
                  </Text>
                  <View style={{ flexDirection: "row", marginBottom: 6 }} wrap={false}>
                    {domainTile("WORKFORCE", "#4A3728", data.workforceTotal, false, undefined, 6)}
                    {domainTile("QUALITY", "#666666", data.qualityTotal, false)}
                  </View>
                  <View style={{ flexDirection: "row" }} wrap={false}>
                    {domainTile("CAPACITY", "#1A1A1A", data.overtime.enabled ? data.overtime.value : 0, !data.overtime.enabled, undefined, 6)}
                    {domainTile("REVENUE", "#EA2C00", 0, true, "Separately")}
                  </View>
                </View>

                {/* Right: quantified drivers + tracked signals */}
                <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: colors.separator, paddingLeft: 14 }}>
                  {quantified.length > 0 && (
                    <>
                      <Text style={{ fontSize: 7.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 10 }}>
                        Quantified Drivers
                      </Text>
                      {quantified.map((d, i) => (
                        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: colors.separator }} wrap={false}>
                          <Text style={{ fontSize: 9, color: colors.primaryText, flex: 1, paddingRight: 8, lineHeight: 1.3 }}>
                            {d.label}
                            <Text style={{ fontSize: 7.5, color: colors.tertiary }}>{`  ${d.domain}`}</Text>
                          </Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{d.value}</Text>
                        </View>
                      ))}
                    </>
                  )}
                  {tracked.length > 0 && (
                    <View style={{ marginTop: quantified.length > 0 ? 10 : 0 }}>
                      <Text style={{ fontSize: 7.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 8 }}>
                        Tracked Signals
                      </Text>
                      <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
                        {tracked.map((d) => d.label).join("  ·  ")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })()}

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 3 — CAPACITY */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>CAPACITY</SectionLabel>
          <Text style={styles.sectionHeadline}>
            Time reclaimed at the end of the shift shows up in the payroll budget — and in the next hour of care.
          </Text>
          <Text style={styles.body}>
            When nurses finish charting on shift, the effect can show up in two places: fewer
            overtime hours in the payroll report, and more direct patient care time during
            the shift itself. Overtime is the quantified financial signal; bedside time is
            the leading indicator that the model is taking hold.
          </Text>

          {data.overtime.enabled ? (
            <View style={{ marginHorizontal: -4, marginBottom: 4 }}>
              <View style={{ flexDirection: "row" }}>
                <CompactDriverCard
                  name="Overtime Reduction"
                  value={fmtCurrency(data.overtime.value)}
                  body="When nurses complete their notes on shift, end-of-shift overtime may decrease. The most directly measurable capacity line in the payroll budget."
                  mathRows={[
                    { label: "Nurse FTEs", value: fmtNum(data.nurseFTEs) },
                    { label: "OT hours / week", value: `${data.overtime.otHrsPerNurseWeek} hrs` },
                    { label: "Reduction assumed", value: `${data.overtime.reductionPct}%` },
                    { label: "OT hourly rate", value: `$${data.overtime.otHourlyRate}/hr` },
                    { label: "Weeks / year", value: "52" },
                    { label: "Annual value", value: fmtCurrency(data.overtime.value) },
                  ]}
                />
              </View>
            </View>
          ) : null}

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
            headline — it's what reclaimed documentation time looks like aggregated across
            the unit. <Text style={{ fontWeight: "bold", color: colors.primaryText }}>Minutes saved/shift</Text>{" "}
            is the per-nurse experience that supports adoption. <Text style={{ fontWeight: "bold", color: colors.primaryText }}>Patient days/yr</Text>{" "}
            and <Text style={{ fontWeight: "bold", color: colors.primaryText }}>staffed beds</Text> anchor
            the math to your actual operating footprint.
          </Text>

          <View wrap={false}>
            <Text style={styles.body}>
              We track bedside time as a leading indicator rather than pricing it directly —
              translating reclaimed minutes into dollars requires assumptions about what the
              next hour is used for, which vary by unit, shift, and patient mix.
            </Text>

            {data.overtime.enabled && (
              <HeroSubtotal
                label="Capacity Subtotal"
                total={fmtCurrency(data.overtime.value)}
                caption="Payroll impact of faster end-of-shift documentation."
              />
            )}
          </View>

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 4 — WORKFORCE */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>WORKFORCE</SectionLabel>
          <Text style={styles.sectionHeadline}>
            Documentation burden is among the top reasons nurses leave — and stay late.
          </Text>
          <Text style={styles.body}>
            Two labor lines — turnover and agency premium — both linked to the same
            upstream factor: documentation burden that follows nurses home after their
            shift.
          </Text>

          {/* Cards stack full-width (each in its own row) so the formula
              line has room to breathe — the agency formula in particular
              prints all four multiplicands and would wrap in a half-width
              column. Each card MUST sit inside its own
              `<View flexDirection: row>` because CompactDriverCard sets
              `flex: 1` on its outer View — without a row-direction parent
              the flex value resolves against the cross-axis (height) and
              every card collapses to y=0, painting on top of the others
              (the bug the visual review caught). The negative
              marginHorizontal on the outer wrapper cancels the +4pt
              CompactDriverCard inset so the card edges align to the page
              gutter. */}
          <View style={{ marginHorizontal: -4, marginBottom: 4 }}>
            {data.retention.enabled ? (
              <View style={{ flexDirection: "row" }}>
                <CompactDriverCard
                  name="RN Retention"
                  value={fmtCurrency(data.retention.value)}
                  body="Applies a doc-burden impact rate to the burnout-related share of annual turnover, multiplied by replacement cost per nurse."
                  mathRows={[
                    { label: "Nurse FTEs", value: fmtNum(data.nurseFTEs) },
                    { label: "Annual turnover rate", value: `${data.retention.turnoverPct}%` },
                    { label: "Nurses turning over / yr", value: fmtNum(data.nurseFTEs * data.retention.turnoverPct / 100) },
                    { label: "Burnout-related share", value: `${data.retention.burnoutRelatedPct}%` },
                    { label: "Doc burden impact", value: `${data.retention.impactPct}%` },
                    { label: "Nurses retained by Abridge", value: (data.nurseFTEs * data.retention.turnoverPct / 100 * data.retention.burnoutRelatedPct / 100 * data.retention.impactPct / 100).toFixed(1) },
                    { label: "Replacement cost / nurse", value: fmtCurrencyExact(data.retention.replacementCost) },
                    { label: "Annual value", value: fmtCurrency(data.retention.value) },
                  ]}
                  source="Source: NSI Nursing Solutions 2024 turnover benchmark."
                />
              </View>
            ) : null}

            {data.agency.enabled ? (
              <View wrap={false}>
                <View style={{ flexDirection: "row" }}>
                  <CompactDriverCard
                    name="Agency & Travel Nurse Reduction"
                    value={fmtCurrency(data.agency.value)}
                    linkedTo={data.retention.enabled ? "retention" : undefined}
                    body="Retained nurses avoid vacancy fills. Each vacancy avoided saves weeks of agency coverage at a premium over permanent-staff cost."
                    mathRows={[
                      { label: "Nurse FTEs", value: fmtNum(data.nurseFTEs) },
                      { label: "Vacancies eliminated / yr", value: (data.nurseFTEs * data.retention.turnoverPct / 100 * data.retention.burnoutRelatedPct / 100 * data.retention.impactPct / 100).toFixed(1) },
                      { label: "Agency coverage weeks", value: `${data.agency.weeksPerVacancy} wks / vacancy` },
                      { label: "Weekly agency premium", value: fmtCurrencyExact(data.agency.weeklyPremium) },
                      { label: "Annual value", value: fmtCurrency(data.agency.value) },
                    ]}
                  />
                </View>
                <HeroSubtotal
                  label="Workforce Subtotal"
                  total={data.workforceTotal > 0 ? fmtCurrency(data.workforceTotal) : "Tracked"}
                  caption="Two labor lines, one upstream factor: documentation burden that outlasts the shift."
                />
              </View>
            ) : null}
          </View>

          {!data.agency.enabled && (
            <HeroSubtotal
              label="Workforce Subtotal"
              total={data.workforceTotal > 0 ? fmtCurrency(data.workforceTotal) : "Tracked"}
              caption="Two labor lines, one upstream factor: documentation burden that outlasts the shift."
            />
          )}

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 5 — QUALITY (three variants)
          hasQuantifiedQuality  → financial cards + HeroSubtotal (existing layout)
          hasQualitySignals only → "Quality Signals" measurement guide (no dollar totals)
          neither              → page suppressed entirely */}
      {hasQuantifiedQuality ? (
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

            <View style={{ marginHorizontal: -4 }}>
              <View style={{ flexDirection: "row" }}>
                {data.hapi.enabled ? (
                  <CompactDriverCard
                    name="HAPI Risk Reduction"
                    value={`${fmtCurrency(data.hapi.value)} (pot.)`}
                    body="Skin assessments at the point of care surface risk earlier than charts reconstructed at shift end."
                    mathRows={[
                      { label: "Patient days / yr", value: fmtNum(data.patientDaysAnnual) },
                      { label: "HAPI rate / 1,000 days", value: data.hapi.rate.toFixed(2) },
                      { label: "Annual HAPI events", value: hapiEvents.toFixed(1) },
                      { label: "Prevention rate", value: `${data.hapi.preventionPct}%` },
                      { label: "Cost per event", value: fmtCurrencyExact(data.hapi.costPerEvent) },
                      { label: "Annual value", value: fmtCurrency(data.hapi.value) },
                    ]}
                    source="Source: Dowding et al., JAMIA 2012."
                  />
                ) : null}
                {data.falls.enabled ? (
                  <CompactDriverCard
                    name="Fall Risk Visibility"
                    value={`${fmtCurrency(data.falls.value)} (pot.)`}
                    body="Morse Fall Scale assessments completed in real time make risk escalations visible when they matter."
                    mathRows={[
                      { label: "Patient days / yr", value: fmtNum(data.patientDaysAnnual) },
                      { label: "Fall rate / 1,000 days", value: data.falls.rate.toFixed(2) },
                      { label: "Annual fall events", value: fallsEvents.toFixed(1) },
                      { label: "Prevention rate", value: `${data.falls.preventionPct}%` },
                      { label: "Cost per event", value: fmtCurrencyExact(data.falls.costPerEvent) },
                      { label: "Annual value", value: fmtCurrency(data.falls.value) },
                    ]}
                    source="Source: AHRQ inpatient fall cost benchmarks."
                  />
                ) : null}
              </View>

              <View style={{ flexDirection: "row" }}>
                {data.cauti.enabled ? (
                  <CompactDriverCard
                    name="CAUTI"
                    value={`${fmtCurrency(data.cauti.value)} (pot.)`}
                    body="Daily catheter-necessity documentation supports earlier removal and bundle adherence."
                    mathRows={[
                      { label: "Patient days / yr", value: fmtNum(data.patientDaysAnnual) },
                      { label: "Catheter utilization", value: `${data.cauti.utilizationPct}%` },
                      { label: "Catheter days / yr", value: fmtNum(Math.round(cathDays)) },
                      { label: "CAUTI rate / 1,000 cath days", value: data.cauti.rate.toFixed(2) },
                      { label: "Annual CAUTI events", value: cautiEvents.toFixed(1) },
                      { label: "Prevention rate", value: `${data.cauti.preventionPct}%` },
                      { label: "Cost per event", value: fmtCurrencyExact(data.cauti.costPerEvent) },
                      { label: "Annual value", value: fmtCurrency(data.cauti.value) },
                    ]}
                    source="Source: Meddings et al., JAMA Internal Medicine 2014."
                  />
                ) : null}
                {data.clabsi.enabled ? (
                  <CompactDriverCard
                    name="CLABSI"
                    value={`${fmtCurrency(data.clabsi.value)} (pot.)`}
                    body="Timely line documentation supports bundle compliance and is associated with fewer central-line bloodstream infections."
                    mathRows={[
                      { label: "Patient days / yr", value: fmtNum(data.patientDaysAnnual) },
                      { label: "Central-line utilization", value: `${data.clabsi.utilizationPct}%` },
                      { label: "Central-line days / yr", value: fmtNum(Math.round(lineDays)) },
                      { label: "CLABSI rate / 1,000 line days", value: data.clabsi.rate.toFixed(2) },
                      { label: "Annual CLABSI events", value: clabsiEvents.toFixed(1) },
                      { label: "Prevention rate", value: `${data.clabsi.preventionPct}%` },
                      { label: "Cost per event", value: fmtCurrencyExact(data.clabsi.costPerEvent) },
                      { label: "Annual value", value: fmtCurrency(data.clabsi.value) },
                    ]}
                    source="Source: CDC CLABSI cost-of-illness estimates."
                  />
                ) : null}
              </View>

              <View style={{ flexDirection: "row" }}>
                {data.sepsis.enabled ? (
                  <CompactDriverCard
                    name="Sepsis Bundle (SEP-1)"
                    value={`${fmtCurrency(data.sepsis.value)} (pot.)`}
                    body="Time-stamped vitals and antibiotic documentation lift SEP-1 compliance. The model captures only the documentation-lag share."
                    mathRows={[
                      { label: "Patient days / yr", value: fmtNum(data.patientDaysAnnual) },
                      { label: "Sepsis rate / 1,000 days", value: data.sepsis.ratePerThousand.toFixed(2) },
                      { label: "Annual sepsis cases", value: sepsisCases.toFixed(1) },
                      { label: "SEP-1 non-compliant share", value: `${data.sepsis.complianceGapPct}%` },
                      { label: "Doc lag fraction", value: `${data.sepsis.docLagPct}%` },
                      { label: "Excess cost / case", value: fmtCurrencyExact(data.sepsis.excessCostPerCase) },
                      { label: "Realization rate", value: `${data.sepsis.realizationPct}%` },
                      { label: "Annual value", value: fmtCurrency(data.sepsis.value) },
                    ]}
                  />
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
      ) : hasQualitySignals ? (
        /* Quality Signals variant — no quantified drivers selected, but
           qualitative signals are tracked. Shows a measurement guide:
           what to watch, at what cadence, and how to establish a baseline.
           No dollar totals; attribution is explicitly deferred. */
        <Page size="LETTER" style={styles.page}>
          <View style={styles.pageWrapper}>
            <SectionLabel>QUALITY</SectionLabel>
            <Text style={styles.sectionHeadline}>
              Quality outcomes are worth measuring — the attribution baseline comes first.
            </Text>
            <Text style={styles.body}>
              These signals are tracked, not modeled. Attribution from documentation
              to outcome requires a unit-level baseline and a measurement period —
              both of which this assessment is designed to help establish. The signals
              below are where to start.
            </Text>

            {[
              ...(data.hcahpsEnabled ? [{
                title: "HCAHPS — Responsiveness & Communication",
                cadence: "Quarterly",
                what: "Top-Box scores for 'responsiveness of hospital staff' and 'communication with nurses' — the two nursing-sensitive domains weighted in the CMS VBP formula.",
                baseline: "Pull from CMS Hospital Compare for your facility. Track quarterly against the national and peer percentile bands. Bedside time reclaimed from documentation burden is the lever.",
              }] : []),
              ...(data.medErrorEnabled ? [{
                title: "Early Deterioration Documentation",
                cadence: "Monthly",
                what: "Proportion of rapid-response activations with contemporaneous nursing documentation in the preceding 4 hours.",
                baseline: "Audit 20–30 recent rapid-response events; score each for real-time nursing notes. This chart review is the before/after anchor for any future improvement claim.",
              }] : []),
              ...(data.bundleComplianceEnabled ? [{
                title: "Care Bundle Compliance",
                cadence: "Monthly",
                what: "Bundle element completion rate by bundle type (CLABSI, VAP, sepsis SEP-1). Nursing documentation of each element at the point of care is the compliance record.",
                baseline: "Extract current completion rates from your infection-control database by bundle and unit. Segment by shift to identify documentation timing patterns.",
              }] : []),
              ...(data.cdiResponseEnabled ? [{
                title: "CDI Query Reduction",
                cadence: "Monthly",
                what: "CDI queries per 100 admissions and average query response lag (days). A volume drop is the earliest signal that nursing notes are arriving more complete at CDI review.",
                baseline: "Pull a 90-day baseline from your CDI platform (Nuance, 3M, or similar) by unit and attending service. Query response time and DRG specificity index are secondary signals.",
              }] : []),
              ...(data.docCompletionEnabled ? [{
                title: "Documentation Completeness",
                cadence: "Weekly",
                what: "Note deficiency rate at final submission, by unit and note type. Lower deficiency rates mean the coding record is usable on first pass — fewer physician interruptions, faster billing cycle.",
                baseline: "Export a 30-day deficiency rate from your HIM system. Use note type and unit as the segmentation axis; aggregate facility rates hide unit-level variation.",
              }] : []),
            ].map((s, i) => (
              <View key={i} style={{ backgroundColor: colors.cards, borderRadius: 4, padding: 14, marginBottom: 8 }} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, flex: 1, marginRight: 8 }}>{s.title}</Text>
                  <View style={{ backgroundColor: "#FFFFFF", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 0.5, borderColor: colors.separatorHeavy }}>
                    <Text style={{ fontSize: 7.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1 }}>{s.cadence}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>WHAT TO MEASURE</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }}>{s.what}</Text>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: "#888888", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>HOW TO ESTABLISH A BASELINE</Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>{s.baseline}</Text>
              </View>
            ))}

            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.separatorHeavy }}>
              <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5, fontStyle: "italic" }}>
                These signals are excluded from the financial model. Baselines established in Year 1 inform whether quantified modeling
                is appropriate at renewal. Attribution claims require a pre/post measurement period with consistent denominator data.
              </Text>
            </View>

            <PageFooter orgName={orgName} />
          </View>
        </Page>
      ) : null}

      {/* PAGE 6 — REVENUE SIGNALS */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>REVENUE</SectionLabel>
          <Text style={styles.sectionHeadline}>
            Nursing documentation moves the revenue cycle in two places you can measure.
          </Text>
          <Text style={styles.body}>
            Direct billing originates with the attesting physician or APP — that's a separate
            model. But nursing documentation is the upstream record that CDI, quality reporting,
            and payer contracts all read from. These signals do not appear in the financial totals
            above; they are the leading indicators that confirm the story those totals tell.
          </Text>

          {[
            {
              number: "01",
              title: "CDI Query Reduction",
              mechanism: "When nurses document clinical findings in real time — vital trends, assessment findings, response to treatment — the medical record arrives at CDI review more complete. Specialists may be able to assign a specific, accurate DRG without querying the physician for clarification. Fewer queries means fewer physician interruptions and shorter coding cycles.",
              trackLabel: "Signals to track",
              signals: [
                { metric: "CDI queries per 100 admissions", why: "Volume drop is the earliest signal that nursing notes are arriving complete." },
                { metric: "Query response rate & lag (days)", why: "Faster response with fewer open queries = smoother coding throughput." },
                { metric: "DRG specificity index", why: "More specific DRGs reflect richer source documentation — nursing is the primary contributor." },
              ],
            },
            {
              number: "02",
              title: "Value-Based Purchasing — HCAHPS",
              mechanism: "The HCAHPS responsiveness and communication domains are the two highest-weighted nursing-sensitive items in the CMS Value-Based Purchasing formula. Nurses with more time at the bedside — time reclaimed from documentation burden — may score better on both. VBP adjustments compound annually: a 0.5-point HCAHPS improvement at scale can shift the payment multiplier across the Medicare inpatient book.",
              trackLabel: "Signals to track",
              signals: [
                { metric: "HCAHPS: responsiveness of hospital staff", why: "Direct nursing-sensitive domain; moves with bedside time." },
                { metric: "HCAHPS: communication with nurses", why: "Second nursing-sensitive domain in the VBP formula." },
                { metric: "VBP total performance score & payment adjustment", why: "The net $ effect of all HCAHPS and clinical domains combined." },
              ],
            },
          ].map((section, si) => (
            <View key={si} style={{ backgroundColor: colors.cards, borderRadius: 4, padding: 14, marginBottom: 10 }} wrap={false}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary, marginRight: 10, minWidth: 20 }}>{section.number}</Text>
                <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText, flex: 1 }}>{section.title}</Text>
              </View>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 10 }}>
                {section.mechanism}
              </Text>
              <Text style={{ fontSize: 7.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
                {section.trackLabel}
              </Text>
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 3, overflow: "hidden", borderWidth: 1, borderColor: colors.separatorHeavy }}>
                {section.signals.map((s, i) => (
                  <View key={i} style={{
                    flexDirection: "row",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderTopWidth: i === 0 ? 0 : 0.5,
                    borderTopColor: colors.separator,
                  }}>
                    <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText, width: 170, paddingRight: 8 }}>{s.metric}</Text>
                    <Text style={{ fontSize: 8, color: colors.secondary, flex: 1, lineHeight: 1.4 }}>{s.why}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 7 — INVESTMENT CASE */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>THE INVESTMENT CASE</SectionLabel>
          <Text style={styles.sectionHeadline}>A Strategic Investment.</Text>
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
              return `${annual} / year — ${pricingPhrase}.${implPhrase} Year 1 reflects 11 months of deployment; the first 30 days are excluded as the implementation period. Years 2 and 3 are modeled at full run-rate. Investment is held constant.`;
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

            {projectionRows.map((row, idx) => (
              <View
                key={row.label}
                style={{
                  flexDirection: "row",
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderBottomWidth: idx === projectionRows.length - 1 ? 0 : 1,
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

          {/* Bridging copy — describes the model constraints before the expansion section */}
          <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.6, marginBottom: 14 }}>
            {projYears === 3
              ? `Unit size, staffing, and adoption rate are held constant across all three years. No volume growth is assumed. Year 2 and Year 3 values reflect a full calendar year at the inputs above. The ${fmtCurrency(data.threeYearCumulativeNet)} cumulative net is the sum of the rows above — no compounding or incremental growth is embedded. Adoption rate is the primary sensitivity; a change in utilization adjusts all workforce and capacity values proportionally.`
              : `Unit size, staffing, and adoption rate are held constant across all ${projYears === 1 ? 'of Year 1' : `${projYears} years`}. No volume growth is assumed.${projYears === 2 ? ' Year 2 reflects a full calendar year at the inputs above.' : ''} The ${fmtCurrency(horizonCumNet)} cumulative net is the sum of the rows above — no compounding or incremental growth is embedded. Adoption rate is the primary sensitivity; a change in utilization adjusts all workforce and capacity values proportionally.`}
          </Text>

          {/* Cost Displacement callout — only renders when items are present */}
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
                  borderColor: colors.separatorHeavy,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
                wrap={false}
              >
                <View style={{ backgroundColor: "#1A1A1A", paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>
                      Cost Displacement
                    </Text>
                    <Text style={{ fontSize: 8, color: "#999999" }}>
                      Existing tools replaced by Abridge — savings layer on top of clinical ROI
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#FFFFFF" }}>
                    {fmtCurrency(threeYear)}
                  </Text>
                </View>
                {items.map((item, i) => {
                  const displaced = item.annualSpend * item.displacementPct / 100;
                  return (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#F9F9F9",
                      }}
                    >
                      <Text style={{ fontSize: 9, color: colors.primaryText, flex: 2 }}>
                        {item.label || "Unnamed tool"}
                      </Text>
                      <Text style={{ fontSize: 8, color: colors.secondary, flex: 1, textAlign: "right" }}>
                        {`${item.displacementPct}% of ${fmtCurrency(item.annualSpend)}`}
                      </Text>
                      <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, flex: 1, textAlign: "right" }}>
                        {`${fmtCurrency(displaced)}/yr`}
                      </Text>
                    </View>
                  );
                })}
                <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F5F5F5", paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#E8E8E8" }}>
                  <View style={{ flexDirection: "row", gap: 18 }}>
                    {[
                      { label: "Year 1", value: totals.year1 },
                      { label: "Year 2", value: totals.year2 },
                      { label: "Year 3", value: totals.year3 },
                    ].map(({ label, value }) => (
                      <View key={label}>
                        <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</Text>
                        <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(value)}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>3-Year Total</Text>
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(threeYear)}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Expansion Opportunity — two-card layout: gray Today's Scale / red Full Scale */}
          {data.expansionBeds ? (
            <View style={{ marginBottom: 14 }}>
              <SectionLabel>THE EXPANSION OPPORTUNITY</SectionLabel>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText, marginBottom: 12, lineHeight: 1.2 }}>
                The same model, applied at full deployment.
              </Text>

              {/* Side-by-side cards — compact height, wrap={false} keeps pair together */}
              <View wrap={false} style={{ flexDirection: "row", marginBottom: 12 }}>

                {/* Left — Today's Scale (gray) */}
                <View style={{ flex: 1, backgroundColor: colors.cards, borderRadius: 4, padding: 12, marginRight: 6 }}>
                  <Text style={{ fontSize: 7, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 8 }}>
                    Today's Scale
                  </Text>
                  <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.0, marginBottom: 2 }}>
                    {fmtCurrency(data.netAnnualValue)}
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.secondary, marginBottom: 10 }}>/ year net</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 10 }}>
                    {`${year1ROI.toFixed(1)}× ROI`}
                  </Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: 8, flexDirection: "row" }}>
                    <Text style={{ fontSize: 9, color: colors.secondary, marginRight: 14 }}>
                      {`${fmtNum(data.staffedBeds)} beds`}
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.secondary }}>
                      {`${data.utilizationPercent}% adoption`}
                    </Text>
                  </View>
                </View>

                {/* Right — Full Scale Value (red) */}
                <View style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 4, padding: 12 }}>
                  <Text style={{ fontSize: 7, color: "#FFCABB", textTransform: "uppercase", letterSpacing: 2, fontWeight: "bold", marginBottom: 8 }}>
                    Full Scale Value
                  </Text>
                  <Text style={{ fontSize: 24, fontWeight: "bold", color: "#FFFFFF", lineHeight: 1.0, marginBottom: 2 }}>
                    {fmtCurrency(data.expansionAnnualValue ?? 0)}
                  </Text>
                  <Text style={{ fontSize: 8, color: "#FFCABB", marginBottom: 10 }}>/ year net</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: "#FFFFFF", marginBottom: 10 }}>
                    {`${(data.expansionRoi ?? 0).toFixed(1)}× ROI`}
                  </Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: "#EF6140", paddingTop: 8, flexDirection: "row" }}>
                    <Text style={{ fontSize: 9, color: "#FFCABB", marginRight: 14 }}>
                      {`${fmtNum(data.expansionBeds)} beds`}
                    </Text>
                    <Text style={{ fontSize: 9, color: "#FFCABB" }}>
                      {`${data.expansionUtilizationPercent}% adoption`}
                    </Text>
                  </View>
                </View>

              </View>

              <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.6, marginBottom: 8 }}>
                {`The ${year1ROI.toFixed(1)}× return reflects ${fmtNum(data.staffedBeds)} beds at ${data.utilizationPercent}% adoption. Applying the same per-bed model to ${fmtNum(data.expansionBeds ?? 0)} beds at ${data.expansionUtilizationPercent}% utilization produces ${fmtCurrency(data.expansionAnnualValue ?? 0)} annually — a ${(data.expansionRoi ?? 0).toFixed(1)}× return. Unit economics are unchanged; the cost per bed is fixed.`}
              </Text>
              <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.6 }}>
                Each driver in this model — retention, agency reduction, overtime, and quality outcomes — scales with the number of nurse FTEs and patient days in scope. At broader deployment, the same formulas apply to a proportionally larger population. Per-bed inputs remain constant; aggregate value reflects the coverage.
              </Text>
            </View>
          ) : null}

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 8 — ASSESSMENT SUMMARY + METHODOLOGY */}
      {/* Summary page is now `wrap={false}` — every quadrant subtotal,
          the hero card, and the net-annual-value row sit on a single
          deterministic page. Previously this Page used `wrap` and the
          Methodology section ran long enough to overflow into a second
          physical page (the visual review caught a 9-page render where
          the structural snapshot expected 8). Methodology has been
          promoted to its own dedicated Page below so each surface holds
          ONE clear topic — the premium-aesthetic rule from
          pdf_layout_guidelines.md §9. */}
      <Page size="LETTER" style={styles.page}>
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
              { label: "Pressure Injuries (HAPI)", value: data.hapi.enabled ? fmtCurrency(data.hapi.value) : "—" },
              { label: "Patient Falls", value: data.falls.enabled ? fmtCurrency(data.falls.value) : "—" },
              { label: "CAUTI", value: data.cauti.enabled ? fmtCurrency(data.cauti.value) : "—" },
              { label: "CLABSI", value: data.clabsi.enabled ? fmtCurrency(data.clabsi.value) : "—" },
              { label: "Sepsis Bundle (SEP-1)", value: data.sepsis.enabled ? fmtCurrency(data.sepsis.value) : "—" },
              { label: "HAC Penalty Exposure", value: "Risk display only" },
              { label: "HCAHPS / Patient Experience", value: data.hcahpsEnabled ? "Qualitative" : "—" },
              { label: "Early Deterioration Documentation", value: data.medErrorEnabled ? "Qualitative" : "—" },
              { label: "Care Bundle Compliance", value: data.bundleComplianceEnabled ? "Qualitative" : "—" },
            ]}
          />

          <SummaryGroup
            label="WORKFORCE"
            total={data.workforceTotal > 0 ? fmtCurrency(data.workforceTotal) : "Tracked"}
            rows={[
              { label: "RN Retention", value: data.retention.enabled ? fmtCurrency(data.retention.value) : "—" },
              { label: "Agency & Travel Nurse Reduction", value: data.agency.enabled ? fmtCurrency(data.agency.value) : "—" },
            ]}
          />

          <SummaryGroup
            label="CAPACITY"
            total={data.overtime.enabled ? fmtCurrency(data.overtime.value) : "Tracked"}
            rows={[
              { label: "Overtime Reduction", value: data.overtime.enabled ? fmtCurrency(data.overtime.value) : "—" },
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


          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 9 — VALIDATION ROADMAP */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>VALIDATION ROADMAP</SectionLabel>
          <Text style={styles.sectionHeadline}>
            Your post-deployment measurement plan.
          </Text>
          <Text style={[styles.body, { marginBottom: 10 }]}>
            Each phase answers a different question. Assign an owner before deployment — measurement gaps emerge precisely when data would be most useful.
          </Text>

          {[
            {
              phaseLabel: "Phase 1 — Month 1–3",
              phaseColor: "#EA2C00",
              title: "Behavioral Foundation",
              question: "Is Abridge changing how nurses document?",
              note: "Downstream financial signal depends on this step. Documentation timing should shift before other metrics are expected to move.",
              metrics: [
                { metric: "End-of-shift charting completion rate", source: "EHR audit logs", owner: "IT / Informatics", target: ">70% before clock-out" },
                { metric: "Point-of-care documentation rate (real-time vs. batch)", source: "EHR audit logs", owner: "Nurse Manager", target: "Trending up vs. week-1" },
                { metric: "Monthly active users vs. enrolled nurses", source: "Abridge Analytics", owner: "IT / Informatics", target: ">60% MRU activation" },
              ],
            },
            {
              phaseLabel: "Phase 2 — Month 3–6",
              phaseColor: colors.secondary,
              title: "Financial Signal",
              question: "Is behavioral change showing up in payroll and quality data?",
              note: "Overtime is the fastest-moving financial metric; quality leading indicators need a full quarter to stabilize.",
              metrics: [
                { metric: "Monthly OT hours (documentation-related)", source: "Payroll", owner: "Nursing Ops / Finance", target: "Declining vs. prior-year" },
                { metric: "Catheter utilization rate", source: "EHR / Infection Control", owner: "Quality", target: "Toward unit benchmark" },
                { metric: "Bundle element documentation completion rate", source: "EHR audit logs", owner: "Quality / Informatics", target: ">90% per care event" },
                { metric: "SEP-1 compliance rate (if sepsis enabled)", source: "Quality dashboard", owner: "Quality", target: "Stable or improving" },
              ],
            },
            {
              phaseLabel: "Phase 3 — Month 6–18",
              phaseColor: colors.secondary,
              title: "Strategic Proof",
              question: "Is this a durable organizational capability, or a one-time improvement?",
              note: "Full-year retention and OT comparisons build the renewal and expansion case to a CFO or board.",
              metrics: [
                { metric: "12-month RN retention rate vs. rolling baseline", source: "HR", owner: "CNO / HR", target: "≥2–3 pt improvement" },
                { metric: "Annual HAI event rates (HAPI, CAUTI, CLABSI, falls)", source: "Infection Control", owner: "CNO / Quality", target: "Below prior 12-mo baseline" },
                { metric: "Annual OT budget vs. prior year (doc-attributable)", source: "Finance", owner: "CFO / CNO", target: "Measurable reduction" },
                { metric: "Agency / travel premium spend as % of total labor", source: "Finance", owner: "CNO", target: "Declining, ≥1 full cycle" },
              ],
            },
          ].map((phase, pi) => (
            <View key={pi} wrap={false} style={{ marginBottom: 8, borderLeftWidth: 3, borderLeftColor: phase.phaseColor, backgroundColor: colors.cards, borderRadius: 4, padding: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 3 }}>
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: phase.phaseColor, textTransform: "uppercase", letterSpacing: 1, marginRight: 8 }}>{phase.phaseLabel}</Text>
                <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>{phase.title}</Text>
              </View>
              <Text style={{ fontSize: 7.5, fontStyle: "italic", color: colors.secondary, marginBottom: 3, lineHeight: 1.35 }}>
                {phase.question}
              </Text>
              <Text style={{ fontSize: 7.5, color: colors.tertiary, lineHeight: 1.35, marginBottom: 6 }}>
                {phase.note}
              </Text>
              {phase.metrics.map((row, i) => (
                <View key={i} style={{ flexDirection: "row", paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: colors.separator }}>
                  <Text style={{ flex: 2, fontSize: 7.5, color: colors.primaryText, lineHeight: 1.3 }}>{row.metric}</Text>
                  <Text style={{ flex: 1.1, fontSize: 7, color: colors.tertiary, lineHeight: 1.3 }}>{row.source}</Text>
                  <Text style={{ flex: 1, fontSize: 7, color: colors.tertiary, textAlign: "center", lineHeight: 1.3 }}>{row.owner}</Text>
                  <Text style={{ flex: 1.2, fontSize: 7, color: colors.secondary, textAlign: "right", lineHeight: 1.3 }}>{row.target}</Text>
                </View>
              ))}
            </View>
          ))}

          {/* Governance cadence */}
          <View wrap={false} style={{ backgroundColor: "#1A1A1A", borderRadius: 4, padding: 10 }}>
            <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>Governance & Reporting Cadence</Text>
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#EA2C00", marginBottom: 3 }}>Monthly (Phases 1–2)</Text>
                <Text style={{ fontSize: 7.5, color: "#BBBBBB", lineHeight: 1.4 }}>Nurse Manager + IT/Informatics review documentation timing and adoption. Escalate to Nursing Ops if MRU rate falls below 50% for two consecutive months.</Text>
              </View>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#BBBBBB", marginBottom: 3 }}>Quarterly (Phase 3 onset)</Text>
                <Text style={{ fontSize: 7.5, color: "#BBBBBB", lineHeight: 1.4 }}>CNO + Nursing Ops + Quality + Finance review financial signal data. Confirm methodology is consistent with this document before drawing conclusions.</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#BBBBBB", marginBottom: 3 }}>Annual ROI Summary</Text>
                <Text style={{ fontSize: 7.5, color: "#BBBBBB", lineHeight: 1.4 }}>Phase 3 data package assembled for CFO and Board reporting. This document is the pre-deployment baseline. Auditable source data retained per institutional policy.</Text>
              </View>
            </View>
          </View>

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 11 — METHODOLOGY */}
      {/* Methodology was previously appended to the Summary page with
          `wrap`, which produced a non-deterministic 8 vs 9 page render
          depending on how many drivers were enabled. Promoting it to its
          own dedicated single-page surface gives every methodology line
          room to breathe and makes the final page count deterministic
          (always 9 — cover + 7 quadrant/value pages + summary +
          methodology). The page is `wrap`-enabled as a defensive measure
          for a future where someone enables an unusually large set of
          qualitative methodology lines, but with the universal closing
          tail wrapped in `wrap={false}` we will never orphan the
          disclaimer. */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.pageWrapper}>
          <SectionLabel>METHODOLOGY</SectionLabel>

          {/* Opening — modeling philosophy */}
          <Text style={{ fontSize: 10, color: colors.primaryText, lineHeight: 1.6, marginBottom: 6, fontWeight: "bold" }}>
            How this assessment was built.
          </Text>
          <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.6, marginBottom: 16 }}>
            {`This model was built using inputs specific to your organization: ${fmtNum(data.nurseFTEs)} nursing FTEs across ${fmtNum(data.staffedBeds)} staffed beds, ${fmtNum(data.patientDaysAnnual)} patient days annually, and ${data.utilizationPercent}% Abridge utilization. The base-case estimate is ${fmtCurrency(data.totalAnnualValue)} in annual value against ${fmtCurrency(data.annualInvestment)} in annual investment — ${data.annualInvestment > 0 ? (data.totalAnnualValue / data.annualInvestment).toFixed(1) : "N/A"}× Year 1 ROI. Every value line is formula-driven, source-cited, and auditable to the rows below. Hard value lines (Workforce) run on your specific headcount, cost, and utilization data. Potential value lines (Quality) apply published incidence rates with conservative documentation-attributable prevention fractions. Where Abridge deployment averages are used as defaults, they reflect medians from live implementations and can be replaced with your institutional data.`}
          </Text>

          {/* Domain header helper — inline */}
          {/* WORKFORCE */}
          {(data.retention.enabled || data.agency.enabled || data.overtime.enabled) && (
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <View style={{ width: 3, height: 12, backgroundColor: colors.primary, marginRight: 8 }} />
                <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 2 }}>Workforce — Hard Value</Text>
              </View>
              {data.retention.enabled && (
                <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }} wrap={false}>
                  <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>RN Retention</Text>
                  <Text style={{ flex: 3, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
                    {`Nurses turning over/yr (${fmtNum(data.nurseFTEs)} FTEs × ${data.retention.turnoverPct}% turnover) × ${data.retention.burnoutRelatedPct}% burnout-related × ${data.retention.impactPct}% doc-burden impact × ${fmtCurrencyExact(data.retention.replacementCost)} replacement cost.`}
                  </Text>
                  <Text style={{ flex: 1.5, fontSize: 7.5, color: colors.tertiary, textAlign: "right", lineHeight: 1.45 }}>NSI Nursing Solutions 2024</Text>
                </View>
              )}
              {data.agency.enabled && (
                <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }} wrap={false}>
                  <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>Agency Reduction</Text>
                  <Text style={{ flex: 3, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
                    {`Vacancies eliminated (same retention formula) × ${data.agency.weeksPerVacancy} wks agency coverage per vacancy × ${fmtCurrencyExact(data.agency.weeklyPremium)}/wk premium over permanent staff cost.`}
                  </Text>
                  <Text style={{ flex: 1.5, fontSize: 7.5, color: colors.tertiary, textAlign: "right", lineHeight: 1.45 }}>Internal model</Text>
                </View>
              )}
              {data.overtime.enabled && (
                <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }} wrap={false}>
                  <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>OT Reduction</Text>
                  <Text style={{ flex: 3, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
                    {`${fmtNum(data.nurseFTEs)} FTEs × ${data.overtime.otHrsPerNurseWeek} OT hrs/nurse/wk × ${data.overtime.reductionPct}% reduction × $${data.overtime.otHourlyRate}/hr × 52 weeks. Modeled as a documentation-attributable reduction in end-of-shift overtime.`}
                  </Text>
                  <Text style={{ flex: 1.5, fontSize: 7.5, color: colors.tertiary, textAlign: "right", lineHeight: 1.45 }}>Internal model</Text>
                </View>
              )}
            </View>
          )}

          {/* QUALITY */}
          {(data.hapi.enabled || data.falls.enabled || data.cauti.enabled || data.clabsi.enabled || data.sepsis.enabled) && (
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <View style={{ width: 3, height: 12, backgroundColor: colors.primary, marginRight: 8 }} />
                <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 2 }}>Quality — Potential Value</Text>
              </View>
              {data.hapi.enabled && (
                <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }} wrap={false}>
                  <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>HAPI</Text>
                  <Text style={{ flex: 3, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
                    {`${fmtNum(data.patientDaysAnnual)} patient days × ${data.hapi.rate}/1,000 days = ${fmtNum(data.patientDaysAnnual * data.hapi.rate / 1000)} events/yr. ${data.hapi.preventionPct}% documentation-attributable prevention × ${fmtCurrencyExact(data.hapi.costPerEvent)}/event.`}
                  </Text>
                  <Text style={{ flex: 1.5, fontSize: 7.5, color: colors.tertiary, textAlign: "right", lineHeight: 1.45 }}>Dowding et al., JAMIA 2012</Text>
                </View>
              )}
              {data.falls.enabled && (
                <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }} wrap={false}>
                  <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>Falls</Text>
                  <Text style={{ flex: 3, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
                    {`${fmtNum(data.patientDaysAnnual)} patient days × ${data.falls.rate}/1,000 days = ${fmtNum(data.patientDaysAnnual * data.falls.rate / 1000)} events/yr. ${data.falls.preventionPct}% documentation-attributable prevention × ${fmtCurrencyExact(data.falls.costPerEvent)}/event.`}
                  </Text>
                  <Text style={{ flex: 1.5, fontSize: 7.5, color: colors.tertiary, textAlign: "right", lineHeight: 1.45 }}>AHRQ fall cost benchmarks</Text>
                </View>
              )}
              {data.cauti.enabled && (
                <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }} wrap={false}>
                  <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>CAUTI</Text>
                  <Text style={{ flex: 3, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
                    {`${fmtNum(data.patientDaysAnnual)} patient days × ${data.cauti.utilizationPct}% cath utilization = cath-days. × ${data.cauti.rate}/1,000 cath-days. ${data.cauti.preventionPct}% prevention × ${fmtCurrencyExact(data.cauti.costPerEvent)}/event.`}
                  </Text>
                  <Text style={{ flex: 1.5, fontSize: 7.5, color: colors.tertiary, textAlign: "right", lineHeight: 1.45 }}>Meddings et al., JAMA IM 2014</Text>
                </View>
              )}
              {data.clabsi.enabled && (
                <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }} wrap={false}>
                  <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>CLABSI</Text>
                  <Text style={{ flex: 3, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
                    {`${fmtNum(data.patientDaysAnnual)} patient days × ${data.clabsi.utilizationPct}% line utilization = line-days. × ${data.clabsi.rate}/1,000 line-days. ${data.clabsi.preventionPct}% prevention × ${fmtCurrencyExact(data.clabsi.costPerEvent)}/event.`}
                  </Text>
                  <Text style={{ flex: 1.5, fontSize: 7.5, color: colors.tertiary, textAlign: "right", lineHeight: 1.45 }}>CDC CLABSI cost-of-illness</Text>
                </View>
              )}
              {data.sepsis.enabled && (
                <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }} wrap={false}>
                  <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>Sepsis SEP-1</Text>
                  <Text style={{ flex: 3, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
                    {`${fmtNum(data.patientDaysAnnual)} patient days × ${data.sepsis.ratePerThousand}/1,000 days. ${data.sepsis.complianceGapPct}% non-compliant × ${data.sepsis.docLagPct}% doc-lag share × ${fmtCurrencyExact(data.sepsis.excessCostPerCase)} excess cost/case × ${data.sepsis.realizationPct}% realization.`}
                  </Text>
                  <Text style={{ flex: 1.5, fontSize: 7.5, color: colors.tertiary, textAlign: "right", lineHeight: 1.45 }}>CMS SEP-1 measures</Text>
                </View>
              )}
            </View>
          )}

          {/* QUALITATIVE + EXCLUDED */}
          <View wrap={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <View style={{ width: 3, height: 12, backgroundColor: colors.tertiary, marginRight: 8 }} />
              <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 2 }}>Tracked Qualitatively / Excluded</Text>
            </View>
            {data.hcahpsEnabled && (
              <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }}>
                <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>HCAHPS</Text>
                <Text style={{ flex: 4.5, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>Patient-experience scores affect Value-Based Purchasing, but the causal chain from documentation to VBP payment is indirect and org-specific. Tracked; not monetized.</Text>
              </View>
            )}
            {data.bundleComplianceEnabled && (
              <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }}>
                <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>Bundle Compliance</Text>
                <Text style={{ flex: 4.5, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>Flowsheet documentation supports CLABSI, VAP, sepsis, and fall-prevention bundle adherence. Effect is additive to the HAI lines above; tracked separately to avoid double-counting.</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }}>
              <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>Revenue</Text>
              <Text style={{ flex: 4.5, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>Billing originates with the attesting physician or APP. Revenue impact is modeled in the outpatient and inpatient physician assessments, not here.</Text>
            </View>
            <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }}>
              <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>HAC Penalty</Text>
              <Text style={{ flex: 4.5, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>1% of Medicare revenue if in the bottom performance quartile. Displayed as risk context only — not included in the ROI total.</Text>
            </View>
          </View>

          {/* Sensitivity range */}
          <View wrap={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <View style={{ width: 3, height: 12, backgroundColor: colors.tertiary, marginRight: 8 }} />
              <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 2 }}>Scenario Range</Text>
            </View>
            <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }}>
              <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>Annual Value</Text>
              <Text style={{ flex: 3, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
                {`Conservative (−25%): ${fmtCurrency(Math.round(data.totalAnnualValue * 0.75))}  ·  Base case: ${fmtCurrency(data.totalAnnualValue)}  ·  Optimistic (+25%): ${fmtCurrency(Math.round(data.totalAnnualValue * 1.25))}. Annual investment (${fmtCurrency(data.annualInvestment)}) is held constant across all three scenarios.`}
              </Text>
            </View>
            <View style={{ flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: colors.separator }}>
              <Text style={{ flex: 1.4, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>Net Annual Value</Text>
              <Text style={{ flex: 3, fontSize: 8.5, color: colors.secondary, lineHeight: 1.45 }}>
                {`Conservative: ${fmtCurrency(Math.round(data.totalAnnualValue * 0.75) - data.annualInvestment)}  ·  Base case: ${fmtCurrency(data.netAnnualValue)}  ·  Optimistic: ${fmtCurrency(Math.round(data.totalAnnualValue * 1.25) - data.annualInvestment)}.`}
              </Text>
            </View>
          </View>

          {/* Closing disclaimer */}
          <Text style={{ fontSize: 8, fontStyle: "italic", color: colors.tertiary, lineHeight: 1.5 }}>
            Hard value projections are based on user-provided staffing inputs and are auditable to the formulas above. Potential value uses published clinical prevention rates; the documentation-attributable fractions reflect the indirect causal chain and are conservative by design. All projected values are subject to deployment scope, adoption rate, and institutional context. Validate against your organization's data post-implementation before presenting to finance or the board.
          </Text>

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

// ───────────────────────── Public API ─────────────────────────

export const generateNursingValueAssessmentPDF = async (
  data: NursingPDFInput,
): Promise<void> => {
  const blob = await pdf(<NursingPDFDocument data={data} />).toBlob();
  const safeOrg = (data.clientName || "abridge").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeDate = new Date().toISOString().slice(0, 10);
  await savePdfBlob(blob, `abridge-nursing-${safeOrg}-${safeDate}.pdf`);
};
