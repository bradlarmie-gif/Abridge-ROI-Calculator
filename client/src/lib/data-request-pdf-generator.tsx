import {
  Document, Page, Text, View, StyleSheet, Image, Font, pdf,
} from "@react-pdf/renderer";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
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
  settingBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  settingBadge: { backgroundColor: "#F5F0EB", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  settingBadgeText: { fontSize: 9, fontWeight: 700, color: "#EA2C00", textTransform: "uppercase", letterSpacing: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#E8E2DA", marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, marginTop: 8 },
  sectionLine: { flex: 1, height: 1, backgroundColor: "#E8E2DA" },
  sectionLabel: { fontSize: 9, fontWeight: 700, color: "#1A1A1A", textTransform: "uppercase", letterSpacing: 1.5, paddingHorizontal: 10 },
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
  profilePage: { fontFamily: "Manrope", backgroundColor: "#FFFFFF", paddingHorizontal: 48, paddingVertical: 48 },
  profileSection: { marginBottom: 28 },
  profileSectionTitle: { fontSize: 9, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 12 },
  profileRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  profileLabel: { fontSize: 10, color: "#888888" },
  profileValue: { fontSize: 10, fontWeight: 700, color: "#1A1A1A" },
  profileHighlight: { fontSize: 22, fontWeight: 700, color: "#EA2C00" },
  profileHighlightLabel: { fontSize: 9, color: "#999999", marginTop: 2 },
  profileStatBlock: { flex: 1, alignItems: "center" as const, paddingVertical: 12, paddingHorizontal: 8 },
  profileStatsRow: { flexDirection: "row" as const, backgroundColor: "#F9FAFB", borderRadius: 8, marginTop: 8 },
  assumptionsPage: { fontFamily: "Manrope", backgroundColor: "#FFFFFF", paddingHorizontal: 48, paddingVertical: 48 },
  assumptionGroup: { marginBottom: 20 },
  assumptionGroupTitle: { fontSize: 9, fontWeight: 700, color: "#EA2C00", letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 8 },
  assumptionRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  assumptionLabel: { fontSize: 10, color: "#888888", flex: 1, paddingRight: 12 },
  assumptionValue: { fontSize: 10, fontWeight: 700, color: "#1A1A1A" },
});

export interface DataRequestPDFMetric {
  label: string;
  unitLabel: string;
  before: number | null;
  after: number | null;
  notes?: string;
  lowerIsBetter?: boolean;
  setting?: string;
}

export interface DataRequestPDFData {
  setting: string;
  settings?: string[];
  metrics: DataRequestPDFMetric[];
  generatedAt: Date;
  organizationName?: string;
  monthsOnAbridge?: number;
  goLiveDate?: string | null;
  totalProviders?: number;
  liveProviders?: number;
  mruProviders?: number;
  totalEncounters?: number;
  abridgeEncounters?: number;
  annualContractValue?: number;
  preparedBy?: string;
  repName?: string;
  ipOperational?: Record<string, number | null>;
}

function formatVal(n: number | null): string {
  if (n === null) return "\u2014";
  return n.toLocaleString();
}

function MetricCardView({ metric, index }: { metric: DataRequestPDFMetric; index: number }) {
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
    <View key={index} style={s.metricCard}>
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
}


function PartnerProfilePage({ data }: { data: DataRequestPDFData }) {
  const hasProviders = data.totalProviders || data.liveProviders || data.mruProviders;
  const hasEncounters = data.totalEncounters || data.abridgeEncounters;
  const utilizationRate = data.totalProviders && data.liveProviders
    ? Math.round((data.liveProviders / data.totalProviders) * 100)
    : null;
  const encounterCoverage = data.totalEncounters && data.abridgeEncounters
    ? Math.round((data.abridgeEncounters / data.totalEncounters) * 100)
    : null;
  const allSettings = data.settings && data.settings.length > 0 ? data.settings : [data.setting];
  const settingLabel = allSettings.map(st => SETTING_LABELS[st] || st).join(", ");

  return (
    <Page size="LETTER" style={s.profilePage}>
      <View style={s.header}>
        <Image src={abridgeLogo} style={s.logo} />
        <View style={s.headerRight}>
          <Text style={s.headerTitle}>Partner Profile</Text>
          <Text style={s.headerMeta}>{settingLabel}</Text>
        </View>
      </View>
      <View style={s.divider} />

      <View style={s.profileSection}>
        <Text style={s.profileSectionTitle}>Deployment Overview</Text>
        {data.organizationName ? (
          <View style={s.profileRow}>
            <Text style={s.profileLabel}>Organization</Text>
            <Text style={s.profileValue}>{data.organizationName}</Text>
          </View>
        ) : null}
        {data.monthsOnAbridge ? (
          <View style={s.profileRow}>
            <Text style={s.profileLabel}>Months on Abridge</Text>
            <Text style={s.profileValue}>{data.monthsOnAbridge} months</Text>
          </View>
        ) : null}
        {data.goLiveDate ? (
          <View style={s.profileRow}>
            <Text style={s.profileLabel}>Go-Live Date</Text>
            <Text style={s.profileValue}>{data.goLiveDate}</Text>
          </View>
        ) : null}
        {data.annualContractValue ? (
          <View style={s.profileRow}>
            <Text style={s.profileLabel}>Annual Contract Value</Text>
            <Text style={s.profileValue}>${data.annualContractValue.toLocaleString()}</Text>
          </View>
        ) : null}
      </View>

      {hasProviders ? (
        <View style={s.profileSection}>
          <Text style={s.profileSectionTitle}>Provider Adoption</Text>
          <View style={s.profileStatsRow}>
            {data.totalProviders ? (
              <View style={s.profileStatBlock}>
                <Text style={s.profileHighlight}>{data.totalProviders.toLocaleString()}</Text>
                <Text style={s.profileHighlightLabel}>Total Providers</Text>
              </View>
            ) : null}
            {data.liveProviders ? (
              <View style={s.profileStatBlock}>
                <Text style={s.profileHighlight}>{data.liveProviders.toLocaleString()}</Text>
                <Text style={s.profileHighlightLabel}>Live on Abridge</Text>
              </View>
            ) : null}
            {data.mruProviders ? (
              <View style={s.profileStatBlock}>
                <Text style={s.profileHighlight}>{data.mruProviders.toLocaleString()}</Text>
                <Text style={s.profileHighlightLabel}>Monthly Active</Text>
              </View>
            ) : null}
            {utilizationRate !== null ? (
              <View style={s.profileStatBlock}>
                <Text style={[s.profileHighlight, { color: "#1A1A1A" }]}>{utilizationRate}%</Text>
                <Text style={s.profileHighlightLabel}>Utilization Rate</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {hasEncounters ? (
        <View style={s.profileSection}>
          <Text style={s.profileSectionTitle}>Encounter Coverage</Text>
          <View style={s.profileStatsRow}>
            {data.totalEncounters ? (
              <View style={s.profileStatBlock}>
                <Text style={s.profileHighlight}>{data.totalEncounters.toLocaleString()}</Text>
                <Text style={s.profileHighlightLabel}>Total Encounters</Text>
              </View>
            ) : null}
            {data.abridgeEncounters ? (
              <View style={s.profileStatBlock}>
                <Text style={s.profileHighlight}>{data.abridgeEncounters.toLocaleString()}</Text>
                <Text style={s.profileHighlightLabel}>Abridge Encounters</Text>
              </View>
            ) : null}
            {encounterCoverage !== null ? (
              <View style={s.profileStatBlock}>
                <Text style={[s.profileHighlight, { color: "#1A1A1A" }]}>{encounterCoverage}%</Text>
                <Text style={s.profileHighlightLabel}>Coverage Rate</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={s.footer}>
        <Text style={s.footerText}>{data.repName ? `Send to ${data.repName} at Abridge \u00B7 Confidential` : "Return to your Abridge partner \u00B7 Confidential"}</Text>
        <Text style={s.footerRed}>Abridge</Text>
      </View>
    </Page>
  );
}

function InpatientAssumptionsPage({ data }: { data: DataRequestPDFData }) {
  const op = data.ipOperational ?? {};
  const hasVal = (key: string) => op[key] != null;
  const fmt = (key: string, suffix = '') =>
    hasVal(key) ? `${(op[key] as number).toLocaleString()}${suffix}` : '\u2014';
  const fmtPct = (key: string) => fmt(key, '%');
  const fmtDollar = (key: string) =>
    hasVal(key) ? `$${(op[key] as number).toLocaleString()}` : '\u2014';

  const groups = [
    {
      title: 'Throughput',
      rows: [
        { label: 'Average Length of Stay', value: fmt('avgLos', ' days') },
      ],
    },
    {
      title: 'DRG Documentation',
      rows: [
        { label: 'Documentation gap rate', value: fmtPct('drgGapRate') },
        { label: 'Avg DRG weight improvement per corrected case', value: fmt('avgDrgWeightIncrease') },
        { label: 'Base DRG reimbursement per case', value: fmtDollar('baseDrgPayment') },
        { label: 'DRG value realization rate', value: fmtPct('drgRealizationRate') },
      ],
    },
    {
      title: 'Medical Necessity Appeals',
      rows: [
        { label: 'Inpatient denial rate', value: fmtPct('obsDenialRate') },
        { label: 'Average claim value at risk', value: fmtDollar('obsAvgClaimValue') },
        { label: "Documentation's share of successful appeals", value: fmtPct('obsDocContributionPct') },
      ],
    },
    {
      title: 'CDI Program',
      rows: [
        { label: 'CDI query rate (per 100 admissions)', value: fmt('cdiQueryRate') },
        { label: 'CDI cost per query', value: fmtDollar('cdiCostPerQuery') },
      ],
    },
    {
      title: 'Provider Retention',
      rows: [
        { label: 'Annual hospitalist turnover rate', value: fmtPct('hospitalistTurnoverRate') },
        { label: "Documentation burden's share of turnover", value: fmtPct('burnoutTurnoverPct') },
        { label: 'Hospitalist replacement cost', value: fmtDollar('hospitalistReplacementCost') },
      ],
    },
  ].filter(g => g.rows.some(r => r.value !== '\u2014'));

  if (groups.length === 0) return null;

  return (
    <Page size="LETTER" style={s.assumptionsPage}>
      <View style={s.header}>
        <Image src={abridgeLogo} style={s.logo} />
        <View style={s.headerRight}>
          <Text style={s.headerTitle}>Model Assumptions</Text>
          <Text style={s.headerMeta}>Inpatient / Hospital Medicine</Text>
        </View>
      </View>
      <View style={s.divider} />
      <Text style={{ fontSize: 10, color: "#666666", marginBottom: 20, lineHeight: 1.5 }}>
        These operational parameters calibrate the ROI model. Abridge will use them as the baseline for your financial analysis.
      </Text>
      {groups.map((g, gi) => (
        <View key={gi} style={s.assumptionGroup}>
          <Text style={s.assumptionGroupTitle}>{g.title}</Text>
          {g.rows.map((r, ri) => (
            <View key={ri} style={s.assumptionRow}>
              <Text style={s.assumptionLabel}>{r.label}</Text>
              <Text style={s.assumptionValue}>{r.value}</Text>
            </View>
          ))}
        </View>
      ))}
      <View style={s.footer}>
        <Text style={s.footerText}>
          {data.repName ? `Send to ${data.repName} at Abridge \u00B7 Confidential` : "Return to your Abridge partner \u00B7 Confidential"}
        </Text>
        <Text style={s.footerRed}>Abridge</Text>
      </View>
    </Page>
  );
}

function DataRequestDocument({ data }: { data: DataRequestPDFData }) {
  const dateStr = data.generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const metricsWithData = data.metrics.filter(m => m.before !== null || m.after !== null);
  const allSettings = data.settings && data.settings.length > 0 ? data.settings : [data.setting];
  const isMultiSetting = allSettings.length > 1;

  const groupedBySetting: Record<string, DataRequestPDFMetric[]> = {};
  if (isMultiSetting) {
    for (const setting of allSettings) {
      groupedBySetting[setting] = [];
    }
    for (const m of metricsWithData) {
      const key = m.setting || data.setting;
      if (!groupedBySetting[key]) groupedBySetting[key] = [];
      groupedBySetting[key].push(m);
    }
  }

  const allSettingsCover = data.settings && data.settings.length > 0 ? data.settings : [data.setting];

  return (
    <Document>
      <PDFCoverPage
        reportLabel="Measurement Data Request"
        title={data.organizationName || "Your Organization"}
        subtitle={allSettingsCover.map(st => SETTING_LABELS[st] || st).join(", ")}
        preparedBy={data.repName ? `${data.repName} \u00B7 Abridge` : "Abridge Partner Success"}
      />
      <PartnerProfilePage data={data} />
      {data.ipOperational && Object.values(data.ipOperational).some(v => v != null) && (
        <InpatientAssumptionsPage data={data} />
      )}
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Image src={abridgeLogo} style={s.logo} />
            <View style={s.settingBadgeRow}>
              {allSettings.map((setting) => (
                <View key={setting} style={s.settingBadge}>
                  <Text style={s.settingBadgeText}>{SETTING_LABELS[setting] || setting}</Text>
                </View>
              ))}
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
        ) : isMultiSetting ? (
          Object.entries(groupedBySetting).map(([setting, metrics]) => {
            if (metrics.length === 0) return null;
            return (
              <View key={setting}>
                <View style={s.sectionHeader}>
                  <View style={s.sectionLine} />
                  <Text style={s.sectionLabel}>{SETTING_LABELS[setting] || setting}</Text>
                  <View style={s.sectionLine} />
                </View>
                {metrics.map((metric, i) => (
                  <MetricCardView key={i} metric={metric} index={i} />
                ))}
              </View>
            );
          })
        ) : (
          metricsWithData.map((metric, i) => (
            <MetricCardView key={i} metric={metric} index={i} />
          ))
        )}

        <View style={s.footer}>
          <Text style={s.footerText}>{data.repName ? `Send to ${data.repName} at Abridge \u00B7 Confidential` : "Return to your Abridge partner \u00B7 Confidential"}</Text>
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
  const allSettings = data.settings && data.settings.length > 0 ? data.settings : [data.setting];
  const settingSlug = allSettings.join("-");
  a.download = `abridge-measurement-summary-${settingSlug}-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
