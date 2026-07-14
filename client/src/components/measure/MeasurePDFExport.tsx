import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Polyline,
  Line,
  Circle,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import type { MeasureState, MeasureCareSetting, EntryDataSource } from "@/lib/measureCalculator";
import { computeRealizedDriverValue } from "@/lib/measureCalculator";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import {
  getActiveDrivers,
  type ExploreSetting,
  type ExploreQuadrant,
} from "@/lib/exploreDrivers";
import { computeAddedSettingValue, SETTING_LABELS } from "@/lib/forecastDefaults";
import {
  computeScenarioInvestment,
  PRICING_MODEL_LABELS,
  PRICING_MODEL_RATE_SUFFIX,
  PRICING_MODEL_SCALE_LABEL,
} from "@/lib/forecastPricing";
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

const C = {
  bg: "#FFFFFF",
  card: "#F5F0EB",
  orange: "#EA2C00",
  dark: "#1A1A1A",
  mid: "#666666",
  muted: "#999999",
  border: "#E5E5E5",
  altRow: "#FAFAF8",
};

const s = StyleSheet.create({
  page: {
    padding: 54,
    paddingBottom: 50,
    fontFamily: "Manrope",
    fontSize: 10,
    color: C.dark,
    backgroundColor: C.bg,
  },
  wrap: { flex: 1, flexDirection: "column" },
  eyebrow: { fontSize: 8, color: C.orange, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 },
  headline: { fontSize: 20, fontWeight: "bold", color: C.dark, lineHeight: 1.2, marginBottom: 4 },
  subline: { fontSize: 9, color: C.muted, marginBottom: 14 },
  narrative: { fontSize: 10, color: C.mid, lineHeight: 1.65, marginBottom: 10 },
  sectionHeading: { fontSize: 13, fontWeight: "bold", color: C.dark, marginBottom: 8, marginTop: 4 },
  rule: { borderBottomWidth: 1, borderBottomColor: C.border, marginVertical: 10 },
  card: { backgroundColor: C.card, borderRadius: 4, padding: 12, marginBottom: 8 },
  cardOutline: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 10, marginBottom: 6 },
  callout: { backgroundColor: C.card, borderLeftWidth: 3, borderLeftColor: C.orange, padding: 12, marginBottom: 8, borderRadius: 4 },
  footer: { marginTop: "auto", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  footerLeft: { fontSize: 9, color: C.orange, fontWeight: "bold" },
  footerCenter: { fontSize: 8, color: C.mid },
  footerRight: { fontSize: 8, color: C.muted },
  confHeader: { fontSize: 7.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "right", marginBottom: 14 },
  statRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: C.card, padding: 12, borderRadius: 4, alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "bold", color: C.dark, marginBottom: 2 },
  statLabel: { fontSize: 8, color: C.muted, textAlign: "center", textTransform: "uppercase", letterSpacing: 1 },
  quadHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, marginTop: 6 },
  quadName: { fontSize: 11, fontWeight: "bold", color: C.orange, textTransform: "uppercase", letterSpacing: 1.2 },
  quadTotal: { fontSize: 10, fontWeight: "bold", color: C.dark },
  driverHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  driverLabel: { fontSize: 10, fontWeight: "bold", color: C.dark, flex: 1 },
  badgeQuant: { fontSize: 8, fontWeight: "bold", color: C.bg, backgroundColor: C.orange, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginLeft: 6 },
  badgeQual: { fontSize: 8, fontWeight: "bold", color: C.muted, backgroundColor: C.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginLeft: 6 },
  driverDescription: { fontSize: 8.5, color: C.mid, marginBottom: 4 },
  calcLine: { fontSize: 9, color: C.mid, lineHeight: 1.45 },
  calcDelta: { fontSize: 9, fontWeight: "bold", color: C.dark, marginBottom: 2 },
  calcResult: { fontSize: 11, fontWeight: "bold", color: C.orange, marginTop: 4 },
  notesText: { fontSize: 9, color: C.mid, fontStyle: "italic", marginTop: 4 },
  qualNote: { fontSize: 8, color: C.muted, marginTop: 3 },
  emptyQuad: { fontSize: 9, color: C.muted, fontStyle: "italic" },
  axisRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.border },
  axisLabel: { fontSize: 9, color: C.mid, flex: 1 },
  axisValue: { fontSize: 10, fontWeight: "bold", color: C.dark },
  pricingTierRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  pricingTierRowApplied: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card },
  tierCell: { fontSize: 9, color: C.mid, flex: 1 },
  tierCellRate: { fontSize: 9, fontWeight: "bold", color: C.dark, flex: 1, textAlign: "right" },
  bestBadge: { fontSize: 8, fontWeight: "bold", color: C.bg, backgroundColor: C.orange, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginLeft: 6 },
  warning: { fontSize: 9, color: C.orange, marginTop: 4 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 5, alignItems: "flex-start" },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.orange, marginTop: 5 },
  bulletText: { fontSize: 9.5, color: C.mid, flex: 1, lineHeight: 1.5 },
});

export interface MeasurePDFDriver {
  id: string;
  label: string;
  shortDescription: string;
  visibility: "quantified" | "qualitative";
  isMonthlyMode: boolean;
  withoutAbridge: number;
  withAbridge: number;
  delta: number;
  valuePerUnit: number;
  attributionPercent: number;
  realizedValue: number;
  // The volume multiplier applied (encounters for per-encounter drivers, or the
  // scaleValue/scaleDivisor factor) so the printed equation equals the result.
  scaleUnits: number;
  isPerEncounter: boolean;
  scaleUnitLabel: string;
  notes?: string;
  monthlyData?: Array<{ month: string; withAbridge: number; withoutAbridge: number }>;
  deltaUnit?: string;
  deltaLabel?: string;
  valuePerUnitLabel?: string;
  valuePerUnitPrefix?: string;
  setting?: string;
  measuredAt?: string;
  entryDataSource?: EntryDataSource;
  serviceLineRows?: Array<{ serviceLine: string; withoutAbridge: number; withAbridge: number }>;
  lowerIsBetter?: boolean;
}

export interface MeasurePDFQuadrantSection {
  quadrant: ExploreQuadrant;
  realizedTotal: number;
  drivers: MeasurePDFDriver[];
}

export interface MeasurePDFAddedSetting {
  settingLabel: string;
  providers: number;
  utilizationPercent: number;
  encounters: number;
  staffedBeds: number;
  occupancyPercent: number;
  scenarioLabel: string;
  estimatedValue: number;
  isOverridden: boolean;
  isNursing: boolean;
}

export interface MeasurePDFPricingTier {
  thresholdFrom: number;
  thresholdTo: number | null;
  rate: number;
}

export interface MeasurePDFPricingScenario {
  label: string;
  modelLabel: string;
  rateSuffix: string;
  tiers: MeasurePDFPricingTier[];
  appliedTier: MeasurePDFPricingTier | null;
  scale: number;
  scaleLabel: string;
  investment: number;
  netAnnual: number;
  roi: number;
  isBestValue: boolean;
  warning?: string;
}

export interface MeasurePDFData {
  organizationName?: string;
  preparedFor?: string;
  preparedBy?: string;
  date: string;
  careSettingLabel: string;
  monthsLive?: number;

  careSetting: ExploreSetting;
  numberOfProviders: number;
  utilizationPercent: number;
  annualEncounters: number;
  // Deployment snapshot (from the partner-profile screen)
  totalProvidersInOrg: number;
  liveProviders: number;
  mruProviders: number;
  abridgeEncounters: number;
  encounterCoverageRate: number;
  staffedBeds?: number;
  occupancyPercent?: number;

  totalRealized: number;
  totalProjected: number;
  addedSettingsTotal: number;
  combinedAnnualTotal: number;
  driversTrackedCount: number;

  quadrants: MeasurePDFQuadrantSection[];

  forecastBaseline: {
    providers: number;
    utilizationPercent: number;
    encounters: number;
    staffedBeds: number;
    occupancyPercent: number;
  };
  forecastProjected: {
    providers: number;
    utilizationPercent: number;
    encounters: number;
    staffedBeds: number;
    occupancyPercent: number;
  };

  addedSettings: MeasurePDFAddedSetting[];

  pricingScenarios: MeasurePDFPricingScenario[];
  bestPricingScenarioLabel?: string;
  bestPricingInvestment?: number;
  bestPricingNet?: number;
  audience?: 'clinical' | 'operational' | 'financial' | 'executive';
  loveStories?: Array<{ text: string; attribution: string; role?: string }>;
  isMultiSetting?: boolean;
  settingBreakdowns?: Array<{
    setting: ExploreSetting;
    label: string;
    providers: number;
    encounters: number;
    utilizationPercent: number;
    forecastBaseline: { providers: number; utilizationPercent: number; encounters: number; staffedBeds: number; occupancyPercent: number };
    forecastProjected: { providers: number; utilizationPercent: number; encounters: number; staffedBeds: number; occupancyPercent: number };
  }>;
}

function fmtC(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  if (Math.abs(n) >= 1_000_000) return `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) {
    const k = Math.round(Math.abs(n) / 1_000);
    if (k >= 1000) return `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1_000_000).toFixed(1)}M`;
    return `${n < 0 ? "-" : ""}$${k}K`;
  }
  return `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n))}`;
}
function fmtN(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
}
function fmtRate(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(2)}`;
}
function fmtPct(n: number): string {
  return `${Math.round(n)}%`;
}

const Conf = ({ org }: { org: string }) => (
  <Text style={s.confHeader}>Confidential \u2014 Prepared for {org}</Text>
);

const Footer = ({ n, total, org }: { n: number; total: number; org: string }) => (
  <View style={s.footer}>
    <Text style={s.footerLeft}>ABRIDGE</Text>
    <Text style={s.footerCenter}>{org} \u00B7 Evidence \u0026 Forecast</Text>
    <Text style={s.footerRight}>Page {n} of {total}</Text>
  </View>
);

function MonthlySparkline({ data }: { data: Array<{ month: string; withAbridge: number; withoutAbridge: number }> }) {
  if (data.length < 2) return null;
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const w = 320;
  const h = 60;
  const pad = 4;
  const allVals = sorted.flatMap((d) => [d.withAbridge, d.withoutAbridge]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const xStep = (w - pad * 2) / (sorted.length - 1);
  const toY = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const ptsWith = sorted.map((d, i) => `${pad + i * xStep},${toY(d.withAbridge)}`).join(" ");
  const ptsWithout = sorted.map((d, i) => `${pad + i * xStep},${toY(d.withoutAbridge)}`).join(" ");
  return (
    <View style={{ marginTop: 6, marginBottom: 4 }}>
      <Svg width={w} height={h}>
        <Line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={C.border} strokeWidth={0.5} />
        <Polyline points={ptsWithout} stroke={C.muted} strokeWidth={1} fill="none" strokeDasharray="2,2" />
        <Polyline points={ptsWith} stroke={C.orange} strokeWidth={1.5} fill="none" />
        {sorted.map((d, i) => (
          <Circle key={`with-${i}`} cx={pad + i * xStep} cy={toY(d.withAbridge)} r={1.5} fill={C.orange} />
        ))}
      </Svg>
      <Text style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>
        Solid \u2014 With Abridge   Dashed \u2014 Without
      </Text>
    </View>
  );
}

function DriverCard({ d }: { d: MeasurePDFDriver }) {
  const isQuant = d.visibility === "quantified";
  const showMonthly = d.isMonthlyMode && d.monthlyData && d.monthlyData.length >= 2;
  const unit = d.deltaUnit || "";
  const valLabel = d.valuePerUnitLabel || "value per unit";
  const valPrefix = d.valuePerUnitPrefix || "";

  return (
    <View style={s.cardOutline} wrap={false}>
      <View style={s.driverHeaderRow}>
        <Text style={s.driverLabel}>{d.label}</Text>
        {isQuant ? (
          <Text style={s.badgeQuant}>$</Text>
        ) : (
          <Text style={s.badgeQual}>QUAL</Text>
        )}
      </View>
      <Text style={s.driverDescription}>{d.shortDescription}</Text>

      {isQuant ? (
        <>
          <Text style={s.calcDelta}>
            {fmtN(d.withoutAbridge)} \u2192 {fmtN(d.withAbridge)} {unit}
            {"  ("}\u0394 {d.delta >= 0 ? "+" : ""}{fmtN(d.delta)} {unit}{")"}
          </Text>
          <Text style={s.calcLine}>
            \u0394 {fmtN(d.delta)} {unit} \u00D7 {valPrefix}{fmtN(d.valuePerUnit)} {valLabel}
            {d.isPerEncounter ? ` \u00D7 ${fmtN(d.scaleUnits)} ${d.scaleUnitLabel}` : (d.scaleUnits !== 1 ? ` \u00D7 ${fmtN(d.scaleUnits)}` : "")}
            {" \u00D7 "}{fmtPct(d.attributionPercent)} attribution
          </Text>
          <Text style={s.calcResult}>= {fmtC(d.realizedValue)}</Text>
          {showMonthly && d.monthlyData ? <MonthlySparkline data={d.monthlyData} /> : null}
          {d.notes ? <Text style={s.notesText}>Notes: {d.notes}</Text> : null}
        </>
      ) : (
        <>
          {d.notes ? <Text style={s.notesText}>{d.notes}</Text> : null}
          <Text style={s.qualNote}>Tracked qualitatively \u2014 no financial value modeled.</Text>
        </>
      )}
    </View>
  );
}

const MeasureEvidenceDoc = ({ data }: { data: MeasurePDFData }) => {
  const orgName = data.organizationName || "Your Organization";
  const monthsLive = data.monthsLive ?? 0;
  const isNursing = data.careSetting === "nursing";

  const hasForecast = data.totalProjected > 0 || data.combinedAnnualTotal > 0;
  const hasExpansions = data.addedSettings.length > 0;
  const hasPricing = data.pricingScenarios.length > 0;
  const hasLoveStories = (data.loveStories?.length ?? 0) > 0;

  let pageCount = 3;
  if (hasForecast) pageCount += 1;
  if (hasExpansions) pageCount += 1;
  if (hasPricing) pageCount += 1;
  if (hasLoveStories) pageCount += 1;
  pageCount += 1;
  let pageN = 0;
  const P = () => ++pageN;

  const subtitleParts = [
    `${data.numberOfProviders} ${isNursing ? "FTEs" : "providers"}`,
    monthsLive > 0 ? `${monthsLive} months live` : null,
    data.careSettingLabel,
  ].filter(Boolean);

  return (
    <Document>
      <PDFCoverPage
        reportLabel="Executive Business Review"
        title={orgName}
        subtitle={subtitleParts.join(" \u00B7 ")}
        preparedBy="Abridge Partner Success"
        disclaimerText="This EBR reflects actual deployment data and Abridge methodology. Estimates are ranges, not audited projections."
      />

      {/* PAGE 1: Executive Summary */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <Conf org={orgName} />
          <Text style={s.eyebrow}>Executive Summary</Text>
          <Text style={s.headline}>Here\u2019s what we\u2019re delivering.</Text>
          <Text style={s.subline}>
            {monthsLive > 0 ? `${monthsLive} months live on Abridge \u00B7 ` : ""}{data.careSettingLabel} \u00B7 Generated {data.date}
          </Text>

          <View style={s.statRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{fmtC(data.totalRealized)}</Text>
              <Text style={s.statLabel}>Realized today</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{fmtC(data.combinedAnnualTotal)}</Text>
              <Text style={s.statLabel}>Projected at scale</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{data.driversTrackedCount}</Text>
              <Text style={s.statLabel}>Drivers tracked</Text>
            </View>
          </View>

          {data.bestPricingNet !== undefined ? (
            <View style={s.callout}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: C.dark, marginBottom: 4 }}>
                Net under recommended pricing
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: C.orange, marginBottom: 4 }}>
                {fmtC(data.bestPricingNet)} / yr
              </Text>
              {data.bestPricingScenarioLabel ? (
                <Text style={{ fontSize: 9, color: C.mid }}>
                  Pricing scenario: {data.bestPricingScenarioLabel}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Text style={s.narrative}>
            {orgName} has tracked {data.driversTrackedCount} value driver{data.driversTrackedCount === 1 ? "" : "s"} across {data.quadrants.filter((q) => q.drivers.length > 0).length} of 4 measurement quadrants. Realized value to date is {fmtC(data.totalRealized)}. At the modeled forecast scale {hasExpansions ? `(including ${data.addedSettings.length} additional care setting${data.addedSettings.length === 1 ? "" : "s"})` : ""}, combined annual value reaches {fmtC(data.combinedAnnualTotal)}.
          </Text>

          <Footer n={P()} total={pageCount} org={orgName} />
        </View>
      </Page>

      {/* PAGES 2-3: Realized Value by Quadrant (Capacity, Workforce on one; Revenue, Quality on next) */}
      {[
        { qs: data.quadrants.filter((q) => q.quadrant === "Capacity" || q.quadrant === "Workforce"), label: "Capacity \u0026 Workforce" },
        { qs: data.quadrants.filter((q) => q.quadrant === "Revenue" || q.quadrant === "Quality"), label: "Revenue \u0026 Quality" },
      ].map((group, gi) => (
        <Page key={gi} size="LETTER" style={s.page}>
          <View style={s.wrap}>
            <Conf org={orgName} />
            <Text style={s.eyebrow}>Realized Value by Quadrant</Text>
            <Text style={s.headline}>{group.label}</Text>
            <Text style={s.subline}>What\u2019s already happening at {orgName}.</Text>

            {group.qs.map((q) => (
              <View key={q.quadrant} style={{ marginBottom: 10 }}>
                <View style={s.quadHeader}>
                  <Text style={s.quadName}>{q.quadrant}</Text>
                  <Text style={s.quadTotal}>
                    {q.realizedTotal > 0 ? `${fmtC(q.realizedTotal)} realized` : "Tracked qualitatively"}
                  </Text>
                </View>

                {q.drivers.length === 0 ? (
                  <Text style={s.emptyQuad}>No drivers tracked in this quadrant.</Text>
                ) : (
                  q.drivers.map((d) => <DriverCard key={d.id} d={d} />)
                )}
              </View>
            ))}

            <Footer n={P()} total={pageCount} org={orgName} />
          </View>
        </Page>
      ))}

      {/* PAGE: Forecast at Scale */}
      {hasForecast ? (
        <Page size="LETTER" style={s.page} wrap={false}>
          <View style={s.wrap}>
            <Conf org={orgName} />
            <Text style={s.eyebrow}>Forecast</Text>
            <Text style={s.headline}>Here\u2019s what\u2019s possible at scale.</Text>
            <Text style={s.subline}>Your tracked drivers, projected against a larger footprint.</Text>

            <View style={[s.card, { marginBottom: 12 }]}>
              <View style={s.axisRow}>
                <Text style={s.axisLabel}>{isNursing ? "Nurse FTEs" : "Providers"}</Text>
                <Text style={s.axisValue}>
                  {fmtN(data.forecastBaseline.providers)} \u2192 {fmtN(data.forecastProjected.providers)}
                </Text>
              </View>
              <View style={s.axisRow}>
                <Text style={s.axisLabel}>Utilization</Text>
                <Text style={s.axisValue}>
                  {fmtPct(data.forecastBaseline.utilizationPercent)} \u2192 {fmtPct(data.forecastProjected.utilizationPercent)}
                </Text>
              </View>
              {!isNursing ? (
                <View style={s.axisRow}>
                  <Text style={s.axisLabel}>Annual encounters</Text>
                  <Text style={s.axisValue}>
                    {fmtN(data.forecastBaseline.encounters)} \u2192 {fmtN(data.forecastProjected.encounters)}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={s.axisRow}>
                    <Text style={s.axisLabel}>Staffed beds</Text>
                    <Text style={s.axisValue}>
                      {fmtN(data.forecastBaseline.staffedBeds)} \u2192 {fmtN(data.forecastProjected.staffedBeds)}
                    </Text>
                  </View>
                  <View style={s.axisRow}>
                    <Text style={s.axisLabel}>Occupancy</Text>
                    <Text style={s.axisValue}>
                      {fmtPct(data.forecastBaseline.occupancyPercent)} \u2192 {fmtPct(data.forecastProjected.occupancyPercent)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={s.callout}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: C.dark, marginBottom: 4 }}>Projected combined annual value</Text>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: C.orange, marginBottom: 6 }}>
                {fmtC(data.combinedAnnualTotal)}
              </Text>
              {data.addedSettingsTotal > 0 ? (
                <Text style={{ fontSize: 9, color: C.mid, lineHeight: 1.5 }}>
                  {fmtC(data.totalProjected)} from current setting + {fmtC(data.addedSettingsTotal)} from modeled expansions = {fmtC(data.combinedAnnualTotal)} combined.
                </Text>
              ) : (
                <Text style={{ fontSize: 9, color: C.mid }}>
                  Current setting only \u2014 no expansions modeled.
                </Text>
              )}
            </View>

            <Text style={s.narrative}>
              Each tracked driver scales according to its dimension \u2014 some scale with provider count, some with encounter volume, some with patient days. The forecast above applies the right scaling to each driver and sums the result.
            </Text>

            <Footer n={P()} total={pageCount} org={orgName} />
          </View>
        </Page>
      ) : null}

      {/* PAGE: Modeled Expansions */}
      {hasExpansions ? (
        <Page size="LETTER" style={s.page}>
          <View style={s.wrap}>
            <Conf org={orgName} />
            <Text style={s.eyebrow}>Modeled Expansions</Text>
            <Text style={s.headline}>Layering in additional care settings.</Text>
            <Text style={s.subline}>Estimated value from new settings beyond {data.careSettingLabel}.</Text>

            {data.addedSettings.map((a, i) => (
              <View key={i} style={s.card} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: C.dark }}>{a.settingLabel}</Text>
                  <Text style={{ fontSize: 8, color: C.bg, backgroundColor: C.dark, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>{a.scenarioLabel}</Text>
                </View>
                <Text style={{ fontSize: 9, color: C.mid, marginBottom: 6 }}>
                  {a.isNursing
                    ? `${fmtN(a.providers)} FTEs \u00B7 ${fmtN(a.staffedBeds)} beds \u00B7 ${fmtPct(a.occupancyPercent)} occupancy \u00B7 ${fmtPct(a.utilizationPercent)} utilization`
                    : `${fmtN(a.providers)} providers \u00B7 ${fmtN(a.encounters)} annual encounters \u00B7 ${fmtPct(a.utilizationPercent)} utilization`}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: C.orange }}>{fmtC(a.estimatedValue)}</Text>
                  <Text style={{ fontSize: 8, color: C.muted }}>
                    estimated annual value{a.isOverridden ? " (overridden)" : ""}
                  </Text>
                </View>
              </View>
            ))}

            <Footer n={P()} total={pageCount} org={orgName} />
          </View>
        </Page>
      ) : null}

      {/* PAGE: Pricing Comparison */}
      {hasPricing ? (
        <Page size="LETTER" style={s.page}>
          <View style={s.wrap}>
            <Conf org={orgName} />
            <Text style={s.eyebrow}>Pricing Comparison</Text>
            <Text style={s.headline}>Investment scenarios at the projected scale.</Text>
            <Text style={s.subline}>Stepped tier math \u2014 all units price at the matched tier rate.</Text>

            {data.pricingScenarios.map((sc, i) => (
              <View key={i} style={s.card}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: C.dark }}>{sc.label}</Text>
                  {sc.isBestValue ? <Text style={s.bestBadge}>\u2605 BEST VALUE</Text> : null}
                </View>
                <Text style={{ fontSize: 9, color: C.mid, marginBottom: 6 }}>{sc.modelLabel}</Text>

                {sc.tiers.length > 0 ? (
                  <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 3, marginBottom: 8 }}>
                    {sc.tiers.map((t, ti) => {
                      const isApplied = sc.appliedTier && t.thresholdFrom === sc.appliedTier.thresholdFrom && t.thresholdTo === sc.appliedTier.thresholdTo && t.rate === sc.appliedTier.rate;
                      const toStr = t.thresholdTo === null ? "+" : `\u2013 ${fmtN(t.thresholdTo)}`;
                      return (
                        <View key={ti} style={isApplied ? s.pricingTierRowApplied : s.pricingTierRow}>
                          <Text style={s.tierCell}>
                            {fmtN(t.thresholdFrom)} {toStr}
                          </Text>
                          <Text style={s.tierCellRate}>
                            {fmtRate(t.rate)} {sc.rateSuffix}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <Text style={{ fontSize: 8, color: C.muted, marginBottom: 6 }}>
                  At {fmtN(sc.scale)} {sc.scaleLabel}{sc.appliedTier ? `, applies tier ${fmtN(sc.appliedTier.thresholdFrom)}${sc.appliedTier.thresholdTo === null ? "+" : `\u2013${fmtN(sc.appliedTier.thresholdTo)}`} @ ${fmtRate(sc.appliedTier.rate)}` : ""}
                </Text>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Investment</Text>
                    <Text style={{ fontSize: 13, fontWeight: "bold", color: C.dark }}>{fmtC(sc.investment)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Net</Text>
                    <Text style={{ fontSize: 13, fontWeight: "bold", color: C.orange }}>{fmtC(sc.netAnnual)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>ROI</Text>
                    <Text style={{ fontSize: 13, fontWeight: "bold", color: C.dark }}>{sc.roi.toFixed(1)}\u00D7</Text>
                  </View>
                </View>

                {sc.warning ? <Text style={s.warning}>\u26A0 {sc.warning}</Text> : null}
              </View>
            ))}

            {data.bestPricingScenarioLabel ? (
              <View style={s.callout}>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: C.dark, marginBottom: 4 }}>Recommended at this scale</Text>
                <Text style={{ fontSize: 10, color: C.mid, lineHeight: 1.5 }}>
                  {data.bestPricingScenarioLabel}. Investment {fmtC(data.bestPricingInvestment ?? 0)}, net {fmtC(data.bestPricingNet ?? 0)} annual.
                </Text>
              </View>
            ) : null}

            <Footer n={P()} total={pageCount} org={orgName} />
          </View>
        </Page>
      ) : null}

      {/* PAGE: Love Stories */}
      {hasLoveStories ? (
        <Page size="LETTER" style={s.page}>
          <View style={s.wrap}>
            <Conf org={orgName} />
            <Text style={s.eyebrow}>Love Stories</Text>
            <Text style={s.headline}>What providers say about Abridge.</Text>
            <Text style={s.subline}>Often the most memorable part of a business review.</Text>

            {(data.loveStories ?? []).slice(0, 6).map((story, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: C.card,
                  borderLeftWidth: 3,
                  borderLeftColor: C.orange,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  marginBottom: 10,
                  borderRadius: 4,
                }}
                wrap={false}
              >
                <Text style={{ fontSize: 10.5, fontStyle: "italic", color: C.dark, lineHeight: 1.6, marginBottom: 8 }}>
                  {`"${story.text}"`}
                </Text>
                <Text style={{ fontSize: 8.5, fontWeight: "bold", color: C.orange }}>
                  {`— ${story.attribution}`}
                </Text>
                {story.role ? (
                  <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 2 }}>{story.role}</Text>
                ) : null}
              </View>
            ))}

            <Footer n={P()} total={pageCount} org={orgName} />
          </View>
        </Page>
      ) : null}

      {/* PAGE: Methodology */}
      <Page size="LETTER" style={s.page}>
        <View style={s.wrap}>
          <Conf org={orgName} />
          <Text style={s.eyebrow}>Methodology</Text>
          <Text style={s.headline}>How these numbers are calculated.</Text>

          <View style={s.bulletRow}>
            <View style={s.bullet} />
            <Text style={s.bulletText}>
              Each quantified driver computes realized value as: \u0394 (With \u2212 Without) \u00D7 value-per-unit \u00D7 encounter volume \u00D7 attribution\u202F%. Attribution captures how much of the change is reasonably tied to Abridge.
            </Text>
          </View>
          <View style={s.bulletRow}>
            <View style={s.bullet} />
            <Text style={s.bulletText}>
              Drivers tracked in monthly mode use the latest month\u2019s With/Without values for the financial calculation. The trend line is shown for context and to verify direction of travel.
            </Text>
          </View>
          <View style={s.bulletRow}>
            <View style={s.bullet} />
            <Text style={s.bulletText}>
              Forecast projections scale each driver according to its scaleAxis \u2014 providers, encounters, or patient days. The base scale is taken from your deployment; the projected scale comes from the forecast inputs you set.
            </Text>
          </View>
          <View style={s.bulletRow}>
            <View style={s.bullet} />
            <Text style={s.bulletText}>
              Modeled expansions for added care settings use per-setting heuristic value-per-provider estimates (Conservative / Typical / Optimistic). These are starting points pending your validation, not committed numbers.
            </Text>
          </View>
          <View style={s.bulletRow}>
            <View style={s.bullet} />
            <Text style={s.bulletText}>
              Pricing scenarios use stepped tier math: every unit prices at the rate of the matched tier, not graduated. The tier matched depends on the combined projected scale.
            </Text>
          </View>
          <View style={s.bulletRow}>
            <View style={s.bullet} />
            <Text style={s.bulletText}>
              Qualitative drivers are tracked but not assigned a financial value. They appear in the quadrant view to ensure the full picture of impact is represented.
            </Text>
          </View>

          <Footer n={P()} total={pageCount} org={orgName} />
        </View>
      </Page>
    </Document>
  );
};

const QUADRANT_ORDER: ExploreQuadrant[] = ["Capacity", "Workforce", "Revenue", "Quality"];

function getSettingBaselineValues(settingKey: string, state: MeasureState) {
  const sd = (state.settingData?.[settingKey as MeasureCareSetting] || {}) as Record<string, number>;
  const dep: any = state.deployment || {};
  const providers = sd.deploy_providers || dep.providers || 0;
  const totalEnc = sd.deploy_totalEncounters || dep.totalEncounters || 0;
  const abridgeEnc = sd.deploy_abridgeEncounters || dep.abridgeEncounters || 0;
  const utilPct = totalEnc > 0 ? Math.round((abridgeEnc / totalEnc) * 100) : (dep.utilizationRate || 0);
  const staffedBeds = (sd.deploy_staffedBeds as number | undefined) ?? (dep.staffedBeds ?? 0);
  const occupancyPercent = dep.occupancyPercent ?? 0;
  return { providers, utilizationPercent: utilPct, encounters: totalEnc, staffedBeds, occupancyPercent };
}

type AxisValues = ReturnType<typeof getSettingBaselineValues>;

function pdfScaleFactor(axis: string, bl: AxisValues, proj: AxisValues): number {
  if (axis === "fixed") return 1;
  if (axis === "providers") {
    const b = bl.providers * (bl.utilizationPercent / 100);
    const p = proj.providers * (proj.utilizationPercent / 100);
    return b > 0 ? p / b : 1;
  }
  if (axis === "encounters") {
    const b = bl.encounters * (bl.utilizationPercent / 100);
    const p = proj.encounters * (proj.utilizationPercent / 100);
    return b > 0 ? p / b : 1;
  }
  if (axis === "patientDays") {
    const b = bl.staffedBeds * (bl.occupancyPercent / 100);
    const p = proj.staffedBeds * (proj.occupancyPercent / 100);
    return b > 0 ? p / b : 1;
  }
  return 1;
}

export function buildMeasurePDFDataFromState(state: MeasureState, audience?: string): MeasurePDFData {
  const activeSettings = (
    state.activeCareSettings && state.activeCareSettings.length > 0
      ? state.activeCareSettings
      : [state.careSetting || "outpatient"]
  ) as ExploreSetting[];
  const isMultiSetting = activeSettings.length > 1;
  const primarySetting = activeSettings[0];
  const dep: any = state.deployment || {};
  const fc = state.forecastScenario || ({} as any);

  // Per-setting baselines and projections
  const blMap = Object.fromEntries(activeSettings.map(s => [s, getSettingBaselineValues(s, state)]));
  const projMap = Object.fromEntries(activeSettings.map(s => [s, state.settingForecasts?.[s] || blMap[s]]));

  // Aggregate quadrants across all active settings
  const quadrants: MeasurePDFQuadrantSection[] = QUADRANT_ORDER.map((q) => {
    const drivers: MeasurePDFDriver[] = [];
    for (const settingKey of activeSettings) {
      const settingTracked = state.trackedDrivers?.[settingKey] || {};
      const sd = (state.settingData?.[settingKey] || {}) as Record<string, number>;
      const abridgeEnc = (sd.deploy_abridgeEncounters as number) || (state.deployment as any)?.abridgeEncounters || 0;
      getActiveDrivers(state.customDriverDefs)
        .filter(d => d.quadrant === q && d.settings.includes(settingKey) && settingTracked[d.id])
        .forEach(d => {
          const entry = settingTracked[d.id];
          const md = d.measureDefaults;
          const sortedMonthly = [...(entry.monthlyData || [])].sort((a, b) => a.month.localeCompare(b.month));
          const latest = sortedMonthly[sortedMonthly.length - 1];
          const effWith = entry.isMonthlyMode && latest ? latest.withAbridge : entry.withAbridge;
          const effWithout = entry.isMonthlyMode && latest ? latest.withoutAbridge : entry.withoutAbridge;
          const lowerIsBetter = md?.lowerIsBetter ?? entry.lowerIsBetter ?? false;
          const delta = lowerIsBetter ? effWithout - effWith : effWith - effWithout;
          // Single source of truth — same per-encounter-aware formula the output screen uses.
          const realizedValue = computeRealizedDriverValue(d, entry, abridgeEnc);
          // Mirror the scale the formula applies, so the printed equation equals the result.
          const isPerEncounter = Boolean(md?.isPerEncounterRate && abridgeEnc > 0);
          const scaleUnits = isPerEncounter
            ? abridgeEnc
            : (entry.scaleDivisor && entry.scaleDivisor > 0 && entry.scaleValue !== undefined)
              ? entry.scaleValue / entry.scaleDivisor
              : 1;
          const scaleUnitLabel = settingKey === "inpatient" ? "discharges" : "encounters";
          drivers.push({
            id: d.id,
            label: d.label,
            shortDescription: d.shortDescription,
            visibility: d.visibility,
            isMonthlyMode: Boolean(entry.isMonthlyMode),
            withoutAbridge: effWithout,
            withAbridge: effWith,
            delta,
            valuePerUnit: entry.valuePerUnit,
            attributionPercent: entry.attributionPercent,
            realizedValue,
            scaleUnits,
            isPerEncounter,
            scaleUnitLabel,
            notes: entry.notes,
            monthlyData: sortedMonthly.length > 0 ? sortedMonthly : undefined,
            deltaUnit: md?.deltaUnit,
            deltaLabel: md?.deltaLabel,
            valuePerUnitLabel: md?.valuePerUnitLabel,
            valuePerUnitPrefix: md?.valuePerUnitPrefix,
            setting: settingKey,
            serviceLineRows: entry.serviceLineRows,
            lowerIsBetter,
          });
        });
    }
    const realizedTotal = drivers.reduce((sum, d) => sum + d.realizedValue, 0);
    return { quadrant: q, realizedTotal, drivers };
  });

  const totalRealized = quadrants.reduce((sum, q) => sum + q.realizedTotal, 0);
  const driversTrackedCount = quadrants.reduce((sum, q) => sum + q.drivers.length, 0);

  // Projected totals using per-setting scale factors from settingForecasts
  const totalProjected = quadrants.reduce((sum, q) => {
    return sum + q.drivers.reduce((dsum, drv) => {
      const driverDef = getActiveDrivers(state.customDriverDefs).find(d => d.id === drv.id);
      if (!driverDef?.measureDefaults) return dsum + drv.realizedValue;
      const sk = drv.setting || primarySetting;
      const bl = blMap[sk] || blMap[primarySetting];
      const proj = projMap[sk] || projMap[primarySetting];
      const sf = pdfScaleFactor(driverDef.measureDefaults.scaleAxis, bl, proj);
      return dsum + Math.round(drv.realizedValue * sf);
    }, 0);
  }, 0);

  const addedSettings = fc.addedSettings ?? [];
  const addedSettingsTotal = addedSettings.reduce((sum: number, a: any) => sum + computeAddedSettingValue(a), 0);
  const combinedAnnualTotal = totalProjected + addedSettingsTotal;

  const pricingScenarios = fc.pricingScenarios ?? [];
  const combinedProviders = activeSettings.reduce((sum, s) => sum + (projMap[s]?.providers || 0), 0)
    + addedSettings.reduce((s: number, a: any) => s + (a.providers || 0), 0);
  const combinedEncounters = activeSettings.reduce((sum, s) => sum + (projMap[s]?.encounters || 0), 0)
    + addedSettings.reduce((s: number, a: any) => s + (a.encounters || 0), 0);

  const evaluated = pricingScenarios.map((sc: any) => {
    const scale = sc.model === "perProvider" ? combinedProviders : sc.model === "perEncounter" ? combinedEncounters : 0;
    const { value: investment, tier, warning } = computeScenarioInvestment(sc, scale);
    const net = combinedAnnualTotal - investment;
    const roi = investment > 0 ? combinedAnnualTotal / investment : 0;
    return { scenario: sc, scale, investment, tier, warning, net, roi };
  });

  let bestId: string | null = null;
  if (evaluated.length >= 2) {
    const valid = evaluated.filter((e: any) => !e.warning && e.investment > 0);
    if (valid.length > 0) {
      // Match the screen's rule (highest ROI). Equivalent to lowest-investment
      // today since value is constant across scenarios, but stays correct if
      // value ever becomes scenario-specific. See MeasureForecast bestValueScenarioId.
      valid.sort((a: any, b: any) => b.roi - a.roi);
      bestId = valid[0].scenario.id;
    }
  }
  const bestEntry = bestId ? evaluated.find((e: any) => e.scenario.id === bestId) : null;
  const titleScenario = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const primaryBl = blMap[primarySetting];
  const primaryProj = projMap[primarySetting];

  const settingBreakdowns: MeasurePDFData["settingBreakdowns"] = isMultiSetting
    ? activeSettings.map(s => ({
        setting: s,
        label: SETTING_LABELS[s] || String(s),
        providers: blMap[s].providers,
        encounters: blMap[s].encounters,
        utilizationPercent: blMap[s].utilizationPercent,
        forecastBaseline: blMap[s],
        forecastProjected: projMap[s],
      }))
    : undefined;

  const totalProviders = activeSettings.reduce((sum, s) => sum + blMap[s].providers, 0);
  const avgUtilization = activeSettings.length > 0
    ? Math.round(activeSettings.reduce((sum, s) => sum + blMap[s].utilizationPercent, 0) / activeSettings.length)
    : 0;

  return {
    organizationName: dep.organizationName || undefined,
    date: new Date().toLocaleDateString(),
    careSettingLabel: isMultiSetting
      ? activeSettings.map(s => SETTING_LABELS[s] || s).join(" + ")
      : SETTING_LABELS[primarySetting],
    monthsLive: dep.monthsOnAbridge ?? undefined,

    careSetting: primarySetting,
    numberOfProviders: totalProviders,
    utilizationPercent: avgUtilization,
    annualEncounters: activeSettings.reduce((sum, s) => sum + blMap[s].encounters, 0),
    totalProvidersInOrg: dep.totalProviders ?? totalProviders,
    liveProviders: dep.liveProviders ?? totalProviders,
    mruProviders: dep.mruProviders ?? 0,
    abridgeEncounters: dep.abridgeEncounters ?? 0,
    encounterCoverageRate: dep.encounterCoverageRate ?? 0,
    staffedBeds: activeSettings.includes("nursing" as ExploreSetting) ? primaryBl.staffedBeds : undefined,
    occupancyPercent: activeSettings.includes("nursing" as ExploreSetting) ? primaryBl.occupancyPercent : undefined,

    totalRealized,
    totalProjected,
    addedSettingsTotal,
    combinedAnnualTotal,
    driversTrackedCount,

    quadrants,
    forecastBaseline: primaryBl,
    forecastProjected: primaryProj,
    isMultiSetting,
    settingBreakdowns,

    addedSettings: addedSettings.map((a: any) => ({
      settingLabel: SETTING_LABELS[a.setting as ExploreSetting] || String(a.setting),
      providers: a.providers || 0,
      utilizationPercent: a.utilizationPercent || 0,
      encounters: a.encounters || 0,
      staffedBeds: a.staffedBeds || 0,
      occupancyPercent: a.occupancyPercent || 0,
      scenarioLabel: titleScenario(a.scenario || "typical"),
      estimatedValue: computeAddedSettingValue(a),
      isOverridden: a.customValueOverride !== undefined && a.customValueOverride > 0,
      isNursing: a.setting === "nursing",
    })),

    pricingScenarios: evaluated.map((e: any) => ({
      label: e.scenario.label,
      modelLabel: PRICING_MODEL_LABELS[e.scenario.model as keyof typeof PRICING_MODEL_LABELS],
      rateSuffix: PRICING_MODEL_RATE_SUFFIX[e.scenario.model as keyof typeof PRICING_MODEL_RATE_SUFFIX],
      tiers: (e.scenario.tiers || []).map((t: any) => ({ thresholdFrom: t.thresholdFrom, thresholdTo: t.thresholdTo, rate: t.rate })),
      appliedTier: e.tier ? { thresholdFrom: e.tier.thresholdFrom, thresholdTo: e.tier.thresholdTo, rate: e.tier.rate } : null,
      scale: e.scale,
      scaleLabel: PRICING_MODEL_SCALE_LABEL[e.scenario.model as keyof typeof PRICING_MODEL_SCALE_LABEL],
      investment: e.investment,
      netAnnual: e.net,
      roi: e.roi,
      isBestValue: e.scenario.id === bestId,
      warning: e.warning,
    })),

    bestPricingScenarioLabel: bestEntry?.scenario.label,
    bestPricingInvestment: bestEntry?.investment,
    bestPricingNet: bestEntry?.net,
    audience: audience as MeasurePDFData['audience'],
    loveStories: (state.quotes ?? []).map(q => ({ text: q.text, attribution: q.attribution, role: q.role })),
  };
}

export async function generateMeasurePDF(input: MeasurePDFData | MeasureState): Promise<void> {
  const data: MeasurePDFData =
    "quadrants" in input && Array.isArray((input as MeasurePDFData).quadrants)
      ? (input as MeasurePDFData)
      : buildMeasurePDFDataFromState(input as MeasureState);
  const doc = <MeasureEvidenceDoc data={data} />;
  const blob = await pdf(doc).toBlob();
  const orgName = data.organizationName || "Evidence";
  const dateStr = new Date().toISOString().slice(0, 10);
  await savePdfBlob(blob, `${orgName.replace(/\s+/g, "-")}_Evidence_${dateStr}.pdf`);
}
