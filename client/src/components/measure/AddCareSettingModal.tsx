import { useState, useMemo, useEffect } from "react";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreSetting } from "@/lib/exploreDrivers";
import {
  computeAddedSettingValue,
  SETTING_LABELS,
  type ForecastScenarioLevel,
} from "@/lib/forecastDefaults";
import type { ForecastAddedSetting } from "@/lib/measureCalculator";

interface AddCareSettingModalProps {
  open: boolean;
  excludeSettings: ExploreSetting[];
  onClose: () => void;
  onAdd: (added: ForecastAddedSetting) => void;
}

const SCENARIO_OPTIONS: Array<{ key: ForecastScenarioLevel; label: string; description: string }> = [
  { key: 'conservative', label: 'Conservative', description: 'Modest expansion outcomes' },
  { key: 'typical', label: 'Typical', description: 'Based on observed customer data' },
  { key: 'optimistic', label: 'Optimistic', description: 'Strong adoption + change management' },
];

export default function AddCareSettingModal({ open, excludeSettings, onClose, onAdd }: AddCareSettingModalProps) {
  const allSettings: ExploreSetting[] = ['outpatient', 'ed', 'inpatient', 'nursing'];
  const available = allSettings.filter(s => !excludeSettings.includes(s));

  const [setting, setSetting] = useState<ExploreSetting>(available[0] ?? 'outpatient');

  // Reconcile selected setting whenever the available list changes (e.g. modal
  // reopened after one was added). Without this, `setting` could still point to
  // an excluded value and a save would create a duplicate.
  useEffect(() => {
    if (!open) return;
    if (available.length === 0) return;
    if (!available.includes(setting)) {
      setSetting(available[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, available.join(',')]);

  const [providers, setProviders] = useState(0);
  const [utilizationPercent, setUtilizationPercent] = useState(70);
  const [encounters, setEncounters] = useState(0);
  const [staffedBeds, setStaffedBeds] = useState(0);
  const [occupancyPercent, setOccupancyPercent] = useState(85);
  const [scenario, setScenario] = useState<ForecastScenarioLevel>('typical');

  const isNursing = setting === 'nursing';

  const livePreview = useMemo(() => {
    return computeAddedSettingValue({ setting, providers, utilizationPercent, scenario });
  }, [setting, providers, utilizationPercent, scenario]);

  const isValid = providers > 0 && utilizationPercent > 0;

  const handleSave = () => {
    if (!isValid) return;
    // Defensive guard: never save a setting that isn't in the available list
    // (e.g. if exclusion changed underneath us before reconcile ran).
    if (!available.includes(setting)) return;
    const added: ForecastAddedSetting = {
      id: `added-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      setting,
      providers,
      utilizationPercent,
      encounters: isNursing ? 0 : encounters,
      staffedBeds: isNursing ? staffedBeds : 0,
      occupancyPercent: isNursing ? occupancyPercent : 0,
      scenario,
    };
    onAdd(added);
    setProviders(0);
    setEncounters(0);
    setStaffedBeds(0);
    onClose();
  };

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          data-testid="add-care-setting-modal"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest">Forecast</p>
                <h3 className="text-lg font-bold text-black mt-0.5">Add a care setting</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[#F5F0EB] rounded-lg" data-testid="modal-close">
                <X className="w-5 h-5 text-[#888888]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {available.length === 0 && (
                <p className="text-sm text-[#888888] italic text-center py-8" data-testid="text-all-settings-modeled">
                  All four care settings are already modeled.
                </p>
              )}

              {available.length > 0 && (
                <>
                  <div>
                    <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-2 block">Care setting</label>
                    <div className="grid grid-cols-2 gap-2">
                      {available.map(s => (
                        <button
                          key={s}
                          onClick={() => setSetting(s)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            setting === s ? 'border-[#EA2C00] bg-white' : 'border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]'
                          }`}
                          data-testid={`setting-option-${s}`}
                        >
                          <p className="font-semibold text-black text-sm">{SETTING_LABELS[s]}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1.5 block">
                        {isNursing ? 'Nurse FTEs' : 'Providers'}
                      </label>
                      <FormattedNumberInput value={providers} onChange={setProviders} className="h-11 bg-white" data-testid="input-modal-providers" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1.5 block">Utilization</label>
                      <div className="relative">
                        <FormattedNumberInput value={utilizationPercent} onChange={setUtilizationPercent} className="h-11 bg-white pr-8" data-testid="input-modal-utilization" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                      </div>
                    </div>
                  </div>

                  {!isNursing && (
                    <div>
                      <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1.5 block">Annual encounters</label>
                      <FormattedNumberInput value={encounters} onChange={setEncounters} className="h-11 bg-white" data-testid="input-modal-encounters" />
                      <p className="text-xs text-[#888888] mt-1">Optional context, used in 3G pricing comparison.</p>
                    </div>
                  )}

                  {isNursing && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1.5 block">Staffed beds</label>
                        <FormattedNumberInput value={staffedBeds} onChange={setStaffedBeds} className="h-11 bg-white" data-testid="input-modal-beds" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1.5 block">Occupancy</label>
                        <div className="relative">
                          <FormattedNumberInput value={occupancyPercent} onChange={setOccupancyPercent} className="h-11 bg-white pr-8" data-testid="input-modal-occupancy" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-2 block">Scenario</label>
                    <div className="space-y-2">
                      {SCENARIO_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setScenario(opt.key)}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                            scenario === opt.key ? 'border-[#EA2C00] bg-white' : 'border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]'
                          }`}
                          data-testid={`scenario-option-${opt.key}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-black text-sm">{opt.label}</p>
                              <p className="text-xs text-[#888888]">{opt.description}</p>
                            </div>
                            {scenario === opt.key && <Check className="w-4 h-4 text-[#EA2C00]" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#1A1A1A] rounded-lg p-4">
                    <p className="text-xs font-medium text-white/70 uppercase tracking-[1.5px] mb-1">Estimated annual value</p>
                    <p className="text-3xl font-bold text-[#EA2C00]" data-testid="text-modal-live-preview">
                      {providers > 0 ? formatCurrency(livePreview) : '—'}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      {providers > 0
                        ? `${providers} ${isNursing ? 'nurse FTEs' : 'providers'} × ${SETTING_LABELS[setting]} ${scenario} estimate × utilization adjustment`
                        : 'Enter scale to see estimate'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {available.length > 0 && (
              <div className="p-5 border-t border-[#E5E5E5] flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-[#666666] hover:text-black transition-colors"
                  data-testid="button-modal-cancel"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleSave}
                  disabled={!isValid}
                  className={`h-10 px-5 font-semibold rounded-full text-sm ${
                    isValid ? 'bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white' : 'bg-[#E0E0E0] text-[#999999] cursor-not-allowed'
                  }`}
                  data-testid="button-add-care-setting-save"
                >
                  Add care setting
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
