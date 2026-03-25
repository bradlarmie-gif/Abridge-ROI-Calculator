import { useMemo, useState } from "react";
import { ArrowRight, TrendingUp, TrendingDown, Minus, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  ABRIDGE_NATIVE_METRICS,
  getMetricLabel,
  getMetricSuffix,
  OUTPATIENT_METRICS,
  type DomainKey,
  type MetricDefinition,
} from "@/lib/measureCareSettings";
import { formatCurrency } from "@/lib/measureCalculator";
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
  'time_in_note', 'work_outside_work_empirical', 'denial_rate', 'staff_turnover_rate',
  'annual_turnover', 'readmission_rate', 'patient_wait_time',
]);

const DOMAIN_COLORS: Record<string, string> = {
  workforce: '#6366F1',
  revenue: '#EA580C',
  quality: '#2D8A4E',
  capacity: '#0891B2',
  throughput: '#0891B2',
  patientFlow: '#0891B2',
  foundational: '#9333EA',
};

const DOMAIN_QUESTIONS: Record<string, string> = {
  workforce: 'Has clinician relief translated into tangible benefits?',
  revenue: 'Has documentation quality reached the bottom line?',
  quality: 'Has documentation quality traveled downstream?',
  capacity: 'What is the organization doing with the freed time?',
  throughput: 'How has patient flow improved?',
  patientFlow: 'What is the impact on patient movement?',
  foundational: 'Is the Abridge platform being adopted and used effectively?',
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

const OUTPATIENT_LEGACY_KEY_MAP: Record<string, string> = {
  time_in_note: 'timeInNotes',
  same_day_closure: 'sameDayClosure',
  wrvu: 'wrvuPerEncounter',
  em_level: 'emLevel',
  work_outside_work_empirical: 'afterHours',
  time_to_close: 'daysToClose',
};

function getOutpatientMetricRows(state: MeasureState): MetricRowData[] {
  const rows: MetricRowData[] = [];
  const om = state.outpatientMetrics || {};
  const sd = state.settingData?.outpatient || {};
  const enabledMap = state.enabledMetrics?.outpatient || {};

  const domainKeyMap: Record<string, string> = {
    workforce: 'Workforce', revenue: 'Revenue', quality: 'Quality',
    capacity: 'Capacity', foundational: 'Foundational',
  };

  for (const metric of OUTPATIENT_METRICS) {
    if (metric.phase3Roadmap) continue;

    const mv = om[metric.id];

    if (metric.inputType === 'single') {
      const singleVal = mv?.singleValue ?? 0;
      const status: 'active' | 'baseline' | 'not-measuring' = singleVal > 0 ? 'active' : 'not-measuring';

      rows.push({
        label: metric.label,
        metricKey: metric.id,
        domain: domainKeyMap[metric.domain] || metric.domain,
        domainKey: metric.domain,
        setting: 'outpatient',
        status,
        after: singleVal || undefined,
        unit: metric.unit,
        step: 0.1,
      });
      continue;
    }

    let before = mv?.before ?? 0;
    let after = mv?.after ?? 0;

    if (before === 0 && after === 0) {
      const legacyKey = OUTPATIENT_LEGACY_KEY_MAP[metric.id];
      if (legacyKey) {
        const lb = sd[`${legacyKey}_before`] ?? 0;
        const la = sd[`${legacyKey}_after`] ?? 0;
        if (lb > 0 || la > 0) {
          before = lb;
          after = la;
        }
      }
    }

    const delta = after - before;

    let status: 'active' | 'baseline' | 'not-measuring';
    if (before > 0 && after > 0 && Math.abs(delta) > 0) {
      status = 'active';
    } else if (before > 0) {
      status = 'baseline';
    } else {
      status = 'not-measuring';
    }

    rows.push({
      label: metric.label,
      metricKey: metric.id,
      domain: domainKeyMap[metric.domain] || metric.domain,
      domainKey: metric.domain,
      setting: 'outpatient',
      status,
      before: before || undefined,
      after: after || undefined,
      delta: Math.abs(delta) > 0 ? delta : undefined,
      unit: metric.unit,
      step: metric.unit === 'wRVU' || metric.unit === 'ratio' || metric.unit === 'level' ? 0.01 : metric.unit === '%' ? 0.1 : 1,
    });
  }

  return rows;
}

function getSettingMetricRows(state: MeasureState, setting: MeasureCareSetting): MetricRowData[] {
  if (setting === 'outpatient') {
    return getOutpatientMetricRows(state);
  }

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

  if (setting === 'ed' && enabledMap['timeInNotes']) {
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

function getSurveyMetricRows(state: MeasureState, activeSettings: MeasureCareSetting[]): MetricRowData[] {
  const rows: MetricRowData[] = [];
  for (const sm of (state.surveyMetrics || [])) {
    if (!sm.label.trim()) continue;
    const smSetting = sm.setting || state.careSetting || 'outpatient';
    if (!activeSettings.includes(smSetting)) continue;
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
      setting: smSetting,
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

function renderPlainEnglish(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val));
  }
  return result;
}

function getMetricInterpretation(row: MetricRowData, state: MeasureState): string | null {
  const metricDef = OUTPATIENT_METRICS.find(m => m.id === row.metricKey);
  if (!metricDef) return null;
  if (!row.before || !row.after) return null;

  const delta = Math.abs((row.after ?? 0) - (row.before ?? 0));
  const adoptedEncounters = state.deployment.abridgeEncounters > 0
    ? state.deployment.abridgeEncounters
    : Math.round(state.deployment.totalEncounters * (state.deployment.encounterCoverageRate / 100));
  const totalHours = metricDef.unit === 'min' ? Math.round((delta * adoptedEncounters) / 60) : 0;
  const total = metricDef.unit === 'count' ? delta * state.deployment.providers : 0;
  const cf = state.calibration?.conversionFactor ?? 33;
  const wrvuValue = metricDef.id === 'wrvu' ? formatCurrency(delta * adoptedEncounters * cf * 0.5) : '';

  const fmtDelta = delta < 1 ? delta.toFixed(2) : delta < 10 ? delta.toFixed(1) : Math.round(delta).toString();

  return renderPlainEnglish(metricDef.plainEnglishTemplate, {
    delta: fmtDelta,
    before: row.before < 1 ? row.before.toFixed(2) : row.before < 10 ? row.before.toFixed(1) : Math.round(row.before).toString(),
    after: row.after < 1 ? row.after.toFixed(2) : row.after < 10 ? row.after.toFixed(1) : Math.round(row.after).toString(),
    encounters: formatNumber(adoptedEncounters),
    providers: String(state.deployment.providers),
    totalHours: formatNumber(totalHours),
    total: formatNumber(total),
    value: wrvuValue,
    cf: String(cf),
    unit: metricDef.unitLabel,
  });
}

function getPhase3MetricsForDomain(domainKey: string): MetricDefinition[] {
  return OUTPATIENT_METRICS.filter(m => {
    if (!m.phase3Roadmap) return false;
    return m.domain === domainKey;
  });
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
  state,
  isOutpatient = false,
}: {
  domainKey: string;
  domainLabel: string;
  status: DomainStatus;
  activeRows: MetricRowData[];
  baselineRows: MetricRowData[];
  totalMetrics: number;
  delay?: number;
  reducedMotion?: boolean;
  state?: MeasureState;
  isOutpatient?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const muted = status === 'no-data';
  const color = DOMAIN_COLORS[domainKey] || '#999';
  const question = DOMAIN_QUESTIONS[domainKey] || '';
  const measuredCount = activeRows.length + baselineRows.length;
  const phase3Items = isOutpatient ? getPhase3MetricsForDomain(domainKey) : [];

  return (
    <motion.div
      className={`rounded-xl border overflow-hidden transition-all shadow-sm ${muted ? 'bg-[#F5F3F0] border-[#E8E2DA]' : 'bg-[#FAF8F5] border-[#E8E2DA] hover:shadow-md'}`}
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { delay, duration: 0.4 }}
      data-testid={`domain-progress-${domainKey}`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
        data-testid={`domain-toggle-${domainKey}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <h3 className={`text-xs font-bold uppercase tracking-[1.5px] ${muted ? 'text-[#BBBBBB]' : 'text-[#4A4A4A]'}`}>
            {domainLabel}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <ChevronRight
            className={`w-4 h-4 text-[#BBBBBB] transition-transform duration-200 group-hover:text-[#888888] ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">
              {!muted && activeRows.length > 0 ? (
                <div className="space-y-0">
                  {activeRows.map((row, i) => {
                    const s = row.step ?? 1;
                    const decimals = s < 1 ? Math.ceil(-Math.log10(s)) : 0;
                    const formatVal = (v: number) => decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
                    const isSingleValue = !row.before && row.after;
                    const delta = isSingleValue ? 0 : (row.after ?? 0) - (row.before ?? 0);
                    const absDelta = Math.abs(delta);
                    const pctChange = row.before && row.before !== 0 ? Math.round((absDelta / row.before) * 100) : 0;
                    const isReduction = reductionMetrics.has(row.metricKey);
                    const isPositive = isSingleValue ? true : (isReduction ? delta < 0 : delta > 0);
                    const accentColor = isPositive ? '#2D8A4E' : '#DC2626';
                    const bgColor = isPositive ? '#F0FDF4' : '#FEF2F2';
                    const DeltaIcon = isPositive ? TrendingUp : TrendingDown;
                    const interpretation = isOutpatient && state ? getMetricInterpretation(row, state) : null;
                    const metricDef = isOutpatient ? OUTPATIENT_METRICS.find(m => m.id === row.metricKey) : null;

                    return (
                      <motion.div
                        key={row.metricKey}
                        className="py-2.5 border-b border-[#E8E2DA]/50 last:border-b-0"
                        initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={reducedMotion ? { duration: 0 } : { delay: delay + 0.1 + i * 0.05, duration: 0.4 }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-sm text-[#1A1A1A] flex-1 min-w-0 font-medium">{row.label}</span>
                          {isSingleValue ? (
                            <>
                              <span className="text-[13px] font-semibold text-[#1A1A1A] tabular-nums">
                                {formatVal(row.after!)}{metricDef?.unit === '%' ? '%' : ''}
                              </span>
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 bg-blue-50 text-blue-700">
                                <CheckCircle2 className="w-3 h-3" />
                              </div>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                        {interpretation && (
                          <p className="text-[11px] text-[#888888] mt-1 ml-4 italic" data-testid={`interpretation-${row.metricKey}`}>
                            {interpretation}
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-2 text-center">
                  <p className={`text-xs italic ${muted ? 'text-[#CCCCCC]' : 'text-[#999999]'}`}>
                    {muted ? question : baselineRows.length > 0 ? `${baselineRows.length} baseline metric${baselineRows.length > 1 ? 's' : ''} set` : 'No data entered yet'}
                  </p>
                </div>
              )}

              {phase3Items.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#E8E2DA]/50" data-testid={`phase3-${domainKey}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold text-[#BBBBBB] uppercase tracking-[1px]">What's next</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-gray-100 text-gray-500">Phase 3</span>
                  </div>
                  <div className="space-y-1">
                    {phase3Items.map(m => (
                      <div key={m.id} className="flex items-center gap-2">
                        <span className="text-[11px] text-[#999999]">{m.label}</span>
                        <span className="text-[9px] text-[#CCCCCC] italic">Available at 6–18 months</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalMetrics > 0 && (
                <div className="mt-3 pt-2 border-t border-[#E8E2DA]/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#BBBBBB]">{measuredCount}/{totalMetrics} measured</span>
                    <div className="flex h-1 rounded-full overflow-hidden w-16 bg-[#E8E2DA]/40">
                      <div className="rounded-full transition-all" style={{ width: `${(measuredCount / totalMetrics) * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

function AbridgeFootprintRow({ nativeData }: { nativeData: Partial<Record<string, number>> }) {
  const filledMetrics = ABRIDGE_NATIVE_METRICS.filter(m => (nativeData[m.key] ?? 0) > 0);
  if (filledMetrics.length === 0) return null;

  return (
    <motion.div
      className="flex items-center gap-4 flex-wrap mb-6 py-3 px-4 bg-[#F9F7F4] rounded-lg border border-[#E8E2DA]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.05 }}
      data-testid="abridge-footprint-row"
    >
      <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#999999]">Abridge Footprint</span>
      <span className="text-[#E5E5E5]">|</span>
      {filledMetrics.map((m) => (
        <div key={m.key} className="flex items-center gap-1">
          <span className="text-sm font-semibold text-[#1A1A1A]">
            {formatNumber(nativeData[m.key]!)}{m.suffix ? m.suffix : ''}
          </span>
          <span className="text-[10px] text-[#999999]">{m.label}</span>
        </div>
      ))}
    </motion.div>
  );
}

function PointComparison({ label, nonAbridge, withAbridge, unit, delay = 0 }: {
  label: string;
  nonAbridge: number;
  withAbridge: number;
  unit?: string;
  delay?: number;
}) {
  if (nonAbridge === 0 && withAbridge === 0) return null;
  const delta = withAbridge - nonAbridge;
  const deltaPercent = nonAbridge !== 0 ? ((delta / nonAbridge) * 100) : 0;
  const improved = delta > 0;
  const suffix = unit || '';

  return (
    <motion.div
      className="flex items-center gap-3 py-1.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      <span className="text-sm text-[#666666] w-[140px] flex-shrink-0 truncate">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-medium text-[#999999]">{nonAbridge.toFixed(nonAbridge % 1 ? 2 : 0)}{suffix}</span>
        <div className="flex-1 h-px bg-[#E5E5E5] relative mx-1">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#CCCCCC]" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#EA2C00]" />
        </div>
        <span className="text-sm font-semibold text-[#1A1A1A]">{withAbridge.toFixed(withAbridge % 1 ? 2 : 0)}{suffix}</span>
      </div>
      {delta !== 0 && (
        <span className={`text-xs font-medium ${improved ? 'text-green-600' : 'text-red-500'} flex-shrink-0`}>
          {improved ? '+' : ''}{delta.toFixed(delta % 1 ? 2 : 1)}{suffix} ({improved ? '+' : ''}{deltaPercent.toFixed(1)}%)
        </span>
      )}
    </motion.div>
  );
}

function getAvailableTrendMetrics(state: MeasureState): { key: string; label: string; unit: string }[] {
  const allKeys = new Set<string>();
  const enabledMetrics = state.enabledMetrics || {};
  for (const setting of Object.keys(enabledMetrics)) {
    const map = enabledMetrics[setting as MeasureCareSetting] || {};
    for (const [key, isOn] of Object.entries(map)) {
      if (isOn) allKeys.add(key);
    }
  }
  const monthlyData = state.trendConfig.monthlyData;
  for (const key of Object.keys(monthlyData)) {
    if (monthlyData[key]?.length >= 1) allKeys.add(key);
  }
  return Array.from(allKeys).map(key => ({ key, label: getMetricLabel(key), unit: getMetricSuffix(key) }));
}

function TrendChart({ state, selectedMetric }: { state: MeasureState; selectedMetric: string }) {
  const data = state.trendConfig.monthlyData[selectedMetric] || [];
  if (data.length < 2) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-[#CCCCCC] italic">
        Add at least 2 months of trend data to see the chart
      </div>
    );
  }

  const chartData = data.map((val, i) => ({ month: `M${i + 1}`, value: val }));
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
            formatter={(value: number) => [`${value}${getMetricSuffix(selectedMetric)}`, getMetricLabel(selectedMetric)]}
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
    if (state.activeCareSettings?.length > 0) return state.activeCareSettings;
    const settings: MeasureCareSetting[] = [];
    const all: MeasureCareSetting[] = ['outpatient', 'ed', 'inpatient', 'nursing'];
    for (const s of all) {
      const enabled = state.enabledMetrics?.[s];
      if (enabled && Object.values(enabled).some(Boolean)) {
        settings.push(s);
      }
    }
    if (settings.length === 0 && state.careSetting) settings.push(state.careSetting);
    return settings.length > 0 ? settings : ['outpatient' as MeasureCareSetting];
  }, [state]);

  const allMetricRows = useMemo(() => {
    const rows: MetricRowData[] = [];
    for (const s of activeSettings) {
      rows.push(...getSettingMetricRows(state, s));
    }
    rows.push(...getSurveyMetricRows(state, activeSettings));
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
    total += (state.surveyMetrics || []).filter(sm => sm.label.trim() && activeSettings.includes(sm.setting || state.careSetting || 'outpatient')).length;
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
        if (s === 'outpatient') {
          const domainMetrics = OUTPATIENT_METRICS.filter(m => {
            if (m.phase3Roadmap) return false;
            return m.domain === d.key;
          });
          grouped[d.key].total += domainMetrics.length;
        } else {
          const section = CARE_SETTING_CONFIGS[s].metricSections.find(sec => sec.key === d.key);
          if (section) {
            grouped[d.key].total += section.metrics.filter(m => m.hasBeforeAfter).length;
          }
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

  const settingDomains = useMemo(() => {
    const seen = new Set<string>();
    const result: { key: DomainKey; label: string }[] = [];
    for (const s of activeSettings) {
      for (const d of getSettingDomains(s)) {
        if (!seen.has(d.key)) {
          seen.add(d.key);
          result.push(d);
        }
      }
    }
    return result;
  }, [activeSettings]);

  const foundationalStatus: DomainStatus = useMemo(() => {
    if (!activeSettings.includes('outpatient')) return 'no-data';
    const nd = state.outpatientNativeData;
    const om = state.outpatientMetrics || {};
    const hasUtil = (nd?.utilization ?? 0) > 0;
    const hasConsent = (nd?.consentRate ?? 0) > 0;
    const hasRetention = (nd?.userRetention ?? 0) > 0;
    const hasSingle = hasUtil || hasConsent || hasRetention;
    if (!hasSingle) return 'no-data';
    return 'signaling';
  }, [state.outpatientNativeData, state.outpatientMetrics, activeSettings]);

  const domainStatusMap: Record<string, DomainStatus> = {
    workforce: domainStatus.workforce,
    revenue: domainStatus.revenue,
    quality: domainStatus.quality,
    capacity: domainStatus.capacity,
    throughput: domainStatus.capacity,
    patientFlow: domainStatus.capacity,
    foundational: foundationalStatus,
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
        totalSteps={7}
        stepName="Measurement Picture"
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

        <AbridgeFootprintRow nativeData={
          activeSettings.includes('outpatient') && state.outpatientNativeData
            ? {
                ...state.abridgeNativeData,
                notesGenerated: state.abridgeNativeData?.notesGenerated,
                encountersCaptured: state.abridgeNativeData?.encountersCaptured,
                noteAcceptanceRate: state.abridgeNativeData?.noteAcceptanceRate,
                utilization: state.outpatientNativeData.utilization ?? undefined,
                consentRate: state.outpatientNativeData.consentRate ?? undefined,
                userRetention: state.outpatientNativeData.userRetention ?? undefined,
              }
            : state.abridgeNativeData
        } />

        <NarrativePanel narrative={narrative} mode={mode} />
      </div>

      <motion.section
        className="relative overflow-hidden"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1, duration: 0.5 }}
        data-testid="stats-header"
      >
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-14">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs" data-testid="badge-hero-context">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA2C00]" />
              {orgName} • Phase {context.phase} {context.phaseLabel} • {context.maturityLabel}
            </span>
          </div>

          <div className="text-center mb-10">
            <div className="text-white/40 text-xs uppercase tracking-[0.2em] mb-3">
              Signals Active
            </div>
            <div className="relative inline-block">
              <div
                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#EA2C00]"
                data-testid="text-hero-signal-count"
              >
                {signalCounts.active} of {signalCounts.total}
              </div>
            </div>
            <div className="mt-4 text-white/50 text-sm" data-testid="text-hero-subtitle">
              across {settingDomains.length} domain{settingDomains.length !== 1 ? 's' : ''} with {formatNumber(state.deployment.providers)} providers on Abridge
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1" data-testid="stat-providers">
                {formatNumber(state.deployment.providers)}
              </div>
              <div className="text-white/40 text-xs uppercase tracking-wider">
                Providers
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1" data-testid="stat-encounters">
                {formatNumber(state.deployment.totalEncounters)}
              </div>
              <div className="text-white/40 text-xs uppercase tracking-wider">
                Encounters
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1" data-testid="stat-settings">
                {activeSettings.length}
              </div>
              <div className="text-white/40 text-xs uppercase tracking-wider">
                Care Settings
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-6 text-[11px]">
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
            </div>
            <div className="flex h-2 rounded-full overflow-hidden w-64">
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

          <div className="mt-8 text-center">
            <p className="text-white/40 text-sm max-w-xl mx-auto" data-testid="text-hero-strategic">
              {context.maturityStage === 'unmeasured'
                ? `Your deployment is in the ${context.maturityLabel} phase. Begin capturing baseline data to unlock early signals across your active domains.`
                : context.maturityStage === 'signaling'
                ? `Your deployment is in the ${context.maturityLabel} phase. Early signals are emerging across ${settingDomains.length} domain${settingDomains.length !== 1 ? 's' : ''} — continue building measurement depth to reach Validated status.`
                : context.maturityStage === 'validated'
                ? `Your deployment has reached ${context.maturityLabel} status. Metrics are tracking consistently across ${settingDomains.length} domain${settingDomains.length !== 1 ? 's' : ''}, building a strong evidence base.`
                : `Your deployment is at the ${context.maturityLabel} level. Comprehensive measurement across ${settingDomains.length} domain${settingDomains.length !== 1 ? 's' : ''} provides a clear picture of Abridge's organizational impact.`
              }
            </p>
          </div>
        </div>
      </motion.section>

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6">
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
                state={state}
                isOutpatient={activeSettings.includes('outpatient')}
              />
            );
          })}
        </div>

        {(() => {
          const baselineOnlyRows = allMetricRows.filter(r => r.status === 'baseline');
          if (baselineOnlyRows.length === 0) return null;
          return (
            <motion.div
              className="rounded-lg border border-[#F5D399] bg-[#FFFBF0] p-5 mb-6"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3, duration: 0.4 }}
              data-testid="section-baseline-only"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#F5C6B3]" />
                <h3 className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A]">Baseline Set</h3>
                <span className="text-[10px] text-[#BBBBBB] ml-auto">{baselineOnlyRows.length} metric{baselineOnlyRows.length > 1 ? 's' : ''}</span>
              </div>
              <p className="text-[11px] text-[#888888] mb-3">These metrics have a baseline but no post-Abridge measurement yet. Collect "With Abridge" data to activate them.</p>
              <div className="space-y-1.5">
                {baselineOnlyRows.map(row => (
                  <div key={row.metricKey} className="flex items-center gap-2 py-1.5 px-2 rounded bg-white/60">
                    <Minus className="w-3 h-3 text-[#D4A843] flex-shrink-0" />
                    <span className="text-sm text-[#666666] flex-1">{row.label}</span>
                    <span className="text-[11px] text-[#999999] tabular-nums">Baseline: {row.before}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}

        {(() => {
          const notMeasuringRows = allMetricRows.filter(r => r.status === 'not-measuring');
          if (notMeasuringRows.length === 0) return null;
          const byDomain: Record<string, MetricRowData[]> = {};
          for (const r of notMeasuringRows) {
            if (!byDomain[r.domain]) byDomain[r.domain] = [];
            byDomain[r.domain].push(r);
          }
          return (
            <motion.div
              className="rounded-lg border border-dashed border-[#E5E5E5] bg-[#FAFAF8] p-5 mb-6"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.35, duration: 0.4 }}
              data-testid="section-not-measuring"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#E5E5E5]" />
                <h3 className="text-xs font-bold uppercase tracking-[1.5px] text-[#666666]">Not Yet Measuring</h3>
                <span className="text-[10px] text-[#CCCCCC] ml-auto">{notMeasuringRows.length} opportunity metric{notMeasuringRows.length > 1 ? 's' : ''}</span>
              </div>
              <p className="text-[11px] text-[#999999] mb-3">These metrics are available but not yet tracked. Adding them will strengthen your value story.</p>
              <div className="space-y-3">
                {Object.entries(byDomain).map(([domainLabel, rows]) => (
                  <div key={domainLabel}>
                    <p className="text-[10px] font-semibold text-[#BBBBBB] uppercase tracking-[1px] mb-1">{domainLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rows.map(row => (
                        <span key={row.metricKey} className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-[#E5E5E5] text-[11px] text-[#999999]">
                          {row.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}

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
                {getAvailableTrendMetrics(state).map((opt) => (
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

        {(state.customMetrics || []).filter((cm) => cm.label.trim()).length > 0 && (
          <motion.div
            className="bg-white rounded-lg border border-[#E5E5E5] p-5 mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            data-testid="section-custom-metrics"
          >
            <h3 className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A] mb-3">Additional Metrics</h3>
            <div className="space-y-0">
              {(state.customMetrics || [])
                .filter((cm) => cm.label.trim())
                .map((cm, i) => (
                  <PointComparison
                    key={cm.id}
                    label={cm.label}
                    nonAbridge={cm.before}
                    withAbridge={cm.after}
                    delay={0.55 + i * 0.05}
                  />
                ))}
            </div>
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
