import { useState, useMemo } from "react";
import { ArrowRight, Users, Clock, Heart, Check, ChevronDown, ChevronUp, Calculator, ToggleLeft, ToggleRight, Pencil, Info, Settings, X, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState, type TimeAllocation } from "./ExploreFlow";

interface ExploreTimeAllocationProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

interface AllocationOption {
  id: keyof TimeAllocation;
  label: string;
  description: string;
  icon: typeof Users;
  valueLabel: string;
  isOptional?: boolean;
}

const OUTPATIENT_ALLOCATION_OPTIONS: AllocationOption[] = [
  {
    id: 'patientAccess',
    label: 'Patient Access',
    description: 'See more patients and reduce wait times',
    icon: Users,
    valueLabel: 'New visits enabled',
  },
  {
    id: 'reducingLocums',
    label: 'Reduce Locums & Overtime',
    description: 'Lower premium labor costs',
    icon: Clock,
    valueLabel: 'Premium hours avoided',
    isOptional: true,
  },
  {
    id: 'clinicianWellbeing',
    label: 'Clinician Wellbeing',
    description: 'Improve retention and reduce burnout',
    icon: Heart,
    valueLabel: 'Retention improvement',
  },
];

const ED_ALLOCATION_OPTIONS: AllocationOption[] = [
  {
    id: 'patientAccess',
    label: 'Throughput & LWBS Reduction',
    description: 'Reduce left-without-being-seen rates and increase patient throughput',
    icon: Users,
    valueLabel: 'Additional patients seen',
  },
  {
    id: 'reducingLocums',
    label: 'Physician Retention',
    description: 'Reduce burnout-driven attrition and recruitment costs',
    icon: Clock,
    valueLabel: 'Retention improvement',
  },
  {
    id: 'clinicianWellbeing',
    label: 'Clinician Wellbeing',
    description: 'Improve work-life balance and job satisfaction',
    icon: Heart,
    valueLabel: 'Satisfaction improvement',
  },
];

const INPATIENT_ALLOCATION_OPTIONS: AllocationOption[] = [
  {
    id: 'patientAccess',
    label: 'Documentation Efficiency',
    description: 'Get home earlier, finish notes during rounds instead of late at night',
    icon: Clock,
    valueLabel: 'Hours returned to life',
  },
  {
    id: 'reducingLocums',
    label: 'Hospitalist Retention',
    description: 'Reduce burnout-driven departures and avoid costly replacements',
    icon: Users,
    valueLabel: 'Retention improvement',
  },
  {
    id: 'clinicianWellbeing',
    label: 'Clinician Wellbeing',
    description: 'Improve work-life balance and job satisfaction',
    icon: Heart,
    valueLabel: 'Quality of life',
  },
];

const NURSING_ALLOCATION_OPTIONS: AllocationOption[] = [
  {
    id: 'patientAccess',
    label: 'Direct Patient Care',
    description: 'More time at the bedside, better patient relationships and outcomes',
    icon: Heart,
    valueLabel: 'Hours back to patients',
  },
  {
    id: 'reducingLocums',
    label: 'Nurse Retention',
    description: 'Reduce turnover and avoid costly agency/travel nurse reliance',
    icon: Users,
    valueLabel: 'Retention improvement',
  },
  {
    id: 'clinicianWellbeing',
    label: 'Nurse Wellbeing',
    description: 'Reduce burnout and improve job satisfaction',
    icon: Clock,
    valueLabel: 'Wellbeing improvement',
  },
];

const getPresetsForLocums = (includeLocums: boolean) => {
  if (includeLocums) {
    return [
      { label: 'Balanced', allocation: { patientAccess: 40, reducingLocums: 30, clinicianWellbeing: 30 } },
      { label: 'Growth Focus', allocation: { patientAccess: 60, reducingLocums: 20, clinicianWellbeing: 20 } },
      { label: 'Cost Focus', allocation: { patientAccess: 20, reducingLocums: 50, clinicianWellbeing: 30 } },
      { label: 'Retention Focus', allocation: { patientAccess: 25, reducingLocums: 25, clinicianWellbeing: 50 } },
    ];
  } else {
    return [
      { label: 'Balanced', allocation: { patientAccess: 50, reducingLocums: 0, clinicianWellbeing: 50 } },
      { label: 'Growth Focus', allocation: { patientAccess: 70, reducingLocums: 0, clinicianWellbeing: 30 } },
      { label: 'Retention Focus', allocation: { patientAccess: 30, reducingLocums: 0, clinicianWellbeing: 70 } },
    ];
  }
};

const ED_PRESETS = [
  { label: 'Balanced', allocation: { patientAccess: 40, reducingLocums: 30, clinicianWellbeing: 30 } },
  { label: 'Throughput Focus', allocation: { patientAccess: 60, reducingLocums: 20, clinicianWellbeing: 20 } },
  { label: 'Retention Focus', allocation: { patientAccess: 25, reducingLocums: 45, clinicianWellbeing: 30 } },
  { label: 'Wellbeing Focus', allocation: { patientAccess: 25, reducingLocums: 25, clinicianWellbeing: 50 } },
];

const INPATIENT_PRESETS = [
  { label: 'Balanced', allocation: { patientAccess: 30, reducingLocums: 40, clinicianWellbeing: 30 } },
  { label: 'Retention Focus', allocation: { patientAccess: 20, reducingLocums: 55, clinicianWellbeing: 25 } },
  { label: 'Wellbeing Focus', allocation: { patientAccess: 25, reducingLocums: 25, clinicianWellbeing: 50 } },
  { label: 'Efficiency Focus', allocation: { patientAccess: 50, reducingLocums: 30, clinicianWellbeing: 20 } },
];

const NURSING_PRESETS = [
  { label: 'Balanced', allocation: { patientAccess: 35, reducingLocums: 35, clinicianWellbeing: 30 } },
  { label: 'Patient Care Focus', allocation: { patientAccess: 55, reducingLocums: 25, clinicianWellbeing: 20 } },
  { label: 'Retention Focus', allocation: { patientAccess: 25, reducingLocums: 50, clinicianWellbeing: 25 } },
  { label: 'Wellbeing Focus', allocation: { patientAccess: 25, reducingLocums: 25, clinicianWellbeing: 50 } },
];

interface EditableAssumptions {
  visitValue: number;
  visitDuration: number;
  locumHourlyCost: number;
  turnoverCost: number;
  baselineTurnoverRate: number;
  atRiskMultiplier: number;
  patientAccessRealization: number;
  locumRealization: number;
}

const DEFAULT_ASSUMPTIONS: EditableAssumptions = {
  visitValue: 200,
  visitDuration: 30,
  locumHourlyCost: 150,
  turnoverCost: 250000,
  baselineTurnoverRate: 8,
  atRiskMultiplier: 2,
  patientAccessRealization: 20,
  locumRealization: 60,
};

// Threshold-based wellbeing tiers
interface WellbeingThreshold {
  minHours: number;
  maxHours: number;
  label: string;
  rate: number;
  color: string;
  bgColor: string;
}

const WELLBEING_THRESHOLDS: WellbeingThreshold[] = [
  { minHours: 0, maxHours: 1, label: 'MINIMAL', rate: 0.05, color: 'text-slate-500', bgColor: 'bg-slate-100' },
  { minHours: 1, maxHours: 2, label: 'MODERATE', rate: 0.15, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { minHours: 2, maxHours: 3, label: 'SIGNIFICANT', rate: 0.25, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { minHours: 3, maxHours: Infinity, label: 'MAXIMUM', rate: 0.30, color: 'text-[#EA2C00]', bgColor: 'bg-[#FFF5F2]' },
];

function getWellbeingThreshold(hoursPerWeek: number): WellbeingThreshold {
  return WELLBEING_THRESHOLDS.find(t => hoursPerWeek >= t.minHours && hoursPerWeek < t.maxHours) || WELLBEING_THRESHOLDS[0];
}

// Info Tooltip component with accessibility
function InfoTooltip({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 focus:ring-2 focus:ring-[#EA2C00]/30 focus:outline-none flex items-center justify-center transition-colors"
        data-testid="button-info-tooltip"
      >
        <Info className="w-2.5 h-2.5 text-slate-600" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl"
          >
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-slate-900" />
            <div className="relative">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Settings Modal component
function SettingsModal({ 
  isOpen, 
  onClose, 
  title,
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-black">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            data-testid="button-close-modal"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

// Editable input field for modal
function ModalInput({ 
  label, 
  value, 
  onChange, 
  prefix = '', 
  suffix = '',
  min = 0,
  max = 999999,
  step = 1,
  hint,
}: { 
  label: string;
  value: number; 
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const num = parseFloat(e.target.value);
            if (!isNaN(num) && num >= min && num <= max) {
              onChange(num);
            }
          }}
          min={min}
          max={max}
          step={step}
          className={`w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 focus:border-[#EA2C00] transition-all ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''}`}
          data-testid="input-modal-field"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Slider input for modal
function ModalSlider({ 
  label, 
  value, 
  onChange, 
  min,
  max,
  suffix = '%',
  hint,
}: { 
  label: string;
  value: number; 
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-bold text-[#EA2C00]">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
        data-testid="slider-modal-field"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

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
          className="w-20 px-2 py-1 text-sm font-semibold text-[#EA2C00] bg-white border-2 border-[#EA2C00] rounded-lg focus:outline-none"
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
      className="inline-flex items-center gap-1 text-sm font-semibold text-[#EA2C00] bg-[#EA2C00]/5 hover:bg-[#EA2C00]/15 px-2 py-1 rounded-lg transition-colors"
      data-testid="button-edit-value"
    >
      {prefix}{value.toLocaleString()}{suffix}
      <Pencil className="w-3 h-3" />
    </button>
  );
}

const TIME_ALLOCATION_CONTEXT = {
  outpatient: {
    title: "Where should recovered time go?",
    subtitle: "Not all time savings translate equally to financial value.",
    whyItMatters: "Organizations realize time savings differently. Some reinvest in seeing more patients. Others reduce expensive locum coverage. Still others prioritize clinician wellbeing to improve retention. Your allocation reflects your strategic priorities and directly shapes the financial model.",
  },
  ed: {
    title: "How will your ED use recovered time?",
    subtitle: "ED time savings flow through different value channels.",
    whyItMatters: "In the ED, recovered documentation time can reduce LWBS rates (seeing more patients), improve physician retention (reducing the $500K+ replacement cost), or enhance work-life balance. Your allocation tells us which outcomes matter most to your leadership.",
  },
  inpatient: {
    title: "How will your hospitalist program benefit?",
    subtitle: "Inpatient time savings don't create more patients—but they create immense value.",
    whyItMatters: "Hospitalists don't see more patients when they document faster—census is driven by admissions. But the value is real: physicians get their lives back (protecting your workforce), and reduced burnout drives retention (avoiding $300K+ replacement costs). Two value streams with compounding impact.",
  },
  nursing: {
    title: "How will your nursing team benefit?",
    subtitle: "Nursing time savings translate directly to patient care and retention.",
    whyItMatters: "Nurses spend up to 35% of their time on documentation. Recovered time means more time at the bedside, better patient relationships, and reduced burnout. In a profession with 20%+ annual turnover and agency nurse costs of $150+/hour, the retention value alone is substantial.",
  },
};

export default function ExploreTimeAllocation({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: ExploreTimeAllocationProps) {
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';
  const isNursing = state.careSetting === 'nursing';
  const isOutpatient = !isED && !isInpatient && !isNursing;
  
  const ALLOCATION_OPTIONS = isNursing 
    ? NURSING_ALLOCATION_OPTIONS 
    : isInpatient 
      ? INPATIENT_ALLOCATION_OPTIONS 
      : isED 
        ? ED_ALLOCATION_OPTIONS 
        : OUTPATIENT_ALLOCATION_OPTIONS;
  const context = isNursing 
    ? TIME_ALLOCATION_CONTEXT.nursing 
    : isInpatient 
      ? TIME_ALLOCATION_CONTEXT.inpatient 
      : isED 
        ? TIME_ALLOCATION_CONTEXT.ed 
        : TIME_ALLOCATION_CONTEXT.outpatient;
  
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [includeLocums, setIncludeLocums] = useState(isED || isInpatient || isNursing ? true : false);
  const [assumptions, setAssumptions] = useState<EditableAssumptions>(DEFAULT_ASSUMPTIONS);
  const [patientAccessSettingsOpen, setPatientAccessSettingsOpen] = useState(false);
  const [wellbeingSettingsOpen, setWellbeingSettingsOpen] = useState(false);

  const updateAssumption = (key: keyof EditableAssumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleLocums = () => {
    const newIncludeLocums = !includeLocums;
    setIncludeLocums(newIncludeLocums);
    
    if (!newIncludeLocums) {
      const currentLocums = state.timeAllocation.reducingLocums;
      const half = Math.round(currentLocums / 2);
      updateState({
        timeAllocation: {
          patientAccess: state.timeAllocation.patientAccess + half,
          reducingLocums: 0,
          clinicianWellbeing: state.timeAllocation.clinicianWellbeing + (currentLocums - half),
        }
      });
    } else {
      updateState({
        timeAllocation: {
          patientAccess: 40,
          reducingLocums: 30,
          clinicianWellbeing: 30,
        }
      });
    }
  };

  const handleSliderChange = (id: keyof TimeAllocation, newValue: number) => {
    const current = { ...state.timeAllocation };
    const oldValue = current[id];
    const diff = newValue - oldValue;
    
    const adjustableKeys = (Object.keys(current) as (keyof TimeAllocation)[])
      .filter(k => k !== id && (includeLocums || k !== 'reducingLocums'));
    const otherTotal = adjustableKeys.reduce((sum, k) => sum + current[k], 0);
    
    if (otherTotal > 0) {
      adjustableKeys.forEach(k => {
        const ratio = current[k] / otherTotal;
        current[k] = Math.max(0, Math.round(current[k] - diff * ratio));
      });
    }
    
    current[id] = newValue;
    
    const total = current.patientAccess + (includeLocums ? current.reducingLocums : 0) + current.clinicianWellbeing;
    if (total !== 100) {
      const adjustment = 100 - total;
      const adjustKey = adjustableKeys.find(k => current[k] > 0) || adjustableKeys[0];
      if (adjustKey) {
        current[adjustKey] = Math.max(0, current[adjustKey] + adjustment);
      }
    }
    
    updateState({ timeAllocation: current });
  };

  const handlePreset = (preset: { allocation: TimeAllocation }) => {
    updateState({ timeAllocation: preset.allocation });
  };

  const getHoursForCategory = (id: keyof TimeAllocation) => {
    return Math.round(totalHoursSaved * (state.timeAllocation[id] / 100));
  };

  // Threshold-based wellbeing calculation with guards for zero values
  const wellbeingCalculation = useMemo(() => {
    // Guard against zero values to prevent NaN/Infinity
    const safeProviders = Math.max(1, state.numberOfProviders);
    const safeTotalHours = Math.max(1, totalHoursSaved);
    
    const hoursToWellbeing = safeTotalHours * (state.timeAllocation.clinicianWellbeing / 100);
    const hoursPerProviderPerWeek = (hoursToWellbeing / safeProviders) / 52;
    
    const threshold = getWellbeingThreshold(hoursPerProviderPerWeek);
    const turnoverReductionRate = threshold.rate;
    
    const baselineTurnoverRate = assumptions.baselineTurnoverRate / 100;
    
    // Corrected formula:
    // atRiskProviders = providers who are at elevated risk of leaving (burnout, dissatisfaction)
    // This is baseline turnover × at-risk multiplier (e.g., 8% turnover × 2 = 16% of providers at risk)
    const atRiskProviders = safeProviders * baselineTurnoverRate * assumptions.atRiskMultiplier;
    
    // From the at-risk pool, the reduction rate determines how many we retain
    // providersRetained = at-risk providers × reduction rate based on time given back
    const providersRetained = atRiskProviders * turnoverReductionRate;
    const value = providersRetained * assumptions.turnoverCost;
    
    // Calculate next threshold info for nudge
    const currentThresholdIndex = WELLBEING_THRESHOLDS.findIndex(t => t.label === threshold.label);
    const nextThreshold = currentThresholdIndex < WELLBEING_THRESHOLDS.length - 1 
      ? WELLBEING_THRESHOLDS[currentThresholdIndex + 1] 
      : null;
    
    let allocationForNextThreshold: number | null = null;
    let valueAtNextThreshold: number | null = null;
    if (nextThreshold && hoursPerProviderPerWeek < nextThreshold.minHours) {
      const hoursNeeded = nextThreshold.minHours * safeProviders * 52;
      allocationForNextThreshold = Math.min(100, Math.ceil((hoursNeeded / safeTotalHours) * 100));
      
      const nextProvidersRetained = atRiskProviders * nextThreshold.rate;
      valueAtNextThreshold = nextProvidersRetained * assumptions.turnoverCost;
    }
    
    return {
      hoursToWellbeing,
      hoursPerProviderPerWeek,
      threshold,
      turnoverReductionRate,
      atRiskProviders,
      providersRetained,
      value: Math.round(value),
      nextThreshold,
      allocationForNextThreshold,
      valueAtNextThreshold,
    };
  }, [totalHoursSaved, state.timeAllocation.clinicianWellbeing, state.numberOfProviders, assumptions]);

  const calculateDriverValue = (id: keyof TimeAllocation) => {
    const hours = getHoursForCategory(id);
    
    switch (id) {
      case 'patientAccess': {
        const realizationRate = assumptions.patientAccessRealization / 100;
        const avgVisitLengthHours = assumptions.visitDuration / 60;
        const potentialVisits = hours / avgVisitLengthHours;
        const realizedVisits = potentialVisits * realizationRate;
        const value = realizedVisits * assumptions.visitValue;
        
        return {
          value: Math.round(value),
          hours,
          potentialVisits: Math.round(potentialVisits),
          realizedVisits: Math.round(realizedVisits),
          realizationRate: assumptions.patientAccessRealization,
        };
      }
      case 'reducingLocums': {
        const realizationRate = assumptions.locumRealization / 100;
        const realizedHours = hours * realizationRate;
        const value = realizedHours * assumptions.locumHourlyCost;
        return {
          value: Math.round(value),
          hours,
          realizedHours: Math.round(realizedHours),
          realizationRate: assumptions.locumRealization,
        };
      }
      case 'clinicianWellbeing': {
        return {
          hours,
          ...wellbeingCalculation,
        };
      }
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedDriver(expandedDriver === id ? null : id);
  };

  const presets = isNursing 
    ? NURSING_PRESETS 
    : isInpatient 
      ? INPATIENT_PRESETS 
      : isED 
        ? ED_PRESETS 
        : getPresetsForLocums(includeLocums);
  const visibleOptions = (isED || isInpatient || isNursing) ? ALLOCATION_OPTIONS : ALLOCATION_OPTIONS.filter(opt => !opt.isOptional || includeLocums);

  const totalAllocated = visibleOptions.reduce((sum, opt) => sum + state.timeAllocation[opt.id], 0);
  const totalTimeValue = visibleOptions.reduce((sum, opt) => {
    const calc = calculateDriverValue(opt.id);
    return sum + (calc?.value || 0);
  }, 0);

  const formatNumber = (n: number) => n.toLocaleString();

  // Render breakdown content for each driver
  const renderBreakdown = (id: keyof TimeAllocation) => {
    const calc = calculateDriverValue(id);
    if (!calc) return null;
    
    if (id === 'patientAccess' && isOutpatient) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-800">Step-by-Step Calculation</span>
            <button
              onClick={() => setPatientAccessSettingsOpen(true)}
              className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
              data-testid="button-patient-access-settings"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Hours allocated</span>
              <span className="text-slate-900">{calc.hours.toLocaleString()} hrs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">÷ Avg visit length</span>
              <span className="text-slate-900">{assumptions.visitDuration} min</span>
            </div>
            <div className="border-t border-dashed border-slate-200 my-1" />
            <div className="flex justify-between">
              <span className="text-slate-500">= Potential visits</span>
              <span className="text-slate-900 font-semibold">{calc.potentialVisits?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between bg-[#FFF5F2] -mx-3 px-3 py-1.5 rounded">
              <span className="flex items-center gap-1.5 text-[#EA2C00]">
                × Realization rate
                <InfoTooltip>
                  <p className="font-semibold mb-1">Why only {assumptions.patientAccessRealization}%?</p>
                  <p>Scheduling constraints, not all slots get filled, provider preference for breathing room, and administrative requirements.</p>
                  <p className="mt-2 text-white/70">Industry range: 10-40%</p>
                </InfoTooltip>
              </span>
              <span className="text-[#EA2C00] font-semibold">{assumptions.patientAccessRealization}%</span>
            </div>
            <div className="border-t border-dashed border-slate-200 my-1" />
            <div className="flex justify-between">
              <span className="text-slate-500">= Realized visits</span>
              <span className="text-slate-900 font-semibold">{calc.realizedVisits?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">× Revenue per visit</span>
              <span className="text-slate-900">${assumptions.visitValue}</span>
            </div>
            <div className="border-t border-slate-300 mt-2 pt-2" />
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-800">Annual Value</span>
              <span className="font-bold text-[#EA2C00]">${calc.value.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    
    if (id === 'clinicianWellbeing' && isOutpatient) {
      const wc = wellbeingCalculation;
      const showNudge = wc.nextThreshold && wc.allocationForNextThreshold && 
        (wc.allocationForNextThreshold - state.timeAllocation.clinicianWellbeing) <= 15;
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Retention Impact Analysis</span>
            <button
              onClick={() => setWellbeingSettingsOpen(true)}
              className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
              data-testid="button-wellbeing-settings"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
          
          {/* Hours per provider metric */}
          <div className={`rounded-lg p-3 ${wc.threshold.bgColor} border border-slate-100`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Hours per provider per week</span>
              <span className="text-lg font-bold text-slate-900">{wc.hoursPerProviderPerWeek.toFixed(1)} hrs</span>
            </div>
          </div>
          
          {/* Threshold visualization */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">IMPACT THRESHOLD</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${wc.threshold.bgColor} ${wc.threshold.color}`}>
                {wc.threshold.label}
              </span>
            </div>
            
            <div className="space-y-1 text-xs font-mono">
              {WELLBEING_THRESHOLDS.map((t, i) => {
                const isCurrent = t.label === wc.threshold.label;
                return (
                  <div 
                    key={t.label} 
                    className={`flex items-center gap-2 py-1 px-2 rounded ${isCurrent ? t.bgColor : ''}`}
                  >
                    <span className="text-slate-400 w-4">{i === 0 ? '├' : i === WELLBEING_THRESHOLDS.length - 1 ? '└' : '├'}─</span>
                    <span className={`w-20 ${isCurrent ? t.color + ' font-bold' : 'text-slate-500'}`}>
                      {t.maxHours === Infinity ? `${t.minHours}+ hrs` : `${t.minHours}-${t.maxHours} hrs`}:
                    </span>
                    <span className={`${isCurrent ? t.color + ' font-bold' : 'text-slate-500'}`}>
                      {t.label} ({Math.round(t.rate * 100)}% reduction)
                    </span>
                    {isCurrent && <span className="text-xs ml-auto font-bold text-slate-800">← YOU ARE HERE</span>}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Nudge message */}
          {showNudge && wc.valueAtNextThreshold && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 bg-amber-50 rounded-lg p-3 border border-amber-200"
            >
              <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">At {wc.allocationForNextThreshold}% allocation</span>, you'd reach the{' '}
                <span className="font-semibold">{wc.nextThreshold?.label}</span> tier with a value of{' '}
                <span className="font-bold">${wc.valueAtNextThreshold.toLocaleString()}</span>
              </p>
            </motion.div>
          )}
          
          {/* Step-by-step math */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-xs space-y-2">
            <p className="text-xs font-semibold text-slate-600 mb-2 font-sans">Step-by-Step Calculation</p>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Providers</span>
              <span className="text-slate-900">{state.numberOfProviders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                × At-risk multiplier
                <InfoTooltip>
                  <p className="font-semibold mb-1">Why 2× the turnover rate?</p>
                  <p>Research shows that for every provider who leaves, approximately 2× that percentage are actively considering leaving or at high burnout risk.</p>
                </InfoTooltip>
              </span>
              <span className="text-slate-900">{assumptions.atRiskMultiplier}× {assumptions.baselineTurnoverRate}%</span>
            </div>
            <div className="border-t border-dashed border-slate-200 my-1" />
            <div className="flex justify-between">
              <span className="text-slate-500">= Providers at risk</span>
              <span className="text-slate-900 font-semibold">{wc.atRiskProviders.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between bg-[#FFF5F2] -mx-3 px-3 py-1.5 rounded">
              <span className="text-[#EA2C00]">× Retention lift ({wc.threshold.label})</span>
              <span className="text-[#EA2C00] font-semibold">{Math.round(wc.turnoverReductionRate * 100)}%</span>
            </div>
            <div className="border-t border-dashed border-slate-200 my-1" />
            <div className="flex justify-between">
              <span className="text-slate-500">= Providers retained</span>
              <span className="text-slate-900 font-semibold">{wc.providersRetained.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">× Cost per turnover</span>
              <span className="text-slate-900">${assumptions.turnoverCost.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-300 mt-2 pt-2" />
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-800">Annual Value</span>
              <span className="font-bold text-[#EA2C00]">${wc.value.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    
    // Default breakdown for other drivers
    if (id === 'reducingLocums') {
      return (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Hours allocated</span>
            <span className="font-semibold text-black">{calc.hours.toLocaleString()} hrs</span>
          </div>
          <div className="flex items-center justify-between py-1 bg-[#FFF5F2] -mx-3 px-3 rounded">
            <span className="font-medium text-[#EA2C00]">Realization rate</span>
            <EditableValue 
              value={assumptions.locumRealization} 
              onChange={(v) => updateAssumption('locumRealization', v)}
              suffix="%"
              min={10}
              max={100}
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Locum hourly cost</span>
            <EditableValue 
              value={assumptions.locumHourlyCost} 
              onChange={(v) => updateAssumption('locumHourlyCost', v)}
              prefix="$"
              min={50}
              max={500}
            />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-[#EA2C00]/20 mt-1">
            <span className="font-bold text-black">Annual savings</span>
            <span className="font-bold text-[#F07B5F]">${calc.value.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    
    // For non-outpatient wellbeing or non-enhanced
    return (
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-600">Hours allocated</span>
          <span className="font-semibold text-black">{calc.hours.toLocaleString()} hrs</span>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-[#EA2C00]/20 mt-1">
          <span className="font-bold text-black">Annual value</span>
          <span className="font-bold text-[#F07B5F]">${calc.value.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <UnifiedHeader
        pathType="explore"
        currentStep={4}
        totalSteps={6}
        stepName="Time Allocation"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
                {isInpatient ? "Allocate Hospitalist Efficiency" : isED ? "Allocate ED Efficiency Gains" : "Allocate Your Savings"}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
                {isInpatient ? "How will hospitalists benefit?" : isED ? "How will you use this time?" : "Where does this time go?"}
              </h1>
              <p className="text-slate-600 mb-4">
                You're unlocking <span className="font-bold text-[#EA2C00]">{totalHoursSaved.toLocaleString()} hours</span>. {context.subtitle}
              </p>
              <div className="bg-slate-100 rounded-lg p-3 mb-3">
                <p className="text-slate-500 text-xs">
                  <span className="font-semibold text-slate-700">Why this matters:</span> {context.whyItMatters}
                </p>
              </div>
              <div className="bg-[#FFF5F2] rounded-lg p-3">
                <p className="text-slate-500 text-xs">
                  <span className="font-semibold text-[#EA2C00]">Realization rates:</span> {isNursing
                    ? "Not every hour saved translates directly to dollars. Nursing constraints like staffing ratios and patient acuity mean time savings primarily flow to care quality and retention. Each driver shows its realization rate—tap \"See the math\" to adjust."
                    : isInpatient
                      ? "Not every hour saved translates to dollars. Inpatient constraints mean time savings primarily flow to quality of life and retention. Each driver shows its realization rate—tap \"See the math\" to adjust."
                      : isED 
                        ? "Not every saved hour converts to dollars. ED constraints like staffing minimums and throughput caps mean only a portion of time savings realizes as value. Each driver shows its realization rate—tap \"See the math\" to adjust."
                        : "Not every hour saved creates a dollar. Scheduling constraints, minimum shift requirements, and real-world factors mean only a portion converts to value. Each driver includes a realization rate—tap \"See the math\" to understand and adjust these assumptions."
                  }
                </p>
              </div>
            </motion.div>

            {/* Controls Row */}
            <motion.div
              className="flex flex-wrap items-center gap-2 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.4 }}
            >
              {presets.map((preset) => {
                const isActive = 
                  state.timeAllocation.patientAccess === preset.allocation.patientAccess &&
                  state.timeAllocation.reducingLocums === preset.allocation.reducingLocums &&
                  state.timeAllocation.clinicianWellbeing === preset.allocation.clinicianWellbeing;
                
                return (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-black text-white' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                      }
                    `}
                    data-testid={`button-preset-${preset.label.toLowerCase().replace(' ', '-')}`}
                  >
                    {preset.label}
                    {isActive && <Check className="w-3.5 h-3.5 ml-1.5 inline" />}
                  </button>
                );
              })}

              {!isED && (
                <button
                  onClick={handleToggleLocums}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${includeLocums 
                      ? 'bg-[#EA2C00] text-white' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                    }
                  `}
                  data-testid="button-toggle-locums"
                >
                  {includeLocums ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  {includeLocums ? 'Locums on' : '+ Locums'}
                </button>
              )}
            </motion.div>

            {/* Allocation warning */}
            <AnimatePresence>
              {totalAllocated !== 100 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>Allocations must total 100%. Currently at <span className="font-bold">{totalAllocated}%</span>.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Allocation Cards */}
            <div className="space-y-4">
              {visibleOptions.map((option, index) => {
                const Icon = option.icon;
                const value = state.timeAllocation[option.id];
                const hours = getHoursForCategory(option.id);
                const driverCalc = calculateDriverValue(option.id);
                const isExpanded = expandedDriver === option.id;
                
                // Threshold animation for wellbeing
                const isWellbeing = option.id === 'clinicianWellbeing' && isOutpatient;
                const thresholdBg = isWellbeing ? wellbeingCalculation.threshold.bgColor : '';
                
                return (
                  <motion.div
                    key={option.id}
                    className={`bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 ${isWellbeing ? 'ring-2 ring-offset-1 ' + (wellbeingCalculation.threshold.label === 'MAXIMUM' ? 'ring-[#EA2C00]/30' : wellbeingCalculation.threshold.label === 'SIGNIFICANT' ? 'ring-orange-300' : wellbeingCalculation.threshold.label === 'MODERATE' ? 'ring-amber-200' : 'ring-transparent') : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isWellbeing ? thresholdBg : 'bg-[#FFF5F2]'}`}>
                          <Icon className={`w-5 h-5 ${isWellbeing ? wellbeingCalculation.threshold.color : 'text-[#EA2C00]'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-black">{option.label}</h3>
                              {isWellbeing && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${wellbeingCalculation.threshold.bgColor} ${wellbeingCalculation.threshold.color}`}>
                                  {wellbeingCalculation.threshold.label}
                                </span>
                              )}
                            </div>
                            <span className="text-2xl font-bold text-black">{value}%</span>
                          </div>
                          <p className="text-sm text-slate-500">{option.description}</p>
                          {isWellbeing && (
                            <p className="text-xs text-slate-400 mt-1">
                              {wellbeingCalculation.hoursPerProviderPerWeek.toFixed(1)} hrs/provider/week
                            </p>
                          )}
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={value}
                        onChange={(e) => handleSliderChange(option.id, Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                        data-testid={`slider-${option.id}`}
                      />

                      {/* Value row */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">{hours.toLocaleString()} hours → Annual Value</p>
                          <motion.p 
                            key={driverCalc?.value}
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.3 }}
                            className="text-xl font-bold text-[#F07B5F]"
                          >
                            ${driverCalc?.value.toLocaleString() || 0}
                          </motion.p>
                        </div>
                        
                        <button
                          onClick={() => toggleExpand(option.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                          data-testid={`button-expand-${option.id}`}
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>{isExpanded ? 'Hide' : 'See the math'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable math */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                              {renderBreakdown(option.id)}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* Continue Button - Mobile */}
            <motion.div 
              className="lg:hidden pt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Button
                onClick={onNext}
                disabled={totalAllocated !== 100}
                className={`
                  w-full h-12 font-semibold rounded-full transition-all duration-200
                  ${totalAllocated === 100
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

          {/* Time Savings Sidebar */}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Time Savings</h3>
                        <p className="text-xs text-white/50">Value summary</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      totalAllocated === 100 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {totalAllocated}%
                    </span>
                  </div>
                </div>

                {/* Big Number */}
                <div className="px-6 py-5 border-b border-white/10">
                  <p className="text-sm text-white/50 mb-1">Annual Value</p>
                  <motion.div 
                    key={totalTimeValue}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 0.3 }}
                    className="flex items-baseline gap-2"
                  >
                    <span className="text-4xl font-bold text-[#F07B5F]">
                      ${formatNumber(totalTimeValue)}
                    </span>
                  </motion.div>
                  <p className="text-xs text-white/40 mt-2">
                    From {formatNumber(totalHoursSaved)} hours saved
                  </p>
                </div>

                {/* Breakdown */}
                <div className="px-6 py-5 space-y-3">
                  {visibleOptions.map((option) => {
                    const Icon = option.icon;
                    const value = state.timeAllocation[option.id];
                    const driverCalc = calculateDriverValue(option.id);
                    
                    return (
                      <div key={option.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-white/50" />
                          <span className="text-sm text-white/70">{option.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-white">${formatNumber(driverCalc?.value || 0)}</span>
                          <span className="text-xs text-white/40 ml-1">({value}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Continue Button */}
                <div className="px-6 pb-6">
                  <Button
                    onClick={onNext}
                    disabled={totalAllocated !== 100}
                    className={`
                      w-full h-12 text-sm font-semibold rounded-full transition-all duration-200
                      ${totalAllocated === 100
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

      {/* Patient Access Settings Modal */}
      <AnimatePresence>
        {patientAccessSettingsOpen && (
          <SettingsModal
            isOpen={patientAccessSettingsOpen}
            onClose={() => setPatientAccessSettingsOpen(false)}
            title="Patient Access Settings"
          >
            <div className="space-y-5">
              <ModalSlider
                label="Realization Rate"
                value={assumptions.patientAccessRealization}
                onChange={(v) => updateAssumption('patientAccessRealization', v)}
                min={10}
                max={40}
                hint="What percentage of potential visit slots actually get filled? Industry range: 10-40%"
              />
              <ModalInput
                label="Revenue per Visit"
                value={assumptions.visitValue}
                onChange={(v) => updateAssumption('visitValue', v)}
                prefix="$"
                min={50}
                max={1000}
                hint="Average revenue generated per patient visit"
              />
              <ModalInput
                label="Average Visit Duration"
                value={assumptions.visitDuration}
                onChange={(v) => updateAssumption('visitDuration', v)}
                suffix=" min"
                min={10}
                max={120}
                hint="Average length of a patient visit in minutes"
              />
              <div className="pt-3 border-t border-slate-100">
                <Button
                  onClick={() => setPatientAccessSettingsOpen(false)}
                  className="w-full bg-black hover:bg-black/90 text-white"
                  data-testid="button-save-patient-access-settings"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </SettingsModal>
        )}
      </AnimatePresence>

      {/* Wellbeing Settings Modal */}
      <AnimatePresence>
        {wellbeingSettingsOpen && (
          <SettingsModal
            isOpen={wellbeingSettingsOpen}
            onClose={() => setWellbeingSettingsOpen(false)}
            title="Retention Settings"
          >
            <div className="space-y-5">
              <ModalInput
                label="Number of Providers"
                value={state.numberOfProviders}
                onChange={(v) => updateState({ numberOfProviders: v })}
                min={1}
                max={1000}
                hint="Total providers in your practice"
              />
              <ModalSlider
                label="Baseline Turnover Rate"
                value={assumptions.baselineTurnoverRate}
                onChange={(v) => updateAssumption('baselineTurnoverRate', v)}
                min={2}
                max={25}
                hint="Your current annual provider turnover percentage"
              />
              <ModalInput
                label="Cost per Turnover"
                value={assumptions.turnoverCost}
                onChange={(v) => updateAssumption('turnoverCost', v)}
                prefix="$"
                min={50000}
                max={1000000}
                step={10000}
                hint="Full cost to replace a provider (recruitment, onboarding, lost revenue)"
              />
              <ModalSlider
                label="At-Risk Multiplier"
                value={assumptions.atRiskMultiplier}
                onChange={(v) => updateAssumption('atRiskMultiplier', v)}
                min={1}
                max={4}
                suffix="×"
                hint="Advanced: How many providers are at risk for each one who leaves"
              />
              <div className="pt-3 border-t border-slate-100">
                <Button
                  onClick={() => setWellbeingSettingsOpen(false)}
                  className="w-full bg-black hover:bg-black/90 text-white"
                  data-testid="button-save-wellbeing-settings"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </SettingsModal>
        )}
      </AnimatePresence>
    </div>
  );
}
