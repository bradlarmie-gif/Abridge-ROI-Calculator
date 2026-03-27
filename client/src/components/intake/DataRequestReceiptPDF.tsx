import {
  Document, Page, Text, View, StyleSheet, pdf, Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import type { MeasureDataRequestResponse, DataRequestMetricEntry } from "@/lib/dataRequestUrlState";
import type { MeasureCareSetting } from "@/lib/measureCalculator";
import { OUTPATIENT_METRICS, ED_METRICS, INPATIENT_METRICS, NURSING_METRICS, type MetricDefinition } from "@/lib/measureCareSettings";
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
  primary: "#EA2C00",
  text: "#1A1A1A",
  muted: "#888888",
  border: "#E0E0E0",
};

const s = StyleSheet.create({
  page: { padding: 54, paddingBottom: 50, fontFamily: "Manrope", fontSize: 10, color: C.text, backgroundColor: C.bg },
  logoBanner: { backgroundColor: C.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, marginBottom: 24, alignSelf: "flex-start" },
  logoText: { color: "#FFFFFF", fontSize: 14, fontWeight: 700, letterSpacing: 3 },
  coverTitle: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  coverSub: { fontSize: 12, color: C.muted, marginBottom: 20 },
  metaRow: { flexDirection: "row", gap: 24, marginBottom: 4 },
  metaLabel: { fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1, width: 110 },
  metaValue: { fontSize: 10, color: C.text },
  metricRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.border },
  metricName: { flex: 1, fontSize: 10, color: C.text },
  metricBefore: { width: 80, fontSize: 10, color: C.muted, textAlign: "right" },
  metricAfter: { width: 80, fontSize: 10, fontWeight: 700, color: C.text, textAlign: "right" },
  headerRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1.5, borderBottomColor: C.text, marginBottom: 2 },
  headerLabel: { fontSize: 8.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1 },
  monthlyRow: { flexDirection: "row", gap: 4, marginTop: 4, marginBottom: 6, paddingLeft: 12 },
  monthCell: { fontSize: 7.5, color: C.muted, width: 36, textAlign: "center" },
  footer: { marginTop: "auto", paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  footerText: { fontSize: 7.5, color: C.muted, lineHeight: 1.5, textAlign: "center" },
});

const SETTING_LABELS: Record<MeasureCareSetting, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  inpatient: "Inpatient / Hospital Medicine",
  nursing: "Nursing / Care Teams",
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getMetricsMap(setting: MeasureCareSetting): MetricDefinition[] {
  const map: Record<MeasureCareSetting, MetricDefinition[]> = {
    outpatient: OUTPATIENT_METRICS,
    ed: ED_METRICS,
    inpatient: INPATIENT_METRICS,
    nursing: NURSING_METRICS,
  };
  return map[setting] ?? OUTPATIENT_METRICS;
}

const today = () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

function MetricEntryRow({ entry, metricDefs }: { entry: DataRequestMetricEntry; metricDefs: MetricDefinition[] }) {
  const def = metricDefs.find(m => m.id === entry.metricId);
  const label = def?.label ?? entry.metricId;
  return (
    <View>
      <View style={s.metricRow}>
        <Text style={s.metricName}>{label}</Text>
        <Text style={s.metricBefore}>{entry.before != null ? String(entry.before) : "—"}</Text>
        <Text style={s.metricAfter}>{entry.after != null ? String(entry.after) : "—"}</Text>
      </View>
      {entry.isMonthlyMode && entry.monthlyData && (
        <View style={s.monthlyRow}>
          {MONTH_NAMES.map((m, i) => (
            <Text key={m} style={s.monthCell}>{m}: {entry.monthlyData?.[i] != null ? String(entry.monthlyData[i]) : "—"}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

function DataRequestReceiptDocument({ data }: { data: MeasureDataRequestResponse }) {
  const metricDefs = getMetricsMap(data.setting);
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.logoBanner}>
          <Text style={s.logoText}>ABRIDGE</Text>
        </View>
        <Text style={s.coverTitle}>PRE-EBR DATA REQUEST</Text>
        <Text style={s.coverSub}>{SETTING_LABELS[data.setting]} — Metric Summary</Text>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Prepared for</Text>
          <Text style={s.metaValue}>Abridge Partner Team</Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Date</Text>
          <Text style={s.metaValue}>{today()}</Text>
        </View>
        <View style={{ ...s.metaRow, marginBottom: 24 }}>
          <Text style={s.metaLabel}>Setting</Text>
          <Text style={s.metaValue}>{SETTING_LABELS[data.setting]}</Text>
        </View>

        <View style={s.headerRow}>
          <Text style={{ ...s.headerLabel, flex: 1 }}>Metric</Text>
          <Text style={{ ...s.headerLabel, width: 80, textAlign: "right" }}>Before</Text>
          <Text style={{ ...s.headerLabel, width: 80, textAlign: "right" }}>With Abridge</Text>
        </View>

        {data.metrics.map((entry) => (
          <MetricEntryRow key={entry.metricId} entry={entry} metricDefs={metricDefs} />
        ))}

        <View style={s.footer}>
          <Text style={s.footerText}>
            This document contains organization-provided performance data only.{"\n"}
            No ROI projections or Abridge benchmarks are included.{"\n"}
            Prepared by Abridge · {today()}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadDataRequestReceiptPDF(data: MeasureDataRequestResponse): Promise<void> {
  const blob = await pdf(<DataRequestReceiptDocument data={data} />).toBlob();
  await savePdfBlob(blob, `Abridge_DataRequest_Receipt_${new Date().toISOString().slice(0, 10)}.pdf`, "Pre-EBR Data Request");
}
