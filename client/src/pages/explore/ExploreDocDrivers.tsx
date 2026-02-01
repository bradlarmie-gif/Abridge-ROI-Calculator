import { useState } from "react";
import { ArrowRight, BarChart3, Building2, AlertTriangle, DollarSign, Calculator, ChevronDown, ChevronUp, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState, type DocPathFocus } from "./ExploreFlow";

interface ExploreDocDriversProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

interface DocDriverConfig {
  id: DocPathFocus;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof BarChart3;
  min: number;
  max: number;
  step: number;
  suffix: string;
  detail: string;
}

const DOC_DRIVER_CONFIGS: DocDriverConfig[] = [
  {
    id: 'wrvu',
    label: 'Level of Service (wRVU)',
    shortLabel: 'wRVU',
    description: 'Improve coding accuracy and capture appropriate complexity',
    icon: BarChart3,
    min: 0.5,
    max: 5,
    step: 0.5,
    suffix: '%',
    detail: 'Best for organizations with E&M coding opportunities',
  },
  {
    id: 'hcc',
    label: 'HCC & Chronic Conditions',
    shortLabel: 'HCC',
    description: 'Better capture of chronic conditions for risk adjustment',
    icon: Building2,
    min: 5,
    max: 30,
    step: 5,
    suffix: '%',
    detail: 'Best for Medicare Advantage or ACO populations',
  },
  {
    id: 'denials',
    label: 'Denial Prevention',
    shortLabel: 'Denials',
    description: 'Reduce documentation-related claim denials',
    icon: AlertTriangle,
    min: 10,
    max: 40,
    step: 5,
    suffix: '%',
    detail: 'Best for organizations with high denial rates',
  },
];

interface EditableAssumptions {
  wrvuConversion: number;
  wrvuRealization: number;
  hccValuePerCondition: number;
  hccRealization: number;
  denialAvgValue: number;
  denialRealization: number;
  maPatientPct: number;
  baselineDenialRate: number;
}

const DEFAULT_ASSUMPTIONS: EditableAssumptions = {
  wrvuConversion: 40,
  wrvuRealization: 75,
  hccValuePerCondition: 800,
  hccRealization: 60,
  denialAvgValue: 250,
  denialRealization: 70,
  maPatientPct: 30,
  baselineDenialRate: 8,
};

const REALIZATION_RATES = {
  patientAccess: 0.35,
  reducingLocums: 0.60,
  clinicianWellbeing: 0.20,
};

function EditableValue({ 
  value, 
  onChange, 
  prefix = '', 
  suffix = '',
  min = 0,
  max = 999999,
  step = 1,
}: { 
  value: number; 
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  const handleStartEdit = () => {
    setInputValue(value.toString());
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const num = parseFloat(inputValue);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    } else {
      setInputValue(value.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setInputValue(value.toString());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1">
        {prefix}
        <input
          type="number"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          className="w-24 px-2 py-1.5 text-base font-semibold text-[#EA2C00] bg-white border-2 border-[#EA2C00] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EA2C00]"
          autoFocus
          data-testid="input-editable-value"
        />
        {suffix}
      </span>
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      onTouchEnd={(e) => {
        e.preventDefault();
        handleStartEdit();
      }}
      className="inline-flex items-center gap-1.5 text-base font-semibold text-[#EA2C00] bg-[#EA2C00]/5 hover:bg-[#EA2C00]/15 active:bg-[#EA2C00]/20 px-3 py-2 rounded-lg transition-colors min-h-[44px]"
      data-testid="button-edit-value"
    >
      {prefix}{value.toLocaleString()}{suffix}
      <Pencil className="w-4 h-4" />
    </button>
  );
}

export default function ExploreDocDrivers({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: ExploreDocDriversProps) {
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<EditableAssumptions>(DEFAULT_ASSUMPTIONS);

  const updateAssumption = (key: keyof EditableAssumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));

  const handleToggleDriver = (driverId: DocPathFocus) => {
    const newDocDrivers = { ...state.docDrivers };
    newDocDrivers[driverId] = { ...newDocDrivers[driverId], enabled: !newDocDrivers[driverId].enabled };
    updateState({ docDrivers: newDocDrivers });
  };

  const handleDriverValueChange = (driverId: DocPathFocus, newValue: number) => {
    const newDocDrivers = { ...state.docDrivers };
    newDocDrivers[driverId] = { ...newDocDrivers[driverId], value: newValue };
    updateState({ docDrivers: newDocDrivers });
  };

  const calculateDriverValue = (driverId: DocPathFocus) => {
    const driver = state.docDrivers[driverId];
    if (!driver.enabled) return { value: 0, editableInputs: null };
    const driverValue = driver.value;

    switch (driverId) {
      case 'wrvu': {
        const baseWrvu = 1.5;
        const wrvuLift = baseWrvu * (driverValue / 100);
        const grossValue = wrvuLift * eligibleEncounters * assumptions.wrvuConversion;
        const realizedValue = grossValue * (assumptions.wrvuRealization / 100);
        return {
          value: Math.round(realizedValue),
          editableInputs: (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Eligible encounters</span>
                <span className="text-sm font-semibold text-black">{eligibleEncounters.toLocaleString()} visits</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Base wRVU per visit</span>
                <span className="text-sm font-semibold text-black">{baseWrvu} wRVU</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Your improvement target</span>
                <span className="text-sm font-semibold text-[#EA2C00]">{driverValue}%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">wRVU lift per visit</span>
                <span className="text-sm font-semibold text-black">{wrvuLift.toFixed(3)} wRVU</span>
              </div>
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <span className="text-sm text-slate-600">Conversion rate</span>
                <EditableValue 
                  value={assumptions.wrvuConversion} 
                  onChange={(v) => updateAssumption('wrvuConversion', v)}
                  prefix="$"
                  suffix="/wRVU"
                  min={20}
                  max={100}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Gross value</span>
                <span className="text-sm font-semibold text-black">${Math.round(grossValue).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 bg-[#FFF5F2] -mx-4 px-4 rounded">
                <div>
                  <span className="text-sm font-medium text-[#EA2C00]">Realization rate</span>
                  <p className="text-xs text-slate-500 mt-0.5">Payer mix, fee schedule variations</p>
                </div>
                <EditableValue 
                  value={assumptions.wrvuRealization} 
                  onChange={(v) => updateAssumption('wrvuRealization', v)}
                  suffix="%"
                  min={25}
                  max={100}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-t-2 border-[#EA2C00]/20 mt-2">
                <span className="text-sm font-bold text-black">Net annual value</span>
                <span className="text-lg font-bold text-[#F07B5F]">${Math.round(realizedValue).toLocaleString()}</span>
              </div>
            </div>
          ),
        };
      }
      case 'hcc': {
        const avgConditionsPerMember = 3;
        const maPatients = eligibleEncounters * (assumptions.maPatientPct / 100);
        const conditionsCaptured = maPatients * avgConditionsPerMember * (driverValue / 100);
        const grossValue = conditionsCaptured * assumptions.hccValuePerCondition;
        const realizedValue = grossValue * (assumptions.hccRealization / 100);
        return {
          value: Math.round(realizedValue),
          editableInputs: (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Eligible encounters</span>
                <span className="text-sm font-semibold text-black">{eligibleEncounters.toLocaleString()} visits</span>
              </div>
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <span className="text-sm text-slate-600">Medicare Advantage %</span>
                <EditableValue 
                  value={assumptions.maPatientPct} 
                  onChange={(v) => updateAssumption('maPatientPct', v)}
                  suffix="%"
                  min={5}
                  max={100}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">MA patient encounters</span>
                <span className="text-sm font-semibold text-black">{Math.round(maPatients).toLocaleString()} visits</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Avg conditions per member</span>
                <span className="text-sm font-semibold text-black">{avgConditionsPerMember} HCCs</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Your recapture target</span>
                <span className="text-sm font-semibold text-[#EA2C00]">{driverValue}%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Conditions recaptured</span>
                <span className="text-sm font-semibold text-black">{Math.round(conditionsCaptured).toLocaleString()} HCCs</span>
              </div>
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <span className="text-sm text-slate-600">Value per HCC</span>
                <EditableValue 
                  value={assumptions.hccValuePerCondition} 
                  onChange={(v) => updateAssumption('hccValuePerCondition', v)}
                  prefix="$"
                  min={200}
                  max={2000}
                  step={50}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Gross value</span>
                <span className="text-sm font-semibold text-black">${Math.round(grossValue).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 bg-[#FFF5F2] -mx-4 px-4 rounded">
                <div>
                  <span className="text-sm font-medium text-[#EA2C00]">Realization rate</span>
                  <p className="text-xs text-slate-500 mt-0.5">RAF adjustments, RADV audits</p>
                </div>
                <EditableValue 
                  value={assumptions.hccRealization} 
                  onChange={(v) => updateAssumption('hccRealization', v)}
                  suffix="%"
                  min={25}
                  max={100}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-t-2 border-[#EA2C00]/20 mt-2">
                <span className="text-sm font-bold text-black">Net annual value</span>
                <span className="text-lg font-bold text-[#F07B5F]">${Math.round(realizedValue).toLocaleString()}</span>
              </div>
            </div>
          ),
        };
      }
      case 'denials': {
        const baselineDenialRate = assumptions.baselineDenialRate / 100;
        const docRelatedPct = 0.5;
        const denials = eligibleEncounters * baselineDenialRate;
        const denialsFromDoc = denials * docRelatedPct;
        const denialsRecovered = denialsFromDoc * (driverValue / 100);
        const grossValue = denialsRecovered * assumptions.denialAvgValue;
        const realizedValue = grossValue * (assumptions.denialRealization / 100);
        return {
          value: Math.round(realizedValue),
          editableInputs: (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Eligible encounters</span>
                <span className="text-sm font-semibold text-black">{eligibleEncounters.toLocaleString()} visits</span>
              </div>
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <span className="text-sm text-slate-600">Baseline denial rate</span>
                <EditableValue 
                  value={assumptions.baselineDenialRate} 
                  onChange={(v) => updateAssumption('baselineDenialRate', v)}
                  suffix="%"
                  min={2}
                  max={20}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Total denials</span>
                <span className="text-sm font-semibold text-black">{Math.round(denials).toLocaleString()} claims</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Documentation-related</span>
                <span className="text-sm font-semibold text-black">50%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Doc-related denials</span>
                <span className="text-sm font-semibold text-black">{Math.round(denialsFromDoc).toLocaleString()} claims</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Your reduction target</span>
                <span className="text-sm font-semibold text-[#EA2C00]">{driverValue}%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Denials prevented</span>
                <span className="text-sm font-semibold text-black">{Math.round(denialsRecovered).toLocaleString()} claims</span>
              </div>
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <span className="text-sm text-slate-600">Avg denial value</span>
                <EditableValue 
                  value={assumptions.denialAvgValue} 
                  onChange={(v) => updateAssumption('denialAvgValue', v)}
                  prefix="$"
                  min={50}
                  max={1000}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Gross value</span>
                <span className="text-sm font-semibold text-black">${Math.round(grossValue).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-2 bg-[#FFF5F2] -mx-4 px-4 rounded">
                <div>
                  <span className="text-sm font-medium text-[#EA2C00]">Realization rate</span>
                  <p className="text-xs text-slate-500 mt-0.5">Appeals success rate, collection timing</p>
                </div>
                <EditableValue 
                  value={assumptions.denialRealization} 
                  onChange={(v) => updateAssumption('denialRealization', v)}
                  suffix="%"
                  min={25}
                  max={100}
                />
              </div>
              <div className="flex items-center justify-between py-3 border-t-2 border-[#EA2C00]/20 mt-2">
                <span className="text-sm font-bold text-black">Net annual value</span>
                <span className="text-lg font-bold text-[#F07B5F]">${Math.round(realizedValue).toLocaleString()}</span>
              </div>
            </div>
          ),
        };
      }
      default:
        return { value: 0, editableInputs: null };
    }
  };

  const calculateTimeValue = () => {
    const patientAccessHours = totalHoursSaved * (state.timeAllocation.patientAccess / 100);
    const patientAccessValue = (patientAccessHours / 0.5) * 200 * REALIZATION_RATES.patientAccess;

    const locumHours = totalHoursSaved * (state.timeAllocation.reducingLocums / 100);
    const locumValue = locumHours * 150 * REALIZATION_RATES.reducingLocums;

    const wellbeingPct = state.timeAllocation.clinicianWellbeing / 100;
    const retentionValue = state.numberOfProviders * 0.15 * wellbeingPct * 250000 * REALIZATION_RATES.clinicianWellbeing;

    return Math.round(patientAccessValue + locumValue + retentionValue);
  };

  const enabledDrivers = DOC_DRIVER_CONFIGS.filter(d => state.docDrivers[d.id].enabled);
  const timeValue = calculateTimeValue();
  const docValue = enabledDrivers.reduce((sum, driver) => {
    const calc = calculateDriverValue(driver.id);
    return sum + (calc?.value || 0);
  }, 0);
  const totalValue = timeValue + docValue;

  const toggleExpand = (id: string) => {
    setExpandedDriver(expandedDriver === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={5}
        totalSteps={6}
        stepName="Documentation Quality"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">
            Documentation Quality
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            How Will Documentation Improve Your Bottom Line?
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Beyond time savings, Abridge improves note quality. Toggle on the drivers that apply to your organization and adjust targets.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {DOC_DRIVER_CONFIGS.map((driver, index) => {
              const Icon = driver.icon;
              const isEnabled = state.docDrivers[driver.id].enabled;
              const driverCalc = calculateDriverValue(driver.id);
              const isExpanded = expandedDriver === driver.id;
              const currentValue = state.docDrivers[driver.id].value;

              return (
                <motion.div
                  key={driver.id}
                  className={`bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                    isEnabled ? 'border-[#EA2C00]/30' : 'border-slate-200'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05, duration: 0.5 }}
                >
                  <div className="p-5">
                    {/* Header with toggle */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        isEnabled ? 'bg-[#EA2C00]' : 'bg-slate-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${isEnabled ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-bold ${isEnabled ? 'text-black' : 'text-slate-500'}`}>{driver.label}</h3>
                          <button
                            onClick={() => handleToggleDriver(driver.id)}
                            className="flex items-center gap-2 min-h-[44px] px-2"
                            data-testid={`toggle-${driver.id}`}
                          >
                            {isEnabled ? (
                              <ToggleRight className="w-8 h-8 text-[#EA2C00]" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-slate-300" />
                            )}
                          </button>
                        </div>
                        <p className={`text-sm ${isEnabled ? 'text-slate-600' : 'text-slate-400'}`}>{driver.description}</p>
                        <p className={`text-xs mt-1 ${isEnabled ? 'text-slate-400' : 'text-slate-300'}`}>{driver.detail}</p>
                      </div>
                    </div>

                    {/* Slider and value - only when enabled */}
                    <AnimatePresence>
                      {isEnabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-4 mb-3">
                              <input
                                type="range"
                                min={driver.min}
                                max={driver.max}
                                step={driver.step}
                                value={currentValue}
                                onChange={(e) => handleDriverValueChange(driver.id, Number(e.target.value))}
                                className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                                data-testid={`slider-${driver.id}`}
                              />
                              <div className="w-16 text-right">
                                <span className="text-2xl font-bold text-[#EA2C00]">{currentValue}{driver.suffix}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                              <span>Conservative ({driver.min}{driver.suffix})</span>
                              <span>Aggressive ({driver.max}{driver.suffix})</span>
                            </div>

                            {/* Value display row */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <div>
                                <p className="text-xs text-slate-400 mb-0.5">Annual Value</p>
                                <p className="text-xl font-bold text-[#F07B5F]">${driverCalc?.value.toLocaleString() || 0}</p>
                              </div>
                              
                              <button
                                onClick={() => toggleExpand(driver.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors min-h-[44px]"
                                data-testid={`button-expand-${driver.id}`}
                              >
                                <Calculator className="w-3.5 h-3.5" />
                                <span>{isExpanded ? 'Hide details' : 'See the math'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Expandable math breakdown */}
                  <AnimatePresence>
                    {isExpanded && isEnabled && driverCalc && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5">
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-[#EA2C00]" />
                                <h4 className="text-sm font-bold text-black">Calculation Breakdown</h4>
                              </div>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Pencil className="w-3 h-3" />
                                Click values to edit
                              </span>
                            </div>
                            
                            {driverCalc.editableInputs}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Live Receipt */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className="bg-black rounded-2xl p-6 text-white sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Live Receipt</h2>
                  <p className="text-sm text-white/60">Your model so far</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-white/70">Time Savings</span>
                  <span className="font-semibold">${timeValue.toLocaleString()}</span>
                </div>
                {DOC_DRIVER_CONFIGS.map(driver => {
                  const isEnabled = state.docDrivers[driver.id].enabled;
                  const calc = calculateDriverValue(driver.id);
                  return (
                    <div 
                      key={driver.id} 
                      className={`flex items-center justify-between py-2 border-b border-white/10 transition-opacity ${
                        isEnabled ? 'opacity-100' : 'opacity-30'
                      }`}
                    >
                      <span className="text-white/70">{driver.shortLabel}</span>
                      <span className="font-semibold">{isEnabled ? `$${calc?.value.toLocaleString() || 0}` : '—'}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Projected Annual Value</span>
                  <span className="text-3xl font-bold text-[#F07B5F]">${totalValue.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-white/60">
                  All values include realization rates for conservative, defensible estimates. Investment costs will be added in the next step.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="flex flex-col items-center mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <Button
            onClick={onNext}
            className="h-12 px-8 font-semibold rounded-full bg-black hover:bg-black/90 text-white"
            data-testid="button-continue"
          >
            Review Your Model
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          {enabledDrivers.length === 0 && (
            <p className="text-sm text-slate-400 mt-3">
              You can continue without documentation drivers
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
