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
import { SETTING_LABELS, SETTING_UNIT_LABELS } from "./proformaTypes";
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
    gap: 20,
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
  return `${Math.round(n * 100)}%`;
}

interface ProformaPDFProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  summary: ProformaSummary;
  yearlyData: ReturnType<typeof getYearlySummary>;
}

function ProformaPDFDocument({ settings, config, summary, yearlyData }: ProformaPDFProps) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Document>
      {/* PAGE 1: Executive Summary */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.heroBox}>
          <Text style={styles.heroTitle}>Organization Proforma</Text>
          <Text style={styles.heroSubtitle}>Multi-Setting Financial Model — {settings.length} Care Settings</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Annual Value</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>{fmt(summary.totalSystemValue)}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Combined ROI</Text>
              <Text style={styles.metricValue}>{summary.combinedROI.toFixed(1)}x</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>IRR</Text>
              <Text style={[styles.metricValue, { color: colors.positive }]}>{fmtPct(summary.irr)}</Text>
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
            <Text style={styles.cell}>{s.providerCount.toLocaleString()} {SETTING_UNIT_LABELS[s.careSetting]}</Text>
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

      {/* PAGE 2: Setting Detail */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>Setting Detail</Text>
        <Text style={styles.sectionSubtitle}>Key value drivers per care setting</Text>

        {settings.map(s => (
          <View key={s.id} style={[styles.settingCard, { borderLeftWidth: 3, borderLeftColor: s.color }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{s.label}</Text>
              <Text style={{ fontSize: 8, color: colors.secondary, marginBottom: 6 }}>
                {s.providerCount.toLocaleString()} {SETTING_UNIT_LABELS[s.careSetting]} · {s.utilizationPercent}% utilization · {fmt(s.costPerUnit)}/{SETTING_UNIT_LABELS[s.careSetting] === "beds" ? "bed" : "provider"}/mo
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {s.drivers.map(d => (
                  <View key={d.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 7 }}>{d.name}: {fmt(d.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{fmt(s.annualValue)}</Text>
              <Text style={{ fontSize: 7, color: colors.secondary }}>{s.totalHoursSaved.toLocaleString()} hrs/yr</Text>
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text>Abridge ROI Studio — Organization Proforma</Text>
          <Text>Prepared {today} · Page 2 of 4</Text>
        </View>
      </Page>

      {/* PAGE 3: Financial Projections */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionTitle}>{config.contractTermMonths}-Month Financial Projection</Text>
        <Text style={styles.sectionSubtitle}>Year-by-year value with conservative retention phasing</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.cellLeft, { fontWeight: 700 }]}></Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={[styles.cellBold]}>{y.label}</Text>
          ))}
          <Text style={styles.cellBold}>{config.contractTermMonths}-Mo Total</Text>
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
          <Text style={[styles.cellLeft, { fontStyle: "italic", color: colors.secondary }]}>Retention (phased)</Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={[styles.cell, { fontStyle: "italic", color: colors.secondary }]}>{fmt(y.retentionValue)}</Text>
          ))}
          <Text style={[styles.cell, { fontStyle: "italic", color: colors.secondary }]}>
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
              • Contract term: {config.contractTermMonths} months
            </Text>
            <Text style={{ fontSize: 8, color: colors.secondary }}>
              • Retention phasing: {config.retentionPhasing.year1Pct}% Year 1, {config.retentionPhasing.year2Pct}% Year 2, {config.retentionPhasing.year3Pct}% Year 3
            </Text>
            <Text style={{ fontSize: 8, color: colors.secondary }}>
              • Adoption ramp: S-curve over 12 months from each setting's go-live date
            </Text>
            <Text style={{ fontSize: 8, color: colors.secondary }}>
              • IRR: {fmtPct(summary.irr)} annualized (Newton-Raphson on monthly net cash flows)
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
            <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 3 }}>Conservative Modeling Approach</Text>
            <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
              This proforma uses conservative assumptions throughout. Retention benefits are phased to reflect the time required for workforce impact to materialize. Adoption follows an S-curve ramp rather than assuming instant full utilization. All value projections are based on user-provided inputs and published industry benchmarks.
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 3 }}>Internal Rate of Return (IRR)</Text>
            <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
              IRR is calculated using Newton-Raphson iteration on monthly net cash flows (value minus investment). The monthly rate is annualized via compound formula: (1 + monthly rate)^12 - 1. This represents the annualized return on the investment, accounting for the time value of money.
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 3 }}>Retention Phasing</Text>
            <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
              Clinician and nurse retention benefits are phased conservatively: {config.retentionPhasing.year1Pct}% in Year 1, {config.retentionPhasing.year2Pct}% in Year 2, {config.retentionPhasing.year3Pct}% in Year 3. This reflects that retention impact requires sustained adoption and cultural change before materializing as reduced turnover.
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
            Projections are modeled estimates based on user-provided inputs and published benchmarks. Retention benefits are conservatively phased. Actual results may vary based on implementation approach, provider adoption, and organizational factors. This does not constitute a guarantee of financial outcomes.
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
