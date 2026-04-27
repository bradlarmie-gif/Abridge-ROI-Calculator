import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RotateCcw, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { EXPLORE_DRIVERS, type ExploreDriver, type ExploreSetting, type ExploreQuadrant, type DriverScaleAxis } from "@/lib/exploreDrivers";
import { type MeasureState, type MeasureDriverEntry, type ForecastScenario, type ForecastAddedSetting } from "@/lib/measureCalculator";
import { computeAddedSettingValue } from "@/lib/forecastDefaults";
import AddCareSettingModal from "@/components/measure/AddCareSettingModal";
import AddedSettingCard from "@/components/measure/AddedSettingCard";

interface MeasureForecastProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const QUADRANT_ORDER: ExploreQuadrant[] = ['Capacity', 'Workforce', 'Revenue', 'Quality'];

function computeRealizedBaseline(driver: ExploreDriver, entry: MeasureDriverEntry): number {
  const md = driver.measureDefaults;
  if (!md || driver.visibility !== 'quantified') return 0;
  const sortedMonthly = [...(entry.monthlyData || [])].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sortedMonthly[sortedMonthly.length - 1];
  const effWith = entry.isMonthlyMode && latest ? latest.withAbridge : entry.withAbridge;
  const effWithout = entry.isMonthlyMode && latest ? latest.withoutAbridge : entry.withoutAbridge;
  const delta = effWith - effWithout;
  return Math.round(delta * entry.valuePerUnit * (entry.attributionPercent / 100) * (entry.realizationPercent / 100));
}

function computeScaleFactor(
  axis: DriverScaleAxis,
  baseline: ForecastScenario,
  projected: ForecastScenario
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
  const setting = (state.careSetting || 'outpatient') as ExploreSetting;
  const isNursing = setting === 'nursing';

  const baseline: ForecastScenario = useMemo(() => ({
    providers: state.deployment?.providers ?? 0,
    utilizationPercent: state.deployment?.utilizationRate ?? 0,
    encounters: state.deployment?.totalEncounters ?? 0,
    // staffedBeds / occupancyPercent are not captured in MeasureDeployment yet;
    // nursing patientDays-axis reprojection is a known Sprint 3E gap until those
    // fields are added to the deployment data model.
    staffedBeds: 0,
    occupancyPercent: 0,
    addedSettings: [],
  }), [state.deployment]);

  const projected: ForecastScenario = state.forecastScenario ?? {
    providers: 0,
    utilizationPercent: 0,
    encounters: 0,
    staffedBeds: 0,
    occupancyPercent: 0,
    addedSettings: [],
  };

  const [addModalOpen, setAddModalOpen] = useState(false);
  const addedSettings = projected.addedSettings ?? [];

  useEffect(() => {
    const looksUninitialized =
      projected.providers === 0 &&
      projected.utilizationPercent === 0 &&
      projected.encounters === 0 &&
      projected.staffedBeds === 0 &&
      projected.occupancyPercent === 0;
    const hasBaseline =
      baseline.providers > 0 ||
      baseline.utilizationPercent > 0 ||
      baseline.encounters > 0 ||
      baseline.staffedBeds > 0 ||
      baseline.occupancyPercent > 0;
    if (looksUninitialized && hasBaseline) {
      updateState({ forecastScenario: { ...baseline, addedSettings } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProjected = (updates: Partial<ForecastScenario>) => {
    updateState({ forecastScenario: { ...projected, ...updates } });
  };

  const resetScenario = () => updateState({ forecastScenario: { ...baseline, addedSettings } });

  const addCareSetting = (added: ForecastAddedSetting) => {
    updateState({ forecastScenario: { ...projected, addedSettings: [...addedSettings, added] } });
  };

  const updateAddedSetting = (id: string, updates: Partial<ForecastAddedSetting>) => {
    updateState({
      forecastScenario: {
        ...projected,
        addedSettings: addedSettings.map(a => a.id === id ? { ...a, ...updates } : a),
      },
    });
  };

  const removeAddedSetting = (id: string) => {
    updateState({
      forecastScenario: {
        ...projected,
        addedSettings: addedSettings.filter(a => a.id !== id),
      },
    });
  };

  const addedSettingsTotal = useMemo(() => {
    return addedSettings.reduce((sum, a) => sum + computeAddedSettingValue(a), 0);
  }, [addedSettings]);

  const trackedDriverIds = Object.keys(state.trackedDrivers || {});
  const trackedDrivers = useMemo(() => {
    return EXPLORE_DRIVERS
      .filter(d => d.settings.includes(setting) && trackedDriverIds.includes(d.id))
      .map(d => {
        const entry = state.trackedDrivers[d.id];
        const realized = computeRealizedBaseline(d, entry);
        const scaleFactor = d.measureDefaults
          ? computeScaleFactor(d.measureDefaults.scaleAxis, baseline, projected)
          : 1;
        const projectedValue = Math.round(realized * scaleFactor);
        return { driver: d, entry, realized, projected: projectedValue, scaleFactor };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedDriverIds.join(','), setting, state.trackedDrivers, baseline, projected]);

  const totalsByQuadrant = useMemo(() => {
    const out: Record<ExploreQuadrant, { realized: number; projected: number }> = {
      Capacity: { realized: 0, projected: 0 },
      Workforce: { realized: 0, projected: 0 },
      Revenue: { realized: 0, projected: 0 },
      Quality: { realized: 0, projected: 0 },
    };
    trackedDrivers.forEach(({ driver, realized, projected: projVal }) => {
      out[driver.quadrant].realized += realized;
      out[driver.quadrant].projected += projVal;
    });
    return out;
  }, [trackedDrivers]);

  const totalRealized = useMemo(() => Object.values(totalsByQuadrant).reduce((s, q) => s + q.realized, 0), [totalsByQuadrant]);
  const totalProjected = useMemo(() => Object.values(totalsByQuadrant).reduce((s, q) => s + q.projected, 0), [totalsByQuadrant]);
  // Combined view: realized + projected drivers + added-setting expansions.
  // The "Change" metric reflects the same combined number shown in the panel.
  const combinedTotal = totalProjected + addedSettingsTotal;
  const totalDelta = combinedTotal - totalRealized;
  const totalPctChange = totalRealized > 0 ? ((totalDelta / totalRealized) * 100) : 0;

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  const isNoChange = projected.providers === baseline.providers
    && projected.utilizationPercent === baseline.utilizationPercent
    && projected.encounters === baseline.encounters
    && projected.staffedBeds === baseline.staffedBeds
    && projected.occupancyPercent === baseline.occupancyPercent;

  const renderAxisControl = (
    label: string,
    field: keyof ForecastScenario,
    baseValue: number,
    projValue: number,
    suffix: string = '',
    presets: number[] = []
  ) => {
    const ratio = baseValue > 0 ? projValue / baseValue : 1;
    const ratioLabel = baseValue > 0 ? `${ratio >= 1 ? '+' : ''}${Math.round((ratio - 1) * 100)}%` : '—';
    const ratioColor = ratio > 1 ? 'text-[#EA2C00]' : 'text-[#888888]';
    return (
      <div className="bg-white rounded-lg p-4 border border-[#E5E5E5]" data-testid={`axis-control-${field}`}>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-black">{label}</label>
          <span className={`text-xs font-medium ${ratioColor}`} data-testid={`text-ratio-${field}`}>{ratioLabel}</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <p className="text-xs text-[#888888] mb-1">Baseline</p>
            <p className="text-base font-medium text-[#666666]" data-testid={`text-baseline-${field}`}>{formatNumber(baseValue)}{suffix}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#888888]" />
          <div className="flex-1">
            <p className="text-xs text-[#888888] mb-1">Projected</p>
            <FormattedNumberInput
              value={projValue}
              onChange={(v: number) => updateProjected({ [field]: v } as Partial<ForecastScenario>)}
              className="h-9 bg-white text-base"
              data-testid={`input-projected-${field}`}
            />
          </div>
        </div>
        {presets.length > 0 && baseValue > 0 && (
          <div className="flex gap-1.5 mt-2">
            {presets.map(mult => (
              <button
                key={mult}
                onClick={() => updateProjected({ [field]: Math.round(baseValue * mult) } as Partial<ForecastScenario>)}
                className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                  Math.abs(projValue - baseValue * mult) < 0.5
                    ? 'bg-[#EA2C00] text-white'
                    : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
                }`}
                data-testid={`button-preset-${field}-${mult}x`}
              >
                {mult === 1 ? 'Current' : `${mult}×`}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={6}
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

            <motion.div
              className="space-y-3 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">Scenario Controls</p>
                {!isNoChange && (
                  <button
                    onClick={resetScenario}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#888888] hover:text-[#EA2C00]"
                    data-testid="button-reset-scenario"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset to baseline
                  </button>
                )}
              </div>
              {renderAxisControl(
                isNursing ? 'Nurse FTEs' : 'Provider Count',
                'providers',
                baseline.providers,
                projected.providers,
                '',
                [1, 1.5, 2, 3]
              )}
              {renderAxisControl(
                'Utilization',
                'utilizationPercent',
                baseline.utilizationPercent,
                projected.utilizationPercent,
                '%',
                [1, 1.2, 1.5]
              )}
              {!isNursing && renderAxisControl(
                'Annual Encounters',
                'encounters',
                baseline.encounters,
                projected.encounters,
                '',
                [1, 1.5, 2, 3]
              )}
              {isNursing && (
                <>
                  {renderAxisControl('Staffed Beds', 'staffedBeds', baseline.staffedBeds, projected.staffedBeds, '', [1, 1.5, 2])}
                  {renderAxisControl('Occupancy', 'occupancyPercent', baseline.occupancyPercent, projected.occupancyPercent, '%', [1, 1.2])}
                </>
              )}
            </motion.div>

            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Projected by Quadrant</p>
              {QUADRANT_ORDER.map(quadrant => {
                const quadrantDrivers = trackedDrivers.filter(td => td.driver.quadrant === quadrant);
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
                      {quadrantDrivers.map(({ driver, realized, projected: projVal }) => (
                        <div key={driver.id} className="flex items-center justify-between text-xs">
                          <span className="text-[#666666] truncate flex-1 min-w-0">{driver.label}</span>
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
              {trackedDrivers.length === 0 && (
                <div className="bg-[#F5F0EB] rounded-lg p-6 text-center" data-testid="text-no-drivers">
                  <p className="text-sm text-[#666666]">No drivers tracked yet. Go back to the quadrant pages to add drivers, then return to model their growth.</p>
                </div>
              )}
            </motion.div>

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

              {isNoChange && (
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
        excludeSettings={[setting, ...addedSettings.map(a => a.setting)]}
        onClose={() => setAddModalOpen(false)}
        onAdd={addCareSetting}
      />
    </div>
  );
}
