import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Trash2, Lock, Download } from "lucide-react";
import { type MeasureDataRequestResponse, type DataFormPreseed, type DataRequestMetricEntry, type DeploymentSnapshot } from "@/lib/dataRequestUrlState";
import { downloadDataRequestReceiptPDF } from "@/components/intake/DataRequestReceiptPDF";
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

const defaultDeployment: DeploymentSnapshot = {
  organizationName: '',
  goLiveDate: null,
  monthsOnAbridge: 0,
  totalProviders: 0,
  liveProviders: 0,
  mruProviders: 0,
  totalEncounters: 0,
  abridgeEncounters: 0,
};

function MetricRow({ metric, checked, entry, onToggle, onUpdate }: {
  metric: MetricDefinition; checked: boolean; entry: DataRequestMetricEntry | undefined;
  onToggle: () => void; onUpdate: (updates: Partial<DataRequestMetricEntry>) => void;
}) {
  const isMonthlyMode = entry?.isMonthlyMode ?? false;
  return (
    <div className={`border rounded-lg transition-all ${checked ? "border-[#E8E3DD] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]" : "border-[#EDE8E2] bg-[#FAF8F5]"}`}
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
              <label className="block text-[11px] font-medium text-[#777777] mb-1 uppercase tracking-wider">Before Abridge</label>
              <input type="number" min={0} step="any" inputMode="decimal" value={entry?.before ?? ""} placeholder="—"
                onChange={(e) => onUpdate({ before: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-full bg-[#FAF8F5] border border-[#E5E5E5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                data-testid={`input-before-${metric.id}`}
              />
            </div>
            <div className="text-gray-300 mt-4">&rarr;</div>
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-[#777777] mb-1 uppercase tracking-wider">With Abridge</label>
              <input type="number" min={0} step="any" inputMode="decimal" value={entry?.after ?? ""} placeholder="—"
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
                      <input type="number" min={0} step="any" inputMode="decimal" value={entry?.monthlyData?.[i] ?? ""} placeholder="—"
                        onChange={(e) => {
                          const newData = [...(entry?.monthlyData ?? new Array(12).fill(null))];
                          newData[i] = e.target.value === "" ? null : Number(e.target.value);
                          onUpdate({ monthlyData: newData });
                        }}
                        className="w-14 bg-[#FAF8F5] border border-[#E5E5E5] rounded px-1 py-2.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30"
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

export default function MeasureDataRequest({ preseed, storageFingerprint }: { preseed?: DataFormPreseed; storageFingerprint?: string }) {
  const settings: MeasureCareSetting[] = preseed?.settings ?? (preseed?.setting ? [preseed.setting] : ["outpatient"]);
  const primarySetting = settings[0];

  const settingMetricGroups = settings.map(s => ({
    setting: s,
    metrics: getMetricsForSetting(s),
  }));
  const allMetrics = settingMetricGroups.flatMap(g => g.metrics);

  const defaultCheckedIds = new Set(preseed?.preSelectedIds ?? allMetrics.filter((m) => m.phase === 1).map((m) => m.id));

  const [checkedIds, setCheckedIds] = useState<Set<string>>(defaultCheckedIds);
  const [entries, setEntries] = useState<Record<string, DataRequestMetricEntry>>({});
  const [deployment, setDeployment] = useState<DeploymentSnapshot>(defaultDeployment);
  const [pdfLoading, setPdfLoading] = useState(false);
  const isSettingLocked = settings.length > 0 && !!preseed;

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

  function handleClearAll() {
    setCheckedIds(new Set());
    setEntries({});
    setDeployment(defaultDeployment);
  }

  function updateDeployment(updates: Partial<DeploymentSnapshot>) {
    setDeployment(prev => {
      const next = { ...prev, ...updates };
      if (updates.goLiveDate !== undefined) {
        if (updates.goLiveDate) {
          const goLive = new Date(updates.goLiveDate);
          const now = new Date();
          const diff = (now.getFullYear() - goLive.getFullYear()) * 12 + (now.getMonth() - goLive.getMonth());
          next.monthsOnAbridge = Math.max(0, diff);
        }
      }
      return next;
    });
  }

  function buildResponse(): MeasureDataRequestResponse {
    const metrics = Array.from(checkedIds).map((id) => entries[id] ?? { metricId: id, before: null, after: null, isMonthlyMode: false })
      .filter((e) => e.before !== null || e.after !== null || e.isMonthlyMode);
    return { setting: primarySetting, deployment, metrics };
  }

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try {
      await downloadDataRequestReceiptPDF(buildResponse());
    } finally {
      setPdfLoading(false);
    }
  }

  const hasAnyData =
    deployment.organizationName.trim().length > 0 ||
    deployment.totalProviders > 0 ||
    Array.from(checkedIds).some((id) => { const e = entries[id]; return e && (e.before !== null || e.after !== null); });

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl mb-8 text-center">
        <div className="flex items-center justify-center mb-8">
          <img src={abridgeLogo} alt="Abridge" className="h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#E8E2DA] rounded-full text-xs text-[#888888] mb-4">
          {isSettingLocked && <Lock className="w-3 h-3 text-[#EA2C00]" />}
          {settings.map(s => SETTING_LABELS[s]).join(" · ")}
        </div>
        {isSettingLocked && (
          <p className="text-xs text-[#AAAAAA] mb-2 italic">Your Abridge contact has scoped this review to {settings.map(s => SETTING_LABELS[s]).join(" & ")}.</p>
        )}
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">Pre-EBR Data Request</p>
        <h1 className="text-3xl font-bold text-black mb-3 uppercase tracking-tight" data-testid="text-data-request-title">Help us tell your story</h1>
        <p className="text-[#666666] text-base leading-relaxed max-w-md mx-auto">
          Select the metrics you track and enter your numbers. Your Abridge partner will use this to prepare your business review.
        </p>
        <p className="text-xs text-[#AAAAAA] text-center max-w-sm mx-auto mt-2 leading-relaxed">
          Only fill in what you track. Anything left blank will be filled with industry benchmarks and refined with you during the review.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        <div className="bg-[#FAF8F5] rounded-xl border border-[#E8E2DA] p-6 shadow-sm">
          <h2 className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">Your Organization</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#777777] mb-1 uppercase tracking-wider">Organization Name</label>
              <input
                type="text"
                value={deployment.organizationName}
                onChange={(e) => updateDeployment({ organizationName: e.target.value })}
                placeholder="e.g., Valley Health System"
                className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                data-testid="input-dep-org-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#777777] mb-1 uppercase tracking-wider">Go-Live Date</label>
                <input
                  type="date"
                  value={deployment.goLiveDate || ''}
                  onChange={(e) => updateDeployment({ goLiveDate: e.target.value || null })}
                  className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                  data-testid="input-dep-go-live"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#777777] mb-1 uppercase tracking-wider">Months on Abridge</label>
                {deployment.goLiveDate ? (
                  <div className="w-full bg-[#FAF8F5] border border-[#E5E5E5] rounded-md px-3 py-2 text-sm font-semibold text-gray-900 text-right">
                    {deployment.monthsOnAbridge}
                  </div>
                ) : (
                  <input
                    type="number" min={0} step={1} inputMode="numeric" pattern="[0-9]*"
                    value={deployment.monthsOnAbridge || ''}
                    placeholder="—"
                    onChange={(e) => updateDeployment({ monthsOnAbridge: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-right"
                    data-testid="input-dep-months"
                  />
                )}
                {deployment.goLiveDate && (
                  <p className="text-[10px] text-gray-400 mt-0.5">Auto-calculated</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#777777] mb-2 uppercase tracking-wider">Provider Adoption</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Total in Org</label>
                  <input
                    type="number" min={0} step={1} inputMode="numeric" pattern="[0-9]*"
                    value={deployment.totalProviders || ''}
                    placeholder="—"
                    onChange={(e) => updateDeployment({ totalProviders: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full bg-white border border-[#E5E5E5] rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-right"
                    data-testid="input-dep-total-providers"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Live on Abridge</label>
                  <input
                    type="number" min={0} step={1} inputMode="numeric" pattern="[0-9]*"
                    value={deployment.liveProviders || ''}
                    placeholder="—"
                    onChange={(e) => updateDeployment({ liveProviders: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full bg-white border border-[#E5E5E5] rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-right"
                    data-testid="input-dep-live-providers"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Mthly Recording Users</label>
                  <input
                    type="number" min={0} step={1} inputMode="numeric" pattern="[0-9]*"
                    value={deployment.mruProviders || ''}
                    placeholder="—"
                    onChange={(e) => updateDeployment({ mruProviders: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full bg-white border border-[#E5E5E5] rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-right"
                    data-testid="input-dep-mru-providers"
                  />
                </div>
              </div>
              {deployment.totalProviders > 0 && (
                <div className="mt-3 space-y-1.5">
                  {[
                    { label: 'Total', value: deployment.totalProviders, color: '#E8E2DA' },
                    { label: 'Live', value: deployment.liveProviders, color: '#F5C4B8' },
                    { label: 'MRUs', value: deployment.mruProviders, color: '#EA2C00' },
                  ].map(tier => {
                    const pct = Math.round((tier.value / deployment.totalProviders) * 100);
                    return (
                      <div key={tier.label} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">{tier.label}</span>
                        <div className="flex-1 h-4 bg-white rounded overflow-hidden">
                          <div className="h-full rounded transition-all duration-300" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: tier.color }} />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700 w-8 text-right">{tier.value}</span>
                        <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#777777] mb-2 uppercase tracking-wider">Encounter Coverage</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Total Encounters</label>
                  <input
                    type="number" min={0} step={1} inputMode="numeric" pattern="[0-9]*"
                    value={deployment.totalEncounters || ''}
                    placeholder="—"
                    onChange={(e) => updateDeployment({ totalEncounters: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-right"
                    data-testid="input-dep-total-encounters"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Abridge Encounters</label>
                  <input
                    type="number" min={0} step={1} inputMode="numeric" pattern="[0-9]*"
                    value={deployment.abridgeEncounters || ''}
                    placeholder="—"
                    onChange={(e) => updateDeployment({ abridgeEncounters: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-right"
                    data-testid="input-dep-abridge-encounters"
                  />
                </div>
              </div>
              {deployment.totalEncounters > 0 && deployment.abridgeEncounters > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">Cvg</span>
                  <div className="flex-1 h-4 bg-white rounded overflow-hidden">
                    <div className="h-full rounded transition-all duration-300" style={{
                      width: `${Math.max(Math.round((deployment.abridgeEncounters / deployment.totalEncounters) * 100), 2)}%`,
                      backgroundColor: '#EA2C00',
                    }} />
                  </div>
                  <span className="text-[11px] font-semibold text-[#EA2C00] w-12 text-right">
                    {Math.round((deployment.abridgeEncounters / deployment.totalEncounters) * 100)}% covered
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {settingMetricGroups.map(({ setting: s, metrics: settingMetrics }) => {
          const byDomain = settingMetrics.reduce<Record<string, MetricDefinition[]>>((acc, m) => {
            acc[m.domain] = [...(acc[m.domain] ?? []), m]; return acc;
          }, {});
          return (
            <div key={s}>
              {settings.length > 1 && (
                <div className="flex items-center gap-2 mb-3 mt-2">
                  <div className="h-px flex-1 bg-[#E8E2DA]" />
                  <span className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-widest">{SETTING_LABELS[s]}</span>
                  <div className="h-px flex-1 bg-[#E8E2DA]" />
                </div>
              )}
              {Object.entries(byDomain).map(([domain, metrics]) => (
                <div key={`${s}-${domain}`} className="bg-[#FAF8F5] rounded-xl border border-[#E8E2DA] p-6 shadow-sm mb-6">
                  <h2 className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">{DOMAIN_LABELS[domain] || domain}</h2>
                  <div className="space-y-3">
                    {metrics.map((metric) => (
                      <MetricRow key={metric.id} metric={metric} checked={checkedIds.has(metric.id)} entry={entries[metric.id]}
                        onToggle={() => toggleMetric(metric.id)} onUpdate={(updates) => updateEntry(metric.id, updates)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        <div className="bg-[#FAF8F5] rounded-xl border border-[#E8E2DA] p-6 shadow-sm">
          <button onClick={handleDownloadPDF} disabled={!hasAnyData || pdfLoading}
            className={`w-full inline-flex items-center justify-center gap-2 h-14 rounded-xl font-semibold text-sm transition-all ${
              hasAnyData ? "bg-[#1A1A1A] hover:bg-[#333333] text-white" : "bg-[#F0EBE5] text-[#C4BDB6] cursor-not-allowed"
            }`}
            data-testid="button-download-pdf-data-request"
          >
            <Download className="w-4 h-4" />
            {pdfLoading ? "Generating…" : "Download PDF"}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">Save a copy for your records</p>
          {!hasAnyData && <p className="text-xs text-gray-400 mt-3 text-center">Select at least one metric and enter a before or after value.</p>}
        </div>

        {(checkedIds.size > 0 || Object.keys(entries).length > 0) && (
          <div className="text-center">
            <button onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
              data-testid="button-clear-data-request"
            >
              <Trash2 className="w-3 h-3" /> Clear my answers
            </button>
          </div>
        )}

        <p className="text-center text-[11px] text-[#CCCCCC] pb-8 mt-4 max-w-sm mx-auto leading-relaxed">
          No account required. Your answers are saved in this browser — nothing is stored on any server.
        </p>
      </div>
    </div>
  );
}
