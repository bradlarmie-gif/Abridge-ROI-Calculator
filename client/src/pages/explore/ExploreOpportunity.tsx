import { useCallback, useState } from "react";
import { ArrowRight, Users, Activity, Percent, Receipt, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState, type NursingUnitType } from "./ExploreFlow";

interface ExploreOpportunityProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

interface BusynessPreset {
  label: string;
  value: number;
}

const OUTPATIENT_BUSYNESS_PRESETS: BusynessPreset[] = [
  { label: "Lighter", value: 2000 },
  { label: "Typical", value: 3000 },
  { label: "Busy", value: 4000 },
];

const ED_BUSYNESS_PRESETS: BusynessPreset[] = [
  { label: "Lighter", value: 1400 },
  { label: "Typical", value: 1800 },
  { label: "Busy", value: 2200 },
];

const INPATIENT_BUSYNESS_PRESETS: BusynessPreset[] = [
  { label: "Lighter", value: 300 },
  { label: "Typical", value: 400 },
  { label: "Busy", value: 500 },
];

// Nursing unit type options
const NURSING_UNIT_TYPES: { id: NursingUnitType; label: string; bedsPerNurse: string }[] = [
  { id: 'med-surg', label: 'Med-Surg', bedsPerNurse: '~1.5 FTEs/bed' },
  { id: 'icu', label: 'ICU/Critical Care', bedsPerNurse: '~3 FTEs/bed' },
  { id: 'mixed', label: 'Mixed', bedsPerNurse: '~2 FTEs/bed' },
];

const UTILIZATION_PRESETS = [
  { label: "Conservative", value: 50 },
  { label: "Typical", value: 70 },
  { label: "Aggressive", value: 85 },
];

export default function ExploreOpportunity({ state, updateState, onNext, onBack, onHome }: ExploreOpportunityProps) {
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';
  const isNursing = state.careSetting === 'nursing';
  const BUSYNESS_PRESETS = isInpatient 
    ? INPATIENT_BUSYNESS_PRESETS 
    : isED 
      ? ED_BUSYNESS_PRESETS 
      : OUTPATIENT_BUSYNESS_PRESETS;
  const defaultEncountersPerProvider = isInpatient ? 400 : isED ? 1800 : 3000;
  
  const [providerInputValue, setProviderInputValue] = useState(state.numberOfProviders > 0 ? state.numberOfProviders.toString() : '');
  const [bedsInputValue, setBedsInputValue] = useState(state.nursingStaffedBeds > 0 ? state.nursingStaffedBeds.toString() : '');
  const [encountersPerProvider, setEncountersPerProvider] = useState(
    state.numberOfProviders > 0 && state.annualEncounters > 0 
      ? Math.round(state.annualEncounters / state.numberOfProviders) 
      : defaultEncountersPerProvider
  );
  const [totalEncountersInput, setTotalEncountersInput] = useState('');
  const [usingTotalInput, setUsingTotalInput] = useState(false);
  
  // Nursing-specific handlers
  const handleBedsChange = useCallback((inputVal: string) => {
    setBedsInputValue(inputVal);
    if (inputVal === '') {
      updateState({ nursingStaffedBeds: 0 });
      return;
    }
    const numValue = parseInt(inputVal, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.max(1, Math.min(2000, numValue));
      updateState({ nursingStaffedBeds: clampedValue });
    }
  }, [updateState]);
  
  const handleNursingUnitTypeChange = useCallback((unitType: NursingUnitType) => {
    updateState({ nursingUnitType: unitType });
  }, [updateState]);
  
  // Nursing calculations (per-shift model)
  const nursingTotalShiftsPerYear = state.numberOfProviders * state.nursingShiftsPerNurseYear;
  const nursingEligibleShifts = Math.round(nursingTotalShiftsPerYear * (state.utilizationPercent / 100));

  const handleProvidersChange = useCallback((inputVal: string) => {
    setProviderInputValue(inputVal);
    if (inputVal === '') {
      updateState({ numberOfProviders: 0, annualEncounters: 0 });
      return;
    }
    const numValue = parseInt(inputVal, 10);
    if (!isNaN(numValue) && numValue > 0) {
      const clampedValue = Math.max(1, Math.min(10000, numValue));
      // If using total input, recalculate per-provider based on total
      if (usingTotalInput && state.annualEncounters > 0) {
        const newPerProvider = Math.round(state.annualEncounters / clampedValue);
        setEncountersPerProvider(newPerProvider);
        updateState({ numberOfProviders: clampedValue });
      } else {
        const annualEncounters = clampedValue * encountersPerProvider;
        updateState({ 
          numberOfProviders: clampedValue,
          annualEncounters,
        });
      }
    }
  }, [updateState, encountersPerProvider, usingTotalInput, state.annualEncounters]);

  const handleProviderInputBlur = useCallback(() => {
    const numValue = parseInt(providerInputValue, 10);
    if (isNaN(numValue) || numValue < 1) {
      if (state.numberOfProviders > 0) {
        setProviderInputValue(state.numberOfProviders.toString());
      } else {
        setProviderInputValue('');
      }
    } else {
      const clampedValue = Math.max(1, Math.min(10000, numValue));
      setProviderInputValue(clampedValue.toString());
    }
  }, [providerInputValue, state.numberOfProviders]);

  const handleBusynessChange = useCallback((value: number) => {
    setEncountersPerProvider(value);
    setTotalEncountersInput('');
    setUsingTotalInput(false);
    if (state.numberOfProviders > 0) {
      const annualEncounters = state.numberOfProviders * value;
      updateState({ annualEncounters });
    }
  }, [updateState, state.numberOfProviders]);

  const handleTotalEncountersChange = useCallback((inputVal: string) => {
    setTotalEncountersInput(inputVal);
    const numValue = parseInt(inputVal.replace(/,/g, ''), 10);
    if (!isNaN(numValue) && numValue >= 1000) {
      setUsingTotalInput(true);
      updateState({ annualEncounters: numValue });
      // Update per-provider calculation for display
      if (state.numberOfProviders > 0) {
        setEncountersPerProvider(Math.round(numValue / state.numberOfProviders));
      }
    }
  }, [updateState, state.numberOfProviders]);

  const handleUtilizationChange = useCallback((value: number) => {
    updateState({ utilizationPercent: value });
  }, [updateState]);

  const handleCustomUtilizationChange = useCallback((inputVal: string) => {
    const numValue = parseInt(inputVal, 10);
    if (!isNaN(numValue) && numValue >= 10 && numValue <= 100) {
      updateState({ utilizationPercent: numValue });
    }
  }, [updateState]);

  const annualEncounters = state.numberOfProviders * encountersPerProvider;
  const eligibleEncounters = Math.round(annualEncounters * (state.utilizationPercent / 100));

  const formatNumber = (n: number) => n.toLocaleString();

  // Validation differs for nursing (needs beds + nurses) vs other settings
  const isValid = isNursing 
    ? state.numberOfProviders > 0 && state.nursingStaffedBeds > 0 && state.utilizationPercent > 0
    : state.numberOfProviders > 0 && state.utilizationPercent > 0;

  const isPresetSelected = (presetValue: number) => {
    return encountersPerProvider === presetValue && !usingTotalInput;
  };

  const isUtilizationPresetSelected = (presetValue: number) => {
    return state.utilizationPercent === presetValue;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <UnifiedHeader
        pathType="explore"
        currentStep={2}
        totalSteps={6}
        stepName="Opportunity Size"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
                Size Your Opportunity
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
                {isNursing ? "Let's understand your nursing program" : isInpatient ? "Let's understand your hospitalist program" : isED ? "Let's understand your ED" : "Let's understand your practice"}
              </h1>
              <p className="text-slate-600 mb-4">
                {isNursing
                  ? "These inputs establish the baseline for your value model. Nursing value centers on time back for patient care, retention, and compliance—reducing documentation burden so nurses can nurse."
                  : isInpatient
                    ? "These inputs establish the baseline for your value model. Inpatient value works differently—it's about retention, efficiency, and documentation quality, not seeing more patients."
                    : isED 
                      ? "These inputs establish the baseline for your value model. Every ED physician and encounter contributes to the opportunity."
                      : "These inputs establish the baseline for your value model. Every calculation downstream builds on these numbers."
                }
              </p>
            </motion.div>

            <div className="space-y-5">
              {/* NURSING-SPECIFIC: Staffed Beds (shown first for nursing) */}
              {isNursing && (
                <motion.div
                  className="bg-white rounded-2xl border border-slate-200 p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-[#EA2C00]" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-black">Staffed Beds in Scope</h2>
                        <p className="text-sm text-slate-500">This is your billing unit for Abridge Nursing</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={bedsInputValue}
                        onChange={(e) => handleBedsChange(e.target.value)}
                        className="w-28 py-3 px-4 text-right text-2xl font-bold text-[#EA2C00] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#EA2C00] focus:bg-white focus:ring-2 focus:ring-[#EA2C00]/10 transition-all placeholder:text-slate-300"
                        data-testid="input-beds"
                      />
                      <span className="text-sm text-slate-500">beds</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Number of Providers/Nurses */}
              <motion.div
                className="bg-white rounded-2xl border border-slate-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isNursing ? 0.15 : 0.1, duration: 0.5 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#EA2C00]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-black">{isNursing ? "Nurse FTEs" : isInpatient ? "Hospitalists" : isED ? "ED Physicians" : "Number of Providers"}</h2>
                      <p className="text-sm text-slate-500">
                        {isNursing 
                          ? "How many nurse FTEs support these beds?" 
                          : isInpatient 
                            ? "Hospitalists using Abridge" 
                            : isED 
                              ? "Physicians using Abridge in the ED" 
                              : "Clinicians using Abridge"}
                      </p>
                      {isNursing && state.nursingStaffedBeds > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          ~1.5 FTEs per bed is typical for med-surg, higher for ICU
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={providerInputValue}
                      onChange={(e) => handleProvidersChange(e.target.value)}
                      onBlur={handleProviderInputBlur}
                      className="w-28 py-3 px-4 text-right text-2xl font-bold text-[#EA2C00] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#EA2C00] focus:bg-white focus:ring-2 focus:ring-[#EA2C00]/10 transition-all placeholder:text-slate-300"
                      data-testid="input-providers"
                    />
                    {isNursing && <span className="text-sm text-slate-500">FTEs</span>}
                  </div>
                </div>
              </motion.div>

              {/* NURSING-SPECIFIC: Unit Type */}
              {isNursing && (
                <motion.div
                  className="bg-white rounded-2xl border border-slate-200 p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                      <Activity className="w-6 h-6 text-[#EA2C00]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-black">What type of unit(s)?</h2>
                      <p className="text-sm text-slate-500">This helps set appropriate expectations</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {NURSING_UNIT_TYPES.map((unit) => {
                      const isSelected = state.nursingUnitType === unit.id;
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => handleNursingUnitTypeChange(unit.id)}
                          className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                            isSelected
                              ? 'bg-[#EA2C00] text-white shadow-sm'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                          data-testid={`unit-type-${unit.id}`}
                        >
                          <span className="block font-semibold">{unit.label}</span>
                          <span className={`block text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                            {unit.bedsPerNurse}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* NON-NURSING: Annual Encounters */}
              {!isNursing && (
              <motion.div
                className="bg-white rounded-2xl border border-slate-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-black">{isInpatient ? "Annual Admissions" : "Annual Encounters"}</h2>
                    <p className="text-sm text-slate-500">{isInpatient ? "How many patients does your program admit?" : "How busy is your practice?"}</p>
                  </div>
                </div>

                {/* Preset buttons - quick select by clinic type */}
                <div className="flex items-center gap-3 mb-4">
                  {BUSYNESS_PRESETS.map((preset) => {
                    const isSelected = isPresetSelected(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleBusynessChange(preset.value)}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#EA2C00] text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                        data-testid={`preset-busyness-${preset.label.toLowerCase()}`}
                      >
                        <span className="block font-semibold">{preset.label}</span>
                        <span className={`block text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {preset.value.toLocaleString()}/{isInpatient ? 'hospitalist' : 'provider'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                {/* Help text for encounter estimates */}
                {!isInpatient && !isED && (
                  <p className="text-xs text-slate-400 mt-2">
                    Based on ~220 working days per year. Typical represents blended primary care and specialty outpatient practices.
                  </p>
                )}

                {/* Total encounters input */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 font-medium">{isInpatient ? "Or enter your total annual admissions" : "Or enter your total practice volume"}</p>
                      <p className="text-xs text-slate-400">{isInpatient ? "Total admissions your hospitalist program handles" : "Total encounters your practice sees per year"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={annualEncounters > 0 ? annualEncounters.toLocaleString() : "e.g. 180,000"}
                        value={totalEncountersInput}
                        onChange={(e) => handleTotalEncountersChange(e.target.value)}
                        className="w-32 py-2 px-3 text-right font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA2C00] transition-all placeholder:text-slate-300"
                        data-testid="input-total-encounters"
                      />
                      <span className="text-sm text-slate-400">/yr</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              )}

              {/* Expected Utilization */}
              <motion.div
                className="bg-white rounded-2xl border border-slate-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isNursing ? 0.25 : 0.2, duration: 0.5 }}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                    <Percent className="w-6 h-6 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-black">Expected Utilization</h2>
                    <p className="text-sm text-slate-500">
                      {isNursing ? "Percentage of shifts using Abridge" : "Percentage of encounters using Abridge"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-4 ml-16">
                  {isNursing 
                    ? "Utilization often starts at 50-60% and grows to 75-85% as workflows mature. Start conservatively."
                    : "Utilization often starts at 50-60% and grows to 75-85% as workflows mature. Start conservatively—you can always adjust."
                  }
                </p>

                {/* Preset buttons */}
                <div className="flex items-center gap-3 mb-4">
                  {UTILIZATION_PRESETS.map((preset) => {
                    const isSelected = isUtilizationPresetSelected(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleUtilizationChange(preset.value)}
                        className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#EA2C00] text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                        data-testid={`preset-utilization-${preset.label.toLowerCase()}`}
                      >
                        <span className="block font-semibold">{preset.label}</span>
                        <span className={`block text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                          {preset.value}%
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom input */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400">or enter custom:</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={100}
                    value={state.utilizationPercent}
                    onChange={(e) => handleCustomUtilizationChange(e.target.value)}
                    className="w-20 py-2 px-3 text-center font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA2C00] transition-all"
                    data-testid="input-utilization"
                  />
                  <span className="text-slate-400">%</span>
                </div>
              </motion.div>

              {/* Continue Button - Mobile */}
              <motion.div 
                className="lg:hidden pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Button
                  onClick={onNext}
                  disabled={!isValid}
                  className={`
                    w-full h-12 font-semibold rounded-full transition-all duration-200
                    ${isValid 
                      ? 'bg-black hover:bg-black/90 text-white' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }
                  `}
                  data-testid="button-continue-mobile"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Live Receipt Sidebar - Larger */}
          <motion.div
            className="hidden lg:block lg:w-80"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className="sticky top-24">
              <div className="bg-black rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Your Baseline</h3>
                      <p className="text-xs text-white/50">Practice summary</p>
                    </div>
                  </div>
                </div>

                {/* Content - Different for Nursing vs Others */}
                {isNursing ? (
                  <div className="px-6 py-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/50">Staffed Beds</span>
                      <span className="text-base font-semibold text-white">
                        {state.nursingStaffedBeds > 0 ? formatNumber(state.nursingStaffedBeds) : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/50">Nurse FTEs</span>
                      <span className="text-base font-semibold text-white">
                        {state.numberOfProviders > 0 ? formatNumber(state.numberOfProviders) : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/50">Shifts per nurse/year</span>
                      <span className="text-base font-semibold text-white">
                        {state.nursingShiftsPerNurseYear}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                      <span className="text-sm text-white/50">Total shifts/year</span>
                      <span className="text-base font-semibold text-white">
                        {state.numberOfProviders > 0 ? formatNumber(nursingTotalShiftsPerYear) : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/50">Utilization</span>
                      <span className="text-base font-semibold text-white">
                        {state.utilizationPercent}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/50">{isInpatient ? 'Hospitalists' : isED ? 'ED Physicians' : 'Providers'}</span>
                      <span className="text-base font-semibold text-white">
                        {state.numberOfProviders > 0 ? formatNumber(state.numberOfProviders) : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/50">{isInpatient ? 'Admissions/Hospitalist' : 'Encounters/Provider'}</span>
                      <span className="text-base font-semibold text-white">
                        {formatNumber(encountersPerProvider)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                      <span className="text-sm text-white/50">{isInpatient ? 'Annual Admissions' : 'Annual Encounters'}</span>
                      <span className="text-base font-semibold text-white">
                        {state.numberOfProviders > 0 ? formatNumber(annualEncounters) : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/50">Utilization</span>
                      <span className="text-base font-semibold text-white">
                        {state.utilizationPercent}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Eligible Encounters/Shifts - Highlighted */}
                <div className="px-6 py-5 border-t border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-white/70">
                      {isNursing ? 'Eligible Shifts' : isInpatient ? 'Eligible Admissions' : 'Eligible Encounters'}
                    </span>
                    <span className="text-2xl font-bold text-[#F07B5F]">
                      {isNursing 
                        ? (state.numberOfProviders > 0 ? formatNumber(nursingEligibleShifts) : '—')
                        : (state.numberOfProviders > 0 ? formatNumber(eligibleEncounters) : '—')
                      }
                    </span>
                  </div>
                  <p className="text-xs text-white/30">
                    {isNursing 
                      ? "This is your value multiplier—every calculation uses this number"
                      : "This is your value multiplier—every driver calculation uses this number"
                    }
                  </p>
                </div>

                {/* Continue Button */}
                <div className="px-6 pb-6">
                  <Button
                    onClick={onNext}
                    disabled={!isValid}
                    className={`
                      w-full h-12 text-sm font-semibold rounded-full transition-all duration-200
                      ${isValid 
                        ? 'bg-white hover:bg-white/90 text-black' 
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                      }
                    `}
                    data-testid="button-continue"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
