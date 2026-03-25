import { useState, useCallback, useMemo } from "react";
import { ArrowRight, Check, Plus, X, Settings2, Pencil, ChevronDown, ChevronUp, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  type SurveyMetric,
  type MetricEntry,
  metricKey,
} from "@/lib/measureCalculator";
import {
  CARE_SETTING_CONFIGS,
  getDefaultMetrics,
  getMetricsForSettings,
  FOUNDATIONAL_GROUPS,
  ORG_WIDE_METRIC_IDS,
  SETTING_THIRD_CHAPTER_LABELS,
  DOMAIN_LABELS,
  type DomainKey,
  type MetricDefinition,
  type ResolvedMetric,
} from "@/lib/measureCareSettings";

interface MeasureMetricSelectionProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  workforce: '#6366F1',
  revenue: '#EA580C',
  quality: '#2D8A4E',
  capacity: '#0891B2',
  throughput: '#0891B2',
  patientFlow: '#0891B2',
  staffing: '#0891B2',
};

const CAPACITY_DOMAIN_LABEL: Record<MeasureCareSetting, string> = {
  outpatient: 'Capacity',
  ed: 'Throughput',
  inpatient: 'Patient Flow',
  nursing: 'Staffing',
};

function DeltaBadge({ before, after, metric }: { before: number; after: number; metric: MetricDefinition }) {
  if (before === 0 && after === 0) return null;
  const delta = after - before;
  if (delta === 0) return null;
  const pctChange = before !== 0 ? Math.round((delta / before) * 100) : 0;
  const isImprovement = metric.lowerIsBetter ? delta < 0 : delta > 0;
  const arrow = isImprovement ? '\u2197' : '\u2198';
  return (
    <motion.span
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.1 }}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${isImprovement ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}
      data-testid={`delta-${metric.id}`}
    >
      {pctChange !== 0 ? `${pctChange > 0 ? '+' : ''}${pctChange}%` : ''} {arrow}
    </motion.span>
  );
}

export default function MeasureMetricSelection({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: MeasureMetricSelectionProps) {
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>({});
  const [showAssumptions, setShowAssumptions] = useState(false);

  const activeSettings = state.activeCareSettings?.length > 0
    ? state.activeCareSettings
    : [state.careSetting || 'outpatient' as MeasureCareSetting];

  const multiSetting = activeSettings.length > 1;

  const resolvedMetrics = useMemo(() => getMetricsForSettings(activeSettings), [activeSettings]);

  const foundationalMetrics = useMemo(() => {
    return resolvedMetrics.filter(rm => rm.metric.domain === 'foundational' && !rm.metric.phase3Roadmap);
  }, [resolvedMetrics]);

  const domainMetrics = useMemo(() => {
    return resolvedMetrics.filter(rm => rm.metric.domain !== 'foundational' && !rm.metric.phase3Roadmap);
  }, [resolvedMetrics]);

  const domainGroups = useMemo(() => {
    const groups = new Map<string, { domainKey: string; label: string; metrics: ResolvedMetric[] }>();
    const capacityDomains = ['capacity', 'throughput', 'patientFlow', 'staffing'];

    for (const rm of domainMetrics) {
      const dk = rm.metric.domain;
      const groupKey = capacityDomains.includes(dk) ? 'capacity-group' : dk;

      if (!groups.has(groupKey)) {
        let label: string;
        if (groupKey === 'capacity-group') {
          if (multiSetting) {
            const labels = activeSettings
              .map(s => CAPACITY_DOMAIN_LABEL[s])
              .filter((v, i, a) => a.indexOf(v) === i);
            label = labels.join(' / ');
          } else {
            label = CAPACITY_DOMAIN_LABEL[activeSettings[0]];
          }
        } else {
          label = DOMAIN_LABELS[dk as DomainKey] || dk;
        }
        groups.set(groupKey, { domainKey: groupKey, label, metrics: [] });
      }
      groups.get(groupKey)!.metrics.push(rm);
    }
    return Array.from(groups.values());
  }, [domainMetrics, activeSettings, multiSetting]);

  const getMetricValue = useCallback((metricId: string, setting?: MeasureCareSetting): { before: number; after: number } => {
    const isOrgWide = ORG_WIDE_METRIC_IDS.includes(metricId);
    const key = isOrgWide ? metricId : metricKey(metricId, setting);
    const entry = state.metricValues[key];
    if (entry) return { before: entry.before ?? 0, after: entry.after ?? 0 };

    if (setting) {
      const sd = state.settingData[setting] || {};
      return { before: sd[`${metricId}_before`] ?? 0, after: sd[`${metricId}_after`] ?? 0 };
    }
    return { before: 0, after: 0 };
  }, [state.metricValues, state.settingData]);

  const setMetricValue = useCallback((metricId: string, field: 'before' | 'after', value: number, setting?: MeasureCareSetting) => {
    const isOrgWide = ORG_WIDE_METRIC_IDS.includes(metricId);
    const key = isOrgWide ? metricId : metricKey(metricId, setting);
    const current = state.metricValues[key] || { before: null, after: null, isMonthlyMode: false };
    const updatedEntry: MetricEntry = { ...current, [field]: value };
    const newMetricValues = { ...state.metricValues, [key]: updatedEntry };

    const updates: Partial<MeasureState> = { metricValues: newMetricValues };

    if (setting) {
      const sd = { ...(state.settingData[setting] || {}) };
      sd[`${metricId}_${field}`] = value;
      updates.settingData = { ...state.settingData, [setting]: sd };

      const enabledMap = { ...(state.enabledMetrics?.[setting] || {}) };
      enabledMap[metricId] = true;
      updates.enabledMetrics = { ...state.enabledMetrics, [setting]: enabledMap };
    } else if (isOrgWide) {
      for (const s of activeSettings) {
        const sd = { ...(state.settingData[s] || {}) };
        sd[`${metricId}_${field}`] = value;
        updates.settingData = { ...(updates.settingData || state.settingData), [s]: sd };
        const enabledMap = { ...(state.enabledMetrics?.[s] || {}) };
        enabledMap[metricId] = true;
        updates.enabledMetrics = { ...(updates.enabledMetrics || state.enabledMetrics), [s]: enabledMap };
      }
    }

    updateState(updates);
  }, [state.metricValues, state.settingData, state.enabledMetrics, activeSettings, updateState]);

  const isMetricActive = useCallback((metricId: string, setting?: MeasureCareSetting): boolean => {
    if (setting) {
      const key = metricKey(metricId, setting);
      const entry = state.metricValues[key];
      if (entry && (entry.before !== null || entry.after !== null)) return true;
      const sd = state.settingData[setting] || {};
      return (sd[`${metricId}_before`] ?? 0) !== 0 || (sd[`${metricId}_after`] ?? 0) !== 0;
    }
    const isOrgWide = ORG_WIDE_METRIC_IDS.includes(metricId);
    if (isOrgWide) {
      const entry = state.metricValues[metricId];
      if (entry && (entry.before !== null || entry.after !== null)) return true;
      return activeSettings.some(s => {
        const sd = state.settingData[s] || {};
        return (sd[`${metricId}_before`] ?? 0) !== 0 || (sd[`${metricId}_after`] ?? 0) !== 0;
      });
    }
    return false;
  }, [state.metricValues, state.settingData, activeSettings]);

  const removeMetric = useCallback((metricId: string, setting?: MeasureCareSetting) => {
    const isOrgWide = ORG_WIDE_METRIC_IDS.includes(metricId);
    const newMetricValues = { ...state.metricValues };
    const updates: Partial<MeasureState> = {};

    if (isOrgWide) {
      delete newMetricValues[metricId];
      const newSettingData = { ...state.settingData };
      const newEnabledMetrics = { ...state.enabledMetrics };
      for (const s of activeSettings) {
        const sd = { ...(newSettingData[s] || {}) };
        sd[`${metricId}_before`] = 0;
        sd[`${metricId}_after`] = 0;
        newSettingData[s] = sd;
        const em = { ...(newEnabledMetrics[s] || {}) };
        delete em[metricId];
        newEnabledMetrics[s] = em;
      }
      updates.settingData = newSettingData;
      updates.enabledMetrics = newEnabledMetrics;
    } else if (setting) {
      const key = metricKey(metricId, setting);
      delete newMetricValues[key];
      const sd = { ...(state.settingData[setting] || {}) };
      sd[`${metricId}_before`] = 0;
      sd[`${metricId}_after`] = 0;
      updates.settingData = { ...state.settingData, [setting]: sd };
      const em = { ...(state.enabledMetrics?.[setting] || {}) };
      delete em[metricId];
      updates.enabledMetrics = { ...state.enabledMetrics, [setting]: em };
    }

    updates.metricValues = newMetricValues;
    setExpandedMetrics(prev => {
      const next = { ...prev };
      if (setting) delete next[metricKey(metricId, setting)];
      else delete next[metricId];
      return next;
    });
    updateState(updates);
  }, [state.metricValues, state.settingData, state.enabledMetrics, activeSettings, updateState]);

  const removeMetricFromAllSettings = useCallback((metricId: string, settings: MeasureCareSetting[]) => {
    const newMetricValues = { ...state.metricValues };
    const newSettingData = { ...state.settingData };
    const newEnabledMetrics = { ...state.enabledMetrics };
    for (const s of settings) {
      const key = metricKey(metricId, s);
      delete newMetricValues[key];
      const sd = { ...(newSettingData[s] || {}) };
      sd[`${metricId}_before`] = 0;
      sd[`${metricId}_after`] = 0;
      newSettingData[s] = sd;
      const em = { ...(newEnabledMetrics[s] || {}) };
      delete em[metricId];
      newEnabledMetrics[s] = em;
    }
    setExpandedMetrics(prev => {
      const next = { ...prev };
      delete next[metricId];
      return next;
    });
    updateState({ metricValues: newMetricValues, settingData: newSettingData, enabledMetrics: newEnabledMetrics });
  }, [state.metricValues, state.settingData, state.enabledMetrics, updateState]);

  const totalStats = useMemo(() => {
    let totalActive = 0;
    let totalAvailable = 0;
    for (const rm of resolvedMetrics) {
      if (rm.metric.phase3Roadmap) continue;
      if (rm.isOrgWide) {
        totalAvailable += 1;
        if (isMetricActive(rm.metric.id)) totalActive++;
      } else {
        for (const s of rm.settings) {
          totalAvailable += 1;
          if (isMetricActive(rm.metric.id, s)) totalActive++;
        }
      }
    }
    const validSurvey = (state.surveyMetrics || []).filter(sm => sm.label.trim()).length;
    return { totalAvailable: totalAvailable + validSurvey, totalActive: totalActive + validSurvey };
  }, [resolvedMetrics, isMetricActive, state.surveyMetrics]);

  const hasAnyData = useMemo(() => {
    return totalStats.totalActive > 0;
  }, [totalStats.totalActive]);

  const addSurveyMetric = useCallback((domainKey: string) => {
    const domainLabel = domainKey.charAt(0).toUpperCase() + domainKey.slice(1);
    const newMetric: SurveyMetric = {
      id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: '',
      before: 0,
      after: 0,
      domain: domainLabel,
      setting: activeSettings[0],
    };
    updateState({ surveyMetrics: [...(state.surveyMetrics || []), newMetric] });
  }, [state.surveyMetrics, activeSettings, updateState]);

  const updateSurveyMetric = useCallback((id: string, updates: Partial<SurveyMetric>) => {
    const updated = (state.surveyMetrics || []).map(m =>
      m.id === id ? { ...m, ...updates } : m
    );
    updateState({ surveyMetrics: updated });
  }, [state.surveyMetrics, updateState]);

  const removeSurveyMetric = useCallback((id: string) => {
    updateState({ surveyMetrics: (state.surveyMetrics || []).filter(m => m.id !== id) });
  }, [state.surveyMetrics, updateState]);

  const toggleDomain = (key: string) => {
    setExpandedDomains(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMetricExpand = (key: string) => {
    setExpandedMetrics(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeSetting = state.careSetting || activeSettings[0] || 'outpatient';
  const config = CARE_SETTING_CONFIGS[activeSetting];
  const settingMetrics = state.settingData?.[activeSetting] || getDefaultMetrics(activeSetting);

  const allocationKeys = config.allocationFields.map(f => f.key);
  const allocationTotal = allocationKeys.reduce((sum, key) => sum + (settingMetrics[key] ?? config.allocationFields.find(f => f.key === key)?.defaultValue ?? 0), 0);
  const allocationValid = allocationTotal === 100;

  const renderMetricRow = (rm: ResolvedMetric) => {
    const { metric, settings: metricSettings, isOrgWide } = rm;

    if (isOrgWide) {
      const val = getMetricValue(metric.id);
      const active = isMetricActive(metric.id);
      const expandKey = metric.id;
      const isExpanded = expandedMetrics[expandKey] || false;
      const hasBoth = val.before !== 0 && val.after !== 0;

      if (!active && !isExpanded) {
        return (
          <div key={metric.id} className="py-3 flex items-center justify-between border-b border-[#EDE8E1] last:border-b-0">
            <span className="text-sm text-[#888888]">{metric.label}</span>
            <button
              onClick={() => toggleMetricExpand(expandKey)}
              className="text-[11px] text-[#AAAAAA] hover:text-[#EA2C00] transition-colors"
              data-testid={`add-metric-${metric.id}`}
            >
              + Add
            </button>
          </div>
        );
      }

      return (
        <div
          key={metric.id}
          className={`py-3 border-b border-[#EDE8E1] last:border-b-0 ${hasBoth ? 'border-l-2 pl-3' : ''}`}
          style={hasBoth ? { borderLeftColor: DOMAIN_COLORS[metric.domain] || '#999' } : undefined}
          data-testid={`metric-row-${metric.id}`}
        >
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleMetricExpand(expandKey)}
          >
            <div className="flex items-center gap-2">
              {hasBoth && <Check className="w-3.5 h-3.5 text-[#2D8A4E] flex-shrink-0" />}
              <span className={`text-sm font-medium ${hasBoth ? 'text-[#1A1A1A]' : 'text-[#666666]'}`}>{metric.label}</span>
              <span className="text-[10px] text-[#BBBBBB]">All settings</span>
            </div>
            <div className="flex items-center gap-2">
              {hasBoth && <DeltaBadge before={val.before} after={val.after} metric={metric} />}
              {active && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeMetric(metric.id); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-[#CCCCCC] hover:text-[#EA2C00] transition-colors"
                  data-testid={`remove-metric-${metric.id}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">Non-Abridge</label>
                      <FormattedNumberInput
                        value={val.before}
                        onChange={(v) => setMetricValue(metric.id, 'before', v)}
                        step={metric.step || 1}
                        className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                        data-testid={`input-orgwide-${metric.id}-before`}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">With Abridge</label>
                      <FormattedNumberInput
                        value={val.after}
                        onChange={(v) => setMetricValue(metric.id, 'after', v)}
                        step={metric.step || 1}
                        className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                        data-testid={`input-orgwide-${metric.id}-after`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    const anyActive = metricSettings.some(s => isMetricActive(metric.id, s));
    const expandKey = metric.id;
    const isExpanded = expandedMetrics[expandKey] || false;

    if (!anyActive && !isExpanded) {
      return (
        <div key={metric.id} className="py-3 flex items-center justify-between border-b border-[#EDE8E1] last:border-b-0">
          <span className="text-sm text-[#888888]">{metric.label}</span>
          <button
            onClick={() => toggleMetricExpand(expandKey)}
            className="text-[11px] text-[#AAAAAA] hover:text-[#EA2C00] transition-colors"
            data-testid={`add-metric-${metric.id}`}
          >
            + Add
          </button>
        </div>
      );
    }

    const hasBothAny = metricSettings.some(s => {
      const v = getMetricValue(metric.id, s);
      return v.before !== 0 && v.after !== 0;
    });

    return (
      <div
        key={metric.id}
        className={`py-3 border-b border-[#EDE8E1] last:border-b-0 ${hasBothAny ? 'border-l-2 pl-3' : ''}`}
        style={hasBothAny ? { borderLeftColor: DOMAIN_COLORS[metric.domain] || '#999' } : undefined}
        data-testid={`metric-row-${metric.id}`}
      >
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleMetricExpand(expandKey)}
        >
          <div className="flex items-center gap-2">
            {hasBothAny && <Check className="w-3.5 h-3.5 text-[#2D8A4E] flex-shrink-0" />}
            <span className={`text-sm font-medium ${hasBothAny ? 'text-[#1A1A1A]' : 'text-[#666666]'}`}>{metric.label}</span>
            {!multiSetting && metricSettings.length === 1 && hasBothAny && (() => {
              const v = getMetricValue(metric.id, metricSettings[0]);
              return <DeltaBadge before={v.before} after={v.after} metric={metric} />;
            })()}
          </div>
          <div className="flex items-center gap-2">
            {anyActive && (
              <button
                onClick={(e) => { e.stopPropagation(); removeMetricFromAllSettings(metric.id, metricSettings); }}
                className="w-5 h-5 flex items-center justify-center rounded text-[#CCCCCC] hover:text-[#EA2C00] transition-colors"
                data-testid={`remove-metric-${metric.id}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {(isExpanded || anyActive) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-2">
                {metricSettings.map(s => {
                  const val = getMetricValue(metric.id, s);
                  const hasBoth = val.before !== 0 && val.after !== 0;
                  return (
                    <div key={s}>
                      {multiSetting && (
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#AAAAAA] uppercase tracking-[1px]">
                            {CARE_SETTING_CONFIGS[s].shortLabel}
                          </span>
                          {hasBoth && <DeltaBadge before={val.before} after={val.after} metric={metric} />}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-0.5">
                          {!multiSetting && <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">Non-Abridge</label>}
                          <FormattedNumberInput
                            value={val.before}
                            onChange={(v) => setMetricValue(metric.id, 'before', v, s)}
                            step={metric.step || 1}
                            className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                            data-testid={`input-${s}-${metric.id}-before`}
                          />
                        </div>
                        <div className="space-y-0.5">
                          {!multiSetting && <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">With Abridge</label>}
                          <FormattedNumberInput
                            value={val.after}
                            onChange={(v) => setMetricValue(metric.id, 'after', v, s)}
                            step={metric.step || 1}
                            className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                            data-testid={`input-${s}-${metric.id}-after`}
                          />
                        </div>
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
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <UnifiedHeader
        pathType="measure"
        currentStep={2}
        totalSteps={7}
        stepName="Select Metrics"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
            data-testid="text-page-title"
          >
            What Are You Measuring?
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2" data-testid="pills-active-settings">
            {activeSettings.map((s, i) => (
              <span key={s} className="text-sm text-[#666666] font-medium">
                {i > 0 && <span className="text-[#CCCCCC] mx-1">&middot;</span>}
                {CARE_SETTING_CONFIGS[s].label}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 px-1 mb-1.5">
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-active-count">
              {totalStats.totalActive} of {totalStats.totalAvailable} metrics active
            </span>
          </div>
          <div className="h-2 bg-[#E8E2DA] rounded-full overflow-hidden" data-testid="progress-bar">
            <motion.div
              className="h-full bg-[#EA2C00] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: totalStats.totalAvailable > 0 ? `${(totalStats.totalActive / totalStats.totalAvailable) * 100}%` : '0%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl p-4 md:p-5 mb-4 bg-white border border-[#E8E2DA] shadow-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="section-foundational"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#EA2C00]" />
            <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#4A4A4A]">Foundational</span>
            <span className="text-[10px] text-[#AAAAAA] ml-auto">always on</span>
          </div>
          <div className="h-px bg-[#E8E2DA] mb-3" />

          {FOUNDATIONAL_GROUPS.map(group => {
            const matchingMetrics = foundationalMetrics.filter(rm =>
              group.metricIds.includes(rm.metric.id)
            );
            if (matchingMetrics.length === 0) return null;

            return (
              <div key={group.label} className="mb-4 last:mb-0">
                <p className="text-sm font-medium text-[#1A1A1A] mb-2">{group.label}</p>
                {matchingMetrics.map(rm => {
                  if (rm.settings.length === 1 && !multiSetting) {
                    const s = rm.settings[0];
                    const val = getMetricValue(rm.metric.id, s);
                    const hasBoth = val.before !== 0 && val.after !== 0;
                    return (
                      <div key={rm.metric.id} className="mb-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">Non-Abridge</label>
                            <FormattedNumberInput
                              value={val.before}
                              onChange={(v) => setMetricValue(rm.metric.id, 'before', v, s)}
                              step={rm.metric.step || 1}
                              className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                              data-testid={`input-foundational-${rm.metric.id}-before`}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">With Abridge</label>
                            <FormattedNumberInput
                              value={val.after}
                              onChange={(v) => setMetricValue(rm.metric.id, 'after', v, s)}
                              step={rm.metric.step || 1}
                              className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                              data-testid={`input-foundational-${rm.metric.id}-after`}
                            />
                          </div>
                        </div>
                        {hasBoth && (
                          <div className="mt-1 text-right">
                            <DeltaBadge before={val.before} after={val.after} metric={rm.metric} />
                          </div>
                        )}
                      </div>
                    );
                  }

                  return rm.settings.map(s => {
                    const val = getMetricValue(rm.metric.id, s);
                    const hasBoth = val.before !== 0 && val.after !== 0;
                    return (
                      <div key={`${rm.metric.id}-${s}`} className="mb-2">
                        <span className="text-[10px] text-[#AAAAAA] uppercase tracking-[1px] block mb-1">
                          {CARE_SETTING_CONFIGS[s].shortLabel}
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <FormattedNumberInput
                              value={val.before}
                              onChange={(v) => setMetricValue(rm.metric.id, 'before', v, s)}
                              step={rm.metric.step || 1}
                              className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                              data-testid={`input-foundational-${s}-${rm.metric.id}-before`}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <FormattedNumberInput
                              value={val.after}
                              onChange={(v) => setMetricValue(rm.metric.id, 'after', v, s)}
                              step={rm.metric.step || 1}
                              className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm flex-1"
                              data-testid={`input-foundational-${s}-${rm.metric.id}-after`}
                            />
                            {hasBoth && <DeltaBadge before={val.before} after={val.after} metric={rm.metric} />}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            );
          })}
        </motion.div>

        <div className="space-y-3 mb-6">
          {domainGroups.map((group, gi) => {
            const phase1Metrics = group.metrics.filter(rm => rm.metric.phase === 1);
            const phase2Metrics = group.metrics.filter(rm => rm.metric.phase === 2);
            const activeInDomain = group.metrics.filter(rm =>
              rm.isOrgWide ? isMetricActive(rm.metric.id) : rm.settings.some(s => isMetricActive(rm.metric.id, s))
            ).length;
            const totalInDomain = group.metrics.length;
            const expandKey = group.domainKey;
            const isExpanded = expandedDomains[expandKey] ?? false;
            const domainColor = DOMAIN_COLORS[group.domainKey === 'capacity-group' ? 'capacity' : group.domainKey] || '#999';

            return (
              <motion.div
                key={group.domainKey}
                className="rounded-xl border border-[#E8E2DA] bg-[#FAF8F5] overflow-hidden shadow-sm"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + gi * 0.05 }}
                data-testid={`domain-accordion-${group.domainKey}`}
              >
                <button
                  onClick={() => toggleDomain(expandKey)}
                  className="w-full flex items-center gap-2.5 px-4 py-4 text-left group border-b border-transparent"
                  data-testid={`domain-toggle-${group.domainKey}`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: domainColor }}
                  />
                  <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#4A4A4A] flex-1">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-[#AAAAAA] font-medium">
                    {activeInDomain} of {totalInDomain} active
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 text-[#BBBBBB] transition-transform duration-200 group-hover:text-[#888888] ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden border-t border-[#E8E2DA]/60"
                    >
                      <div className="px-4 py-2">
                        {phase1Metrics.length > 0 && (
                          <div className="mb-2">
                            <p className="text-[10px] font-semibold text-[#999999] uppercase tracking-[1.5px] mb-1">
                              Documentation impact
                            </p>
                            {phase1Metrics.map(rm => renderMetricRow(rm))}
                          </div>
                        )}

                        {phase2Metrics.length > 0 && (
                          <div className="opacity-40 mt-3">
                            <p className="text-[10px] font-semibold text-[#999999] uppercase tracking-[1.5px] mb-1">
                              {multiSetting
                                ? SETTING_THIRD_CHAPTER_LABELS[activeSettings[0]]
                                : SETTING_THIRD_CHAPTER_LABELS[activeSettings[0]]
                              }
                            </p>
                            {phase2Metrics.map(rm => renderMetricRow(rm))}
                          </div>
                        )}

                        <div className="pt-2 border-t border-[#E8E2DA]/40 mt-2">
                          <button
                            onClick={() => addSurveyMetric(group.domainKey === 'capacity-group' ? 'capacity' : group.domainKey)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-[#EA2C00] hover:bg-[#FFF0EC] rounded-md transition-colors"
                            data-testid={`button-add-custom-${group.domainKey}`}
                          >
                            <Plus className="w-3 h-3" />
                            Add Custom Metric
                          </button>
                        </div>

                        {(state.surveyMetrics || []).filter(sm => {
                          const smDomain = (sm.domain || '').toLowerCase();
                          return group.domainKey === 'capacity-group'
                            ? ['capacity', 'throughput', 'patientFlow', 'staffing'].includes(smDomain)
                            : smDomain === group.domainKey;
                        }).map(sm => (
                          <div key={sm.id} className="px-0 py-2 border-b border-[#F5F5F5] last:border-b-0" data-testid={`survey-metric-${sm.id}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                value={sm.label}
                                onChange={e => updateSurveyMetric(sm.id, { label: e.target.value })}
                                placeholder="Metric name"
                                className="flex-1 h-8 bg-white border border-[#E5E5E5] rounded-md px-2.5 text-sm font-medium text-black placeholder:text-[#CCCCCC] focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30"
                                data-testid={`input-survey-label-${sm.id}`}
                              />
                              <button
                                onClick={() => removeSurveyMetric(sm.id)}
                                className="w-7 h-7 flex items-center justify-center rounded text-[#CCCCCC] hover:text-[#EA2C00] transition-colors"
                                data-testid={`button-remove-survey-${sm.id}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">Before</label>
                                <FormattedNumberInput
                                  value={sm.before}
                                  onChange={v => updateSurveyMetric(sm.id, { before: v })}
                                  step={0.1}
                                  className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                                  data-testid={`input-survey-before-${sm.id}`}
                                />
                              </div>
                              <div className="space-y-0.5">
                                <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">After</label>
                                <FormattedNumberInput
                                  value={sm.after}
                                  onChange={v => updateSurveyMetric(sm.id, { after: v })}
                                  step={0.1}
                                  className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                                  data-testid={`input-survey-after-${sm.id}`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="rounded-lg overflow-visible mb-6 bg-[#F9F7F4] border border-[#E8E2DA]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={() => setShowAssumptions(!showAssumptions)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            data-testid="section-toggle-assumptions"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-[#999999]" />
              <span className="text-xs font-semibold text-[#666666] uppercase tracking-[1.5px]">Model Assumptions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#AAAAAA]">Defaults applied</span>
              <Pencil className="w-3 h-3 text-[#CCCCCC]" />
              {showAssumptions ? <ChevronUp className="w-3.5 h-3.5 text-[#999999]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#999999]" />}
            </div>
          </button>
          <AnimatePresence>
            {showAssumptions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4">
                  {activeSettings.length > 1 && (
                    <div className="flex gap-2">
                      {activeSettings.map(s => (
                        <button
                          key={s}
                          onClick={() => updateState({ careSetting: s })}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border
                            ${activeSetting === s
                              ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                              : 'bg-white text-[#888888] border-[#E5E5E5] hover:border-[#CCCCCC]'
                            }`}
                          data-testid={`assumption-setting-${s}`}
                        >
                          {CARE_SETTING_CONFIGS[s].shortLabel}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {config.valueModel.map(field => (
                      <div key={field.key} className="space-y-1">
                        <label className="text-xs font-medium text-black">{field.label}</label>
                        <div className="relative">
                          {field.prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888] text-xs">{field.prefix}</span>}
                          <FormattedNumberInput
                            value={settingMetrics[`vm_${field.key}`] ?? field.defaultValue}
                            onChange={(v) => {
                              const current = state.settingData?.[activeSetting] || getDefaultMetrics(activeSetting);
                              updateState({
                                settingData: { ...state.settingData, [activeSetting]: { ...current, [`vm_${field.key}`]: v } },
                              });
                            }}
                            className={`h-9 bg-white border-[#E5E5E5] text-right text-sm ${field.prefix ? "pl-6" : ""} ${field.suffix ? "pr-8" : ""}`}
                            data-testid={`input-vm-${field.key}`}
                          />
                          {field.suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] text-xs">{field.suffix}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-[#E5E5E5]/60" />
                  <div>
                    <span className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px] mb-1 block">Attribution Range</span>
                    <div className="h-9 bg-white border border-[#E5E5E5] rounded-md flex items-center px-3 text-sm text-[#666666]">50 – 75%</div>
                  </div>
                  <div className="h-px bg-[#E5E5E5]/60" />
                  <div>
                    <span className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px] mb-2 block">Time Allocation</span>
                    <div className="grid grid-cols-2 gap-3">
                      {config.allocationFields.map(field => (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs font-medium text-black">{field.label}</label>
                          <div className="relative">
                            <FormattedNumberInput
                              value={settingMetrics[field.key] ?? field.defaultValue}
                              onChange={(v) => {
                                const current = state.settingData?.[activeSetting] || getDefaultMetrics(activeSetting);
                                updateState({
                                  settingData: { ...state.settingData, [activeSetting]: { ...current, [field.key]: Math.max(0, Math.min(100, v)) } },
                                });
                              }}
                              className="h-9 bg-white border-[#E5E5E5] text-right text-sm pr-7"
                              data-testid={`input-alloc-${field.key}`}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] text-xs">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className={`text-[11px] mt-1.5 ${allocationValid ? "text-green-600" : "text-red-500"}`} data-testid="text-allocation-check">
                      Must equal 100%: {allocationValid ? "\u2713" : `${allocationTotal}%`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={onNext}
            disabled={!hasAnyData || !allocationValid}
            className={`h-[52px] px-8 font-semibold rounded-lg text-base gap-2 transition-all
              ${hasAnyData && allocationValid
                ? 'bg-[#EA2C00] hover:bg-[#D42800] text-white'
                : 'bg-[#E0E0E0] text-[#999999] cursor-not-allowed'
              }`}
            data-testid="button-next"
          >
            View Journey Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
