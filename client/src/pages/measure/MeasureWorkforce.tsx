import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import MeasureDriverCard from "@/components/measure/MeasureDriverCard";
import AddMeasureDriverPicker from "@/components/measure/AddMeasureDriverPicker";
import { EXPLORE_DRIVERS, type ExploreDriver, type ExploreSetting } from "@/lib/exploreDrivers";
import { type MeasureState, type MeasureDriverEntry } from "@/lib/measureCalculator";

interface MeasureWorkforceProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const QUADRANT = 'Workforce' as const;

export default function MeasureWorkforce({ state, updateState, onNext, onBack, onHome }: MeasureWorkforceProps) {
  const setting = ((state.careSetting || 'outpatient') as ExploreSetting);
  const tracked = state.trackedDrivers || {};

  const trackedDriverIds = Object.keys(tracked);
  const trackedHere = useMemo(() =>
    EXPLORE_DRIVERS
      .filter(d => d.quadrant === QUADRANT && d.settings.includes(setting) && trackedDriverIds.includes(d.id))
      .map(d => ({ driver: d, entry: tracked[d.id] })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracked, setting]
  );

  const updateEntry = (driverId: string, updates: Partial<MeasureDriverEntry>) => {
    updateState({
      trackedDrivers: {
        ...tracked,
        [driverId]: { ...tracked[driverId], ...updates },
      },
    });
  };

  const removeEntry = (driverId: string) => {
    const next = { ...tracked };
    delete next[driverId];
    updateState({ trackedDrivers: next });
  };

  const addDriver = (driver: ExploreDriver) => {
    const md = driver.measureDefaults;
    const entry: MeasureDriverEntry = {
      driverId: driver.id,
      withoutAbridge: 0,
      withAbridge: 0,
      valuePerUnit: md?.valuePerUnitDefault ?? 0,
      attributionPercent: 100,
      realizationPercent: md?.realizationDefault ?? 100,
      expanded: true,
    };
    updateState({
      trackedDrivers: { ...tracked, [driver.id]: entry },
    });
  };

  const quadrantTotal = useMemo(() => {
    return trackedHere.reduce((sum, { driver, entry }) => {
      if (driver.visibility !== 'quantified' || !driver.measureDefaults) return sum;
      const delta = entry.withAbridge - entry.withoutAbridge;
      const value = delta * entry.valuePerUnit * (entry.attributionPercent / 100) * (entry.realizationPercent / 100);
      return sum + value;
    }, 0);
  }, [trackedHere]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={3}
        totalSteps={7}
        stepName="Workforce"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 max-w-[700px]">
            <motion.div className="text-center mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">Workforce</h1>
              <p className="text-base text-[#888888]">What's improved for your team because of Abridge?</p>
            </motion.div>

            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">How to Use This Section</p>
              <p className="text-sm text-black leading-relaxed">
                Track the Workforce outcomes that matter for this customer. For each driver, enter the value with and without Abridge, then dial attribution and realization to reflect their reality.
              </p>
            </motion.div>

            <motion.div
              className="space-y-3 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {trackedHere.length === 0 && (
                <div className="bg-[#F5F0EB] rounded-lg p-6 text-center" data-testid="empty-state-workforce">
                  <p className="text-sm text-[#666666]">No drivers tracked yet for Workforce.</p>
                  <p className="text-xs text-[#888888] mt-1">Add the ones that matter to this customer below.</p>
                </div>
              )}
              {trackedHere.map(({ driver, entry }) => (
                <MeasureDriverCard
                  key={driver.id}
                  driver={driver}
                  entry={entry}
                  onUpdate={(updates) => updateEntry(driver.id, updates)}
                  onRemove={() => removeEntry(driver.id)}
                />
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <AddMeasureDriverPicker
                quadrant={QUADRANT}
                setting={setting}
                alreadyTracked={trackedDriverIds}
                onAdd={addDriver}
              />
            </motion.div>

            <motion.div
              className="flex justify-center mt-8 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <Button
                onClick={onNext}
                className="h-12 px-8 bg-black hover:bg-black/90 text-white font-semibold rounded-full gap-2"
                data-testid="button-continue-measure-workforce-mobile"
              >
                Continue to Revenue
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
              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Workforce Realized</p>
              <p className="text-sm text-white/50 mb-4">Quantifiable drivers, attribution-adjusted</p>

              <p className="text-3xl font-bold text-[#EA2C00]" data-testid="text-quadrant-total-workforce">{formatCurrency(quadrantTotal)}</p>
              <p className="text-xs text-white/50 mt-1">annualized impact</p>

              <div className="h-px bg-[#333333] my-5" />

              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-3">Drivers Tracked</p>
              {trackedHere.length === 0 ? (
                <p className="text-xs text-white/40 italic">None yet</p>
              ) : (
                <ul className="space-y-1.5">
                  {trackedHere.map(({ driver }) => (
                    <li key={driver.id} className="text-sm text-white/70 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EA2C00]" />
                      {driver.label}
                    </li>
                  ))}
                </ul>
              )}

              <div className="hidden lg:block mt-6">
                <Button
                  onClick={onNext}
                  className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2"
                  data-testid="button-continue-measure-workforce"
                >
                  Continue to Revenue
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
