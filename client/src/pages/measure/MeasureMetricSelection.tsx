import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { ArrowRight, X, ChevronDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  type MeasureState,
  type MeasureCareSetting,
  type MetricEntry,
  metricKey,
  getMonthsFromGoLive,
} from "@/lib/measureCalculator";
import {
  CARE_SETTING_CONFIGS,
  getMetricsForSettings,
  ORG_WIDE_METRIC_IDS,
  SETTING_THIRD_CHAPTER_LABELS,
  DOMAIN_LABELS,
  type DomainKey,
  type ResolvedMetric,
} from "@/lib/measureCareSettings";

interface MeasureMetricSelectionProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}


const FOURTH_DOMAIN_VARIANTS: DomainKey[] = ['capacity', 'throughput', 'patientFlow', 'staffing'];

const DOMAIN_QUESTIONS: Record<string, string> = {
  quality: 'What changed in documentation quality?',
  workforce: 'How has clinician time and wellbeing shifted?',
  revenue: 'Has documentation quality reached the bottom line?',
  capacity: 'What is the organization doing with freed time?',
  throughput: 'How has patient throughput improved?',
  patientFlow: 'What is the impact on patient movement?',
  staffing: 'Has burden reduction improved staffing stability?',
  foundational: 'Is the Abridge platform being adopted effectively?',
};

function getFourthDomain(settings: MeasureCareSetting[]): { key: DomainKey; label: string } {
  const primary = settings[0] || 'outpatient';
  const config = CARE_SETTING_CONFIGS[primary];
  return { key: config.fourthDomainKey, label: config.fourthDomainLabel };
}

const CHAPTER_LABELS: Record<number, string> = {
  1: 'Documentation impact',
  2: 'Efficiency gains',
};

function generateMonthLabels(goLiveDate: string | null, monthCount: number): string[] {
  const labels: string[] = [];
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let startDate: Date;
  if (goLiveDate) {
    startDate = new Date(goLiveDate);
  } else {
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthCount);
  }
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    labels.push(`${shortMonths[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`);
  }
  return labels;
}

function DeltaBadge({ before, after, lowerIsBetter, unit }: { before: number; after: number; lowerIsBetter: boolean; unit: string }) {
  const delta = after - before;
  if (delta === 0) return null;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const pct = before !== 0 ? Math.round(Math.abs(delta / before) * 100) : 0;
  const sign = delta > 0 ? '+' : '';
  const displayUnit = unit === '%' ? 'pp' : '';

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${improved ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#F5F0EB] text-[#999999]'}`}
      data-testid="badge-delta"
    >
      {sign}{delta.toFixed(1)}{displayUnit}
      {pct > 0 && <span className="text-[10px] opacity-60">({pct}%)</span>}
    </span>
  );
}

function MonthlyGrid({ entry, monthLabels, onChange }: {
  entry: MetricEntry;
  monthLabels: string[];
  onChange: (data: number[]) => void;
}) {
  const data = entry.monthlyData || new Array(monthLabels.length).fill(0);
  const chartData = data.map((v, i) => ({ x: i, y: v || 0 }));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Tab' && !e.shiftKey && idx < monthLabels.length - 1) {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
    } else if (e.key === 'Tab' && e.shiftKey && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="mt-3" data-testid="monthly-grid">
      <div className="flex items-end gap-3 mb-3">
        <div className="flex-1 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <Area type="monotone" dataKey="y" stroke="#EA2C00" fill="#EA2C00" fillOpacity={0.1} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(monthLabels.length, 6)}, 1fr)` }}>
        {monthLabels.map((label, i) => (
          <div key={label} className="flex flex-col items-center">
            <span className="text-[9px] text-gray-400 mb-0.5">{label}</span>
            <input
              ref={el => { inputRefs.current[i] = el; }}
              type="number"
              value={data[i] || ''}
              onChange={e => {
                const next = [...data];
                next[i] = parseFloat(e.target.value) || 0;
                onChange(next);
              }}
              onKeyDown={e => handleKeyDown(e, i)}
              className="w-full h-8 text-center text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/40 bg-white"
              data-testid={`input-monthly-${i}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricEntryRow({ rm, metricValues, isActive, onToggle, onUpdate, monthLabels, activeSettings }: {
  rm: ResolvedMetric;
  metricValues: Record<string, MetricEntry>;
  isActive: boolean;
  onToggle: () => void;
  onUpdate: (key: string, updates: Partial<MetricEntry>) => void;
  monthLabels: string[];
  activeSettings: MeasureCareSetting[];
}) {
  const { metric } = rm;
  const isOrgWide = ORG_WIDE_METRIC_IDS.includes(metric.id);
  const settingsToShow = isOrgWide ? [undefined] : rm.settings;
  const firstKey = metricKey(metric.id, isOrgWide ? undefined : rm.settings[0]);
  const firstEntry = metricValues[firstKey];
  const [isMonthly, setIsMonthly] = useState(firstEntry?.isMonthlyMode || false);

  if (!isActive) {
    return (
      <div
        className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[#FFF8F5] transition-colors cursor-pointer"
        onClick={onToggle}
        data-testid={`metric-row-${metric.id}`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{metric.label}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{metric.description}</p>
        </div>
        <button
          className="flex-shrink-0 text-xs font-medium text-[#EA2C00] border border-[#EA2C00]/40 px-3 py-1.5 rounded-lg hover:bg-[#EA2C00]/5 hover:border-[#EA2C00] transition-all ml-3"
          data-testid={`button-measure-${metric.id}`}
        >
          + Measure this
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="border border-[#E8E2DA] rounded-xl p-4 mb-2 bg-white"
      data-testid={`metric-active-${metric.id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{metric.label}</p>
          <p className="text-xs text-gray-400">{metric.unitLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {metric.inputType === 'before-after' && (
            <button
              onClick={() => {
                setIsMonthly(!isMonthly);
                settingsToShow.forEach(s => {
                  const k = metricKey(metric.id, s);
                  onUpdate(k, { isMonthlyMode: !isMonthly });
                });
              }}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${isMonthly ? 'bg-[#EA2C00]/10 text-[#EA2C00]' : 'text-gray-400 hover:text-gray-600'}`}
              data-testid={`toggle-monthly-${metric.id}`}
            >
              <TrendingUp className="w-3 h-3" />
              Monthly
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1 text-gray-300 hover:text-gray-500 rounded-md"
            data-testid={`button-remove-${metric.id}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {settingsToShow.map(setting => {
        const k = metricKey(metric.id, setting);
        const e = metricValues[k] || { before: null, after: null, isMonthlyMode: false };

        if (isMonthly && metric.inputType === 'before-after') {
          return (
            <div key={k}>
              {setting && settingsToShow.length > 1 && (
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">{setting}</p>
              )}
              <MonthlyGrid
                entry={e}
                monthLabels={monthLabels}
                onChange={(data) => {
                  const nonZero = data.filter(v => v > 0);
                  const derivedBefore = nonZero.length > 0 ? nonZero[0] : null;
                  const derivedAfter = nonZero.length > 1 ? nonZero[nonZero.length - 1] : derivedBefore;
                  onUpdate(k, { monthlyData: data, before: derivedBefore, after: derivedAfter });
                }}
              />
            </div>
          );
        }

        return (
          <div key={k}>
            {setting && settingsToShow.length > 1 && (
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">{setting}</p>
            )}
            <div className="flex items-center gap-3">
              {metric.inputType === 'before-after' ? (
                <>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Before</label>
                    <FormattedNumberInput
                      value={e.before ?? ''}
                      onChange={(v: number) => onUpdate(k, { before: v })}
                      className="h-14 w-full text-center text-lg font-semibold border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EA2C00]/30 bg-[#FAFAFA]"
                      placeholder="—"
                      data-testid={`input-before-${metric.id}`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">After</label>
                    <FormattedNumberInput
                      value={e.after ?? ''}
                      onChange={(v: number) => onUpdate(k, { after: v })}
                      className="h-14 w-full text-center text-lg font-semibold border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EA2C00]/30 bg-[#FAFAFA]"
                      placeholder="—"
                      data-testid={`input-after-${metric.id}`}
                    />
                  </div>
                  {e.before != null && e.after != null && e.before !== 0 && (
                    <div className="pt-5">
                      <DeltaBadge before={e.before} after={e.after} lowerIsBetter={metric.lowerIsBetter} unit={metric.unit} />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 max-w-[200px]">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Current</label>
                  <FormattedNumberInput
                    value={e.after ?? ''}
                    onChange={(v: number) => onUpdate(k, { after: v, before: v })}
                    className="h-14 w-full text-center text-lg font-semibold border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#EA2C00]/30 bg-[#FAFAFA]"
                    placeholder="—"
                    data-testid={`input-single-${metric.id}`}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

export default function MeasureMetricSelection({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: MeasureMetricSelectionProps) {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [showAssumptions, setShowAssumptions] = useState(false);
  const domainRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeSettings = state.activeCareSettings?.length
    ? state.activeCareSettings
    : [state.careSetting || 'outpatient'];

  const monthCount = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge) || 6;
  const monthLabels = useMemo(() => generateMonthLabels(state.goLiveDate, Math.min(monthCount, 12)), [state.goLiveDate, monthCount]);

  const allMetrics = useMemo(() => getMetricsForSettings(activeSettings), [activeSettings]);

  const fourthDomain = useMemo(() => getFourthDomain(activeSettings), [activeSettings]);

  const domainGroups = useMemo(() => {
    const fiveDomainKeys: DomainKey[] = ['foundational', 'quality', 'workforce', 'revenue', fourthDomain.key];
    const fiveDomainLabels: Record<string, string> = {
      foundational: 'Foundational',
      quality: 'Quality',
      workforce: 'Workforce',
      revenue: 'Revenue',
      [fourthDomain.key]: fourthDomain.label,
    };

    const domainMap = new Map<DomainKey, ResolvedMetric[]>();
    for (const dk of fiveDomainKeys) {
      domainMap.set(dk, []);
    }

    for (const rm of allMetrics) {
      const dk = rm.metric.domain as DomainKey;
      if (dk === 'foundational') {
        domainMap.get('foundational')!.push(rm);
      } else if (FOURTH_DOMAIN_VARIANTS.includes(dk) && dk !== fourthDomain.key) {
        domainMap.get(fourthDomain.key)!.push(rm);
      } else if (domainMap.has(dk)) {
        domainMap.get(dk)!.push(rm);
      }
    }

    const thirdLabel = SETTING_THIRD_CHAPTER_LABELS[activeSettings[0]] || 'Downstream outcomes';

    return fiveDomainKeys.map(dk => {
      const metrics = domainMap.get(dk) || [];

      const chapters: { phase: number; label: string; metrics: ResolvedMetric[] }[] = [];

      if (dk === 'foundational') {
        if (metrics.length > 0) {
          chapters.push({ phase: 0, label: 'Platform adoption', metrics });
        }
      } else {
        const byPhase = new Map<number, ResolvedMetric[]>();
        for (const rm of metrics) {
          const p = rm.metric.phase;
          if (!byPhase.has(p)) byPhase.set(p, []);
          byPhase.get(p)!.push(rm);
        }
        if (byPhase.has(1)) chapters.push({ phase: 1, label: CHAPTER_LABELS[1] || 'Documentation impact', metrics: byPhase.get(1)! });
        if (byPhase.has(2)) chapters.push({ phase: 2, label: CHAPTER_LABELS[2] || 'Efficiency gains', metrics: byPhase.get(2)! });
        if (byPhase.has(3)) chapters.push({ phase: 3, label: thirdLabel, metrics: byPhase.get(3)! });
      }

      return {
        domainKey: dk,
        label: fiveDomainLabels[dk] || DOMAIN_LABELS[dk] || dk,
        chapters,
      };
    });
  }, [allMetrics, activeSettings, fourthDomain]);

  const isMetricActive = useCallback((mId: string, rm: ResolvedMetric): boolean => {
    const isOrgWide = ORG_WIDE_METRIC_IDS.includes(mId);
    if (isOrgWide) {
      return Object.values(state.enabledMetrics || {}).some(sm => sm?.[mId]);
    }
    return rm.settings.some(s => !!state.enabledMetrics?.[s]?.[mId]);
  }, [state.enabledMetrics]);

  const toggleMetric = useCallback((rm: ResolvedMetric) => {
    const mId = rm.metric.id;
    const isOrgWide = ORG_WIDE_METRIC_IDS.includes(mId);
    const current = isMetricActive(mId, rm);

    const newEnabled = { ...state.enabledMetrics };
    if (isOrgWide) {
      for (const s of activeSettings) {
        newEnabled[s] = { ...newEnabled[s], [mId]: !current };
      }
    } else {
      for (const s of rm.settings) {
        newEnabled[s] = { ...newEnabled[s], [mId]: !current };
      }
    }
    updateState({ enabledMetrics: newEnabled });
  }, [state.enabledMetrics, isMetricActive, updateState, activeSettings]);

  const updateMetricValue = useCallback((key: string, updates: Partial<MetricEntry>) => {
    const separatorIdx = key.indexOf('__');
    const metricId = separatorIdx >= 0 ? key.slice(0, separatorIdx) : key;
    const setting = separatorIdx >= 0 ? key.slice(separatorIdx + 2) as MeasureCareSetting : null;

    const updatedMetricValues = {
      ...state.metricValues,
      [key]: { ...(state.metricValues?.[key] || {}), ...updates },
    };

    if (setting && (updates.before !== undefined || updates.after !== undefined)) {
      const currentSettingData = state.settingData?.[setting] || {};
      const updatedSettingData = { ...currentSettingData };
      if (updates.before !== null && updates.before !== undefined) {
        updatedSettingData[`${metricId}_before`] = updates.before;
      }
      if (updates.after !== null && updates.after !== undefined) {
        updatedSettingData[`${metricId}_after`] = updates.after;
      }
      updateState({
        metricValues: updatedMetricValues,
        settingData: { ...state.settingData, [setting]: updatedSettingData },
      });
    } else {
      updateState({ metricValues: updatedMetricValues });
    }
  }, [state.metricValues, state.settingData, updateState]);

  const domainActiveCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const group of domainGroups) {
      let count = 0;
      for (const ch of group.chapters) {
        for (const rm of ch.metrics) {
          if (isMetricActive(rm.metric.id, rm)) count++;
        }
      }
      counts[group.domainKey] = count;
    }
    return counts;
  }, [domainGroups, isMetricActive]);

  const totalActive = useMemo(() => Object.values(domainActiveCounts).reduce((a, b) => a + b, 0), [domainActiveCounts]);

  const scrollToDomain = (dk: string) => {
    const el = domainRefs.current[dk];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setExpandedDomains(prev => new Set(prev).add(dk));
  };

  const toggleDomainExpand = (dk: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(dk)) next.delete(dk); else next.add(dk);
      return next;
    });
  };

  useEffect(() => {
    setExpandedDomains(new Set(['foundational', 'quality']));
  }, []);

  useEffect(() => {
    const updates: Record<string, any> = {};
    let needsUpdate = false;

    if (state.deployment.utilizationRate > 0) {
      for (const s of activeSettings) {
        const k = metricKey('utilization', s);
        const existing = state.metricValues?.[k];
        if (!existing || existing.after !== state.deployment.utilizationRate) {
          updates[k] = { ...(existing || {}), before: 0, after: state.deployment.utilizationRate };
          needsUpdate = true;
        }
      }
    }

    if (state.deployment.mruProviders > 0 && state.deployment.liveProviders > 0) {
      const retentionPct = Math.round((state.deployment.mruProviders / state.deployment.liveProviders) * 100);
      for (const s of activeSettings) {
        const k = metricKey('user_retention', s);
        const existing = state.metricValues?.[k];
        if (!existing || existing.after !== retentionPct) {
          updates[k] = { ...(existing || {}), before: 0, after: retentionPct };
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      const newEnabled = { ...state.enabledMetrics };
      for (const s of activeSettings) {
        if (state.deployment.utilizationRate > 0) {
          newEnabled[s] = { ...newEnabled[s], utilization: true };
        }
        if (state.deployment.mruProviders > 0 && state.deployment.liveProviders > 0) {
          newEnabled[s] = { ...newEnabled[s], user_retention: true };
        }
      }
      updateState({
        metricValues: { ...state.metricValues, ...updates },
        enabledMetrics: newEnabled,
      });
    }
  }, [state.deployment.utilizationRate, state.deployment.mruProviders, state.deployment.liveProviders]);

  return (
    <div className="min-h-screen bg-[#FAFAFA]" data-testid="page-metric-selection">
      <UnifiedHeader
        pathType="measure"
        currentStep={2}
        totalSteps={5}
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            What You're Measuring
          </h1>
          <p className="text-sm text-gray-500">
            Add what you have. You can always come back to fill in more.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8" data-testid="domain-signal-strip">
          {domainGroups.map(group => {
            const count = domainActiveCounts[group.domainKey] || 0;
            const isActive = count > 0;
            return (
              <button
                key={group.domainKey}
                onClick={() => scrollToDomain(group.domainKey)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${isActive ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EDE8E3]'}`}
                data-testid={`pill-domain-${group.domainKey}`}
              >
                {group.label}
                <span className={`ml-1.5 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px] ${isActive ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {domainGroups.map((group) => {
            const count = domainActiveCounts[group.domainKey] || 0;
            const isActive = count > 0;
            const isExpanded = expandedDomains.has(group.domainKey);

            return (
              <div
                key={group.domainKey}
                ref={el => { domainRefs.current[group.domainKey] = el; }}
                className="rounded-2xl border border-gray-200 transition-all bg-[#F5F0EB]"
                style={{ borderLeftWidth: '4px', borderLeftColor: isActive ? '#EA2C00' : '#E5E5E5' }}
                data-testid={`domain-section-${group.domainKey}`}
              >
                <button
                  onClick={() => toggleDomainExpand(group.domainKey)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left"
                  data-testid={`domain-toggle-${group.domainKey}`}
                >
                  <div className="flex-1">
                    <h3 className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#1A1A1A]">{group.label}</h3>
                    <p className="text-sm text-[#666666] mt-1 leading-snug">{DOMAIN_QUESTIONS[group.domainKey] || ''}</p>
                  </div>
                  {count > 0 && (
                    <span className="text-[10px] font-medium text-[#EA2C00]">{count} active</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-[#999999] flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-gray-100">
                        {group.chapters.map((chapter, ci) => {
                          const isThirdChapter = chapter.phase === 3;
                          return (
                            <div key={chapter.phase} className="mt-3">
                              <div className="space-y-1">
                                {chapter.metrics.map(rm => {
                                  const mActive = isMetricActive(rm.metric.id, rm);

                                  if (rm.metric.id === 'utilization' && state.deployment.utilizationRate > 0) {
                                    return (
                                      <div key={rm.metric.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-[#F5F0EB]" data-testid={`metric-row-${rm.metric.id}`}>
                                        <div>
                                          <p className="text-sm font-medium text-[#1A1A1A]">% Utilization</p>
                                          <p className="text-xs text-[#999999] mt-0.5">Encounter coverage — from your partner profile</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-lg font-bold text-[#EA2C00]">{state.deployment.utilizationRate}%</p>
                                          <p className="text-[10px] text-[#999999]">auto-populated</p>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (rm.metric.id === 'user_retention' && state.deployment.mruProviders > 0 && state.deployment.liveProviders > 0) {
                                    const retentionPct = Math.round((state.deployment.mruProviders / state.deployment.liveProviders) * 100);
                                    return (
                                      <div key={rm.metric.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-[#F5F0EB]" data-testid={`metric-row-${rm.metric.id}`}>
                                        <div>
                                          <p className="text-sm font-medium text-[#1A1A1A]">% Abridge User Retention</p>
                                          <p className="text-xs text-[#999999] mt-0.5">MRUs / providers on Abridge — from your partner profile</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-lg font-bold text-[#EA2C00]">{retentionPct}%</p>
                                          <p className="text-[10px] text-[#999999]">auto-populated</p>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <MetricEntryRow
                                      key={rm.metric.id}
                                      rm={rm}
                                      metricValues={state.metricValues || {}}
                                      isActive={mActive}
                                      onToggle={() => toggleMetric(rm)}
                                      onUpdate={updateMetricValue}
                                      monthLabels={monthLabels}
                                      activeSettings={activeSettings}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <button
            onClick={() => setShowAssumptions(!showAssumptions)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="toggle-assumptions"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showAssumptions ? 'rotate-180' : ''}`} />
            Model assumptions
          </button>
          <AnimatePresence>
            {showAssumptions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
                  <p><span className="font-semibold text-gray-600">Providers:</span> {state.deployment.providers}</p>
                  <p><span className="font-semibold text-gray-600">Encounters:</span> {state.deployment.totalEncounters.toLocaleString()}</p>
                  {state.deployment.organizationName && (
                    <p><span className="font-semibold text-gray-600">Organization:</span> {state.deployment.organizationName}</p>
                  )}
                  <p><span className="font-semibold text-gray-600">Months on Abridge:</span> {monthCount}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3" data-testid="cta-section">
          <Button
            onClick={totalActive > 0 ? onNext : undefined}
            disabled={totalActive === 0}
            className={`px-8 py-3 rounded-full text-sm font-semibold shadow-md ${totalActive > 0 ? 'bg-[#EA2C00] hover:bg-[#D12800] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            data-testid="button-next"
          >
            {totalActive > 0 ? 'View the Journey' : 'Add at least one metric to continue'}
            {totalActive > 0 && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
