import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { MeasureState } from "@/lib/measureCalculator";
import { calculateExpansionResults } from "@/lib/measureCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";

const colors = {
  background: "#FFFFFF",
  cards: "#F5F0EB",
  primary: "#EA2C00",
  primaryText: "#1A1A1A",
  secondary: "#666666",
  tertiary: "#999999",
  border: "#E0E0E0",
  highlight: "#FFF5F2",
  body: "#333333",
};

const styles = StyleSheet.create({
  page: {
    padding: 72,
    paddingBottom: 60,
    fontFamily: "Helvetica",
    fontSize: 12,
    color: colors.primaryText,
    backgroundColor: colors.background,
  },
  pageWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  sectionLabel: {
    fontSize: 10,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionLabelGray: {
    fontSize: 10,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  pageHeadline: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.primaryText,
    marginBottom: 10,
  },
  sectionHeadline: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primaryText,
    marginBottom: 8,
  },
  body: {
    fontSize: 12,
    color: colors.body,
    lineHeight: 1.6,
    marginBottom: 16,
  },
  caption: {
    fontSize: 10,
    color: colors.secondary,
  },
  disclaimer: {
    fontSize: 9,
    color: colors.tertiary,
    fontStyle: "italic",
    lineHeight: 1.5,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 16,
  },
  thickDivider: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    marginVertical: 16,
  },

  statCard: {
    backgroundColor: colors.cards,
    padding: 20,
    borderRadius: 8,
  },
  calloutBox: {
    backgroundColor: colors.cards,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 16,
    marginBottom: 16,
  },
  calloutText: {
    fontSize: 11,
    color: colors.body,
    lineHeight: 1.6,
  },

  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 8,
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

const PageFooter = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.footer}>
    <Image src={abridgeLogoPath} style={{ width: 60 }} />
    <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
  </View>
);

const MeasurePDFDocument = ({ state, clientName, preparedBy }: MeasurePDFData) => {
  const displayPreparedBy = preparedBy || "Abridge Partner Success";

  const capacityPercent = state.allocation.capacityPercent ?? 20;
  const savingsPercent = state.allocation.hardSavingsPercent ?? 50;
  const wellbeingPercent = state.allocation.qualityOfLifePercent ?? 30;

  const timeSavedPerNote = state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith;
  const totalHoursSaved = (timeSavedPerNote * state.deployment.totalEncounters) / 60;

  const capacityHours = totalHoursSaved * (capacityPercent / 100);
  const additionalVisits = capacityHours * (60 / state.calibration.minutesPerVisit);
  const capacityValue = additionalVisits * state.calibration.revenuePerVisit;

  const savingsHours = totalHoursSaved * (savingsPercent / 100);
  const savingsValue = savingsHours * state.calibration.otHourlyRate;

  const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
  const hoursPerProviderPerWeek = state.deployment.providers > 0
    ? wellbeingHours / state.deployment.providers / (state.deployment.monthsOnAbridge * 4.33)
    : 0;

  const timeValueSubtotal = capacityValue + savingsValue;

  const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  const wrvuDeltaPercent = state.documentationQuality.wrvuWithout > 0
    ? (wrvuDelta / state.documentationQuality.wrvuWithout) * 100
    : 0;
  const documentedEncounters = state.deployment.totalEncounters * (state.deployment.utilizationRate / 100);
  const additionalWRVUs = wrvuDelta * documentedEncounters;
  const docValueLow = additionalWRVUs * state.calibration.conversionFactor * 0.5;
  const docValueHigh = additionalWRVUs * state.calibration.conversionFactor * 0.75;

  const totalValueLow = timeValueSubtotal + docValueLow;
  const totalValueHigh = timeValueSubtotal + docValueHigh;

  const sameDayClosureDelta = state.timeEfficiency.sameDayClosureWith - state.timeEfficiency.sameDayClosureWithout;
  const timeToCloseDelta = state.timeEfficiency.timeToCloseWithout - state.timeEfficiency.timeToCloseWith;
  const workOutsideDelta = state.timeEfficiency.workOutsideWithout - state.timeEfficiency.workOutsideWith;

  const expansion = calculateExpansionResults(state, totalValueLow, totalValueHigh, totalHoursSaved);
  const hoursPerProvider = state.deployment.providers > 0 ? Math.round(totalHoursSaved / state.deployment.providers) : 0;

  const totalPages = 5;

  const timeDeltaPercent = state.timeEfficiency.timeInNotesWithout > 0
    ? Math.round(((state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith) / state.timeEfficiency.timeInNotesWithout) * 100)
    : 0;

  return (
    <Document>
      {/* PAGE 1: COVER */}
      <PDFCoverPage
        reportLabel="YOUR VALUE STORY"
        title={"Documenting\nSuccess"}
        clientName={clientName}
        preparedBy={displayPreparedBy}
      />

      {/* PAGE 2: YOUR VALUE STORY (hero page) */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR VALUE STORY</Text>
          <Text style={styles.pageHeadline}>Your Partnership at a Glance</Text>

          <View style={styles.thickDivider} />

          {/* Hero box */}
          <View style={[styles.statCard, { alignItems: "center", paddingVertical: 28, marginBottom: 20 }]}>
            <Text style={{ fontSize: 16, color: colors.secondary, marginBottom: 10 }}>
              {state.deployment.providers} providers. {state.deployment.monthsOnAbridge} months.
            </Text>
            <Text style={{ fontSize: 56, fontWeight: "bold", color: colors.primary, marginBottom: 6 }}>
              {formatNumber(Math.round(totalHoursSaved))}
            </Text>
            <Text style={{ fontSize: 16, color: colors.secondary, marginBottom: 12 }}>
              hours reclaimed from documentation
            </Text>
            <Text style={{ fontSize: 12, color: colors.tertiary, textAlign: "center", maxWidth: 400 }}>
              That's {hoursPerProvider} hours per provider over {state.deployment.monthsOnAbridge} months{"\u2014"}time returned to patients, to personal life, to the work that matters.
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Deployment stats */}
          <Text style={styles.sectionLabelGray}>YOUR DEPLOYMENT</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            <View style={[styles.statCard, { flex: 1, alignItems: "center" }]}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText }}>
                {formatNumber(state.deployment.totalEncounters)}
              </Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                total encounters
              </Text>
            </View>
            <View style={[styles.statCard, { flex: 1, alignItems: "center" }]}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText }}>
                {formatNumber(Math.round(documentedEncounters))}
              </Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                Abridge encounters
              </Text>
            </View>
            <View style={[styles.statCard, { flex: 1, alignItems: "center" }]}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText }}>
                {Math.round(state.deployment.utilizationRate)}%
              </Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                adoption rate
              </Text>
            </View>
            <View style={[styles.statCard, { flex: 1, alignItems: "center" }]}>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText }}>
                {state.deployment.monthsOnAbridge} mo
              </Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                on Abridge
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Estimated Annual Value */}
          <Text style={styles.sectionLabelGray}>ESTIMATED ANNUAL VALUE</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 0 }}>
            {/* Time Value */}
            <View style={[styles.statCard, { flex: 1, borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                {formatCurrency(timeValueSubtotal)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>Time Value</Text>
            </View>
            {/* Documentation Quality */}
            <View style={[styles.statCard, { flex: 1, borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                {formatSmartRange(docValueLow, docValueHigh)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>Documentation Quality</Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 2 }}>50-75% attribution</Text>
            </View>
            {/* Combined */}
            <View style={[styles.statCard, { flex: 1, borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                {formatSmartRange(totalValueLow, totalValueHigh)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>Combined Annual Value</Text>
            </View>
          </View>

          <PageFooter pageNum={1} totalPages={totalPages} />
        </View>
      </Page>

      {/* PAGE 3: TIME EFFICIENCY */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>TIME EFFICIENCY</Text>
          <Text style={styles.pageHeadline}>Your Providers as Their Own{"\n"}Control Group</Text>
          <Text style={styles.body}>
            Of {formatNumber(state.deployment.totalEncounters)} total encounters, {formatNumber(Math.round(documentedEncounters))} used Abridge ({Math.round(state.deployment.utilizationRate)}% adoption). The remaining {formatNumber(state.deployment.totalEncounters - Math.round(documentedEncounters))} did not. Same physicians, same patient panels{"\u2014"}different documentation experience.
          </Text>

          <View style={styles.thickDivider} />

          {/* Primary Metric: Time in Notes */}
          <Text style={styles.sectionLabelGray}>PRIMARY METRIC: TIME IN NOTES</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {/* Without Abridge */}
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={{ fontSize: 10, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                WITHOUT ABRIDGE
              </Text>
              <Text style={{ fontSize: 40, fontWeight: "bold", color: colors.secondary, marginBottom: 4 }}>
                {state.timeEfficiency.timeInNotesWithout}
              </Text>
              <Text style={{ fontSize: 12, color: colors.secondary }}>minutes per encounter</Text>
            </View>
            {/* With Abridge */}
            <View style={{
              flex: 1,
              padding: 20,
              borderRadius: 8,
              backgroundColor: colors.background,
              borderWidth: 2,
              borderColor: colors.primary,
            }}>
              <Text style={{ fontSize: 10, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                WITH ABRIDGE
              </Text>
              <Text style={{ fontSize: 40, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                {state.timeEfficiency.timeInNotesWith}
              </Text>
              <Text style={{ fontSize: 12, color: colors.secondary, marginBottom: 6 }}>minutes per encounter</Text>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primary }}>{timeDeltaPercent}% reduction</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Additional Metrics Table */}
          <Text style={styles.sectionLabelGray}>ADDITIONAL EFFICIENCY METRICS</Text>
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ flex: 2, fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5 }}>Metric</Text>
              <Text style={{ flex: 1, fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Without</Text>
              <Text style={{ flex: 1, fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>With</Text>
              <Text style={{ flex: 1, fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" }}>Change</Text>
            </View>
            {/* Same-Day Closure */}
            <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ flex: 2, fontSize: 11, color: colors.body }}>Same-Day Closure</Text>
              <Text style={{ flex: 1, fontSize: 11, color: colors.tertiary, textAlign: "right" }}>{state.timeEfficiency.sameDayClosureWithout}%</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{state.timeEfficiency.sameDayClosureWith}%</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>+{sameDayClosureDelta}pp</Text>
            </View>
            {/* Days to Close */}
            <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ flex: 2, fontSize: 11, color: colors.body }}>Days to Close</Text>
              <Text style={{ flex: 1, fontSize: 11, color: colors.tertiary, textAlign: "right" }}>{state.timeEfficiency.timeToCloseWithout}</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{state.timeEfficiency.timeToCloseWith}</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>-{timeToCloseDelta.toFixed(1)} d</Text>
            </View>
            {/* After-Hours */}
            <View style={{ flexDirection: "row", paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ flex: 2, fontSize: 11, color: colors.body }}>After-Hours Documentation</Text>
              <Text style={{ flex: 1, fontSize: 11, color: colors.tertiary, textAlign: "right" }}>{state.timeEfficiency.workOutsideWithout} hrs</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{state.timeEfficiency.workOutsideWith} hrs</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>-{workOutsideDelta.toFixed(1)}h</Text>
            </View>
          </View>

          {/* Total Hours Reclaimed */}
          <View style={[styles.statCard, { alignItems: "center", paddingVertical: 20 }]}>
            <Text style={[styles.sectionLabelGray, { marginBottom: 6 }]}>TOTAL HOURS RECLAIMED</Text>
            <Text style={{ fontSize: 40, fontWeight: "bold", color: colors.primary, marginBottom: 6 }}>
              {formatNumber(Math.round(totalHoursSaved))}
            </Text>
            <Text style={{ fontSize: 11, color: colors.tertiary, textAlign: "right" }}>
              {timeSavedPerNote} min saved x {formatNumber(Math.round(documentedEncounters))} encounters / 60
            </Text>
          </View>

          <PageFooter pageNum={2} totalPages={totalPages} />
        </View>
      </Page>

      {/* PAGE 4: VALUE ALLOCATION */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>VALUE ALLOCATION</Text>
          <Text style={styles.pageHeadline}>Where the Time Went</Text>
          <Text style={styles.body}>
            Time saved creates value when it goes somewhere. Here's how the {formatNumber(Math.round(totalHoursSaved))} hours reclaimed are being allocated across your organization.
          </Text>

          <View style={styles.thickDivider} />

          {/* Time Value section */}
          <Text style={styles.sectionLabelGray}>TIME VALUE</Text>
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            {/* Operational Savings */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 3, height: 16, backgroundColor: colors.primary, marginRight: 8, borderRadius: 2 }} />
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>Operational Savings</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{savingsPercent}%</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: colors.secondary, flex: 1 }}>
                  Hours: {formatNumber(Math.round(savingsHours))}  x  ${state.calibration.otHourlyRate}/hr
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primary }}>
                  {formatCurrency(savingsValue)}
                </Text>
              </View>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 16 }} />

            {/* Patient Capacity */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 3, height: 16, backgroundColor: colors.primary, marginRight: 8, borderRadius: 2 }} />
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>Patient Capacity</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{capacityPercent}%</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: colors.secondary, flex: 1 }}>
                  Hours: {formatNumber(Math.round(capacityHours))}  {"\u2192"}  {formatNumber(Math.round(additionalVisits))} visits
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primary }}>
                  {formatCurrency(capacityValue)}
                </Text>
              </View>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 16 }} />

            {/* Provider Wellbeing */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 3, height: 16, backgroundColor: colors.primary, marginRight: 8, borderRadius: 2 }} />
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>Provider Wellbeing</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{wellbeingPercent}%</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: colors.secondary, flex: 1 }}>
                  Hours: {formatNumber(Math.round(wellbeingHours))}  {"\u2192"}  {hoursPerProviderPerWeek.toFixed(1)} hrs/wk per provider
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.tertiary, marginTop: 4 }}>
                Note: 1 provider retained {"\u2248"} $300-500K
              </Text>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 12 }} />

            {/* Subtotal */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>Time Value Subtotal</Text>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>{formatCurrency(timeValueSubtotal)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Documentation Quality */}
          <Text style={styles.sectionLabelGray}>DOCUMENTATION QUALITY</Text>
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <Text style={{ fontSize: 12, color: colors.body, marginBottom: 12 }}>
              wRVU per encounter improved from {state.documentationQuality.wrvuWithout.toFixed(2)} to {state.documentationQuality.wrvuWith.toFixed(2)} (+{wrvuDelta.toFixed(2)} per encounter, {Math.round(wrvuDeltaPercent)}% improvement)
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <View style={[styles.statCard, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>+{wrvuDelta.toFixed(2)}</Text>
                <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 2 }}>wRVU lift</Text>
              </View>
              <View style={[styles.statCard, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(Math.round(documentedEncounters))}</Text>
                <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 2 }}>encounters analyzed</Text>
              </View>
              <View style={[styles.statCard, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(Math.round(additionalWRVUs))}</Text>
                <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 2 }}>additional wRVUs</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: colors.body }}>Revenue Potential (estimated)</Text>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary }}>
                {formatSmartRange(docValueLow, docValueHigh)}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.tertiary, textAlign: "right" }}>at 50-75% attribution</Text>
          </View>

          <View style={styles.thickDivider} />

          {/* Total */}
          <View style={[styles.statCard, { alignItems: "center", paddingVertical: 20, marginBottom: 16 }]}>
            <Text style={[styles.sectionLabelGray, { marginBottom: 6 }]}>ESTIMATED ANNUAL VALUE</Text>
            <Text style={{ fontSize: 40, fontWeight: "bold", color: colors.primary, marginBottom: 8 }}>
              {formatSmartRange(totalValueLow, totalValueHigh)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.secondary }}>
              Time value: {formatCurrency(timeValueSubtotal)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.secondary }}>
              Documentation quality: {formatSmartRange(docValueLow, docValueHigh)}
            </Text>
          </View>

          <View style={styles.calloutBox}>
            <Text style={styles.calloutText}>
              These estimates use conservative assumptions. Documentation quality value uses a 50-75% attribution range to acknowledge that wRVU improvement may be partially attributable to other factors.
            </Text>
          </View>

          <PageFooter pageNum={3} totalPages={totalPages} />
        </View>
      </Page>

      {/* PAGE 5: THE OPPORTUNITY AHEAD */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE OPPORTUNITY AHEAD</Text>
          <Text style={styles.pageHeadline}>Deepen + Expand</Text>
          <Text style={styles.body}>
            You've proven the model with {state.deployment.providers} providers. Here's what the data suggests about scaling within your organization.
          </Text>

          <View style={styles.thickDivider} />

          {/* Layer 1: Deepen */}
          <Text style={styles.sectionLabelGray}>LAYER 1: DEEPEN</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={{ fontSize: 10, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>TODAY</Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>{state.deployment.utilizationRate}% adoption</Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>{formatNumber(expansion.currentAdoptedEncounters)} encounters</Text>
            </View>
            <View style={{ flex: 1, padding: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.primary }}>
              <Text style={{ fontSize: 10, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>AT 85% ADOPTION</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText }}>{formatNumber(expansion.deepenEncounters)} encounters</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary, marginTop: 6 }}>+{formatCurrency(expansion.deepenAdditionalValue)}/year</Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, marginTop: 2 }}>No additional investment required</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Layer 2: Expand */}
          <Text style={styles.sectionLabelGray}>LAYER 2: EXPAND</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={{ fontSize: 10, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>TODAY</Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>{state.deployment.providers} providers</Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>{formatSmartRange(totalValueLow, totalValueHigh)}/yr</Text>
            </View>
            <View style={{ flex: 1, padding: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.primary }}>
              <Text style={{ fontSize: 10, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>AT {expansion.expandProviders} PROVIDERS</Text>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText }}>{expansion.expandProviders} providers</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary, marginTop: 6 }}>{formatSmartRange(expansion.expandValueLow, expansion.expandValueHigh)}/yr</Text>
            </View>
          </View>

          {/* Per-provider economics */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <View style={[styles.statCard, { flex: 1, alignItems: "center", borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{formatCurrency(expansion.perProviderValue)}</Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>per provider/year</Text>
            </View>
            <View style={[styles.statCard, { flex: 1, alignItems: "center", borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{hoursPerProvider} hrs</Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>saved per provider</Text>
            </View>
            <View style={[styles.statCard, { flex: 1, alignItems: "center", borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{expansion.remainingProviders}</Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>not yet on Abridge</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Combined Opportunity */}
          <Text style={styles.sectionLabelGray}>COMBINED OPPORTUNITY</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <View style={[styles.statCard, { flex: 1, alignItems: "center" }]}>
              <Text style={{ fontSize: 10, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>TODAY</Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>{state.deployment.providers} providers, {state.deployment.utilizationRate}%</Text>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText, marginTop: 4 }}>{formatSmartRange(totalValueLow, totalValueHigh)}</Text>
            </View>
            <View style={{ flex: 1, padding: 16, borderRadius: 8, alignItems: "center", borderWidth: 2, borderColor: colors.primary }}>
              <Text style={{ fontSize: 10, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>DEEPER + WIDER</Text>
              <Text style={{ fontSize: 11, color: colors.secondary }}>{expansion.combinedProviders} providers, 85%</Text>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary, marginTop: 4 }}>{formatSmartRange(expansion.combinedValueLow, expansion.combinedValueHigh)}</Text>
            </View>
          </View>

          <View style={styles.calloutBox}>
            <Text style={styles.calloutText}>
              Unlike programs that scale linearly with headcount, AI documentation cost per provider decreases as adoption grows, while value per encounter remains consistent.
            </Text>
          </View>

          <PageFooter pageNum={4} totalPages={totalPages} />
        </View>
      </Page>

      {/* PAGE 6: METHODOLOGY */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>METHODOLOGY</Text>
          <Text style={styles.pageHeadline}>How We Calculated This</Text>
          <Text style={styles.body}>
            This analysis uses your organization's actual data{"\u2014"}not industry benchmarks or theoretical projections.
          </Text>

          <View style={styles.thickDivider} />

          {/* 4-card grid */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={{ fontSize: 10, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                YOUR DATA
              </Text>
              <Text style={{ fontSize: 10, color: colors.body, lineHeight: 1.8 }}>
                {state.deployment.providers} providers{"\n"}
                {state.deployment.monthsOnAbridge} months{"\n"}
                {formatNumber(state.deployment.totalEncounters)} encounters{"\n"}
                {formatNumber(Math.round(documentedEncounters))} with Abridge{"\n"}
                {formatNumber(state.deployment.totalEncounters - Math.round(documentedEncounters))} without{"\n"}
                {Math.round(state.deployment.utilizationRate)}% adoption{"\n"}
                {state.careSetting ? state.careSetting.charAt(0).toUpperCase() + state.careSetting.slice(1) : "Outpatient"} setting
              </Text>
            </View>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={{ fontSize: 10, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                EFFICIENCY INPUTS
              </Text>
              <Text style={{ fontSize: 10, color: colors.body, lineHeight: 1.8 }}>
                Time in notes:{"\n"}
                {state.timeEfficiency.timeInNotesWithout} min {"\u2192"} {state.timeEfficiency.timeInNotesWith} min{"\n"}
                {"\n"}
                Same-day closure:{"\n"}
                {state.timeEfficiency.sameDayClosureWithout}% {"\u2192"} {state.timeEfficiency.sameDayClosureWith}%{"\n"}
                {"\n"}
                Days to close:{"\n"}
                {state.timeEfficiency.timeToCloseWithout} {"\u2192"} {state.timeEfficiency.timeToCloseWith}{"\n"}
                {"\n"}
                After-hours:{"\n"}
                {state.timeEfficiency.workOutsideWithout}h {"\u2192"} {state.timeEfficiency.workOutsideWith}h
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={{ fontSize: 10, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                QUALITY INPUTS
              </Text>
              <Text style={{ fontSize: 10, color: colors.body, lineHeight: 1.8 }}>
                wRVU/encounter:{"\n"}
                {state.documentationQuality.wrvuWithout.toFixed(2)} {"\u2192"} {state.documentationQuality.wrvuWith.toFixed(2)}{"\n"}
                {"\n"}
                wRVU conversion:{"\n"}
                ${state.calibration.conversionFactor}{"\n"}
                {"\n"}
                Attribution:{"\n"}
                50-75%
              </Text>
            </View>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={{ fontSize: 10, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                VALUE ASSUMPTIONS
              </Text>
              <Text style={{ fontSize: 10, color: colors.body, lineHeight: 1.8 }}>
                Provider rate: ${state.calibration.otHourlyRate}/hr{"\n"}
                Visit duration: {state.calibration.minutesPerVisit} min{"\n"}
                Revenue/visit: ${state.calibration.revenuePerVisit}{"\n"}
                {"\n"}
                Allocation:{"\n"}
                {savingsPercent}% operational{"\n"}
                {capacityPercent}% capacity{"\n"}
                {wellbeingPercent}% wellbeing
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Key Formulas */}
          <Text style={styles.sectionLabelGray}>KEY FORMULAS</Text>
          <View style={[styles.statCard, { marginBottom: 16 }]}>
            <Text style={{ fontSize: 10, color: colors.body, lineHeight: 2.0, fontFamily: "Courier" }}>
              Hours Saved ={"\n"}
              (Time Without {"\u2212"} Time With) x Encounters / 60{"\n"}
              {"\n"}
              Operational Value ={"\n"}
              Hours Saved x {savingsPercent}% x ${state.calibration.otHourlyRate}/hr{"\n"}
              {"\n"}
              Capacity Value ={"\n"}
              (Hours Saved x {capacityPercent}%) / {state.calibration.minutesPerVisit} min x ${state.calibration.revenuePerVisit}/visit{"\n"}
              {"\n"}
              Documentation Value ={"\n"}
              wRVU Delta x Encounters x ${state.calibration.conversionFactor} x Attribution
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.disclaimer}>
            This analysis is for planning purposes. Documentation value uses a 50-75% attribution range to acknowledge that wRVU improvement may be partially attributable to other factors. Projections assume current patterns continue at scale. Consult with your finance team before making investment decisions based on these estimates.
          </Text>

          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 12, color: colors.secondary }}>
              Questions? Reach out to your Abridge Partner Success team.
            </Text>
          </View>

          <PageFooter pageNum={5} totalPages={totalPages} />
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
  saveAs(blob, `Abridge_Value_Story_${orgName}.pdf`);
}
