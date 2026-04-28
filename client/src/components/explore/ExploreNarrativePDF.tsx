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
  ExplorePDFQuadrantDriver,
  ExplorePDFOtherBenefit,
} from "./ExplorePDFExport";

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

const settingFooterLabel: Record<Exclude<ExploreCareSetting, "nursing">, string> = {
  outpatient: "Outpatient Value Assessment",
  ed: "ED Value Assessment",
  inpatient: "Inpatient Value Assessment",
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

const settingMetricsToTrack: Record<Exclude<ExploreCareSetting, "nursing">, string[]> = {
  outpatient: [
    "Documentation time per encounter (target: −40%)",
    "Provider burnout / likelihood-to-stay score (target: +15 pts)",
    "After-hours EHR time per provider per week (target: −30%)",
  ],
  ed: [
    "Door-to-provider time (target: −10%)",
    "End-of-shift note completion rate (target: +20 pts)",
    "Provider burnout / likelihood-to-stay score (target: +15 pts)",
  ],
  inpatient: [
    "H&P completion within 24 hours (target: ≥ 95%)",
    "After-hours EHR time per hospitalist per week (target: −30%)",
    "Discharge summary completion time (target: −25%)",
  ],
};

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

const PageFooter = ({
  orgName,
  setting,
}: {
  orgName: string;
  setting: Exclude<ExploreCareSetting, "nursing">;
}) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerLeft}>abridge</Text>
    <Text style={styles.footerCenter}>
      {orgName} · {settingFooterLabel[setting]}
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

// Wraps a calcSummary string into label/value rows where possible.
// calcSummary often arrives like "FTEs 250 × Turnover 18% × Replacement $400K = $1.2M".
// To stay safe, we render the raw string in a single-row card if no obvious "=" split.
const CalcCallout = ({ calcSummary }: { calcSummary: string }) => (
  <View
    style={{
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: colors.separatorHeavy,
      borderRadius: 3,
      paddingHorizontal: 8,
      paddingVertical: 5,
      marginTop: 6,
      marginBottom: 4,
    }}
  >
    <Text
      style={{
        fontSize: 8,
        color: colors.secondary,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 2,
      }}
    >
      How it's calculated
    </Text>
    <Text style={{ fontSize: 9, color: colors.primaryText, lineHeight: 1.4 }}>
      {calcSummary}
    </Text>
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

const QuantifiedDriverCard = ({ driver }: { driver: ExplorePDFQuadrantDriver }) => (
  <View style={styles.driverCard} wrap={false}>
    <View style={styles.driverHeaderRow}>
      <Text style={styles.driverHeader}>
        {driver.isChild ? "↳ " : ""}
        {driver.label}
      </Text>
      <Text style={styles.driverValue}>{fmtCurrency(driver.value)}</Text>
    </View>
    <Text style={styles.driverBody}>{driver.shortDescription}</Text>
    {driver.calcSummary ? <CalcCallout calcSummary={driver.calcSummary} /> : null}
  </View>
);

const QualitativeDriverCard = ({ driver }: { driver: ExplorePDFQuadrantDriver }) => (
  <View
    style={[
      styles.driverCard,
      driver.isChild ? { marginLeft: 18 } : {},
    ]}
    wrap={false}
  >
    <View style={styles.driverHeaderRow}>
      <Text style={styles.driverHeader}>
        {driver.isChild ? "↳ " : ""}
        {driver.label}
      </Text>
      <TrackedPill />
    </View>
    <Text style={styles.driverBody}>{driver.shortDescription}</Text>
  </View>
);

const BenefitCard = ({ benefit }: { benefit: ExplorePDFOtherBenefit }) => (
  <View style={styles.driverCard} wrap={false}>
    <View style={styles.driverHeaderRow}>
      <Text style={styles.driverHeader}>{benefit.label}</Text>
      <Text style={styles.driverValue}>
        {fmtCurrency(benefit.amount)}
        <Text style={{ fontSize: 9, color: colors.tertiary, fontWeight: 400 }}>
          {" "}
          {benefit.type === "annual" ? "annual" : "one-time (Y1)"}
        </Text>
      </Text>
    </View>
    <Text style={styles.driverBody}>Other financial benefit configured for this quadrant.</Text>
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

  const totalLine = (() => {
    if (isQualityForNonNursing && q.annualTotal === 0) {
      return "Tracked post-deployment";
    }
    return `${fmtCurrency(q.annualTotal)} annual${q.oneTimeTotal > 0 ? ` · +${fmtCurrency(q.oneTimeTotal)} one-time` : ""}`;
  })();

  return (
    <Page size="LETTER" style={styles.page} wrap>
      <View style={styles.pageWrapper}>
        <Text style={styles.sectionLabel}>{q.quadrant.toUpperCase()}</Text>
        <Text style={styles.sectionHeadline}>{headlineForQuadrant[q.quadrant]}</Text>
        <Text style={styles.body}>{settingQuadrantFraming[setting][q.quadrant]}</Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottomWidth: 1,
            borderBottomColor: colors.separator,
            paddingBottom: 6,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              color: colors.secondary,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              fontWeight: "bold",
            }}
          >
            Quadrant total
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: q.annualTotal > 0 ? colors.primary : colors.primaryText,
            }}
          >
            {totalLine}
          </Text>
        </View>

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
            {quantified.length > 0 || q.otherFinancialBenefits.length > 0 ? (
              <Text style={styles.subSectionHeader}>Financial Drivers</Text>
            ) : null}
            {quantified.map((d) => (
              <QuantifiedDriverCard key={d.id} driver={d} />
            ))}
            {q.otherFinancialBenefits.map((b, i) => (
              <BenefitCard key={`b-${i}`} benefit={b} />
            ))}

            {qualitative.length > 0 ? (
              <Text style={styles.subSectionHeader}>Other Metrics To Watch</Text>
            ) : null}
            {qualitative.map((d) => (
              <QualitativeDriverCard key={d.id} driver={d} />
            ))}
          </>
        )}

        <PageFooter orgName={orgName} setting={setting} />
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
          color: colors.primary,
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

  const implPhrase =
    data.includeImplementation && data.implementationFee > 0
      ? ` A one-time implementation fee of ${fmtCurrency(
          data.implementationFee,
        )} applies separately.`
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
          <Text style={styles.sectionLabel}>THE THESIS</Text>
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

          <PageFooter orgName={orgName} setting={setting} />
        </View>
      </Page>

      {/* PAGE — PRACTICE & SETUP + TIME SAVINGS */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>PRACTICE & SETUP</Text>
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

          <Text style={styles.sectionLabel}>TIME SAVINGS</Text>
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

          <PageFooter orgName={orgName} setting={setting} />
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
          <Text style={styles.sectionLabel}>THE INVESTMENT CASE</Text>
          <Text style={styles.sectionHeadline}>Infrastructure, Not Expense.</Text>
          <Text style={styles.body}>
            {`The investment is ${pricingPhrase}.${implPhrase} Years 2–3 apply ${data.year2GrowthPercent}% and ${data.year3GrowthPercent}% growth to recurring annual value as adoption matures and documentation habits stabilize.`}
          </Text>

          {/* 3-Year Projection table */}
          <View style={{ marginBottom: 14 }}>
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

          {cumulativeMultiple > 0 ? (
            <View style={[styles.redBorderCallout, { marginBottom: 14 }]}>
              <Text
                style={{
                  fontSize: 10.5,
                  color: colors.primaryText,
                  lineHeight: 1.5,
                }}
              >
                {`By Year 3, the program is generating ${cumulativeMultiple.toFixed(
                  1,
                )}× cumulative net for every $1 invested — while ${
                  setting === "ed"
                    ? "your ED clinicians spend more time at the bedside and less time charting at end of shift."
                    : setting === "inpatient"
                      ? "your hospitalists spend less time finishing notes after hours."
                      : "your providers spend more face-time with patients and less time charting after clinic."
                }`}
              </Text>
            </View>
          ) : null}

          {/* KEY METRICS */}
          <Text style={styles.subSectionHeader}>Key Metrics To Track</Text>
          <View>
            {settingMetricsToTrack[setting].map((line, i) => (
              <Text
                key={i}
                style={{
                  fontSize: 10,
                  color: colors.primaryText,
                  marginBottom: 4,
                }}
              >
                {`${i + 1}. ${line}`}
              </Text>
            ))}
          </View>

          <PageFooter orgName={orgName} setting={setting} />
        </View>
      </Page>

      {/* PAGE — ASSESSMENT SUMMARY + METHODOLOGY */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR ASSESSMENT SUMMARY</Text>

          <View style={[styles.cardBg, { marginBottom: 14 }]}>
            <Text style={{ fontSize: 11, color: colors.secondary, marginBottom: 4 }}>
              {`${fmtNum(data.numberOfProviders)} providers · ${fmtNum(
                data.annualEncounters,
              )} encounters · ${settingLabel}.`}
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: colors.primary,
                marginBottom: 4,
              }}
            >
              {`${fmtCurrency(data.netAnnualValue)} projected net value`}
            </Text>
            <Text style={{ fontSize: 10, color: colors.tertiary }}>
              {`${fmtCurrency(data.valuePerProvider)}/provider per year · ${data.roi.toFixed(1)}× Year 1 ROI`}
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

          <PageFooter orgName={orgName} setting={setting} />
        </View>
      </Page>
    </Document>
  );
};
