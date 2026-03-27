import { useState } from "react";
import { CheckCircle, Download, ArrowRight } from "lucide-react";
import { type MeasureDataRequestResponse, hasDeploymentData } from "@/lib/dataRequestUrlState";
import { downloadDataRequestReceiptPDF } from "@/components/intake/DataRequestReceiptPDF";
import { OUTPATIENT_METRICS, ED_METRICS, INPATIENT_METRICS, NURSING_METRICS, type MetricDefinition } from "@/lib/measureCareSettings";
import type { MeasureCareSetting } from "@/lib/measureCalculator";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

interface MeasureDataReceiptProps {
  data: MeasureDataRequestResponse;
  onLoadInCalculator?: (data: MeasureDataRequestResponse) => void;
}

const SETTING_LABELS: Record<MeasureCareSetting, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  inpatient: "Inpatient / Hospital Medicine",
  nursing: "Nursing / Care Teams",
};

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getMetricsMap(setting: MeasureCareSetting): MetricDefinition[] {
  const map: Record<MeasureCareSetting, MetricDefinition[]> = {
    outpatient: OUTPATIENT_METRICS, ed: ED_METRICS,
    inpatient: INPATIENT_METRICS, nursing: NURSING_METRICS,
  };
  return map[setting] ?? OUTPATIENT_METRICS;
}

export default function MeasureDataReceipt({ data, onLoadInCalculator }: MeasureDataReceiptProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const metricDefs = getMetricsMap(data.setting);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try { await downloadDataRequestReceiptPDF(data); } finally { setPdfLoading(false); }
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
          <p className="text-sm text-[#888888]">
            {data.deployment?.organizationName
              ? `${data.deployment.organizationName} · ${SETTING_LABELS[data.setting]}`
              : `Metric summary for ${SETTING_LABELS[data.setting]}`
            }
          </p>
          <p className="text-xs text-[#AAAAAA] mt-1">Received {today}</p>
        </div>

        {hasDeploymentData(data.deployment) && (
          <div className="bg-white border border-[#E5E0DB] rounded-xl p-6 mb-4" data-testid="receipt-deployment-card">
            <h3 className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">Deployment Profile</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {data.deployment.monthsOnAbridge > 0 && (
                <div>
                  <p className="text-xs text-[#888888] uppercase tracking-wide">Months on Abridge</p>
                  <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">{data.deployment.monthsOnAbridge}</p>
                </div>
              )}
              {data.deployment.totalProviders > 0 && (
                <div>
                  <p className="text-xs text-[#888888] uppercase tracking-wide">Total Providers</p>
                  <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">{data.deployment.totalProviders}</p>
                </div>
              )}
              {data.deployment.liveProviders > 0 && (
                <div>
                  <p className="text-xs text-[#888888] uppercase tracking-wide">Live on Abridge</p>
                  <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">{data.deployment.liveProviders}</p>
                </div>
              )}
              {data.deployment.mruProviders > 0 && (
                <div>
                  <p className="text-xs text-[#888888] uppercase tracking-wide">Monthly Recording Users</p>
                  <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">{data.deployment.mruProviders}</p>
                </div>
              )}
              {data.deployment.totalEncounters > 0 && (
                <div>
                  <p className="text-xs text-[#888888] uppercase tracking-wide">Total Encounters</p>
                  <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">{data.deployment.totalEncounters.toLocaleString()}</p>
                </div>
              )}
              {data.deployment.abridgeEncounters > 0 && (
                <div>
                  <p className="text-xs text-[#888888] uppercase tracking-wide">Abridge Encounters</p>
                  <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5">{data.deployment.abridgeEncounters.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white border border-[#E5E0DB] rounded-xl p-6 mb-8" data-testid="receipt-metrics-card">
          <div className="flex border-b border-[#E5E0DB] pb-2 mb-2">
            <p className="flex-1 text-xs text-[#888888] uppercase tracking-wide font-semibold">Metric</p>
            <p className="w-20 text-xs text-[#888888] uppercase tracking-wide font-semibold text-right">Before</p>
            <p className="w-20 text-xs text-[#888888] uppercase tracking-wide font-semibold text-right">After</p>
          </div>
          {data.metrics.map((entry) => {
            const def = metricDefs.find(m => m.id === entry.metricId);
            const label = def?.label ?? entry.metricId;
            return (
              <div key={entry.metricId} className="border-b border-[#F0EBE5] last:border-b-0">
                <div className="flex items-center py-3">
                  <p className="flex-1 text-sm text-[#1A1A1A]">{label}</p>
                  <p className="w-20 text-sm text-[#888888] text-right">{entry.before != null ? entry.before : "—"}</p>
                  <p className="w-20 text-sm font-semibold text-[#1A1A1A] text-right">{entry.after != null ? entry.after : "—"}</p>
                </div>
                {entry.isMonthlyMode && entry.monthlyData && (
                  <div className="flex gap-2 pb-3 overflow-x-auto">
                    {MONTH_LABELS.map((m, i) => (
                      <div key={m} className="flex flex-col items-center min-w-[36px]">
                        <span className="text-[10px] text-[#AAAAAA]">{m}</span>
                        <span className="text-xs text-[#888888]">{entry.monthlyData?.[i] != null ? entry.monthlyData[i] : "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
