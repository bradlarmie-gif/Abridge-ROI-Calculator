import { useMemo, useState } from "react";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  type DomainStatus,
  formatNumber,
  deriveEngagementContext,
  computeDomainStatus,
  getMonthsFromGoLive,
} from "@/lib/measureCalculator";
import {
  CARE_SETTING_CONFIGS,
  CARE_SETTING_ORDER,
  getTotalAvailableMetrics,
  getSettingDomains,
  type DomainKey,
} from "@/lib/measureCareSettings";
import { EngagementContextBar } from "@/components/measure/EngagementContextBar";
import NarrativePanel from "@/components/measure/NarrativePanel";
import { generateNarrative } from "@/lib/measureNarrative";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface MeasureJourneyProps {
  state: MeasureState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  mode?: 'build' | 'present';
}

const reductionMetrics = new Set([
  'timeInNotes', 'timeToClose', 'workOutside', 'chartingTime', 'overtimeHours',
  'denialsPer100', 'doorToDoc', 'lwbsRate', 'fallsRate', 'hapiRate', 'turnoverRate',
  'daysToClose', 'afterHours', 'afterShiftCharting', 'cdiQueriesPer100', 'readmissionRate', 'los',
]);

const DOMAIN_COLORS: Record<string, string> = {
  workforce: '#6366F1',
  revenue: '#EA580C',
  quality: '#2D8A4E',
  capacity: '#0891B2',
  throughput: '#0891B2',
  patientFlow: '#0891B2',
};

const DOMAIN_QUESTIONS: Record<string, string> = {
  workforce: 'Has clinician relief translated into tangible benefits?',
  revenue: 'Has documentation quality reached the bottom line?',
  quality: 'Has documentation quality traveled downstream?',
  capacity: 'What is the organization doing with the freed time?',
  throughput: 'How has patient flow improved?',
  patientFlow: 'What is the impact on patient movement?',
};

interface MetricRowData {
  label: string;
  metricKey: string;
  domain: string;
  domainKey: string;
  setting: MeasureCareSetting;
  status: 'active' | 'baseline' | 'not-measuring';
  before?: number;
  after?: number;
  delta?: number;
  unit?: string;
  step?: number;
  dataSource?: 'ehr' | 'survey';
}

function getSettingMetricRows(state: MeasureState, setting: MeasureCareSetting): MetricRowData[] {
  const config = CARE_SETTING_CONFIGS[setting];
  const settingData = state.settingData[setting] || {};
  const rows: MetricRowData[] = [];
  const enabledMap = state.enabledMetrics?.[setting] || {};

  for (const section of config.metricSections) {
    for (const metric of section.metrics) {
      if (!metric.hasBeforeAfter) continue;

      const isEnabled = !!enabledMap[metric.key];
      const before = settingData[`${metric.key}_before`] ?? 0;
      const after = settingData[`${metric.key}_after`] ?? 0;
      const delta = after - before;

      let status: 'active' | 'baseline' | 'not-measuring';
      if (!isEnabled) {
        status = 'not-measuring';
      } else if (before > 0 && after > 0 && Math.abs(delta) > 0) {
        status = 'active';
      } else if (before > 0) {
        status = 'baseline';
      } else {
        status = 'not-measuring';
      }

      const domainKeyMap: Record<string, string> = {
        workforce: 'Workforce', revenue: 'Revenue', quality: 'Quality',
        capacity: 'Capacity', throughput: 'Throughput', patientFlow: 'Patient Flow',
      };

      rows.push({
        label: metric.label.replace(/ \(.*\)/, ''),
        metricKey: metric.key,
        domain: domainKeyMap[section.key] || section.label,
        domainKey: section.key,
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

  if ((setting === 'outpatient' || setting === 'ed') && enabledMap['timeInNotes']) {
    const te = state.timeEfficiency;
    if (te.timeInNotesWithout > 0 || te.timeInNotesWith > 0) {
      const existing = rows.find(r => r.metricKey === 'timeInNotes');
      if (existing) {
        existing.before = te.timeInNotesWithout || existing.before;
        existing.after = te.timeInNotesWith || existing.after;
        const d = (te.timeInNotesWith || 0) - (te.timeInNotesWithout || 0);
        existing.status = te.timeInNotesWithout > 0 && te.timeInNotesWith > 0 && Math.abs(d) > 0 ? 'active' : te.timeInNotesWithout > 0 ? 'baseline' : 'not-measuring';
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
      domainKey: (sm.domain || 'Workforce').toLowerCase(),
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

function DomainProgressCard({
  domainKey,
  domainLabel,
  status,
  activeRows,
  baselineRows,
  totalMetrics,
  delay = 0,
  reducedMotion,
}: {
  domainKey: string;
  domainLabel: string;
  status: DomainStatus;
  activeRows: MetricRowData[];
  baselineRows: MetricRowData[];
  totalMetrics: number;
  delay?: number;
  reducedMotion?: boolean;
}) {
  const muted = status === 'no-data';
  const color = DOMAIN_COLORS[domainKey] || '#999';
  const question = DOMAIN_QUESTIONS[domainKey] || '';
  const measuredCount = activeRows.length + baselineRows.length;

  return (
    <motion.div
      className={`rounded-xl border p-5 transition-all ${muted ? 'bg-[#FAFAFA] border-[#F0F0F0]' : 'bg-white border-[#E5E5E5] hover:shadow-sm'}`}
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { delay, duration: 0.4 }}
      data-testid={`domain-progress-${domainKey}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <h3 className={`text-xs font-bold uppercase tracking-[1.5px] ${muted ? 'text-[#CCCCCC]' : 'text-[#1A1A1A]'}`}>
            {domainLabel}
          </h3>
        </div>
        <StatusBadge status={status} />
      </div>

      {!muted && activeRows.length > 0 ? (
        <div className="space-y-0">
          {activeRows.map((row, i) => {
            const s = row.step ?? 1;
            const decimals = s < 1 ? Math.ceil(-Math.log10(s)) : 0;
            const formatVal = (v: number) => decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
            const delta = (row.after ?? 0) - (row.before ?? 0);
            const absDelta = Math.abs(delta);
            const pctChange = row.before && row.before !== 0 ? Math.round((absDelta / row.before) * 100) : 0;
            const isReduction = reductionMetrics.has(row.metricKey);
            const isPositive = isReduction ? delta < 0 : delta > 0;
            const accentColor = isPositive ? '#2D8A4E' : '#DC2626';
            const bgColor = isPositive ? '#F0FDF4' : '#FEF2F2';
            const DeltaIcon = isPositive ? TrendingUp : TrendingDown;

            return (
              <motion.div
                key={row.metricKey}
                className="flex items-center gap-3 py-2.5 border-b border-[#F0EBE6] last:border-b-0"
                initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reducedMotion ? { duration: 0 } : { delay: delay + 0.1 + i * 0.05, duration: 0.4 }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-sm text-[#1A1A1A] flex-1 min-w-0 font-medium">{row.label}</span>
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
          })}
        </div>
      ) : (
        <div className="py-3 text-center">
          <p className={`text-xs italic ${muted ? 'text-[#CCCCCC]' : 'text-[#999999]'}`}>
            {muted ? question : baselineRows.length > 0 ? `${baselineRows.length} baseline metric${baselineRows.length > 1 ? 's' : ''} set` : 'No data entered yet'}
          </p>
        </div>
      )}

      {totalMetrics > 0 && (
        <div className="mt-3 pt-2 border-t border-[#F0F0F0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#BBBBBB]">{measuredCount}/{totalMetrics} measured</span>
            <div className="flex h-1 rounded-full overflow-hidden w-16 bg-[#F0F0F0]">
              <div className="rounded-full transition-all" style={{ width: `${(measuredCount / totalMetrics) * 100}%`, backgroundColor: color }} />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StatusBadge({ status }: { status: DomainStatus }) {
  if (status === 'signaling' || status === 'validated') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Active</span>;
  }
  if (status === 'baseline-only') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">Baseline</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">Pre-Signal</span>;
}

const TREND_METRIC_OPTIONS = [
  { key: 'timeInNotes', label: 'Time in Notes', unit: 'min' },
  { key: 'wrvu', label: 'wRVU', unit: '' },
  { key: 'emLevel', label: 'E/M Level', unit: '' },
  { key: 'sameDayClosure', label: 'Same-Day Closure', unit: '%' },
];

function TrendChart({ state, selectedMetric }: { state: MeasureState; selectedMetric: string }) {
  const data = state.trendConfig.monthlyData[selectedMetric as keyof typeof state.trendConfig.monthlyData] || [];
  if (data.length < 2) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-[#CCCCCC] italic">
        Add at least 2 months of trend data to see the chart
      </div>
    );
  }

  const chartData = data.map((val, i) => ({ month: `M${i + 1}`, value: val }));
  const metricDef = TREND_METRIC_OPTIONS.find(m => m.key === selectedMetric);
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);

  return (
    <div className="h-[220px]" data-testid="trend-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#999' }} />
          <YAxis tick={{ fontSize: 10, fill: '#999' }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E5E5' }}
            formatter={(value: number) => [`${value}${metricDef?.unit || ''}`, metricDef?.label || '']}
          />
          <Line type="monotone" dataKey="value" stroke="#EA2C00" strokeWidth={2} dot={{ fill: '#EA2C00', r: 3 }} />
          {months >= 3 && <ReferenceLine x="M3" stroke="#E5E5E5" strokeDasharray="3 3" label={{ value: 'Phase 2', fontSize: 9, fill: '#CCC' }} />}
          {months >= 6 && <ReferenceLine x="M6" stroke="#E5E5E5" strokeDasharray="3 3" label={{ value: 'Phase 3', fontSize: 9, fill: '#CCC' }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MeasureJourney({
  state,
  onNext,
  onBack,
  onHome,
  mode = 'build',
}: MeasureJourneyProps) {
  const prefersReducedMotion = useReducedMotion();
  const context = useMemo(() => deriveEngagementContext(state), [state]);
  const domainStatus = useMemo(() => computeDomainStatus(state), [state]);
  const narrative = useMemo(() => generateNarrative('inventory', state), [state]);
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);

  const [trendMetric, setTrendMetric] = useState('timeInNotes');
  const hasTrendData = state.trendConfig.enabled && Object.values(state.trendConfig.monthlyData).some(arr => arr.length >= 2);

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

  const allMetricRows = useMemo(() => {
    const rows: MetricRowData[] = [];
    for (const s of activeSettings) {
      rows.push(...getSettingMetricRows(state, s));
    }
    rows.push(...getSurveyMetricRows(state));
    return rows;
  }, [state, activeSettings]);

  const signalCounts = useMemo(() => {
    const a = allMetricRows.filter(r => r.status === 'active').length;
    const b = allMetricRows.filter(r => r.status === 'baseline').length;
    const n = allMetricRows.filter(r => r.status === 'not-measuring').length;
    let total = 0;
    for (const s of activeSettings) {
      total += getTotalAvailableMetrics(s);
    }
    total += (state.surveyMetrics || []).filter(sm => sm.label.trim()).length;
    return { active: a, baseline: b, notMeasuring: n, total };
  }, [allMetricRows, activeSettings, state.surveyMetrics]);

  const measuredCount = allMetricRows.filter(r => r.status === 'active' || r.status === 'baseline').length;

  const domainRows = useMemo(() => {
    const grouped: Record<string, { active: MetricRowData[]; baseline: MetricRowData[]; total: number }> = {};
    const allDomainKeys = new Set<string>();
    for (const s of activeSettings) {
      const domains = getSettingDomains(s);
      for (const d of domains) {
        allDomainKeys.add(d.key);
        if (!grouped[d.key]) grouped[d.key] = { active: [], baseline: [], total: 0 };
        const section = CARE_SETTING_CONFIGS[s].metricSections.find(sec => sec.key === d.key);
        if (section) {
          grouped[d.key].total += section.metrics.filter(m => m.hasBeforeAfter).length;
        }
      }
    }
    for (const r of allMetricRows) {
      const dk = r.domainKey;
      if (!grouped[dk]) grouped[dk] = { active: [], baseline: [], total: 0 };
      if (r.status === 'active') grouped[dk].active.push(r);
      else if (r.status === 'baseline') grouped[dk].baseline.push(r);
    }
    return grouped;
  }, [allMetricRows, activeSettings]);

  const primarySetting = activeSettings[0] || 'outpatient';
  const settingDomains = getSettingDomains(primarySetting);

  const domainStatusMap: Record<string, DomainStatus> = {
    workforce: domainStatus.workforce,
    revenue: domainStatus.revenue,
    quality: domainStatus.quality,
    capacity: domainStatus.capacity,
    throughput: domainStatus.capacity,
    patientFlow: domainStatus.capacity,
  };

  const orgName = state.deployment.organizationName || 'Your Organization';
  const activeCount = signalCounts.active;
  const positiveMovement = allMetricRows.filter(r => {
    if (r.status !== 'active') return false;
    const delta = (r.after ?? 0) - (r.before ?? 0);
    const isReduction = reductionMetrics.has(r.metricKey);
    return isReduction ? delta < 0 : delta > 0;
  }).length;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={3}
        totalSteps={8}
        stepName="Journey Dashboard"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {mode === 'present' && (
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2" data-testid="text-present-org-name">
              {orgName}
            </h1>
            <p className="text-sm text-[#999999]">
              Partnership with Abridge {"\u00B7"} {months} months {"\u00B7"} {state.deployment.providers} providers
            </p>
          </motion.div>
        )}

        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={mode !== 'present' ? state.deployment.organizationName : undefined} />

        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            Your Journey Dashboard
          </h1>
          <p className="text-base text-[#888888]" data-testid="text-page-subtitle">
            Domain-level progress across your Abridge deployment.
          </p>
        </motion.div>

        <NarrativePanel narrative={narrative} mode={mode} />

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
                <p className="text-2xl font-bold text-white" data-testid="stat-providers">{formatNumber(state.deployment.providers)}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-[1.5px] mt-0.5">Providers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-encounters">{formatNumber(state.deployment.totalEncounters)}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-[1.5px] mt-0.5">Encounters</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-settings">{activeSettings.length}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-[1.5px] mt-0.5">Settings</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white" data-testid="stat-active-metrics">
                  {measuredCount}<span className="text-base text-white/40 font-normal">/{signalCounts.total}</span>
                </p>
                <p className="text-[10px] text-white/50 uppercase tracking-[1.5px] mt-0.5">Measuring</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {settingDomains.map((domain, i) => {
            const dr = domainRows[domain.key] || { active: [], baseline: [], total: 0 };
            return (
              <DomainProgressCard
                key={domain.key}
                domainKey={domain.key}
                domainLabel={domain.label}
                status={domainStatusMap[domain.key] || 'no-data'}
                activeRows={dr.active}
                baselineRows={dr.baseline}
                totalMetrics={dr.total}
                delay={0.15 + i * 0.05}
                reducedMotion={!!prefersReducedMotion}
              />
            );
          })}
        </div>

        {hasTrendData && (
          <motion.div
            className="rounded-lg border border-[#E5E5E5] p-5 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            data-testid="section-trend-view"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A]">Month-over-Month Trend</h3>
              <div className="flex gap-1">
                {TREND_METRIC_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setTrendMetric(opt.key)}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${trendMetric === opt.key ? 'bg-[#EA2C00] text-white' : 'bg-[#F5F5F5] text-[#999999] hover:text-[#666666]'}`}
                    data-testid={`trend-metric-${opt.key}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <TrendChart state={state} selectedMetric={trendMetric} />
          </motion.div>
        )}

        <motion.p
          className="text-sm text-[#666666] text-center italic mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          data-testid="text-metric-summary"
        >
          {positiveMovement} of {activeCount} active metrics showing positive movement.
        </motion.p>

        <motion.div
          className="flex justify-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-next"
          >
            Your Stage
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
