import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EXPLORE_DRIVERS, makeCustomDriver, type ExploreQuadrant, type ExploreSetting, type ExploreDriver, type CustomDriverDef } from "@/lib/exploreDrivers";

const PHASE_LABEL: Record<string, string> = {
  emerging: 'Emerging',
  demonstrated: 'Demonstrated',
  strategic: 'Strategic',
};

const PHASE_COLOR: Record<string, string> = {
  emerging: 'bg-amber-50 text-amber-700',
  demonstrated: 'bg-blue-50 text-blue-700',
  strategic: 'bg-purple-50 text-purple-700',
};

interface AddMeasureDriverPickerProps {
  quadrant: ExploreQuadrant;
  settings: ExploreSetting[];
  alreadyTracked: string[];
  onAdd: (driver: ExploreDriver) => void;
  onAddCustomDef: (def: CustomDriverDef) => void;
}

const SETTING_BADGE: Record<ExploreSetting, string> = {
  outpatient: 'OP',
  ed: 'ED',
  inpatient: 'IP',
  nursing: 'Nsg',
};

export default function AddMeasureDriverPicker({ quadrant, settings, alreadyTracked, onAdd, onAddCustomDef }: AddMeasureDriverPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customHasValue, setCustomHasValue] = useState(false);

  const inScope = EXPLORE_DRIVERS.filter(d =>
    d.quadrant === quadrant && d.settings.some(s => settings.includes(s))
  );
  const inScopeTrackedCount = inScope.filter(d => alreadyTracked.includes(d.id) && !d.comingSoon).length;
  const available = inScope
    .filter(d =>
      !alreadyTracked.includes(d.id) &&
      (search === '' || d.label.toLowerCase().includes(search.toLowerCase()) || d.shortDescription.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleAdd = (driver: ExploreDriver) => {
    onAdd(driver);
    setOpen(false);
    setSearch('');
  };

  const handleAddCustom = () => {
    if (!customLabel.trim()) return;
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const def: CustomDriverDef = {
      id,
      label: customLabel.trim(),
      description: customDesc.trim(),
      quadrant,
      settings,
      hasValue: customHasValue,
    };
    onAddCustomDef(def);
    onAdd(makeCustomDriver(def));
    setShowCustomForm(false);
    setCustomLabel('');
    setCustomDesc('');
    setCustomHasValue(false);
    setOpen(false);
    setSearch('');
  };

  const resetCustomForm = () => {
    setShowCustomForm(false);
    setCustomLabel('');
    setCustomDesc('');
    setCustomHasValue(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border-2 border-dashed border-[#E5E5E5] text-sm font-medium text-[#666666] hover:border-[#EA2C00] hover:text-[#EA2C00] transition-all w-full justify-center"
        data-testid={`button-add-driver-${quadrant.toLowerCase()}`}
      >
        <Plus className="w-4 h-4" /> Add a driver to track
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setOpen(false); resetCustomForm(); }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest">{quadrant}</p>
                  <h3 className="text-lg font-bold text-black mt-0.5">Add a driver to track</h3>
                </div>
                <button
                  onClick={() => { setOpen(false); resetCustomForm(); }}
                  className="p-2 hover:bg-[#F5F0EB] rounded-lg"
                  data-testid="button-close-driver-picker"
                >
                  <X className="w-5 h-5 text-[#888888]" />
                </button>
              </div>

              <div className="p-4 border-b border-[#E5E5E5]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                  <input
                    type="text"
                    placeholder="Search drivers…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-[#F5F0EB] border border-transparent rounded-lg text-sm focus:bg-white focus:border-[#EA2C00] outline-none"
                    data-testid="input-driver-search"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-3 space-y-1">
                  {available.length === 0 && !showCustomForm && (
                    <p className="text-sm text-[#888888] text-center py-6 italic">
                      {inScope.length === 0
                        ? 'No drivers available for this care setting.'
                        : inScopeTrackedCount === inScope.filter(d => !d.comingSoon).length
                          ? 'All drivers in this quadrant are already tracked.'
                          : 'No drivers match your search.'}
                    </p>
                  )}
                  {available.map(driver => {
                    const isQuantifiable = driver.visibility === 'quantified' && Boolean(driver.measureDefaults);
                    const isComingSoon = Boolean(driver.comingSoon);
                    const prereqLabels = driver.prerequisites?.map(pid => {
                      const d = EXPLORE_DRIVERS.find(x => x.id === pid);
                      return d?.label ?? pid;
                    });
                    return (
                      <button
                        key={driver.id}
                        onClick={() => !isComingSoon && handleAdd(driver)}
                        disabled={isComingSoon}
                        className={`w-full p-3 text-left rounded-lg transition-colors flex items-start gap-3 ${
                          isComingSoon
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-[#F5F0EB]'
                        }`}
                        data-testid={`add-driver-${driver.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-semibold ${isComingSoon ? 'text-[#888888]' : 'text-black'}`}>{driver.label}</p>
                            {isQuantifiable && !isComingSoon && (
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F5F0EB] text-[10px] font-semibold text-[#888888]"
                                title="Quantifiable — carries dollar value"
                              >
                                $
                              </span>
                            )}
                            {driver.measurePhase && !isComingSoon && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${PHASE_COLOR[driver.measurePhase]}`}>
                                {PHASE_LABEL[driver.measurePhase]}
                              </span>
                            )}
                            {settings.length > 1 && driver.settings.map(s => (
                              settings.includes(s) ? (
                                <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F5F0EB] text-[10px] font-semibold text-[#888888] uppercase tracking-wide">
                                  {SETTING_BADGE[s]}
                                </span>
                              ) : null
                            ))}
                            {isComingSoon && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[10px] font-semibold text-[#AAAAAA] uppercase tracking-wide">
                                Coming soon
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#888888] mt-0.5">{driver.shortDescription}</p>
                          {prereqLabels && prereqLabels.length > 0 && (
                            <p className="text-[10px] text-[#AAAAAA] mt-1 italic">
                              Builds on: {prereqLabels.join(', ')}
                            </p>
                          )}
                        </div>
                        {!isComingSoon && <Plus className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-1" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom driver section */}
                <div className="border-t border-[#F0ECE7] mx-4 pt-3 pb-4">
                  <AnimatePresence mode="wait">
                    {!showCustomForm ? (
                      <motion.button
                        key="trigger"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCustomForm(true)}
                        className="w-full text-left px-2 py-1.5 text-xs text-[#BBBBBB] hover:text-[#888888] flex items-center gap-2 transition-colors rounded-lg hover:bg-[#FAFAF8]"
                      >
                        <Plus className="w-3 h-3 flex-shrink-0" />
                        Don&apos;t see what you need? Add a custom driver
                      </motion.button>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="bg-[#FAFAF8] rounded-xl p-4 space-y-3 border border-[#F0ECE7]"
                      >
                        <p className="text-[10px] font-bold text-[#AAAAAA] uppercase tracking-[2px]">Custom driver</p>

                        <div>
                          <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide mb-1 block">Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Documentation turnaround time"
                            value={customLabel}
                            onChange={(e) => setCustomLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && customLabel.trim() && handleAddCustom()}
                            autoFocus
                            className="w-full h-9 px-3 bg-white border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:border-[#EA2C00] text-black"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide mb-1 block">
                            Description <span className="text-[#CCCCCC] normal-case font-normal tracking-normal">optional</span>
                          </label>
                          <input
                            type="text"
                            placeholder="What does this measure?"
                            value={customDesc}
                            onChange={(e) => setCustomDesc(e.target.value)}
                            className="w-full h-9 px-3 bg-white border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:border-[#EA2C00] text-black"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide mb-2 block">Type</label>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setCustomHasValue(false)}
                              className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all ${
                                !customHasValue
                                  ? 'bg-[#1A1A1A] text-white'
                                  : 'bg-white border border-[#E5E5E5] text-[#888888] hover:border-[#AAAAAA]'
                              }`}
                            >
                              Signal
                            </button>
                            <button
                              onClick={() => setCustomHasValue(true)}
                              className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all ${
                                customHasValue
                                  ? 'bg-[#1A1A1A] text-white'
                                  : 'bg-white border border-[#E5E5E5] text-[#888888] hover:border-[#AAAAAA]'
                              }`}
                            >
                              Financial
                            </button>
                          </div>
                          <p className="text-[10px] text-[#AAAAAA] mt-1.5 leading-relaxed">
                            {customHasValue
                              ? "You've documented a dollar value for this outcome."
                              : "Qualitative signal — no dollar calculation."}
                          </p>
                        </div>

                        <div className="flex gap-2 pt-0.5">
                          <button
                            onClick={resetCustomForm}
                            className="flex-1 h-8 rounded-lg text-xs font-medium text-[#888888] hover:text-[#444444] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddCustom}
                            disabled={!customLabel.trim()}
                            className="flex-1 h-8 bg-[#EA2C00] text-white rounded-lg text-xs font-semibold disabled:opacity-30 hover:bg-[#EA2C00]/90 transition-all"
                          >
                            Add driver
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
