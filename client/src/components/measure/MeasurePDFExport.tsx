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
    display: "flex",
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
    marginBottom: 6,
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

const PageFooter = ({ pageNum, orgName }: { pageNum: number; orgName: string }) => (
  <View style={styles.footer}>
    <Text style={styles.footerLeft}>ABRIDGE</Text>
    <Text style={styles.footerCenter}>{orgName} {"\u00B7"} Value Story</Text>
    <Text style={styles.footerRight}>Page {pageNum} of 4</Text>
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
  const documentedEncounters = state.deployment.totalEncounters * (state.deployment.utilizationRate / 100);
  const totalHoursSaved = (timeSavedPerNote * documentedEncounters) / 60;

  const savingsHours = totalHoursSaved * (savingsPercent / 100);
  const savingsValue = savingsHours * state.calibration.otHourlyRate;

  const capacityHours = totalHoursSaved * (capacityPercent / 100);
  const additionalVisits = capacityHours * (60 / state.calibration.minutesPerVisit);
  const capacityValue = additionalVisits * state.calibration.revenuePerVisit;

  const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
  const hoursPerProviderPerWeek = state.deployment.providers > 0
    ? wellbeingHours / state.deployment.providers / (state.deployment.monthsOnAbridge * 4.33)
    : 0;

  const timeValueSubtotal = capacityValue + savingsValue;

  const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  const wrvuDeltaPercent = state.documentationQuality.wrvuWithout > 0
    ? (wrvuDelta / state.documentationQuality.wrvuWithout) * 100
    : 0;
  const additionalWRVUs = wrvuDelta * documentedEncounters;
  const docValueLow = additionalWRVUs * state.calibration.conversionFactor * 0.50;
  const docValueHigh = additionalWRVUs * state.calibration.conversionFactor * 0.75;

  const totalValueLow = timeValueSubtotal + docValueLow;
  const totalValueHigh = timeValueSubtotal + docValueHigh;

  const sameDayClosureDelta = state.timeEfficiency.sameDayClosureWith - state.timeEfficiency.sameDayClosureWithout;
  const timeToCloseDelta = state.timeEfficiency.timeToCloseWithout - state.timeEfficiency.timeToCloseWith;
  const workOutsideDelta = state.timeEfficiency.workOutsideWithout - state.timeEfficiency.workOutsideWith;
  const workOutsideDeltaPercent = state.timeEfficiency.workOutsideWithout > 0
    ? Math.round((workOutsideDelta / state.timeEfficiency.workOutsideWithout) * 100)
    : 0;

  const expansion = calculateExpansionResults(
    state, totalValueLow, totalValueHigh, totalHoursSaved,
    state.expansionTargets?.targetAdoption,
    state.expansionTargets?.targetProviders
  );
  const adjustedTimeValue = timeValueSubtotal - savingsValue;
  const adjustedTotalLow = totalValueLow - savingsValue;
  const adjustedTotalHigh = totalValueHigh - savingsValue;

  const hoursPerProvider = state.deployment.providers > 0 ? Math.round(totalHoursSaved / state.deployment.providers) : 0;
  const hoursPerWeekReturned = state.deployment.providers > 0
    ? (totalHoursSaved / state.deployment.providers / (state.deployment.monthsOnAbridge * 4.33))
    : 0;

  const timeDeltaPercent = state.timeEfficiency.timeInNotesWithout > 0
    ? Math.round(((state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith) / state.timeEfficiency.timeInNotesWithout) * 100)
    : 0;

  const nonAbridgeEncounters = state.deployment.totalEncounters - Math.round(documentedEncounters);

  const perProviderValuePerYear = state.deployment.providers > 0
    ? ((adjustedTotalLow + adjustedTotalHigh) / 2) / state.deployment.providers
    : 0;
  const perEncounterValue = state.deployment.totalEncounters > 0
    ? ((adjustedTotalLow + adjustedTotalHigh) / 2) / state.deployment.totalEncounters
    : 0;

  return (
    <Document>
      {/* COVER PAGE */}
      <PDFCoverPage
        reportLabel="YOUR VALUE STORY"
        title={orgName}
        subtitle={`${state.deployment.providers} providers \u00B7 ${state.deployment.monthsOnAbridge} months \u00B7 ${careSetting}`}
        preparedBy={displayPreparedBy}
      />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 1: YOUR PARTNERSHIP (Summary + Efficiency)               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR PARTNERSHIP</Text>

          {/* Hero banner */}
          <View style={[styles.cardBg, { paddingVertical: 16, paddingHorizontal: 20, marginBottom: 6 }]}>
            <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 6 }}>
              {state.deployment.providers} providers. {state.deployment.monthsOnAbridge} months.
            </Text>
            <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
              {formatNumber(Math.round(totalHoursSaved))} hours reclaimed
            </Text>
            <Text style={{ fontSize: 11, color: colors.secondary, marginBottom: 10 }}>
              {hoursPerProvider} hours per provider {"\u00B7"} {hoursPerWeekReturned.toFixed(1)} hrs/wk returned
            </Text>

            {/* 4-stat row */}
            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(state.deployment.totalEncounters)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>encounters</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(Math.round(documentedEncounters))}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>w/ Abridge</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{Math.round(state.deployment.utilizationRate)}%</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>adoption</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{formatSmartRange(adjustedTotalLow, adjustedTotalHigh)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>est. value</Text>
              </View>
            </View>

            <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 8 }}>
              {state.deployment.providers} of {state.deployment.totalProviders} total providers are on Abridge today.
            </Text>
          </View>

          <View style={styles.thickDivider} />

          {/* TIME EFFICIENCY section */}
          <Text style={styles.sectionLabel}>TIME EFFICIENCY</Text>
          <Text style={styles.sectionHeadline}>Your Providers as Their Own Control Group</Text>
          <Text style={styles.body}>
            Of {formatNumber(state.deployment.totalEncounters)} encounters, {formatNumber(Math.round(documentedEncounters))} used Abridge. The remaining {formatNumber(nonAbridgeEncounters)} did not. Same physicians, same panels{"\u2014"}different documentation experience.
          </Text>

          <View style={styles.divider} />

          {/* TIME IN NOTES */}
          <Text style={styles.sectionLabelGray}>TIME IN NOTES</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            {/* Without */}
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                WITHOUT ABRIDGE
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>
                {state.timeEfficiency.timeInNotesWithout} min
              </Text>
              <Text style={{ fontSize: 10, color: colors.secondary }}>per encounter</Text>
            </View>
            {/* With */}
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

          <View style={styles.divider} />

          {/* ADDITIONAL METRICS table */}
          <Text style={styles.sectionLabelGray}>ADDITIONAL METRICS</Text>
          <View style={{ marginBottom: 10 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ flex: 2.5, fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5 }}>Metric</Text>
              <Text style={{ flex: 1, fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Without</Text>
              <Text style={{ flex: 1, fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>With</Text>
              <Text style={{ flex: 1.2, fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Change</Text>
            </View>
            {/* Same-Day Closure */}
            <View style={{ flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ flex: 2.5, fontSize: 10, color: colors.primaryText }}>Same-Day Closure</Text>
              <Text style={{ flex: 1, fontSize: 10, color: colors.tertiary, textAlign: "right" }}>{state.timeEfficiency.sameDayClosureWithout}%</Text>
              <Text style={{ flex: 1, fontSize: 10, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{state.timeEfficiency.sameDayClosureWith}%</Text>
              <Text style={{ flex: 1.2, fontSize: 10, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>+{sameDayClosureDelta}pp</Text>
            </View>
            {/* Days to Close */}
            <View style={{ flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ flex: 2.5, fontSize: 10, color: colors.primaryText }}>Days to Close</Text>
              <Text style={{ flex: 1, fontSize: 10, color: colors.tertiary, textAlign: "right" }}>{state.timeEfficiency.timeToCloseWithout}</Text>
              <Text style={{ flex: 1, fontSize: 10, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{state.timeEfficiency.timeToCloseWith}</Text>
              <Text style={{ flex: 1.2, fontSize: 10, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>-{timeToCloseDelta.toFixed(1)} days</Text>
            </View>
            {/* After-Hours */}
            <View style={{ flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: (state.customMetrics || []).filter(cm => cm.label.trim()).length > 0 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={{ flex: 2.5, fontSize: 10, color: colors.primaryText }}>After-Hours</Text>
              <Text style={{ flex: 1, fontSize: 10, color: colors.tertiary, textAlign: "right" }}>{state.timeEfficiency.workOutsideWithout} hrs</Text>
              <Text style={{ flex: 1, fontSize: 10, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{state.timeEfficiency.workOutsideWith} hrs</Text>
              <Text style={{ flex: 1.2, fontSize: 10, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>-{workOutsideDelta.toFixed(1)}h ({workOutsideDeltaPercent}%)</Text>
            </View>
            {(state.customMetrics || []).filter(cm => cm.label.trim()).map((cm, i, arr) => {
              const delta = cm.after - cm.before;
              const pct = cm.before !== 0 ? ((delta / cm.before) * 100).toFixed(1) : "N/A";
              return (
                <View key={cm.id} style={{ flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <Text style={{ flex: 2.5, fontSize: 10, color: colors.primaryText, fontStyle: "italic" }}>{cm.label}</Text>
                  <Text style={{ flex: 1, fontSize: 10, color: colors.tertiary, textAlign: "right" }}>{cm.before}</Text>
                  <Text style={{ flex: 1, fontSize: 10, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{cm.after}</Text>
                  <Text style={{ flex: 1.2, fontSize: 10, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>{delta > 0 ? "+" : ""}{delta.toFixed(delta % 1 !== 0 ? 2 : 0)}{pct !== "N/A" ? ` (${pct}%)` : ""}</Text>
                </View>
              );
            })}
          </View>

          {/* Total Hours Reclaimed bar */}
          <View style={[styles.cardBg, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 16 }]}>
            <View>
              <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>TOTAL HOURS RECLAIMED</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary }}>{formatNumber(Math.round(totalHoursSaved))}</Text>
              <Text style={{ fontSize: 12, color: colors.secondary }}>{hoursPerProvider} hrs/provider</Text>
              <Text style={{ fontSize: 9, color: colors.tertiary }}>{timeSavedPerNote} min {"\u00D7"} {formatNumber(Math.round(documentedEncounters))} / 60</Text>
            </View>
          </View>

          <PageFooter pageNum={1} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 2: WHERE THE VALUE LIVES (Value + Quality)               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR VALUE</Text>
          <Text style={styles.sectionHeadline}>Where the Time Went</Text>
          <Text style={styles.body}>
            Time saved creates value when it goes somewhere. Here's how {formatNumber(Math.round(totalHoursSaved))} hours are allocated across your organization.
          </Text>

          <View style={styles.divider} />

          {/* TIME VALUE section */}
          <Text style={styles.sectionLabelGray}>TIME VALUE</Text>
          <View style={{ marginBottom: 10 }}>
            {/* Time Returned */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8, backgroundColor: "#FAFAF8", padding: 8, borderRadius: 4 }}>
              <View style={{ width: 3, height: 36, backgroundColor: "#999999", marginRight: 10, borderRadius: 1 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Time Returned to Providers</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(Math.round(savingsHours))} hours</Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.secondary }}>
                  [{savingsPercent}% of time saved]
                </Text>
              </View>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 }} />

            {/* Patient Capacity */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
              <View style={{ width: 3, height: 36, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Patient Capacity</Text>
                  <View style={{ flexDirection: "row", gap: 20 }}>
                    <Text style={{ fontSize: 10, color: colors.secondary }}>{capacityPercent}%</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{formatCurrency(capacityValue)}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: colors.secondary }}>
                  {formatNumber(Math.round(capacityHours))} hours {"\u2192"} {formatNumber(Math.round(additionalVisits))} visits possible{"\u00B2"}
                </Text>
              </View>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 }} />

            {/* Provider Wellbeing */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
              <View style={{ width: 3, height: 36, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Provider Wellbeing</Text>
                  <View style={{ flexDirection: "row", gap: 20 }}>
                    <Text style={{ fontSize: 10, color: colors.secondary }}>{wellbeingPercent}%</Text>
                    <Text style={{ fontSize: 10, color: colors.primaryText }}>{hoursPerProviderPerWeek.toFixed(1)} hrs/wk</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: colors.secondary }}>
                  {formatNumber(Math.round(wellbeingHours))} hours returned to providers
                </Text>
                <Text style={{ fontSize: 10, color: colors.secondary }}>
                  Retention signal: 1 provider = $300-500K
                </Text>
              </View>
            </View>

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginBottom: 8 }} />

            {/* Subtotal */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText }}>Time Value Subtotal</Text>
                <Text style={{ fontSize: 10, color: colors.secondary }}>Per provider: ~{formatCurrency(state.deployment.providers > 0 ? adjustedTimeValue / state.deployment.providers : 0)}/year</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText }}>{formatCurrency(adjustedTimeValue)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* DOCUMENTATION QUALITY section */}
          <Text style={styles.sectionLabel}>DOCUMENTATION QUALITY</Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8 }}>
            Better notes capture clinical complexity more accurately.
          </Text>

          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionLabelGray}>wRVU PER ENCOUNTER</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
              {/* Without */}
              <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 10 }]}>
                <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>WITHOUT</Text>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{state.documentationQuality.wrvuWithout.toFixed(2)}</Text>
              </View>
              {/* Arrow */}
              <View style={{ justifyContent: "center", alignItems: "center", paddingHorizontal: 2 }}>
                <Text style={{ fontSize: 14, color: colors.tertiary }}>{"\u2192"}</Text>
              </View>
              {/* With */}
              <View style={{ flex: 1, padding: 10, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary, alignItems: "center" }}>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>WITH</Text>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{state.documentationQuality.wrvuWith.toFixed(2)}</Text>
              </View>
            </View>

            <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primary, marginBottom: 8 }}>
              +{wrvuDelta.toFixed(2)} per encounter {"\u00B7"} {Math.round(wrvuDeltaPercent)}% improvement
            </Text>

            <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
              <View style={{ flex: 1, backgroundColor: colors.cards, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(Math.round(documentedEncounters))}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>encounters analyzed</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.cards, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(Math.round(additionalWRVUs))}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>addtl wRVUs</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.cards, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{formatSmartRange(docValueLow, docValueHigh)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>revenue potential{"\u00B3"}</Text>
              </View>
            </View>
          </View>

          <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />

          {/* ESTIMATED ANNUAL VALUE */}
          <View style={[styles.cardBg, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16 }]}>
            <View>
              <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>ESTIMATED ANNUAL VALUE</Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primary }}>{formatSmartRange(adjustedTotalLow, adjustedTotalHigh)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 10, color: colors.secondary }}>Per provider: ~{formatCurrency(perProviderValuePerYear)}/year</Text>
              <Text style={{ fontSize: 10, color: colors.secondary }}>Per encounter: ~${Math.round(perEncounterValue)}</Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 4 }}>Time: {formatCurrency(adjustedTimeValue)} {"\u00B7"} Documentation: {formatSmartRange(docValueLow, docValueHigh)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Footnotes */}
          <View>
            <Text style={styles.caption}>{"\u00B9"} ${state.calibration.otHourlyRate}/hr provider cost</Text>
            <Text style={styles.caption}>{"\u00B2"} {state.calibration.minutesPerVisit}-min visits at ${state.calibration.revenuePerVisit}/visit</Text>
            <Text style={styles.caption}>{"\u00B3"} 50-75% attribution range</Text>
          </View>

          <PageFooter pageNum={2} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 3: THE PATH AHEAD (Deepen + Expand)                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE PATH AHEAD</Text>
          <Text style={styles.sectionHeadline}>What's Next</Text>
          <Text style={styles.body}>
            You've proven the model with {state.deployment.providers} providers. The data suggests two layers of opportunity ahead.
          </Text>

          <View style={styles.thickDivider} />

          {/* LAYER 1: DEEPEN */}
          <Text style={styles.sectionLabel}>LAYER 1: DEEPEN</Text>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText, marginBottom: 8 }}>
            Increase adoption within your current {state.deployment.providers} providers
          </Text>

          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <View>
                <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>TODAY</Text>
                <Text style={{ fontSize: 10, color: colors.secondary }}>{Math.round(state.deployment.utilizationRate)}% adoption</Text>
                <Text style={{ fontSize: 10, color: colors.secondary }}>{formatNumber(Math.round(documentedEncounters))} encounters</Text>
                <Text style={{ fontSize: 10, color: colors.secondary }}>{formatNumber(Math.round(totalHoursSaved))} hours saved</Text>
              </View>
              <View style={{ justifyContent: "center", paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 14, color: colors.tertiary }}>{"\u2192"}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>AT {state.expansionTargets?.targetAdoption ?? 85}% ADOPTION</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{state.expansionTargets?.targetAdoption ?? 85}% adoption</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{formatNumber(expansion.deepenEncounters)} encounters</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{formatNumber(Math.round(expansion.deepenHoursSaved))} hours saved</Text>
              </View>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 }} />

            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
              Additional value: +{formatCurrency(expansion.deepenAdditionalValue)}/year
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary }}>
              No additional investment. This is value from your existing deployment.
            </Text>
          </View>

          <View style={styles.divider} />

          {/* LAYER 2: EXPAND */}
          <Text style={styles.sectionLabel}>LAYER 2: EXPAND</Text>
          <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText, marginBottom: 8 }}>
            Bring Abridge to more of your organization
          </Text>

          {/* Per-provider story cards */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 12, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>~{formatCurrency(perProviderValuePerYear)}</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>value per</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>provider/year</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 12, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{hoursPerProvider} hrs</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>saved per</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>provider/{state.deployment.monthsOnAbridge} mo</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.cards, padding: 12, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{expansion.remainingProviders}</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>providers not yet</Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>on Abridge</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary }}>(of {state.deployment.totalProviders} total)</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* COMBINED OUTLOOK */}
          <Text style={styles.sectionLabelGray}>COMBINED OUTLOOK</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            {/* Today */}
            <View style={[styles.cardBg, { flex: 1, paddingVertical: 12 }]}>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>TODAY</Text>
              <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 2 }}>{state.deployment.providers} providers</Text>
              <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 6 }}>{Math.round(state.deployment.utilizationRate)}% adoption</Text>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{formatSmartRange(adjustedTotalLow, adjustedTotalHigh)}</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 2 }}>est. annual value</Text>
            </View>
            {/* Deeper + Wider */}
            <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>DEEPER + WIDER</Text>
              <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 2 }}>{expansion.combinedProviders} providers</Text>
              <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 6 }}>{state.expansionTargets?.targetAdoption ?? 85}% adoption</Text>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary }}>{formatSmartRange(expansion.combinedValueLow, expansion.combinedValueHigh)}</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 2 }}>est. annual value</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Scaling insight callout */}
          <View style={[styles.calloutBox, { marginBottom: 6 }]}>
            <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.5 }}>
              Unlike programs that scale linearly with headcount, AI documentation cost per provider decreases as adoption grows, while value per encounter remains consistent.
            </Text>
          </View>

          <Text style={styles.caption}>
            Projections assume current time savings ({timeSavedPerNote} min/encounter), adoption patterns, and wRVU improvements continue.
          </Text>

          <PageFooter pageNum={3} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 4: YOUR STORY + METHODOLOGY                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR STORY</Text>

          {/* Hero story box */}
          <View style={[styles.cardBg, { paddingVertical: 20, paddingHorizontal: 24, marginBottom: 10 }]}>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {state.deployment.providers} providers.
            </Text>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {state.deployment.monthsOnAbridge} months.
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 8 }}>
              {formatNumber(Math.round(totalHoursSaved))} hours back.
            </Text>
            <Text style={{ fontSize: 11, color: colors.secondary }}>
              {hoursPerProvider} hours per provider{"\u2014"}time that used to disappear into documentation.
            </Text>
          </View>

          {/* Narrative callout */}
          <View style={[styles.calloutBox, { marginBottom: 10 }]}>
            <Text style={{ fontSize: 11, color: colors.primaryText, lineHeight: 1.6 }}>
              You gave {state.deployment.providers} people their evenings back{"\u2014"}and the notes got better, not worse.{"\n\n"}Better documentation comes from less time documenting. That's what happens when the technology works.
            </Text>
          </View>

          <View style={styles.divider} />

          {/* AT A GLANCE summary table */}
          <Text style={styles.sectionLabelGray}>AT A GLANCE</Text>
          <View style={{ marginBottom: 10 }}>
            {/* Row items */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Hours Reclaimed</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{formatNumber(Math.round(totalHoursSaved))} hrs   ({hoursPerProvider}/provider)</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.secondary }}>Time Returned ({savingsPercent}%)</Text>
              <Text style={{ fontSize: 10, color: colors.secondary }}>{formatNumber(Math.round(savingsHours))} hours</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Patient Capacity ({capacityPercent}%)</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{formatCurrency(capacityValue)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Provider Wellbeing ({wellbeingPercent}%)</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{hoursPerProviderPerWeek.toFixed(1)} hrs/wk back</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Documentation Quality</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{formatSmartRange(docValueLow, docValueHigh)}</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>Estimated Annual Value</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{formatSmartRange(adjustedTotalLow, adjustedTotalHigh)}   (~{formatCurrency(perProviderValuePerYear)}/provider)</Text>
            </View>
          </View>

          <View style={styles.thickDivider} />

          {/* METHODOLOGY section */}
          <Text style={styles.sectionLabel}>METHODOLOGY</Text>
          <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 8 }}>
            This analysis uses your organization's actual data.
          </Text>

          {/* Two-column data/model cards */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>YOUR DATA</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                {state.deployment.providers} providers, {state.deployment.monthsOnAbridge} mo{"\n"}
                {formatNumber(state.deployment.totalEncounters)} encounters{"\n"}
                {formatNumber(Math.round(documentedEncounters))} w/ Abridge{"\n"}
                {Math.round(state.deployment.utilizationRate)}% adoption{"\n"}
                {careSetting} setting
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>VALUE MODEL</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                Provider rate: ${state.calibration.otHourlyRate}/hr{"\n"}
                Visit duration: {state.calibration.minutesPerVisit} min{"\n"}
                Revenue/visit: ${state.calibration.revenuePerVisit}{"\n"}
                wRVU value: ${state.calibration.conversionFactor}{"\n"}
                Attribution: 50-75%{"\n"}
                Allocation: {savingsPercent}/{capacityPercent}/{wellbeingPercent}
              </Text>
            </View>
          </View>

          {/* Formulas */}
          <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>FORMULAS</Text>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 8.5, color: colors.secondary, fontFamily: "Courier", lineHeight: 1.6 }}>
              Hours = (Time Without {"\u2212"} Time With) {"\u00D7"} Encounters / 60{"\n"}
              Operational = Hours {"\u00D7"} {savingsPercent}% {"\u00D7"} ${state.calibration.otHourlyRate}/hr{"\n"}
              Capacity = (Hours {"\u00D7"} {capacityPercent}%) / {state.calibration.minutesPerVisit} min {"\u00D7"} ${state.calibration.revenuePerVisit}{"\n"}
              Doc Value = wRVU {"\u0394"} {"\u00D7"} Encounters {"\u00D7"} ${state.calibration.conversionFactor} {"\u00D7"} Attribution
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
            This analysis is for planning purposes. Documentation value uses a 50-75% attribution range. Projections assume current patterns continue. Consult your finance team before making investment decisions based on these estimates.
          </Text>

          <PageFooter pageNum={4} orgName={orgName} />
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
