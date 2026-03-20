import { useMemo, useState } from "react";
import { ArrowRight, Activity, BarChart3, Users, Stethoscope, TrendingUp, TrendingDown, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  formatNumber,
  deriveEngagementContext,
  deriveSettingStage,
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
  metricKey: string;
  domain: string;
  setting: MeasureCareSetting;
  status: 'active' | 'baseline' | 'not-measuring';
  before?: number;
  after?: number;
  delta?: number;
  unit?: string;
  step?: number;
  dataSource?: 'ehr' | 'survey';
}

const reductionMetrics = new Set([
  'timeInNotes', 'timeToClose', 'workOutside', 'chartingTime', 'overtimeHours',
  'denialsPer100', 'doorToDoc', 'lwbsRate', 'fallsRate', 'hapiRate', 'turnoverRate',
  'daysToClose', 'afterHours', 'afterShiftCharting', 'cdiQueriesPer100', 'readmissionRate', 'los',
]);

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
        metricKey: metric.key,
        domain,
        setting,
        status,
        before: before || undefined,
        after: after || undefined,
        delta: Math.abs(delta) > 0 ? delta : undefined,
        unit: metric.suffix,
        step: metric.step,
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

function getSurveyMetricRows(state: MeasureState): MetricRowData[] {
  const rows: MetricRowData[] = [];
  for (const sm of (state.surveyMetrics || [])) {
    if (!sm.label.trim()) continue;
    const delta = sm.after - sm.before;
    let status: 'active' | 'baseline' | 'not-measuring';
    if (sm.before > 0 && sm.after > 0 && Math.abs(delta) > 0) {
      status = 'active';
    } else if (sm.before > 0) {
      status = 'baseline';
    } else {
      status = 'not-measuring';
    }
    rows.push({
      label: sm.label,
      metricKey: `survey_${sm.id}`,
      domain: sm.domain || 'Workforce',
      setting: state.careSetting || 'outpatient',
      status,
      before: sm.before || undefined,
      after: sm.after || undefined,
      delta: Math.abs(delta) > 0 ? delta : undefined,
      unit: sm.unit,
      dataSource: 'survey',
    });
  }
  return rows;
}

const settingLabels: Record<MeasureCareSetting, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

const settingIcons: Record<MeasureCareSetting, typeof Stethoscope> = {
  outpatient: Stethoscope,
  ed: Activity,
  inpatient: BarChart3,
  nursing: Users,
};

const domainOrder = ['Workforce', 'Quality', 'Revenue', 'Capacity', 'Patient Flow', 'Throughput'];

function SignalRing({ active, baseline, total }: { active: number; baseline: number; total: number }) {
  const size = 72;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const activeRatio = total > 0 ? active / total : 0;
  const baselineRatio = total > 0 ? baseline / total : 0;
  const activeLen = circumference * activeRatio;
  const baselineLen = circumference * baselineRatio;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F0F0F0" strokeWidth={stroke} />
        {active > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="#EA2C00" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${activeLen} ${circumference - activeLen}`}
            strokeDashoffset={0}
          />
        )}
        {baseline > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="#F5C6B3" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${baselineLen} ${circumference - baselineLen}`}
            strokeDashoffset={-activeLen}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white" data-testid="text-signal-active-count">{active}</span>
        <span className="text-[8px] uppercase tracking-[1px] text-white/50">active</span>
      </div>
    </div>
  );
}

function MetricDeltaRow({ row, index, isReduction, showSetting, reducedMotion }: { row: MetricRowData; index: number; isReduction: boolean; showSetting?: boolean; reducedMotion?: boolean }) {
  const s = row.step ?? 1;
  const decimals = s < 1 ? Math.ceil(-Math.log10(s)) : 0;
  const formatVal = (v: number) => decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
  const delta = (row.after ?? 0) - (row.before ?? 0);
  const absDelta = Math.abs(delta);
  const pctChange = row.before && row.before !== 0 ? Math.round((absDelta / row.before) * 100) : 0;
  const isPositive = isReduction ? delta < 0 : delta > 0;

  const accentColor = isPositive ? '#2D8A4E' : '#DC2626';
  const bgColor = isPositive ? '#F0FDF4' : '#FEF2F2';
  const DeltaIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      className="flex items-center gap-3 py-3 border-b border-[#F0EBE6] last:border-b-0"
      initial={reducedMotion ? false : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={reducedMotion ? { duration: 0 } : { delay: 0.2 + index * 0.05, duration: 0.4 }}
      data-testid={`metric-row-${row.label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#EA2C00] flex-shrink-0" />
      <span className="text-sm text-[#1A1A1A] flex-1 min-w-0 font-medium">{row.label}</span>
      {row.dataSource === 'survey' && (
        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#7C3AED] font-semibold uppercase tracking-[0.5px] flex-shrink-0">Survey</span>
      )}
      {showSetting && (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F5F0EB] text-[#999999] font-medium flex-shrink-0">{settingLabels[row.setting]}</span>
      )}
      <span className="text-[13px] text-[#999999] tabular-nums hidden sm:inline">{formatVal(row.before ?? 0)}</span>
      <span className="text-[#CCCCCC] hidden sm:inline">{"\u2192"}</span>
      <span className="text-[13px] font-semibold text-[#1A1A1A] tabular-nums">{formatVal(row.after ?? 0)}</span>
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0"
        style={{ backgroundColor: bgColor, color: accentColor }}
      >
        <DeltaIcon className="w-3 h-3" />
        {pctChange > 0 && <span>{pctChange}%</span>}
      </div>
    </motion.div>
  );
}

function BaselineRow({ row, index, reducedMotion }: { row: MetricRowData; index: number; reducedMotion?: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-3 py-2.5 border-b border-[#F5F5F5] last:border-b-0"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { delay: 0.4 + index * 0.04, duration: 0.3 }}
      data-testid={`metric-row-baseline-${row.label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <span className="w-1.5 h-1.5 rounded-full border border-[#CCCCCC] flex-shrink-0" />
      <span className="text-sm text-[#888888] flex-1 min-w-0">{row.label}</span>
      <span className="text-xs text-[#BBBBBB]">baseline: {(row.before ?? 0).toFixed(row.step && row.step < 1 ? Math.ceil(-Math.log10(row.step)) : 0)}</span>
    </motion.div>
  );
}

export default function MeasureInventory({
  state,
  onNext,
  onBack,
  onHome,
}: MeasureInventoryProps) {
  const prefersReducedMotion = useReducedMotion();
  const context = useMemo(() => deriveEngagementContext(state), [state]);
  const narrative = useMemo(() => generateNarrative('inventory', state), [state]);

  const activeSettings = useMemo(() => {
    const settings: MeasureCareSetting[] = [];
    const all: MeasureCareSetting[] = ['outpatient', 'ed', 'inpatient', 'nursing'];
    for (const s of all) {
      const d = state.settingData[s];
      if (d) {
        const hasMetricData = Object.entries(d).some(([k, v]) =>
          (k.endsWith('_before') || k.endsWith('_after')) && v !== 0
        );
        if (hasMetricData) settings.push(s);
      }
    }
    if (settings.length === 0 && state.careSetting) settings.push(state.careSetting);
    return settings;
  }, [state]);

  const [selectedSetting, setSelectedSetting] = useState<MeasureCareSetting | 'all'>('all');

  const allMetricRows = useMemo(() => {
    const rows: MetricRowData[] = [];
    for (const s of activeSettings) {
      rows.push(...getSettingMetricRows(state, s));
    }
    rows.push(...getSurveyMetricRows(state));
    return rows;
  }, [state, activeSettings]);

  const filteredRows = useMemo(() => {
    if (selectedSetting === 'all') return allMetricRows;
    return allMetricRows.filter(r => r.setting === selectedSetting);
  }, [allMetricRows, selectedSetting]);

  const activeRows = filteredRows.filter(r => r.status === 'active');
  const baselineRows = filteredRows.filter(r => r.status === 'baseline');
  const activeCount = activeRows.length;
  const baselineCount = baselineRows.length;

  const groupedActive = useMemo(() => {
    const groups: Record<string, MetricRowData[]> = {};
    for (const r of activeRows) {
      if (!groups[r.domain]) groups[r.domain] = [];
      groups[r.domain].push(r);
    }
    return groups;
  }, [activeRows]);

  const signalCounts = useMemo(() => {
    const a = allMetricRows.filter(r => r.status === 'active').length;
    const b = allMetricRows.filter(r => r.status === 'baseline').length;
    const n = allMetricRows.filter(r => r.status === 'not-measuring').length;
    const t = allMetricRows.length;
    return { active: a, baseline: b, notMeasuring: n, total: t };
  }, [allMetricRows]);

  const totalProviders = state.deployment.providers;
  const totalEncounters = state.deployment.totalEncounters;
  const nativeData = state.abridgeNativeData || {};
  const filledNative = ABRIDGE_NATIVE_METRICS.filter(m => (nativeData[m.key] ?? 0) > 0);

  const settingStages = useMemo(() => {
    const stages: Record<string, { maturityLabel: string; months: number; activeCount: number }> = {};
    for (const s of activeSettings) {
      const stage = deriveSettingStage(state, s);
      const sRows = getSettingMetricRows(state, s);
      stages[s] = {
        maturityLabel: stage.maturityLabel,
        months: stage.months,
        activeCount: sRows.filter(r => r.status === 'active').length,
      };
    }
    return stages;
  }, [state, activeSettings]);

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
          className="text-center mb-8"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            Your Measurement Picture
          </h1>
          <p className="text-base text-[#888888]" data-testid="text-page-subtitle">
            Here{"\u2019"}s what your data shows {"\u2014"} at a glance.
          </p>
        </motion.div>

        <NarrativePanel narrative={narrative} />

        <motion.div
          className="rounded-2xl bg-[#1A1A1A] p-6 mb-6"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1, duration: 0.5 }}
          data-testid="stats-header"
        >
          <div className="flex items-center gap-6">
            <SignalRing active={signalCounts.active} baseline={signalCounts.baseline} total={signalCounts.total} />

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-providers">{formatNumber(totalProviders)}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-[1.5px] mt-0.5">Providers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-encounters">{formatNumber(totalEncounters)}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-[1.5px] mt-0.5">Encounters</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-settings">{activeSettings.length}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-[1.5px] mt-0.5">Settings</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-active-metrics">{signalCounts.active}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-[1.5px] mt-0.5">Metrics Active</p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                <span className="text-white/60">{signalCounts.active} Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F5C6B3]" />
                <span className="text-white/60">{signalCounts.baseline} Baseline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white/20" />
                <span className="text-white/60">{signalCounts.notMeasuring} Not yet</span>
              </div>
              <div className="ml-auto">
                <div className="flex h-1.5 rounded-full overflow-hidden w-28">
                  {signalCounts.active > 0 && (
                    <div className="bg-[#EA2C00]" style={{ width: `${(signalCounts.active / signalCounts.total) * 100}%` }} />
                  )}
                  {signalCounts.baseline > 0 && (
                    <div className="bg-[#F5C6B3]" style={{ width: `${(signalCounts.baseline / signalCounts.total) * 100}%` }} />
                  )}
                  {signalCounts.notMeasuring > 0 && (
                    <div className="bg-white/20" style={{ width: `${(signalCounts.notMeasuring / signalCounts.total) * 100}%` }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {activeSettings.length > 1 && (
          <motion.div
            className="flex flex-wrap items-center gap-2 mb-6"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2 }}
            data-testid="setting-tabs"
          >
            <button
              onClick={() => setSelectedSetting('all')}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all border ${
                selectedSetting === 'all'
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-white text-[#666666] border-[#E5E5E5] hover:border-[#CCCCCC]'
              }`}
              data-testid="tab-all-settings"
            >
              All Settings
            </button>
            {activeSettings.map(s => {
              const Icon = settingIcons[s];
              const stage = settingStages[s];
              return (
                <button
                  key={s}
                  onClick={() => setSelectedSetting(s)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all border ${
                    selectedSetting === s
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                      : 'bg-white text-[#666666] border-[#E5E5E5] hover:border-[#CCCCCC]'
                  }`}
                  data-testid={`tab-${s}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{settingLabels[s]}</span>
                  {stage?.maturityLabel && (
                    <span className={`text-[9px] ${selectedSetting === s ? 'text-white/60' : 'text-[#BBBBBB]'}`}>
                      {stage.maturityLabel}
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    selectedSetting === s ? 'bg-white/20 text-white' : 'bg-[#F0F0F0] text-[#999999]'
                  }`}>
                    {stage?.activeCount || 0}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}

        <motion.div
          className="rounded-xl bg-[#F9F7F4] border border-[#E8E2DA] p-5 mb-6"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.25, duration: 0.4 }}
          data-testid="abridge-platform-data"
        >
          <div className="flex items-center gap-2 mb-3">
            <CircleDot className="w-3.5 h-3.5 text-[#EA2C00]" />
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#999999]">Abridge Platform</p>
          </div>
          {filledNative.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {filledNative.map((m, i) => (
                <motion.div
                  key={m.key}
                  className="bg-white rounded-lg px-3 py-2.5"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3 + i * 0.05, duration: 0.3 }}
                >
                  <p className="text-lg font-bold text-[#1A1A1A]">{formatNumber(nativeData[m.key]!)}{m.suffix || ''}</p>
                  <p className="text-[9px] text-[#999999] uppercase tracking-[1px] mt-0.5">{m.label}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#999999] italic">
              Add your Abridge platform metrics in Data Entry to see them here.
            </p>
          )}
        </motion.div>

        {activeRows.length > 0 && (
          <motion.div
            className="mb-6"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3, duration: 0.4 }}
            data-testid="active-metrics-section"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-[#EA2C00]" />
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#999999]">
                Active Signals
              </p>
              <span className="text-[10px] text-[#BBBBBB] ml-1">{activeCount} metric{activeCount !== 1 ? 's' : ''} with before {"\u2192"} after</span>
            </div>

            {domainOrder.map(domain => {
              const domainRows = groupedActive[domain];
              if (!domainRows || domainRows.length === 0) return null;
              let idx = 0;
              return (
                <div key={domain} className="mb-4 last:mb-0">
                  <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1 ml-1">{domain}</p>
                  <div className="rounded-xl border border-[#F0EBE6] bg-white overflow-hidden">
                    <div className="px-4">
                      {domainRows.map((row) => {
                        const i = idx++;
                        return (
                          <MetricDeltaRow
                            key={`${row.setting}-${row.label}`}
                            row={row}
                            index={i}
                            isReduction={reductionMetrics.has(row.metricKey)}
                            showSetting={selectedSetting === 'all' && activeSettings.length > 1}
                            reducedMotion={!!prefersReducedMotion}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {baselineRows.length > 0 && (
          <motion.div
            className="mb-6"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5, duration: 0.4 }}
            data-testid="baseline-metrics-section"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-[#F5C6B3]" />
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#BBBBBB]">
                Baseline Only
              </p>
              <span className="text-[10px] text-[#CCCCCC] ml-1">{baselineCount} metric{baselineCount !== 1 ? 's' : ''} awaiting post-Abridge data</span>
            </div>
            <div className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] overflow-hidden px-4">
              {baselineRows.map((row, i) => (
                <BaselineRow key={`${row.setting}-${row.label}`} row={row} index={i} reducedMotion={!!prefersReducedMotion} />
              ))}
            </div>
          </motion.div>
        )}

        {activeRows.length === 0 && baselineRows.length === 0 && (
          <motion.div
            className="rounded-xl border border-[#E8E2DA] bg-[#F9F7F4] p-8 text-center mb-6"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3 }}
          >
            <p className="text-sm text-[#888888]">No metric data entered yet. Go back to add before & after values.</p>
            <Button
              onClick={onBack}
              variant="outline"
              className="mt-4 text-sm"
              data-testid="button-go-back"
            >
              Back to Data Entry
            </Button>
          </motion.div>
        )}

        <motion.div
          className="flex justify-center mt-8"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5 }}
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
