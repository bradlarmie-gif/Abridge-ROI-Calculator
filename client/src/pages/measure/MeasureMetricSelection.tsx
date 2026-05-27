import { useState, useCallback, useMemo, useEffect } from "react";
import { ArrowRight, Plus, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  type MetricEntry,
  metricKey,
} from "@/lib/measureCalculator";
import {
  CARE_SETTING_CONFIGS,
  getMetricsForSettings,
  ORG_WIDE_METRIC_IDS,
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

const FOURTH_DOMAIN_VARIANTS: DomainKey[] = ["capacity", "throughput", "patientFlow", "staffing"];

interface DomainSection {
  key: string;
  label: string;
  description: string;
  metrics: ResolvedMetric[];
}

const DOMAIN_META: Record<string, { label: string; description: string }> = {
  foundational: {
    label: "Platform Adoption",
    description: "Usage and adoption signals. These anchor every downstream calculation — auto-populated from your partner profile where available.",
  },
  quality: {
    label: "Documentation Quality",
    description: "What changed in the quality and completeness of clinical documentation at the point of care.",
  },
  workforce: {
    label: "Workforce & Burden",
    description: "How clinician time, after-hours work, and intent to stay have shifted since Abridge.",
  },
  revenue: {
    label: "Revenue & Billing",
    description: "Whether documentation changes reached the billing, coding, and risk adjustment record.",
  },
  capacity: {
    label: "Capacity & Throughput",
    description: "What happened to available time, visit volume, and patient access.",
  },
  throughput: {
    label: "Throughput & Flow",
    description: "How patient flow and visit efficiency have shifted.",
  },
  patientFlow: {
    label: "Patient Flow",
    description: "Impact on patient movement and care transitions.",
  },
  staffing: {
    label: "Staffing Stability",
    description: "Whether reduced burden has improved staffing stability and reduced agency reliance.",
  },
};

interface CustomMetric {
  id: string;
  name: string;
  unit: string;
  before: number | "";
  after: number | "";
}

function SectionDivider({ label, context }: { label: string; context?: string }) {
  return (
    <div className="border-t border-[#EDE8E2] pt-5 mt-8">
      <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-widest mb-1">{label}</p>
      {context && <p className="text-[11px] text-[#AAAAAA] leading-relaxed mb-1">{context}</p>}
    </div>
  );
}

function DeltaBadge({
  before, after, lowerIsBetter, unit,
}: {
  before: number; after: number; lowerIsBetter: boolean; unit: string;
}) {
  const delta = after - before;
  if (delta === 0 || before === 0) return null;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const pct = Math.round(Math.abs(delta / before) * 100);
  const sign = delta > 0 ? "+" : "";
  const displayUnit = unit === "%" ? "pp" : "";
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
        improved ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#F5F0EB] text-[#999999]"
      }`}
      data-testid="badge-delta"
    >
      {sign}{delta.toFixed(1)}{displayUnit}
      {pct > 0 && <span className="text-[10px] opacity-60"> ({pct}%)</span>}
    </span>
  );
}

function AutoPopulatedRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#F0EDE8] last:border-b-0">
      <div>
        <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
        <p className="text-[11px] text-[#AAAAAA] mt-0.5">{note}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-[#EA2C00]">{value}</p>
        <p className="text-[10px] text-[#BBBBBB]">auto-populated</p>
      </div>
    </div>
  );
}

function MetricInputRow({
  rm,
  metricValues,
  onUpdate,
  onActivate,
}: {
  rm: ResolvedMetric;
  metricValues: Record<string, MetricEntry>;
  onUpdate: (key: string, updates: Partial<MetricEntry>) => void;
  onActivate: (rm: ResolvedMetric, value: number) => void;
}) {
  const { metric } = rm;
  const isOrgWide = ORG_WIDE_METRIC_IDS.includes(metric.id);
  const settingsToShow = isOrgWide ? [undefined] : rm.settings;
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="py-4 border-b border-[#F0EDE8] last:border-b-0" data-testid={`metric-row-${metric.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#1A1A1A]">{metric.label}</span>
            {metric.financialStream && (
              <span className="text-[9px] font-semibold text-[#EA2C00] uppercase tracking-[0.8px] bg-[#EA2C00]/8 px-1.5 py-0.5 rounded-sm">
                {metric.financialStream}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#AAAAAA] mt-0.5">{metric.unitLabel}</p>
        </div>
        {metric.whyItMatters && (
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`ml-2 mt-0.5 p-1 rounded-full transition-colors flex-shrink-0 ${
              showInfo ? "text-[#EA2C00] bg-[#EA2C00]/8" : "text-[#CCCCCC] hover:text-[#888888]"
            }`}
            aria-label="Why this matters"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mb-3 p-3 bg-[#FAFAF8] rounded-lg border border-[#EEEAE4] text-[11px] text-[#555555] leading-relaxed">
              {metric.whyItMatters}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {settingsToShow.map((setting) => {
          const k = metricKey(metric.id, setting);
          const entry = metricValues[k] || { before: null, after: null };
          const beforeVal: number | "" = entry.before ?? "";
          const afterVal: number | "" = entry.after ?? "";

          if (metric.inputType === "before-after") {
            return (
              <div key={k}>
                {setting && settingsToShow.length > 1 && (
                  <p className="text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wider mb-2">{setting}</p>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-medium text-[#777777] mb-1.5 uppercase tracking-wider">
                      Before Abridge
                    </label>
                    <FormattedNumberInput
                      value={beforeVal}
                      onChange={(v) => {
                        onUpdate(k, { before: v || null });
                        if (v > 0) onActivate(rm, v);
                      }}
                      className="w-full bg-[#F5F0EB] border-0 rounded-lg px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 transition-colors"
                      placeholder="—"
                      data-testid={`input-before-${metric.id}`}
                    />
                  </div>
                  <div className="flex items-center pb-1.5 text-[#CCCCCC] flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-medium text-[#777777] mb-1.5 uppercase tracking-wider">
                      After Abridge
                    </label>
                    <FormattedNumberInput
                      value={afterVal}
                      onChange={(v) => {
                        onUpdate(k, { after: v || null });
                        if (v > 0) onActivate(rm, v);
                      }}
                      className="w-full bg-[#F5F0EB] border-0 rounded-lg px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 transition-colors"
                      placeholder="—"
                      data-testid={`input-after-${metric.id}`}
                    />
                  </div>
                  {entry.before != null && entry.before !== 0 && entry.after != null && entry.after !== 0 && (
                    <div className="pb-1.5 flex-shrink-0">
                      <DeltaBadge
                        before={entry.before}
                        after={entry.after}
                        lowerIsBetter={metric.lowerIsBetter}
                        unit={metric.unit}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={k}>
              {setting && settingsToShow.length > 1 && (
                <p className="text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wider mb-2">{setting}</p>
              )}
              <div className="max-w-[180px]">
                <label className="block text-[11px] font-medium text-[#777777] mb-1.5 uppercase tracking-wider">
                  Current
                </label>
                <FormattedNumberInput
                  value={afterVal}
                  onChange={(v) => {
                    onUpdate(k, { after: v || null, before: v || null });
                    if (v > 0) onActivate(rm, v);
                  }}
                  className="w-full bg-[#F5F0EB] border-0 rounded-lg px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 transition-colors"
                  placeholder="—"
                  data-testid={`input-single-${metric.id}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomMetricRow({
  metric,
  onUpdate,
  onRemove,
}: {
  metric: CustomMetric;
  onUpdate: (updates: Partial<CustomMetric>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="py-4 border-b border-[#F0EDE8] last:border-b-0" data-testid={`custom-metric-${metric.id}`}>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={metric.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Metric name (e.g. HCAHPS score, charting audit rate)"
          className="flex-1 bg-[#F5F0EB] border-0 rounded-lg px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-[#1A1A1A] placeholder:text-[#BBBBBB]"
        />
        <input
          type="text"
          value={metric.unit}
          onChange={(e) => onUpdate({ unit: e.target.value })}
          placeholder="Unit"
          className="w-20 bg-[#F5F0EB] border-0 rounded-lg px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 text-[#1A1A1A] placeholder:text-[#BBBBBB]"
        />
        <button
          onClick={onRemove}
          className="p-1.5 text-[#CCCCCC] hover:text-[#EA2C00] rounded-md transition-colors flex-shrink-0"
          aria-label="Remove metric"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-[#777777] mb-1.5 uppercase tracking-wider">
            Before Abridge
          </label>
          <FormattedNumberInput
            value={metric.before}
            onChange={(v) => onUpdate({ before: v || "" })}
            className="w-full bg-[#F5F0EB] border-0 rounded-lg px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
            placeholder="—"
          />
        </div>
        <div className="flex items-center pb-1.5 text-[#CCCCCC] flex-shrink-0">
          <ArrowRight className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-[#777777] mb-1.5 uppercase tracking-wider">
            After Abridge
          </label>
          <FormattedNumberInput
            value={metric.after}
            onChange={(v) => onUpdate({ after: v || "" })}
            className="w-full bg-[#F5F0EB] border-0 rounded-lg px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
            placeholder="—"
          />
        </div>
        {typeof metric.before === "number" && metric.before > 0 && typeof metric.after === "number" && metric.after > 0 && (
          <div className="pb-1.5 flex-shrink-0">
            <DeltaBadge before={metric.before} after={metric.after} lowerIsBetter={false} unit={metric.unit} />
          </div>
        )}
      </div>
    </div>
  );
}

function getFourthDomainKey(settings: MeasureCareSetting[]): DomainKey {
  const primary = settings[0] || "outpatient";
  return CARE_SETTING_CONFIGS[primary].fourthDomainKey;
}

export default function MeasureMetricSelection({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: MeasureMetricSelectionProps) {
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);

  const activeSettings = state.activeCareSettings?.length
    ? state.activeCareSettings
    : [state.careSetting || "outpatient"];

  const allMetrics = useMemo(() => getMetricsForSettings(activeSettings), [activeSettings]);
  const fourthDomainKey = useMemo(() => getFourthDomainKey(activeSettings), [activeSettings]);

  const domainSections = useMemo((): DomainSection[] => {
    const domainOrder: DomainKey[] = ["foundational", "quality", "workforce", "revenue", fourthDomainKey];
    const domainMap = new Map<DomainKey, ResolvedMetric[]>();
    for (const dk of domainOrder) domainMap.set(dk, []);

    for (const rm of allMetrics) {
      const dk = rm.metric.domain as DomainKey;
      if (dk === "foundational") {
        domainMap.get("foundational")!.push(rm);
      } else if (FOURTH_DOMAIN_VARIANTS.includes(dk) && dk !== fourthDomainKey) {
        domainMap.get(fourthDomainKey)!.push(rm);
      } else if (domainMap.has(dk)) {
        domainMap.get(dk)!.push(rm);
      }
    }

    return domainOrder.map((dk) => {
      const meta = DOMAIN_META[dk] || { label: dk, description: "" };
      return {
        key: dk,
        label: meta.label,
        description: meta.description,
        metrics: domainMap.get(dk) || [],
      };
    }).filter((s) => s.metrics.length > 0);
  }, [allMetrics, fourthDomainKey]);

  const isMetricActive = useCallback(
    (mId: string, rm: ResolvedMetric): boolean => {
      const isOrgWide = ORG_WIDE_METRIC_IDS.includes(mId);
      if (isOrgWide) {
        return Object.values(state.enabledMetrics || {}).some((sm) => sm?.[mId]);
      }
      return rm.settings.some((s) => !!state.enabledMetrics?.[s]?.[mId]);
    },
    [state.enabledMetrics]
  );

  const activateMetric = useCallback(
    (rm: ResolvedMetric, _value: number) => {
      const mId = rm.metric.id;
      if (isMetricActive(mId, rm)) return;
      const isOrgWide = ORG_WIDE_METRIC_IDS.includes(mId);
      const newEnabled = { ...state.enabledMetrics };
      if (isOrgWide) {
        for (const s of activeSettings) {
          newEnabled[s] = { ...newEnabled[s], [mId]: true };
        }
      } else {
        for (const s of rm.settings) {
          newEnabled[s] = { ...newEnabled[s], [mId]: true };
        }
      }
      updateState({ enabledMetrics: newEnabled });
    },
    [state.enabledMetrics, isMetricActive, updateState, activeSettings]
  );

  const updateMetricValue = useCallback(
    (key: string, updates: Partial<MetricEntry>) => {
      const separatorIdx = key.indexOf("__");
      const metricId = separatorIdx >= 0 ? key.slice(0, separatorIdx) : key;
      const setting = separatorIdx >= 0 ? (key.slice(separatorIdx + 2) as MeasureCareSetting) : null;

      const updatedMetricValues = {
        ...state.metricValues,
        [key]: { ...(state.metricValues?.[key] || {}), ...updates },
      };

      if (setting && (updates.before !== undefined || updates.after !== undefined)) {
        const updatedSettingData = { ...(state.settingData?.[setting] || {}) };
        if (updates.before != null) updatedSettingData[`${metricId}_before`] = updates.before;
        if (updates.after != null) updatedSettingData[`${metricId}_after`] = updates.after;
        updateState({
          metricValues: updatedMetricValues,
          settingData: { ...state.settingData, [setting]: updatedSettingData },
        });
      } else {
        updateState({ metricValues: updatedMetricValues });
      }
    },
    [state.metricValues, state.settingData, updateState]
  );

  // Auto-populate utilization and user_retention from deployment data
  useEffect(() => {
    const updates: Record<string, MetricEntry> = {};
    let needsUpdate = false;

    if (state.deployment.utilizationRate > 0) {
      for (const s of activeSettings) {
        const k = metricKey("utilization", s);
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
        const k = metricKey("user_retention", s);
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
        if (state.deployment.utilizationRate > 0) newEnabled[s] = { ...newEnabled[s], utilization: true };
        if (state.deployment.mruProviders > 0 && state.deployment.liveProviders > 0) {
          newEnabled[s] = { ...newEnabled[s], user_retention: true };
        }
      }
      updateState({ metricValues: { ...state.metricValues, ...updates }, enabledMetrics: newEnabled });
    }
  }, [state.deployment.utilizationRate, state.deployment.mruProviders, state.deployment.liveProviders]);

  const totalActive = useMemo(() => {
    let count = 0;
    for (const section of domainSections) {
      for (const rm of section.metrics) {
        if (isMetricActive(rm.metric.id, rm)) count++;
      }
    }
    return count + customMetrics.filter((cm) => cm.name.trim() !== "").length;
  }, [domainSections, isMetricActive, customMetrics]);

  const addCustomMetric = () => {
    setCustomMetrics((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, name: "", unit: "", before: "", after: "" },
    ]);
  };

  const updateCustomMetric = (id: string, updates: Partial<CustomMetric>) => {
    setCustomMetrics((prev) => prev.map((cm) => (cm.id === id ? { ...cm, ...updates } : cm)));
  };

  const removeCustomMetric = (id: string) => {
    setCustomMetrics((prev) => prev.filter((cm) => cm.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]" data-testid="page-metric-selection">
      <UnifiedHeader pathType="measure" currentStep={2} totalSteps={5} onBack={onBack} onHome={onHome} />
      <UnifiedHeaderSpacer />

      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-10 pb-32">
        {/* Page header */}
        <div className="mb-2">
          <h1
            className="text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-page-title"
          >
            What You're Measuring
          </h1>
          <p className="text-sm text-[#888888]">
            Fill in what you have. You don't need every number — anything entered feeds the model.
          </p>
        </div>

        {/* Domain sections */}
        {domainSections.map((section, si) => (
          <div key={section.key} data-testid={`domain-section-${section.key}`}>
            <SectionDivider label={section.label} context={section.description} />

            <div className="mt-1 bg-white rounded-xl border border-[#EEEAE4] overflow-hidden">
              {section.metrics.map((rm) => {
                const isAutoUtilization =
                  rm.metric.id === "utilization" && state.deployment.utilizationRate > 0;
                const isAutoRetention =
                  rm.metric.id === "user_retention" &&
                  state.deployment.mruProviders > 0 &&
                  state.deployment.liveProviders > 0;

                if (isAutoUtilization) {
                  return (
                    <div key={rm.metric.id} className="px-4">
                      <AutoPopulatedRow
                        label="% Utilization"
                        value={`${state.deployment.utilizationRate}%`}
                        note="Encounter coverage — from your partner profile"
                      />
                    </div>
                  );
                }

                if (isAutoRetention) {
                  const retentionPct = Math.round(
                    (state.deployment.mruProviders / state.deployment.liveProviders) * 100
                  );
                  return (
                    <div key={rm.metric.id} className="px-4">
                      <AutoPopulatedRow
                        label="% Abridge User Retention"
                        value={`${retentionPct}%`}
                        note="MRUs / providers on Abridge — from your partner profile"
                      />
                    </div>
                  );
                }

                return (
                  <div key={rm.metric.id} className="px-4">
                    <MetricInputRow
                      rm={rm}
                      metricValues={state.metricValues || {}}
                      onUpdate={updateMetricValue}
                      onActivate={activateMetric}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Custom metrics */}
        <div data-testid="section-custom-metrics">
          <SectionDivider
            label="Your Own Metrics"
            context="Tracking something we don't have in the list? Add it here and it'll appear in the output alongside the model metrics."
          />

          {customMetrics.length > 0 && (
            <div className="mt-1 bg-white rounded-xl border border-[#EEEAE4] overflow-hidden">
              {customMetrics.map((cm) => (
                <div key={cm.id} className="px-4">
                  <CustomMetricRow
                    metric={cm}
                    onUpdate={(updates) => updateCustomMetric(cm.id, updates)}
                    onRemove={() => removeCustomMetric(cm.id)}
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addCustomMetric}
            className="mt-3 flex items-center gap-1.5 text-sm text-[#EA2C00] font-medium hover:opacity-70 transition-opacity"
            data-testid="button-add-custom-metric"
          >
            <Plus className="w-4 h-4" />
            Add a metric
          </button>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#EDE8E2] z-10">
        <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-[#888888]">
            {totalActive > 0 ? (
              <>
                <span className="font-semibold text-[#1A1A1A]">{totalActive}</span>
                {totalActive === 1 ? " metric" : " metrics"} entered
              </>
            ) : (
              "Fill in at least one metric to continue"
            )}
          </p>
          <Button
            onClick={totalActive > 0 ? onNext : undefined}
            disabled={totalActive === 0}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all ${
              totalActive > 0
                ? "bg-[#EA2C00] hover:bg-[#D12800] text-white"
                : "bg-[#F0EDE8] text-[#BBBBBB] cursor-not-allowed"
            }`}
            data-testid="button-next"
          >
            View the Journey
            {totalActive > 0 && <ArrowRight className="w-4 h-4 ml-1.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
