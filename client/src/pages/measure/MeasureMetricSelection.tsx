import { useState, useCallback, useMemo } from "react";
import { ArrowRight, Check, Plus, X, Activity, Settings2, Pencil, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
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
  getDefaultMetrics,
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

export default function MeasureMetricSelection({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: MeasureMetricSelectionProps) {
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [showAssumptions, setShowAssumptions] = useState(false);

  const activeSettings = state.activeCareSettings?.length > 0
    ? state.activeCareSettings
    : [state.careSetting || 'outpatient' as MeasureCareSetting];

  const toggleSetting = useCallback((setting: MeasureCareSetting) => {
    const current = [...activeSettings];
    const idx = current.indexOf(setting);
    if (idx >= 0) {
      if (current.length <= 1) return;
      current.splice(idx, 1);
      const newEnabled = { ...state.enabledMetrics };
      delete newEnabled[setting];
      const newSettingData = { ...state.settingData };
      delete newSettingData[setting];
      const newSurvey = (state.surveyMetrics || []).filter(sm => sm.setting !== setting);
      updateState({
        activeCareSettings: current,
        careSetting: current[0],
        enabledMetrics: newEnabled,
        settingData: newSettingData,
        surveyMetrics: newSurvey,
      });
    } else {
      current.push(setting);
      updateState({
        activeCareSettings: current,
        careSetting: setting,
      });
    }
  }, [activeSettings, state.enabledMetrics, state.settingData, state.surveyMetrics, updateState]);

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

  const updateMetricValue = useCallback((setting: MeasureCareSetting, key: string, value: number) => {
    const current = state.settingData?.[setting] || {};
    updateState({
      settingData: { ...state.settingData, [setting]: { ...current, [key]: value } },
    });
  }, [state.settingData, updateState]);

  const updateSettingMetric = useCallback((setting: MeasureCareSetting, key: string, value: number) => {
    const current = state.settingData?.[setting] || getDefaultMetrics(setting);
    updateState({
      settingData: { ...state.settingData, [setting]: { ...current, [key]: value } },
    });
  }, [state.settingData, updateState]);

  const getSurveyMetricsForSettingDomain = useCallback((setting: MeasureCareSetting, domainKey: string): SurveyMetric[] => {
    return (state.surveyMetrics || []).filter(sm => {
      const smDomain = (sm.domain || 'Workforce').toLowerCase();
      return smDomain === domainKey && sm.setting === setting;
    });
  }, [state.surveyMetrics]);

  const totalStats = useMemo(() => {
    let totalAvailable = 0;
    let totalEnabled = 0;
    for (const s of activeSettings) {
      totalAvailable += getTotalAvailableMetrics(s);
      const enabled = state.enabledMetrics?.[s] || {};
      for (const [, isOn] of Object.entries(enabled)) {
        if (isOn) totalEnabled++;
      }
    }
    const validSurvey = (state.surveyMetrics || []).filter(sm => sm.label.trim()).length;
    return { totalAvailable: totalAvailable + validSurvey, totalEnabled: totalEnabled + validSurvey };
  }, [activeSettings, state.enabledMetrics, state.surveyMetrics]);

  const gapCount = totalStats.totalAvailable - totalStats.totalEnabled;

  const addSurveyMetric = useCallback((setting: MeasureCareSetting, domainKey: string) => {
    const domainLabel = domainKey.charAt(0).toUpperCase() + domainKey.slice(1);
    const newMetric: SurveyMetric = {
      id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: '',
      before: 0,
      after: 0,
      domain: domainLabel,
      setting,
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

  const activeSetting = state.careSetting || activeSettings[0] || 'outpatient';
  const config = CARE_SETTING_CONFIGS[activeSetting];
  const settingMetrics = state.settingData?.[activeSetting] || getDefaultMetrics(activeSetting);

  const allocationKeys = config.allocationFields.map(f => f.key);
  const allocationTotal = allocationKeys.reduce((sum, key) => sum + (settingMetrics[key] ?? config.allocationFields.find(f => f.key === key)?.defaultValue ?? 0), 0);
  const allocationValid = allocationTotal === 100;

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
            Select care settings, toggle metrics, and enter before/after data.
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
            const cfg = CARE_SETTING_CONFIGS[setting];
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
                {cfg.shortLabel}
                {isActive && <span className="ml-1.5 text-[10px] opacity-70">{"\u2713"}</span>}
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
                {gapCount} not tracking
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
          const settingConfig = CARE_SETTING_CONFIGS[setting];
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
                    {settingConfig.label}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {domains.map(domain => {
                  const section = settingConfig.metricSections.find(s => s.key === domain.key);
                  const domainMetrics = section?.metrics.filter(m => m.hasBeforeAfter) || [];
                  const enabledInDomain = domainMetrics.filter(m => enabledMap[m.key]).length;
                  const expandKey = `${setting}_${domain.key}`;
                  const isExpanded = expandedDomains[expandKey] ?? (enabledInDomain > 0);
                  const domainSurveyMetrics = getSurveyMetricsForSettingDomain(setting, domain.key);

                  return (
                    <div
                      key={domain.key}
                      className="rounded-xl border border-[#E8E2DA] bg-[#FAF8F5] overflow-hidden shadow-sm"
                      data-testid={`domain-card-${setting}-${domain.key}`}
                    >
                      <button
                        onClick={() => toggleDomain(expandKey)}
                        className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left group"
                        data-testid={`domain-toggle-${setting}-${domain.key}`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: DOMAIN_COLORS[domain.key] || '#999' }}
                        />
                        <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#4A4A4A] flex-1">
                          {domain.label}
                        </span>
                        {domainMetrics.length > 0 && (
                          <span className="text-[10px] text-[#AAAAAA] font-medium">
                            {enabledInDomain}/{domainMetrics.length}
                          </span>
                        )}
                        {domainMetrics.length === 0 && domainSurveyMetrics.length === 0 && (
                          <span className="text-[10px] text-[#CCCCCC] italic">
                            Add custom metrics below
                          </span>
                        )}
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
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden border-t border-[#E8E2DA]/60"
                          >
                            {domainMetrics.length > 0 && (
                              <div className="divide-y divide-[#EDE8E1]">
                                {domainMetrics.map(metric => {
                                  const isEnabled = !!enabledMap[metric.key];

                                  return (
                                    <div key={metric.key} className="transition-all duration-200">
                                      <button
                                        onClick={() => toggleMetric(setting, metric.key)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                                          ${isEnabled ? 'bg-white/70' : 'bg-transparent'}
                                        `}
                                        data-testid={`toggle-metric-${setting}-${metric.key}`}
                                      >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                                          ${isEnabled ? 'bg-[#EA2C00] border-[#EA2C00]' : 'border-[#D0D0D0] bg-white'}
                                        `}>
                                          {isEnabled && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={`text-sm font-medium flex-1 ${isEnabled ? 'text-[#1A1A1A]' : 'text-[#AAAAAA]'}`}>
                                          {metric.label}
                                        </span>
                                        {isEnabled && (settingData[`${metric.key}_before`] ?? 0) !== 0 && (settingData[`${metric.key}_after`] ?? 0) !== 0 && (
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
                                                    onChange={(v) => updateMetricValue(setting, `${metric.key}_before`, v)}
                                                    step={metric.step}
                                                    className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                                                    data-testid={`input-${setting}-${metric.key}-before`}
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">With Abridge</label>
                                                  <FormattedNumberInput
                                                    value={settingData[`${metric.key}_after`] ?? 0}
                                                    onChange={(v) => updateMetricValue(setting, `${metric.key}_after`, v)}
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
                            )}

                            {domainSurveyMetrics.length > 0 && (
                              <div className="border-t border-[#E8E2DA]/60">
                                {domainSurveyMetrics.map(sm => (
                                  <div key={sm.id} className="px-4 py-3 border-b border-[#F5F5F5] last:border-b-0" data-testid={`survey-metric-${sm.id}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Activity className="w-3 h-3 text-[#EA2C00] flex-shrink-0" />
                                      <input
                                        type="text"
                                        value={sm.label}
                                        onChange={e => updateSurveyMetric(sm.id, { label: e.target.value })}
                                        placeholder="Metric name (e.g., Clinician Satisfaction)"
                                        className="flex-1 h-8 bg-white border border-[#E5E5E5] rounded-md px-2.5 text-sm font-medium text-black placeholder:text-[#CCCCCC] focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30 focus:border-[#EA2C00]/50"
                                        data-testid={`input-survey-label-${sm.id}`}
                                      />
                                      <button
                                        onClick={() => removeSurveyMetric(sm.id)}
                                        className="w-7 h-7 flex items-center justify-center rounded text-[#CCCCCC] hover:text-[#EA2C00] hover:bg-[#FFF0EC] transition-colors"
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
                                          className="h-9 bg-[#FAFAF8] border-[#E5E5E5] text-right text-sm"
                                          data-testid={`input-survey-before-${sm.id}`}
                                        />
                                      </div>
                                      <div className="space-y-1">
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
                                    <div className="mt-2">
                                      <input
                                        type="text"
                                        value={sm.unit || ''}
                                        onChange={e => updateSurveyMetric(sm.id, { unit: e.target.value })}
                                        placeholder="Unit (%, score, NPS)"
                                        className="h-7 w-28 bg-white border border-[#E5E5E5] rounded-md px-2 text-[11px] text-[#666666] placeholder:text-[#CCCCCC] focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30"
                                        data-testid={`input-survey-unit-${sm.id}`}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="px-4 py-2.5 border-t border-[#E8E2DA]/60">
                              <button
                                onClick={() => addSurveyMetric(setting, domain.key)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-[#EA2C00] hover:bg-[#FFF0EC] rounded-md transition-colors"
                                data-testid={`button-add-custom-${setting}-${domain.key}`}
                              >
                                <Plus className="w-3 h-3" />
                                Add Custom Metric
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {settingConfig.deploymentFields && settingConfig.deploymentFields.length > 0 && (
                <div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF8] p-4 mt-3">
                  <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#888888] mb-2 block">
                    {settingConfig.label} Deployment
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {settingConfig.deploymentFields.map(field => {
                      const currentMetrics = state.settingData?.[setting] || getDefaultMetrics(setting);
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs font-medium text-black">{field.label}</label>
                          <div className="relative">
                            <FormattedNumberInput
                              value={currentMetrics[`deploy_${field.key}`] ?? 0}
                              onChange={(v) => updateSettingMetric(setting, `deploy_${field.key}`, v)}
                              className={`h-9 bg-white border-[#E5E5E5] text-right text-sm ${field.suffix ? "pr-8" : ""}`}
                              data-testid={`input-deploy-${field.key}`}
                            />
                            {field.suffix && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-xs">{field.suffix}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        <motion.div
          className="rounded-lg border border-[#E5E5E5] bg-white overflow-hidden mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F0F0F0]">
            <Activity className="w-3.5 h-3.5 text-[#EA2C00]" />
            <span className="text-xs font-semibold uppercase tracking-[1.5px] text-[#666666]">Trend Data (Monthly)</span>
            <div className="ml-auto">
              <button
                onClick={() => updateState({
                  trendConfig: { ...state.trendConfig, enabled: !state.trendConfig.enabled },
                })}
                className={`w-9 h-[18px] rounded-full transition-colors flex items-center ${state.trendConfig.enabled ? 'bg-[#EA2C00] justify-end' : 'bg-[#E5E5E5] justify-start'}`}
                data-testid="toggle-trend-enabled"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm mx-0.5" />
              </button>
            </div>
          </div>
          {state.trendConfig.enabled && (
            <div className="px-4 py-3 space-y-3">
              <p className="text-[10px] text-[#999999]">Enter monthly values to track trends over time.</p>
              {[
                { key: 'timeInNotes' as const, label: 'Time in Notes (min)' },
                { key: 'wrvu' as const, label: 'wRVU/encounter' },
                { key: 'emLevel' as const, label: 'E/M Level' },
                { key: 'sameDayClosure' as const, label: 'Same-Day Closure (%)' },
              ].map(trendMetric => {
                const data = state.trendConfig.monthlyData[trendMetric.key] || [];
                const monthCount = Math.max(data.length, state.deployment.monthsOnAbridge || 6, 6);
                return (
                  <div key={trendMetric.key}>
                    <p className="text-[11px] font-semibold text-[#666666] mb-1.5">{trendMetric.label}</p>
                    <div className="flex gap-1 flex-wrap">
                      {Array.from({ length: monthCount }, (_, i) => (
                        <div key={i} className="w-12">
                          <p className="text-[8px] text-[#BBBBBB] text-center mb-0.5">M{i + 1}</p>
                          <input
                            type="number"
                            value={data[i] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              const newData = [...data];
                              while (newData.length <= i) newData.push(0);
                              newData[i] = val;
                              updateState({
                                trendConfig: {
                                  ...state.trendConfig,
                                  monthlyData: { ...state.trendConfig.monthlyData, [trendMetric.key]: newData },
                                },
                              });
                            }}
                            className="w-full h-7 text-center text-[11px] bg-[#FAFAF8] border border-[#E5E5E5] rounded focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30"
                            data-testid={`input-trend-${trendMetric.key}-${i}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

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
                  <div className="grid grid-cols-2 gap-3">
                    {config.valueModel.map(field => (
                      <div key={field.key} className="space-y-1">
                        <label className="text-xs font-medium text-black">{field.label}</label>
                        <div className="relative">
                          {field.prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888] text-xs">{field.prefix}</span>}
                          <FormattedNumberInput
                            value={settingMetrics[`vm_${field.key}`] ?? field.defaultValue}
                            onChange={(v) => updateSettingMetric(activeSetting, `vm_${field.key}`, v)}
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
                              onChange={(v) => updateSettingMetric(activeSetting, field.key, Math.max(0, Math.min(100, v)))}
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
            disabled={totalStats.totalEnabled === 0 || !allocationValid}
            className={`h-[52px] px-8 font-semibold rounded-lg text-base gap-2 transition-all
              ${totalStats.totalEnabled > 0 && allocationValid
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
