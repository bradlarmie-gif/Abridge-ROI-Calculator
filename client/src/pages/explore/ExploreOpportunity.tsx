import { useCallback, useState } from "react";
import { ArrowRight, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState } from "./ExploreFlow";

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

const UTILIZATION_PRESETS = [
  { label: "Conservative", value: 50 },
  { label: "Typical", value: 70 },
  { label: "Optimistic", value: 85 },
];

const NURSING_UTILIZATION_PRESETS = [
  { label: "Conservative", value: 40 },
  { label: "Typical", value: 50 },
  { label: "Optimistic", value: 60 },
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
  
  const [encountersPerProvider, setEncountersPerProvider] = useState(
    state.encountersPerProvider > 0
      ? state.encountersPerProvider
      : state.numberOfProviders > 0 && state.annualEncounters > 0 
        ? Math.round(state.annualEncounters / state.numberOfProviders) 
        : 0
  );
  const [totalEncountersInput, setTotalEncountersInput] = useState(state.annualEncounters > 0 ? state.annualEncounters : 0);
  const [usingTotalInput, setUsingTotalInput] = useState(false);

  const handleProvidersChange = useCallback((numValue: number) => {
    if (numValue > 0) {
      const clampedValue = Math.max(1, Math.min(10000, numValue));
      if (usingTotalInput && state.annualEncounters > 0) {
        const newPerProvider = Math.round(state.annualEncounters / clampedValue);
        setEncountersPerProvider(newPerProvider);
        updateState({ numberOfProviders: clampedValue, encountersPerProvider: newPerProvider });
      } else {
        const annualEncounters = clampedValue * encountersPerProvider;
        updateState({ 
          numberOfProviders: clampedValue,
          annualEncounters,
          encountersPerProvider,
        });
      }
    } else {
      updateState({ numberOfProviders: 0, annualEncounters: 0, encountersPerProvider: 0 });
    }
  }, [updateState, encountersPerProvider, usingTotalInput, state.annualEncounters]);

  const handleBedsChange = useCallback((numValue: number) => {
    if (numValue > 0) {
      const clampedValue = Math.max(1, Math.min(2000, numValue));
      updateState({ nursingStaffedBeds: clampedValue });
    } else {
      updateState({ nursingStaffedBeds: 0 });
    }
  }, [updateState]);

  const handleBusynessChange = useCallback((value: number) => {
    setEncountersPerProvider(value);
    setTotalEncountersInput(0);
    setUsingTotalInput(false);
    if (state.numberOfProviders > 0) {
      const annualEncounters = state.numberOfProviders * value;
      updateState({ annualEncounters, encountersPerProvider: value });
    } else {
      updateState({ encountersPerProvider: value });
    }
  }, [updateState, state.numberOfProviders]);

  const handleTotalEncountersChange = useCallback((numValue: number) => {
    setTotalEncountersInput(numValue);
    if (numValue >= 1000) {
      setUsingTotalInput(true);
      const newPerProvider = state.numberOfProviders > 0 ? Math.round(numValue / state.numberOfProviders) : 0;
      setEncountersPerProvider(newPerProvider);
      updateState({ annualEncounters: numValue, encountersPerProvider: newPerProvider });
    }
  }, [updateState, state.numberOfProviders]);

  const handleUtilizationChange = useCallback((value: number) => {
    updateState({ utilizationPercent: value });
  }, [updateState]);

  const handleOccupancyChange = useCallback((value: number) => {
    updateState({ nursingOccupancyRate: Math.max(50, Math.min(100, value)) });
  }, [updateState]);

  const annualEncounters = usingTotalInput && state.annualEncounters > 0 
    ? state.annualEncounters 
    : state.numberOfProviders * encountersPerProvider;
  const eligibleEncounters = Math.round(annualEncounters * (state.utilizationPercent / 100));
  const nursingTotalShiftsPerYear = state.numberOfProviders * state.nursingShiftsPerNurseYear;
  const nursingEligibleShifts = Math.round(nursingTotalShiftsPerYear * (state.utilizationPercent / 100));

  const formatNumber = (n: number) => n.toLocaleString();

  const isValid = isNursing 
    ? state.numberOfProviders > 0 && state.nursingStaffedBeds > 0 && state.utilizationPercent > 0
    : state.numberOfProviders > 0 && state.utilizationPercent > 0;

  const isPresetSelected = (presetValue: number) => encountersPerProvider === presetValue && !usingTotalInput;
  const isUtilizationPresetSelected = (presetValue: number) => state.utilizationPercent === presetValue;

  const pageTitle = isNursing ? "Your Nursing Program" : isInpatient ? "Your Hospitalist Program" : isED ? "Your Emergency Department" : "Your Practice";
  const providerLabel = isNursing ? "Nurse FTEs" : isInpatient ? "Hospitalists" : isED ? "ED Physicians" : "Number of Providers";
  const encounterLabel = isInpatient ? "Admissions" : "Encounters";

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={2}
        totalSteps={7}
        stepName="Opportunity Size"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content - Left Column */}
          <div className="flex-1 max-w-[700px]">
            {/* Header */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
                {pageTitle}
              </h1>
              <p className="text-base text-[#888888]">
                {isNursing ? "Tell us about your deployment and expected adoption." : "Tell us about your starting point."}
              </p>
            </motion.div>

            {/* Single Data Entry Card - Measure Style */}
            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 space-y-8 sm:space-y-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Section 1: Deployment Size */}
              <div>
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                  DEPLOYMENT SIZE
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />
                
                <div className={`grid ${isNursing ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  {isNursing && (
                    <div className="space-y-2.5">
                      <label className="text-sm font-medium text-black">Staffed Beds</label>
                      <FormattedNumberInput 
                        value={state.nursingStaffedBeds} 
                        onChange={handleBedsChange} 
                        placeholder="e.g., 200"
                        className="h-12 bg-white border-[#E5E5E5]" 
                        data-testid="input-beds" 
                      />
                      <p className="text-xs text-[#888888]">Licensed beds with active nursing staff</p>
                    </div>
                  )}
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-black">{providerLabel}</label>
                    <FormattedNumberInput 
                      value={state.numberOfProviders} 
                      onChange={handleProvidersChange} 
                      placeholder={isNursing ? "e.g., 300" : "e.g., 50"}
                      className="h-12 bg-white border-[#E5E5E5]" 
                      data-testid="input-providers" 
                    />
                    {isNursing && (
                      <p className="text-xs text-[#888888]">Full-time equivalent nurses in scope for Abridge</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Encounter Volume (Non-Nursing) */}
              {!isNursing && (
                <div>
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                    {encounterLabel.toUpperCase()} VOLUME
                  </p>
                  <div className="h-px bg-[#D1D5DB] mb-6" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Segmented Control for Busyness */}
                    <div className="space-y-2.5">
                      <label className="text-sm font-medium text-black">{encounterLabel} per Provider</label>
                      <div className="grid grid-cols-3 gap-2">
                        {BUSYNESS_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => handleBusynessChange(preset.value)}
                            className={`py-3 px-2 rounded-lg border-2 text-center transition-all ${
                              isPresetSelected(preset.value)
                                ? 'border-[#EA2C00] bg-white'
                                : 'border-transparent bg-white hover:border-[#D1D5DB]'
                            }`}
                            data-testid={`preset-busyness-${preset.label.toLowerCase()}`}
                          >
                            <span className="block text-xs font-semibold text-black">{preset.label}</span>
                            <span className="block text-xs text-[#888888]">
                              {preset.value.toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Or Total Volume */}
                    <div className="space-y-2.5">
                      <label className="text-sm font-medium text-black">
                        <span className="text-[#888888]">OR</span> Total Practice Volume
                      </label>
                      <div className="relative">
                        <FormattedNumberInput 
                          value={totalEncountersInput} 
                          onChange={handleTotalEncountersChange} 
                          placeholder="e.g., 150,000"
                          className="h-12 bg-white border-[#E5E5E5] pr-12" 
                          data-testid="input-total-encounters" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">/year</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#888888] mt-3">
                    {isED
                      ? "Based on ~220 working days. Typical reflects blended community ED."
                      : isInpatient
                        ? "Annual admissions per hospitalist."
                        : "Based on ~220 working days per year."
                    }
                  </p>
                </div>
              )}

              {/* Section 2 (Nursing): Occupancy */}
              {isNursing && (
                <div>
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                    BED OCCUPANCY
                  </p>
                  <div className="h-px bg-[#D1D5DB] mb-6" />
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={50}
                        max={100}
                        value={state.nursingOccupancyRate}
                        onChange={(e) => handleOccupancyChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-[#E5E5E5] rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                        data-testid="slider-occupancy-rate"
                      />
                      <div className="flex items-center gap-1 bg-white rounded-lg px-3 py-2 border border-[#E5E5E5]">
                        <span className="text-lg font-bold text-[#EA2C00]">{state.nursingOccupancyRate}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#888888]">
                      Most hospitals run 75-90% occupancy
                    </p>
                  </div>
                </div>
              )}

              {/* Section 3 (Nursing): Patient Days Calculated Field */}
              {isNursing && state.nursingStaffedBeds > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                    PATIENT DAYS PER YEAR
                  </p>
                  <div className="h-px bg-[#D1D5DB] mb-6" />
                  
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-patient-days">
                        {Math.round(state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365).toLocaleString()}
                      </span>
                      <span className="text-sm text-[#888888] flex-shrink-0">patient days/year</span>
                    </div>
                    <div className="text-xs text-[#888888] space-y-1">
                      <div className="flex justify-between gap-2">
                        <span>Staffed Beds</span>
                        <span className="font-medium text-black">{state.nursingStaffedBeds}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>× Days per Year</span>
                        <span className="font-medium text-black">365</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>× Occupancy Rate</span>
                        <span className="font-medium text-black">{state.nursingOccupancyRate}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#888888] mt-4 italic">
                      This becomes the denominator for HAC rates and other quality metrics.
                    </p>
                  </div>
                </div>
              )}

              {/* Section 3: Expected Utilization / Adoption */}
              <div>
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                  {isNursing ? "EXPECTED ADOPTION" : "EXPECTED UTILIZATION"}
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                {isNursing && (
                  <p className="text-sm text-[#888888] mb-4">
                    What percentage of nurses will actively use Abridge?
                  </p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Segmented Control for Utilization */}
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-black">{isNursing ? "Adoption Rate" : "Utilization Rate"}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(isNursing ? NURSING_UTILIZATION_PRESETS : UTILIZATION_PRESETS).map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => handleUtilizationChange(preset.value)}
                          className={`py-3 px-2 rounded-lg border-2 text-center transition-all ${
                            isUtilizationPresetSelected(preset.value)
                              ? 'border-[#EA2C00] bg-white'
                              : 'border-transparent bg-white hover:border-[#D1D5DB]'
                          }`}
                          data-testid={`preset-utilization-${preset.label.toLowerCase()}`}
                        >
                          <span className="block text-xs font-semibold text-black">{preset.label}</span>
                          <span className="block text-xs text-[#888888]">
                            {preset.value}%
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Or custom value */}
                  <div className="space-y-2.5">
                    <label className="text-sm font-medium text-black">
                      <span className="text-[#888888]">OR</span> enter custom
                    </label>
                    <div className="relative">
                      <FormattedNumberInput 
                        value={state.utilizationPercent} 
                        onChange={handleUtilizationChange} 
                        placeholder="e.g., 75"
                        className="h-12 bg-white border-[#E5E5E5] pr-8" 
                        data-testid="input-utilization" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">%</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#888888]">
                  {isNursing
                    ? "Adoption reflects the percentage of nurses consistently using Abridge for supported documentation. Most implementations reach 40-60% within 6 months."
                    : "Utilization typically starts at 50-60% and grows to 75-85%."
                  }
                </p>
              </div>
            </motion.div>

            {/* Continue Button - Mobile */}
            <motion.div 
              className="lg:hidden pt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={onNext}
                disabled={!isValid}
                className={`w-full h-12 font-semibold rounded-full transition-all ${
                  isValid 
                    ? 'bg-black hover:bg-black/90 text-white' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                data-testid="button-continue-mobile"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>

          {/* Right Panel - Sidebar */}
          <motion.div
            className="w-full lg:w-80"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="lg:sticky lg:top-24">
              <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Your Baseline</h3>
                      <p className="text-xs text-white/50">{isNursing ? "Deployment summary" : "Practice summary"}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-3">
                  {isNursing ? (
                    <>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm text-white/50 min-w-0 truncate">Staffed Beds</span>
                        <span className="text-base font-semibold text-white flex-shrink-0">
                          {state.nursingStaffedBeds > 0 ? formatNumber(state.nursingStaffedBeds) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm text-white/50 min-w-0 truncate">Nurse FTEs</span>
                        <span className="text-base font-semibold text-white flex-shrink-0">
                          {state.numberOfProviders > 0 ? formatNumber(state.numberOfProviders) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm text-white/50 min-w-0 truncate">Occupancy Rate</span>
                        <span className="text-base font-semibold text-white flex-shrink-0">{state.nursingOccupancyRate}%</span>
                      </div>
                      <div className="flex justify-between items-center gap-2 pt-3 border-t border-white/10">
                        <span className="text-sm text-white/50 min-w-0 truncate">Patient Days/Year</span>
                        <span className="text-base font-semibold text-white flex-shrink-0">
                          {state.nursingStaffedBeds > 0 ? formatNumber(Math.round(state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365)) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm text-white/50 min-w-0 truncate">Adoption</span>
                        <span className="text-base font-semibold text-white flex-shrink-0">{state.utilizationPercent > 0 ? `${state.utilizationPercent}%` : '—'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm text-white/50 min-w-0 truncate">{providerLabel}</span>
                        <span className="text-base font-semibold text-white flex-shrink-0">
                          {state.numberOfProviders > 0 ? formatNumber(state.numberOfProviders) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm text-white/50 min-w-0 truncate">{encounterLabel}/Provider</span>
                        <span className="text-base font-semibold text-white flex-shrink-0">{formatNumber(encountersPerProvider)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2 pt-3 border-t border-white/10">
                        <span className="text-sm text-white/50 min-w-0 truncate">Annual {encounterLabel}</span>
                        <span className="text-base font-semibold text-white flex-shrink-0">
                          {state.numberOfProviders > 0 ? formatNumber(annualEncounters) : '—'}
                        </span>
                      </div>
                    </>
                  )}
                  {!isNursing && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm text-white/50 min-w-0 truncate">Utilization</span>
                      <span className="text-base font-semibold text-white flex-shrink-0">{state.utilizationPercent}%</span>
                    </div>
                  )}
                </div>

                {/* Abridge-Enabled Shifts (Nursing) / Eligible Encounters */}
                <div className="px-6 py-5 border-t border-white/10">
                  {isNursing ? (
                    <>
                      <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
                        ABRIDGE-ENABLED SHIFTS
                      </p>
                      <div className="text-center mb-3">
                        <span className="text-3xl font-bold text-[#EA2C00]" data-testid="text-enabled-shifts">
                          {state.numberOfProviders > 0 && state.utilizationPercent > 0 ? formatNumber(nursingEligibleShifts) : '—'}
                        </span>
                        <p className="text-sm text-white/50 mt-1">shifts / year</p>
                      </div>
                      <div className="h-px bg-white/10 my-3" />
                      <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-2">
                        THE MATH
                      </p>
                      <div className="text-xs text-white/40 space-y-1">
                        <p>{state.numberOfProviders > 0 ? formatNumber(state.numberOfProviders) : '—'} nurse FTEs</p>
                        <p>× {state.nursingShiftsPerNurseYear} shifts/year</p>
                        <p>× {state.utilizationPercent}% adoption</p>
                        <p className="text-white/60 font-medium">= {state.numberOfProviders > 0 && state.utilizationPercent > 0 ? formatNumber(nursingEligibleShifts) : '—'} shifts</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white/70 min-w-0 truncate">
                          {`Eligible ${encounterLabel}`}
                        </span>
                        <span className="text-2xl font-bold text-[#EA2C00] flex-shrink-0">
                          {state.numberOfProviders > 0 ? formatNumber(eligibleEncounters) : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-white/30">
                        This is your value multiplier
                      </p>
                    </>
                  )}
                </div>

                {/* Continue Button */}
                <div className="hidden lg:block">
                <div className="px-6 pb-6">
                  <Button
                    onClick={onNext}
                    disabled={!isValid}
                    className={`w-full h-12 text-sm font-semibold rounded-full transition-all ${
                      isValid 
                        ? 'bg-white hover:bg-white/90 text-black' 
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                    }`}
                    data-testid="button-continue"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
