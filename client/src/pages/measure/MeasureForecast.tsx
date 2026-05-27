import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RotateCcw, TrendingUp, TrendingDown, Plus, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { getActiveDrivers, type ExploreDriver, type ExploreSetting, type ExploreQuadrant, type DriverScaleAxis } from "@/lib/exploreDrivers";
import { type MeasureState, type MeasureDriverEntry, type ForecastScenario, type ForecastAddedSetting, type MeasureCareSetting, type SettingForecastValues } from "@/lib/measureCalculator";
import { SETTING_LABELS, computeAddedSettingValue } from "@/lib/forecastDefaults";
import { computeScenarioInvestment, makeDefaultTiers, type PricingScenario, type PricingYearInput } from "@/lib/forecastPricing";
import AddCareSettingModal from "@/components/measure/AddCareSettingModal";
import AddedSettingCard from "@/components/measure/AddedSettingCard";
import PricingScenarioCard from "@/components/measure/PricingScenarioCard";
import { generateForecastScalePDF, type ForecastScalePDFData } from "@/components/measure/ForecastScalePDF";

interface MeasureForecastProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}


const QUADRANT_ORDER: ExploreQuadrant[] = ['Capacity', 'Workforce', 'Revenue', 'Quality'];
const SETTING_BADGE: Record<string, string> = { outpatient: 'OP', ed: 'ED', inpatient: 'IP', nursing: 'Nsg' };

function computeRealizedBaseline(driver: ExploreDriver, entry: MeasureDriverEntry, settingAbridgeEncounters: number): number {
  const md = driver.measureDefaults;
  if (!md || driver.visibility !== 'quantified') return 0;
  const sortedMonthly = [...(entry.monthlyData || [])].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sortedMonthly[sortedMonthly.length - 1];
  const effWith = entry.isMonthlyMode && latest ? latest.withAbridge : entry.withAbridge;
  const effWithout = entry.isMonthlyMode && latest ? latest.withoutAbridge : entry.withoutAbridge;
  const lowerIsBetter = md?.lowerIsBetter ?? entry.lowerIsBetter ?? false;
  const delta = lowerIsBetter ? effWithout - effWith : effWith - effWithout;
  const scale = md.isPerEncounterRate
    ? settingAbridgeEncounters
    : (entry.scaleDivisor && entry.scaleDivisor > 0 && entry.scaleValue !== undefined)
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
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [showAdvancedPricing, setShowAdvancedPricing] = useState(false);
  const [baseAdoptionPct, setBaseAdoptionPct] = useState(70);
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

  const forecastYears = state.forecastScenario?.forecastYears ?? 1;

  const getSettingAbridgeEnc = (settingKey: string): number => {
    const sd = (state.settingData?.[settingKey as MeasureCareSetting] || {}) as Record<string, number>;
    return sd.deploy_abridgeEncounters || dep?.abridgeEncounters || 0;
  };

  const getSettingYearValues = (settingKey: string, yearIdx: number): SettingForecastValues => {
    // yearIdx is 1-based. Year 1 uses settingForecasts (existing projected). Year 2+ uses settingForecastYears.
    if (yearIdx <= 1) return getSettingProjected(settingKey);
    return state.settingForecastYears?.[settingKey]?.[yearIdx - 1] ?? getSettingProjected(settingKey);
  };

  const getSettingFinalYear = (settingKey: string): SettingForecastValues => {
    return getSettingYearValues(settingKey, forecastYears);
  };

  const handleForecastYearsChange = (newYears: 1 | 2 | 3) => {
    if (newYears === forecastYears) return;
    const newSFY: Record<string, SettingForecastValues[]> = { ...(state.settingForecastYears || {}) };
    for (const settingKey of activeSettings) {
      const yr1 = getSettingProjected(settingKey);
      const arr: SettingForecastValues[] = [...(newSFY[settingKey] || [])];
      if (!arr[0]) arr[0] = yr1;
      // Default new year slots to Year 1 values — reps edit from there
      for (let y = 2; y <= newYears; y++) {
        if (!arr[y - 1]) {
          arr[y - 1] = { ...yr1 };
        }
      }
      newSFY[settingKey] = arr;
    }
    updateForecastScenario({ forecastYears: newYears });
    updateState({ settingForecastYears: newSFY });
  };

  const updateSettingYear = (settingKey: string, yearIdx: number, updates: Partial<SettingForecastValues>) => {
    if (yearIdx <= 1) {
      updateSettingProjected(settingKey, updates);
      return;
    }
    const arr = [...(state.settingForecastYears?.[settingKey] || [])];
    const current = arr[yearIdx - 1] || getSettingProjected(settingKey);
    arr[yearIdx - 1] = { ...current, ...updates };
    updateState({ settingForecastYears: { ...(state.settingForecastYears || {}), [settingKey]: arr } });
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
      const proj = getSettingFinalYear(settingKey);
      const abridgeEnc = getSettingAbridgeEnc(settingKey);
      return getActiveDrivers(state.customDriverDefs)
        .filter(d => d.settings.includes(settingKey as ExploreSetting) && st[d.id])
        .map(d => {
          const entry = st[d.id];
          const realized = computeRealizedBaseline(d, entry, abridgeEnc);
          const scaleFactor = d.measureDefaults
            ? computeScaleFactor(d.measureDefaults.scaleAxis, bl, proj)
            : 1;
          const projectedValue = Math.round(realized * scaleFactor);
          return { driver: d, entry, realized, projected: projectedValue, scaleFactor, setting: settingKey };
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSettings, state.trackedDrivers, state.settingForecasts, state.settingForecastYears, state.settingData, state.deployment, forecastYears, state.customDriverDefs]);

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
    return activeSettings.reduce((sum, s) => sum + getSettingFinalYear(s).providers, 0)
      + addedSettings.reduce((sum, a) => sum + a.providers, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSettings, state.settingForecasts, state.settingForecastYears, addedSettings, forecastYears]);

  const combinedEncounters = useMemo(() => {
    return activeSettings.reduce((sum, s) => sum + getSettingFinalYear(s).encounters, 0)
      + addedSettings.reduce((sum, a) => sum + a.encounters, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSettings, state.settingForecasts, state.settingForecastYears, addedSettings, forecastYears]);

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

  const pricingYearlyInputs = useMemo((): PricingYearInput[] => {
    const numYears = forecastYears;
    return Array.from({ length: numYears }, (_, i) => {
      const yearIdx = i + 1;
      let yearProviders = 0;
      let yearEncounters = 0;
      const yearQuadrantValues: Record<string, number> = { Capacity: 0, Workforce: 0, Revenue: 0, Quality: 0 };

      for (const settingKey of activeSettings) {
        const st = state.trackedDrivers?.[settingKey] || {};
        const bl = getSettingBaseline(settingKey);
        const yv = getSettingYearValues(settingKey, yearIdx);
        const abridgeEnc = getSettingAbridgeEnc(settingKey);
        yearProviders += yv.providers;
        yearEncounters += yv.encounters;
        for (const d of getActiveDrivers(state.customDriverDefs)) {
          if (!d.settings.includes(settingKey as ExploreSetting) || !st[d.id] || !d.measureDefaults) continue;
          const entry = st[d.id];
          const realized = computeRealizedBaseline(d, entry, abridgeEnc);
          const sf = computeScaleFactor(d.measureDefaults.scaleAxis, bl, yv);
          yearQuadrantValues[d.quadrant] = (yearQuadrantValues[d.quadrant] || 0) + Math.round(realized * sf);
        }
      }
      yearProviders += addedSettings.reduce((sum, a) => sum + a.providers, 0);
      yearEncounters += addedSettings.reduce((sum, a) => sum + a.encounters, 0);

      const capacityValue = yearQuadrantValues['Capacity'] || 0;
      const workforceValue = yearQuadrantValues['Workforce'] || 0;
      const revenueValue = yearQuadrantValues['Revenue'] || 0;
      const qualityValue = yearQuadrantValues['Quality'] || 0;
      const totalValue = capacityValue + workforceValue + revenueValue + qualityValue + addedSettingsTotal;

      return { providers: yearProviders, encounters: yearEncounters, capacityValue, workforceValue, revenueValue, qualityValue, totalValue };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastYears, activeSettings, state.trackedDrivers, state.settingForecasts, state.settingForecastYears, state.settingData, state.deployment, addedSettings, addedSettingsTotal]);

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
  const fmtShort = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${Math.round(n)}`;
  };

  const simpleInvestment: number = (dep?.annualContractValue as number) || 0;

  const effectiveInvestment = useMemo(() => {
    if (pricingScenarios.length > 0) {
      const scenario = bestValueScenarioId
        ? (pricingScenarios.find(s => s.id === bestValueScenarioId) ?? pricingScenarios[0])
        : pricingScenarios[0];
      const scale = scenario.model === 'perProvider' ? combinedProviders
                  : scenario.model === 'perEncounter' ? combinedEncounters
                  : 0;
      const { value, warning } = computeScenarioInvestment(scenario, scale);
      return warning ? simpleInvestment : value;
    }
    return simpleInvestment;
  }, [pricingScenarios, bestValueScenarioId, combinedProviders, combinedEncounters, simpleInvestment]);

  const handleDownloadScalePDF = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    try {
      const pdfData: ForecastScalePDFData = {
        clientName: state.deployment?.organizationName || undefined,
        totalRealized,
        totalProjected,
        addedSettingsTotal,
        combinedTotal,
        quadrantTotals: {
          Capacity: { realized: totalsByQuadrant.Capacity.realized, projected: totalsByQuadrant.Capacity.projected },
          Workforce: { realized: totalsByQuadrant.Workforce.realized, projected: totalsByQuadrant.Workforce.projected },
          Revenue: { realized: totalsByQuadrant.Revenue.realized, projected: totalsByQuadrant.Revenue.projected },
          Quality: { realized: totalsByQuadrant.Quality.realized, projected: totalsByQuadrant.Quality.projected },
        },
        combinedProviders,
        combinedEncounters,
        forecastYears,
        yearlyInputs: pricingYearlyInputs,
        pricingScenarios,
        bestValueScenarioId,
        baseAdoptionPct,
        simpleInvestment,
      };
      await generateForecastScalePDF(pdfData);
    } finally {
      setPdfGenerating(false);
    }
  };

  const renderAxisControl = (
    label: string,
    field: keyof SettingForecastValues,
    baseValue: number,
    settingKey: string,
    suffix: string = '',
    presets: number[] = []
  ) => {
    if (forecastYears === 1) {
      const projValue = getSettingProjected(settingKey)[field] as number;
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
    }

    // Multi-year layout
    const YEAR_COLS = Array.from({ length: forecastYears }, (_, i) => i + 1);
    return (
      <div className="bg-white rounded-lg p-4 border border-[#E5E5E5]" data-testid={`axis-control-${settingKey}-${field}`} key={`${settingKey}-${field}-multi`}>
        <label className="text-sm font-semibold text-black block mb-3">{label}</label>
        <div className="overflow-x-auto">
          <div className="flex gap-3 min-w-0">
            <div className="flex-shrink-0 w-20">
              <p className="text-xs text-[#888888] mb-1">Baseline</p>
              <p className="text-sm font-medium text-[#666666]">{formatNumber(baseValue)}{suffix}</p>
            </div>
            {YEAR_COLS.map(yearIdx => {
              const yv = getSettingYearValues(settingKey, yearIdx);
              const val = yv[field] as number;
              return (
                <div key={yearIdx} className="flex-1 min-w-[72px]">
                  <p className="text-xs text-[#888888] mb-1">Yr {yearIdx}</p>
                  <FormattedNumberInput
                    value={val}
                    onChange={(v: number) => updateSettingYear(settingKey, yearIdx, { [field]: v })}
                    className="h-8 bg-white text-sm"
                    data-testid={`input-yr${yearIdx}-${settingKey}-${field}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSettingControls = (settingKey: string) => {
    const isNursing = settingKey === 'nursing';
    const bl = getSettingBaseline(settingKey);
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
          {renderAxisControl(isNursing ? 'Nurse FTEs' : 'Provider Count', 'providers', bl.providers, settingKey, '', [1, 1.5, 2, 3])}
          {renderAxisControl('Utilization', 'utilizationPercent', bl.utilizationPercent, settingKey, '%', [1, 1.2, 1.5])}
          {!isNursing && renderAxisControl('Annual Encounters', 'encounters', bl.encounters, settingKey, '', [1, 1.5, 2, 3])}
          {isNursing && (
            <>
              {renderAxisControl('Staffed Beds', 'staffedBeds', bl.staffedBeds, settingKey, '', [1, 1.5, 2])}
              {renderAxisControl('Occupancy', 'occupancyPercent', bl.occupancyPercent, settingKey, '%', [1, 1.2])}
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
              {/* Forecast horizon selector */}
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs text-[#8C7E6E] whitespace-nowrap">Forecast</label>
                <div className="flex items-center gap-0.5 bg-[#F5F0EB] rounded-full p-0.5">
                  {([1, 2, 3] as const).map(yr => (
                    <button
                      key={yr}
                      onClick={() => handleForecastYearsChange(yr)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        forecastYears === yr ? 'bg-white text-neutral-900 shadow-sm' : 'text-[#8C7E6E] hover:text-neutral-900'
                      }`}
                      data-testid={`pill-forecast-years-${yr}`}
                    >
                      {yr}yr
                    </button>
                  ))}
                </div>
              </div>
              {activeSettings.map(settingKey => renderSettingControls(settingKey))}
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

            {/* Sensitivity Analysis */}
            {combinedTotal > 0 && (
              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Sensitivity Analysis</p>
                <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden" data-testid="sensitivity-matrix">
                  {/* Header */}
                  <div className="grid grid-cols-4 bg-[#FAFAF8] border-b border-[#F0ECE7]">
                    <div className="px-3 py-2.5" />
                    {[
                      { label: 'Conservative', sub: '75% realization', pct: 75 },
                      { label: 'Base Case', sub: '100% realization', pct: 100 },
                      { label: 'Optimistic', sub: '125% realization', pct: 125 },
                    ].map(col => (
                      <div key={col.pct} className={`px-3 py-2.5 text-center border-l border-[#F0ECE7] ${col.pct === 100 ? 'bg-[#F5F0EB]' : ''}`}>
                        <p className="text-[10px] font-semibold text-[#555555] uppercase tracking-wide leading-none">{col.label}</p>
                        <p className="text-[9px] text-[#AAAAAA] mt-0.5">{col.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Rows: 50 / 70 / 90 % adoption */}
                  {[50, 70, 90].map(adoption => {
                    const isBaseRow = adoption === baseAdoptionPct;
                    return (
                      <div key={adoption} className={`grid grid-cols-4 border-b last:border-0 border-[#F0ECE7] ${isBaseRow ? 'bg-[#FAFAF8]' : ''}`}>
                        {/* Row label — click to set as base */}
                        <button
                          onClick={() => setBaseAdoptionPct(adoption)}
                          className={`px-3 py-3 flex flex-col justify-center gap-0.5 text-left transition-colors ${isBaseRow ? '' : 'hover:bg-[#F9F7F5]'}`}
                          title="Set as base case"
                        >
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-[#1A1A1A]">{adoption}%</p>
                            {isBaseRow && (
                              <span className="px-1.5 py-0.5 bg-[#EA2C00] text-white text-[8px] font-bold rounded-full uppercase tracking-wide">Base</span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#AAAAAA]">adoption</p>
                        </button>

                        {/* Value cells */}
                        {[75, 100, 125].map(realization => {
                          const cellValue = Math.round(combinedTotal * (adoption / 100) * (realization / 100));
                          const isBase = isBaseRow && realization === 100;
                          const roi = effectiveInvestment > 0 ? cellValue / effectiveInvestment : null;
                          return (
                            <div
                              key={realization}
                              className={`px-3 py-3 text-center border-l border-[#F0ECE7] ${realization === 100 ? 'bg-[#F5F0EB]' : ''} ${isBase ? 'ring-2 ring-inset ring-[#EA2C00]/25' : ''}`}
                              data-testid={`sensitivity-cell-${adoption}-${realization}`}
                            >
                              <p className={`text-sm font-bold tabular-nums ${isBase ? 'text-[#EA2C00]' : 'text-[#1A1A1A]'}`}>
                                {fmtShort(cellValue)}
                              </p>
                              {roi !== null && (
                                <p className={`text-[10px] font-semibold mt-0.5 ${roi >= 1 ? 'text-emerald-600' : 'text-[#AAAAAA]'}`}>
                                  {roi.toFixed(1)}× ROI
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#AAAAAA] mt-2 leading-relaxed">
                  Annual value at adoption × realization rate. 100% realization = drivers perform as measured.{effectiveInvestment > 0 ? ' ROI = value ÷ annual investment.' : ''}{' '}Click a row to change the base case.
                </p>
              </motion.div>
            )}

            {/* Pricing */}
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Pricing</p>

              {/* Simple ACV input */}
              <div className="bg-white rounded-xl border border-[#E5E5E5] p-4 mb-3">
                <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-2 block">
                  Annual Contract Value
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888] pointer-events-none">$</span>
                  <FormattedNumberInput
                    value={simpleInvestment}
                    onChange={(v: number) => updateState({ deployment: { ...(state.deployment || {}), annualContractValue: v } as typeof state.deployment })}
                    className="h-10 bg-white pl-7"
                    placeholder="0"
                    data-testid="input-simple-acv"
                  />
                </div>
                {simpleInvestment > 0 && combinedTotal > 0 && (
                  <p className="text-xs text-emerald-600 font-medium mt-2">
                    {(combinedTotal * (baseAdoptionPct / 100) / simpleInvestment).toFixed(1)}× ROI at base case ({baseAdoptionPct}% adoption)
                  </p>
                )}
              </div>

              {/* Advanced pricing model toggle */}
              <button
                onClick={() => setShowAdvancedPricing(v => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#888888] hover:text-[#EA2C00] transition-colors mb-2"
                data-testid="button-toggle-advanced-pricing"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvancedPricing ? 'rotate-0' : '-rotate-90'}`} />
                Advanced: configure tier-based pricing
              </button>

              <AnimatePresence initial={false}>
                {showAdvancedPricing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-1">
                      {pricingScenarios.length > 0 && (
                        <div className={`mb-3 ${pricingScenarios.length >= 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}`}>
                          {pricingScenarios.map(scenario => (
                            <PricingScenarioCard
                              key={scenario.id}
                              scenario={scenario}
                              displayProviders={combinedProviders}
                              displayEncounters={combinedEncounters}
                              displayValue={combinedTotal}
                              isBestValue={bestValueScenarioId === scenario.id}
                              onUpdate={(updates) => updatePricingScenario(scenario.id, updates)}
                              onRemove={() => removePricingScenario(scenario.id)}
                            />
                          ))}
                        </div>
                      )}
                      <button
                        onClick={addPricingScenario}
                        className="w-full py-3 px-4 rounded-lg border-2 border-dashed border-[#E5E5E5] text-sm font-medium text-[#666666] hover:border-[#EA2C00] hover:text-[#EA2C00] transition-all flex items-center justify-center gap-1.5"
                        data-testid="button-add-pricing-scenario"
                      >
                        <Plus className="w-4 h-4" /> Add a pricing scenario
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div className="flex justify-center mt-8 lg:hidden">
              <Button
                onClick={onNext}
                className="h-12 px-8 bg-black hover:bg-black/90 text-white font-semibold rounded-full gap-2"
                data-testid="button-continue-measure-forecast-mobile"
              >
                View Evidence Detail
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
              <p className="text-sm text-white/50 mb-5">Realized + projected + expansion · 100% adoption</p>

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

              {/* Investment + ROI — shown whenever pricing is configured (1 or more scenarios) */}
              {pricingScenarios.length > 0 && (() => {
                const displayScenario = bestValueScenarioId
                  ? pricingScenarios.find(s => s.id === bestValueScenarioId) ?? pricingScenarios[0]
                  : pricingScenarios[0];
                const scale = displayScenario.model === 'perProvider' ? combinedProviders
                            : displayScenario.model === 'perEncounter' ? combinedEncounters
                            : 0;
                const { value: investment, warning } = computeScenarioInvestment(displayScenario, scale);
                if (warning || investment <= 0) return null;
                const net = combinedTotal - investment;
                const roi = investment > 0 ? combinedTotal / investment : null;
                return (
                  <div data-testid="panel-pricing-receipt">
                    <div className="h-px bg-[#333333] my-4" />
                    <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">
                      {pricingScenarios.length >= 2 ? 'Best Value Scenario' : 'Investment'}
                    </p>
                    {pricingScenarios.length >= 2 && (
                      <p className="text-sm text-white/50 mb-3" data-testid="text-best-pricing-label">{displayScenario.label}</p>
                    )}
                    <div className="space-y-1.5 mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">{pricingScenarios.length >= 2 ? 'Investment' : displayScenario.label}</span>
                        <span className="text-sm font-medium text-white/80" data-testid="text-best-pricing-investment">{formatCurrency(investment)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">Net annual</span>
                        <span className={`text-base font-bold ${net >= 0 ? 'text-[#EA2C00]' : 'text-white/70'}`} data-testid="text-best-pricing-net">{formatCurrency(net)}</span>
                      </div>
                      {roi !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/50">ROI</span>
                          <span className="text-sm font-semibold text-emerald-400">{roi.toFixed(1)}×</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ACV from setup — shown only when no pricing scenarios configured */}
              {pricingScenarios.length === 0 && (dep?.annualContractValue ?? 0) > 0 && combinedTotal > 0 && (() => {
                const investment = dep.annualContractValue as number;
                const net = combinedTotal - investment;
                const roi = combinedTotal / investment;
                return (
                  <div data-testid="panel-acv-receipt">
                    <div className="h-px bg-[#333333] my-4" />
                    <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-3">Investment</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">Annual contract</span>
                        <span className="text-sm font-medium text-white/80">{formatCurrency(investment)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">Net annual</span>
                        <span className={`text-base font-bold ${net >= 0 ? 'text-[#EA2C00]' : 'text-white/70'}`}>{formatCurrency(net)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/50">ROI</span>
                        <span className="text-sm font-semibold text-emerald-400">{roi.toFixed(1)}×</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="h-px bg-[#333333] my-4" />

              {/* Projected by Quadrant */}
              {allTrackedDrivers.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-white/40 uppercase tracking-[1.5px] mb-3">By Domain</p>
                  <div className="space-y-2">
                    {QUADRANT_ORDER.map(quadrant => {
                      const totals = totalsByQuadrant[quadrant];
                      if (totals.projected === 0 && totals.realized === 0) return null;
                      return (
                        <div key={quadrant} className="flex items-center justify-between" data-testid={`card-quadrant-${quadrant.toLowerCase()}`}>
                          <span className="text-xs text-white/50">{quadrant}</span>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-white/30">{formatCurrency(totals.realized)}</span>
                            <ArrowRight className="w-3 h-3 text-white/20" />
                            <span className="font-semibold text-white/80" data-testid={`text-quadrant-projected-${quadrant.toLowerCase()}`}>{formatCurrency(totals.projected)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-px bg-[#333333] my-4" />
                </div>
              )}

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

              <div className="hidden lg:block mt-6 space-y-2">
                <Button
                  onClick={handleDownloadScalePDF}
                  disabled={pdfGenerating || combinedTotal === 0}
                  className="w-full h-11 bg-[#2A2A2A] hover:bg-[#333333] text-white font-semibold rounded-full gap-2 disabled:opacity-40"
                  data-testid="button-download-scale-pdf"
                >
                  <Download className="w-4 h-4" />
                  {pdfGenerating ? "Building PDF…" : "Download Scale Brief"}
                </Button>
                <Button
                  onClick={onNext}
                  className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2"
                  data-testid="button-continue-measure-forecast"
                >
                  View Evidence Detail
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
