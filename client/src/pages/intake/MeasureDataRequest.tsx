import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Trash2, Download, Loader2 } from "lucide-react";
import { type MeasureDataRequestResponse, type DataFormPreseed, type DataRequestMetricEntry, type DeploymentSnapshot } from "@/lib/dataRequestUrlState";
import { generateDataRequestPDF, type DataRequestPDFData } from "@/lib/data-request-pdf-generator";
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

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  foundational: "How widely and consistently Abridge is being used across your team.",
  quality: "Whether documentation quality and completeness has improved.",
  workforce: "Provider retention, burnout, and satisfaction trends.",
  capacity: "Whether recovered time has translated into more patient access.",
  revenue: "Impact on billing accuracy, wRVU capture, and denial rates.",
  throughput: "How patient flow and wait times have changed in the ED.",
  patientFlow: "How patients are moving through the care setting.",
  staffing: "Nursing turnover, overtime, and agency spend trends.",
};

function getMetricsForSetting(setting: MeasureCareSetting): MetricDefinition[] {
  const map: Record<MeasureCareSetting, MetricDefinition[]> = {
    outpatient: OUTPATIENT_METRICS, ed: ED_METRICS,
    inpatient: INPATIENT_METRICS, nursing: NURSING_METRICS,
  };
  return (map[setting] ?? OUTPATIENT_METRICS).filter((m) => m.inputType === "before-after" && !m.phase3Roadmap);
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatWithCommas(val: number | string | null | undefined): string {
  if (val === '' || val === 0 || val === null || val === undefined) return '';
  const num = typeof val === 'string' ? val.replace(/,/g, '') : String(val);
  if (isNaN(Number(num))) return String(val);
  return Number(num).toLocaleString('en-US');
}

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
  const [showNotes, setShowNotes] = useState(!!(entry?.notes));
  const [showTrend, setShowTrend] = useState(isMonthlyMode);

  const before = entry?.before ?? null;
  const after = entry?.after ?? null;
  const hasBoth = before !== null && after !== null && before !== 0;
  const deltaPct = hasBoth ? ((after! - before!) / Math.abs(before!)) * 100 : null;
  const improved = deltaPct !== null
    ? (metric.lowerIsBetter ? deltaPct < 0 : deltaPct > 0)
    : null;

  if (!checked) {
    return (
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="group flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-[#FFF5F2]"
        data-testid={`metric-row-${metric.id}`}
      >
        <div className="w-4 h-4 rounded-full border-2 border-[#CCCCCC] bg-white flex-shrink-0 transition-colors group-hover:border-[#EA2C00]/50" />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-[#1A1A1A] font-medium leading-snug">{metric.label}</span>
          <span className="text-xs text-[#AAAAAA] ml-1.5 whitespace-nowrap">{metric.unitLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg bg-white overflow-hidden"
      style={{ borderLeft: '3px solid #EA2C00', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      data-testid={`metric-row-${metric.id}`}
    >
      <div className="flex items-start gap-3 px-3 sm:px-4 pt-3 pb-2">
        <button
          onClick={onToggle}
          className="w-4 h-4 mt-0.5 rounded-full bg-[#EA2C00] flex-shrink-0 flex items-center justify-center transition-all hover:bg-[#c92500]"
          data-testid={`toggle-metric-${metric.id}`}
        >
          <Check className="w-2.5 h-2.5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-[#1A1A1A] leading-snug">{metric.label}</span>
          <span className="text-xs text-[#AAAAAA] ml-1.5">{metric.unitLabel}</span>
        </div>
      </div>

      <div className="px-3 sm:px-4 pb-3">
        <div className="flex items-end gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wider mb-1">Before</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatWithCommas(entry?.before)}
              placeholder="—"
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, '');
                onUpdate({ before: raw === '' ? null : Number(raw) });
              }}
              className="w-full bg-transparent border-b border-[#E0D9D0] pb-1.5 text-base font-semibold text-[#1A1A1A] placeholder:text-[#DDDDDD] focus:outline-none focus:border-[#EA2C00] transition-colors"
              data-testid={`input-before-${metric.id}`}
            />
          </div>

          <div className="flex flex-col items-center pb-1.5 gap-1">
            <span className="text-[#CCCCCC] text-sm">→</span>
            {deltaPct !== null && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                improved ? 'bg-green-50 text-green-600' : 'bg-[#F5F0EB] text-[#999999]'
              }`}>
                {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(0)}%
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wider mb-1">With Abridge</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatWithCommas(entry?.after)}
              placeholder="—"
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, '');
                onUpdate({ after: raw === '' ? null : Number(raw) });
              }}
              className="w-full bg-transparent border-b border-[#E0D9D0] pb-1.5 text-base font-semibold text-[#EA2C00] placeholder:text-[#DDDDDD] focus:outline-none focus:border-[#EA2C00] transition-colors"
              data-testid={`input-after-${metric.id}`}
            />
          </div>
        </div>

        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                value={entry?.notes ?? ""}
                onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
                placeholder="Context — e.g. Q3 2025, outpatient only, excludes ED"
                autoFocus
                className="w-full mt-3 bg-transparent border-b border-[#E0D9D0] pb-1.5 text-xs text-[#555555] placeholder:text-[#CCCCCC] focus:outline-none focus:border-[#EA2C00] transition-colors"
                data-testid={`input-notes-${metric.id}`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTrend && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="mt-3 overflow-x-auto pb-1">
                <div className="flex gap-2 min-w-max">
                  {MONTH_LABELS.map((month, i) => (
                    <div key={month} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-[#AAAAAA] uppercase">{month}</span>
                      <input
                        type="number" min={0} step="any"
                        value={entry?.monthlyData?.[i] ?? ""}
                        placeholder="—"
                        onChange={(e) => {
                          const newData = [...(entry?.monthlyData ?? new Array(12).fill(null))];
                          newData[i] = e.target.value === "" ? null : Number(e.target.value);
                          onUpdate({ monthlyData: newData });
                        }}
                        className="w-12 bg-transparent border-b border-[#E0D9D0] pb-1 text-xs text-center text-[#1A1A1A] placeholder:text-[#DDDDDD] focus:outline-none focus:border-[#EA2C00] transition-colors"
                        data-testid={`input-monthly-${metric.id}-${i}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-end gap-3 mt-2.5">
          {!showNotes && (
            <button
              onClick={() => setShowNotes(true)}
              className="text-[11px] text-[#CCCCCC] hover:text-[#EA2C00] transition-colors"
              data-testid={`button-show-notes-${metric.id}`}
            >
              + context
            </button>
          )}
          <button
            onClick={() => {
              const next = !showTrend;
              setShowTrend(next);
              onUpdate({ isMonthlyMode: next, monthlyData: next ? new Array(12).fill(null) : undefined });
            }}
            className="text-[11px] text-[#CCCCCC] hover:text-[#EA2C00] transition-colors"
            data-testid={`toggle-monthly-${metric.id}`}
          >
            {showTrend ? '− trend' : '+ trend'}
          </button>
        </div>
      </div>
    </motion.div>
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
  const metricToSetting: Record<string, MeasureCareSetting> = {};
  for (const g of settingMetricGroups) {
    for (const m of g.metrics) {
      metricToSetting[m.id] = g.setting;
    }
  }

  const defaultCheckedIds = new Set(preseed?.preSelectedIds ?? []);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(defaultCheckedIds);
  const [entries, setEntries] = useState<Record<string, DataRequestMetricEntry>>({});
  const [deployment, setDeployment] = useState<DeploymentSnapshot>(defaultDeployment);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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

  async function handleDownloadMeasurementPDF() {
    setIsGeneratingPDF(true);
    const metricDefs: Record<string, { label: string; unitLabel: string; lowerIsBetter?: boolean }> = {};
    for (const m of allMetrics) {
      metricDefs[m.id] = { label: m.label, unitLabel: m.unitLabel, lowerIsBetter: m.lowerIsBetter };
    }

    const metrics = Array.from(checkedIds)
      .map(id => {
        const entry = entries[id];
        const def = metricDefs[id];
        if (!def) return null;
        return {
          label: def.label,
          unitLabel: def.unitLabel,
          lowerIsBetter: def.lowerIsBetter,
          before: entry?.before ?? null,
          after: entry?.after ?? null,
          notes: entry?.notes,
          setting: metricToSetting[id] || primarySetting,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null && (m.before !== null || m.after !== null));

    const data: DataRequestPDFData = {
      setting: primarySetting,
      settings,
      metrics,
      generatedAt: new Date(),
      organizationName: deployment.organizationName || undefined,
      monthsOnAbridge: deployment.monthsOnAbridge || undefined,
      goLiveDate: deployment.goLiveDate
        ? new Date(deployment.goLiveDate).toLocaleDateString("en-US", { year: "numeric", month: "long" })
        : undefined,
      totalProviders: deployment.totalProviders || undefined,
      liveProviders: deployment.liveProviders || undefined,
      mruProviders: deployment.mruProviders || undefined,
      totalEncounters: deployment.totalEncounters || undefined,
      abridgeEncounters: deployment.abridgeEncounters || undefined,
      preparedBy: preseed?.repName || "Abridge Partner Success",
      repName: preseed?.repName,
    };

    await generateDataRequestPDF(data);
    setIsGeneratingPDF(false);
  }

  const hasAnyMetricData = Array.from(checkedIds).some((id) => {
    const e = entries[id];
    return e && (e.before !== null || e.after !== null || e.isMonthlyMode);
  });
  const hasAnyData = hasAnyMetricData;

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex flex-col items-center py-8 sm:py-12 px-3 sm:px-4">
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-center mb-6">
          <img src={abridgeLogo} alt="Abridge" className="h-6" />
        </div>

        {(preseed?.repName || preseed?.orgName) && (
          <p className="text-center text-sm text-[#666666] mb-4" data-testid="text-data-request-context">
            {preseed.repName ? `${preseed.repName} at Abridge` : 'Your Abridge team'} sent this form
            {preseed.orgName ? ` for ${preseed.orgName}` : ''}.
          </p>
        )}

        <div className="flex justify-center gap-2 flex-wrap mb-4">
          {settings.map(s => (
            <div key={s} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E0D9D0] rounded-full text-xs font-semibold text-[#EA2C00] uppercase tracking-wide shadow-sm">
              {SETTING_LABELS[s]}
            </div>
          ))}
        </div>

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2 text-center font-abridge uppercase tracking-tight" data-testid="text-data-request-title">
          Help Us Tell Your Story
        </h1>

        <p className="text-sm text-[#666666] leading-relaxed text-center max-w-md mx-auto mb-4">
          Select the metrics you track and enter what you have. You don't need both before and after — partial data is useful too.
        </p>

        <div className="bg-[#FFF8F0] border border-[#F5DFC8] rounded-lg px-4 py-3 max-w-md mx-auto mb-4">
          <p className="text-xs text-[#8B6914] leading-relaxed text-center">
            This form doesn't save — download the PDF before closing the tab.
          </p>
        </div>

        <div className="bg-white border border-[#E0D9D0] rounded-xl px-5 py-4 mb-6 max-w-md mx-auto space-y-3">
          <div className="flex items-start gap-3 min-h-[48px]">
            <span className="text-[#EA2C00] font-bold text-base leading-none mt-0.5 shrink-0">1</span>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">Fill in what you know</p>
              <p className="text-xs text-[#888888] mt-0.5">Before only is fine. After only is fine. Add context notes if a number needs explanation.</p>
            </div>
          </div>
          <div className="h-px bg-[#F0EBE3]" />
          <div className="flex items-start gap-3 min-h-[48px]">
            <span className="text-[#EA2C00] font-bold text-base leading-none mt-0.5 shrink-0">2</span>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">Download the PDF when done</p>
              <p className="text-xs text-[#888888] mt-0.5">This form doesn't save. When you're finished, hit Download — that's what gets shared with your Abridge team.</p>
            </div>
          </div>
          <div className="h-px bg-[#F0EBE3]" />
          <div className="flex items-start gap-3 min-h-[48px]">
            <span className="text-[#EA2C00] font-bold text-base leading-none mt-0.5 shrink-0">3</span>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">Skip anything you don't track</p>
              <p className="text-xs text-[#888888] mt-0.5">Only check the metrics your team actually measures. Incomplete is better than estimated.</p>
            </div>
          </div>
        </div>

        {(() => {
          const totalChecked = checkedIds.size;
          const totalFilled = Array.from(checkedIds).filter(id => {
            const e = entries[id];
            return e && (e.before !== null || e.after !== null);
          }).length;
          if (totalChecked === 0) return null;
          return (
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 max-w-xs bg-[#E8E2DA] rounded-full h-1.5">
                <div
                  className="bg-[#EA2C00] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: totalChecked > 0 ? `${(totalFilled / totalChecked) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-xs text-[#999999] flex-shrink-0">
                {totalFilled} of {totalChecked} filled
              </span>
            </div>
          );
        })()}
      </div>

      <div className="w-full max-w-2xl space-y-6">
        <div className="bg-white rounded-xl border border-[#E0D9D0] p-4 sm:p-6 shadow-md">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Total in Org</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(deployment.totalProviders)}
                    placeholder="—"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      updateDeployment({ totalProviders: raw === '' ? 0 : Number(raw) });
                    }}
                    className="w-full bg-white border border-[#E5E5E5] rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-right"
                    data-testid="input-dep-total-providers"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Live on Abridge</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(deployment.liveProviders)}
                    placeholder="—"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      updateDeployment({ liveProviders: raw === '' ? 0 : Number(raw) });
                    }}
                    className="w-full bg-white border border-[#E5E5E5] rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-right"
                    data-testid="input-dep-live-providers"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Monthly Active Users</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(deployment.mruProviders)}
                    placeholder="—"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      updateDeployment({ mruProviders: raw === '' ? 0 : Number(raw) });
                    }}
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
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(deployment.totalEncounters)}
                    placeholder="—"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      updateDeployment({ totalEncounters: raw === '' ? 0 : Number(raw) });
                    }}
                    className="w-full bg-white border border-[#E5E5E5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-right"
                    data-testid="input-dep-total-encounters"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Abridge Encounters</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(deployment.abridgeEncounters)}
                    placeholder="—"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      updateDeployment({ abridgeEncounters: raw === '' ? 0 : Number(raw) });
                    }}
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
                <div key={`${s}-${domain}`} className="bg-white rounded-xl border border-[#E0D9D0] p-4 sm:p-6 shadow-md mb-6">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-1 rounded-full bg-[#EA2C00] flex-shrink-0 mt-1" style={{ height: '2.5rem' }} />
                    <div>
                      <h2 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-widest mb-0.5">
                        {DOMAIN_LABELS[domain] || domain}
                      </h2>
                      <p className="text-xs text-[#999999] leading-snug">
                        {DOMAIN_DESCRIPTIONS[domain] || ""}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {metrics.map((metric) => (
                      <MetricRow key={metric.id} metric={metric} checked={checkedIds.has(metric.id)} entry={entries[metric.id]}
                        onToggle={() => toggleMetric(metric.id)} onUpdate={(updates) => updateEntry(metric.id, updates)} />
                    ))}
                  </div>
                  {(() => {
                    const anyChecked = metrics.some(m => checkedIds.has(m.id));
                    if (anyChecked) return null;
                    return (
                      <p className="text-xs text-[#BBBBBB] text-center py-2 italic">
                        No metrics selected in this section — check any that apply to your deployment.
                      </p>
                    );
                  })()}
                </div>
              ))}
            </div>
          );
        })}
        <div className="bg-white rounded-xl border border-[#E0D9D0] p-4 sm:p-6 shadow-md">
          {!hasAnyData ? (
            <div className="text-center">
              <p className="text-sm text-[#BBBBBB]">Select at least one metric and enter a value to export your summary.</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-[#1A1A1A] mb-1">Ready to share</p>
              <p className="text-xs text-[#999999] mb-4">
                Download the PDF, then email it to {preseed?.repName ? `${preseed.repName} at Abridge` : 'your Abridge rep'}.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={handleDownloadMeasurementPDF}
                  disabled={!hasAnyData || isGeneratingPDF}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                    hasAnyData && !isGeneratingPDF
                      ? "bg-[#EA2C00] hover:bg-[#c92500] text-white"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  data-testid="button-download-pdf"
                >
                  {isGeneratingPDF ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Download className="w-4 h-4" /> Download PDF</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {(checkedIds.size > 0 || Object.keys(entries).length > 0) && (
          <div className="text-center pb-4">
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 text-xs text-[#CCCCCC] hover:text-red-400 transition-colors"
              data-testid="button-clear-data-request"
            >
              <Trash2 className="w-3 h-3" /> Clear my answers
            </button>
          </div>
        )}

        <p className="text-center text-xs text-[#BBBBBB] pb-8">
          No account required. Your answers stay in this browser — nothing is stored on any server.
        </p>
      </div>
    </div>
  );
}
