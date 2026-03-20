import { useCallback } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureState, type MeasureCareSetting } from "@/lib/measureCalculator";
import { ABRIDGE_NATIVE_METRICS } from "@/lib/measureCareSettings";

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
  const updateDeployment = useCallback(<K extends keyof typeof state.deployment>(
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
  }, [state.deployment, updateState]);

  const hasRequiredFields = () => {
    const hasOrg = state.deployment.organizationName.trim().length > 0;
    const hasProviders = state.deployment.providers > 0;
    const hasEncounters = state.deployment.totalEncounters > 0;
    const hasTotalProviders = state.deployment.totalProviders > 0;
    return hasOrg && hasProviders && hasEncounters && hasTotalProviders;
  };

  const isValid = hasRequiredFields();

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

        <motion.div
          className="rounded-lg p-5 mb-5 bg-[#F5F0EB] border-2 border-[#EA2C00]/30 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
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
              <p className="text-xs text-[#888888]">Providers on Abridge / Total Providers</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-lg bg-white border border-[#E5E5E5] p-5 mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          data-testid="section-abridge-native"
        >
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
        </motion.div>

        <motion.div
          className="max-w-[480px] mx-auto text-center mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
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
        </motion.div>
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
    <motion.div
      className="mb-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.05 }}
      data-testid="section-data-source"
    >
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
    </motion.div>
  );
}
