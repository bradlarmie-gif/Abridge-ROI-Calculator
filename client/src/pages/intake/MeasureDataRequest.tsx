import { useState } from "react";
import { Check, Copy, ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";
import { type MeasureDataRequestResponse, type DataFormPreseed, type DataRequestMetricEntry, generateDataResponseUrl } from "@/lib/dataRequestUrlState";
import { OUTPATIENT_METRICS, ED_METRICS, INPATIENT_METRICS, NURSING_METRICS, type MetricDefinition } from "@/lib/measureCareSettings";
import type { MeasureCareSetting } from "@/lib/measureCalculator";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

const SETTING_LABELS: Record<MeasureCareSetting, string> = {
  outpatient: "Outpatient", ed: "Emergency Department",
  inpatient: "Inpatient / Hospital Medicine", nursing: "Nursing / Care Teams",
};

const DOMAIN_LABELS: Record<string, string> = {
  foundational: "Adoption & Utilization", quality: "Care Quality", workforce: "Workforce",
  capacity: "Capacity", revenue: "Revenue", throughput: "Throughput",
  patientFlow: "Patient Flow", staffing: "Staffing",
};

function getMetricsForSetting(setting: MeasureCareSetting): MetricDefinition[] {
  const map: Record<MeasureCareSetting, MetricDefinition[]> = {
    outpatient: OUTPATIENT_METRICS, ed: ED_METRICS,
    inpatient: INPATIENT_METRICS, nursing: NURSING_METRICS,
  };
  return (map[setting] ?? OUTPATIENT_METRICS).filter((m) => m.inputType === "before-after" && !m.phase3Roadmap);
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function MetricRow({ metric, checked, entry, onToggle, onUpdate }: {
  metric: MetricDefinition; checked: boolean; entry: DataRequestMetricEntry | undefined;
  onToggle: () => void; onUpdate: (updates: Partial<DataRequestMetricEntry>) => void;
}) {
  const isMonthlyMode = entry?.isMonthlyMode ?? false;
  return (
    <div className={`border rounded-lg transition-all ${checked ? "border-[#E8E2DA] bg-white" : "border-[#EDE8E2] bg-[#FAF8F5]"}`}
      data-testid={`metric-row-${metric.id}`}
    >
      <div className="flex items-start gap-3 p-4">
        <button onClick={onToggle}
          className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
            checked ? "bg-[#EA2C00] border-[#EA2C00]" : "border-gray-300 bg-white"
          }`}
          data-testid={`toggle-metric-${metric.id}`}
        >
          {checked && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-sm font-medium ${checked ? "text-gray-900" : "text-gray-400"}`}>{metric.label}</span>
            <span className={`text-xs ${checked ? "text-gray-400" : "text-gray-300"}`}>({metric.unitLabel})</span>
          </div>
          {checked && metric.description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{metric.description}</p>}
        </div>
      </div>
      {checked && (
        <div className="px-4 pb-4 border-t border-[#EDE8E2] pt-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Before Abridge</label>
              <input type="number" min={0} step="any" value={entry?.before ?? ""} placeholder="—"
                onChange={(e) => onUpdate({ before: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full bg-[#FAF8F5] border border-[#E5E5E5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                data-testid={`input-before-${metric.id}`}
              />
            </div>
            <div className="text-gray-300 mt-4">&rarr;</div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">With Abridge</label>
              <input type="number" min={0} step="any" value={entry?.after ?? ""} placeholder="—"
                onChange={(e) => onUpdate({ after: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full bg-[#FAF8F5] border border-[#E5E5E5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                data-testid={`input-after-${metric.id}`}
              />
            </div>
          </div>
          <div className="mt-3">
            <button onClick={() => onUpdate({ isMonthlyMode: !isMonthlyMode, monthlyData: !isMonthlyMode ? new Array(12).fill(null) : undefined })}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              data-testid={`toggle-monthly-${metric.id}`}
            >
              {isMonthlyMode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {isMonthlyMode ? "Hide monthly trend" : "Add monthly trend data (optional)"}
            </button>
            {isMonthlyMode && (
              <div className="mt-3 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {MONTH_LABELS.map((month, i) => (
                    <div key={month} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-400">{month}</span>
                      <input type="number" min={0} step="any" value={entry?.monthlyData?.[i] ?? ""} placeholder="—"
                        onChange={(e) => {
                          const newData = [...(entry?.monthlyData ?? new Array(12).fill(null))];
                          newData[i] = e.target.value === "" ? null : Number(e.target.value);
                          onUpdate({ monthlyData: newData });
                        }}
                        className="w-14 bg-[#FAF8F5] border border-[#E5E5E5] rounded px-1 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30"
                        data-testid={`input-monthly-${metric.id}-${i}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeasureDataRequest({ preseed }: { preseed?: DataFormPreseed }) {
  const setting: MeasureCareSetting = preseed?.setting ?? "outpatient";
  const allMetrics = getMetricsForSetting(setting);
  const byDomain = allMetrics.reduce<Record<string, MetricDefinition[]>>((acc, m) => {
    acc[m.domain] = [...(acc[m.domain] ?? []), m]; return acc;
  }, {});
  const defaultCheckedIds = new Set(preseed?.preSelectedIds ?? allMetrics.filter((m) => m.phase === 1).map((m) => m.id));
  const [checkedIds, setCheckedIds] = useState<Set<string>>(defaultCheckedIds);
  const [entries, setEntries] = useState<Record<string, DataRequestMetricEntry>>({});
  const [copied, setCopied] = useState(false);

  function toggleMetric(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else { next.add(id); setEntries((e) => ({ ...e, [id]: e[id] ?? { metricId: id, before: null, after: null, isMonthlyMode: false } })); }
      return next;
    });
  }

  function updateEntry(id: string, updates: Partial<DataRequestMetricEntry>) {
    setEntries((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { metricId: id, before: null, after: null, isMonthlyMode: false }), ...updates } }));
  }

  function handleCopy() {
    const metrics = Array.from(checkedIds).map((id) => entries[id] ?? { metricId: id, before: null, after: null, isMonthlyMode: false })
      .filter((e) => e.before !== null || e.after !== null || e.isMonthlyMode);
    navigator.clipboard.writeText(generateDataResponseUrl({ setting, metrics })).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  }

  const hasAnyData = Array.from(checkedIds).some((id) => { const e = entries[id]; return e && (e.before !== null || e.after !== null); });

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="flex items-center justify-center mb-6">
          <img src={abridgeLogo} alt="Abridge" className="h-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#E8E2DA] rounded-full text-xs text-[#888888] mb-4">
          {SETTING_LABELS[setting]}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2" data-testid="text-data-request-title">Help us tell your story</h1>
        <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
          Select the metrics you track and enter your numbers. Your Abridge partner will use this to prepare your business review.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        {Object.entries(byDomain).map(([domain, metrics]) => (
          <div key={domain} className="bg-[#FAF8F5] rounded-xl border border-[#E8E2DA] p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">{DOMAIN_LABELS[domain] || domain}</h2>
            <div className="space-y-3">
              {metrics.map((metric) => (
                <MetricRow key={metric.id} metric={metric} checked={checkedIds.has(metric.id)} entry={entries[metric.id]}
                  onToggle={() => toggleMetric(metric.id)} onUpdate={(updates) => updateEntry(metric.id, updates)} />
              ))}
            </div>
          </div>
        ))}
        <div className="bg-[#FAF8F5] rounded-xl border border-[#E8E2DA] p-6 shadow-sm text-center">
          <button onClick={handleCopy} disabled={!hasAnyData}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
              hasAnyData ? copied ? "bg-green-500 text-white" : "bg-[#EA2C00] hover:bg-[#c92500] text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            data-testid="button-copy-data-request"
          >
            {copied ? <><ClipboardCheck className="w-4 h-4" /> Copied to clipboard!</> : <><Copy className="w-4 h-4" /> Copy my answers</>}
          </button>
          {!hasAnyData && <p className="text-xs text-gray-400 mt-2">Select at least one metric and enter a before or after value.</p>}
          {hasAnyData && !copied && <p className="text-xs text-gray-500 mt-2">Paste this link and send it to your Abridge partner.</p>}
          {copied && <p className="text-xs text-green-600 mt-2">Send this link to your Abridge partner — they'll use it to prep your business review.</p>}
        </div>
        <p className="text-center text-xs text-gray-400 pb-8">No account required. Your answers are encoded in the link — nothing is stored on any server.</p>
      </div>
    </div>
  );
}
