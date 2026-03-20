import { useState, useCallback, useMemo } from "react";
import { ArrowRight, Pencil, Users, ChevronDown, ChevronUp, Check, Lock, Settings2, Plus, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureState, type MeasureCareSetting, type CustomMetric, type DataSource, type MonthlyMetricData, formatNumber, deriveEngagementContext } from "@/lib/measureCalculator";
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
        totalSteps={6}
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

function PhaseContextCard({ state }: { state: MeasureState }) {
  const ctx = deriveEngagementContext(state);
  if (ctx.monthsOnAbridge === 0) return null;

  const domainSignals = [
    { label: 'Quality signals', phase: 1 },
    { label: 'Workforce signals', phase: 2 },
    { label: 'Revenue signals', phase: 2 },
    { label: `${ctx.phaseSubLabel} signals`, phase: 3 },
  ];

  return (
    <div className="mt-2 rounded-lg bg-[#F5F0EB] border-l-4 border-[#EA2C00] p-4" data-testid="phase-context-card">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EA2C00] text-white">
          PHASE {ctx.phase}
        </span>
        <span className="text-sm font-semibold text-[#1A1A1A]">{ctx.phaseLabel}</span>
      </div>
      <p className="text-xs text-[#666666] mb-2">
        You are {ctx.monthsOnAbridge} months into your Abridge deployment.
      </p>
      <div className="space-y-1">
        {domainSignals.map((d) => {
          const active = ctx.phase >= d.phase;
          const emerging = ctx.phase === d.phase;
          return (
            <div key={d.label} className="flex items-center gap-2 text-xs">
              {active ? (
                <span className="text-[#2D8A4E]">{emerging ? '~' : '\u2713'}</span>
              ) : (
                <span className="text-[#CCCCCC]">{'\u25CB'}</span>
              )}
              <span className={active ? 'text-[#1A1A1A]' : 'text-[#999999]'}>
                {d.label} {active ? (emerging ? 'emerging' : 'active') : `expected at month ${d.phase === 2 ? '3' : d.phase === 3 ? '6' : '1'}+`}
              </span>
            </div>
          );
        })}
      </div>
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
          <div className="space-y-1.5 col-span-2">
            <label className="text-sm font-medium text-black">Go-Live Date</label>
            <div className="flex gap-3 items-start">
              <input
                type="date"
                value={state.goLiveDate || ''}
                onChange={(e) => onUpdateState({ goLiveDate: e.target.value || null })}
                className="h-10 px-3 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
                data-testid="input-go-live-date"
              />
              {!state.goLiveDate && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#999999]">or</span>
                  <div className="space-y-0.5">
                    <label className="text-xs text-[#999999]">Months since go-live</label>
                    <FormattedNumberInput
                      value={state.deployment.monthsOnAbridge}
                      onChange={(v) => onUpdateDeployment("monthsOnAbridge", v)}
                      className="h-8 w-20 bg-white border-[#E5E5E5] text-right text-sm"
                      data-testid="input-months"
                    />
                  </div>
                </div>
              )}
            </div>
            <PhaseContextCard state={state} />
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

function PreviewView({ state, config, metrics, onEdit, onNext }: PreviewViewProps) {
  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-[#F5F0EB] rounded-xl p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p
          className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-5"
          data-testid="text-section-deployment"
        >
          Deployment Summary
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div data-testid="stat-providers">
            <p className="text-2xl font-bold text-[#1A1A1A]">{state.deployment.providers}</p>
            <p className="text-[12px] text-[#999999] uppercase tracking-[1px]">
              providers on Abridge
            </p>
          </div>
          <div data-testid="stat-encounters">
            <p className="text-2xl font-bold text-[#1A1A1A]">
              {formatNumber(state.deployment.totalEncounters)}
            </p>
            <p className="text-[12px] text-[#999999] uppercase tracking-[1px]">
              encounters analyzed
            </p>
          </div>
          <div data-testid="stat-adoption">
            <p className="text-2xl font-bold text-[#1A1A1A]">
              {state.deployment.utilizationRate}%
            </p>
            <p className="text-[12px] text-[#999999] uppercase tracking-[1px]">adoption</p>
          </div>
          <div data-testid="stat-months">
            <p className="text-2xl font-bold text-[#1A1A1A]">
              {state.deployment.monthsOnAbridge} mo
            </p>
            <p className="text-[12px] text-[#999999] uppercase tracking-[1px]">live</p>
          </div>
        </div>

        {state.deployment.totalProviders > state.deployment.providers && (
          <div className="mt-4 flex items-start gap-2" data-testid="section-expansion-seed">
            <Users className="w-3.5 h-3.5 text-[#999999] mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-[#999999]">
              {state.deployment.providers} of {state.deployment.totalProviders} total providers are
              on Abridge today.
            </p>
          </div>
        )}
      </motion.div>

      <motion.div
        className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <p
          className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-5"
          data-testid="text-section-measured"
        >
          What We Measured
        </p>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div />
          <p className="text-xs font-semibold text-[#999999] uppercase tracking-[1px] text-right">
            Non-Abridge
          </p>
          <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1px] text-right">
            With Abridge
          </p>
        </div>

        {config.metricSections.map((section) => {
          const visibleMetrics = section.metrics.filter((m) => {
            if (m.hasBeforeAfter) {
              return (
                (metrics[`${m.key}_before`] ?? 0) !== 0 ||
                (metrics[`${m.key}_after`] ?? 0) !== 0
              );
            }
            return (metrics[m.key] ?? 0) !== 0;
          });

          if (visibleMetrics.length === 0) return null;

          return (
            <div key={section.key} className="mb-4">
              <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
                {section.label}
              </p>
              <div className="space-y-0">
                {visibleMetrics.map((metric) => {
                  const before = metrics[`${metric.key}_before`] ?? 0;
                  const after = metrics[`${metric.key}_after`] ?? 0;
                  const step = metric.step ?? 1;
                  const decimals = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
                  const formatVal = (v: number) =>
                    decimals > 0 ? v.toFixed(decimals) : String(v);

                  return (
                    <div
                      key={metric.key}
                      className="grid grid-cols-3 gap-4 py-2.5 border-b border-[#F0F0F0]"
                      data-testid={`row-${metric.key}`}
                    >
                      <p className="text-sm text-[#1A1A1A]">
                        {metric.label.replace(/\s*\(.*?\)\s*/g, "")}
                      </p>
                      <p className="text-sm text-[#999999] text-right">{formatVal(before)}</p>
                      <p className="text-sm font-semibold text-[#1A1A1A] text-right">
                        {formatVal(after)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {(state.customMetrics || [])
                .filter((cm) => cm.section === section.key && cm.label.trim())
                .map((cm) => (
                  <div
                    key={cm.id}
                    className="grid grid-cols-3 gap-4 py-2.5 border-b border-[#F0F0F0]"
                    data-testid={`row-custom-${cm.id}`}
                  >
                    <p className="text-sm text-[#1A1A1A] italic">{cm.label}</p>
                    <p className="text-sm text-[#999999] text-right">{cm.before}</p>
                    <p className="text-sm font-semibold text-[#1A1A1A] text-right">{cm.after}</p>
                  </div>
                ))}
            </div>
          );
        })}
      </motion.div>

      <div className="h-px bg-[#E5E5E5] my-6" />

      <motion.div
        className="max-w-[480px] mx-auto text-center relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
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
