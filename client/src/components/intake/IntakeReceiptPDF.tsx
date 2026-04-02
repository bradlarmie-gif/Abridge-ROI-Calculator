import {
  Document, Page, Text, View, StyleSheet, Image, pdf, Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import type { ExploreIntakeResponse } from "@/lib/intakeUrlState";
import type { ExploreCareSetting } from "@/pages/explore/ExploreFlow";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
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
  contentLogo: { width: 72, height: 18, objectFit: "contain" as const, marginBottom: 20 },
  settingHeader: { fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: C.text, marginBottom: 16, borderBottomWidth: 2, borderBottomColor: C.primary, paddingBottom: 8 },
  sectionLabel: { fontSize: 8.5, color: C.primary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginTop: 12, marginBottom: 5, paddingBottom: 3, borderBottomWidth: 0.5, borderBottomColor: C.border },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  cell: { width: "50%", paddingVertical: 4, paddingRight: 12 },
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
    { section: "Obs/IP Status Defense", fields: [
      { label: "Obs/IP status denial rate", value: fmt(d.ipDenialRate, { suffix: "%" }) },
      { label: "Avg claim value at risk", value: fmt(d.ipAvgClaimValue, { prefix: "$" }) },
    ]},
    { section: "DRG Accuracy / CC-MCC Capture", fields: [
      { label: "DRG at-risk rate", value: fmt(d.ipDrgAtRiskRate, { suffix: "%" }) },
      { label: "DRG weight increase", value: d.ipDrgWeightIncrease != null ? d.ipDrgWeightIncrease.toFixed(2) : null },
      { label: "Base DRG payment", value: fmt(d.ipDrgBasePayment, { prefix: "$" }) },
    ]},
    { section: "CDI Query Reduction", fields: [
      { label: "CDI query rate", value: fmt(d.ipCdiQueryRate, { suffix: "%" }) },
      { label: "Cost per CDI query", value: fmt(d.ipCdiCostPerQuery, { prefix: "$" }) },
    ]},
    { section: "Concurrent Review", fields: [
      { label: "Concurrent review rate", value: fmt(d.ipConcurrentReviewRate, { suffix: "%" }) },
      { label: "Concurrent denial rate", value: fmt(d.ipConcurrentDenialRate, { suffix: "%" }) },
      { label: "Avg continued-stay days", value: d.ipConcurrentAvgDays != null ? d.ipConcurrentAvgDays.toFixed(1) : null },
      { label: "Daily rate", value: fmt(d.ipConcurrentDailyRate, { prefix: "$" }) },
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

function FooterBlock() {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>
        This document contains organization-provided baseline data only. No ROI projections are included.
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
          <View key={g.section} wrap={false}>
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

function CoverPage({ data, repName, orgName }: { data: ExploreIntakeResponse; repName?: string; orgName?: string }) {
  const settingsLabel = data.settings.map(st => SETTING_LABELS[st]).join(" \u00B7 ");
  const displayOrg = orgName || "Your Organization";
  const displayRep = repName ? `${repName} \u00B7 Abridge` : "Abridge Partner Success";
  return (
    <PDFCoverPage
      reportLabel="Baseline Data Summary"
      title={displayOrg}
      subtitle={settingsLabel}
      preparedBy={displayRep}
      disclaimerText="This document contains organization-provided baseline data only. No ROI projections are included. Please send this PDF to your Abridge contact."
    />
  );
}

function SettingPage({ setting, data, pageNum, totalPages }: { setting: ExploreCareSetting; data: ExploreIntakeResponse; pageNum: number; totalPages: number }) {
  return (
    <Page size="LETTER" style={s.page}>
      <Image src={abridgeLogoRed} style={s.contentLogo} />
      <SettingContent setting={setting} data={data} />
      <FooterBlock />
      <Text style={s.pageNumber}>{pageNum} / {totalPages}</Text>
    </Page>
  );
}

function SingleSettingDocument({ data, repName, orgName }: { data: ExploreIntakeResponse; repName?: string; orgName?: string }) {
  return (
    <Document>
      <CoverPage data={data} repName={repName} orgName={orgName} />
      <Page size="LETTER" style={s.page}>
        <Image src={abridgeLogoRed} style={s.contentLogo} />
        <SettingContent setting={data.settings[0]} data={data} />
        <FooterBlock />
      </Page>
    </Document>
  );
}

function MultiSettingDocument({ data, repName, orgName }: { data: ExploreIntakeResponse; repName?: string; orgName?: string }) {
  const totalPages = data.settings.length + 1;
  return (
    <Document>
      <CoverPage data={data} repName={repName} orgName={orgName} />
      {data.settings.map((setting, i) => (
        <SettingPage key={setting} setting={setting} data={data} pageNum={i + 2} totalPages={totalPages} />
      ))}
    </Document>
  );
}

export async function downloadIntakeReceiptPDF(data: ExploreIntakeResponse, repName?: string, orgName?: string): Promise<void> {
  const isMulti = data.settings.length > 1;
  const doc = isMulti
    ? <MultiSettingDocument data={data} repName={repName} orgName={orgName} />
    : <SingleSettingDocument data={data} repName={repName} orgName={orgName} />;
  const blob = await pdf(doc).toBlob();
  await savePdfBlob(blob, `Abridge_Intake_Receipt_${new Date().toISOString().slice(0, 10)}.pdf`, "Pre-Call Data Intake");
}
