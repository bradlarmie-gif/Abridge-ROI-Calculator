import { useState } from "react";
import { CheckCircle, Download, ArrowRight } from "lucide-react";
import type { ExploreIntakeResponse } from "@/lib/intakeUrlState";
import { downloadIntakeReceiptPDF } from "@/components/intake/IntakeReceiptPDF";
import type { ExploreCareSetting } from "@/pages/explore/ExploreFlow";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

interface ExploreIntakeReceiptProps {
  data: ExploreIntakeResponse;
  onLoadInCalculator?: (data: ExploreIntakeResponse) => void;
}

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

interface FieldDef { label: string; value: string | null }

function getOutpatientFields(d: ExploreIntakeResponse): { section: string; fields: FieldDef[] }[] {
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
      { label: "Annual scribe / documentation support spend", value: fmt(d.opScribeAnnualSpend, { prefix: "$" }) },
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

function getEdFields(d: ExploreIntakeResponse): { section: string; fields: FieldDef[] }[] {
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
    { section: "Documentation Quality", fields: [
      { label: "Claim denial rate", value: fmt(d.edDenialRate, { suffix: "%" }) },
      { label: "Avg denied claim value", value: fmt(d.edAvgClaimValue, { prefix: "$" }) },
    ]},
    { section: "Workforce", fields: [
      { label: "Annual provider turnover", value: fmt(d.edTurnoverRate, { suffix: "%" }) },
      { label: "Cost to replace one provider", value: fmt(d.edReplacementCost, { prefix: "$" }) },
      { label: "Annual scribe / documentation support spend", value: fmt(d.edScribeAnnualSpend, { prefix: "$" }) },
    ]},
  ];
}

function getInpatientFields(d: ExploreIntakeResponse): { section: string; fields: FieldDef[] }[] {
  return [
    { section: "Deployment", fields: [
      { label: "Hospitalists", value: fmt(d.ipProviders) },
      { label: "Annual admissions", value: fmt(d.ipAnnualAdmissions) },
    ]},
    { section: "Throughput", fields: [
      { label: "Average length of stay", value: d.ipAvgLos != null ? `${d.ipAvgLos.toFixed(1)} days` : null },
    ]},
    { section: "Status / Medical Necessity Denials", fields: [
      { label: "Status / med-necessity denial rate", value: fmt(d.ipDenialRate, { suffix: "%" }) },
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
    { section: "E/M Coding Accuracy", fields: [
      { label: "Avg revenue per E/M encounter", value: fmt(d.ipEmRevenuePerEncounter, { prefix: "$" }) },
      { label: "Consults per admission", value: d.ipEmConsultsPerAdmission != null ? d.ipEmConsultsPerAdmission.toFixed(1) : null },
    ]},
  ];
}

function getNursingFields(d: ExploreIntakeResponse): { section: string; fields: FieldDef[] }[] {
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
      { label: "Annual agency / travel nurse spend", value: fmt(d.nursingAgencySpend, { prefix: "$" }) },
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

function SettingCard({ setting, data }: { setting: ExploreCareSetting; data: ExploreIntakeResponse }) {
  const groups = getFieldsForSetting(setting, data);
  return (
    <div className="bg-white border border-[#E5E0DB] rounded-xl p-6" data-testid={`receipt-card-${setting}`}>
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">{SETTING_LABELS[setting]}</h3>
      {groups.map((g) => {
        const filled = g.fields.filter(f => f.value !== null);
        if (filled.length === 0) return null;
        return (
          <div key={g.section} className="mb-4">
            <p className="text-xs text-[#EA2C00] uppercase tracking-widest font-semibold mb-2">{g.section}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {filled.map((f) => (
                <div key={f.label}>
                  <p className="text-xs text-[#888888] uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ExploreIntakeReceipt({ data, onLoadInCalculator }: ExploreIntakeReceiptProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const settingsLabel = data.settings.map(s => SETTING_LABELS[s]).join(" · ");
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try { await downloadIntakeReceiptPDF(data, data.repName, data.orgName); } finally { setPdfLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center mb-10">
          <img src={abridgeLogo} alt="Abridge" className="h-6" />
        </div>

        <div className="bg-[#F5F0EB] rounded-xl p-6 mb-6" data-testid="receipt-banner">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <h1 className="text-lg font-semibold text-[#1A1A1A]">Data received</h1>
          </div>
          <p className="text-sm text-[#888888]">Baseline summary from {settingsLabel}</p>
          <p className="text-xs text-[#AAAAAA] mt-1">Received {today}</p>
        </div>

        <div className="space-y-4 mb-8">
          {data.settings.map((setting) => (
            <SettingCard key={setting} setting={setting} data={data} />
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={handleDownloadPDF} disabled={pdfLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm bg-[#1A1A1A] hover:bg-[#333333] text-white transition-all"
            data-testid="button-download-receipt-pdf"
          >
            <Download className="w-4 h-4" />
            {pdfLoading ? "Generating…" : "Download PDF receipt"}
          </button>
          {onLoadInCalculator && (
            <button onClick={() => onLoadInCalculator(data)}
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm border border-[#E5E0DB] text-[#1A1A1A] hover:bg-[#FAF8F5] transition-all"
              data-testid="button-load-in-calculator"
            >
              Load in Calculator <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
