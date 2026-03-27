import {
  Document, Page, Text, View, StyleSheet, pdf, Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import type { ExploreIntakeResponse } from "@/lib/intakeUrlState";
import type { ExploreCareSetting } from "@/pages/explore/ExploreFlow";
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
  settingHeader: { fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: C.text, marginBottom: 16, borderBottomWidth: 2, borderBottomColor: C.primary, paddingBottom: 8 },
  sectionLabel: { fontSize: 8.5, color: C.primary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  cell: { width: "50%", paddingVertical: 5, paddingRight: 12 },
  fieldLabel: { fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 },
  fieldValue: { fontSize: 11, fontWeight: 700, color: C.text, marginTop: 2 },
  footer: { marginTop: "auto", paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  footerText: { fontSize: 7.5, color: C.muted, lineHeight: 1.5, textAlign: "center" },
  pageNumber: { position: "absolute", bottom: 24, right: 54, fontSize: 8, color: C.muted },
});

const SETTING_LABELS: Record<ExploreCareSetting, string> = {
  outpatient: "Outpatient Clinic",
  ed: "Emergency Department",
  inpatient: "Inpatient / Hospital Medicine",
  nursing: "Nursing / Care Teams",
};

function fmt(v: number | null | undefined, opts?: { suffix?: string; decimals?: number; prefix?: string }): string | null {
  if (v == null) return null;
  const n = opts?.decimals != null ? v.toFixed(opts.decimals) : v.toLocaleString("en-US");
  let result = n;
  if (opts?.prefix) result = opts.prefix + result;
  if (opts?.suffix) result = result + opts.suffix;
  return result;
}

interface Field { label: string; value: string | null }

function getOutpatientFields(d: ExploreIntakeResponse): { section: string; fields: Field[] }[] {
  return [
    { section: "Deployment", fields: [
      { label: "Physicians / APPs", value: fmt(d.opProviders) },
      { label: "Annual encounters", value: fmt(d.opAnnualEncounters) },
    ]},
    { section: "Time & Revenue", fields: [
      { label: "Revenue per visit", value: fmt(d.opRevenuePerVisit, { prefix: "$" }) },
      { label: "Avg wRVU per encounter", value: fmt(d.opCurrentWrvu, { decimals: 2 }) },
      { label: "$/wRVU conversion rate", value: fmt(d.opConversionFactor, { prefix: "$" }) },
    ]},
    { section: "Workforce", fields: [
      { label: "Annual provider turnover", value: fmt(d.opTurnoverRate, { suffix: "%" }) },
      { label: "Cost to replace one provider", value: fmt(d.opReplacementCost, { prefix: "$" }) },
    ]},
    { section: "Documentation Quality", fields: [
      { label: "Claim denial rate", value: fmt(d.opDenialRate, { suffix: "%" }) },
      { label: "Avg denied claim value", value: fmt(d.opAvgClaimValue, { prefix: "$" }) },
    ]},
    { section: "HCC / RAF", fields: [
      { label: "Panel size", value: fmt(d.opPanelSize) },
      { label: "% panel on Medicare Advantage", value: fmt(d.opMaEnrollmentRate, { suffix: "%" }) },
      { label: "Annual payment per RAF point", value: fmt(d.opAnnualPaymentPerRaf, { prefix: "$" }) },
    ]},
  ];
}

function getEdFields(d: ExploreIntakeResponse): { section: string; fields: Field[] }[] {
  return [
    { section: "Deployment", fields: [
      { label: "ED physicians / APPs", value: fmt(d.edProviders) },
      { label: "Annual ED visits", value: fmt(d.edAnnualVisits) },
    ]},
    { section: "Throughput & Revenue", fields: [
      { label: "Current LWBS rate", value: fmt(d.edLwbsRate, { suffix: "%" }) },
      { label: "Revenue per ED visit", value: fmt(d.edRevenuePerVisit, { prefix: "$" }) },
      { label: "% LWBS patients admitted", value: fmt(d.edAdmissionRate, { suffix: "%" }) },
      { label: "Revenue per admission", value: fmt(d.edAdmissionRevenue, { prefix: "$" }) },
    ]},
    { section: "Workforce", fields: [
      { label: "Annual provider turnover", value: fmt(d.edTurnoverRate, { suffix: "%" }) },
      { label: "Cost to replace one provider", value: fmt(d.edReplacementCost, { prefix: "$" }) },
    ]},
  ];
}

function getInpatientFields(d: ExploreIntakeResponse): { section: string; fields: Field[] }[] {
  return [
    { section: "Deployment", fields: [
      { label: "Hospitalists", value: fmt(d.ipProviders) },
      { label: "Annual admissions", value: fmt(d.ipAnnualAdmissions) },
    ]},
    { section: "Documentation Quality", fields: [
      { label: "Obs/IP status denial rate", value: fmt(d.ipDenialRate, { suffix: "%" }) },
      { label: "Avg claim value at risk", value: fmt(d.ipAvgClaimValue, { prefix: "$" }) },
    ]},
    { section: "Workforce", fields: [
      { label: "Annual hospitalist turnover", value: fmt(d.ipTurnoverRate, { suffix: "%" }) },
      { label: "Cost to replace one hospitalist", value: fmt(d.ipReplacementCost, { prefix: "$" }) },
    ]},
  ];
}

function getNursingFields(d: ExploreIntakeResponse): { section: string; fields: Field[] }[] {
  return [
    { section: "Deployment", fields: [
      { label: "Nurse FTEs", value: fmt(d.nursingFTEs) },
      { label: "Staffed beds", value: fmt(d.nursingStaffedBeds) },
      { label: "Occupancy rate", value: fmt(d.nursingOccupancyRate, { suffix: "%" }) },
    ]},
    { section: "Overtime", fields: [
      { label: "OT hours / nurse / week", value: fmt(d.nursingOtHoursPerWeek) },
      { label: "OT hourly rate", value: fmt(d.nursingOtHourlyRate, { prefix: "$", suffix: "/hr" }) },
    ]},
    { section: "Workforce", fields: [
      { label: "Annual nurse turnover", value: fmt(d.nursingTurnoverRate, { suffix: "%" }) },
      { label: "Cost to replace one nurse", value: fmt(d.nursingReplacementCost, { prefix: "$" }) },
    ]},
    { section: "Quality Metrics", fields: [
      { label: "HAPI rate / 1k pt days", value: fmt(d.hapiRatePer1000, { decimals: 1 }) },
      { label: "Falls rate / 1k pt days", value: fmt(d.fallRatePer1000, { decimals: 1 }) },
      { label: "CAUTI rate / 1k", value: fmt(d.cautiRatePer1000, { decimals: 1 }) },
      { label: "CLABSI rate / 1k", value: fmt(d.clabsiRatePer1000, { decimals: 1 }) },
    ]},
  ];
}

function getFieldsForSetting(setting: ExploreCareSetting, d: ExploreIntakeResponse) {
  switch (setting) {
    case "outpatient": return getOutpatientFields(d);
    case "ed": return getEdFields(d);
    case "inpatient": return getInpatientFields(d);
    case "nursing": return getNursingFields(d);
  }
}

const today = () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

function FooterBlock() {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>
        This document contains organization-provided baseline data only.{"\n"}
        No ROI projections or Abridge benchmarks are included.{"\n"}
        Prepared by Abridge · {today()}
      </Text>
    </View>
  );
}

function SettingContent({ setting, data }: { setting: ExploreCareSetting; data: ExploreIntakeResponse }) {
  const groups = getFieldsForSetting(setting, data);
  return (
    <View>
      <Text style={s.settingHeader}>{SETTING_LABELS[setting]}</Text>
      {groups.map((g) => {
        const filled = g.fields.filter(f => f.value !== null);
        if (filled.length === 0) return null;
        return (
          <View key={g.section}>
            <Text style={s.sectionLabel}>{g.section}</Text>
            <View style={s.grid}>
              {filled.map((f) => (
                <View key={f.label} style={s.cell}>
                  <Text style={s.fieldLabel}>{f.label}</Text>
                  <Text style={s.fieldValue}>{f.value}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function CoverPage({ data }: { data: ExploreIntakeResponse }) {
  const settingsLabel = data.settings.map(st => SETTING_LABELS[st]).join(" · ");
  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.logoBanner}>
        <Text style={s.logoText}>ABRIDGE</Text>
      </View>
      <Text style={s.coverTitle}>PRE-CALL DATA INTAKE</Text>
      <Text style={s.coverSub}>Organization Baseline Summary</Text>
      <View style={s.metaRow}>
        <Text style={s.metaLabel}>Prepared for</Text>
        <Text style={s.metaValue}>Abridge Sales Team</Text>
      </View>
      <View style={s.metaRow}>
        <Text style={s.metaLabel}>Date</Text>
        <Text style={s.metaValue}>{today()}</Text>
      </View>
      <View style={s.metaRow}>
        <Text style={s.metaLabel}>Care Settings</Text>
        <Text style={s.metaValue}>{data.settings.length}</Text>
      </View>
      <View style={{ ...s.metaRow, marginBottom: 24 }}>
        <Text style={s.metaLabel}>Ref</Text>
        <Text style={s.metaValue}>Explore Intake — {settingsLabel}</Text>
      </View>
      <FooterBlock />
    </Page>
  );
}

function SettingPage({ setting, data, pageNum, totalPages }: { setting: ExploreCareSetting; data: ExploreIntakeResponse; pageNum: number; totalPages: number }) {
  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.logoBanner}>
        <Text style={s.logoText}>ABRIDGE</Text>
      </View>
      <SettingContent setting={setting} data={data} />
      <FooterBlock />
      <Text style={s.pageNumber}>{pageNum} / {totalPages}</Text>
    </Page>
  );
}

function SingleSettingDocument({ data }: { data: ExploreIntakeResponse }) {
  const settingsLabel = data.settings.map(st => SETTING_LABELS[st]).join(" · ");
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.logoBanner}>
          <Text style={s.logoText}>ABRIDGE</Text>
        </View>
        <Text style={s.coverTitle}>PRE-CALL DATA INTAKE</Text>
        <Text style={s.coverSub}>Organization Baseline Summary</Text>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Prepared for</Text>
          <Text style={s.metaValue}>Abridge Sales Team</Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Date</Text>
          <Text style={s.metaValue}>{today()}</Text>
        </View>
        <View style={{ ...s.metaRow, marginBottom: 24 }}>
          <Text style={s.metaLabel}>Ref</Text>
          <Text style={s.metaValue}>Explore Intake — {settingsLabel}</Text>
        </View>
        <SettingContent setting={data.settings[0]} data={data} />
        <FooterBlock />
      </Page>
    </Document>
  );
}

function MultiSettingDocument({ data }: { data: ExploreIntakeResponse }) {
  const totalPages = data.settings.length + 1;
  return (
    <Document>
      <CoverPage data={data} />
      {data.settings.map((setting, i) => (
        <SettingPage key={setting} setting={setting} data={data} pageNum={i + 2} totalPages={totalPages} />
      ))}
    </Document>
  );
}

export async function downloadIntakeReceiptPDF(data: ExploreIntakeResponse): Promise<void> {
  const isMulti = data.settings.length > 1;
  const doc = isMulti ? <MultiSettingDocument data={data} /> : <SingleSettingDocument data={data} />;
  const blob = await pdf(doc).toBlob();
  await savePdfBlob(blob, `Abridge_Intake_Receipt_${new Date().toISOString().slice(0, 10)}.pdf`, "Pre-Call Data Intake");
}
