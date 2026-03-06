import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import type { MeasureState } from "@/lib/measureCalculator";
import { calculateExpansionResults } from "@/lib/measureCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";

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
  assumptionBg: "#F7F7F5",
};

const TOTAL_PAGES = 7;

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
    display: "flex",
    flexDirection: "column",
  },
  confidentialHeader: {
    fontSize: 7.5,
    color: colors.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "right",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 9,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionLabelGray: {
    fontSize: 9,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionHeadline: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryText,
    marginBottom: 8,
  },
  narrative: {
    fontSize: 10.5,
    color: colors.secondary,
    lineHeight: 1.65,
    marginBottom: 14,
  },
  body: {
    fontSize: 10.5,
    color: colors.secondary,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  caption: {
    fontSize: 8.5,
    color: colors.tertiary,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 10,
  },
  thickDivider: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    marginVertical: 12,
  },
  cardBg: {
    backgroundColor: colors.cards,
    padding: 14,
    borderRadius: 4,
  },
  assumptionBox: {
    backgroundColor: colors.assumptionBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 14,
    marginBottom: 10,
  },
  calloutBox: {
    backgroundColor: colors.cards,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 12,
  },
  footer: {
    marginTop: "auto",
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
  contextCard: {
    flex: 1,
    backgroundColor: colors.cards,
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
  },
  metricCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    backgroundColor: colors.assumptionBg,
  },
});

interface MeasurePDFData {
  state: MeasureState;
  clientName?: string;
  preparedBy?: string;
}

const formatCurrency = (num: number): string => {
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${Math.round(num).toLocaleString()}`;
};

const formatNumber = (num: number): string => Math.round(num).toLocaleString();

const formatSmartRange = (low: number, high: number): string => {
  const lowFmt = formatCurrency(low);
  const highFmt = formatCurrency(high);
  if (lowFmt === highFmt) return lowFmt;
  return `${lowFmt} \u2013 ${highFmt}`;
};

const ConfidentialHeader = ({ orgName }: { orgName: string }) => (
  <Text style={styles.confidentialHeader}>Confidential {"\u2014"} Prepared for {orgName}</Text>
);

const PageFooter = ({ pageNum, orgName }: { pageNum: number; orgName: string }) => (
  <View style={styles.footer}>
    <Text style={styles.footerLeft}>ABRIDGE</Text>
    <Text style={styles.footerCenter}>{orgName} {"\u00B7"} Value Story</Text>
    <Text style={styles.footerRight}>Page {pageNum} of {TOTAL_PAGES}</Text>
  </View>
);

const MeasurePDFDocument = ({ state, clientName, preparedBy }: MeasurePDFData) => {
  const displayPreparedBy = preparedBy || "Abridge Partner Success";
  const orgName = clientName || state.deployment.organizationName || "Organization";
  const careSetting = state.careSetting
    ? state.careSetting.charAt(0).toUpperCase() + state.careSetting.slice(1)
    : "Outpatient";

  const capacityPercent = state.allocation.capacityPercent ?? 20;
  const savingsPercent = state.allocation.hardSavingsPercent ?? 50;
  const wellbeingPercent = state.allocation.qualityOfLifePercent ?? 30;

  const timeSavedPerNote = state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith;
  const adoptedEncounters = Math.round(state.deployment.totalEncounters * (state.deployment.utilizationRate / 100));
  const totalHoursSaved = (timeSavedPerNote * adoptedEncounters) / 60;

  const savingsHours = totalHoursSaved * (savingsPercent / 100);

  const capacityHours = totalHoursSaved * (capacityPercent / 100);
  const additionalVisits = capacityHours * (60 / state.calibration.minutesPerVisit);
  const capacityValue = additionalVisits * state.calibration.revenuePerVisit;

  const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
  const hoursPerProviderPerWeek = state.deployment.providers > 0
    ? wellbeingHours / state.deployment.providers / (state.deployment.monthsOnAbridge * 4.33)
    : 0;

  const adjustedTimeValue = capacityValue;

  const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  const wrvuDeltaPercent = state.documentationQuality.wrvuWithout > 0
    ? (wrvuDelta / state.documentationQuality.wrvuWithout) * 100
    : 0;
  const additionalWRVUs = wrvuDelta * adoptedEncounters;
  const docValueLow = additionalWRVUs * state.calibration.conversionFactor * 0.50;
  const docValueHigh = additionalWRVUs * state.calibration.conversionFactor * 0.75;

  const totalValueLow = adjustedTimeValue + docValueLow;
  const totalValueHigh = adjustedTimeValue + docValueHigh;

  const sameDayClosureDelta = state.timeEfficiency.sameDayClosureWith - state.timeEfficiency.sameDayClosureWithout;
  const timeToCloseDelta = state.timeEfficiency.timeToCloseWithout - state.timeEfficiency.timeToCloseWith;
  const workOutsideDelta = state.timeEfficiency.workOutsideWithout - state.timeEfficiency.workOutsideWith;

  const expansion = calculateExpansionResults(
    state, totalValueLow, totalValueHigh, totalHoursSaved,
    state.expansionTargets?.targetAdoption,
    state.expansionTargets?.targetProviders
  );

  const hoursPerProvider = state.deployment.providers > 0 ? Math.round(totalHoursSaved / state.deployment.providers) : 0;
  const hoursPerWeekReturned = state.deployment.providers > 0
    ? (totalHoursSaved / state.deployment.providers / (state.deployment.monthsOnAbridge * 4.33))
    : 0;

  const timeDeltaPercent = state.timeEfficiency.timeInNotesWithout > 0
    ? Math.round(((state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith) / state.timeEfficiency.timeInNotesWithout) * 100)
    : 0;

  const perProviderValuePerYear = state.deployment.providers > 0
    ? ((totalValueLow + totalValueHigh) / 2) / state.deployment.providers
    : 0;
  const perEncounterValue = adoptedEncounters > 0
    ? ((totalValueLow + totalValueHigh) / 2) / adoptedEncounters
    : 0;

  const targetAdoption = state.expansionTargets?.targetAdoption ?? 80;

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* COVER PAGE (kept as-is)                                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <PDFCoverPage
        reportLabel="YOUR VALUE STORY"
        title={orgName}
        subtitle={`${state.deployment.providers} providers \u00B7 ${state.deployment.monthsOnAbridge} months \u00B7 ${careSetting}`}
        preparedBy={displayPreparedBy}
      />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 1: YOUR PARTNERSHIP AT A GLANCE                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <ConfidentialHeader orgName={orgName} />
          <Text style={styles.sectionLabel}>YOUR PARTNERSHIP</Text>
          <Text style={styles.sectionHeadline}>Understanding Your Abridge Impact</Text>

          <Text style={styles.narrative}>
            Over the past {state.deployment.monthsOnAbridge} months, {orgName} has partnered with Abridge across {state.deployment.providers} providers, representing {Math.round(state.deployment.utilizationRate)}% adoption within your {state.deployment.totalProviders}-provider organization. During this period, approximately {formatNumber(adoptedEncounters)} encounters were documented with Abridge assistance. This report explores what we can observe from that experience {"\u2014"} where the data is strong, where it suggests opportunity, and where your finance and operations teams can dig deeper.
          </Text>

          <View style={styles.divider} />

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            <View style={styles.contextCard}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{state.deployment.providers}</Text>
              <Text style={{ fontSize: 8.5, color: colors.tertiary }}>Providers on Abridge</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary }}>(of {state.deployment.totalProviders} total)</Text>
            </View>
            <View style={styles.contextCard}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{state.deployment.monthsOnAbridge}</Text>
              <Text style={{ fontSize: 8.5, color: colors.tertiary }}>Months Observed</Text>
            </View>
            <View style={styles.contextCard}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{formatNumber(adoptedEncounters)}</Text>
              <Text style={{ fontSize: 8.5, color: colors.tertiary }}>Encounters w/ Abridge</Text>
            </View>
            <View style={styles.contextCard}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary, marginBottom: 2 }}>{Math.round(state.deployment.utilizationRate)}%</Text>
              <Text style={{ fontSize: 8.5, color: colors.tertiary }}>Adoption Rate</Text>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <View style={styles.assumptionBox}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>A note on this analysis</Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.65 }}>
              The estimates in this report are modeled from the data your team provided and Abridge's deployment experience across similar organizations. They are not audited financial projections. We present ranges rather than point estimates, clearly label our assumptions, and distinguish between directly measurable outcomes and modeled values. Our goal is to give your leadership a credible starting point for internal ROI conversations {"\u2014"} not to replace your finance team's analysis.
            </Text>
          </View>

          <View style={{ marginTop: "auto", marginBottom: 6 }}>
            <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.5 }}>
              All figures in this report are estimates based on user-provided inputs and Abridge deployment methodology. See the Methodology section (page {TOTAL_PAGES}) for complete assumptions and limitations.
            </Text>
          </View>

          <PageFooter pageNum={1} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 2: WHAT WE OBSERVED — TIME & EFFICIENCY                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <ConfidentialHeader orgName={orgName} />
          <Text style={styles.sectionLabel}>WHAT WE OBSERVED</Text>
          <Text style={styles.sectionHeadline}>What Changed in Documentation Time</Text>

          <Text style={styles.narrative}>
            Before Abridge, your providers spent an average of {state.timeEfficiency.timeInNotesWithout} minutes per encounter on documentation. With Abridge, that dropped to {state.timeEfficiency.timeInNotesWith} minutes {"\u2014"} a {timeSavedPerNote}-minute reduction per note. Across {formatNumber(adoptedEncounters)} Abridge-documented encounters, that translates to approximately {formatNumber(Math.round(totalHoursSaved))} hours of documentation time returned to your providers over {state.deployment.monthsOnAbridge} months.
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                WITHOUT ABRIDGE
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>
                {state.timeEfficiency.timeInNotesWithout} min
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary }}>per encounter</Text>
            </View>
            <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                WITH ABRIDGE
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>
                {state.timeEfficiency.timeInNotesWith} min
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary }}>per encounter</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary, marginTop: 2 }}>{timeDeltaPercent}% reduction</Text>
            </View>
          </View>

          <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 10 }}>
            For each of your {state.deployment.providers} providers on Abridge, that is roughly {hoursPerProvider} hours over this period {"\u2014"} time that was previously spent in notes, now available for patient care, earlier departures, or reduced weekend catch-up.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>ADDITIONAL METRICS</Text>

          <View style={styles.metricCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 10.5, fontWeight: "bold", color: colors.primaryText }}>Same-Day Closure</Text>
              <Text style={{ fontSize: 10.5, fontWeight: "bold", color: colors.primary }}>+{sameDayClosureDelta} percentage points</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 4 }}>
              {state.timeEfficiency.sameDayClosureWithout}% {"\u2192"} {state.timeEfficiency.sameDayClosureWith}%
            </Text>
            <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.4 }}>
              A higher same-day closure rate means fewer open notes carrying over, reducing compliance risk and cognitive load.
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 10.5, fontWeight: "bold", color: colors.primaryText }}>Days to Close</Text>
              <Text style={{ fontSize: 10.5, fontWeight: "bold", color: colors.primary }}>-{timeToCloseDelta.toFixed(1)} days</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 4 }}>
              {state.timeEfficiency.timeToCloseWithout} days {"\u2192"} {state.timeEfficiency.timeToCloseWith} days
            </Text>
            <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.4 }}>
              Faster note completion improves billing cycle time and reduces documentation backlog.
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 10.5, fontWeight: "bold", color: colors.primaryText }}>After-Hours Documentation</Text>
              <Text style={{ fontSize: 10.5, fontWeight: "bold", color: colors.primary }}>-{workOutsideDelta.toFixed(1)} hrs/day</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 4 }}>
              {state.timeEfficiency.workOutsideWithout} hrs/day {"\u2192"} {state.timeEfficiency.workOutsideWith} hrs/day
            </Text>
            <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.4 }}>
              This is time your providers are getting back in their personal lives {"\u2014"} evenings, weekends, time with family.
            </Text>
          </View>

          {(state.customMetrics || []).filter(cm => cm.label.trim()).map((cm) => {
            const delta = cm.after - cm.before;
            const pct = cm.before !== 0 ? ((delta / cm.before) * 100).toFixed(1) : "N/A";
            return (
              <View key={cm.id} style={styles.metricCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: "bold", color: colors.primaryText }}>{cm.label}</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: "bold", color: colors.primary }}>{delta > 0 ? "+" : ""}{delta.toFixed(delta % 1 !== 0 ? 2 : 0)}{pct !== "N/A" ? ` (${pct}%)` : ""}</Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.secondary }}>
                  {cm.before} {"\u2192"} {cm.after}
                </Text>
              </View>
            );
          })}

          <View style={[styles.cardBg, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 }]}>
            <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1 }}>TOTAL HOURS RECLAIMED</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primary }}>{formatNumber(Math.round(totalHoursSaved))}</Text>
              <Text style={{ fontSize: 10, color: colors.secondary }}>{hoursPerProvider} hrs/provider</Text>
            </View>
          </View>

          <PageFooter pageNum={2} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 3: WHAT WE OBSERVED — DOCUMENTATION QUALITY              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <ConfidentialHeader orgName={orgName} />
          <Text style={styles.sectionLabel}>DOCUMENTATION QUALITY</Text>
          <Text style={styles.sectionHeadline}>What Changed in Clinical Capture</Text>

          <Text style={styles.narrative}>
            Documentation quality is not just about speed {"\u2014"} it is about capturing the clinical complexity that actually occurred. Your providers' average wRVU per encounter moved from {state.documentationQuality.wrvuWithout.toFixed(2)} to {state.documentationQuality.wrvuWith.toFixed(2)}, a {Math.round(wrvuDeltaPercent)}% increase. While multiple factors influence coding patterns, this shift is consistent with what we observe when AI-assisted documentation captures clinical detail that might otherwise be lost in manual note-writing.
          </Text>

          <Text style={styles.sectionLabelGray}>wRVU PER ENCOUNTER</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>WITHOUT</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText }}>{state.documentationQuality.wrvuWithout.toFixed(2)}</Text>
            </View>
            <View style={{ justifyContent: "center", alignItems: "center", paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 14, color: colors.tertiary }}>{"\u2192"}</Text>
            </View>
            <View style={{ flex: 1, padding: 12, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary, alignItems: "center" }}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>WITH</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText }}>{state.documentationQuality.wrvuWith.toFixed(2)}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primary, marginBottom: 10 }}>
            +{wrvuDelta.toFixed(2)} per encounter {"\u00B7"} {Math.round(wrvuDeltaPercent)}% improvement
          </Text>

          <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 10, borderRadius: 4, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(adoptedEncounters)}</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>encounters analyzed</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 10, borderRadius: 4, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(Math.round(additionalWRVUs))}</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>additional wRVUs</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 10, borderRadius: 4, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{formatSmartRange(docValueLow, docValueHigh)}</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>estimated revenue potential</Text>
            </View>
          </View>

          <Text style={styles.narrative}>
            If we attribute 50{"\u2013"}75% of this wRVU lift to improved documentation capture (our default assumption range based on published literature and deployment data), the {formatNumber(adoptedEncounters)} Abridge-documented encounters represent an estimated {formatSmartRange(docValueLow, docValueHigh)} in additional revenue capture annually.
          </Text>

          <View style={styles.assumptionBox}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Attribution note</Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.65 }}>
              Not all coding improvement can be attributed to Abridge. Provider behavior changes, coding education, payer mix shifts, and other factors also play a role. The 50{"\u2013"}75% range reflects our conservative estimate of Abridge's contribution. Your coding and compliance teams can refine this based on internal analysis.
            </Text>
          </View>

          <PageFooter pageNum={3} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 4: ESTIMATING YOUR VALUE                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <ConfidentialHeader orgName={orgName} />
          <Text style={styles.sectionLabel}>YOUR VALUE</Text>
          <Text style={styles.sectionHeadline}>Putting the Pieces Together</Text>

          <Text style={styles.narrative}>
            Translating time savings into organizational value requires assumptions about how that time gets used. Rather than assigning a single dollar figure, we break this into what is directly measurable and what represents organizational potential.
          </Text>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>SECTION A: MEASURABLE VALUE</Text>

          <View style={styles.metricCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText }}>Patient Capacity Opportunity</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primary }}>{formatCurrency(capacityValue)}</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
              {capacityPercent}% of the {formatNumber(Math.round(totalHoursSaved))} hours saved were allocated to patient capacity. At {state.calibration.minutesPerVisit} minutes per visit, that is approximately {formatNumber(Math.round(additionalVisits))} additional patient visits. At ${state.calibration.revenuePerVisit} per visit, this represents {formatCurrency(capacityValue)} in potential additional revenue.
            </Text>
            <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.4 }}>
              Whether this capacity is realized depends on scheduling, demand, and operational decisions {"\u2014"} but the time is available.
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText }}>Documentation Quality Lift</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primary }}>{formatSmartRange(docValueLow, docValueHigh)}</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              +{wrvuDelta.toFixed(2)} wRVU per encounter across {formatNumber(adoptedEncounters)} encounters, at ${state.calibration.conversionFactor} conversion, with 50{"\u2013"}75% attribution. See page 3 for the full methodology and attribution discussion.
            </Text>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>SECTION B: NON-DOLLAR IMPACT</Text>

          <View style={styles.metricCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText }}>Time Returned to Providers</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(Math.round(savingsHours))} hours</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              {formatNumber(Math.round(savingsHours))} hours of documentation time were returned to your {state.deployment.providers} providers. This time has real organizational value {"\u2014"} but how it is deployed varies. Some organizations see it in throughput. Others see it in provider satisfaction scores, reduced turnover intent, or simply better work-life balance.
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText }}>Provider Wellbeing Signal</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText }}>{hoursPerProviderPerWeek.toFixed(1)} hrs/wk back</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
              Your providers are reclaiming approximately {hoursPerProviderPerWeek.toFixed(1)} hours per week of time previously spent on documentation. In a national environment where clinician burnout drives costly turnover, this is a meaningful retention signal.
            </Text>
            <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.4 }}>
              Industry benchmark: Replacing a single physician costs $300K{"\u2013"}$500K in recruitment, onboarding, and lost revenue. While we do not claim Abridge alone prevents turnover, reduced documentation burden is consistently cited as a top factor in provider satisfaction.
            </Text>
          </View>

          <View style={styles.thickDivider} />

          <View style={[styles.cardBg, { paddingVertical: 14, paddingHorizontal: 18 }]}>
            <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>ESTIMATED ANNUAL VALUE SUMMARY</Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Patient Capacity</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{formatCurrency(capacityValue)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Documentation Quality</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{formatSmartRange(docValueLow, docValueHigh)}</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primary }}>Total Measurable Value</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primary }}>{formatSmartRange(totalValueLow, totalValueHigh)}</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.secondary }}>Time Returned</Text>
              <Text style={{ fontSize: 10, color: colors.secondary }}>{formatNumber(Math.round(savingsHours))} hours (not dollarized)</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.secondary }}>Wellbeing</Text>
              <Text style={{ fontSize: 10, color: colors.secondary }}>{hoursPerProviderPerWeek.toFixed(1)} hrs/wk back per provider</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 9, color: colors.tertiary }}>Per provider: ~{formatCurrency(perProviderValuePerYear)}/year</Text>
              <Text style={{ fontSize: 9, color: colors.tertiary }}>Per encounter: ~${Math.round(perEncounterValue)}</Text>
            </View>
          </View>

          <PageFooter pageNum={4} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 5: THE OPPORTUNITY AHEAD                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <ConfidentialHeader orgName={orgName} />
          <Text style={styles.sectionLabel}>THE OPPORTUNITY AHEAD</Text>
          <Text style={styles.sectionHeadline}>Where This Could Go</Text>

          <Text style={styles.narrative}>
            Your current results reflect {Math.round(state.deployment.utilizationRate)}% adoption across {state.deployment.providers} of {state.deployment.totalProviders} providers. This is a snapshot of early impact {"\u2014"} not the ceiling.
          </Text>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>DEEPEN: INCREASE ADOPTION</Text>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText, marginBottom: 8 }}>
            More encounters with your current {state.deployment.providers} providers
          </Text>

          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <View>
                <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>TODAY</Text>
                <Text style={{ fontSize: 10, color: colors.secondary }}>{Math.round(state.deployment.utilizationRate)}% adoption</Text>
                <Text style={{ fontSize: 10, color: colors.secondary }}>{formatNumber(adoptedEncounters)} encounters</Text>
              </View>
              <View style={{ justifyContent: "center", paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 14, color: colors.tertiary }}>{"\u2192"}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>AT {targetAdoption}% ADOPTION</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{formatNumber(expansion.deepenEncounters)} encounters</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{formatNumber(Math.round(expansion.deepenHoursSaved))} hours saved</Text>
              </View>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
              Additional value: +{formatCurrency(expansion.deepenAdditionalValue)}/year
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary }}>
              No additional investment required. This is value from your existing deployment.
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>EXPAND: BRING ABRIDGE TO MORE PROVIDERS</Text>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText, marginBottom: 8 }}>
            Extending to your broader organization
          </Text>

          <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 12, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>~{formatCurrency(perProviderValuePerYear)}</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>value per</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>provider/year</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 12, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{hoursPerProvider} hrs</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>saved per provider</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>over {state.deployment.monthsOnAbridge} months</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 12, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{expansion.remainingProviders}</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>providers not yet</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>on Abridge</Text>
            </View>
          </View>

          <Text style={styles.narrative}>
            Extending Abridge to all {state.deployment.totalProviders} providers, at current per-provider economics, would represent an estimated {formatSmartRange(expansion.expandValueLow, expansion.expandValueHigh)} annually. Your {expansion.remainingProviders} providers not yet on Abridge represent the largest untapped opportunity.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>COMBINED OUTLOOK</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1, paddingVertical: 12 }]}>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>TODAY</Text>
              <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 2 }}>{state.deployment.providers} providers</Text>
              <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 6 }}>{Math.round(state.deployment.utilizationRate)}% adoption</Text>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{formatSmartRange(totalValueLow, totalValueHigh)}</Text>
            </View>
            <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>FULL DEPLOYMENT</Text>
              <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 2 }}>{expansion.combinedProviders} providers</Text>
              <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 6 }}>{targetAdoption}% adoption</Text>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{formatSmartRange(expansion.combinedValueLow, expansion.combinedValueHigh)}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.5 }}>
            These projections assume consistent per-provider economics as you scale. Actual results will depend on specialty mix, encounter volume, workflow integration, and organizational support for adoption. We recommend revisiting these estimates quarterly as your deployment matures.
          </Text>

          <PageFooter pageNum={5} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 6: METHODOLOGY & ASSUMPTIONS                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <ConfidentialHeader orgName={orgName} />
          <Text style={styles.sectionLabel}>METHODOLOGY</Text>
          <Text style={styles.sectionHeadline}>How We Built These Estimates</Text>

          <Text style={styles.body}>
            Provider counts, encounter volumes, and before/after metrics were provided by {orgName} for this analysis. Model defaults are informed by Abridge deployment data across health systems nationwide.
          </Text>

          <Text style={styles.sectionLabelGray}>KEY ASSUMPTIONS</Text>
          <View style={{ marginBottom: 10 }}>
            <View style={styles.tableHeader}>
              <Text style={{ flex: 2.5, fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>Assumption</Text>
              <Text style={{ flex: 1.2, fontSize: 9, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>Value Used</Text>
              <Text style={{ flex: 1.5, fontSize: 9, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>Source</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ flex: 2.5, fontSize: 9.5, color: colors.primaryText }}>Provider hourly rate</Text>
              <Text style={{ flex: 1.2, fontSize: 9.5, color: colors.secondary, textAlign: "right" }}>${state.calibration.otHourlyRate}/hr</Text>
              <Text style={{ flex: 1.5, fontSize: 9.5, color: colors.tertiary, textAlign: "right" }}>Model default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ flex: 2.5, fontSize: 9.5, color: colors.primaryText }}>Visit duration</Text>
              <Text style={{ flex: 1.2, fontSize: 9.5, color: colors.secondary, textAlign: "right" }}>{state.calibration.minutesPerVisit} min</Text>
              <Text style={{ flex: 1.5, fontSize: 9.5, color: colors.tertiary, textAlign: "right" }}>Model default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ flex: 2.5, fontSize: 9.5, color: colors.primaryText }}>Revenue per visit</Text>
              <Text style={{ flex: 1.2, fontSize: 9.5, color: colors.secondary, textAlign: "right" }}>${state.calibration.revenuePerVisit}</Text>
              <Text style={{ flex: 1.5, fontSize: 9.5, color: colors.tertiary, textAlign: "right" }}>Model default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ flex: 2.5, fontSize: 9.5, color: colors.primaryText }}>wRVU conversion factor</Text>
              <Text style={{ flex: 1.2, fontSize: 9.5, color: colors.secondary, textAlign: "right" }}>${state.calibration.conversionFactor}</Text>
              <Text style={{ flex: 1.5, fontSize: 9.5, color: colors.tertiary, textAlign: "right" }}>CMS national avg</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ flex: 2.5, fontSize: 9.5, color: colors.primaryText }}>Attribution range</Text>
              <Text style={{ flex: 1.2, fontSize: 9.5, color: colors.secondary, textAlign: "right" }}>50{"\u2013"}75%</Text>
              <Text style={{ flex: 1.5, fontSize: 9.5, color: colors.tertiary, textAlign: "right" }}>Deployment data</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ flex: 2.5, fontSize: 9.5, color: colors.primaryText }}>Adoption target (Deepen)</Text>
              <Text style={{ flex: 1.2, fontSize: 9.5, color: colors.secondary, textAlign: "right" }}>{targetAdoption}%</Text>
              <Text style={{ flex: 1.5, fontSize: 9.5, color: colors.tertiary, textAlign: "right" }}>Model default</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ flex: 2.5, fontSize: 9.5, color: colors.primaryText }}>Time allocation: Capacity</Text>
              <Text style={{ flex: 1.2, fontSize: 9.5, color: colors.secondary, textAlign: "right" }}>{capacityPercent}%</Text>
              <Text style={{ flex: 1.5, fontSize: 9.5, color: colors.tertiary, textAlign: "right" }}>Organization input</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={{ flex: 2.5, fontSize: 9.5, color: colors.primaryText }}>Time allocation: Returned</Text>
              <Text style={{ flex: 1.2, fontSize: 9.5, color: colors.secondary, textAlign: "right" }}>{savingsPercent}%</Text>
              <Text style={{ flex: 1.5, fontSize: 9.5, color: colors.tertiary, textAlign: "right" }}>Organization input</Text>
            </View>
            <View style={{ ...styles.tableRow, borderBottomWidth: 0 }}>
              <Text style={{ flex: 2.5, fontSize: 9.5, color: colors.primaryText }}>Time allocation: Wellbeing</Text>
              <Text style={{ flex: 1.2, fontSize: 9.5, color: colors.secondary, textAlign: "right" }}>{wellbeingPercent}%</Text>
              <Text style={{ flex: 1.5, fontSize: 9.5, color: colors.tertiary, textAlign: "right" }}>Organization input</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>CALCULATION METHODOLOGY</Text>
          <View style={{ backgroundColor: colors.assumptionBg, padding: 12, borderRadius: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 9, color: colors.secondary, fontFamily: "Courier", lineHeight: 1.7 }}>
              Time savings: {timeSavedPerNote} min saved {"\u00D7"} {formatNumber(adoptedEncounters)} adopted encounters = {formatNumber(Math.round(totalHoursSaved))} hours{"\n"}
              Patient capacity: {capacityPercent}% of hours {"\u00F7"} {state.calibration.minutesPerVisit} min {"\u00D7"} ${state.calibration.revenuePerVisit}/visit{"\n"}
              wRVU lift: +{wrvuDelta.toFixed(2)} {"\u00D7"} {formatNumber(adoptedEncounters)} encounters {"\u00D7"} ${state.calibration.conversionFactor} {"\u00D7"} 50-75%{"\n"}
              Expansion: Per-provider economics {"\u00D7"} provider count {"\u00D7"} adoption rate
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>LIMITATIONS</Text>
          <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.65 }}>
            This analysis is a modeled estimate, not an audited financial projection. It does not account for payer mix variation, specialty-specific differences in documentation patterns, seasonal volume fluctuations, or concurrent workflow changes. We recommend validating key metrics (particularly wRVU lift and same-day closure rates) with your revenue cycle and compliance teams. Abridge is committed to partnering with your team to refine these estimates over time.
          </Text>

          <PageFooter pageNum={6} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 7: CLOSING PAGE                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Image src={abridgeLogoPath} style={{ width: 120, marginBottom: 40 }} />

            <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 8, textAlign: "center" }}>
              Prepared for
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 24, textAlign: "center" }}>
              {orgName}
            </Text>

            <View style={{ width: 60, height: 2, backgroundColor: colors.primary, marginBottom: 24 }} />

            <Text style={{ fontSize: 12, color: colors.secondary, marginBottom: 6, textAlign: "center" }}>
              {today}
            </Text>
            <Text style={{ fontSize: 12, color: colors.secondary, marginBottom: 40, textAlign: "center" }}>
              {displayPreparedBy}
            </Text>

            <View style={{ backgroundColor: colors.cards, padding: 20, borderRadius: 6, maxWidth: 360 }}>
              <Text style={{ fontSize: 11, color: colors.primaryText, textAlign: "center", lineHeight: 1.6 }}>
                Questions about this analysis?{"\n"}Contact your Abridge partnership team.
              </Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
            <Text style={{ fontSize: 8, color: colors.tertiary, textAlign: "center", lineHeight: 1.5 }}>
              This document contains confidential information prepared exclusively for {orgName}. The estimates and projections herein are modeled from organization-provided data and Abridge deployment methodology. They are not audited financial projections and should not be used as the sole basis for investment decisions. {"\u00A9"} {new Date().getFullYear()} Abridge AI, Inc. All rights reserved.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export async function generateMeasurePDF(
  state: MeasureState,
  clientName?: string,
  preparedBy?: string
): Promise<void> {
  const blob = await pdf(
    <MeasurePDFDocument state={state} clientName={clientName} preparedBy={preparedBy} />
  ).toBlob();

  const orgName = clientName ? clientName.replace(/[^a-zA-Z0-9]/g, "_") : "Organization";
  await savePdfBlob(blob, `Abridge_Value_Story_${orgName}.pdf`);
}
