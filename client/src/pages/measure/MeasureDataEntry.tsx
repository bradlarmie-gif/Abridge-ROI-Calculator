import { useCallback, useMemo } from "react";
import { ArrowRight, Sparkles, Building2, Stethoscope, Siren, BedDouble, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureState, type MeasureCareSetting } from "@/lib/measureCalculator";
import { ABRIDGE_NATIVE_METRICS, CARE_SETTING_CONFIGS, getDefaultMetrics } from "@/lib/measureCareSettings";

interface MeasureDataEntryProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const SETTING_OPTIONS: {
  key: MeasureCareSetting;
  label: string;
  description: string;
  icon: typeof Building2;
}[] = [
  { key: 'outpatient', label: 'Outpatient', description: 'Clinic & ambulatory', icon: Building2 },
  { key: 'ed', label: 'Emergency', description: 'Emergency department', icon: Siren },
  { key: 'inpatient', label: 'Inpatient', description: 'Hospital medicine', icon: Stethoscope },
  { key: 'nursing', label: 'Nursing', description: 'Nursing units', icon: Heart },
];

export default function MeasureDataEntry({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: MeasureDataEntryProps) {
  const activeSettings = state.activeCareSettings?.length > 0
    ? state.activeCareSettings
    : ['outpatient' as MeasureCareSetting];

  const hasNursing = activeSettings.includes('nursing');
  const hasProviderSettings = activeSettings.some(s => s !== 'nursing');

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
      const newSettingData = { ...state.settingData };
      if (!newSettingData[setting]) {
        newSettingData[setting] = getDefaultMetrics(setting);
      }
      updateState({
        activeCareSettings: current,
        careSetting: current.includes(state.careSetting || 'outpatient') ? state.careSetting : current[0],
        settingData: newSettingData,
      });
    }
  }, [activeSettings, state.enabledMetrics, state.settingData, state.surveyMetrics, state.careSetting, updateState]);

  const updateDeployment = useCallback(<K extends keyof typeof state.deployment>(
    key: K,
    value: (typeof state.deployment)[K],
  ) => {
    const updated = { ...state.deployment, [key]: value };
    if (key === "totalProviders" || key === "liveProviders" || key === "mruProviders") {
      const total = key === "totalProviders" ? (value as number) : updated.totalProviders;
      const live = key === "liveProviders" ? (value as number) : updated.liveProviders;
      const mru = key === "mruProviders" ? (value as number) : updated.mruProviders;
      updated.utilizationRate = total > 0 ? Math.round((live / total) * 100) : 0;
      updated.mruActivationRate = live > 0 ? Math.round((mru / live) * 100) : 0;
      updated.providers = live;
    }
    if (key === "totalEncounters" || key === "abridgeEncounters") {
      const total = key === "totalEncounters" ? (value as number) : updated.totalEncounters;
      const abridge = key === "abridgeEncounters" ? (value as number) : updated.abridgeEncounters;
      updated.encounterCoverageRate = total > 0 ? Math.round((abridge / total) * 100) : 0;
    }
    updateState({ deployment: updated });
  }, [state.deployment, updateState]);

  const updateNursingField = useCallback((key: string, value: number) => {
    const current = state.settingData?.nursing || getDefaultMetrics('nursing');
    const updatedNursing = { ...current, [`deploy_${key}`]: value };
    const updates: Partial<MeasureState> = {
      settingData: { ...state.settingData, nursing: updatedNursing },
    };
    if (!hasProviderSettings && (key === 'nurseFTEs' || key === 'staffedBeds')) {
      const nurseFTEs = key === 'nurseFTEs' ? value : (updatedNursing.deploy_nurseFTEs ?? 0);
      const totalProv = state.deployment.totalProviders > 0 ? state.deployment.totalProviders : nurseFTEs;
      updates.deployment = {
        ...state.deployment,
        providers: nurseFTEs,
        liveProviders: nurseFTEs,
        mruProviders: nurseFTEs,
        totalProviders: totalProv,
        utilizationRate: totalProv > 0 ? Math.round((nurseFTEs / totalProv) * 100) : 0,
        mruActivationRate: 100,
      };
    }
    updateState(updates);
  }, [state.settingData, state.deployment, hasProviderSettings, updateState]);

  const nursingData = useMemo(() => {
    const d = state.settingData?.nursing || {};
    return {
      unitsLive: d.deploy_unitsLive ?? 0,
      staffedBeds: d.deploy_staffedBeds ?? 0,
      nurseFTEs: d.deploy_nurseFTEs ?? 0,
      bedOccupancy: d.deploy_bedOccupancy ?? 0,
    };
  }, [state.settingData]);

  const providerLabel = useMemo(() => {
    if (hasProviderSettings && !hasNursing) return 'Providers';
    if (!hasProviderSettings && hasNursing) return 'Nurses';
    return 'Providers';
  }, [hasProviderSettings, hasNursing]);

  const encounterLabel = useMemo(() => {
    if (activeSettings.length === 1) {
      if (activeSettings[0] === 'nursing') return 'Total Shifts';
      if (activeSettings[0] === 'inpatient') return 'Total Discharges';
    }
    return 'Total Encounters';
  }, [activeSettings]);

  const syncNursingToDeployment = useCallback(() => {
    if (!hasNursing || hasProviderSettings) return;
    const updated = { ...state.deployment };
    updated.providers = nursingData.nurseFTEs;
    updated.liveProviders = nursingData.nurseFTEs;
    updated.mruProviders = nursingData.nurseFTEs;
    updated.totalProviders = updated.totalProviders > 0 ? updated.totalProviders : nursingData.nurseFTEs;
    updated.utilizationRate = updated.totalProviders > 0 ? Math.round((updated.providers / updated.totalProviders) * 100) : 0;
    updated.mruActivationRate = 100;
    updateState({ deployment: updated });
  }, [hasNursing, hasProviderSettings, nursingData, state.deployment, updateState]);

  const isValid = useMemo(() => {
    const hasOrg = state.deployment.organizationName.trim().length > 0;
    const hasSetting = activeSettings.length > 0;

    if (hasProviderSettings) {
      if (state.deployment.liveProviders <= 0 || state.deployment.totalProviders <= 0) return false;
      if (state.deployment.totalEncounters <= 0) return false;
    }

    if (hasNursing) {
      if (nursingData.nurseFTEs <= 0 || nursingData.staffedBeds <= 0) return false;
      if (!hasProviderSettings && state.deployment.totalEncounters <= 0) return false;
    }

    return hasOrg && hasSetting;
  }, [state.deployment, activeSettings, hasProviderSettings, hasNursing, nursingData]);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <UnifiedHeader
        pathType="measure"
        currentStep={1}
        totalSteps={7}
        stepName="Partner Profile"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-5 md:py-12">
        <motion.div
          className="text-center mb-5 md:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 md:mb-3 font-abridge uppercase tracking-tight"
            data-testid="text-page-title"
          >
            Partner Profile
          </h1>
          <p className="text-sm md:text-base text-[#666666]" data-testid="text-page-subtitle">
            Tell us about your Abridge deployment.
          </p>
        </motion.div>

        <motion.div
          className="mb-4 md:mb-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px] mb-2 md:mb-3">Care Settings Live on Abridge</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3" data-testid="pills-care-settings">
            {SETTING_OPTIONS.map(opt => {
              const isActive = activeSettings.includes(opt.key);
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleSetting(opt.key)}
                  className={`flex flex-col items-center gap-1 md:gap-1.5 px-2 md:px-3 py-2.5 md:py-3.5 rounded-xl border-2 transition-all text-center
                    ${isActive
                      ? 'bg-[#FAF8F5] border-[#EA2C00] shadow-sm'
                      : 'bg-white border-[#E5E5E5] hover:border-[#CCCCCC]'
                    }`}
                  data-testid={`pill-${opt.key}`}
                >
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'text-[#EA2C00]' : 'text-[#BBBBBB]'}`} />
                  <span className={`text-xs md:text-sm font-semibold ${isActive ? 'text-[#1A1A1A]' : 'text-[#888888]'}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-[#AAAAAA] hidden md:block">{opt.description}</span>
                  {isActive && (
                    <span className="text-[9px] font-semibold text-[#EA2C00] uppercase">Active</span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl p-3.5 md:p-5 mb-3.5 md:mb-5 bg-[#FAF8F5] border border-[#E8E2DA]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px]">
              Organization
            </span>
          </div>
          <div className="h-px bg-[#E8E2DA] mb-3 md:mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5 sm:col-span-2">
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
                  className="h-10 bg-white border border-[#E5E5E5] rounded-md flex items-center justify-end px-3 text-sm font-semibold text-black"
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
                <p className="text-[10px] text-[#BBBBBB] hidden md:block">Auto-calculated from go-live date</p>
              )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {hasProviderSettings && (
            <motion.div
              className="rounded-xl p-3.5 md:p-5 mb-3.5 md:mb-5 bg-[#FAF8F5] border border-[#E8E2DA]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Stethoscope className="w-4 h-4 text-[#EA2C00]" />
                <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px]">
                  Provider Adoption Funnel
                </span>
                {activeSettings.filter(s => s !== 'nursing').length > 0 && (
                  <span className="text-[10px] text-[#AAAAAA] ml-auto">
                    {activeSettings.filter(s => s !== 'nursing').map(s => CARE_SETTING_CONFIGS[s].shortLabel).join(', ')}
                  </span>
                )}
              </div>
              <div className="h-px bg-[#E8E2DA] mb-3 md:mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-black">Total {providerLabel} in Org</label>
                  <FormattedNumberInput
                    value={state.deployment.totalProviders}
                    onChange={(v) => updateDeployment("totalProviders", v)}
                    className="h-10 bg-white border-[#E5E5E5] text-right"
                    data-testid="input-total-providers"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-black">Live on Abridge</label>
                  <FormattedNumberInput
                    value={state.deployment.liveProviders}
                    onChange={(v) => updateDeployment("liveProviders", v)}
                    className="h-10 bg-white border-[#E5E5E5] text-right"
                    data-testid="input-live-providers"
                  />
                  <p className="text-[10px] text-[#BBBBBB] hidden md:block">Have access to Abridge</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-black">Monthly Recording Users</label>
                  <FormattedNumberInput
                    value={state.deployment.mruProviders}
                    onChange={(v) => updateDeployment("mruProviders", v)}
                    className="h-10 bg-white border-[#E5E5E5] text-right"
                    data-testid="input-mru-providers"
                  />
                  <p className="text-[10px] text-[#BBBBBB] hidden md:block">Actively using each month</p>
                </div>
              </div>

              {state.deployment.totalProviders > 0 && (
                <div className="mt-4 pt-3 border-t border-[#E8E2DA]" data-testid="provider-funnel-visual">
                  <p className="text-[10px] font-semibold text-[#999999] uppercase tracking-[1px] mb-2">Provider Adoption</p>
                  <div className="space-y-1.5">
                    {[
                      { label: `Total ${providerLabel}`, value: state.deployment.totalProviders, color: '#E8E2DA' },
                      { label: 'Live on Abridge', value: state.deployment.liveProviders, color: '#F5C4B8' },
                      { label: 'Monthly Recording Users', value: state.deployment.mruProviders, color: '#EA2C00' },
                    ].map((tier) => {
                      const pct = state.deployment.totalProviders > 0
                        ? Math.round((tier.value / state.deployment.totalProviders) * 100)
                        : 0;
                      const barWidth = Math.max(pct, 2);
                      return (
                        <div key={tier.label} className="flex items-center gap-2">
                          <div className="w-[100px] text-[10px] text-[#888888] text-right shrink-0">{tier.label}</div>
                          <div className="flex-1 h-5 bg-white rounded overflow-hidden relative">
                            <div
                              className="h-full rounded transition-all duration-300"
                              style={{ width: `${barWidth}%`, backgroundColor: tier.color }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-[#1A1A1A] w-[50px] text-right">{tier.value}</span>
                          <span className="text-[10px] text-[#AAAAAA] w-[35px] text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="h-px bg-[#E8E2DA] mt-4 mb-3 md:mb-4" />
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px]">
                  Encounter Coverage
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-black">{encounterLabel}</label>
                  <FormattedNumberInput
                    value={state.deployment.totalEncounters}
                    onChange={(v) => updateDeployment("totalEncounters", v)}
                    className="h-10 bg-white border-[#E5E5E5] text-right"
                    data-testid="input-total-encounters"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-black">Abridge {encounterLabel}</label>
                  <FormattedNumberInput
                    value={state.deployment.abridgeEncounters}
                    onChange={(v) => updateDeployment("abridgeEncounters", v)}
                    className="h-10 bg-white border-[#E5E5E5] text-right"
                    data-testid="input-abridge-encounters"
                  />
                  <p className="text-[10px] text-[#BBBBBB] hidden md:block">Where Abridge was used</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-black">Coverage Rate</label>
                  <div className="h-10 bg-white border border-[#E5E5E5] rounded-md flex items-center justify-end px-3 text-sm font-semibold text-black" data-testid="display-encounter-coverage">
                    {state.deployment.totalEncounters > 0 ? Math.round((state.deployment.abridgeEncounters / state.deployment.totalEncounters) * 100) : 0}%
                  </div>
                  <p className="text-[10px] text-[#BBBBBB] hidden md:block">Abridge encounters / Total</p>
                </div>
              </div>

              {state.deployment.totalEncounters > 0 && state.deployment.abridgeEncounters > 0 && (
                <div className="mt-3" data-testid="encounter-funnel-visual">
                  <div className="flex items-center gap-2">
                    <div className="w-[100px] text-[10px] text-[#888888] text-right shrink-0">Total</div>
                    <div className="flex-1 h-5 bg-white rounded overflow-hidden relative">
                      <div
                        className="h-full rounded transition-all duration-300"
                        style={{
                          width: `${Math.max(Math.round((state.deployment.abridgeEncounters / state.deployment.totalEncounters) * 100), 2)}%`,
                          backgroundColor: '#EA2C00',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-[#EA2C00] w-[80px] text-right">
                      {state.deployment.encounterCoverageRate}% covered
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hasNursing && (
            <motion.div
              className="rounded-xl p-3.5 md:p-5 mb-3.5 md:mb-5 bg-[#FAF8F5] border border-[#E8E2DA]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <BedDouble className="w-4 h-4 text-[#EA2C00]" />
                <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px]">
                  Nursing Deployment
                </span>
              </div>
              <div className="h-px bg-[#E8E2DA] mb-3 md:mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-black">Units Live</label>
                  <FormattedNumberInput
                    value={nursingData.unitsLive}
                    onChange={(v) => updateNursingField("unitsLive", v)}
                    className="h-10 bg-white border-[#E5E5E5] text-right"
                    data-testid="input-units-live"
                  />
                  <p className="text-[10px] text-[#BBBBBB] hidden md:block">Number of nursing units on Abridge</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-black">Staffed Beds</label>
                  <FormattedNumberInput
                    value={nursingData.staffedBeds}
                    onChange={(v) => updateNursingField("staffedBeds", v)}
                    className="h-10 bg-white border-[#E5E5E5] text-right"
                    data-testid="input-staffed-beds"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-black">Nurse FTEs</label>
                  <FormattedNumberInput
                    value={nursingData.nurseFTEs}
                    onChange={(v) => updateNursingField("nurseFTEs", v)}
                    className="h-10 bg-white border-[#E5E5E5] text-right"
                    data-testid="input-nurse-ftes"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-black">Bed Occupancy</label>
                  <div className="relative">
                    <FormattedNumberInput
                      value={nursingData.bedOccupancy}
                      onChange={(v) => updateNursingField("bedOccupancy", Math.min(100, Math.max(0, v)))}
                      className="h-10 bg-white border-[#E5E5E5] text-right pr-8"
                      data-testid="input-bed-occupancy"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">%</span>
                  </div>
                </div>
                {!hasProviderSettings && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black">Total Shifts</label>
                      <FormattedNumberInput
                        value={state.deployment.totalEncounters}
                        onChange={(v) => updateDeployment("totalEncounters", v)}
                        className="h-10 bg-white border-[#E5E5E5] text-right"
                        data-testid="input-total-encounters"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black">Total Nurses in Org</label>
                      <FormattedNumberInput
                        value={state.deployment.totalProviders}
                        onChange={(v) => updateDeployment("totalProviders", v)}
                        className="h-10 bg-white border-[#E5E5E5] text-right"
                        data-testid="input-total-providers"
                      />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="rounded-xl bg-white border border-[#E5E5E5] p-3.5 md:p-5 mb-3.5 md:mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          data-testid="section-abridge-native"
        >
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Sparkles className="w-4 h-4 text-[#EA2C00]" />
            <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px]">Abridge Platform Data</span>
          </div>
          <p className="text-[11px] text-[#999999] mb-3 md:mb-4">Optional. If you have access to Abridge analytics, enter these platform-native metrics.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
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
                {metric.description && <p className="text-[10px] text-[#BBBBBB] hidden md:block">{metric.description}</p>}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="max-w-[480px] mx-auto text-center mt-5 md:mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Button
            onClick={() => { syncNursingToDeployment(); onNext(); }}
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
