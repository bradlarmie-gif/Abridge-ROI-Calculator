import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ArrowRight, Pencil, Users, ChevronDown, ChevronUp, Check, Lock, Settings2, Plus, X, Sparkles, TrendingUp, TrendingDown, Activity, Calendar, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureState, type MeasureCareSetting, type CustomMetric, type DataSource, type MonthlyMetricData, formatNumber, generateTrendData } from "@/lib/measureCalculator";
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import {
  CARE_SETTING_CONFIGS,
  CARE_SETTING_ORDER,
  ABRIDGE_NATIVE_METRICS,
  type CareSettingConfig,
  type SettingMetrics,
  hasSettingData,
  isSectionComplete,
  syncSettingToState,
  getDefaultMetrics,
} from "@/lib/measureCareSettings";

interface MeasureDataEntryProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

type ViewMode = "edit" | "preview";

export default function MeasureDataEntry({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: MeasureDataEntryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: true,
  });
  const [stickyExpanded, setStickyExpanded] = useState<Record<string, boolean>>({});

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
    const currentlyExpanded = expandedSections[sectionKey] ?? stickyExpanded[sectionKey] ?? false;
    const newValue = !currentlyExpanded;
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: newValue }));
    setStickyExpanded((prev) => ({ ...prev, [sectionKey]: newValue }));
  }, [expandedSections, stickyExpanded]);

  const hasRequiredFields = () => {
    const hasOrg = state.deployment.organizationName.trim().length > 0;
    const hasProviders = state.deployment.providers > 0;
    const hasEncounters = state.deployment.totalEncounters > 0;
    const hasTotalProviders = state.deployment.totalProviders > 0;
    return hasOrg && hasProviders && hasEncounters && hasTotalProviders;
  };

  const handleSavePreview = () => {
    const synced = syncSettingToState(activeSetting, metrics);
    updateState({
      ...synced,
    });
    setViewMode("preview");
  };

  const handleProceed = () => {
    const synced = syncSettingToState(activeSetting, metrics);
    updateState({
      ...synced,
    });
    onNext();
  };

  const orgName = state.deployment.organizationName || "Your Organization";
  const dynamicSubhead = `${orgName} \u00B7 ${state.deployment.providers} providers \u00B7 ${state.deployment.monthsOnAbridge} months`;

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
        stepName="Your Deployment"
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
            Your Journey with Abridge
          </h1>
          <p className="text-base text-[#666666]" data-testid="text-dynamic-subhead">
            {viewMode === "edit"
              ? "Enter your partner's deployment data and metrics."
              : dynamicSubhead}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {viewMode === "preview" ? (
            <PreviewView
              state={state}
              config={config}
              metrics={metrics}
              onEdit={() => setViewMode("edit")}
              onNext={handleProceed}
            />
          ) : (
            <EditView
              state={state}
              config={config}
              metrics={metrics}
              activeSetting={activeSetting}
              expandedSections={expandedSections}
              stickyExpanded={stickyExpanded}
              allocationTotal={allocationTotal}
              allocationValid={allocationValid}
              isValid={isValid}
              onSwitchTab={switchTab}
              onToggleSection={toggleSection}
              onUpdateDeployment={updateDeployment}
              onUpdateMetric={updateMetric}
              onUpdateCustomMetrics={(cm) => updateState({ customMetrics: cm })}
              onUpdateState={updateState}
              onSavePreview={handleSavePreview}
            />
          )}
        </AnimatePresence>
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

type SectionStatus = "locked" | "active" | "in-progress" | "complete";

function StatusChip({ status }: { status: SectionStatus }) {
  switch (status) {
    case "locked":
      return (
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#BBBBBB] uppercase tracking-[1px]">
          <Lock className="w-3 h-3" />
        </span>
      );
    case "active":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EA2C00]/10 text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1px]">
          Next
        </span>
      );
    case "in-progress":
      return (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#EA2C00] uppercase tracking-[1px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA2C00]" />
          In Progress
        </span>
      );
    case "complete":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2D8A4E]">
          <Check className="w-3.5 h-3.5" />
          Done
        </span>
      );
    default:
      return null;
  }
}

function CollapsibleSection({
  sectionKey,
  label,
  isExpanded,
  status,
  subtitle,
  onToggle,
  children,
}: {
  sectionKey: string;
  label: string;
  isExpanded: boolean;
  status: SectionStatus;
  subtitle?: string;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const isLocked = status === "locked";
  const isActive = status === "active";
  const isComplete = status === "complete";

  return (
    <div
      className={`rounded-lg overflow-visible mb-3 transition-all duration-300
        ${isLocked ? "bg-[#FAFAFA] border border-[#EEEEEE] opacity-60" : ""}
        ${isActive ? "bg-white border-2 border-[#EA2C00]/30 shadow-sm" : ""}
        ${status === "in-progress" ? "bg-white border border-[#E5E5E5]" : ""}
        ${isComplete ? "bg-[#F9F7F4] border border-[#E8E2DA]" : ""}
      `}
    >
      <button
        onClick={() => !isLocked && onToggle()}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors
          ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}
        `}
        disabled={isLocked}
        data-testid={`section-toggle-${sectionKey}`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`text-xs font-semibold uppercase tracking-[1.5px]
              ${isLocked ? "text-[#CCCCCC]" : isComplete ? "text-[#666666]" : "text-[#1A1A1A]"}
            `}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <StatusChip status={status} />
          {subtitle && !isExpanded && !isLocked && (
            <span className="text-[12px] text-[#AAAAAA]">{subtitle}</span>
          )}
          {!isLocked && (
            isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#999999]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#999999]" />
            )
          )}
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && !isLocked && (
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

interface EditViewProps {
  state: MeasureState;
  config: CareSettingConfig;
  metrics: SettingMetrics;
  activeSetting: MeasureCareSetting;
  expandedSections: Record<string, boolean>;
  stickyExpanded: Record<string, boolean>;
  allocationTotal: number;
  allocationValid: boolean;
  isValid: boolean;
  onSwitchTab: (s: MeasureCareSetting) => void;
  onToggleSection: (s: string) => void;
  onUpdateDeployment: <K extends keyof MeasureState["deployment"]>(
    key: K,
    value: MeasureState["deployment"][K],
  ) => void;
  onUpdateMetric: (key: string, value: number) => void;
  onUpdateCustomMetrics: (metrics: CustomMetric[]) => void;
  onUpdateState: (updates: Partial<MeasureState>) => void;
  onSavePreview: () => void;
}

function getNextStepGuidance(
  profileComplete: boolean,
): string {
  if (!profileComplete) return "Fill in Partner Profile to continue";
  return "Review and continue";
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

function EditView({
  state,
  config,
  metrics,
  activeSetting,
  expandedSections,
  stickyExpanded,
  allocationTotal,
  allocationValid,
  isValid,
  onSwitchTab,
  onToggleSection,
  onUpdateDeployment,
  onUpdateMetric,
  onUpdateCustomMetrics,
  onUpdateState,
  onSavePreview,
}: EditViewProps) {
  const profileComplete =
    state.deployment.organizationName.trim().length > 0 &&
    state.deployment.providers > 0 &&
    state.deployment.totalEncounters > 0;

  const metricSectionStatuses: SectionStatus[] = useMemo(() => {
    return config.metricSections.map((section) => {
      const sectionHasContent = section.metrics.some((m) => {
        if (m.hasBeforeAfter) {
          return (
            (metrics[`${m.key}_before`] ?? 0) !== 0 ||
            (metrics[`${m.key}_after`] ?? 0) !== 0
          );
        }
        return false;
      });
      const sectionIsComplete = isSectionComplete(section.key, config, metrics);

      if (sectionIsComplete) return "complete" as SectionStatus;
      if (sectionHasContent) return "in-progress" as SectionStatus;
      if (!profileComplete) return "locked" as SectionStatus;
      return "active" as SectionStatus;
    });
  }, [config, metrics, profileComplete]);

  const guidance = getNextStepGuidance(profileComplete);

  return (
    <motion.div
      key="edit"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <CareSettingTabs
        active={activeSetting}
        settingData={state.settingData}
        onSwitch={onSwitchTab}
      />

      <DataSourceSelector
        value={state.dataSource}
        onChange={(ds) => onUpdateState({ dataSource: ds })}
      />

      <div className={`rounded-lg p-5 mb-3 transition-all duration-300 ${profileComplete ? "bg-[#F9F7F4] border border-[#E8E2DA]" : "bg-[#F5F0EB] border-2 border-[#EA2C00]/30 shadow-sm"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px]">
              Partner Profile
            </span>
          </div>
          {profileComplete ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2D8A4E]">
              <Check className="w-3.5 h-3.5" />
              Done
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EA2C00]/10 text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1px]">
              Start Here
            </span>
          )}
        </div>
        <div className="h-px bg-[#E5E5E5]/60 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <label className="text-sm font-medium text-black">Organization Name</label>
            <input
              type="text"
              value={state.deployment.organizationName}
              onChange={(e) => onUpdateDeployment("organizationName", e.target.value)}
              placeholder="e.g., Valley Health System"
              className="w-full h-10 px-3 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
              data-testid="input-org-name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-black">Providers on Abridge</label>
            <FormattedNumberInput
              value={state.deployment.providers}
              onChange={(v) => onUpdateDeployment("providers", v)}
              className="h-10 bg-white border-[#E5E5E5] text-right"
              data-testid="input-providers"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-black">Total Providers</label>
            <FormattedNumberInput
              value={state.deployment.totalProviders}
              onChange={(v) => onUpdateDeployment("totalProviders", v)}
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
                onUpdateState({ goLiveDate: dateVal });
                if (dateVal) {
                  const goLive = new Date(dateVal);
                  const now = new Date();
                  const diffMonths = (now.getFullYear() - goLive.getFullYear()) * 12 + (now.getMonth() - goLive.getMonth());
                  onUpdateDeployment("monthsOnAbridge", Math.max(0, diffMonths));
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
                onChange={(v) => onUpdateDeployment("monthsOnAbridge", v)}
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
              onChange={(v) => onUpdateDeployment("totalEncounters", v)}
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
                      onChange={(v) => onUpdateMetric(`deploy_${field.key}`, v)}
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

      <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#999999] mb-2 mt-2">From Your EHR / Billing System</p>

      {config.metricSections.map((section, idx) => {
        const status = metricSectionStatuses[idx];
        const isExpanded = expandedSections[section.key] ?? stickyExpanded[section.key] ?? false;

        return (
          <CollapsibleSection
            key={section.key}
            sectionKey={section.key}
            label={section.label}
            isExpanded={isExpanded}
            status={status}
            onToggle={() => onToggleSection(section.key)}
          >
            {section.description && (
              <p className="text-[12px] text-[#999999] mb-3">{section.description}</p>
            )}
            <div className="grid grid-cols-3 gap-4 mb-1">
              <div />
              <div className="text-xs font-semibold text-[#888888] text-center uppercase tracking-[1px]">
                Non-Abridge
              </div>
              <div className="text-xs font-semibold text-[#888888] text-center uppercase tracking-[1px]">
                With Abridge
              </div>
            </div>
            <p className="text-[10px] text-[#AAAAAA] text-center mb-3">Same time period {"–"} encounters documented with and without Abridge</p>
            {section.metrics.map((metric) => (
              <div
                key={metric.key}
                className="grid grid-cols-3 gap-4 items-center py-2"
              >
                <label className="text-sm font-medium text-black">
                  {metric.label}
                  {metric.optional && (
                    <span className="text-[#999999] text-xs ml-1">(optional)</span>
                  )}
                </label>
                {metric.hasBeforeAfter ? (
                  <>
                    <FormattedNumberInput
                      value={metrics[`${metric.key}_before`] ?? 0}
                      onChange={(v) => onUpdateMetric(`${metric.key}_before`, v)}
                      step={metric.step}
                      className="h-10 bg-white border-[#E5E5E5] text-right"
                      data-testid={`input-${metric.key}-before`}
                    />
                    <FormattedNumberInput
                      value={metrics[`${metric.key}_after`] ?? 0}
                      onChange={(v) => onUpdateMetric(`${metric.key}_after`, v)}
                      step={metric.step}
                      className="h-10 bg-white border-[#E5E5E5] text-right"
                      data-testid={`input-${metric.key}-after`}
                    />
                  </>
                ) : (
                  <FormattedNumberInput
                    value={metrics[metric.key] ?? 0}
                    onChange={(v) => onUpdateMetric(metric.key, v)}
                    step={metric.step}
                    className="h-10 bg-white border-[#E5E5E5] text-right col-span-2"
                    data-testid={`input-${metric.key}`}
                  />
                )}
              </div>
            ))}

            {(state.customMetrics || [])
              .filter((cm) => cm.section === section.key)
              .map((cm) => (
                <div
                  key={cm.id}
                  className="grid grid-cols-3 gap-4 items-center py-2"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={cm.label}
                      onChange={(e) => {
                        const updated = (state.customMetrics || []).map((m) =>
                          m.id === cm.id ? { ...m, label: e.target.value } : m
                        );
                        onUpdateCustomMetrics(updated);
                      }}
                      placeholder="Metric name"
                      className="h-10 w-full bg-white border border-[#E5E5E5] rounded-md px-3 text-sm font-medium text-black placeholder:text-[#CCCCCC] focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30 focus:border-[#EA2C00]/50"
                      data-testid={`input-custom-label-${cm.id}`}
                    />
                    <button
                      onClick={() => {
                        const updated = (state.customMetrics || []).filter(
                          (m) => m.id !== cm.id
                        );
                        onUpdateCustomMetrics(updated);
                      }}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded text-[#CCCCCC] hover:text-[#EA2C00] hover:bg-[#FFF0EC] transition-colors"
                      data-testid={`button-remove-custom-${cm.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <FormattedNumberInput
                    value={cm.before}
                    onChange={(v) => {
                      const updated = (state.customMetrics || []).map((m) =>
                        m.id === cm.id ? { ...m, before: v } : m
                      );
                      onUpdateCustomMetrics(updated);
                    }}
                    step={0.01}
                    className="h-10 bg-white border-[#E5E5E5] text-right"
                    data-testid={`input-custom-before-${cm.id}`}
                  />
                  <FormattedNumberInput
                    value={cm.after}
                    onChange={(v) => {
                      const updated = (state.customMetrics || []).map((m) =>
                        m.id === cm.id ? { ...m, after: v } : m
                      );
                      onUpdateCustomMetrics(updated);
                    }}
                    step={0.01}
                    className="h-10 bg-white border-[#E5E5E5] text-right"
                    data-testid={`input-custom-after-${cm.id}`}
                  />
                </div>
              ))}

            <button
              onClick={() => {
                const newMetric: CustomMetric = {
                  id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  label: "",
                  before: 0,
                  after: 0,
                  section: section.key,
                };
                onUpdateCustomMetrics([...(state.customMetrics || []), newMetric]);
              }}
              className="flex items-center gap-1.5 mt-3 px-3 py-2 text-xs font-medium text-[#EA2C00] hover:bg-[#FFF0EC] rounded-md transition-colors"
              data-testid={`button-add-custom-${section.key}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Metric
            </button>
          </CollapsibleSection>
        );
      })}

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
                    onUpdateState({
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
        status={state.trendConfig.enabled ? 'in-progress' : 'active'}
        subtitle="Optional month-over-month data"
        onToggle={() => onToggleSection('trendData')}
      >
        <p className="text-[11px] text-[#999999] mb-3">
          Enter monthly values to see trends over time. Leave empty months blank.
        </p>
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-medium text-black">Enable Trend Tracking</label>
          <button
            onClick={() => onUpdateState({
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
                            onUpdateState({
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

      <div
        className={`rounded-lg overflow-visible mb-3 transition-all duration-300 bg-[#F9F7F4] border border-[#E8E2DA]`}
      >
        <button
          onClick={() => onToggleSection("valueModel")}
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
                            onChange={(v) => onUpdateMetric(`vm_${field.key}`, v)}
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
                              onChange={(v) => onUpdateMetric(field.key, Math.max(0, Math.min(100, v)))}
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
          onClick={onSavePreview}
          disabled={!isValid}
          className={`
            w-full h-[52px] font-semibold rounded-lg text-base transition-all duration-200 gap-2
            ${
              isValid
                ? "bg-[#EA2C00] hover:bg-[#D42800] text-white"
                : "bg-[#E0E0E0] text-[#999999] cursor-not-allowed"
            }
          `}
          data-testid="button-save-preview"
        >
          {isValid ? (
            <>
              Save & Preview
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            guidance
          )}
        </Button>
        <p className="text-[12px] text-[#999999] mt-3">
          You can edit this data anytime from the summary page.
        </p>
      </div>
    </motion.div>
  );
}

interface PreviewViewProps {
  state: MeasureState;
  config: CareSettingConfig;
  metrics: SettingMetrics;
  onEdit: () => void;
  onNext: () => void;
}

function useAnimatedCount(target: number, duration = 1200, delay = 0) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [value, setValue] = useState(prefersReducedMotion ? target : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) { setValue(target); return; }
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay, prefersReducedMotion]);

  return value;
}

function AnimatedStat({ value, suffix, label, delay, format }: {
  value: number;
  suffix?: string;
  label: string;
  delay: number;
  format?: (v: number) => string;
}) {
  const animated = useAnimatedCount(value, 1200, delay);
  const display = format ? format(animated) : animated.toLocaleString();

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="text-3xl md:text-4xl font-bold text-white tracking-tight" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
        {display}{suffix || ''}
      </p>
      <p className="text-[11px] text-white/50 uppercase tracking-[1.5px] mt-1">
        {label}
      </p>
    </motion.div>
  );
}

function MiniSparkline({ data, color = '#EA2C00' }: { data: { value: number }[]; color?: string }) {
  if (data.length < 2) return null;
  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={true}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeltaCard({ label, before, after, step, sparkData, delayIndex, isReduction }: {
  label: string;
  before: number;
  after: number;
  step?: number;
  sparkData?: { value: number }[];
  delayIndex: number;
  isReduction?: boolean;
}) {
  const s = step ?? 1;
  const decimals = s < 1 ? Math.ceil(-Math.log10(s)) : 0;
  const formatVal = (v: number) => decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
  const delta = after - before;
  const absDelta = Math.abs(delta);
  const pctChange = before !== 0 ? Math.round((absDelta / before) * 100) : 0;

  const isPositive = isReduction ? delta < 0 : delta > 0;
  const isNeutral = delta === 0;

  const accentColor = isNeutral ? '#999999' : isPositive ? '#2D8A4E' : '#DC2626';
  const bgColor = isNeutral ? '#F5F5F5' : isPositive ? '#F0FDF4' : '#FEF2F2';
  const DeltaIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      className="rounded-xl border border-[#E8E2DA] bg-white p-4 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + delayIndex * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      data-testid={`delta-card-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
        {sparkData && sparkData.length >= 2 && (
          <MiniSparkline data={sparkData} color={accentColor} />
        )}
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-[#999999]">{formatVal(before)}</span>
            <span className="text-[#CCCCCC]">{"\u2192"}</span>
            <span className="text-lg font-bold text-[#1A1A1A]">{formatVal(after)}</span>
          </div>
        </div>

        {!isNeutral && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: bgColor, color: accentColor }}
          >
            <DeltaIcon className="w-3 h-3" />
            {isReduction ? '' : delta > 0 ? '+' : ''}{formatVal(delta)}
            {pctChange > 0 && <span className="opacity-70">({pctChange}%)</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function JourneyTimeline({ months }: { months: number }) {
  const milestones = [
    { month: 1, label: 'Go-Live' },
    { month: 3, label: 'Efficiency' },
    { month: 6, label: 'Capacity' },
    { month: 12, label: 'Strategic' },
    { month: 18, label: 'Full Proof' },
  ].filter(m => m.month <= Math.max(months + 3, 6));

  const maxMonth = milestones[milestones.length - 1]?.month || 6;

  return (
    <motion.div
      className="mt-6 px-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.6 }}
    >
      <div className="relative h-12">
        <div className="absolute top-4 left-0 right-0 h-[2px] bg-white/10 rounded-full" />

        <motion.div
          className="absolute top-4 left-0 h-[2px] rounded-full"
          style={{ background: 'linear-gradient(90deg, #EA2C00, #FF6B35)' }}
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min((months / maxMonth) * 100, 100)}%` }}
          transition={{ delay: 1.0, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />

        {milestones.map((m) => {
          const pct = (m.month / maxMonth) * 100;
          const reached = months >= m.month;
          const isCurrent = m.month <= months && (!milestones.find(n => n.month > m.month && n.month <= months));
          return (
            <div
              key={m.month}
              className="absolute flex flex-col items-center"
              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
              <div className={`w-2.5 h-2.5 rounded-full border-2 mt-[11px] transition-all ${
                reached ? 'bg-[#EA2C00] border-[#EA2C00]' : 'bg-transparent border-white/20'
              } ${isCurrent ? 'ring-2 ring-[#EA2C00]/30 ring-offset-1 ring-offset-[#1A1A1A]' : ''}`} />
              <p className={`text-[9px] mt-1 whitespace-nowrap ${
                reached ? 'text-white/70 font-medium' : 'text-white/25'
              }`}>
                {m.label}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function PreviewView({ state, config, metrics, onEdit, onNext }: PreviewViewProps) {
  const nativeData = state.abridgeNativeData || {};
  const filledNative = ABRIDGE_NATIVE_METRICS.filter(m => (nativeData[m.key] ?? 0) > 0);

  const trendMetricMap: Record<string, string> = {
    timeInNotes: 'timeInNotes',
    wrvuPerEncounter: 'wrvu',
    sameDayClosure: 'sameDayClosure',
    emLevel: 'emLevel',
  };

  const getSparkData = (metricKey: string) => {
    const trendKey = trendMetricMap[metricKey];
    if (!trendKey || state.deployment.monthsOnAbridge < 2) return undefined;
    if (state.trendConfig.enabled) {
      const monthlyArr = state.trendConfig.monthlyData[trendKey as keyof MonthlyMetricData];
      if (!monthlyArr || monthlyArr.length < 2 || monthlyArr.every(v => v === 0)) return undefined;
    }
    const trend = generateTrendData(state, trendKey);
    if (trend.length < 2) return undefined;
    return trend.map(t => ({ value: t.abridge }));
  };

  const reductionMetrics = new Set(['timeInNotes', 'timeToClose', 'workOutside', 'chartingTime', 'overtimeHours', 'denialsPer100', 'doorToDoc', 'lwbsRate', 'fallsRate', 'hapiRate', 'turnoverRate', 'daysToClose', 'afterHours', 'afterShiftCharting', 'cdiQueriesPer100', 'readmissionRate', 'los']);

  let deltaIndex = 0;

  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="rounded-2xl overflow-hidden mb-8"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="bg-[#1A1A1A] px-6 py-8 md:px-8 md:py-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, #EA2C00 0%, transparent 50%), radial-gradient(circle at 80% 20%, #EA2C00 0%, transparent 50%)',
            }}
          />

          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-[#EA2C00]" />
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00]" data-testid="text-section-deployment">
                Your Abridge Deployment
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <AnimatedStat value={state.deployment.providers} label="Providers" delay={200} />
              <AnimatedStat
                value={state.deployment.totalEncounters}
                label="Encounters"
                delay={400}
                format={(v) => v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : v.toLocaleString()}
              />
              <AnimatedStat value={state.deployment.utilizationRate} suffix="%" label="Adoption" delay={600} />
              <AnimatedStat value={state.deployment.monthsOnAbridge} label="Months Live" delay={800} />
            </div>

            {state.deployment.totalProviders > state.deployment.providers && (
              <motion.div
                className="mt-5 flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                data-testid="section-expansion-seed"
              >
                <Users className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                <p className="text-[11px] text-white/40">
                  {state.deployment.providers} of {state.deployment.totalProviders} total providers on Abridge today
                </p>
                <div className="flex-1 h-1 bg-white/5 rounded-full ml-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#EA2C00] to-[#FF6B35]"
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.round((state.deployment.providers / state.deployment.totalProviders) * 100)}%` }}
                    transition={{ delay: 1.4, duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </motion.div>
            )}

            <JourneyTimeline months={state.deployment.monthsOnAbridge} />
          </motion.div>
        </div>
      </motion.div>

      {filledNative.length > 0 && (
        <motion.div
          className="rounded-xl border border-[#E8E2DA] bg-gradient-to-br from-[#FFF8F5] to-[#FFFBF9] p-5 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          data-testid="section-abridge-footprint"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#EA2C00]" />
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00]">
              Abridge Footprint
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filledNative.map((m, i) => (
              <motion.div
                key={m.key}
                className="bg-white rounded-lg border border-[#F0EBE6] px-4 py-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
              >
                <p className="text-xl font-bold text-[#1A1A1A]">
                  {formatNumber(nativeData[m.key]!)}{m.suffix || ''}
                </p>
                <p className="text-[10px] text-[#888888] uppercase tracking-[1px] mt-0.5">{m.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {(() => {
        const allMetrics: { sectionKey: string; sectionLabel: string; metrics: typeof config.metricSections[0]['metrics'] }[] = [];
        config.metricSections.forEach(section => {
          const visible = section.metrics.filter(m => {
            if (m.hasBeforeAfter) {
              return (metrics[`${m.key}_before`] ?? 0) !== 0 || (metrics[`${m.key}_after`] ?? 0) !== 0;
            }
            return false;
          });
          if (visible.length > 0) allMetrics.push({ sectionKey: section.key, sectionLabel: section.label, metrics: visible });
        });

        if (allMetrics.length === 0) return null;

        return (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 rounded-full bg-[#EA2C00]" />
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#999999]" data-testid="text-section-measured">
                What Your Data Shows
              </p>
            </div>

            {allMetrics.map(({ sectionKey, sectionLabel, metrics: sectionMetrics }) => (
              <div key={sectionKey} className="mb-4">
                <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-2 ml-1">
                  {sectionLabel}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sectionMetrics.map((metric) => {
                    const before = metrics[`${metric.key}_before`] ?? 0;
                    const after = metrics[`${metric.key}_after`] ?? 0;
                    const idx = deltaIndex++;
                    return (
                      <DeltaCard
                        key={metric.key}
                        label={metric.label.replace(/\s*\(.*?\)\s*/g, '')}
                        before={before}
                        after={after}
                        step={metric.step}
                        sparkData={getSparkData(metric.key)}
                        delayIndex={idx}
                        isReduction={reductionMetrics.has(metric.key)}
                      />
                    );
                  })}
                </div>

                {(state.customMetrics || [])
                  .filter(cm => cm.section === sectionKey && cm.label.trim())
                  .map(cm => {
                    const idx = deltaIndex++;
                    return (
                      <div key={cm.id} className="mt-3">
                        <DeltaCard
                          label={cm.label}
                          before={cm.before}
                          after={cm.after}
                          delayIndex={idx}
                        />
                      </div>
                    );
                  })}
              </div>
            ))}
          </motion.div>
        );
      })()}

      <motion.div
        className="max-w-[480px] mx-auto text-center relative z-10 mt-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <Button
          onClick={onNext}
          className="w-full h-[52px] font-semibold rounded-lg text-base bg-[#EA2C00] hover:bg-[#D42800] text-white transition-all duration-200 gap-2"
          data-testid="button-see-transformation"
        >
          See What Changed
          <ArrowRight className="w-4 h-4" />
        </Button>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-sm text-[#EA2C00] hover:text-[#D42800] transition-colors mt-4"
          data-testid="button-edit-data"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit data
        </button>
      </motion.div>
    </motion.div>
  );
}
