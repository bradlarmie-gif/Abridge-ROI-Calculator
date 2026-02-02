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

interface PresetOption {
  label: string;
  value: number;
}

interface DocDriverConfigWithPresets extends DocDriverConfig {
  presets: PresetOption[];
}

const OUTPATIENT_DOC_DRIVER_CONFIGS: DocDriverConfigWithPresets[] = [
  {
    id: 'wrvu',
    label: 'Level of Service (wRVU)',
    shortLabel: 'wRVU',
    description: 'Capture the complexity you are already delivering',
    icon: BarChart3,
    min: 0.5,
    max: 10,
    step: 0.5,
    suffix: '%',
    detail: 'When notes fully reflect visit complexity, E&M levels often code higher',
    presets: [
      { label: 'Conservative', value: 2 },
      { label: 'Typical', value: 5 },
      { label: 'Aggressive', value: 7 },
    ],
  },
  {
    id: 'hcc',
    label: 'HCC & Chronic Conditions',
    shortLabel: 'HCC',
    description: 'Document chronic conditions that affect risk adjustment',
    icon: Building2,
    min: 5,
    max: 30,
    step: 5,
    suffix: '%',
    detail: 'Most relevant for Medicare Advantage and ACO populations',
    presets: [
      { label: 'Conservative', value: 10 },
      { label: 'Typical', value: 15 },
      { label: 'Aggressive', value: 25 },
    ],
  },
  {
    id: 'denials',
    label: 'Denial Prevention',
    shortLabel: 'Denials',
    description: 'Prevent unappealable denials caused by documentation gaps',
    icon: AlertTriangle,
    min: 25,
    max: 75,
    step: 5,
    suffix: '%',
    detail: '30-40% of denials cannot be appealed due to missing documentation',
    presets: [
      { label: 'Conservative', value: 25 },
      { label: 'Typical', value: 50 },
      { label: 'Aggressive', value: 75 },
    ],
  },
];

// Inpatient uses different drivers: CC/MCC capture (maps to 'wrvu' slot), CDI query reduction (maps to 'hcc' slot), Denials
const INPATIENT_DOC_DRIVER_CONFIGS: DocDriverConfigWithPresets[] = [
  {
    id: 'wrvu',
    label: 'CC/MCC Capture',
    shortLabel: 'CC/MCC',
    description: 'Improve DRG weight through complete complication/comorbidity documentation',
    icon: DollarSign,
    min: 1,
    max: 10,
    step: 1,
    suffix: '%',
    detail: 'Better documentation captures CCs and MCCs that drive DRG reimbursement',
    presets: [
      { label: 'Conservative', value: 2 },
      { label: 'Typical', value: 5 },
      { label: 'Aggressive', value: 8 },
    ],
  },
  {
    id: 'hcc',
    label: 'CDI Query Reduction',
    shortLabel: 'CDI',
    description: 'Reduce CDI queries through more complete initial documentation',
    icon: Building2,
    min: 10,
    max: 50,
    step: 5,
    suffix: '%',
    detail: 'CDI teams spend less time querying when notes are complete upfront',
    presets: [
      { label: 'Conservative', value: 15 },
      { label: 'Typical', value: 30 },
      { label: 'Aggressive', value: 45 },
    ],
  },
  {
    id: 'denials',
    label: 'Denial Prevention',
    shortLabel: 'Denials',
    description: 'Prevent unappealable inpatient denials from documentation gaps',
    icon: AlertTriangle,
    min: 25,
    max: 75,
    step: 5,
    suffix: '%',
    detail: 'High-dollar inpatient denials that cannot be appealed due to missing medical necessity',
    presets: [
      { label: 'Conservative', value: 25 },
      { label: 'Typical', value: 50 },
      { label: 'Aggressive', value: 75 },
    ],
  },
];

// Nursing uses: Care Plan Compliance (wrvu slot), Care Coordination (hcc slot), Regulatory Compliance (denials slot)
const NURSING_DOC_DRIVER_CONFIGS: DocDriverConfigWithPresets[] = [
  {
    id: 'wrvu',
    label: 'Care Plan Compliance',
    shortLabel: 'Care Plans',
    description: 'Improve care plan completion and accuracy rates',
    icon: BarChart3,
    min: 10,
    max: 40,
    step: 5,
    suffix: '%',
    detail: 'Complete documentation ensures care plans reflect actual patient needs and interventions',
    presets: [
      { label: 'Conservative', value: 15 },
      { label: 'Typical', value: 20 },
      { label: 'Aggressive', value: 30 },
    ],
  },
  {
    id: 'hcc',
    label: 'Care Coordination',
    shortLabel: 'Coordination',
    description: 'Improve handoff quality and reduce communication gaps',
    icon: Building2,
    min: 15,
    max: 45,
    step: 5,
    suffix: '%',
    detail: 'Better documentation enables smoother shift changes and care transitions',
    presets: [
      { label: 'Conservative', value: 20 },
      { label: 'Typical', value: 25 },
      { label: 'Aggressive', value: 35 },
    ],
  },
  {
    id: 'denials',
    label: 'Regulatory Compliance',
    shortLabel: 'Compliance',
    description: 'Prevent unappealable compliance gaps from documentation issues',
    icon: AlertTriangle,
    min: 25,
    max: 75,
    step: 5,
    suffix: '%',
    detail: 'Complete nursing documentation reduces CMS survey findings and audit risks',
    presets: [
      { label: 'Conservative', value: 25 },
      { label: 'Typical', value: 50 },
      { label: 'Aggressive', value: 75 },
    ],
  },
];

interface EditableAssumptions {
  wrvuConversion: number;
  wrvuRealization: number;
  // HCC panel-based assumptions
  panelSizePerProvider: number;
  maPatientPct: number;
  hccGapRate: number;
  avgMissedHccsPerPatient: number;
  rafImpactPerHcc: number;
  annualPaymentPerRaf: number;
  hccRealization: number;
  // Denials - unappealable focus
  baselineDenialRate: number;
  unappealableRate: number;
  denialPreventionTarget: number;
  denialAvgValue: number;
  denialRealization: number;
}

const DEFAULT_ASSUMPTIONS: EditableAssumptions = {
  wrvuConversion: 33,
  wrvuRealization: 75,
  // HCC panel-based defaults
  panelSizePerProvider: 1500,
  maPatientPct: 30,
  hccGapRate: 40,
  avgMissedHccsPerPatient: 1.5,
  rafImpactPerHcc: 0.4,
  annualPaymentPerRaf: 12000,
  hccRealization: 60,
  // Denials - unappealable focus (Typical scenario)
  baselineDenialRate: 8,
  unappealableRate: 40,
  denialPreventionTarget: 50,
  denialAvgValue: 250,
  denialRealization: 85,
};

const REALIZATION_RATES = {
  patientAccess: 0.15,
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

const DEFAULT_DOC_DRIVERS = {
  wrvu: { enabled: false, value: 5 },  // Typical scenario default
  hcc: { enabled: false, value: 15 },
  denials: { enabled: false, value: 50 },  // Typical prevention target
};

export default function ExploreDocDrivers({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: ExploreDocDriversProps) {
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';
  const isNursing = state.careSetting === 'nursing';
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<EditableAssumptions>(DEFAULT_ASSUMPTIONS);

  const docDrivers = state.docDrivers || DEFAULT_DOC_DRIVERS;
  
  // Select appropriate driver configs based on care setting
  // Nursing uses Care Plans, Coordination, and Compliance
  // Inpatient uses CC/MCC, CDI, and Denials
  // ED uses wRVU and Denials (no HCC)
  // Outpatient uses all three
  const availableDriverConfigs = isNursing
    ? NURSING_DOC_DRIVER_CONFIGS
    : isInpatient
      ? INPATIENT_DOC_DRIVER_CONFIGS
      : isED 
        ? OUTPATIENT_DOC_DRIVER_CONFIGS.filter(d => d.id !== 'hcc')
        : OUTPATIENT_DOC_DRIVER_CONFIGS;

  const updateAssumption = (key: keyof EditableAssumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));

  const handleToggleDriver = (driverId: DocPathFocus) => {
    const newDocDrivers = { ...docDrivers };
    newDocDrivers[driverId] = { ...newDocDrivers[driverId], enabled: !newDocDrivers[driverId].enabled };
    updateState({ docDrivers: newDocDrivers });
  };

  const handleDriverValueChange = (driverId: DocPathFocus, newValue: number) => {
    const newDocDrivers = { ...docDrivers };
    newDocDrivers[driverId] = { ...newDocDrivers[driverId], value: newValue };
    updateState({ docDrivers: newDocDrivers });
  };

  const calculateDriverValue = (driverId: DocPathFocus) => {
    const driver = docDrivers[driverId];
    if (!driver || !driver.enabled) return { value: 0, editableInputs: null };
    const driverValue = driver.value;
    const numberOfProviders = state.numberOfProviders;

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
              <div className="bg-slate-50 -mx-4 px-4 py-2 rounded mb-2">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">The logic:</span> When documentation captures the full clinical complexity, coders can assign appropriate E&M levels. A small wRVU improvement per visit compounds across your volume.
                </p>
              </div>
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
        // Panel-based HCC calculation
        const totalPatientPanel = numberOfProviders * assumptions.panelSizePerProvider;
        const maPatients = totalPatientPanel * (assumptions.maPatientPct / 100);
        const patientsWithGaps = maPatients * (assumptions.hccGapRate / 100);
        const potentialHccs = patientsWithGaps * assumptions.avgMissedHccsPerPatient;
        const hccsRecaptured = potentialHccs * (driverValue / 100);
        const valuePerHcc = assumptions.rafImpactPerHcc * assumptions.annualPaymentPerRaf;
        const grossValue = hccsRecaptured * valuePerHcc;
        const realizedValue = grossValue * (assumptions.hccRealization / 100);
        
        return {
          value: Math.round(realizedValue),
          editableInputs: (
            <div className="space-y-3">
              <div className="bg-slate-50 -mx-4 px-4 py-2 rounded mb-2">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">The logic:</span> Risk adjustment pays based on documented conditions. Many MA patients have documentation gaps—conditions discussed but not captured. Better notes recapture missed HCCs.
                </p>
              </div>
              
              {/* Step 1: Patient panel */}
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <span className="text-sm text-slate-600">Panel size per provider</span>
                <EditableValue 
                  value={assumptions.panelSizePerProvider} 
                  onChange={(v) => updateAssumption('panelSizePerProvider', v)}
                  suffix=" pts"
                  min={500}
                  max={3000}
                  step={100}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">× {numberOfProviders} providers</span>
                <span className="text-sm font-semibold text-black">{totalPatientPanel.toLocaleString()} patients</span>
              </div>
              
              {/* Step 2: MA population */}
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
                <span className="text-sm text-slate-600">= MA patient panel</span>
                <span className="text-sm font-semibold text-black">{Math.round(maPatients).toLocaleString()} patients</span>
              </div>
              
              {/* Step 3: Gap patients */}
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <div>
                  <span className="text-sm text-slate-600">Documentation gap rate</span>
                  <p className="text-xs text-slate-400 mt-0.5">Patients with missed HCCs</p>
                </div>
                <EditableValue 
                  value={assumptions.hccGapRate} 
                  onChange={(v) => updateAssumption('hccGapRate', v)}
                  suffix="%"
                  min={10}
                  max={60}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">= Patients with gaps</span>
                <span className="text-sm font-semibold text-black">{Math.round(patientsWithGaps).toLocaleString()} patients</span>
              </div>
              
              {/* Step 4: Potential HCCs */}
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <div>
                  <span className="text-sm text-slate-600">Avg missed HCCs per patient</span>
                </div>
                <EditableValue 
                  value={assumptions.avgMissedHccsPerPatient} 
                  onChange={(v) => updateAssumption('avgMissedHccsPerPatient', v)}
                  suffix=" HCCs"
                  min={0.5}
                  max={3}
                  step={0.1}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">= Total recapture opportunity</span>
                <span className="text-sm font-semibold text-black">{Math.round(potentialHccs).toLocaleString()} HCCs</span>
              </div>
              
              {/* Step 5: Recapture target */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">× Your recapture target</span>
                <span className="text-sm font-semibold text-[#EA2C00]">{driverValue}%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">= HCCs you'll document</span>
                <span className="text-sm font-semibold text-black">{Math.round(hccsRecaptured).toLocaleString()} HCCs</span>
              </div>
              
              {/* Step 6: Value per HCC */}
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <div>
                  <span className="text-sm text-slate-600">RAF impact per HCC</span>
                </div>
                <EditableValue 
                  value={assumptions.rafImpactPerHcc} 
                  onChange={(v) => updateAssumption('rafImpactPerHcc', v)}
                  suffix=""
                  min={0.1}
                  max={1.0}
                  step={0.05}
                />
              </div>
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <div>
                  <span className="text-sm text-slate-600">× Annual payment per RAF</span>
                </div>
                <EditableValue 
                  value={assumptions.annualPaymentPerRaf} 
                  onChange={(v) => updateAssumption('annualPaymentPerRaf', v)}
                  prefix="$"
                  min={8000}
                  max={18000}
                  step={500}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">= Value per HCC</span>
                <span className="text-sm font-semibold text-black">${valuePerHcc.toLocaleString()}</span>
              </div>
              
              {/* Step 7: Gross value */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">Gross annual value</span>
                <span className="text-sm font-semibold text-black">${Math.round(grossValue).toLocaleString()}</span>
              </div>
              
              {/* Step 8: Realization */}
              <div className="flex items-center justify-between py-2 bg-[#FFF5F2] -mx-4 px-4 rounded">
                <div>
                  <span className="text-sm font-medium text-[#EA2C00]">Realization rate</span>
                  <p className="text-xs text-slate-500 mt-0.5">RADV audits, payment delays, rejections</p>
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
        // Unappealable denials calculation
        const baselineDenialRate = assumptions.baselineDenialRate / 100;
        const unappealableRate = assumptions.unappealableRate / 100;
        const preventionTarget = driverValue / 100;
        
        const totalDenials = eligibleEncounters * baselineDenialRate;
        const appealableDenials = totalDenials * (1 - unappealableRate);
        const unappealableDenials = totalDenials * unappealableRate;
        const denialsPrevented = unappealableDenials * preventionTarget;
        const grossValue = denialsPrevented * assumptions.denialAvgValue;
        const realizedValue = grossValue * (assumptions.denialRealization / 100);
        
        return {
          value: Math.round(realizedValue),
          editableInputs: (
            <div className="space-y-3">
              <div className="bg-slate-50 -mx-4 px-4 py-2 rounded mb-2">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">The logic:</span> Documentation gaps drive 30-40% of denials that cannot be appealed—permanent revenue loss. Abridge captures clinical reasoning and medical necessity in real-time, preventing denials before they occur.
                </p>
              </div>
              
              {/* Step 1: Total denials */}
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
                  min={5}
                  max={12}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">= Total denials</span>
                <span className="text-sm font-semibold text-black">{Math.round(totalDenials).toLocaleString()} claims</span>
              </div>
              
              {/* Step 2: Appealable vs Unappealable visualization */}
              <div className="bg-slate-100 -mx-4 px-4 py-3 rounded my-2">
                <p className="text-xs font-semibold text-slate-700 mb-2">Denial breakdown:</p>
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-4">├─</span>
                    <span className="text-slate-500">Appealable ({100 - assumptions.unappealableRate}%):</span>
                    <span className="text-slate-600">{Math.round(appealableDenials).toLocaleString()}</span>
                    <span className="text-slate-400 text-[10px]">← Recovered through appeals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-4">└─</span>
                    <span className="text-[#EA2C00] font-semibold">Unappealable ({assumptions.unappealableRate}%):</span>
                    <span className="text-[#EA2C00] font-semibold">{Math.round(unappealableDenials).toLocaleString()}</span>
                    <span className="text-[#EA2C00] text-[10px]">← Abridge prevents these</span>
                  </div>
                </div>
              </div>
              
              {/* Step 3: Unappealable rate */}
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <div>
                  <span className="text-sm text-slate-600">Unappealable rate</span>
                  <p className="text-xs text-slate-400 mt-0.5">Denials due to documentation gaps</p>
                </div>
                <EditableValue 
                  value={assumptions.unappealableRate} 
                  onChange={(v) => updateAssumption('unappealableRate', v)}
                  suffix="%"
                  min={30}
                  max={50}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">= Unrecoverable denials</span>
                <span className="text-sm font-semibold text-black">{Math.round(unappealableDenials).toLocaleString()} claims</span>
              </div>
              
              {/* Step 4: Prevention target */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-slate-600">× Your prevention target</span>
                  <p className="text-xs text-slate-400 mt-0.5">% you'll prevent with better docs</p>
                </div>
                <span className="text-sm font-semibold text-[#EA2C00]">{driverValue}%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">= Denials prevented</span>
                <span className="text-sm font-semibold text-black">{Math.round(denialsPrevented).toLocaleString()} claims</span>
              </div>
              
              {/* Step 5: Value calculation */}
              <div className="flex items-center justify-between py-2 bg-slate-50 -mx-4 px-4 rounded">
                <span className="text-sm text-slate-600">× Avg denied claim value</span>
                <EditableValue 
                  value={assumptions.denialAvgValue} 
                  onChange={(v) => updateAssumption('denialAvgValue', v)}
                  prefix="$"
                  min={150}
                  max={500}
                  step={25}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">= Gross value</span>
                <span className="text-sm font-semibold text-black">${Math.round(grossValue).toLocaleString()}</span>
              </div>
              
              {/* Step 6: Realization */}
              <div className="flex items-center justify-between py-2 bg-[#FFF5F2] -mx-4 px-4 rounded">
                <div>
                  <span className="text-sm font-medium text-[#EA2C00]">Realization rate</span>
                  <p className="text-xs text-slate-500 mt-0.5">Clean claims payment rate</p>
                </div>
                <EditableValue 
                  value={assumptions.denialRealization} 
                  onChange={(v) => updateAssumption('denialRealization', v)}
                  suffix="%"
                  min={75}
                  max={95}
                />
              </div>
              
              {/* Impact summary */}
              <div className="bg-[#FFF5F2] -mx-4 px-4 py-2 rounded mt-2">
                <p className="text-xs text-slate-700">
                  <span className="font-semibold text-[#EA2C00]">Your impact:</span> Prevent {Math.round(denialsPrevented).toLocaleString()} of the {Math.round(unappealableDenials).toLocaleString()} unrecoverable denials
                </p>
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

    // Simplified wellbeing calculation (no at-risk multiplier)
    const annualDepartures = state.numberOfProviders * 0.08; // 8% baseline turnover
    const wellbeingHours = totalHoursSaved * (state.timeAllocation.clinicianWellbeing / 100);
    const hoursPerProviderAnnual = wellbeingHours / Math.max(1, state.numberOfProviders);
    
    // Determine retention lift based on annual hours threshold
    let retentionLift = 0.04; // MINIMAL (3-5%)
    if (hoursPerProviderAnnual >= 200) retentionLift = 0.275; // MAXIMUM (25-30%)
    else if (hoursPerProviderAnnual >= 150) retentionLift = 0.175; // SIGNIFICANT (15-20%)
    else if (hoursPerProviderAnnual >= 100) retentionLift = 0.10; // MODERATE (8-12%)
    
    const retentionValue = annualDepartures * retentionLift * 250000;

    return Math.round(patientAccessValue + locumValue + retentionValue);
  };

  const enabledDrivers = availableDriverConfigs.filter(d => docDrivers[d.id]?.enabled);
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
            Capture value beyond time savings
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Better documentation creates downstream value. Select the drivers that apply to your organization.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {availableDriverConfigs.map((driver, index) => {
              const Icon = driver.icon;
              const isEnabled = docDrivers[driver.id]?.enabled || false;
              const driverCalc = calculateDriverValue(driver.id);
              const isExpanded = expandedDriver === driver.id;
              const currentValue = docDrivers[driver.id]?.value || 0;

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
                  <button
                    type="button"
                    onClick={() => handleToggleDriver(driver.id)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleToggleDriver(driver.id);
                    }}
                    className="w-full p-5 text-left touch-manipulation cursor-pointer"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    data-testid={`card-${driver.id}`}
                  >
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
                          <div
                            className="flex items-center justify-center min-h-[48px] min-w-[48px] p-2"
                            data-testid={`toggle-${driver.id}`}
                          >
                            {isEnabled ? (
                              <ToggleRight className="w-10 h-10 text-[#EA2C00]" />
                            ) : (
                              <ToggleLeft className="w-10 h-10 text-slate-300" />
                            )}
                          </div>
                        </div>
                        <p className={`text-sm ${isEnabled ? 'text-slate-600' : 'text-slate-400'}`}>{driver.description}</p>
                        <p className={`text-xs mt-1 ${isEnabled ? 'text-slate-400' : 'text-slate-300'}`}>{driver.detail}</p>
                      </div>
                    </div>
                  </button>

                  {/* Slider and value - only when enabled */}
                  <AnimatePresence>
                    {isEnabled && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pt-4 pb-5 border-t border-slate-100">
                            {/* Preset buttons */}
                            <div className="flex items-center gap-2 mb-4">
                              {driver.presets.map((preset) => {
                                const isSelected = currentValue === preset.value;
                                return (
                                  <button
                                    key={preset.value}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDriverValueChange(driver.id, preset.value);
                                    }}
                                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                      isSelected
                                        ? 'bg-[#EA2C00] text-white shadow-sm'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    }`}
                                    data-testid={`preset-${driver.id}-${preset.label.toLowerCase()}`}
                                  >
                                    <div className="text-center">
                                      <span className="block">{preset.label}</span>
                                      <span className={`block text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                        {preset.value}{driver.suffix}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom value input */}
                            <div className="flex items-center justify-center gap-3 mb-4">
                              <span className="text-sm text-slate-500">or enter custom:</span>
                              <div className="relative">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min={driver.min}
                                  max={driver.max}
                                  step={driver.step}
                                  value={currentValue}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val >= driver.min && val <= driver.max) {
                                      handleDriverValueChange(driver.id, val);
                                    }
                                  }}
                                  className="w-20 py-2 px-3 text-center text-lg font-semibold text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 transition-all"
                                  data-testid={`input-${driver.id}`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                                  {driver.suffix}
                                </span>
                              </div>
                            </div>

                            {/* Value display row */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
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
                {availableDriverConfigs.map(driver => {
                  const isEnabled = docDrivers[driver.id]?.enabled || false;
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
            Continue to Investment
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
