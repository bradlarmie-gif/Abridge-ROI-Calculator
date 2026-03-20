import { useMemo, useState } from "react";
import { ArrowRight, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  type DomainStatus,
  formatNumber,
  deriveEngagementContext,
  computeDomainStatus,
  deriveSettingStage,
  getMonthsFromGoLive,
} from "@/lib/measureCalculator";
import { ABRIDGE_NATIVE_METRICS, CARE_SETTING_CONFIGS } from "@/lib/measureCareSettings";
import { EngagementContextBar } from "@/components/measure/EngagementContextBar";
import NarrativePanel from "@/components/measure/NarrativePanel";
import { generateNarrative } from "@/lib/measureNarrative";

interface MeasureInventoryProps {
  state: MeasureState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

interface MetricRowData {
  label: string;
  domain: string;
  status: 'active' | 'baseline' | 'not-measuring';
  before?: number;
  after?: number;
  delta?: number;
  unit?: string;
}

function getSettingMetricRows(state: MeasureState, setting: MeasureCareSetting): MetricRowData[] {
  const config = CARE_SETTING_CONFIGS[setting];
  const settingData = state.settingData[setting] || {};
  const rows: MetricRowData[] = [];

  const domainMap: Record<string, string> = {
    timeEfficiency: 'Workforce',
    docQuality: 'Quality',
    qualityRetention: 'Quality',
  };

  const capacityKeys = ['sameDayClosure', 'lwbsRate', 'doorToDoc'];
  const revenueKeys = ['wrvuPerEncounter', 'cmi', 'denialsPer100', 'ccMccCapture', 'emLevel', 'admissionCapture'];

  for (const section of config.metricSections) {
    for (const metric of section.metrics) {
      if (!metric.hasBeforeAfter) continue;
      const before = settingData[`${metric.key}_before`] ?? 0;
      const after = settingData[`${metric.key}_after`] ?? 0;
      const delta = after - before;

      let domain = domainMap[section.key] || 'Quality';
      if (capacityKeys.includes(metric.key)) {
        domain = setting === 'inpatient' ? 'Patient Flow' : setting === 'ed' ? 'Throughput' : 'Capacity';
      } else if (revenueKeys.includes(metric.key)) {
        domain = 'Revenue';
      }

      let status: 'active' | 'baseline' | 'not-measuring';
      if (before > 0 && after > 0 && Math.abs(delta) > 0) {
        status = 'active';
      } else if (before > 0) {
        status = 'baseline';
      } else {
        status = 'not-measuring';
      }

      rows.push({
        label: metric.label.replace(/ \(.*\)/, ''),
        domain,
        status,
        before: before || undefined,
        after: after || undefined,
        delta: Math.abs(delta) > 0 ? delta : undefined,
        unit: metric.suffix,
      });
    }
  }

  if (setting === 'outpatient' || setting === 'ed') {
    const te = state.timeEfficiency;
    const dq = state.documentationQuality;

    const timeBefore = te.timeInNotesWithout;
    const timeAfter = te.timeInNotesWith;
    if (timeBefore > 0 || timeAfter > 0) {
      const existing = rows.find(r => r.label === 'Time in Notes');
      if (existing) {
        existing.before = timeBefore || existing.before;
        existing.after = timeAfter || existing.after;
        const d = (timeAfter || 0) - (timeBefore || 0);
        existing.status = timeBefore > 0 && timeAfter > 0 && Math.abs(d) > 0 ? 'active' : timeBefore > 0 ? 'baseline' : 'not-measuring';
        existing.delta = Math.abs(d) > 0 ? d : undefined;
      }
    }

    if (dq.wrvuWithout > 0 || dq.wrvuWith > 0) {
      const existing = rows.find(r => r.label === 'wRVU per Encounter');
      if (existing) {
        existing.before = dq.wrvuWithout || existing.before;
        existing.after = dq.wrvuWith || existing.after;
        const d = (dq.wrvuWith || 0) - (dq.wrvuWithout || 0);
        existing.status = dq.wrvuWithout > 0 && dq.wrvuWith > 0 && Math.abs(d) > 0 ? 'active' : dq.wrvuWithout > 0 ? 'baseline' : 'not-measuring';
        existing.delta = Math.abs(d) > 0 ? d : undefined;
      }
    }
  }

  return rows;
}

function groupByDomain(rows: MetricRowData[]): Record<string, MetricRowData[]> {
  const groups: Record<string, MetricRowData[]> = {};
  for (const r of rows) {
    if (!groups[r.domain]) groups[r.domain] = [];
    groups[r.domain].push(r);
  }
  return groups;
}

function StatusBadge({ status }: { status: 'active' | 'baseline' | 'not-measuring' }) {
  if (status === 'active') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700" data-testid="badge-active">ACTIVE</span>;
  }
  if (status === 'baseline') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700" data-testid="badge-baseline">BASELINE</span>;
  }
  return null;
}

function MetricRow({ row, onAdd }: { row: MetricRowData; onAdd?: () => void }) {
  if (row.status === 'active') {
    return (
      <div className="flex items-center gap-3 py-2 border-b border-[#F5F5F5] last:border-b-0" data-testid={`metric-row-${row.label.toLowerCase().replace(/\s/g, '-')}`}>
        <span className="w-2 h-2 rounded-full bg-[#EA2C00] flex-shrink-0" />
        <span className="text-sm text-[#1A1A1A] flex-1 min-w-0">{row.label}</span>
        <span className="text-xs text-[#999999]">{row.before?.toFixed(row.before % 1 ? 2 : 0)}</span>
        <span className="text-xs text-[#CCCCCC]">{"\u2192"}</span>
        <span className="text-sm font-medium text-[#1A1A1A]">{row.after?.toFixed(row.after % 1 ? 2 : 0)}</span>
        {row.delta !== undefined && (
          <span className={`text-xs font-medium ${row.delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {row.delta > 0 ? '+' : ''}{row.delta.toFixed(row.delta % 1 ? 2 : 1)}
          </span>
        )}
        <StatusBadge status="active" />
      </div>
    );
  }

  if (row.status === 'baseline') {
    return (
      <div className="flex items-center gap-3 py-2 border-b border-[#F5F5F5] last:border-b-0" data-testid={`metric-row-${row.label.toLowerCase().replace(/\s/g, '-')}`}>
        <span className="w-2 h-2 rounded-full border border-[#CCCCCC] flex-shrink-0" />
        <span className="text-sm text-[#666666] flex-1 min-w-0">{row.label}</span>
        <span className="text-xs text-[#999999]">baseline: {row.before?.toFixed(row.before % 1 ? 2 : 0)}</span>
        <span className="text-xs text-[#CCCCCC]">{"\u2014"}</span>
        <StatusBadge status="baseline" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#F5F5F5] last:border-b-0 opacity-50" data-testid={`metric-row-${row.label.toLowerCase().replace(/\s/g, '-')}`}>
      <span className="w-2 h-2 rounded-full border border-[#E0E0E0] flex-shrink-0" />
      <span className="text-sm text-[#999999] flex-1 min-w-0">{row.label}</span>
      <span className="text-xs text-[#CCCCCC]">Not entered</span>
      {onAdd && (
        <button onClick={onAdd} className="text-xs text-[#EA2C00] hover:underline flex items-center gap-0.5" data-testid={`btn-add-${row.label.toLowerCase().replace(/\s/g, '-')}`}>
          <Plus className="w-3 h-3" />Add
        </button>
      )}
    </div>
  );
}

function SignalSummaryBar({ rows }: { rows: MetricRowData[] }) {
  const active = rows.filter(r => r.status === 'active').length;
  const baseline = rows.filter(r => r.status === 'baseline').length;
  const notMeasuring = rows.filter(r => r.status === 'not-measuring').length;
  const total = rows.length;

  return (
    <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
      <p className="text-xs text-[#666666] mb-2">
        {active} metric{active !== 1 ? 's' : ''} active {"\u00B7"} {baseline} baseline-only {"\u00B7"} {notMeasuring} not yet measuring
      </p>
      <div className="flex h-2 rounded-full overflow-hidden">
        {active > 0 && <div className="bg-[#EA2C00]" style={{ width: `${(active / total) * 100}%` }} />}
        {baseline > 0 && <div className="bg-[#F5E0D6]" style={{ width: `${(baseline / total) * 100}%` }} />}
        {notMeasuring > 0 && <div className="bg-[#F0F0F0]" style={{ width: `${(notMeasuring / total) * 100}%` }} />}
      </div>
    </div>
  );
}

function SettingInventoryContent({ state, setting, onBack }: { state: MeasureState; setting: MeasureCareSetting; onBack: () => void }) {
  const rows = useMemo(() => getSettingMetricRows(state, setting), [state, setting]);
  const grouped = useMemo(() => groupByDomain(rows), [rows]);
  const nativeData = state.abridgeNativeData || {};
  const filledNative = ABRIDGE_NATIVE_METRICS.filter(m => (nativeData[m.key] ?? 0) > 0);
  const domainOrder = ['Quality', 'Workforce', 'Revenue', 'Capacity', 'Patient Flow', 'Throughput'];

  return (
    <div>
      <div className="rounded-lg p-5 mb-4" style={{ backgroundColor: '#F5F0EB' }}>
        <p className="text-[9px] font-bold uppercase tracking-[2px] text-[#999999] mb-1">ABRIDGE PLATFORM DATA</p>
        <p className="text-xs text-[#666666] mb-3">Pulled directly from your Abridge deployment</p>
        {filledNative.length > 0 ? (
          <div className="space-y-1.5">
            {filledNative.map(m => (
              <div key={m.key} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA2C00]" />
                <span className="text-sm text-[#1A1A1A]">{m.label}</span>
                <span className="text-sm font-semibold text-[#1A1A1A] ml-auto">{formatNumber(nativeData[m.key]!)}{m.suffix ? m.suffix : ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#999999] italic">
            Add your Abridge platform metrics in Step 1 to see them here.
          </p>
        )}
      </div>

      <div className="rounded-lg bg-white border border-[#E5E5E5] p-5">
        <p className="text-[9px] font-bold uppercase tracking-[2px] text-[#999999] mb-1">PARTNER-PROVIDED DATA</p>
        <p className="text-xs text-[#666666] mb-4">Entered from your EHR, billing, and HR systems</p>

        {domainOrder.map(domain => {
          const domainRows = grouped[domain];
          if (!domainRows || domainRows.length === 0) return null;
          return (
            <div key={domain} className="mb-4 last:mb-0">
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-[#999999] mb-2">{domain}</p>
              {domainRows.map(row => (
                <MetricRow key={row.label} row={row} onAdd={row.status === 'not-measuring' ? onBack : undefined} />
              ))}
            </div>
          );
        })}

        <SignalSummaryBar rows={rows} />
      </div>
    </div>
  );
}

export default function MeasureInventory({
  state,
  onNext,
  onBack,
  onHome,
}: MeasureInventoryProps) {
  const context = useMemo(() => deriveEngagementContext(state), [state]);
  const narrative = useMemo(() => generateNarrative('inventory', state), [state]);
  const careSetting = state.careSetting || 'outpatient';

  const activeSettings = useMemo(() => {
    const settings: MeasureCareSetting[] = [];
    const all: MeasureCareSetting[] = ['outpatient', 'ed', 'inpatient', 'nursing'];
    for (const s of all) {
      const d = state.settingData[s];
      if (d && Object.values(d).some(v => v !== 0)) {
        settings.push(s);
      }
    }
    if (settings.length === 0 && careSetting) settings.push(careSetting);
    return settings;
  }, [state, careSetting]);

  const multiSetting = activeSettings.length > 1;
  const [selectedTab, setSelectedTab] = useState<MeasureCareSetting | 'all'>(multiSetting ? 'all' : activeSettings[0]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const settingLabels: Record<MeasureCareSetting, string> = {
    outpatient: 'Outpatient',
    ed: 'Emergency',
    inpatient: 'Inpatient',
    nursing: 'Nursing',
  };

  const totalProviders = state.deployment.providers;
  const totalEncounters = state.deployment.totalEncounters;
  const allRows = useMemo(() => {
    const rows: MetricRowData[] = [];
    for (const s of activeSettings) {
      rows.push(...getSettingMetricRows(state, s));
    }
    return rows;
  }, [state, activeSettings]);
  const activeMetricCount = allRows.filter(r => r.status === 'active').length;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={2}
        totalSteps={8}
        stepName="Measurement Picture"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={state.deployment.organizationName} />

        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            Your Measurement Picture
          </h1>
          <p className="text-base text-[#888888]" data-testid="text-page-subtitle">
            Here{"'"}s what we{"'"}re tracking together {"\u2014"} and where each metric stands.
          </p>
        </motion.div>

        <NarrativePanel narrative={narrative} />

        {multiSetting && (
          <div className="flex items-center gap-2 mb-6" data-testid="setting-tabs">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedTab === 'all' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F0F0F0] text-[#999999] hover:text-[#666666]'}`}
              data-testid="tab-all-settings"
            >
              All Settings
            </button>
            {activeSettings.map(s => (
              <button
                key={s}
                onClick={() => setSelectedTab(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedTab === s ? 'bg-[#1A1A1A] text-white' : 'bg-[#F0F0F0] text-[#999999] hover:text-[#666666]'}`}
                data-testid={`tab-${s}`}
              >
                {settingLabels[s]}
              </button>
            ))}
          </div>
        )}

        {selectedTab === 'all' && multiSetting ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-[#F9F7F4] rounded-lg border border-[#E8E2DA] p-4 mb-6">
              <p className="text-sm text-[#666666]">
                {formatNumber(totalProviders)} providers {"\u00B7"} {formatNumber(totalEncounters)} encounters {"\u00B7"} {activeSettings.length} care setting{activeSettings.length > 1 ? 's' : ''} {"\u00B7"} {activeMetricCount} metrics active
              </p>
            </div>

            {activeSettings.map(s => {
              const stage = deriveSettingStage(state, s);
              const isExpanded = expandedCards.has(s);
              return (
                <div key={s} className="rounded-lg border border-[#E5E5E5] mb-3 overflow-hidden">
                  <button
                    onClick={() => {
                      const next = new Set(expandedCards);
                      if (isExpanded) next.delete(s); else next.add(s);
                      setExpandedCards(next);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#FAFAFA] transition-colors"
                    data-testid={`card-header-${s}`}
                  >
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {settingLabels[s]} {"\u2014"} {stage.months} months {"\u2014"} {stage.maturityLabel}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#999999]" /> : <ChevronDown className="w-4 h-4 text-[#999999]" />}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 overflow-hidden"
                      >
                        <SettingInventoryContent state={state} setting={s} onBack={onBack} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SettingInventoryContent state={state} setting={selectedTab === 'all' ? activeSettings[0] : selectedTab} onBack={onBack} />
          </motion.div>
        )}

        <motion.div
          className="flex justify-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-next"
          >
            What Changed
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
