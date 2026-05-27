import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RotateCcw, TrendingUp, TrendingDown, Plus, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { EXPLORE_DRIVERS, type ExploreDriver, type ExploreSetting, type ExploreQuadrant, type DriverScaleAxis } from "@/lib/exploreDrivers";
import { type MeasureState, type MeasureDriverEntry, type ForecastScenario, type ForecastAddedSetting, type MeasureCareSetting } from "@/lib/measureCalculator";
import { SETTING_LABELS, computeAddedSettingValue } from "@/lib/forecastDefaults";
import { computeScenarioInvestment, makeDefaultTiers, type PricingScenario } from "@/lib/forecastPricing";
import AddCareSettingModal from "@/components/measure/AddCareSettingModal";
import AddedSettingCard from "@/components/measure/AddedSettingCard";
import PricingScenarioCard from "@/components/measure/PricingScenarioCard";

interface MeasureForecastProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

type SettingForecastValues = {
  providers: number;
  utilizationPercent: number;
  encounters: number;
  staffedBeds: number;
  occupancyPercent: number;
};

const QUADRANT_ORDER: ExploreQuadrant[] = ['Capacity', 'Workforce', 'Revenue', 'Quality'];
const SETTING_BADGE: Record<string, string> = { outpatient: 'OP', ed: 'ED', inpatient: 'IP', nursing: 'Nsg' };

function computeRealizedBaseline(driver: ExploreDriver, entry: MeasureDriverEntry): number {
  const md = driver.measureDefaults;
  if (!md || driver.visibility !== 'quantified') return 0;
  const sortedMonthly = [...(entry.monthlyData || [])].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sortedMonthly[sortedMonthly.length - 1];
  const effWith = entry.isMonthlyMode && latest ? latest.withAbridge : entry.withAbridge;
  const effWithout = entry.isMonthlyMode && latest ? latest.withoutAbridge : entry.withoutAbridge;
  const delta = entry.lowerIsBetter ? effWithout - effWith : effWith - effWithout;
  const scale = (entry.scaleDivisor && entry.scaleDivisor > 0 && entry.scaleValue !== undefined)
    ? entry.scaleValue / entry.scaleDivisor
    : 1;
  return Math.round(delta * entry.valuePerUnit * scale * (entry.attributionPercent / 100));
}

function computeScaleFactor(
  axis: DriverScaleAxis,
  baseline: SettingForecastValues,
  projected: SettingForecastValues
): number {
  if (axis === 'fixed') return 1;
  if (axis === 'providers') {
    const baseScale = baseline.providers * (baseline.utilizationPercent / 100);
    const projScale = projected.providers * (projected.utilizationPercent / 100);
    return baseScale > 0 ? projScale / baseScale : 1;
  }
  if (axis === 'encounters') {
    const baseScale = baseline.encounters * (baseline.utilizationPercent / 100);
    const projScale = projected.encounters * (projected.utilizationPercent / 100);
    return baseScale > 0 ? projScale / baseScale : 1;
  }
  if (axis === 'patientDays') {
    const baseScale = baseline.staffedBeds * (baseline.occupancyPercent / 100);
    const projScale = projected.staffedBeds * (projected.occupancyPercent / 100);
    return baseScale > 0 ? projScale / baseScale : 1;
  }
  return 1;
}

export default function MeasureForecast({ state, updateState, onNext, onBack, onHome }: MeasureForecastProps) {
  const activeSettings = (
    state.activeCareSettings && state.activeCareSettings.length > 0
      ? state.activeCareSettings
      : [state.careSetting || 'outpatient']
  ) as ExploreSetting[];

  const isMultiSetting = activeSettings.length > 1;
  const dep = state.deployment as any;

  const getSettingBaseline = (settingKey: string): SettingForecastValues => {
    const sd = (state.settingData?.[settingKey as MeasureCareSetting] || {}) as Record<string, number>;
    const providers = sd.deploy_providers || dep?.providers || 0;
    const totalEnc = sd.deploy_totalEncounters || dep?.totalEncounters || 0;
    const abridgeEnc = sd.deploy_abridgeEncounters || dep?.abridgeEncounters || 0;
    const utilPct = totalEnc > 0 ? Math.round((abridgeEnc / totalEnc) * 100) : (dep?.utilizationRate || 0);
    const staffedBeds = sd.deploy_staffedBeds || dep?.staffedBeds || 0;
    const occupancyPercent = dep?.occupancyPercent || 0;
    return { providers, utilizationPercent: utilPct, encounters: totalEnc, staffedBeds, occupancyPercent };
  };

  const getSettingProjected = (settingKey: string): SettingForecastValues => {
    return state.settingForecasts?.[settingKey] || getSettingBaseline(settingKey);
  };

  const [addModalOpen, setAddModalOpen] = useState(false);
  const addedSettings = state.forecastScenario?.addedSettings ?? [];
  const pricingScenarios = state.forecastScenario?.pricingScenarios ?? [];

  // Seed settingForecasts for each active setting from per-setting baseline on first load
  useEffect(() => {
    const newSF: Record<string, SettingForecastValues> = { ...(state.settingForecasts || {}) };
    let changed = false;
    for (const settingKey of activeSettings) {
      const sf = state.settingForecasts?.[settingKey];
      const bl = getSettingBaseline(settingKey);
      const isUnset = !sf || (sf.providers === 0 && sf.utilizationPercent === 0 && sf.encounters === 0 && sf.staffedBeds === 0 && sf.occupancyPercent === 0);
      const hasBaseline = bl.providers > 0 || bl.utilizationPercent > 0 || bl.encounters > 0;
      if (isUnset && hasBaseline) {
        newSF[settingKey] = bl;
        changed = true;
      }
    }
    if (changed) updateState({ settingForecasts: newSF });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSettingProjected = (settingKey: string, updates: Partial<SettingForecastValues>) => {
    const current = getSettingProjected(settingKey);
    updateState({ settingForecasts: { ...(state.settingForecasts || {}), [settingKey]: { ...current, ...updates } } });
  };

  const resetSettingScenario = (settingKey: string) => {
    updateState({ settingForecasts: { ...(state.settingForecasts || {}), [settingKey]: getSettingBaseline(settingKey) } });
  };

  const updateForecastScenario = (updates: Partial<ForecastScenario>) => {
    updateState({ forecastScenario: { ...(state.forecastScenario ?? {} as ForecastScenario), ...updates } });
  };

  const addCareSetting = (added: ForecastAddedSetting) => {
    updateForecastScenario({ addedSettings: [...addedSettings, added] });
  };
  const updateAddedSetting = (id: string, updates: Partial<ForecastAddedSetting>) => {
    updateForecastScenario({ addedSettings: addedSettings.map(a => a.id === id ? { ...a, ...updates } : a) });
  };
  const removeAddedSetting = (id: string) => {
    updateForecastScenario({ addedSettings: addedSettings.filter(a => a.id !== id) });
  };

  const addedSettingsTotal = useMemo(() => addedSettings.reduce((sum, a) => sum + computeAddedSettingValue(a), 0), [addedSettings]);

  const addPricingScenario = () => {
    const newScenario: PricingScenario = {
      id: `pricing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: pricingScenarios.length === 0 ? 'Current contract' : `Alternative ${pricingScenarios.length}`,
      model: 'perProvider',
      tiers: makeDefaultTiers('perProvider'),
    };
    updateForecastScenario({ pricingScenarios: [...pricingScenarios, newScenario] });
  };
  const updatePricingScenario = (id: string, updates: Partial<PricingScenario>) => {
    updateForecastScenario({ pricingScenarios: pricingScenarios.map(s => s.id === id ? { ...s, ...updates } : s) });
  };
  const removePricingScenario = (id: string) => {
    updateForecastScenario({ pricingScenarios: pricingScenarios.filter(s => s.id !== id) });
  };

  // All tracked drivers across active settings, each with its own scale factor
  const allTrackedDrivers = useMemo(() => {
    return activeSettings.flatMap(settingKey => {
      const st = state.trackedDrivers?.[settingKey] || {};
      const bl = getSettingBaseline(settingKey);
      const proj = getSettingProjected(settingKey);
      return EXPLORE_DRIVERS
        .filter(d => d.settings.includes(settingKey as ExploreSetting) && st[d.id])
        .map(d => {
          const entry = st[d.id];
          const realized = computeRealizedBaseline(d, entry);
          const scaleFactor = d.measureDefaults
            ? computeScaleFactor(d.measureDefaults.scaleAxis, bl, proj)
            : 1;
          const projectedValue = Math.round(realized * scaleFactor);
          return { driver: d, entry, realized, projected: projectedValue, scaleFactor, setting: settingKey };
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSettings, state.trackedDrivers, state.settingForecasts, state.settingData, state.deployment]);

  const totalsByQuadrant = useMemo(() => {
    const out: Record<ExploreQuadrant, { realized: number; projected: number }> = {
      Capacity: { realized: 0, projected: 0 },
      Workforce: { realized: 0, projected: 0 },
      Revenue: { realized: 0, projected: 0 },
      Quality: { realized: 0, projected: 0 },
    };
    allTrackedDrivers.forEach(({ driver, realized, projected: projVal }) => {
      out[driver.quadrant].realized += realized;
      out[driver.quadrant].projected += projVal;
    });
    return out;
  }, [allTrackedDrivers]);

  const totalRealized = useMemo(() => Object.values(totalsByQuadrant).reduce((s, q) => s + q.realized, 0), [totalsByQuadrant]);
  const totalProjected = useMemo(() => Object.values(totalsByQuadrant).reduce((s, q) => s + q.projected, 0), [totalsByQuadrant]);
  const combinedTotal = totalProjected + addedSettingsTotal;
  const totalDelta = combinedTotal - totalRealized;
  const totalPctChange = totalRealized > 0 ? ((totalDelta / totalRealized) * 100) : 0;

  const combinedProviders = useMemo(() => {
    return activeSettings.reduce((sum, s) => sum + getSettingProjected(s).providers, 0)
      + addedSettings.reduce((sum, a) => sum + a.providers, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSettings, state.settingForecasts, addedSettings]);

  const combinedEncounters = useMemo(() => {
    return activeSettings.reduce((sum, s) => sum + getSettingProjected(s).encounters, 0)
      + addedSettings.reduce((sum, a) => sum + a.encounters, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSettings, state.settingForecasts, addedSettings]);

  const bestValueScenarioId = useMemo(() => {
    if (pricingScenarios.length < 2) return null;
    const evaluated = pricingScenarios.map(s => {
      const scale = s.model === 'perProvider' ? combinedProviders
                  : s.model === 'perEncounter' ? combinedEncounters
                  : 0;
      const { value, warning } = computeScenarioInvestment(s, scale);
      return { id: s.id, investment: value, warning };
    }).filter(e => !e.warning && e.investment > 0);
    if (evaluated.length === 0) return null;
    evaluated.sort((a, b) => a.investment - b.investment);
    return evaluated[0].id;
  }, [pricingScenarios, combinedProviders, combinedEncounters]);

  const isSettingChanged = (settingKey: string) => {
    const bl = getSettingBaseline(settingKey);
    const proj = getSettingProjected(settingKey);
    return proj.providers !== bl.providers
      || proj.utilizationPercent !== bl.utilizationPercent
      || proj.encounters !== bl.encounters
      || proj.staffedBeds !== bl.staffedBeds
      || proj.occupancyPercent !== bl.occupancyPercent;
  };

  const isAnyChanged = activeSettings.some(s => isSettingChanged(s));

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  const renderAxisControl = (
    label: string,
    field: keyof SettingForecastValues,
    baseValue: number,
    projValue: number,
    settingKey: string,
    suffix: string = '',
    presets: number[] = []
  ) => {
    const ratio = baseValue > 0 ? projValue / baseValue : 1;
    const ratioLabel = baseValue > 0 ? `${ratio >= 1 ? '+' : ''}${Math.round((ratio - 1) * 100)}%` : '—';
    const ratioColor = ratio > 1 ? 'text-[#EA2C00]' : 'text-[#888888]';
    return (
      <div className="bg-white rounded-lg p-4 border border-[#E5E5E5]" data-testid={`axis-control-${settingKey}-${field}`} key={`${settingKey}-${field}`}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-black">{label}</label>
          <span className={`text-xs font-medium ${ratioColor}`}>{ratioLabel}</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <p className="text-xs text-[#888888] mb-1">Baseline</p>
            <p className="text-base font-medium text-[#666666]">{formatNumber(baseValue)}{suffix}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#888888]" />
          <div className="flex-1">
            <p className="text-xs text-[#888888] mb-1">Projected</p>
            <FormattedNumberInput
              value={projValue}
              onChange={(v: number) => updateSettingProjected(settingKey, { [field]: v })}
              className="h-9 bg-white text-base"
              data-testid={`input-projected-${settingKey}-${field}`}
            />
          </div>
        </div>
        {presets.length > 0 && baseValue > 0 && (
          <div className="flex gap-1.5 mt-2">
            {presets.map(mult => (
              <button
                key={mult}
                onClick={() => updateSettingProjected(settingKey, { [field]: Math.round(baseValue * mult) })}
                className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                  Math.abs(projValue - baseValue * mult) < 0.5
                    ? 'bg-[#EA2C00] text-white'
                    : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
                }`}
                data-testid={`button-preset-${settingKey}-${field}-${mult}x`}
              >
                {mult === 1 ? 'Current' : `${mult}×`}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSettingControls = (settingKey: string) => {
    const isNursing = settingKey === 'nursing';
    const bl = getSettingBaseline(settingKey);
    const proj = getSettingProjected(settingKey);
    const changed = isSettingChanged(settingKey);
    return (
      <div key={settingKey} className="mb-4">
        {isMultiSetting && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA2C00]" />
              <p className="text-[11px] font-semibold text-[#525252] uppercase tracking-widest">
                {SETTING_LABELS[settingKey as ExploreSetting] || settingKey}
              </p>
            </div>
            {changed && (
              <button
                onClick={() => resetSettingScenario(settingKey)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#888888] hover:text-[#EA2C00]"
                data-testid={`button-reset-${settingKey}`}
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        )}
        <div className="space-y-3">
          {renderAxisControl(isNursing ? 'Nurse FTEs' : 'Provider Count', 'providers', bl.providers, proj.providers, settingKey, '', [1, 1.5, 2, 3])}
          {renderAxisControl('Utilization', 'utilizationPercent', bl.utilizationPercent, proj.utilizationPercent, settingKey, '%', [1, 1.2, 1.5])}
          {!isNursing && renderAxisControl('Annual Encounters', 'encounters', bl.encounters, proj.encounters, settingKey, '', [1, 1.5, 2, 3])}
          {isNursing && (
            <>
              {renderAxisControl('Staffed Beds', 'staffedBeds', bl.staffedBeds, proj.staffedBeds, settingKey, '', [1, 1.5, 2])}
              {renderAxisControl('Occupancy', 'occupancyPercent', bl.occupancyPercent, proj.occupancyPercent, settingKey, '%', [1, 1.2])}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={7}
        totalSteps={7}
        stepName="Forecast"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0 max-w-[700px]">
            <motion.div className="text-center mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">Project the Path Forward</p>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">Forecast</h1>
              <p className="text-base text-[#888888]">Model how outcomes scale with growth.</p>
            </motion.div>

            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">How This Works</p>
              <p className="text-sm text-black leading-relaxed">
                Adjust the axes below to model expansion. Drivers tracked in your quadrant pages re-project automatically based on what they scale with — provider count, encounter volume, or patient days.
              </p>
            </motion.div>

            {/* Scenario controls — one section per active setting */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">Scenario Controls</p>
                {!isMultiSetting && isAnyChanged && (
                  <button
                    onClick={() => resetSettingScenario(activeSettings[0])}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#888888] hover:text-[#EA2C00]"
                    data-testid="button-reset-scenario"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset to baseline
                  </button>
                )}
              </div>
              {activeSettings.map(settingKey => renderSettingControls(settingKey))}
            </motion.div>

            {/* Projected by Quadrant */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Projected by Quadrant</p>
              {QUADRANT_ORDER.map(quadrant => {
                const quadrantDrivers = allTrackedDrivers.filter(td => td.driver.quadrant === quadrant);
                const totals = totalsByQuadrant[quadrant];
                const delta = totals.projected - totals.realized;
                if (quadrantDrivers.length === 0) return null;
                return (
                  <div key={quadrant} className="bg-white rounded-lg p-4 border border-[#E5E5E5]" data-testid={`card-quadrant-${quadrant.toLowerCase()}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-black">{quadrant}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[#888888]">{formatCurrency(totals.realized)}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#888888]" />
                        <span className="font-bold text-[#EA2C00]" data-testid={`text-quadrant-projected-${quadrant.toLowerCase()}`}>{formatCurrency(totals.projected)}</span>
                        {delta !== 0 && (
                          <span className={`text-xs font-medium ${delta > 0 ? 'text-[#EA2C00]' : 'text-[#888888]'}`}>
                            ({delta > 0 ? '+' : ''}{formatCurrency(delta)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {quadrantDrivers.map(({ driver, realized, projected: projVal, setting: driverSetting }) => (
                        <div key={`${driverSetting}-${driver.id}`} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-[#666666] truncate">{driver.label}</span>
                            {isMultiSetting && (
                              <span className="inline-flex items-center px-1 py-0.5 rounded bg-[#F0EBE4] text-[9px] font-bold text-[#8C7E6E] uppercase tracking-wide flex-shrink-0">
                                {SETTING_BADGE[driverSetting] ?? driverSetting}
                              </span>
                            )}
                          </div>
                          {driver.visibility === 'quantified' ? (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[#888888]">{formatCurrency(realized)}</span>
                              <ArrowRight className="w-3 h-3 text-[#AAAAAA]" />
                              <span className="font-medium text-black" data-testid={`text-driver-projected-${driver.id}`}>{formatCurrency(projVal)}</span>
                            </div>
                          ) : (
                            <span className="text-[#888888] italic flex-shrink-0">Qualitative</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {allTrackedDrivers.length === 0 && (
                <div className="bg-[#F5F0EB] rounded-lg p-6 text-center" data-testid="text-no-drivers">
                  <p className="text-sm text-[#666666]">No drivers tracked yet. Go back to the quadrant pages to add drivers, then return to model their growth.</p>
                </div>
              )}
            </motion.div>

            {/* Modeled Expansions */}
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">Modeled Expansions</p>
                {addedSettings.length > 0 && (
                  <p className="text-xs text-[#666666]" data-testid="text-added-settings-summary">
                    {addedSettings.length} setting{addedSettings.length === 1 ? '' : 's'} · {formatCurrency(addedSettingsTotal)}/yr
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {addedSettings.map(added => (
                  <AddedSettingCard
                    key={added.id}
                    added={added}
                    onUpdate={(updates) => updateAddedSetting(added.id, updates)}
                    onRemove={() => removeAddedSetting(added.id)}
                  />
                ))}
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="w-full py-3 px-4 rounded-lg border-2 border-dashed border-[#E5E5E5] text-sm font-medium text-[#666666] hover:border-[#EA2C00] hover:text-[#EA2C00] transition-all flex items-center justify-center gap-1.5"
                  data-testid="button-add-care-setting"
                >
                  <Plus className="w-4 h-4" /> Add a care setting
                </button>
              </div>
            </motion.div>

            {/* Pricing Comparison */}
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">Pricing Comparison</p>
                {pricingScenarios.length > 0 && (
                  <p className="text-xs text-[#666666]" data-testid="text-combined-scale">
                    Combined scale: {combinedProviders.toLocaleString()} providers · {combinedEncounters.toLocaleString()} encounters
                  </p>
                )}
              </div>

              {pricingScenarios.length === 0 && (
                <div className="bg-[#F5F0EB] rounded-lg p-6 text-center mb-3" data-testid="text-no-pricing-scenarios">
                  <DollarSign className="w-8 h-8 text-[#888888] mx-auto mb-2" />
                  <p className="text-sm text-[#666666] mb-1">Compare pricing models at projected scale.</p>
                  <p className="text-xs text-[#888888]">Add the customer's current contract terms and any alternatives you want to model.</p>
                </div>
              )}

              <div className="space-y-3">
                {pricingScenarios.map(scenario => (
                  <PricingScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    combinedProviders={combinedProviders}
                    combinedEncounters={combinedEncounters}
                    combinedValue={combinedTotal}
                    isBestValue={bestValueScenarioId === scenario.id}
                    onUpdate={(updates) => updatePricingScenario(scenario.id, updates)}
                    onRemove={() => removePricingScenario(scenario.id)}
                  />
                ))}
                <button
                  onClick={addPricingScenario}
                  className="w-full py-3 px-4 rounded-lg border-2 border-dashed border-[#E5E5E5] text-sm font-medium text-[#666666] hover:border-[#EA2C00] hover:text-[#EA2C00] transition-all flex items-center justify-center gap-1.5"
                  data-testid="button-add-pricing-scenario"
                >
                  <Plus className="w-4 h-4" /> Add a pricing scenario
                </button>
              </div>
            </motion.div>

            <motion.div className="flex justify-center mt-8 lg:hidden">
              <Button
                onClick={onNext}
                className="h-12 px-8 bg-black hover:bg-black/90 text-white font-semibold rounded-full gap-2"
                data-testid="button-continue-measure-forecast-mobile"
              >
                Continue to Outcome Summary
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          {/* Right panel */}
          <motion.div
            className="w-full lg:w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Combined Annual Value</p>
              <p className="text-sm text-white/50 mb-5">Realized + projected + expansion</p>

              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Realized today</span>
                  <span className="text-base font-medium text-white/80" data-testid="text-total-realized">{formatCurrency(totalRealized)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Projected at scale</span>
                  <span className="text-base font-medium text-white/80" data-testid="text-total-projected">{formatCurrency(totalProjected)}</span>
                </div>
                {addedSettings.length > 0 && (
                  <div className="flex items-center justify-between" data-testid="row-added-settings">
                    <span className="text-xs text-white/50">+ {addedSettings.length} setting{addedSettings.length === 1 ? '' : 's'}</span>
                    <span className="text-base font-medium text-white/80" data-testid="text-added-settings-total">{formatCurrency(addedSettingsTotal)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-[#333333]">
                  <span className="text-xs font-semibold text-white">Combined total</span>
                  <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-combined-total">{formatCurrency(totalProjected + addedSettingsTotal)}</span>
                </div>
              </div>

              {pricingScenarios.length >= 2 && bestValueScenarioId && (() => {
                const best = pricingScenarios.find(s => s.id === bestValueScenarioId);
                if (!best) return null;
                const scale = best.model === 'perProvider' ? combinedProviders
                            : best.model === 'perEncounter' ? combinedEncounters
                            : 0;
                const { value: investment } = computeScenarioInvestment(best, scale);
                const net = combinedTotal - investment;
                return (
                  <div data-testid="panel-best-pricing">
                    <div className="h-px bg-[#333333] my-4" />
                    <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Best Pricing</p>
                    <p className="text-sm text-white/50 mb-3" data-testid="text-best-pricing-label">{best.label}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">Investment</span>
                        <span className="text-sm font-medium text-white/80" data-testid="text-best-pricing-investment">{formatCurrency(investment)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">Net annual</span>
                        <span className="text-base font-bold text-[#EA2C00]" data-testid="text-best-pricing-net">{formatCurrency(net)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="h-px bg-[#333333] my-4" />

              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-2">Change</p>
              <div className="flex items-center gap-2">
                {totalDelta > 0 ? (
                  <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
                ) : totalDelta < 0 ? (
                  <TrendingDown className="w-5 h-5 text-white/50" />
                ) : null}
                <span
                  className={`text-xl font-bold ${totalDelta > 0 ? 'text-[#EA2C00]' : totalDelta < 0 ? 'text-white/70' : 'text-white/50'}`}
                  data-testid="text-total-delta"
                >
                  {totalDelta >= 0 ? '+' : ''}{formatCurrency(totalDelta)}
                </span>
                {totalRealized > 0 && (
                  <span className="text-sm text-white/50">({totalPctChange >= 0 ? '+' : ''}{totalPctChange.toFixed(0)}%)</span>
                )}
              </div>

              {!isAnyChanged && addedSettings.length === 0 && (
                <p className="text-xs text-white/40 italic mt-4" data-testid="text-no-change-hint">Adjust an axis to see projected impact.</p>
              )}

              <div className="hidden lg:block mt-6">
                <Button
                  onClick={onNext}
                  className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2"
                  data-testid="button-continue-measure-forecast"
                >
                  Continue to Outcome Summary
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AddCareSettingModal
        open={addModalOpen}
        excludeSettings={[...activeSettings, ...addedSettings.map(a => a.setting)]}
        onClose={() => setAddModalOpen(false)}
        onAdd={addCareSetting}
      />
    </div>
  );
}
