import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Svg,
  Rect,
  Font,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { SwitchInputs, SwitchCalculations } from "@/lib/switchGapCalculator";
import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
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

interface AmbientPDFData {
  inputs: SwitchInputs;
  calculations: SwitchCalculations;
  clientName: string;
  preparedBy: string;
}

const fmtCurrency = (n: number): string => {
  if (isNaN(n) || n === undefined) return "$0";
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
};

const fmtNum = (n: number): string => {
  if (isNaN(n) || n === undefined) return "0";
  return Math.round(n).toLocaleString();
};

const safe = (v: number) => (isNaN(v) ? 0 : v);

const ProgressBar = ({ percent, width = 400 }: { percent: number; width?: number }) => {
  const pct = Math.min(100, Math.max(0, safe(percent)));
  const filled = Math.max((pct / 100) * width, 3);
  return (
    <Svg width={width} height={10}>
      <Rect x={0} y={0} width={width} height={10} fill={colors.border} rx={5} />
      <Rect x={0} y={0} width={filled} height={10} fill={colors.primary} rx={5} />
    </Svg>
  );
};

const PageFooter = ({ pageNum, orgName }: { pageNum: number; orgName: string }) => (
  <View style={styles.footer}>
    <Text style={styles.footerLeft}>ABRIDGE</Text>
    <Text style={styles.footerCenter}>{orgName} {"\u00B7"} Ambient Assessment</Text>
    <Text style={styles.footerRight}>Page {pageNum} of 4</Text>
  </View>
);

const DimensionCard = ({
  name,
  benchPercent,
  youValue,
  benchValue,
  insight,
}: {
  name: string;
  benchPercent: number;
  youValue: string;
  benchValue: string;
  insight: string;
}) => (
  <View style={{ marginBottom: 8 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText }}>{name}</Text>
      <Text style={{ fontSize: 10, color: colors.primary }}>{safe(benchPercent)}% of bench.</Text>
    </View>
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
      <View style={[styles.cardBg, { flex: 1 }]}>
        <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>YOU</Text>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText }}>{youValue}</Text>
      </View>
      <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
        <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>ABRIDGE BENCHMARK</Text>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary }}>{benchValue}</Text>
      </View>
    </View>
    <Text style={{ fontSize: 9, color: colors.tertiary, lineHeight: 1.4 }}>{insight}</Text>
  </View>
);

const AmbientPDFDocument = ({ data }: { data: AmbientPDFData }) => {
  const { inputs, calculations } = data;
  const providers = inputs.providers || 75;
  const encounters = inputs.annualEncounters || 150000;
  const orgName = data.clientName || "Organization";
  const monthlyGap = Math.round(calculations.annualGap / 12);
  const perProviderGap = providers > 0 ? Math.round(calculations.annualGap / providers) : 0;
  const roomToGrow = 100 - safe(calculations.realizationScore);
  const eligibleEncounters = Math.round(encounters * (ABRIDGE_BENCHMARKS.utilization / 100));

  const utilizationGapPP = Math.max(0, ABRIDGE_BENCHMARKS.utilization - inputs.utilization);
  const encountersWithoutAI = Math.round(encounters * (utilizationGapPP / 100));
  const efficiencyGapMin = Math.max(0, ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter);
  const efficiencyGapHours = Math.round((efficiencyGapMin * eligibleEncounters) / 60);
  const wrvuGapPercent = Math.max(0, ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift);

  return (
    <Document>
      <PDFCoverPage
        reportLabel="AMBIENT ASSESSMENT"
        title={orgName}
        subtitle={`${fmtNum(providers)} providers \u00B7 ${fmtNum(encounters)} annual encounters \u00B7 Outpatient`}
        preparedBy={data.preparedBy}
      />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 1: YOUR POSITION (Profile + Benchmarks)                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR POSITION</Text>

          <View style={[styles.cardBg, { paddingVertical: 14, paddingHorizontal: 18, marginBottom: 6 }]}>
            <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 6 }}>
              {fmtNum(providers)} providers. {fmtNum(encounters)} annual encounters.
            </Text>
            <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primary, marginBottom: 6 }}>
              Value Realization: {safe(calculations.realizationScore)}%
            </Text>

            <View style={{ marginBottom: 8 }}>
              <ProgressBar percent={calculations.realizationScore} />
            </View>

            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 10, lineHeight: 1.5 }}>
              You've invested in ambient AI. This assessment measures how that investment is performing against what mature implementations typically achieve.
            </Text>

            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(calculations.annualGap)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>annual opportunity</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(monthlyGap)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>monthly opportunity</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(calculations.threeYearGap)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>3-year projection</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{roomToGrow}%</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>room to grow</Text>
              </View>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>YOUR FOUR DIMENSIONS</Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 6 }}>
            How you compare to mature Abridge implementations.
          </Text>

          <View style={styles.divider} />

          <DimensionCard
            name="Adoption"
            benchPercent={calculations.utilizationScore}
            youValue={`${inputs.utilization}%`}
            benchValue={`${ABRIDGE_BENCHMARKS.utilization}%`}
            insight="When adoption is below 60%, it typically reflects workflow friction\u2014the tool isn't fitting naturally into how providers work."
          />
          <DimensionCard
            name="Efficiency"
            benchPercent={calculations.efficiencyScore}
            youValue={`${inputs.timeSavedPerEncounter} min`}
            benchValue={`${ABRIDGE_BENCHMARKS.timeSavedAvg} min`}
            insight="Lower savings often reflect editing time, integration gaps, or notes that don't match clinical style."
          />
          <DimensionCard
            name="Documentation Quality"
            benchPercent={calculations.qualityScore}
            youValue={`+${inputs.wrvuLift}%`}
            benchValue={`+${ABRIDGE_BENCHMARKS.wrvuLift}%`}
            insight="Higher lift often indicates baseline documentation was incomplete. In-range lift with strong docs is healthy."
          />
          <DimensionCard
            name="Provider Experience"
            benchPercent={calculations.satisfactionScore}
            youValue={`${inputs.satisfaction}%`}
            benchValue={`${ABRIDGE_BENCHMARKS.satisfaction}%`}
            insight="Experience is a leading indicator. Low scores predict declining adoption months before it shows in data."
          />

          <PageFooter pageNum={1} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 2: THE GAP (Opportunity + Math)                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR VALUE GAP</Text>
          <Text style={styles.sectionHeadline}>The Opportunity in Numbers</Text>
          <Text style={styles.body}>
            The difference between your current performance and what mature implementations achieve{"\u2014"}in encounters, hours, and dollars.
          </Text>

          <View style={styles.divider} />

          <View style={[styles.cardBg, { paddingVertical: 14, paddingHorizontal: 18, marginBottom: 8 }]}>
            <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4, fontWeight: "bold" }}>
              ANNUAL VALUE OPPORTUNITY
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primary }}>
                {fmtCurrency(calculations.annualGap)}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 10, color: colors.secondary }}>Per provider: ~{fmtCurrency(perProviderGap)}/year</Text>
                <Text style={{ fontSize: 10, color: colors.secondary }}>Per month: {fmtCurrency(monthlyGap)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>THE MATH</Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8 }}>
            Every number is transparent. Every assumption is stated.
          </Text>
          <View style={styles.divider} />

          {calculations.utilizationGapValue > 0 && (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 50 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Adoption Gap</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(calculations.utilizationGapValue)}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    {inputs.utilization}% {"\u2192"} {ABRIDGE_BENCHMARKS.utilization}% = {utilizationGapPP} point gap
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    {fmtNum(encounters)} {"\u00D7"} {utilizationGapPP}% = {fmtNum(encountersWithoutAI)} encounters without AI
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    {fmtNum(encountersWithoutAI)} {"\u00D7"} {ABRIDGE_BENCHMARKS.timeSavedAvg} min {"\u00D7"} (${VALUE_ASSUMPTIONS.hourlyRate}/hr) {"\u00D7"} {VALUE_ASSUMPTIONS.timeConversionRate * 100}% conversion{"\u00B9"}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary, marginTop: 2 }}>
                    = {fmtCurrency(calculations.utilizationGapValue)}/year
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
            </View>
          )}

          {calculations.efficiencyGapValue > 0 && (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 50 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Efficiency Gap</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(calculations.efficiencyGapValue)}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    {inputs.timeSavedPerEncounter} min {"\u2192"} {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {efficiencyGapMin.toFixed(1)} min gap
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    {fmtNum(eligibleEncounters)} encounters (at {ABRIDGE_BENCHMARKS.utilization}%) {"\u00D7"} {efficiencyGapMin.toFixed(1)} min = {fmtNum(efficiencyGapHours)} hrs
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    {fmtNum(efficiencyGapHours)} {"\u00D7"} ${VALUE_ASSUMPTIONS.hourlyRate}/hr {"\u00D7"} {VALUE_ASSUMPTIONS.timeConversionRate * 100}% conversion{"\u00B9"}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary, marginTop: 2 }}>
                    = {fmtCurrency(calculations.efficiencyGapValue)}/year
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
            </View>
          )}

          {calculations.wrvuGapValue > 0 && (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 50 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Documentation Quality Gap</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(calculations.wrvuGapValue)}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    +{inputs.wrvuLift}% {"\u2192"} +{ABRIDGE_BENCHMARKS.wrvuLift}% = {wrvuGapPercent.toFixed(1)}% gap
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    {VALUE_ASSUMPTIONS.avgWRVUPerEncounter} wRVU {"\u00D7"} {fmtNum(eligibleEncounters)} encounters {"\u00D7"} {wrvuGapPercent.toFixed(1)}% lift
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                    {"\u00D7"} ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU {"\u00D7"} {Math.round(VALUE_ASSUMPTIONS.wrvuRealization * 100)}% realization{"\u00B2"}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary, marginTop: 2 }}>
                    = {fmtCurrency(calculations.wrvuGapValue)}/year
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>Total Annual Gap</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(calculations.annualGap)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>YOUR INPUTS</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                {fmtNum(providers)} providers{"\n"}
                {fmtNum(encounters)} encounters{"\n"}
                {inputs.utilization}% adoption{"\n"}
                {inputs.timeSavedPerEncounter} min saved{"\n"}
                +{inputs.wrvuLift}% wRVU lift{"\n"}
                {inputs.satisfaction}% satisfaction
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>VALUE ASSUMPTIONS</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u00B9"} Provider cost: ${VALUE_ASSUMPTIONS.hourlyRate}/hr{"\n"}
                {"\u00B9"} Time conversion: {VALUE_ASSUMPTIONS.timeConversionRate * 100}%{"\n"}
                {"\u00B2"} wRVU value: ${VALUE_ASSUMPTIONS.wrvuDollarValue}{"\n"}
                {"\u00B2"} wRVU realization: {Math.round(VALUE_ASSUMPTIONS.wrvuRealization * 100)}%{"\n\n"}
                Benchmarks from 150+{"\n"}Abridge health systems
              </Text>
            </View>
          </View>

          <PageFooter pageNum={2} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 3: WHAT DRIVES PERFORMANCE (Patterns + Switching)        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>WHAT DRIVES PERFORMANCE</Text>
          <Text style={styles.sectionHeadline}>What We've Seen Work</Text>
          <Text style={styles.body}>
            Across hundreds of implementations, these patterns consistently separate high performers from the rest.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>FOUR PATTERNS</Text>

          {[
            {
              title: "1. Adoption Is a Human Challenge",
              text: "Change management isn't a phase\u2014it's ongoing. Dedicated onboarding, feedback loops, and continuous improvement resources matter.",
            },
            {
              title: "2. Continuous Optimization",
              text: "Set-it-and-forget-it doesn't work. Mature implementations review performance regularly and adjust.",
            },
            {
              title: "3. Deep Customization",
              text: "Generic configurations miss specialty nuances. Specialty-specific workflows drive meaningfully higher adoption and satisfaction.",
            },
            {
              title: "4. Executive Visibility",
              text: "When leadership tracks ambient AI as strategic\u2014not just an IT project\u2014resources follow. Sponsorship correlates with sustained adoption.",
            },
          ].map((pattern, i) => (
            <View key={i} style={{ marginBottom: i < 3 ? 6 : 0 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 30 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{pattern.title}</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>{pattern.text}</Text>
                </View>
              </View>
              {i < 3 && <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 6 }} />}
            </View>
          ))}

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>THE SWITCHING QUESTION</Text>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText, marginBottom: 8 }}>
            What Organizations That Switched Tell Us
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>"We just implemented"</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                The ROI gap often exceeds switching costs within 6 months. Sunk cost {"\u2260"} future value.
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>"Change fatigue"</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                Providers who've used AI before adopt 40% faster. They know what "good" looks like.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>"Contract lock-in"</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                Most contracts have exit clauses. We can help navigate the transition.
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>"IT bandwidth"</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                Our team handles 80% of technical lift. Avg IT burden: 40 hours total.
              </Text>
            </View>
          </View>

          <View style={[styles.cardBg, { alignItems: "center", paddingVertical: 12 }]}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
              Average time from decision to go-live: 45 days
            </Text>
            <Text style={{ fontSize: 9, color: colors.secondary }}>
              Including data migration, EHR integration, provider training, and go-live support.
            </Text>
          </View>

          <PageFooter pageNum={3} orgName={orgName} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PAGE 4: YOUR ASSESSMENT (Summary + Methodology)               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR ASSESSMENT</Text>

          <View style={[styles.cardBg, { paddingVertical: 20, paddingHorizontal: 24, marginBottom: 10 }]}>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {fmtNum(providers)} providers.
            </Text>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {fmtNum(encounters)} encounters.
            </Text>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {safe(calculations.realizationScore)}% of potential realized.
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 8 }}>
              {fmtCurrency(calculations.annualGap)} in annual value ahead{"\u2014"}{fmtCurrency(monthlyGap)} for every month you act.
            </Text>
          </View>

          <View style={[styles.calloutBox, { marginBottom: 10 }]}>
            <Text style={{ fontSize: 11, color: colors.primaryText, lineHeight: 1.6 }}>
              {calculations.realizationScore >= 75
                ? `At ${safe(calculations.realizationScore)}%, you're outperforming most implementations. The ${fmtCurrency(calculations.annualGap)} remaining opportunity is about refinement\u2014finding edge cases and optimizing further. The foundation is strong.`
                : calculations.realizationScore >= 50
                ? `At ${safe(calculations.realizationScore)}%, you've made real progress. The ${fmtCurrency(calculations.annualGap)} opportunity ahead isn't about starting over\u2014it's about understanding which specific factors are limiting value and addressing them. The answers are usually specific and actionable.`
                : `At ${safe(calculations.realizationScore)}%, you're early in the journey. That's normal. The ${fmtCurrency(calculations.annualGap)} ahead represents what's possible with the right support. The encouraging part: you don't need to change everything. Usually it's a few specific things that explain most of the gap.`
              }
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>AT A GLANCE</Text>
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Value Realization Score</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{safe(calculations.realizationScore)}%</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Annual Value Opportunity</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(calculations.annualGap)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Monthly Opportunity</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{fmtCurrency(monthlyGap)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>3-Year Projection</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{fmtCurrency(calculations.threeYearGap)}</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Adoption</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{inputs.utilization}% (bench: {ABRIDGE_BENCHMARKS.utilization}%)</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Efficiency</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{inputs.timeSavedPerEncounter} min (bench: {ABRIDGE_BENCHMARKS.timeSavedAvg} min)</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Documentation Quality</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>+{inputs.wrvuLift}% (bench: +{ABRIDGE_BENCHMARKS.wrvuLift}%)</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>Provider Experience</Text>
              <Text style={{ fontSize: 10, color: colors.primaryText }}>{inputs.satisfaction}% (bench: {ABRIDGE_BENCHMARKS.satisfaction}%)</Text>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>METHODOLOGY</Text>
          <Text style={{ fontSize: 10, color: colors.secondary, marginBottom: 8 }}>
            This analysis compares your reported metrics against Abridge benchmark data.
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>YOUR DATA</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                {fmtNum(providers)} providers{"\n"}
                {fmtNum(encounters)} encounters/year{"\n"}
                {inputs.utilization}% adoption{"\n"}
                {inputs.timeSavedPerEncounter} min saved/encounter{"\n"}
                +{inputs.wrvuLift}% wRVU lift
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>VALUE MODEL</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                Provider rate: ${VALUE_ASSUMPTIONS.hourlyRate}/hr{"\n"}
                Time conversion: {VALUE_ASSUMPTIONS.timeConversionRate * 100}%{"\n"}
                wRVU value: ${VALUE_ASSUMPTIONS.wrvuDollarValue}{"\n"}
                wRVU realization: {Math.round(VALUE_ASSUMPTIONS.wrvuRealization * 100)}%{"\n"}
                Benchmark: 150+ systems
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>FORMULAS</Text>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 8.5, color: colors.secondary, fontFamily: "Courier", lineHeight: 1.6 }}>
              Adoption Gap = Encounters {"\u00D7"} Util Gap% {"\u00D7"} BenchTime {"\u00D7"} Rate {"\u00D7"} Conv{"\n"}
              Efficiency Gap = Encounters@Bench {"\u00D7"} TimeGap {"\u00D7"} Rate {"\u00D7"} Conv{"\n"}
              Quality Gap = AvgWRVU {"\u00D7"} Encounters {"\u00D7"} LiftGap% {"\u00D7"} $/wRVU {"\u00D7"} Real
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
            This assessment is for planning purposes. All calculations are based on inputs provided and Abridge benchmark data. Actual results depend on implementation approach, organizational readiness, and clinical workflow factors.
          </Text>

          <PageFooter pageNum={4} orgName={orgName} />
        </View>
      </Page>
    </Document>
  );
};

export async function generateAmbientPDF(data: Omit<AmbientPDFData, 'calculations'> & { calculations: SwitchCalculations }): Promise<void> {
  const blob = await pdf(<AmbientPDFDocument data={data} />).toBlob();
  const orgName = data.clientName ? data.clientName.replace(/[^a-zA-Z0-9]/g, "_") : "Organization";
  const fileName = `Abridge_Ambient_Assessment_${orgName}.pdf`;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  if (isMobile) {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: "application/pdf" });
      const shareData = { files: [file], title: "Ambient Assessment" };

      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    saveAs(blob, fileName);
  }
}
