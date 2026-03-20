import { useState, useCallback, useMemo } from "react";
import { ArrowRight, Pencil, ChevronDown, ChevronUp, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureState, type MeasureCareSetting } from "@/lib/measureCalculator";
import {
  CARE_SETTING_CONFIGS,
  CARE_SETTING_ORDER,
  ABRIDGE_NATIVE_METRICS,
  type CareSettingConfig,
  type SettingMetrics,
  hasSettingData,
  getDefaultMetrics,
} from "@/lib/measureCareSettings";

interface MeasureDataEntryProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

type DataSource = 'analytics' | 'benchmark' | 'estimate';

export default function MeasureDataEntry({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: MeasureDataEntryProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const activeSetting = (state.careSetting || "outpatient") as MeasureCareSetting;
  const config = CARE_SETTING_CONFIGS[activeSetting];
  const metrics = state.settingData?.[activeSetting] || getDefaultMetrics(activeSetting);

  const updateMetric = useCallback(
    (key: string, value: number) => {
      const current = state.settingData?.[activeSetting] || getDefaultMetrics(activeSetting);
      const updated = { ...current, [key]: value };
      updateState({
        settingData: {
          ...state.settingData,
          [activeSetting]: updated,
        },
      });
    },
    [activeSetting, state.settingData, updateState],
  );

  const updateDeployment = <K extends keyof typeof state.deployment>(
    key: K,
    value: (typeof state.deployment)[K],
  ) => {
    const updated = { ...state.deployment, [key]: value };
    if (key === "providers" || key === "totalProviders") {
      const p = key === "providers" ? (value as number) : updated.providers;
      const t = key === "totalProviders" ? (value as number) : updated.totalProviders;
      updated.utilizationRate = t > 0 ? Math.round((p / t) * 100) : 0;
    }
    updateState({ deployment: updated });
  };

  const switchTab = (setting: MeasureCareSetting) => {
    if (setting === activeSetting) return;
    updateState({ careSetting: setting });
  };

  const toggleSection = useCallback((sectionKey: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  }, []);

  const hasRequiredFields = () => {
    const hasOrg = state.deployment.organizationName.trim().length > 0;
    const hasProviders = state.deployment.providers > 0;
    const hasEncounters = state.deployment.totalEncounters > 0;
    const hasTotalProviders = state.deployment.totalProviders > 0;
    return hasOrg && hasProviders && hasEncounters && hasTotalProviders;
  };

  const allocationKeys = config.allocationFields.map((f) => f.key);
  const allocationTotal = allocationKeys.reduce((sum, key) => sum + (metrics[key] ?? 0), 0);
  const allocationValid = allocationTotal === 100;

  const isValid = hasRequiredFields() && allocationValid;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <UnifiedHeader
        pathType="measure"
        currentStep={1}
        totalSteps={8}
        stepName="Partner Profile"
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
            Partner Profile
          </h1>
          <p className="text-base text-[#666666]" data-testid="text-page-subtitle">
            Enter your partner's deployment data and platform metrics.
          </p>
        </motion.div>

        <DataSourceSelector
          value={state.dataSource}
          onChange={(ds) => updateState({ dataSource: ds })}
        />

        <CareSettingTabs
          active={activeSetting}
          settingData={state.settingData}
          onSwitch={switchTab}
        />

        <div className="rounded-lg p-5 mb-3 bg-[#F5F0EB] border-2 border-[#EA2C00]/30 shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px]">
              Deployment Details
            </span>
          </div>
          <div className="h-px bg-[#E5E5E5]/60 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-black">Organization Name</label>
              <input
                type="text"
                value={state.deployment.organizationName}
                onChange={(e) => updateDeployment("organizationName", e.target.value)}
                placeholder="e.g., Valley Health System"
                className="w-full h-10 px-3 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
                data-testid="input-org-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black">Providers on Abridge</label>
              <FormattedNumberInput
                value={state.deployment.providers}
                onChange={(v) => updateDeployment("providers", v)}
                className="h-10 bg-white border-[#E5E5E5] text-right"
                data-testid="input-providers"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black">Total Providers</label>
              <FormattedNumberInput
                value={state.deployment.totalProviders}
                onChange={(v) => updateDeployment("totalProviders", v)}
                className="h-10 bg-white border-[#E5E5E5] text-right"
                data-testid="input-total-providers"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black">Go-Live Date</label>
              <input
                type="date"
                value={state.goLiveDate || ''}
                onChange={(e) => {
                  const dateVal = e.target.value || null;
                  updateState({ goLiveDate: dateVal });
                  if (dateVal) {
                    const goLive = new Date(dateVal);
                    const now = new Date();
                    const diffMonths = (now.getFullYear() - goLive.getFullYear()) * 12 + (now.getMonth() - goLive.getMonth());
                    updateDeployment("monthsOnAbridge", Math.max(0, diffMonths));
                  }
                }}
                className="h-10 px-3 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00] w-full"
                data-testid="input-go-live-date"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black">Months on Abridge</label>
              {state.goLiveDate ? (
                <div
                  className="h-10 bg-[#F5F0EB] border border-[#E5E5E5] rounded-md flex items-center justify-end px-3 text-sm font-semibold text-black"
                  data-testid="input-months"
                >
                  {state.deployment.monthsOnAbridge}
                </div>
              ) : (
                <FormattedNumberInput
                  value={state.deployment.monthsOnAbridge}
                  onChange={(v) => updateDeployment("monthsOnAbridge", v)}
                  className="h-10 bg-white border-[#E5E5E5] text-right"
                  data-testid="input-months"
                />
              )}
              {state.goLiveDate && (
                <p className="text-[10px] text-[#BBBBBB]">Auto-calculated from go-live date</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black">Total Encounters</label>
              <FormattedNumberInput
                value={state.deployment.totalEncounters}
                onChange={(v) => updateDeployment("totalEncounters", v)}
                className="h-10 bg-white border-[#E5E5E5] text-right"
                data-testid="input-total-encounters"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black">Utilization Rate</label>
              <div className="h-10 bg-[#F5F0EB] border border-[#E5E5E5] rounded-md flex items-center justify-end px-3 text-sm font-semibold text-black" data-testid="display-utilization">
                {state.deployment.totalProviders > 0 ? Math.round((state.deployment.providers / state.deployment.totalProviders) * 100) : 0}%
              </div>
              <p className="text-xs text-[#888888]">Providers on Abridge ÷ Total Providers</p>
            </div>
          </div>

          {config.deploymentFields && config.deploymentFields.length > 0 && (
            <>
              <div className="h-px bg-[#E5E5E5]/60 my-4" />
              <span className="text-xs font-semibold text-[#888888] uppercase tracking-[1.5px] mb-3 block">
                {config.label} Deployment
              </span>
              <div className="grid grid-cols-2 gap-4">
                {config.deploymentFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-sm font-medium text-black">{field.label}</label>
                    <div className="relative">
                      <FormattedNumberInput
                        value={metrics[`deploy_${field.key}`] ?? 0}
                        onChange={(v) => updateMetric(`deploy_${field.key}`, v)}
                        className={`h-10 bg-white border-[#E5E5E5] text-right ${field.suffix ? "pr-8" : ""}`}
                        data-testid={`input-deploy-${field.key}`}
                      />
                      {field.suffix && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">
                          {field.suffix}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#999999] mb-2 mt-4">From Your Abridge Deployment</p>

        <div className="rounded-lg bg-white border border-[#E5E5E5] p-5 mb-3" data-testid="section-abridge-native">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#EA2C00]" />
            <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px]">Abridge Platform Data</span>
          </div>
          <p className="text-[11px] text-[#999999] mb-4">Optional. If you have access to Abridge analytics, enter these platform-native metrics.</p>
          <div className="grid grid-cols-2 gap-4">
            {ABRIDGE_NATIVE_METRICS.map((metric) => (
              <div key={metric.key} className="space-y-1.5">
                <label className="text-sm font-medium text-black">{metric.label}</label>
                <div className="relative">
                  <FormattedNumberInput
                    value={state.abridgeNativeData[metric.key] ?? 0}
                    onChange={(v) => {
                      updateState({
                        abridgeNativeData: { ...state.abridgeNativeData, [metric.key]: v },
                      });
                    }}
                    step={metric.suffix === '%' ? 0.1 : 1}
                    className={`h-10 bg-white border-[#E5E5E5] text-right ${metric.suffix ? 'pr-10' : ''}`}
                    data-testid={`input-native-${metric.key}`}
                  />
                  {metric.suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">{metric.suffix}</span>
                  )}
                </div>
                {metric.description && <p className="text-[10px] text-[#BBBBBB]">{metric.description}</p>}
              </div>
            ))}
          </div>
        </div>

        <CollapsibleSection
          sectionKey="trendData"
          label="Trend Data (Monthly)"
          isExpanded={expandedSections.trendData ?? false}
          subtitle="Optional month-over-month data"
          onToggle={() => toggleSection('trendData')}
        >
          <p className="text-[11px] text-[#999999] mb-3">
            Enter monthly values to see trends over time. Leave empty months blank.
          </p>
          <div className="flex items-center gap-2 mb-4">
            <label className="text-sm font-medium text-black">Enable Trend Tracking</label>
            <button
              onClick={() => updateState({
                trendConfig: { ...state.trendConfig, enabled: !state.trendConfig.enabled },
              })}
              className={`w-10 h-5 rounded-full transition-colors flex items-center ${state.trendConfig.enabled ? 'bg-[#EA2C00] justify-end' : 'bg-[#E5E5E5] justify-start'}`}
              data-testid="toggle-trend-enabled"
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm mx-0.5" />
            </button>
          </div>
          {state.trendConfig.enabled && (
            <div className="space-y-4">
              {[
                { key: 'timeInNotes' as const, label: 'Time in Notes (min)' },
                { key: 'wrvu' as const, label: 'wRVU/encounter' },
                { key: 'emLevel' as const, label: 'E/M Level' },
                { key: 'sameDayClosure' as const, label: 'Same-Day Closure (%)' },
              ].map((trendMetric) => {
                const data = state.trendConfig.monthlyData[trendMetric.key] || [];
                const monthCount = Math.max(data.length, state.deployment.monthsOnAbridge || 6, 6);
                return (
                  <div key={trendMetric.key}>
                    <p className="text-xs font-semibold text-[#666666] mb-2">{trendMetric.label}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {Array.from({ length: monthCount }, (_, i) => (
                        <div key={i} className="w-14">
                          <p className="text-[9px] text-[#BBBBBB] text-center mb-0.5">M{i + 1}</p>
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
                                  monthlyData: {
                                    ...state.trendConfig.monthlyData,
                                    [trendMetric.key]: newData,
                                  },
                                },
                              });
                            }}
                            className="w-full h-8 text-center text-xs bg-white border border-[#E5E5E5] rounded focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30"
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
        </CollapsibleSection>

        <div className="rounded-lg overflow-visible mb-3 transition-all duration-300 bg-[#F9F7F4] border border-[#E8E2DA]">
          <button
            onClick={() => toggleSection("valueModel")}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            data-testid="section-toggle-valueModel"
          >
            <div className="flex items-center gap-2.5">
              <Settings2 className="w-4 h-4 text-[#999999]" />
              <span className="text-xs font-semibold text-[#666666] uppercase tracking-[1.5px]">
                Model Assumptions
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[12px] text-[#AAAAAA] font-medium">
                Defaults applied
              </span>
              <Pencil className="w-3.5 h-3.5 text-[#BBBBBB]" />
              {expandedSections.valueModel ? (
                <ChevronUp className="w-4 h-4 text-[#999999]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#999999]" />
              )}
            </div>
          </button>
          <AnimatePresence>
            {expandedSections.valueModel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {config.valueModel.map((field) => (
                        <div key={field.key} className="space-y-1.5">
                          <label className="text-sm font-medium text-black">{field.label}</label>
                          <div className="relative">
                            {field.prefix && (
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">
                                {field.prefix}
                              </span>
                            )}
                            <FormattedNumberInput
                              value={metrics[`vm_${field.key}`] ?? field.defaultValue}
                              onChange={(v) => updateMetric(`vm_${field.key}`, v)}
                              className={`h-10 bg-white border-[#E5E5E5] text-right ${field.prefix ? "pl-7" : ""} ${field.suffix ? "pr-10" : ""}`}
                              data-testid={`input-vm-${field.key}`}
                            />
                            {field.suffix && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">
                                {field.suffix}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="h-px bg-[#E5E5E5]/60" />

                    <div>
                      <span className="text-xs font-semibold text-[#888888] uppercase tracking-[1.5px] mb-1 block">
                        Attribution Range
                      </span>
                      <div className="h-10 bg-white border border-[#E5E5E5] rounded-md flex items-center px-3 text-sm text-[#666666]">
                        50 – 75%
                      </div>
                    </div>

                    <div className="h-px bg-[#E5E5E5]/60" />

                    <div>
                      <span className="text-xs font-semibold text-[#888888] uppercase tracking-[1.5px] mb-3 block">
                        Time Allocation
                      </span>
                      <div className="grid grid-cols-2 gap-4">
                        {config.allocationFields.map((field) => (
                          <div key={field.key} className="space-y-1.5">
                            <label className="text-sm font-medium text-black">{field.label}</label>
                            <div className="relative">
                              <FormattedNumberInput
                                value={metrics[field.key] ?? field.defaultValue}
                                onChange={(v) => updateMetric(field.key, Math.max(0, Math.min(100, v)))}
                                className="h-10 bg-white border-[#E5E5E5] text-right pr-8"
                                data-testid={`input-alloc-${field.key}`}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">
                                %
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p
                        className={`text-xs mt-2 ${allocationValid ? "text-green-600" : "text-red-500"}`}
                        data-testid="text-allocation-check"
                      >
                        Must equal 100%: {allocationValid ? "\u2713" : `${allocationTotal}%`}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="my-6" />

        <div className="max-w-[480px] mx-auto text-center">
          <Button
            onClick={onNext}
            disabled={!isValid}
            className={`
              w-full h-[52px] font-semibold rounded-lg text-base transition-all duration-200 gap-2
              ${isValid
                ? "bg-[#EA2C00] hover:bg-[#D42800] text-white"
                : "bg-[#E0E0E0] text-[#999999] cursor-not-allowed"
              }
            `}
            data-testid="button-next"
          >
            {isValid ? (
              <>
                Select Metrics
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              "Fill in deployment details to continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CareSettingTabs({
  active,
  settingData,
  onSwitch,
}: {
  active: MeasureCareSetting;
  settingData: MeasureState["settingData"];
  onSwitch: (s: MeasureCareSetting) => void;
}) {
  return (
    <div className="flex border-b border-[#E5E5E5] mb-6" data-testid="tabs-care-setting">
      {CARE_SETTING_ORDER.map((setting) => {
        const config = CARE_SETTING_CONFIGS[setting];
        const isActive = setting === active;
        const hasData = hasSettingData(settingData?.[setting]);

        return (
          <button
            key={setting}
            onClick={() => onSwitch(setting)}
            className={`
              relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors
              ${isActive ? "text-[#1A1A1A]" : "text-[#999999] hover:text-[#666666]"}
            `}
            data-testid={`tab-${setting}`}
          >
            {config.shortLabel}
            {hasData && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#EA2C00]" : "bg-[#EA2C00]/60"}`}
              />
            )}
            {isActive && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#EA2C00]"
                layoutId="activeTab"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function DataSourceSelector({ value, onChange }: { value: DataSource; onChange: (ds: DataSource) => void }) {
  const options: { key: DataSource; label: string; desc: string }[] = [
    { key: 'analytics', label: 'Analytics Pull', desc: 'Epic, Abridge analytics, or EHR reporting' },
    { key: 'benchmark', label: 'Abridge Data', desc: 'From Abridge analytics platform' },
    { key: 'estimate', label: 'Our Estimate', desc: 'Team-estimated from observation' },
  ];

  return (
    <div className="mb-5" data-testid="section-data-source">
      <p className="text-xs font-semibold text-[#888888] uppercase tracking-[1.5px] mb-2">Data Source</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`flex-1 px-3 py-2.5 rounded-full text-sm font-medium transition-all
              ${value === opt.key
                ? 'bg-[#EA2C00] text-white shadow-sm'
                : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EDE7E0]'
              }`}
            data-testid={`button-source-${opt.key}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#999999] mt-1.5">
        {options.find((o) => o.key === value)?.desc}
      </p>
    </div>
  );
}

function CollapsibleSection({
  sectionKey,
  label,
  isExpanded,
  subtitle,
  onToggle,
  children,
}: {
  sectionKey: string;
  label: string;
  isExpanded: boolean;
  subtitle?: string;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg overflow-visible mb-3 transition-all duration-300 bg-white border border-[#E5E5E5]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
        data-testid={`section-toggle-${sectionKey}`}
      >
        <span className="text-xs font-semibold uppercase tracking-[1.5px] text-[#1A1A1A]">
          {label}
        </span>
        <div className="flex items-center gap-2.5">
          {subtitle && !isExpanded && (
            <span className="text-[12px] text-[#AAAAAA]">{subtitle}</span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#999999]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#999999]" />
          )}
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
