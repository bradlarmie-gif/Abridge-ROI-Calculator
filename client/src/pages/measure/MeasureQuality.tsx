import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import MeasureDriverCard from "@/components/measure/MeasureDriverCard";
import AddMeasureDriverPicker from "@/components/measure/AddMeasureDriverPicker";
import { getActiveDrivers, type ExploreDriver, type ExploreSetting, type CustomDriverDef } from "@/lib/exploreDrivers";
import { getRealizedValueForEntry, getEffectiveWithWithout, fmtMoneyCompact, type MeasureState, type MeasureDriverEntry, type MeasureCareSetting } from "@/lib/measureCalculator";

interface MeasureQualityProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const QUADRANT = 'Quality' as const;

export default function MeasureQuality({ state, updateState, onNext, onBack, onHome }: MeasureQualityProps) {
  const activeSettings = (
    state.activeCareSettings && state.activeCareSettings.length > 0
      ? state.activeCareSettings
      : [state.careSetting || 'outpatient']
  ) as ExploreSetting[];
  const SETTING_LABELS_MAP: Record<string, string> = {
    outpatient: 'Outpatient', ed: 'Emergency Dept', inpatient: 'Inpatient', nursing: 'Nursing',
  };

  const trackedBySetting = useMemo(() =>
    activeSettings.map(settingKey => {
      const st = state.trackedDrivers?.[settingKey] || {};
      const drivers = getActiveDrivers(state.customDriverDefs)
        .filter(d => d.quadrant === QUADRANT && d.settings.includes(settingKey) && st[d.id])
        .map(d => ({ driver: d, entry: st[d.id] }));
      return {
        setting: settingKey,
        label: SETTING_LABELS_MAP[settingKey] || settingKey,
        financialDrivers: drivers.filter(({ driver }) => driver.visibility === 'quantified'),
        watchMetrics: drivers.filter(({ driver }) => driver.visibility === 'qualitative'),
        trackedIds: Object.keys(st),
      };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.trackedDrivers, activeSettings, state.customDriverDefs]
  );

  const trackedHere = useMemo(() => trackedBySetting.flatMap(({ financialDrivers, watchMetrics }) => [...financialDrivers, ...watchMetrics]), [trackedBySetting]);
  const financialDrivers = trackedHere.filter(({ driver }) => driver.visibility === 'quantified');
  const watchMetrics = trackedHere.filter(({ driver }) => driver.visibility === 'qualitative');

  const updateEntry = (settingKey: string, driverId: string, updates: Partial<MeasureDriverEntry>) => {
    const st = state.trackedDrivers?.[settingKey] || {};
    updateState({
      trackedDrivers: {
        ...state.trackedDrivers,
        [settingKey]: { ...st, [driverId]: { ...st[driverId], ...updates } },
      },
    });
  };

  const removeEntry = (settingKey: string, driverId: string) => {
    const st = { ...(state.trackedDrivers?.[settingKey] || {}) };
    delete st[driverId];
    updateState({ trackedDrivers: { ...state.trackedDrivers, [settingKey]: st } });
  };

  const addDriver = (settingKey: string, driver: ExploreDriver) => {
    const st = state.trackedDrivers?.[settingKey] || {};
    const md = driver.measureDefaults;
    const entry: MeasureDriverEntry = {
      driverId: driver.id,
      withoutAbridge: 0,
      withAbridge: driver.isCustom && driver.visibility === 'quantified' ? 1 : 0,
      valuePerUnit: md?.valuePerUnitDefault ?? 0,
      attributionPercent: 100,
      realizationPercent: 100,
      lowerIsBetter: md?.lowerIsBetter ?? false,
      expanded: true,
      scaleValue: md?.scaleInput?.defaultValue,
      scaleDivisor: md?.scaleInput?.divisor,
    };
    updateState({
      trackedDrivers: { ...state.trackedDrivers, [settingKey]: { ...st, [driver.id]: entry } },
    });
  };

  const addCustomDef = (def: CustomDriverDef) => {
    updateState({
      customDriverDefs: { ...(state.customDriverDefs || {}), [def.id]: def },
    });
  };

  const quadrantTotal = useMemo(() => {
    return trackedBySetting.reduce((sum, { setting: settingKey, financialDrivers: settingFD, watchMetrics: settingWM }) => {
      const sd = (state.settingData?.[settingKey as MeasureCareSetting] || {}) as Record<string, number>;
      const abridgeEnc: number = (sd.deploy_abridgeEncounters as number) || state.deployment?.abridgeEncounters || 0;
      return sum + [...settingFD, ...settingWM].reduce((s, { driver, entry }) => {
        const isQuantifiable = driver.visibility === 'quantified' && Boolean(driver.measureDefaults);
        const md = driver.measureDefaults;
        if (md?.isPerEncounterRate && abridgeEnc > 0 && isQuantifiable) {
          const { withAbridge, withoutAbridge } = getEffectiveWithWithout(entry);
          const delta = (md.lowerIsBetter ?? false) ? withoutAbridge - withAbridge : withAbridge - withoutAbridge;
          return s + Math.round(delta * entry.valuePerUnit * abridgeEnc * (entry.attributionPercent / 100));
        }
        const entryWithLib = { ...entry, lowerIsBetter: md?.lowerIsBetter ?? entry.lowerIsBetter };
        return s + getRealizedValueForEntry(entryWithLib, isQuantifiable);
      }, 0);
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedBySetting, state.settingData, state.deployment]);

  const allDomainsTotal = useMemo(() => {
    return activeSettings.reduce((totalSum, settingKey) => {
      const st = state.trackedDrivers?.[settingKey] || {};
      const sd = (state.settingData?.[settingKey as MeasureCareSetting] || {}) as Record<string, number>;
      const abridgeEnc: number = (sd.deploy_abridgeEncounters as number) || state.deployment?.abridgeEncounters || 0;
      return totalSum + getActiveDrivers(state.customDriverDefs)
        .filter(d => d.settings.includes(settingKey as ExploreSetting) && st[d.id])
        .reduce((s, driver) => {
          const entry = st[driver.id];
          const isQuantifiable = driver.visibility === 'quantified' && Boolean(driver.measureDefaults);
          const md = driver.measureDefaults;
          if (md?.isPerEncounterRate && abridgeEnc > 0 && isQuantifiable) {
            const { withAbridge, withoutAbridge } = getEffectiveWithWithout(entry);
            const delta = (md.lowerIsBetter ?? false) ? withoutAbridge - withAbridge : withAbridge - withoutAbridge;
            return s + Math.round(delta * entry.valuePerUnit * abridgeEnc * (entry.attributionPercent / 100));
          }
          const entryWithLib = { ...entry, lowerIsBetter: md?.lowerIsBetter ?? entry.lowerIsBetter };
          return s + getRealizedValueForEntry(entryWithLib, isQuantifiable);
        }, 0);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSettings, state.trackedDrivers, state.settingData, state.deployment, state.customDriverDefs]);

  const isMultiSetting = activeSettings.length > 1;

  const subtitle = useMemo(() => {
    if (isMultiSetting) {
      const names = activeSettings.map(s => ({ outpatient: 'Outpatient', ed: 'ED', inpatient: 'Inpatient', nursing: 'Nursing' }[s] ?? s));
      return `Quality signals across your ${names.join(' + ')} deployment`;
    }
    return {
      outpatient: 'What quality measures and patient experience signals are tracking?',
      ed: 'What compliance, deficiency, and patient experience signals are tracking in the ED?',
      inpatient: 'What clinical documentation quality signals are tracking?',
      nursing: 'What care quality and safety signals are tracking on your nursing units?',
    }[activeSettings[0]] ?? 'What clinical and patient outcomes are tracking with Abridge?';
  }, [activeSettings, isMultiSetting]);

  const howToUse = useMemo(() => {
    if (isMultiSetting) return 'Outpatient quality focuses on HEDIS, care gaps, and patient experience. ED quality centers on compliance, deficiency rates, and Press Ganey. Add the signals that matter most for this EBR.';
    return {
      outpatient: 'These are the signals that show whether the care itself is being captured more accurately. HEDIS, STARS, and CG-CAHPS all trace back to documentation quality at the point of care.',
      ed: 'Core measure compliance, documentation deficiency rate, and Press Ganey scores are the three quality pillars for an ED EBR. All three are measurable and all three respond to ambient capture.',
      inpatient: 'CDI query rate per provider is the leading quality signal for inpatient. SOI classification accuracy and H&P timeliness are the two upstream drivers.',
      nursing: 'HAPI, falls, CAUTI, CLABSI, and SEP-1 are the five nursing safety outcomes that are both measurable and directly affected by documentation timeliness.',
    }[activeSettings[0]] ?? 'Track the Quality outcomes that matter for this customer. For each driver, enter the value with and without Abridge, then dial attribution and realization to reflect their reality.';
  }, [activeSettings, isMultiSetting]);

  const formatCurrency = fmtMoneyCompact;

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <UnifiedHeader
        pathType="measure"
        currentStep={5}
        totalSteps={7}
        stepName="Quality"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-10">
          <div className="flex-1 max-w-[700px]">
            <motion.div className="text-center mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">Quality</h1>
              <p className="text-base text-[#888888]">{subtitle}</p>
            </motion.div>

            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">How to Use This Section</p>
              <p className="text-sm text-black leading-relaxed">{howToUse}</p>
            </motion.div>

            {trackedBySetting.map(({ setting: settingKey, label: settingLabel, financialDrivers: settingFD, watchMetrics: settingWM, trackedIds }) => {
              const sd = (state.settingData?.[settingKey as MeasureCareSetting] || {}) as Record<string, number>;
              const settingAbridgeEnc = (sd.deploy_abridgeEncounters as number) || state.deployment?.abridgeEncounters || 0;
              return (
              <div key={settingKey} className={isMultiSetting ? "mb-8" : ""}>
                {isMultiSetting && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA2C00]" />
                    <p className="text-[11px] font-semibold text-[#525252] uppercase tracking-widest">{settingLabel}</p>
                  </div>
                )}

                {settingFD.length > 0 && (
                  <motion.div
                    className="bg-[#F5F0EB] rounded-lg p-6 mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <div className="mb-4">
                      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">Financial Drivers</p>
                      <p className="text-xs text-[#AAAAAA]">Drivers that build the business case with dollar value.</p>
                    </div>
                    <div className="space-y-3">
                      {settingFD.map(({ driver, entry }) => (
                        <MeasureDriverCard
                          key={driver.id}
                          driver={driver}
                          entry={entry}
                          onUpdate={(updates) => updateEntry(settingKey, driver.id, updates)}
                          onRemove={() => removeEntry(settingKey, driver.id)}
                          isMultiSetting={false}
                          abridgeEncounters={settingAbridgeEnc}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {settingWM.length > 0 && (
                  <motion.div
                    className="bg-[#F5F0EB] rounded-lg p-6 mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                  >
                    <div className="mb-4">
                      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">Signals to Track</p>
                      <p className="text-xs text-[#AAAAAA]">Outcomes tracked post-deployment that don't carry direct dollar value.</p>
                    </div>
                    <div className="space-y-3">
                      {settingWM.map(({ driver, entry }) => (
                        <MeasureDriverCard
                          key={driver.id}
                          driver={driver}
                          entry={entry}
                          onUpdate={(updates) => updateEntry(settingKey, driver.id, updates)}
                          onRemove={() => removeEntry(settingKey, driver.id)}
                          isMultiSetting={false}
                          abridgeEncounters={settingAbridgeEnc}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {settingFD.length === 0 && settingWM.length === 0 && (
                  <motion.div
                    className="bg-[#F5F0EB] rounded-lg p-6 text-center mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    data-testid="empty-state-quality"
                  >
                    <p className="text-sm font-medium text-[#444444]">No Quality drivers yet{isMultiSetting ? ` for ${settingLabel}` : ''}.</p>
                    <p className="text-xs text-[#666666] mt-1.5">HEDIS, STARS, and Press Ganey are the three quality signals every executive recognizes — and all three respond to documentation completeness.</p>
                  </motion.div>
                )}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <AddMeasureDriverPicker
                    quadrant={QUADRANT}
                    settings={[settingKey as ExploreSetting]}
                    alreadyTracked={trackedIds}
                    onAdd={(driver) => addDriver(settingKey, driver)}
                    onAddCustomDef={addCustomDef}
                  />
                </motion.div>
              </div>
              );
            })}

            <motion.div
              className="flex justify-center mt-8 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <Button
                onClick={onNext}
                className="h-12 px-8 bg-black hover:bg-black/90 text-white font-semibold rounded-full gap-2"
                data-testid="button-continue-measure-quality-mobile"
              >
                See My Results
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          <motion.div
            className="w-full md:w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 md:sticky md:top-24">
              {allDomainsTotal > 0 && activeSettings.length > 1 && (
                <div className="mb-5 pb-4 border-b border-[#2A2A2A]">
                  <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-1">All Domains</p>
                  <p className="text-xl font-bold text-white/60 tabular-nums">{formatCurrency(allDomainsTotal)}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">cumulative · attribution-adjusted</p>
                </div>
              )}
              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Quality Realized</p>
              <p className="text-sm text-white/50 mb-4">Quantifiable drivers, attribution-adjusted</p>

              {financialDrivers.length > 0 ? (
                <>
                  <p className="text-3xl font-bold text-[#EA2C00]" data-testid="text-quadrant-total-quality">{formatCurrency(quadrantTotal)}</p>
                  <p className="text-xs text-white/50 mt-1">annualized impact</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-white/20" data-testid="text-quadrant-total-quality">—</p>
                  <p className="text-xs text-white/40 mt-1">{watchMetrics.length > 0 ? 'Signals only — no financial drivers yet' : 'No drivers tracked yet'}</p>
                </>
              )}

              <div className="h-px bg-[#333333] my-5" />

              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-3">Drivers Tracked</p>
              {financialDrivers.length === 0 && watchMetrics.length === 0 ? (
                <p className="text-xs text-white/40 italic">None yet</p>
              ) : (
                <div className="space-y-4">
                  {financialDrivers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-2">Financial</p>
                      <ul className="space-y-1.5">
                        {financialDrivers.map(({ driver }) => (
                          <li key={driver.id} className="text-sm text-white/70 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EA2C00] flex-shrink-0" />
                            <span className="truncate">{driver.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {watchMetrics.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-2">Signals to Track</p>
                      <ul className="space-y-1.5">
                        {watchMetrics.map(({ driver }) => (
                          <li key={driver.id} className="text-sm text-white/70 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                            <span className="truncate">{driver.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="hidden lg:block mt-6">
                <Button
                  onClick={onNext}
                  className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2"
                  data-testid="button-continue-measure-quality"
                >
                  See My Results
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
