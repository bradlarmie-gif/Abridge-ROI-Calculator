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

Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
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
  footer: {
    position: "absolute",
    bottom: 24,
    left: 54,
    right: 54,
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

const PageFooter = ({ orgName }: { orgName: string }) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerLeft}>abridge</Text>
    <Text style={styles.footerCenter}>
      {orgName} · Nursing Value Assessment
    </Text>
    {/* Subtract 1 to skip the unnumbered cover page (currently always page 1). */}
    <Text
      style={styles.footerRight}
      render={({ pageNumber, totalPages }) =>
        `Page ${pageNumber - 1} of ${totalPages - 1}`
      }
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
        color: bigNumberLight ? colors.tertiary : (bigNumberItalic ? colors.primary : colors.primaryText),
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

// Bloomberg-style compact key/value math grid
const MathGrid = ({ rows }: { rows: { label: string; value: string }[] }) => (
  <View
    style={{
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: colors.separatorHeavy,
      borderRadius: 3,
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

const TrackedPill = () => (
  <View
    style={{
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    }}
  >
    <Text
      style={{
        fontSize: 7.5,
        color: "#FFFFFF",
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: 1,
      }}
    >
      Tracked
    </Text>
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
          <Text style={styles.sectionLabel}>THE THESIS</Text>
          <Text style={styles.sectionHeadline}>Where Nursing Value Actually Lives</Text>
          <Text style={styles.body}>
            Ambient documentation creates value across four distinct buckets. For nursing,
            three of them carry real dollars in this model — and the fourth, revenue, is
            tracked separately in the physician and APP models where billing originates.
            We separate them because the strategic implications of each are different.
          </Text>

          <View style={[styles.cardBg, { marginBottom: 14 }]}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: colors.primaryText,
                marginBottom: 6,
              }}
            >
              Where the nursing value sits
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              Nursing documentation creates measurable value across three buckets:
              quality (preventable harm and bundle compliance), workforce (retention,
              agency, and overtime), and capacity (more time at the bedside). The
              fourth bucket — revenue — is tracked in the physician and APP models,
              where billing actually originates.
            </Text>
          </View>

          {/* 2x2 grid */}
          <View style={{ flexDirection: "row" }}>
            <QuadrantThesisCard
              label="CAPACITY"
              bigNumber="Tracked"
              bigNumberItalic
              framing="Reclaimed documentation time goes back to bedside care. We track the ratio of bedside-to-charting time post-deployment as a leading indicator that the model is working."
            />
            <QuadrantThesisCard
              label="WORKFORCE"
              bigNumber={fmtCurrency(data.workforceTotal)}
              framing="Documentation burden is among the top drivers of nurse turnover. The hypothesis we model: reducing end-of-shift charting moves retention, the agency spend that follows every vacancy, and the overtime budget — three distinct labor lines that all share one root cause."
            />
          </View>
          <View style={{ flexDirection: "row" }}>
            <QuadrantThesisCard
              label="QUALITY"
              bigNumber={`${fmtCurrency(data.qualityTotal)} (potential)`}
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

      {/* PAGE 2 — WORKFORCE */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>WORKFORCE</Text>
          <Text style={styles.sectionHeadline}>
            Documentation burden is among the top reasons nurses leave — and stay late.
          </Text>
          <Text style={styles.body}>
            Three labor lines — turnover, agency premium, and overtime — all linked
            to the same upstream factor: how long it takes to finish charting at the
            end of a shift.
          </Text>

          {data.retention.enabled ? (
            <View style={styles.driverCard}>
              <View style={styles.driverHeaderRow}>
                <Text style={styles.driverHeader}>RN Retention</Text>
                <Text style={styles.driverValue}>{fmtCurrency(data.retention.value)}</Text>
              </View>
              <Text style={styles.driverBody}>
                Documentation burden is among the factors associated with burnout and
                turnover. Reducing burden is modeled to help retain experienced nurses
                who might otherwise leave.
              </Text>
              <MathGrid
                rows={[
                  { label: "Nurse FTEs", value: fmtNum(data.nurseFTEs) },
                  { label: "Annual turnover rate", value: `${data.retention.turnoverPct}%` },
                  { label: "Burnout-related share", value: `${data.retention.burnoutRelatedPct}%` },
                  { label: "Documentation impact on burnout turnover", value: `${data.retention.impactPct}%` },
                  { label: "Replacement cost per nurse", value: fmtCurrencyExact(data.retention.replacementCost) },
                  { label: "= Retention savings", value: fmtCurrency(data.retention.value) },
                ]}
              />
              <Text style={styles.driverSource}>
                Source: NSI Nursing Solutions 2024 turnover benchmark.
              </Text>
            </View>
          ) : null}

          {data.agency.enabled ? (
            <View style={data.retention.enabled ? [styles.driverCard, { marginLeft: 18 }] : styles.driverCard}>
              <View style={styles.driverHeaderRow}>
                <Text style={styles.driverHeader}>{data.retention.enabled ? "↳ " : ""}Agency &amp; Travel Nurse Reduction</Text>
                <Text style={styles.driverValue}>{fmtCurrency(data.agency.value)}</Text>
              </View>
              <Text style={styles.driverBody}>
                When nurses leave, hospitals typically fill gaps with agency labor at
                2–3× the cost. Improved retention is modeled to reduce that
                premium-labor dependency.
              </Text>
              <MathGrid
                rows={[
                  { label: "Weeks of agency coverage avoided per vacancy", value: `${data.agency.weeksPerVacancy} wks` },
                  { label: "Weekly agency premium", value: fmtCurrencyExact(data.agency.weeklyPremium) },
                  { label: "= Agency cost avoided", value: fmtCurrency(data.agency.value) },
                ]}
              />
            </View>
          ) : null}

          {data.overtime.enabled ? (
            <View style={styles.driverCard}>
              <View style={styles.driverHeaderRow}>
                <Text style={styles.driverHeader}>Overtime Reduction</Text>
                <Text style={styles.driverValue}>{fmtCurrency(data.overtime.value)}</Text>
              </View>
              <Text style={styles.driverBody}>
                When nurses spend less time documenting at end of shift, OT hours
                decrease. The most directly measurable line in the payroll budget.
              </Text>
              <MathGrid
                rows={[
                  { label: "Nurse FTEs", value: fmtNum(data.nurseFTEs) },
                  { label: "OT hrs per nurse per week", value: `${data.overtime.otHrsPerNurseWeek} hrs` },
                  { label: "Documentation-driven OT reduction", value: `${data.overtime.reductionPct}%` },
                  { label: "OT hourly rate", value: `$${data.overtime.otHourlyRate}/hr` },
                  { label: "Weeks per year", value: "52" },
                  { label: "= OT savings", value: fmtCurrency(data.overtime.value) },
                ]}
              />
            </View>
          ) : null}

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.separatorHeavy,
              marginTop: 6,
              paddingTop: 8,
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                color: colors.secondary,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginRight: 12,
              }}
            >
              Workforce Subtotal
            </Text>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primary }}>
              {fmtCurrency(data.workforceTotal)}
            </Text>
          </View>

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 3 — CAPACITY (Leading Indicator) */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>CAPACITY</Text>
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

      {/* PAGE 4 — QUALITY */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>QUALITY</Text>
          <Text style={styles.sectionHeadline}>
            Real-time documentation is the visibility layer that makes early intervention possible.
          </Text>
          <Text style={styles.body}>
            Preventable harm events don't happen because nurses don't care — they happen
            when risk signals are missed or delayed. The hypothesis we model: real-time
            flowsheet capture surfaces those signals while there's still time to act,
            with the actual outcome determined by clinical practice on each unit.
          </Text>

          <View style={[styles.redBorderCallout, { marginBottom: 12 }]}>
            <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.5 }}>
              The values below are{" "}
              <Text style={{ fontWeight: "bold", color: colors.primaryText }}>potential</Text>
              {" "}— they require clinical practice change alongside documentation
              improvement. Documentation creates the visibility; the care team creates
              the outcome. Validate baseline rates with your infection-control and
              quality teams before presenting.
            </Text>
          </View>

          {data.hapi.enabled ? (
            <View style={styles.driverCard}>
              <View style={styles.driverHeaderRow}>
                <Text style={styles.driverHeader}>HAPI Risk Reduction</Text>
                <Text style={styles.driverValue}>{fmtCurrency(data.hapi.value)} (potential)</Text>
              </View>
              <Text style={styles.driverBody}>
                Skin assessments captured at the point of care surface risk earlier than
                charts reconstructed at shift end. The model isolates the
                documentation-attributable share of preventable HAPIs.
              </Text>
              <MathGrid
                rows={[
                  { label: "Patient days/yr", value: fmtNum(data.patientDaysAnnual) },
                  { label: "HAPI rate per 1,000 patient days", value: `${data.hapi.rate}` },
                  { label: "Estimated HAPIs/yr", value: hapiEvents.toFixed(1) },
                  { label: "Documentation-attributable prevention", value: `${data.hapi.preventionPct}%` },
                  { label: "Cost per event", value: fmtCurrencyExact(data.hapi.costPerEvent) },
                  { label: "= Potential value", value: fmtCurrency(data.hapi.value) },
                ]}
              />
              <Text style={styles.driverSource}>Source: Dowding et al., JAMIA 2012.</Text>
            </View>
          ) : null}

          {data.falls.enabled ? (
            <View style={styles.driverCard}>
              <View style={styles.driverHeaderRow}>
                <Text style={styles.driverHeader}>Fall Risk Visibility</Text>
                <Text style={styles.driverValue}>{fmtCurrency(data.falls.value)} (potential)</Text>
              </View>
              <Text style={styles.driverBody}>
                Morse Fall Scale assessments completed in real time can make risk
                escalations visible when they matter, rather than at shift end.
              </Text>
              <MathGrid
                rows={[
                  { label: "Patient days/yr", value: fmtNum(data.patientDaysAnnual) },
                  { label: "Falls rate per 1,000 patient days", value: `${data.falls.rate}` },
                  { label: "Estimated falls/yr", value: fallsEvents.toFixed(1) },
                  { label: "Documentation-attributable prevention", value: `${data.falls.preventionPct}%` },
                  { label: "Cost per event", value: fmtCurrencyExact(data.falls.costPerEvent) },
                  { label: "= Potential value", value: fmtCurrency(data.falls.value) },
                ]}
              />
              <Text style={styles.driverSource}>Source: AHRQ inpatient fall cost benchmarks.</Text>
            </View>
          ) : null}

          {data.cauti.enabled ? (
            <View style={styles.driverCard}>
              <View style={styles.driverHeaderRow}>
                <Text style={styles.driverHeader}>CAUTI Prevention</Text>
                <Text style={styles.driverValue}>{fmtCurrency(data.cauti.value)} (potential)</Text>
              </View>
              <Text style={styles.driverBody}>
                Daily catheter-necessity documentation supports earlier removal and
                bundle adherence — the timing-driven half of CAUTI prevention.
              </Text>
              <MathGrid
                rows={[
                  { label: "Catheter utilization (% of patient days)", value: `${data.cauti.utilizationPct}%` },
                  { label: "Cath-days/yr", value: fmtNum(cathDays) },
                  { label: "CAUTI rate per 1,000 cath-days", value: `${data.cauti.rate}` },
                  { label: "Estimated CAUTIs/yr", value: cautiEvents.toFixed(1) },
                  { label: "Documentation-attributable prevention", value: `${data.cauti.preventionPct}%` },
                  { label: "Cost per event", value: fmtCurrencyExact(data.cauti.costPerEvent) },
                  { label: "= Potential value", value: fmtCurrency(data.cauti.value) },
                ]}
              />
              <Text style={styles.driverSource}>Source: Meddings et al., JAMA Internal Medicine 2014.</Text>
            </View>
          ) : null}

          {data.clabsi.enabled ? (
            <View style={styles.driverCard}>
              <View style={styles.driverHeaderRow}>
                <Text style={styles.driverHeader}>CLABSI Prevention</Text>
                <Text style={styles.driverValue}>{fmtCurrency(data.clabsi.value)} (potential)</Text>
              </View>
              <Text style={styles.driverBody}>
                Timely line documentation supports bundle compliance and is associated
                with reductions in central line bloodstream infections.
              </Text>
              <MathGrid
                rows={[
                  { label: "Line utilization (% of patient days)", value: `${data.clabsi.utilizationPct}%` },
                  { label: "Line-days/yr", value: fmtNum(lineDays) },
                  { label: "CLABSI rate per 1,000 line-days", value: `${data.clabsi.rate}` },
                  { label: "Estimated CLABSIs/yr", value: clabsiEvents.toFixed(1) },
                  { label: "Documentation-attributable prevention", value: `${data.clabsi.preventionPct}%` },
                  { label: "Cost per event", value: fmtCurrencyExact(data.clabsi.costPerEvent) },
                  { label: "= Potential value", value: fmtCurrency(data.clabsi.value) },
                ]}
              />
              <Text style={styles.driverSource}>Source: CDC CLABSI cost-of-illness estimates.</Text>
            </View>
          ) : null}

          {data.sepsis.enabled ? (
            <View style={styles.driverCard}>
              <View style={styles.driverHeaderRow}>
                <Text style={styles.driverHeader}>Sepsis Bundle Compliance</Text>
                <Text style={styles.driverValue}>{fmtCurrency(data.sepsis.value)} (potential)</Text>
              </View>
              <Text style={styles.driverBody}>
                Time-stamped vitals and antibiotic documentation lift SEP-1 bundle
                compliance. The model captures only the documentation-lag share.
              </Text>
              <MathGrid
                rows={[
                  { label: "Sepsis cases per 1,000 patient days", value: `${data.sepsis.ratePerThousand}` },
                  { label: "Estimated cases/yr", value: sepsisCases.toFixed(1) },
                  { label: "Non-compliant share", value: `${data.sepsis.complianceGapPct}%` },
                  { label: "Documentation-lag share of non-compliant", value: `${data.sepsis.docLagPct}%` },
                  { label: "Excess cost per case", value: fmtCurrencyExact(data.sepsis.excessCostPerCase) },
                  { label: "Realization rate", value: `${data.sepsis.realizationPct}%` },
                  { label: "= Potential value", value: fmtCurrency(data.sepsis.value) },
                ]}
              />
            </View>
          ) : null}

          {/* TRACKED METRICS */}
          {hasTrackedMetrics ? (
            <>
              <Text style={styles.subSectionHeader}>Tracked Metrics</Text>

              {data.hcahpsEnabled ? (
                <View style={styles.driverCard}>
                  <View style={styles.driverHeaderRow}>
                    <Text style={styles.driverHeader}>HCAHPS / Patient Experience</Text>
                    <Text style={{ fontSize: 9.5, fontStyle: "italic", color: colors.tertiary }}>
                      Qualitative
                    </Text>
                  </View>
                  <Text style={styles.driverBody}>
                    Patient experience scores are sensitive to nursing presence and
                    communication — both of which can improve when nurses spend less
                    time at the workstation. HCAHPS performance affects Value-Based
                    Purchasing scores and thus Medicare reimbursement, but the causal
                    chain is indirect and organization-specific, so we surface this as
                    a tracked metric rather than a modeled dollar figure.
                  </Text>
                </View>
              ) : null}

              {data.medErrorEnabled ? (
                <View style={styles.driverCard}>
                  <View style={styles.driverHeaderRow}>
                    <Text style={styles.driverHeader}>Medication Error Reduction</Text>
                    <Text style={{ fontSize: 9.5, fontStyle: "italic", color: colors.tertiary }}>
                      Qualitative
                    </Text>
                  </View>
                  <Text style={styles.driverBody}>
                    Cleaner real-time documentation is associated with fewer
                    medication-related near misses and errors. Track post-deployment
                    via your safety-event reporting system.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 5 — REVENUE (Tracked Separately) */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>REVENUE</Text>
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
          <Text style={styles.sectionLabel}>THE INVESTMENT CASE</Text>
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
              const implPhrase = data.implementationFee > 0
                ? ` A one-time implementation fee of ${fmtCurrency(data.implementationFee)} applies separately.`
                : "";
              return `The investment is ${annual} annually — ${pricingPhrase}.${implPhrase} Years 2–3 assume ${data.year2GrowthPct}% growth as adoption matures and documentation habits stabilize across the unit.`;
            })()}
          </Text>

          {/* 3-Year Projection table */}
          <View style={{ marginBottom: 14 }}>
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
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1 }}>Period</Text>
              <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Value</Text>
              <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Investment</Text>
              <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Net Value</Text>
              <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Cumulative</Text>
            </View>

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
                <Text style={{ flex: 1, fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{row.label}</Text>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(row.value)}</Text>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(row.inv)}</Text>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.net)}</Text>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(row.cum)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.redBorderCallout, { marginBottom: 14 }]}>
            <Text style={{ fontSize: 10.5, color: colors.primaryText, lineHeight: 1.5 }}>
              {`Under the modeled assumptions, by Year 3 the program projects ${cumulativeMultiple.toFixed(1)}× cumulative net for every $1 invested — alongside more time at the bedside and less end-of-shift charting for nursing staff.`}
            </Text>
          </View>

          {/* AT SCALE */}
          <Text style={styles.subSectionHeader}>At Scale</Text>
          <View style={{ flexDirection: "row", marginBottom: 14 }}>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 12, borderRadius: 4, marginRight: 6 }}>
              <Text style={{ fontSize: 8, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                Current Model
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                {`${fmtCurrency(data.totalAnnualValue)}/yr`}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>
                {`${fmtNum(data.staffedBeds)} beds · ${data.utilizationPercent}% adoption`}
              </Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 2 }}>
                {`Per bed: $${fmtNum(data.costPerBedPerYear)}/yr`}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 12, borderRadius: 4, marginLeft: 6 }}>
              <Text style={{ fontSize: 8, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                At Full Scale
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                {`${fmtCurrency(data.totalAnnualValue * 4)}/yr`}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>
                {`${fmtNum(data.staffedBeds * 4)} beds · 80% adoption`}
              </Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 2 }}>
                {`Per bed: $${fmtNum(data.costPerBedPerYear)}/yr`}
              </Text>
              <Text style={{ fontSize: 8, fontStyle: "italic", color: colors.tertiary, marginTop: 4 }}>
                Illustrative scaling, not a hard projection.
              </Text>
            </View>
          </View>

          {/* KEY METRICS */}
          <Text style={styles.subSectionHeader}>Key Metrics To Track</Text>
          <View>
            {[
              "Documentation time per shift (illustrative target: −40%)",
              "Nurse satisfaction / burnout score (illustrative target: +15 pts)",
              "Overtime hours per FTE per week (illustrative target: −25%)",
            ].map((line, i) => (
              <Text key={i} style={{ fontSize: 10, color: colors.primaryText, marginBottom: 4 }}>
                {`${i + 1}. ${line}`}
              </Text>
            ))}
          </View>
          <Text style={{ fontSize: 8.5, fontStyle: "italic", color: colors.tertiary, marginTop: 6 }}>
            Targets are illustrative reference points — calibrate to your unit baseline
            during implementation.
          </Text>

          <PageFooter orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 8 — ASSESSMENT SUMMARY + METHODOLOGY */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR ASSESSMENT SUMMARY</Text>

          <View style={[styles.cardBg, { marginBottom: 14 }]}>
            <Text style={{ fontSize: 11, color: colors.secondary, marginBottom: 4 }}>
              {`${fmtNum(data.staffedBeds)} staffed beds · ${fmtNum(data.nurseFTEs)} nurse FTEs.`}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
              {`${fmtCurrency(data.netAnnualValue)} projected net value`}
            </Text>
            <Text style={{ fontSize: 10, color: colors.tertiary }}>
              {`$${fmtNum(data.costPerBedPerYear)}/bed per year`}
            </Text>
          </View>

          <Text style={styles.subSectionHeader}>Value Summary</Text>

          {/* QUALITY group */}
          <SummaryGroup
            label="QUALITY"
            total={`${fmtCurrency(data.qualityTotal)} (potential)`}
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
            total={fmtCurrency(data.workforceTotal)}
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

          <SummaryGroup
            label="REVENUE"
            total="Tracked Separately"
            rows={[
              { label: "Revenue impact is captured in the physician and APP models, where billing originates.", value: "" },
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
          <Text style={styles.subSectionHeader}>Methodology</Text>
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
            <MethodologyLine
              text="HAC Penalty: 1% of Medicare revenue if in bottom quartile. Risk display only — not included in ROI total."
            />
            <MethodologyLine
              text="Revenue: Tracked separately in the physician and APP models, where billing originates."
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
            This assessment is for planning purposes. Hard value projections are based on
            user-provided staffing inputs. Potential value uses published clinical rates
            with documentation-attributable prevention rates that reflect the indirect
            causal chain. Validate with your organization's data post-implementation.
          </Text>

          <PageFooter orgName={orgName} />
        </View>
      </Page>
    </Document>
  );
};

// ───────────────────────── Summary Group helper ─────────────────────────

const SummaryGroup = ({
  label,
  total,
  rows,
}: {
  label: string;
  total: string;
  rows: { label: string; value: string }[];
}) => (
  <View style={{ marginBottom: 10 }}>
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

const MethodologyLine = ({ text }: { text: string }) => (
  <Text
    style={{
      fontSize: 8.5,
      color: colors.secondary,
      lineHeight: 1.5,
      marginBottom: 4,
    }}
  >
    {`• ${text}`}
  </Text>
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
