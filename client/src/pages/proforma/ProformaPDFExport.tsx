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
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import type { ProformaSettingSnapshot, ProformaConfig } from "./proformaTypes";
import type { ProformaSummary } from "./proformaTypes";
import { SETTING_LABELS, SETTING_UNIT_LABELS, ONSET_LABELS } from "./proformaTypes";
import { buildMonthlyCashFlows, calculateProformaSummary, getYearlySummary } from "@/lib/proformaCalculations";

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
  docBlue: "#2563EB",
  timeRed: "#EA2C00",
  retentionGreen: "#059669",
};

const styles = StyleSheet.create({
  page: {
    padding: 54,
    paddingBottom: 50,
    fontFamily: "Manrope",
    fontSize: 10,
    color: colors.primaryText,
    backgroundColor: colors.background,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: colors.tertiary,
  },
  heroBox: {
    backgroundColor: colors.primaryText,
    borderRadius: 8,
    padding: 24,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 10,
    color: "#AAAAAA",
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 16,
  },
  metricBox: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 7,
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primaryText,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: colors.secondary,
    marginBottom: 12,
  },
  settingCard: {
    backgroundColor: colors.cards,
    borderRadius: 6,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  tableRowBold: {
    flexDirection: "row",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#FAFAF8",
  },
  cellLeft: {
    flex: 2,
    fontSize: 9,
  },
  cell: {
    flex: 1,
    fontSize: 9,
    textAlign: "right",
  },
  cellBold: {
    flex: 1,
    fontSize: 9,
    textAlign: "right",
    fontWeight: 700,
  },
});

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtPct(n: number) {
  const val = Math.round(n * 100);
  if (val > 999) return ">999%";
  return `${val}%`;
}

function contractTermLabel(months: number): string {
  return `${months / 12}-Year`;
}

interface ProformaPDFProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  summary: ProformaSummary;
  yearlyData: ReturnType<typeof getYearlySummary>;
}

function ProformaPDFDocument({ settings, config, summary, yearlyData }: ProformaPDFProps) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const termLabel = contractTermLabel(config.contractTermMonths);
  const hasInvestment = settings.some(s => s.costPerUnit * s.providerCount > 0 || s.implementationFee > 0);

  return (
    <Document>
      {/* PAGE 1: Executive Summary */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.heroBox}>
          <Text style={styles.heroTitle}>Organization Proforma</Text>
          <Text style={styles.heroSubtitle}>Multi-Setting Financial Model — {settings.length} Care Settings · {termLabel} Contract</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Annual Value</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>{fmt(summary.totalSystemValue)}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Simple ROI</Text>
              <Text style={styles.metricValue}>{Math.round(summary.simpleROI * 100)}%</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>IRR</Text>
              <Text style={[styles.metricValue, { color: colors.positive }]}>{hasInvestment ? fmtPct(summary.irr) : "N/A"}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Payback</Text>
              <Text style={styles.metricValue}>{summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Hours Returned</Text>
              <Text style={styles.metricValue}>{summary.totalHours.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Care Settings</Text>
        <Text style={styles.sectionSubtitle}>Overview of included settings and their projected value</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.cellLeft, { fontWeight: 700 }]}>Setting</Text>
          <Text style={[styles.cell, { fontWeight: 700 }]}>Units</Text>
          <Text style={[styles.cell, { fontWeight: 700 }]}>Annual Value</Text>
          <Text style={[styles.cell, { fontWeight: 700 }]}>Hours Saved</Text>
          <Text style={[styles.cell, { fontWeight: 700 }]}>Go-Live</Text>
          <Text style={[styles.cell, { fontWeight: 700 }]}>Monthly Cost</Text>
        </View>
        {settings.map(s => (
          <View key={s.id} style={styles.tableRow}>
            <Text style={styles.cellLeft}>{s.label}</Text>
            <Text style={styles.cell}>{s.providerCount.toLocaleString()} → {s.fullScaleProviders.toLocaleString()} {SETTING_UNIT_LABELS[s.careSetting]}</Text>
            <Text style={styles.cell}>{fmt(s.annualValue)}</Text>
            <Text style={styles.cell}>{s.totalHoursSaved.toLocaleString()}</Text>
            <Text style={styles.cell}>Month {s.goLiveMonth}</Text>
            <Text style={styles.cell}>{fmt(s.costPerUnit * s.providerCount)}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text>Abridge ROI Studio — Organization Proforma</Text>
          <Text>Prepared {today} · Page 1 of 4</Text>
        </View>
      </Page>

      {/* PAGE 2: Setting Detail with Onset Timing */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>Setting Detail & Driver Onset Timing</Text>
        <Text style={styles.sectionSubtitle}>Value drivers by care setting with onset classification</Text>

        {settings.map(s => (
          <View key={s.id} style={[styles.settingCard, { borderLeftWidth: 3, borderLeftColor: s.color }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{s.label}</Text>
              <Text style={{ fontSize: 8, color: colors.secondary, marginBottom: 6 }}>
                {s.providerCount.toLocaleString()} → {s.fullScaleProviders.toLocaleString()} {SETTING_UNIT_LABELS[s.careSetting]} · {s.utilizationPercent}% utilization · {fmt(s.costPerUnit)}/{SETTING_UNIT_LABELS[s.careSetting] === "beds" ? "bed" : "provider"}/mo
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {s.drivers.map(d => {
                  const onsetColor = d.onset === "immediate" ? colors.docBlue :
                    d.onset === "delayed" ? colors.timeRed : colors.retentionGreen;
                  return (
                    <View key={d.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderLeftWidth: 2, borderLeftColor: onsetColor }}>
                      <Text style={{ fontSize: 7 }}>{d.name}: {fmt(d.value)}</Text>
                      <Text style={{ fontSize: 5, color: colors.tertiary }}>{ONSET_LABELS[d.onset]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{fmt(s.annualValue)}</Text>
              <Text style={{ fontSize: 7, color: colors.secondary }}>{s.totalHoursSaved.toLocaleString()} hrs/yr</Text>
            </View>
          </View>
        ))}

        <View style={{ marginTop: 12, backgroundColor: colors.cards, borderRadius: 6, padding: 12 }}>
          <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 4 }}>Onset Timing Legend</Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.docBlue }} />
              <Text style={{ fontSize: 7, color: colors.secondary }}>Immediate — Doc quality from day one</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.timeRed }} />
              <Text style={{ fontSize: 7, color: colors.secondary }}>Delayed (3mo) — Time savings need operational change</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.retentionGreen }} />
              <Text style={{ fontSize: 7, color: colors.secondary }}>Phased — Retention over Y1/Y2/Y3</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Abridge ROI Studio — Organization Proforma</Text>
          <Text>Prepared {today} · Page 2 of 4</Text>
        </View>
      </Page>

      {/* PAGE 3: Financial Projections */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>{termLabel} Financial Projection</Text>
        <Text style={styles.sectionSubtitle}>Value phased by driver onset timing with conservative retention modeling</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.cellLeft, { fontWeight: 700 }]}></Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={[styles.cellBold]}>{y.label}</Text>
          ))}
          <Text style={styles.cellBold}>{termLabel} Total</Text>
        </View>

        {settings.map(s => (
          <View key={s.id} style={styles.tableRow}>
            <Text style={styles.cellLeft}>{s.label}</Text>
            {yearlyData.map(y => (
              <Text key={y.label} style={styles.cell}>{fmt(y.bySettings[s.id]?.value || 0)}</Text>
            ))}
            <Text style={styles.cellBold}>{fmt(yearlyData.reduce((sum, y) => sum + (y.bySettings[s.id]?.value || 0), 0))}</Text>
          </View>
        ))}

        <View style={styles.tableRowBold}>
          <Text style={[styles.cellLeft, { fontWeight: 700 }]}>Total Value</Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={styles.cellBold}>{fmt(y.totalValue)}</Text>
          ))}
          <Text style={[styles.cellBold, { color: colors.primary }]}>{fmt(summary.threeYearValue)}</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.cellLeft, { color: colors.docBlue, paddingLeft: 8, fontSize: 8 }]}>Doc Quality (immediate)</Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={[styles.cell, { color: colors.tertiary, fontSize: 8 }]}>{fmt(y.docValue)}</Text>
          ))}
          <Text style={[styles.cell, { color: colors.tertiary, fontSize: 8 }]}>
            {fmt(yearlyData.reduce((s, y) => s + y.docValue, 0))}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.cellLeft, { color: colors.timeRed, paddingLeft: 8, fontSize: 8 }]}>Time Savings (3mo delay)</Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={[styles.cell, { color: colors.tertiary, fontSize: 8 }]}>{fmt(y.timeValue)}</Text>
          ))}
          <Text style={[styles.cell, { color: colors.tertiary, fontSize: 8 }]}>
            {fmt(yearlyData.reduce((s, y) => s + y.timeValue, 0))}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.cellLeft, { color: colors.retentionGreen, paddingLeft: 8, fontSize: 8 }]}>Retention (phased)</Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={[styles.cell, { color: colors.tertiary, fontSize: 8 }]}>{fmt(y.retentionValue)}</Text>
          ))}
          <Text style={[styles.cell, { color: colors.tertiary, fontSize: 8 }]}>
            {fmt(yearlyData.reduce((s, y) => s + y.retentionValue, 0))}
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.cellLeft, { color: colors.negative }]}>Investment</Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={[styles.cell, { color: colors.negative }]}>({fmt(y.investment)})</Text>
          ))}
          <Text style={[styles.cell, { color: colors.negative, fontWeight: 700 }]}>({fmt(summary.threeYearInvestment)})</Text>
        </View>

        <View style={styles.tableRowBold}>
          <Text style={[styles.cellLeft, { fontWeight: 700 }]}>Net Value</Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={[styles.cellBold, { color: y.netValue >= 0 ? colors.positive : colors.negative }]}>
              {y.netValue >= 0 ? fmt(y.netValue) : `(${fmt(Math.abs(y.netValue))})`}
            </Text>
          ))}
          <Text style={[styles.cellBold, { color: summary.threeYearNet >= 0 ? colors.positive : colors.negative }]}>
            {summary.threeYearNet >= 0 ? fmt(summary.threeYearNet) : `(${fmt(Math.abs(summary.threeYearNet))})`}
          </Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { fontSize: 11 }]}>Assumptions</Text>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 8, color: colors.secondary }}>
              • Contract term: {termLabel} ({config.contractTermMonths} months)
            </Text>
            <Text style={{ fontSize: 8, color: colors.secondary }}>
              • Driver onset: Doc quality = immediate (1mo learning curve), Time savings = 3mo operational lag, Retention = phased per Y1/Y2/Y3
            </Text>
            <Text style={{ fontSize: 8, color: colors.secondary }}>
              • Retention phasing: {config.retentionPhasing.year1Pct}% Year 1, {config.retentionPhasing.year2Pct}% Year 2, {config.retentionPhasing.year3Pct}% Year 3
            </Text>
            <Text style={{ fontSize: 8, color: colors.secondary }}>
              • Adoption ramp: S-curve over 12 months; providers expand from pilot to full scale over contract term
            </Text>
            <Text style={{ fontSize: 8, color: colors.secondary }}>
              • IRR: {hasInvestment ? fmtPct(summary.irr) : "N/A"} annualized (Newton-Raphson with validation) · Simple ROI: {Math.round(summary.simpleROI * 100)}%
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Abridge ROI Studio — Organization Proforma</Text>
          <Text>Prepared {today} · Page 3 of 4</Text>
        </View>
      </Page>

      {/* PAGE 4: Methodology & Next Steps */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>Methodology & Next Steps</Text>

        <View style={{ gap: 10, marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 3 }}>Driver Onset Timing</Text>
            <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
              Different value drivers materialize at different speeds. Documentation quality improvements (wRVU uplift, HCC recapture, denial prevention, DRG accuracy) kick in immediately — the AI produces better notes from day one with a brief learning curve. Time savings drivers (patient access, throughput, cost reduction, OT reduction) take approximately 3 months as organizations operationalize freed-up capacity. Retention and wellbeing benefits are phased conservatively over years, reflecting that workforce impact requires sustained adoption.
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 3 }}>Internal Rate of Return (IRR)</Text>
            <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
              IRR is calculated using Newton-Raphson iteration with multiple initial guesses and bisection fallback for convergence. The period-0 outflow is the total investment commitment (implementation fees + full contract subscription cost). Monthly returns are the gross value generated. The monthly rate is annualized via compound formula: (1 + monthly rate)^12 - 1. Results are validated against NPV to ensure mathematical accuracy.
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 3 }}>Simple ROI</Text>
            <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
              Simple ROI is total contract net value divided by total contract cost (implementation fees + subscription). A {Math.round(summary.simpleROI * 100)}% Simple ROI means the organization receives ${(1 + summary.simpleROI).toFixed(2)} for every $1 invested over the {termLabel.toLowerCase()} contract term.
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 3 }}>Provider Expansion</Text>
            <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
              Providers scale linearly from pilot count to full-scale count over the contract term. Investment costs scale proportionally with provider count, modeling realistic organizational rollout.
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 3 }}>Recommended Next Steps</Text>
            <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
              1. Validate assumptions with your finance and operations teams.{"\n"}
              2. Identify pilot departments for initial deployment.{"\n"}
              3. Establish baseline metrics for time, documentation quality, and workforce satisfaction.{"\n"}
              4. Schedule a conversation with your Abridge team to refine the model with organization-specific data.
            </Text>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: "auto" }}>
          <Text style={{ fontSize: 8, color: colors.tertiary, lineHeight: 1.5 }}>
            Projections are modeled estimates based on user-provided inputs and published benchmarks. Driver onset timing reflects typical healthcare implementation timelines. Retention benefits are conservatively phased. This does not constitute a guarantee of financial outcomes.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Abridge ROI Studio — Organization Proforma</Text>
          <Text>Prepared {today} · Page 4 of 4</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateProformaPDF(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig
): Promise<void> {
  const cashFlows = buildMonthlyCashFlows(settings, config);
  const summary = calculateProformaSummary(settings, config, cashFlows);
  const yearlyData = getYearlySummary(cashFlows, settings);

  const blob = await pdf(
    <ProformaPDFDocument
      settings={settings}
      config={config}
      summary={summary}
      yearlyData={yearlyData}
    />
  ).toBlob();

  await savePdfBlob(blob, "Abridge_Organization_Proforma.pdf", "Organization Proforma");
}
