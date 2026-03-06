import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
  Svg,
  Rect,
  Line as SvgLine,
  G,
  Circle,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import type { ProformaSettingSnapshot, ProformaConfig } from "./proformaTypes";
import type { ProformaSummary } from "./proformaTypes";
import { SETTING_LABELS, SETTING_UNIT_LABELS, ONSET_LABELS } from "./proformaTypes";
import {
  buildMonthlyCashFlows,
  groupByQuarter,
  calculateProformaSummary,
  getYearlySummary,
  calculateIRR,
  getContractStartDate,
} from "@/lib/proformaCalculations";

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
  positive: "#059669",
  negative: "#DC2626",
  docBlue: "#1E3A5F",
  timeRed: "#EA2C00",
  retentionAmber: "#D4930A",
  warningBg: "#FEF3C7",
  warningBorder: "#F59E0B",
  warningText: "#92400E",
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

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtPct(n: number) {
  const val = Math.round(n * 100);
  return `${val}%`;
}

function fmtNum(n: number) {
  return Math.round(n).toLocaleString();
}

function contractTermLabel(months: number): string {
  return `${months / 12}-Year`;
}

function unitLabel(careSetting: string, plural = true): string {
  const label = SETTING_UNIT_LABELS[careSetting] || "providers";
  return plural ? label : label.replace(/s$/, "");
}

function getSettingInputSummary(snapshot: ProformaSettingSnapshot): string[] {
  const s = snapshot.fullExploreState;
  const t = s.timeDriverInputs;
  const d = s.docQualityInputs;
  const cs = snapshot.careSetting;
  const lines: string[] = [];

  if (cs === "nursing") {
    lines.push(`${s.nursingStaffedBeds} staffed beds \u00B7 ${s.numberOfProviders} nurse FTEs`);
  } else {
    lines.push(`${s.numberOfProviders} ${unitLabel(cs)} \u00B7 ${s.annualEncounters.toLocaleString()} encounters/yr`);
  }
  lines.push(`${s.utilizationPercent}% utilization \u00B7 ${s.minutesSavedPerEncounter} min saved/encounter`);

  if (cs === "outpatient") {
    if (t.patientAccessEnabled) {
      const hasAlloc = (t as any).opAllocCapacityPercent != null;
      const realPct = t.capacityRealizationPercent ?? (t as any).capacityPercent ?? 75;
      lines.push(hasAlloc
        ? `Capacity: ${(t as any).opAllocCapacityPercent}% allocated × ${realPct}% realization · ${t.visitDuration}min visits · $${t.revenuePerVisit}/visit`
        : `Capacity: ${realPct}% toward visits · ${t.visitDuration}min visits · $${t.revenuePerVisit}/visit`);
    }
    if (d.wrvuEnabled) lines.push(`wRVU: ${d.wrvuScenario} scenario \u00B7 ${d.wrvuRealization}% realization`);
    if (d.hccEnabled) lines.push(`HCC: ${d.hccRealization}% realization`);
    if (d.denialsEnabled) lines.push(`Denials: ${d.denialRate}% rate \u00B7 ${d.denialsScenario} scenario \u00B7 ${d.denialsRealization}% realization`);
  } else if (cs === "ed") {
    if (t.edLwbsEnabled) lines.push(`LWBS: ${t.edLwbsRate}% rate \u00B7 ${t.edLwbsReduction}% reduction \u00B7 $${t.edRevenuePerVisit}/visit`);
    if (d.wrvuEnabled) lines.push(`Level-of-Service: ${d.wrvuScenario} scenario \u00B7 ${d.wrvuRealization}% realization`);
    if (d.denialsEnabled) lines.push(`Denials: ${d.denialRate}% rate \u00B7 ${d.denialsScenario} scenario`);
  } else if (cs === "inpatient") {
    if (d.ipDrgEnabled) lines.push(`DRG: ${d.ipDrgScenario} scenario \u00B7 ${d.ipDrgRealization}% realization`);
    if (d.ipCdiEnabled) lines.push(`CDI: ${d.ipCdiScenario} scenario \u00B7 ${d.ipCdiQueryRate}% query rate`);
  } else if (cs === "nursing") {
    if (t.nursingOtEnabled) lines.push(`OT: ${t.nursingOtReductionPercent}% reduction \u00B7 $${t.nursingOtHourlyRate}/hr`);
    if (t.nursingRetentionEnabled) lines.push(`Retention: ${t.nursingTurnoverRate}% turnover \u00B7 $${t.nursingReplacementCost.toLocaleString()} replacement`);
  }

  if (t.wellbeingEnabled && t.calculateRetentionValue && cs !== "nursing") {
    lines.push(`Retention: ${t.annualTurnoverRate}% turnover \u00B7 ${t.retentionImpactScenario} impact`);
  }
  if (t.costReductionEnabled && t.estimatedCostReduction > 0) {
    lines.push(`Cost reduction: $${t.estimatedCostReduction.toLocaleString()}/yr`);
  }

  return lines;
}


function fmtAxis(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

interface ChartBar {
  label: string;
  docValue: number;
  timeValue: number;
  retentionValue: number;
  investment: number;
  total: number;
}

function PDFValueChart({ data, paybackQuarter }: { data: ChartBar[]; paybackQuarter: string | null }) {
  const svgW = 416;
  const svgH = 180;
  const barCount = data.length || 1;
  const groupW = svgW / barCount;
  const barW = Math.min(groupW * 0.6, 26);
  const barGap = (groupW - barW) / 2;

  const maxVal = Math.max(...data.map(d => d.total), ...data.map(d => d.investment), 1);
  const niceMax = (() => {
    const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const norm = maxVal / mag;
    if (norm <= 1) return mag;
    if (norm <= 2) return 2 * mag;
    if (norm <= 5) return 5 * mag;
    return 10 * mag;
  })();

  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const scaleY = (v: number) => svgH - (v / niceMax) * svgH;

  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 48, justifyContent: "space-between", paddingRight: 4, height: svgH }}>
          {[...ticks].reverse().map((tick, i) => (
            <Text key={`yt-${i}`} style={{ fontSize: 6.5, color: "#999999", textAlign: "right" }}>{fmtAxis(tick)}</Text>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
            {ticks.map((tick, i) => (
              <SvgLine key={`gl-${i}`} x1={0} y1={scaleY(tick)} x2={svgW} y2={scaleY(tick)} stroke="#E5E0DB" strokeWidth={0.5} strokeDasharray={i === 0 ? undefined : "3 2"} />
            ))}

            {data.map((bar, i) => {
              const x = i * groupW + barGap;
              const retH = (bar.retentionValue / niceMax) * svgH;
              const timeH = (bar.timeValue / niceMax) * svgH;
              const docH = (bar.docValue / niceMax) * svgH;
              const retY = scaleY(bar.retentionValue);
              const timeY = scaleY(bar.retentionValue + bar.timeValue);
              const docY = scaleY(bar.retentionValue + bar.timeValue + bar.docValue);
              const invH = (bar.investment / niceMax) * svgH;
              const invY = scaleY(bar.investment);
              const invBarW = Math.max(barW * 0.18, 3);

              return (
                <G key={`bar-${i}`}>
                  {retH > 0.5 && <Rect x={x} y={retY} width={barW} height={retH} fill={colors.retentionAmber} fillOpacity={0.75} rx={1} />}
                  {timeH > 0.5 && <Rect x={x} y={timeY} width={barW} height={timeH} fill={colors.timeRed} fillOpacity={0.75} />}
                  {docH > 0.5 && <Rect x={x} y={docY} width={barW} height={docH} fill={colors.docBlue} fillOpacity={0.8} rx={1} />}
                  {invH > 0.5 && <Rect x={x + barW + 2} y={invY} width={invBarW} height={invH} fill="#78716C" fillOpacity={0.12} rx={1} />}
                  {invH > 0.5 && <SvgLine x1={x + barW + 2} y1={invY} x2={x + barW + 2 + invBarW} y2={invY} stroke="#78716C" strokeWidth={0.8} />}
                </G>
              );
            })}

            {paybackQuarter && (() => {
              const idx = data.findIndex(d => d.label === paybackQuarter);
              if (idx < 0) return null;
              const x = idx * groupW + barGap + barW / 2;
              return <SvgLine x1={x} y1={0} x2={x} y2={svgH} stroke={colors.retentionAmber} strokeWidth={0.8} strokeDasharray="4 2" />;
            })()}

            <SvgLine x1={0} y1={svgH} x2={svgW} y2={svgH} stroke="#D5D0CB" strokeWidth={1} />
          </Svg>
        </View>
      </View>

      <View style={{ flexDirection: "row", paddingLeft: 48 }}>
        {data.map((bar, i) => (
          <View key={`xl-${i}`} style={{ width: svgW / barCount, alignItems: "center", paddingTop: 3 }}>
            <Text style={{ fontSize: 6, color: "#666666" }}>{bar.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 10, paddingLeft: 48 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: colors.docBlue, borderRadius: 1, opacity: 0.8 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Doc Quality</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: colors.timeRed, borderRadius: 1, opacity: 0.75 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Capacity & Efficiency</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: colors.retentionAmber, borderRadius: 1, opacity: 0.75 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Retention</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: "#78716C", borderRadius: 1, opacity: 0.15 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Investment</Text>
        </View>
        {paybackQuarter && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 0, borderTopWidth: 1, borderTopColor: colors.retentionAmber, borderStyle: "dashed" }} />
            <Text style={{ fontSize: 7, color: colors.retentionAmber }}>Payback</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PDFProportionBar({ docPct, timePct, retPct }: { docPct: number; timePct: number; retPct: number }) {
  const barW = 486;
  const h = 8;

  const docW = Math.max((docPct / 100) * barW, docPct > 0 ? 2 : 0);
  const retW = Math.max((retPct / 100) * barW, retPct > 0 ? 2 : 0);
  const timeW = barW - docW - retW;

  return (
    <View style={{ marginTop: 8, marginBottom: 6 }}>
      <Svg width={barW} height={h} viewBox={`0 0 ${barW} ${h}`}>
        {docW > 0 && <Rect x={0} y={0} width={docW} height={h} fill={colors.docBlue} fillOpacity={0.8} rx={docPct >= 98 ? 3 : 0} />}
        {docW > 0 && <Rect x={0} y={0} width={Math.min(docW, 6)} height={h} fill={colors.docBlue} fillOpacity={0.8} rx={3} />}
        {timeW > 0 && <Rect x={docW} y={0} width={timeW} height={h} fill={colors.timeRed} fillOpacity={0.75} />}
        {retW > 0 && <Rect x={docW + timeW} y={0} width={retW} height={h} fill={colors.retentionAmber} fillOpacity={0.75} rx={retPct > 0 ? 3 : 0} />}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: 3 }}>
        {docPct > 0 && (
          <View style={{ flex: docPct, alignItems: docPct > 12 ? "center" : "flex-start" }}>
            <Text style={{ fontSize: 6.5, color: colors.docBlue }}>{docPct}% Doc Quality</Text>
          </View>
        )}
        {timePct > 0 && (
          <View style={{ flex: timePct, alignItems: timePct > 12 ? "center" : "flex-start" }}>
            <Text style={{ fontSize: 6.5, color: colors.timeRed }}>{timePct}% Capacity & Efficiency</Text>
          </View>
        )}
        {retPct > 0 && (
          <View style={{ flex: retPct, alignItems: retPct > 12 ? "center" : "flex-end" }}>
            <Text style={{ fontSize: 6.5, color: colors.retentionAmber }}>{retPct}% Retention</Text>
          </View>
        )}
      </View>
    </View>
  );
}


function PDFSensitivityBars({ conservative, base, optimistic }: { conservative: number; base: number; optimistic: number }) {
  const w = 120;
  const maxVal = Math.max(conservative, base, optimistic, 0.01);
  const barH = 5;
  const gap = 4;
  const totalH = barH * 3 + gap * 2;
  const scale = (v: number) => Math.max((v / maxVal) * w * 0.9, 3);

  return (
    <View style={{ marginTop: 6 }}>
      <Svg width={w} height={totalH} viewBox={`0 0 ${w} ${totalH}`}>
        <Rect x={0} y={0} width={scale(conservative)} height={barH} fill="#999999" fillOpacity={0.45} rx={2} />
        <Rect x={0} y={barH + gap} width={scale(base)} height={barH} fill="#EA2C00" fillOpacity={0.65} rx={2} />
        <Rect x={0} y={(barH + gap) * 2} width={scale(optimistic)} height={barH} fill={colors.positive} fillOpacity={0.55} rx={2} />
      </Svg>
    </View>
  );
}

const TOTAL_PDF_PAGES = 7;

const PageFooter = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.footer}>
    <Text style={styles.footerLeft}>ABRIDGE</Text>
    <Text style={styles.footerCenter}>Confidential</Text>
    <Text style={styles.footerRight}>Page {pageNum} of {totalPages}</Text>
  </View>
);

interface ProformaPDFProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  summary: ProformaSummary;
  yearlyData: ReturnType<typeof getYearlySummary>;
  sensitivityIRR: { conservative: number; optimistic: number; consValid: boolean; optValid: boolean };
  organizationName?: string;
  preparedBy?: string;
}

function ProformaPDFDocument({ settings, config, summary, yearlyData, sensitivityIRR, chartData, paybackQuarter, organizationName, preparedBy }: ProformaPDFProps & { chartData: ChartBar[]; paybackQuarter: string | null; organizationName?: string; preparedBy?: string }) {
  const termLabel = contractTermLabel(config.contractTermMonths);
  const hasInvestment = settings.some(s => s.implementationFee > 0 || s.costPerUnit > 0 || (s.annualLicenseFee || 0) > 0 || (s.costPerEncounter || 0) > 0);
  const irrLabel = summary.irrMethod === "mirr" ? "MIRR" : "IRR";
  const irrDisplay = hasInvestment && summary.irrValid ? fmtPct(summary.irr) : "N/A";
  const settingInputSummaries = settings.map(s => ({ setting: s, inputs: getSettingInputSummary(s) }));

  const totalDocValue = yearlyData.reduce((s, y) => s + y.docValue, 0);
  const totalTimeValue = yearlyData.reduce((s, y) => s + y.timeValue, 0);
  const totalRetentionValue = yearlyData.reduce((s, y) => s + y.retentionValue, 0);
  const totalAllValue = totalDocValue + totalTimeValue + totalRetentionValue;
  const docPct = totalAllValue > 0 ? Math.round((totalDocValue / totalAllValue) * 100) : 0;
  const timePct = totalAllValue > 0 ? Math.round((totalTimeValue / totalAllValue) * 100) : 0;
  const retPct = totalAllValue > 0 ? Math.round((totalRetentionValue / totalAllValue) * 100) : 0;

  const totalFullScale = settings.reduce((s, v) => s + (v.fullScaleProviders || v.providerCount), 0);
  const totalHoursSaved = settings.reduce((s, v) => s + v.totalHoursSaved, 0);

  const settingNames = settings.map(s => SETTING_LABELS[s.careSetting] || s.label).join(", ");

  const yearNarratives = [
    { title: "Establish the Evidence", desc: `Initial deployment builds the evidence base during the ${config.implementationRampMonths}-month implementation ramp. Documentation quality value begins post-implementation while capacity gains follow after an additional 3-month operational ramp.` },
    { title: "Scale What Works", desc: "Expanded deployment deepens adoption across the organization. Retention value begins to materialize as clinician satisfaction compounds over time." },
    { title: "Full Organizational Impact", desc: "The complete value model is active. All driver categories are contributing at or near full scale." },
  ];

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Document>
      {/* PAGE 1: COVER */}
      <PDFCoverPage
        reportLabel="ORGANIZATION PROFORMA"
        title={organizationName || "Organization"}
        subtitle={`${termLabel} Financial Model  \u00B7  ${settings.length} Care Setting${settings.length > 1 ? "s" : ""}  \u00B7  Modeled on Aggregated Deployment Experience`}
        preparedBy={preparedBy}
        disclaimerText="This model reflects conservative estimates derived from user inputs and aggregated deployment experience. All assumptions are documented. Projections do not constitute a guarantee of financial performance."
      />

      {/* PAGE 2: EXECUTIVE SUMMARY */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>EXECUTIVE SUMMARY</Text>
          <Text style={styles.sectionHeadline}>The Investment Case at a Glance</Text>

          <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
            <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.positive }}>{hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Value-to-Cost</Text>
            </View>
            <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primaryText }}>{Math.round(summary.simpleROI * 100)}%</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Simple ROI</Text>
            </View>
            <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primaryText }}>{summary.paybackMonth ? `${summary.paybackMonth} mo` : "\u2014"}</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Payback</Text>
            </View>
            <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primary }}>{fmt(summary.termNet)}</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>{termLabel} Net Value</Text>
            </View>
          </View>

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
              Over a {termLabel.toLowerCase()} partnership, the estimated investment of ${Math.round(summary.termInvestment).toLocaleString()} across {fmtNum(totalFullScale)} {settings.length > 1 ? "providers" : unitLabel(settings[0]?.careSetting)} is projected to return {fmt(summary.termNet)} in net organizational value {"\u2014"} a {summary.valueToCost.toFixed(1)}x return on every dollar invested. A {config.implementationRampMonths}-month implementation ramp precedes value realization. Documentation quality improvements begin post-implementation, capacity and efficiency gains follow after an additional 3-month operational lag, and retention value phases in conservatively over the contract term. At full scale, the model projects {fmt(summary.runRateValue)} in annual value{summary.paybackMonth ? `, with payback estimated at month ${summary.paybackMonth}` : ""}.
            </Text>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabelGray}>KEY INPUTS</Text>
          <View style={[styles.cardBg, { padding: 12 }]}>
            {settings.map(s => {
              const settingColor = s.color || colors.primary;
              return (
                <View key={s.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, borderLeftWidth: 3, borderLeftColor: settingColor, paddingLeft: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{s.label}</Text>
                    <Text style={{ fontSize: 8, color: colors.secondary }}>
                      {s.yearlyProviders
                        ? `Y1: ${s.yearlyProviders.year1} \u2192 Y2: ${s.yearlyProviders.year2} \u2192 Y3: ${s.yearlyProviders.year3}`
                        : `${s.providerCount} \u2192 ${s.fullScaleProviders || s.providerCount}`} {unitLabel(s.careSetting)} {"\u00B7"} {s.utilizationPercent}% utilization
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: settingColor }}>{fmt(s.annualValue)}</Text>
                </View>
              );
            })}

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 6 }} />
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.docBlue }} />
                <Text style={{ fontSize: 7.5, color: colors.secondary }}>Immediate {"\u2014"} Doc quality</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.timeRed }} />
                <Text style={{ fontSize: 7.5, color: colors.secondary }}>Delayed (3mo) {"\u2014"} Capacity</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.retentionAmber }} />
                <Text style={{ fontSize: 7.5, color: colors.secondary }}>Phased {"\u2014"} Retention</Text>
              </View>
            </View>
          </View>

          <PageFooter pageNum={2} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 3: 3-YEAR PROJECTION */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>{termLabel.toUpperCase()} PROJECTION</Text>
          <Text style={styles.sectionHeadline}>How Value Builds Over Time</Text>
          <Text style={styles.body}>
            Value is phased by driver onset timing with per-year provider allocation and adoption ramp. Documentation quality (navy) appears immediately, capacity & efficiency (red) follows after a 3-month lag, and retention (gold) phases in over years.
          </Text>

          <View style={[styles.cardBg, { padding: 16, marginBottom: 10 }]}>
            <PDFValueChart data={chartData} paybackQuarter={paybackQuarter} />
          </View>

          <View style={[styles.cardBg, { marginBottom: 10, padding: 14 }]}>
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ flex: 2, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase" }}></Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>{y.label}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.primary, textTransform: "uppercase", textAlign: "right" }}>Total</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4 }} />

            {settings.map((s, si) => (
              <View key={s.id} style={{ flexDirection: "row", marginBottom: 2, backgroundColor: si % 2 === 0 ? "#FAFAF9" : "transparent", paddingVertical: 2 }}>
                <Text style={{ flex: 2, fontSize: 9, color: colors.primaryText }}>{s.label}</Text>
                {yearlyData.map(y => (
                  <Text key={y.label} style={{ flex: 1, fontSize: 9, color: colors.secondary, textAlign: "right" }}>{fmt(y.bySettings[s.id]?.value || 0)}</Text>
                ))}
                <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>
                  {fmt(yearlyData.reduce((sum, y) => sum + (y.bySettings[s.id]?.value || 0), 0))}
                </Text>
              </View>
            ))}

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 4 }} />
            <View style={{ flexDirection: "row", marginBottom: 2 }}>
              <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold" }}>Total Value</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>{fmt(y.totalValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>{fmt(summary.termValue)}</Text>
            </View>

            <View style={{ flexDirection: "row", marginBottom: 1, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 7.5, color: colors.docBlue }}>Doc Quality (immediate)</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(y.docValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(totalDocValue)}</Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 1, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 7.5, color: colors.timeRed }}>Capacity & Efficiency (3mo delay)</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(y.timeValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(totalTimeValue)}</Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 2, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 7.5, color: colors.retentionAmber }}>Retention (phased)</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(y.retentionValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(totalRetentionValue)}</Text>
            </View>

            <View style={{ flexDirection: "row", marginBottom: 1, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 7.5, color: colors.tertiary }}>Licensed Providers</Text>
              {yearlyData.map(y => {
                const total = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.licensedProviders || 0), 0);
                return <Text key={y.label} style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmtNum(total)}</Text>;
              })}
              <Text style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>
                {fmtNum(settings.reduce((sum, s) => sum + (yearlyData[yearlyData.length - 1]?.bySettings[s.id]?.licensedProviders || 0), 0))}
              </Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 2, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 7.5, color: colors.tertiary }}>Actively Documenting</Text>
              {yearlyData.map(y => {
                const total = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.providers || 0), 0);
                return <Text key={y.label} style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmtNum(total)}</Text>;
              })}
              <Text style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>
                {fmtNum(settings.reduce((sum, s) => sum + (yearlyData[yearlyData.length - 1]?.bySettings[s.id]?.providers || 0), 0))}
              </Text>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 3 }} />
            <View style={{ flexDirection: "row", marginBottom: 2 }}>
              <Text style={{ flex: 2, fontSize: 9, color: colors.negative }}>Investment</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 9, color: colors.negative, textAlign: "right" }}>({fmt(y.investment)})</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 9, color: colors.negative, fontWeight: "bold", textAlign: "right" }}>({fmt(summary.termInvestment)})</Text>
            </View>

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 3 }} />
            <View style={{ flexDirection: "row" }}>
              <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold" }}>Net Value</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: y.netValue >= 0 ? colors.positive : colors.negative, textAlign: "right" }}>
                  {y.netValue >= 0 ? fmt(y.netValue) : `(${fmt(Math.abs(y.netValue))})`}
                </Text>
              ))}
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: summary.termNet >= 0 ? colors.positive : colors.negative, textAlign: "right" }}>
                {summary.termNet >= 0 ? fmt(summary.termNet) : `(${fmt(Math.abs(summary.termNet))})`}
              </Text>
            </View>
          </View>

          {summary.paybackMonth && (
            <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 4 }}>
              Payback period reflects the month in which cumulative net value turns positive, accounting for the {config.implementationRampMonths}-month implementation ramp and subscription costs from day one. Actual time to value may vary based on training completion, workflow integration, and provider adoption speed.
            </Text>
          )}

          <PageFooter pageNum={3} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 4: YEAR-BY-YEAR NARRATIVE */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YEAR-BY-YEAR OUTLOOK</Text>
          <Text style={styles.sectionHeadline}>How the Deployment Unfolds</Text>
          <Text style={styles.body}>
            Each year of the partnership has a distinct character. Value compounds as provider adoption deepens, retention effects materialize, and the organization operationalizes freed-up capacity.
          </Text>

          {yearlyData.map((y, idx) => {
            const yearNum = idx + 1;
            const h = yearNarratives[Math.min(idx, 2)];
            const totalLicensed = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.licensedProviders || 0), 0);
            const totalActive = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.providers || 0), 0);
            const adoptionPct = totalLicensed > 0 ? Math.round((totalActive / totalLicensed) * 100) : 0;

            return (
              <View key={y.label} style={[styles.cardBg, { borderLeftWidth: 3, borderLeftColor: colors.primary, marginBottom: 8, padding: 12 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <View>
                    <Text style={{ fontSize: 8, color: colors.primary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold" }}>YEAR {yearNum} ({y.label})</Text>
                    <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText, marginTop: 2 }}>{h.title}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{fmt(y.totalValue)}</Text>
                    <Text style={{ fontSize: 7, color: colors.tertiary }}>projected value</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 6 }}>{h.desc}</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase" }}>Licensed</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold" }}>{fmtNum(totalLicensed)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase" }}>Active</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold" }}>{fmtNum(totalActive)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase" }}>Adoption</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold" }}>{adoptionPct}%</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase" }}>Investment</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold" }}>{fmt(y.investment)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase" }}>Net</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: y.netValue >= 0 ? colors.positive : colors.negative }}>
                      {y.netValue >= 0 ? fmt(y.netValue) : `(${fmt(Math.abs(y.netValue))})`}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {totalAllValue > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabelGray}>VALUE COMPOSITION</Text>
              <PDFProportionBar docPct={docPct} timePct={timePct} retPct={retPct} />
            </>
          )}

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
              STRATEGIC OBSERVATION
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              {settings.length === 1
                ? `This model focuses on ${settingNames}. A single-setting deployment provides a focused proof of value. Once baselines are established and outcomes measured, this model can be extended to additional care settings.`
                : `Across ${settings.length} care settings (${settingNames}), this model is ${docPct > timePct ? "documentation quality" : "capacity & efficiency"}-weighted: ${docPct}% doc quality, ${timePct}% capacity, ${retPct}% retention. The ${termLabel.toLowerCase()} horizon allows retention value to reach meaningful scale.`
              }
            </Text>
          </View>

          <PageFooter pageNum={4} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 5: SENSITIVITY & RISK */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>SENSITIVITY & RISK</Text>
          <Text style={styles.sectionHeadline}>What If Assumptions Are Wrong?</Text>
          <Text style={styles.body}>
            No model is perfect. This section brackets the range of likely outcomes and identifies what the organization foregoes by deferring implementation.
          </Text>

          <Text style={styles.sectionLabelGray}>SENSITIVITY ANALYSIS</Text>
          <View style={[styles.cardBg, { padding: 12, marginBottom: 10 }]}>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }}>
              Scenarios vary only value realization rate (70%{"\u2013"}130%). Subscription cost is held constant {"\u2014"} it{"\u2019"}s contractual.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 2 }}>70% REALIZATION</Text>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>
                  {sensitivityIRR.consValid ? fmtPct(sensitivityIRR.conservative) : "N/A"}
                </Text>
                <Text style={{ fontSize: 7, color: colors.tertiary, marginTop: 2 }}>Conservative</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 3, alignItems: "center", borderBottomWidth: 2, borderBottomColor: colors.primary }}>
                <Text style={{ fontSize: 8, color: colors.primary, marginBottom: 2 }}>YOUR ASSUMPTIONS</Text>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primary }}>{irrDisplay}</Text>
                <Text style={{ fontSize: 7, color: colors.primary, marginTop: 2 }}>Base Case</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 2 }}>130% REALIZATION</Text>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.positive }}>
                  {sensitivityIRR.optValid ? fmtPct(sensitivityIRR.optimistic) : "N/A"}
                </Text>
                <Text style={{ fontSize: 7, color: colors.positive, marginTop: 2 }}>Optimistic</Text>
              </View>
            </View>
            {sensitivityIRR.consValid && sensitivityIRR.optValid && (
              <View style={{ marginTop: 8, alignItems: "center" }}>
                <PDFSensitivityBars
                  conservative={sensitivityIRR.conservative}
                  base={summary.irrValid ? summary.irr : 0}
                  optimistic={sensitivityIRR.optimistic}
                />
              </View>
            )}
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabelGray}>COST OF INACTION</Text>
          <View style={[styles.cardBg, { padding: 12, marginBottom: 10 }]}>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(Math.round(totalHoursSaved / 12))}</Text>
                <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2, textAlign: "center" }}>hours/month on manual documentation</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>{fmt(Math.round(summary.runRateValue / 12))}</Text>
                <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2, textAlign: "center" }}>estimated monthly value deferred</Text>
              </View>
            </View>
            <Text style={{ fontSize: 8, color: colors.tertiary, lineHeight: 1.5 }}>
              Each month of delayed implementation defers this estimated value while documentation costs continue.
            </Text>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabelGray}>MODEL CONFIDENCE</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.positive, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>STRONGEST</Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
                {"\u2022"} Capacity & efficiency{"\n"}{"\u2022"} Documentation quality{"\n"}{"\u2022"} Adoption ramp{"\n"}{"\u2022"} Cost structure
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.negative, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>WEAKEST</Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
                {"\u2022"} Retention isolation{"\n"}{"\u2022"} Revenue realization{"\n"}{"\u2022"} Operational change{"\n"}{"\u2022"} Provider ramp smoothness
              </Text>
            </View>
          </View>

          <PageFooter pageNum={5} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 6: METHODOLOGY & ASSUMPTIONS */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>METHODOLOGY & ASSUMPTIONS</Text>
          <Text style={styles.sectionHeadline}>How We Built This Model</Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>YOUR INPUTS</Text>
              {settingInputSummaries.map(({ setting: s, inputs }) => (
                <View key={s.id} style={{ marginBottom: 5 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: s.color || colors.primaryText, marginBottom: 1 }}>{s.label}</Text>
                  <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
                    {s.yearlyProviders ? `Y1: ${s.yearlyProviders.year1} \u2192 Y2: ${s.yearlyProviders.year2} \u2192 Y3: ${s.yearlyProviders.year3}` : `${s.providerCount} \u2192 ${s.fullScaleProviders || s.providerCount}`} {unitLabel(s.careSetting)}{"\n"}
                    {(() => {
                      const yp = s.yearlyPricing;
                      const hasVaried = yp && (yp.year1 !== yp.year2 || yp.year2 !== yp.year3);
                      if (s.pricingModel === "annualFlat") {
                        return hasVaried ? `Y1: ${fmt(yp!.year1)} \u2192 Y2: ${fmt(yp!.year2)} \u2192 Y3: ${fmt(yp!.year3)}/yr` : `${fmt(yp?.year1 ?? s.annualLicenseFee ?? 0)}/yr flat`;
                      } else if (s.pricingModel === "perEncounter") {
                        return hasVaried ? `Y1: ${fmt(yp!.year1)} \u2192 Y2: ${fmt(yp!.year2)} \u2192 Y3: ${fmt(yp!.year3)}/enc` : `${fmt(yp?.year1 ?? s.costPerEncounter ?? 0)}/enc`;
                      } else {
                        return hasVaried ? `Y1: ${fmt(yp!.year1)} \u2192 Y2: ${fmt(yp!.year2)} \u2192 Y3: ${fmt(yp!.year3)}/${unitLabel(s.careSetting, false)}/mo` : `${fmt(yp?.year1 ?? s.costPerUnit)}/${unitLabel(s.careSetting, false)}/mo`;
                      }
                    })()}
                    {s.implementationFee > 0 ? ` \u00B7 ${fmt(s.implementationFee)} impl` : ""}
                  </Text>
                  {inputs.length > 0 && (
                    <Text style={{ fontSize: 7, color: colors.tertiary, lineHeight: 1.4, marginTop: 1 }}>{inputs.join(" \u00B7 ")}</Text>
                  )}
                </View>
              ))}
            </View>

            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>CALCULATION METHOD</Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6, marginBottom: 6 }}>
                Contract term: {termLabel} ({config.contractTermMonths} months){"\n"}
                Implementation ramp: {config.implementationRampMonths} months (no value){"\n"}
                Utilization targets: {config.yearlyUtilization.year1}% Y1, {config.yearlyUtilization.year2}% Y2, {config.yearlyUtilization.year3}% Y3{config.nursingYearlyUtilization && settings.some(s => s.careSetting === "nursing") ? ` (Nursing: ${config.nursingYearlyUtilization.year1}/${config.nursingYearlyUtilization.year2}/${config.nursingYearlyUtilization.year3}%)` : ""}{"\n"}
                Provider expansion: Per-year allocation{"\n"}
                Onset timing: Immediate / 3mo delay / phased{"\n"}
                Retention phasing: {config.retentionPhasing.year1Pct}% Y1, {config.retentionPhasing.year2Pct}% Y2, {config.retentionPhasing.year3Pct}% Y3
              </Text>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>RETURN METHODOLOGY</Text>
              <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
                Value-to-Cost: total value / total cost. IRR solved on monthly net cash flows (value minus subscription). Month 0 = implementation fee only. Annualized as (1 + monthly rate)^12 − 1.{summary.irrMethod === "mirr" ? " MIRR used due to non-conventional flows." : ""}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>DATA SOURCES</Text>
          <View style={[styles.cardBg, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
              {"\u2022"} Capacity & efficiency: Validated across 200+ Abridge health system deployments{"\n"}
              {"\u2022"} Industry benchmarks: MGMA, CMS, proprietary health system datasets{"\n"}
              {"\u2022"} Conservative design: Where uncertainty exists, conservative assumptions applied{"\n"}
              {"\u2022"} Retention: Delayed-onset (Month 8 nursing, Month 11 physician/APP)
            </Text>
          </View>

          <Text style={styles.sectionLabelGray}>LIMITATIONS</Text>
          <View style={[styles.cardBg, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
              This proforma is for financial planning purposes only. Projections are modeled estimates based on user-provided inputs and published benchmarks. Actual results will depend on implementation quality, organizational adoption, and operational factors unique to your environment. These projections do not constitute a guarantee of financial outcomes. We encourage validation of every assumption against organization-specific data.
            </Text>
          </View>

          <PageFooter pageNum={6} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 7: BACK COVER */}
      <Page size="LETTER" style={[styles.page, { padding: 0 }]} wrap={false}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 72 }}>
          <Text style={{ fontSize: 32, fontWeight: "bold", color: colors.primary, marginBottom: 24 }}>ABRIDGE</Text>

          <View style={{ borderTopWidth: 2, borderTopColor: colors.primary, width: 80, marginBottom: 24 }} />

          <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 6 }}>Prepared for</Text>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText, marginBottom: 24 }}>{organizationName || "Organization"}</Text>

          <Text style={{ fontSize: 10, color: colors.tertiary, marginBottom: 4 }}>{dateStr}</Text>
          {preparedBy && <Text style={{ fontSize: 10, color: colors.tertiary, marginBottom: 4 }}>Prepared by {preparedBy}</Text>}
          <Text style={{ fontSize: 10, color: colors.tertiary, marginBottom: 36 }}>{termLabel} Financial Proforma {"\u00B7"} {settings.length} Care Setting{settings.length > 1 ? "s" : ""}</Text>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, width: "100%", marginBottom: 16 }} />

          <Text style={{ fontSize: 8, color: colors.tertiary, textAlign: "center", lineHeight: 1.6, maxWidth: 380 }}>
            This document contains confidential information prepared exclusively for the intended recipient. Projections are modeled estimates and do not constitute a guarantee of financial outcomes. {"\u00A9"} {today.getFullYear()} Abridge AI, Inc. All rights reserved.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateProformaPDF(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  organizationName?: string,
  preparedBy?: string
): Promise<void> {
  const cashFlows = buildMonthlyCashFlows(settings, config);
  const summary = calculateProformaSummary(settings, config, cashFlows);
  const yearlyData = getYearlySummary(cashFlows, settings);
  const startDate = getContractStartDate();

  const quarterlyData = groupByQuarter(cashFlows, startDate);
  const chartData: ChartBar[] = quarterlyData.map(q => ({
    label: q.label,
    docValue: q.docValue,
    timeValue: q.timeValue,
    retentionValue: q.retentionValue,
    investment: q.investment,
    total: q.docValue + q.timeValue + q.retentionValue,
  }));

  let paybackQuarter: string | null = null;
  if (summary.paybackMonth) {
    const monthIdx = summary.paybackMonth - 1;
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + monthIdx, 1);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const yr = String(d.getFullYear()).slice(-2);
    paybackQuarter = `Q${q} '${yr}`;
  }

  const buildScaledIRR = (factor: number) => {
    const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
    const month0 = totalImplFees > 0 ? -totalImplFees : 0;
    const scaledFlows = [month0, ...cashFlows.map(r => {
      const gross = (r.docValue + r.timeValue + r.retentionValue) * factor;
      return (isFinite(gross) ? gross : 0) - r.investment;
    })];
    return calculateIRR(scaledFlows);
  };
  const consResult = buildScaledIRR(0.7);
  const optResult = buildScaledIRR(1.3);
  const sensitivityIRR = {
    conservative: consResult.isValid ? consResult.annualizedRate : 0,
    optimistic: optResult.isValid ? optResult.annualizedRate : 0,
    consValid: consResult.isValid,
    optValid: optResult.isValid,
  };

  const blob = await pdf(
    <ProformaPDFDocument
      settings={settings}
      config={config}
      summary={summary}
      yearlyData={yearlyData}
      sensitivityIRR={sensitivityIRR}
      chartData={chartData}
      paybackQuarter={paybackQuarter}
      organizationName={organizationName}
      preparedBy={preparedBy}
    />
  ).toBlob();

  const sanitizedOrg = (organizationName || "Organization").replace(/[^a-zA-Z0-9]/g, "_");
  await savePdfBlob(blob, `Abridge_${sanitizedOrg}_Proforma.pdf`, `${organizationName || "Organization"} Proforma`);
}
