import {
  Document, Page, Text, View, StyleSheet, Image, Font, pdf,
} from "@react-pdf/renderer";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";
import ManropeRegular from "../assets/fonts/manrope-regular.ttf";
import ManropeBold from "../assets/fonts/manrope-bold.ttf";

Font.register({
  family: "Manrope",
  fonts: [
    { src: ManropeRegular, fontWeight: 400 },
    { src: ManropeBold, fontWeight: 700 },
  ],
});

const SETTING_LABELS: Record<string, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  inpatient: "Inpatient / Hospital Medicine",
  nursing: "Nursing / Care Teams",
};

const s = StyleSheet.create({
  page: { fontFamily: "Manrope", backgroundColor: "#FFFFFF", paddingHorizontal: 48, paddingVertical: 48 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  logo: { width: 96, height: 24, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontSize: 18, fontWeight: 700, color: "#1A1A1A", marginBottom: 4 },
  headerMeta: { fontSize: 9, color: "#999999" },
  settingBadge: { backgroundColor: "#F5F0EB", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  settingBadgeText: { fontSize: 9, fontWeight: 700, color: "#EA2C00", textTransform: "uppercase", letterSpacing: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#E8E2DA", marginBottom: 24 },
  metricCard: { marginBottom: 16, borderWidth: 1, borderColor: "#E8E2DA", borderRadius: 8, overflow: "hidden" },
  metricHeader: { backgroundColor: "#FAFAF8", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0EDEA" },
  metricName: { fontSize: 11, fontWeight: 700, color: "#1A1A1A" },
  metricUnit: { fontSize: 9, color: "#999999", marginTop: 1 },
  metricBody: { paddingHorizontal: 16, paddingVertical: 12 },
  valuesRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  valueBox: { flex: 1 },
  valueLabel: { fontSize: 8, color: "#999999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  valueNumber: { fontSize: 20, fontWeight: 700, color: "#1A1A1A" },
  arrow: { fontSize: 16, color: "#CCCCCC" },
  deltaBox: { backgroundColor: "#F0FDF4", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  deltaText: { fontSize: 11, fontWeight: 700, color: "#16A34A" },
  deltaBoxNeg: { backgroundColor: "#F5F0EB", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  deltaTextNeg: { fontSize: 11, fontWeight: 700, color: "#999999" },
  notesBox: { backgroundColor: "#F5F0EB", borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4 },
  notesLabel: { fontSize: 8, color: "#999999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  notesText: { fontSize: 10, color: "#444444", lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 8, color: "#CCCCCC" },
  footerRed: { fontSize: 8, color: "#EA2C00", fontWeight: 700 },
  noDataText: { fontSize: 10, color: "#CCCCCC", fontStyle: "italic" },
});

export interface DataRequestPDFMetric {
  label: string;
  unitLabel: string;
  before: number | null;
  after: number | null;
  notes?: string;
  lowerIsBetter?: boolean;
}

export interface DataRequestPDFData {
  setting: string;
  metrics: DataRequestPDFMetric[];
  generatedAt: Date;
}

function formatVal(n: number | null): string {
  if (n === null) return "\u2014";
  return n.toLocaleString();
}

function DataRequestDocument({ data }: { data: DataRequestPDFData }) {
  const dateStr = data.generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const metricsWithData = data.metrics.filter(m => m.before !== null || m.after !== null);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Image src={abridgeLogo} style={s.logo} />
            <View style={s.settingBadge}>
              <Text style={s.settingBadgeText}>{SETTING_LABELS[data.setting] || data.setting}</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Measurement Summary</Text>
            <Text style={s.headerMeta}>{dateStr}</Text>
          </View>
        </View>
        <View style={s.divider} />

        {metricsWithData.length === 0 ? (
          <Text style={s.noDataText}>No metric data entered.</Text>
        ) : (
          metricsWithData.map((metric, i) => {
            const hasBefore = metric.before !== null;
            const hasAfter = metric.after !== null;
            const hasBoth = hasBefore && hasAfter;
            let delta: number | null = null;
            let deltaLabel = "";
            let isPositive = false;

            if (hasBoth && metric.before !== 0) {
              delta = ((metric.after! - metric.before!) / Math.abs(metric.before!)) * 100;
              const improved = metric.lowerIsBetter ? delta < 0 : delta > 0;
              isPositive = improved;
              deltaLabel = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
            }

            return (
              <View key={i} style={s.metricCard}>
                <View style={s.metricHeader}>
                  <Text style={s.metricName}>{metric.label}</Text>
                  <Text style={s.metricUnit}>{metric.unitLabel}</Text>
                </View>
                <View style={s.metricBody}>
                  <View style={s.valuesRow}>
                    <View style={s.valueBox}>
                      <Text style={s.valueLabel}>Before Abridge</Text>
                      <Text style={s.valueNumber}>{formatVal(metric.before)}</Text>
                    </View>
                    <Text style={s.arrow}>{"\u2192"}</Text>
                    <View style={s.valueBox}>
                      <Text style={s.valueLabel}>With Abridge</Text>
                      <Text style={[s.valueNumber, { color: "#EA2C00" }]}>{formatVal(metric.after)}</Text>
                    </View>
                    {hasBoth && delta !== null && (
                      <View style={isPositive ? s.deltaBox : s.deltaBoxNeg}>
                        <Text style={isPositive ? s.deltaText : s.deltaTextNeg}>{deltaLabel}</Text>
                      </View>
                    )}
                  </View>
                  {metric.notes && (
                    <View style={s.notesBox}>
                      <Text style={s.notesLabel}>Context</Text>
                      <Text style={s.notesText}>{metric.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={s.footer}>
          <Text style={s.footerText}>Prepared for your Abridge partner {"\u00B7"} Confidential</Text>
          <Text style={s.footerRed}>Abridge</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateDataRequestPDF(data: DataRequestPDFData): Promise<void> {
  const blob = await pdf(<DataRequestDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `abridge-measurement-summary-${data.setting}-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
