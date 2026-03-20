import { useState, useCallback, useMemo } from "react";
import { ArrowRight, Check, Plus, X, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  type SurveyMetric,
} from "@/lib/measureCalculator";
import {
  CARE_SETTING_CONFIGS,
  CARE_SETTING_ORDER,
  getSettingDomains,
  getTotalAvailableMetrics,
  type DomainKey,
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
};

const SURVEY_DOMAIN_OPTIONS = [
  { key: 'Workforce', label: 'Workforce' },
  { key: 'Quality', label: 'Quality' },
  { key: 'Revenue', label: 'Revenue' },
  { key: 'Capacity', label: 'Capacity' },
];

export default function MeasureMetricSelection({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: MeasureMetricSelectionProps) {
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});

  const activeSettings = useMemo(() => {
    const settings: MeasureCareSetting[] = [];
    for (const s of CARE_SETTING_ORDER) {
      const enabled = state.enabledMetrics?.[s];
      const hasEnabled = enabled && Object.values(enabled).some(Boolean);
      const hasData = state.settingData[s] && Object.entries(state.settingData[s]!).some(
        ([k, v]) => (k.endsWith('_before') || k.endsWith('_after')) && v !== 0
      );
      if (hasEnabled || hasData || s === (state.careSetting || 'outpatient')) {
        settings.push(s);
      }
    }
    if (settings.length === 0) settings.push('outpatient');
    return settings;
  }, [state.careSetting, state.enabledMetrics, state.settingData]);

  const toggleSetting = useCallback((setting: MeasureCareSetting) => {
    const isActive = activeSettings.includes(setting);
    if (isActive && activeSettings.length <= 1) return;
    if (isActive) {
      const newEnabled = { ...state.enabledMetrics };
      delete newEnabled[setting];
      const newSettingData = { ...state.settingData };
      delete newSettingData[setting];
      updateState({ enabledMetrics: newEnabled, settingData: newSettingData });
    } else {
      updateState({ careSetting: setting });
    }
  }, [activeSettings, state.enabledMetrics, state.settingData, updateState]);

  const toggleMetric = useCallback((setting: MeasureCareSetting, metricKey: string) => {
    const current = state.enabledMetrics?.[setting] || {};
    const wasEnabled = !!current[metricKey];
    const updated = { ...current, [metricKey]: !wasEnabled };
    const stateUpdate: Partial<MeasureState> = {
      enabledMetrics: { ...state.enabledMetrics, [setting]: updated },
    };
    if (wasEnabled) {
      const settingData = { ...(state.settingData[setting] || {}) };
      settingData[`${metricKey}_before`] = 0;
      settingData[`${metricKey}_after`] = 0;
      stateUpdate.settingData = { ...state.settingData, [setting]: settingData };
    }
    updateState(stateUpdate);
  }, [state.enabledMetrics, state.settingData, updateState]);

  const updateMetric = useCallback((setting: MeasureCareSetting, key: string, value: number) => {
    const current = state.settingData?.[setting] || {};
    updateState({
      settingData: { ...state.settingData, [setting]: { ...current, [key]: value } },
    });
  }, [state.settingData, updateState]);

  const totalStats = useMemo(() => {
    let totalAvailable = 0;
    let totalEnabled = 0;
    let totalWithData = 0;
    for (const s of activeSettings) {
      totalAvailable += getTotalAvailableMetrics(s);
      const enabled = state.enabledMetrics?.[s] || {};
      const settingData = state.settingData[s] || {};
      for (const [key, isOn] of Object.entries(enabled)) {
        if (!isOn) continue;
        totalEnabled++;
        const b = settingData[`${key}_before`] ?? 0;
        const a = settingData[`${key}_after`] ?? 0;
        if (b !== 0 && a !== 0) totalWithData++;
      }
    }
    const validSurvey = (state.surveyMetrics || []).filter(sm => sm.label.trim()).length;
    return { totalAvailable: totalAvailable + validSurvey, totalEnabled: totalEnabled + validSurvey, totalWithData };
  }, [activeSettings, state.enabledMetrics, state.settingData, state.surveyMetrics]);

  const gapCount = totalStats.totalAvailable - totalStats.totalEnabled;

  const addSurveyMetric = useCallback(() => {
    const newMetric: SurveyMetric = {
      id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: '',
      before: 0,
      after: 0,
      domain: 'Workforce',
    };
    updateState({ surveyMetrics: [...(state.surveyMetrics || []), newMetric] });
  }, [state.surveyMetrics, updateState]);

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

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <UnifiedHeader
        pathType="measure"
        currentStep={2}
        totalSteps={8}
        stepName="Select Metrics"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div
          className="text-center mb-8"
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
          <p className="text-base text-[#666666]" data-testid="text-page-subtitle">
            Select care settings and toggle the metrics you're tracking.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-wrap gap-2 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          data-testid="pills-care-settings"
        >
          {CARE_SETTING_ORDER.map(setting => {
            const config = CARE_SETTING_CONFIGS[setting];
            const isActive = activeSettings.includes(setting);
            return (
              <button
                key={setting}
                onClick={() => toggleSetting(setting)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all border
                  ${isActive
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm'
                    : 'bg-white text-[#888888] border-[#E5E5E5] hover:border-[#CCCCCC] hover:text-[#666666]'
                  }`}
                data-testid={`pill-${setting}`}
              >
                {config.shortLabel}
                {isActive && (
                  <span className="ml-1.5 text-[10px] opacity-70">✓</span>
                )}
              </button>
            );
          })}
        </motion.div>

        <motion.div
          className="flex items-center justify-between mb-4 px-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-enabled-count">
              {totalStats.totalEnabled} metrics selected
            </span>
            {gapCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFF0EC] text-[#EA2C00] font-medium" data-testid="text-gap-count">
                {gapCount} available
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 rounded-full overflow-hidden w-24 bg-[#E5E5E5]">
              <div
                className="bg-[#EA2C00] rounded-full transition-all duration-500"
                style={{ width: `${totalStats.totalAvailable > 0 ? (totalStats.totalEnabled / totalStats.totalAvailable) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-[#888888]">
              {totalStats.totalEnabled}/{totalStats.totalAvailable}
            </span>
          </div>
        </motion.div>

        {activeSettings.map((setting, settingIdx) => {
          const config = CARE_SETTING_CONFIGS[setting];
          const domains = getSettingDomains(setting);
          const enabledMap = state.enabledMetrics?.[setting] || {};
          const settingData = state.settingData[setting] || {};

          return (
            <motion.div
              key={setting}
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + settingIdx * 0.1 }}
            >
              {activeSettings.length > 1 && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-[#EA2C00]" />
                  <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#666666]">
                    {config.label}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {domains.map(domain => {
                  const section = config.metricSections.find(s => s.key === domain.key);
                  const domainMetrics = section?.metrics.filter(m => m.hasBeforeAfter) || [];
                  const enabledInDomain = domainMetrics.filter(m => enabledMap[m.key]).length;
                  const expandKey = `${setting}_${domain.key}`;
                  const isExpanded = expandedDomains[expandKey] ?? (enabledInDomain > 0);

                  return (
                    <div
                      key={domain.key}
                      className="rounded-lg border border-[#E5E5E5] bg-white overflow-hidden"
                      data-testid={`domain-card-${setting}-${domain.key}`}
                    >
                      <button
                        onClick={() => toggleDomain(expandKey)}
                        className="w-full flex items-center gap-2 px-4 py-3 border-b border-[#F0F0F0] text-left"
                        data-testid={`domain-toggle-${setting}-${domain.key}`}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: DOMAIN_COLORS[domain.key] || '#999' }}
                        />
                        <span className="text-xs font-semibold uppercase tracking-[1.5px] text-[#666666] flex-1">
                          {domain.label}
                        </span>
                        {domainMetrics.length > 0 && (
                          <span className="text-[10px] text-[#BBBBBB]">
                            {enabledInDomain}/{domainMetrics.length}
                          </span>
                        )}
                        {domainMetrics.length === 0 && (
                          <span className="text-[10px] text-[#CCCCCC] italic">
                            Coming soon
                          </span>
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && domainMetrics.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="divide-y divide-[#F5F5F5]">
                              {domainMetrics.map(metric => {
                                const isEnabled = !!enabledMap[metric.key];
                                const hasBefore = (settingData[`${metric.key}_before`] ?? 0) !== 0;
                                const hasAfter = (settingData[`${metric.key}_after`] ?? 0) !== 0;

                                return (
                                  <div key={metric.key} className="transition-all duration-200">
                                    <button
                                      onClick={() => toggleMetric(setting, metric.key)}
                                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                                        ${isEnabled ? 'bg-white' : 'bg-[#FAFAF8]'}
                                      `}
                                      data-testid={`toggle-metric-${setting}-${metric.key}`}
                                    >
                                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                                        ${isEnabled ? 'bg-[#EA2C00] border-[#EA2C00]' : 'border-[#D0D0D0] bg-white'}
                                      `}>
                                        {isEnabled && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-sm font-medium ${isEnabled ? 'text-[#1A1A1A]' : 'text-[#AAAAAA]'}`}>
                                          {metric.label}
                                        </span>
                                        {metric.optional && (
                                          <span className="text-[10px] text-[#CCCCCC] ml-1.5">(optional)</span>
                                        )}
                                      </div>
                                      {isEnabled && hasBefore && hasAfter && (
                                        <Check className="w-3.5 h-3.5 text-[#2D8A4E] flex-shrink-0" />
                                      )}
                                    </button>

                                    <AnimatePresence>
                                      {isEnabled && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                                          className="overflow-hidden"
                                        >
                                          <div className="px-4 pb-3 pt-1">
                                            <div className="grid grid-cols-2 gap-3">
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">Non-Abridge</label>
                                                <FormattedNumberInput
                                                  value={settingData[`${metric.key}_before`] ?? 0}
                                                  onChange={(v) => updateMetric(setting, `${metric.key}_before`, v)}
                                                  step={metric.step}
                                                  className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                                                  data-testid={`input-${setting}-${metric.key}-before`}
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">With Abridge</label>
                                                <FormattedNumberInput
                                                  value={settingData[`${metric.key}_after`] ?? 0}
                                                  onChange={(v) => updateMetric(setting, `${metric.key}_after`, v)}
                                                  step={metric.step}
                                                  className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                                                  data-testid={`input-${setting}-${metric.key}-after`}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
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
            </motion.div>
          );
        })}

        <motion.div
          className="rounded-lg border border-dashed border-[#D0D0D0] bg-[#FAFAF8] overflow-hidden mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          data-testid="section-survey-metrics"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F0F0F0]">
            <Activity className="w-3.5 h-3.5 text-[#EA2C00]" />
            <span className="text-xs font-semibold uppercase tracking-[1.5px] text-[#666666]">Survey & Feedback Data</span>
            <span className="text-[10px] text-[#BBBBBB] ml-auto">
              {(state.surveyMetrics || []).filter(sm => sm.label.trim()).length} added
            </span>
          </div>

          {(state.surveyMetrics || []).length > 0 && (
            <div className="divide-y divide-[#F0F0F0]">
              {(state.surveyMetrics || []).map(sm => (
                <div key={sm.id} className="px-4 py-3" data-testid={`survey-metric-${sm.id}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={sm.label}
                      onChange={e => updateSurveyMetric(sm.id, { label: e.target.value })}
                      placeholder="e.g., Clinician Satisfaction Score"
                      className="flex-1 h-9 bg-white border border-[#E5E5E5] rounded-md px-3 text-sm font-medium text-black placeholder:text-[#CCCCCC] focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30 focus:border-[#EA2C00]/50"
                      data-testid={`input-survey-label-${sm.id}`}
                    />
                    <select
                      value={sm.domain}
                      onChange={e => updateSurveyMetric(sm.id, { domain: e.target.value })}
                      className="h-9 px-2 bg-white border border-[#E5E5E5] rounded-md text-xs text-[#666666] focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30"
                      data-testid={`select-survey-domain-${sm.id}`}
                    >
                      {SURVEY_DOMAIN_OPTIONS.map(opt => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeSurveyMetric(sm.id)}
                      className="w-8 h-8 flex items-center justify-center rounded text-[#CCCCCC] hover:text-[#EA2C00] hover:bg-[#FFF0EC] transition-colors"
                      data-testid={`button-remove-survey-${sm.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">Before</label>
                      <FormattedNumberInput
                        value={sm.before}
                        onChange={v => updateSurveyMetric(sm.id, { before: v })}
                        step={0.1}
                        className="h-9 bg-white border-[#E5E5E5] text-right text-sm"
                        data-testid={`input-survey-before-${sm.id}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">After</label>
                      <FormattedNumberInput
                        value={sm.after}
                        onChange={v => updateSurveyMetric(sm.id, { after: v })}
                        step={0.1}
                        className="h-9 bg-white border-[#E5E5E5] text-right text-sm"
                        data-testid={`input-survey-after-${sm.id}`}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={sm.unit || ''}
                      onChange={e => updateSurveyMetric(sm.id, { unit: e.target.value })}
                      placeholder="Unit (e.g., %, score, NPS)"
                      className="h-8 w-32 bg-white border border-[#E5E5E5] rounded-md px-2.5 text-xs text-[#666666] placeholder:text-[#CCCCCC] focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30"
                      data-testid={`input-survey-unit-${sm.id}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-3">
            <button
              onClick={addSurveyMetric}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#EA2C00] hover:bg-[#FFF0EC] rounded-md transition-colors"
              data-testid="button-add-survey-metric"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Survey / Feedback Metric
            </button>
            {(state.surveyMetrics || []).length === 0 && (
              <p className="text-[10px] text-[#BBBBBB] mt-1.5 ml-1">
                Track satisfaction scores, burnout indexes, NPS, or any other survey data with before/after comparison.
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={onNext}
            disabled={totalStats.totalEnabled === 0}
            className={`h-[52px] px-8 font-semibold rounded-lg text-base gap-2 transition-all
              ${totalStats.totalEnabled > 0
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
