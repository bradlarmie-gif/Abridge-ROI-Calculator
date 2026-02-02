import { useState, useMemo, useEffect } from "react";
import { ArrowRight, Users, Clock, Heart, Check, ChevronDown, ChevronUp, Calculator, ToggleLeft, ToggleRight, Pencil, Info, Settings, X, Target, Zap, Star, AlertTriangle, Lock, LockOpen, HelpCircle } from "lucide-react";
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
    id: 'patientExperience',
    label: 'Patient Experience',
    description: 'Spend more time with complex patients and improve satisfaction',
    icon: Star,
    valueLabel: 'Quality time invested',
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
    label: 'Patient Throughput (LWBS Reduction)',
    description: 'Reduce walkouts and capture lost revenue',
    icon: Zap,
    valueLabel: 'Revenue recovered',
  },
  {
    id: 'patientExperience',
    label: 'Patient Experience',
    description: 'Improve satisfaction and communication',
    icon: Star,
    valueLabel: 'Experience impact',
  },
  {
    id: 'clinicianWellbeing',
    label: 'Physician Retention',
    description: 'Reduce burnout-driven attrition and recruitment costs',
    icon: Heart,
    valueLabel: 'Retention improvement',
  },
];

const INPATIENT_ALLOCATION_OPTIONS: AllocationOption[] = [
  {
    id: 'patientAccess',
    label: 'Clinical Operations',
    description: 'Better rounding and discharge planning',
    icon: Clock,
    valueLabel: 'Operations improvement',
  },
  {
    id: 'clinicianWellbeing',
    label: 'Physician Wellbeing',
    description: 'Reduce after-hours charting',
    icon: Heart,
    valueLabel: 'Retention improvement',
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
      { label: 'Balanced', allocation: { patientAccess: 30, patientExperience: 20, reducingLocums: 25, clinicianWellbeing: 25 } },
      { label: 'Growth Focus', allocation: { patientAccess: 45, patientExperience: 20, reducingLocums: 20, clinicianWellbeing: 15 } },
      { label: 'Cost Focus', allocation: { patientAccess: 15, patientExperience: 15, reducingLocums: 45, clinicianWellbeing: 25 } },
      { label: 'Retention Focus', allocation: { patientAccess: 15, patientExperience: 20, reducingLocums: 20, clinicianWellbeing: 45 } },
    ];
  } else {
    return [
      { label: 'Balanced', allocation: { patientAccess: 40, patientExperience: 30, reducingLocums: 0, clinicianWellbeing: 30 } },
      { label: 'Growth Focus', allocation: { patientAccess: 60, patientExperience: 25, reducingLocums: 0, clinicianWellbeing: 15 } },
      { label: 'Retention Focus', allocation: { patientAccess: 20, patientExperience: 30, reducingLocums: 0, clinicianWellbeing: 50 } },
    ];
  }
};

const ED_PRESETS = [
  { label: 'Balanced', allocation: { patientAccess: 30, patientExperience: 30, reducingLocums: 0, clinicianWellbeing: 40 } },
  { label: 'Throughput Focus', allocation: { patientAccess: 60, patientExperience: 20, reducingLocums: 0, clinicianWellbeing: 20 } },
  { label: 'Retention Focus', allocation: { patientAccess: 20, patientExperience: 20, reducingLocums: 0, clinicianWellbeing: 60 } },
];

const INPATIENT_PRESETS = [
  { label: 'Balanced', allocation: { patientAccess: 50, patientExperience: 0, reducingLocums: 0, clinicianWellbeing: 50 } },
  { label: 'Operations Focus', allocation: { patientAccess: 70, patientExperience: 0, reducingLocums: 0, clinicianWellbeing: 30 } },
  { label: 'Retention Focus', allocation: { patientAccess: 30, patientExperience: 0, reducingLocums: 0, clinicianWellbeing: 70 } },
];

const NURSING_PRESETS = [
  { label: 'Balanced', allocation: { patientAccess: 35, patientExperience: 0, reducingLocums: 35, clinicianWellbeing: 30 } },
  { label: 'Patient Care Focus', allocation: { patientAccess: 55, patientExperience: 0, reducingLocums: 25, clinicianWellbeing: 20 } },
  { label: 'Retention Focus', allocation: { patientAccess: 25, patientExperience: 0, reducingLocums: 50, clinicianWellbeing: 25 } },
  { label: 'Wellbeing Focus', allocation: { patientAccess: 25, patientExperience: 0, reducingLocums: 25, clinicianWellbeing: 50 } },
];

interface EditableAssumptions {
  visitValue: number;
  visitDuration: number;
  qualityTimeValue: number;
  locumHourlyCost: number;
  turnoverCost: number;
  baselineTurnoverRate: number;
  patientAccessRealization: number;
  locumRealization: number;
  // ED-specific LWBS assumptions
  edLwbsRate: number;
  edRetentionRate: number;
  edAbridgeAttribution: number;
  edVisitRevenue: number;
  edIncludeAdmissions: boolean;
  edAdmissionRate: number;
  edAdmissionRevenue: number;
  // Inpatient-specific LOS assumptions
  ipAdmissions: number;
  ipDocDelayRate: number;
  ipTimeRecoveredPerDischarge: number;
  ipRevenuePerBedHour: number;
  ipLosAttributionFactor: number;
  ipModelLosImpact: boolean;
}

const DEFAULT_ASSUMPTIONS: EditableAssumptions = {
  visitValue: 200,
  visitDuration: 30,
  qualityTimeValue: 50,
  locumHourlyCost: 150,
  turnoverCost: 250000,
  baselineTurnoverRate: 8,
  patientAccessRealization: 15,
  locumRealization: 60,
  // ED-specific LWBS defaults
  edLwbsRate: 3.5,
  edRetentionRate: 10,
  edAbridgeAttribution: 33,
  edVisitRevenue: 600,
  edIncludeAdmissions: true,
  edAdmissionRate: 12,
  edAdmissionRevenue: 15000,
  // Inpatient-specific LOS defaults
  ipAdmissions: 6500,
  ipDocDelayRate: 20,
  ipTimeRecoveredPerDischarge: 2,
  ipRevenuePerBedHour: 125,
  ipLosAttributionFactor: 25,
  ipModelLosImpact: false,
};

// Threshold-based wellbeing tiers (based on annual hours per provider)
interface WellbeingThreshold {
  minHoursAnnual: number;
  maxHoursAnnual: number;
  label: string;
  rateMin: number;
  rateMax: number;
  color: string;
  bgColor: string;
  description: string;
}

const WELLBEING_THRESHOLDS: WellbeingThreshold[] = [
  { minHoursAnnual: 0, maxHoursAnnual: 100, label: 'MINIMAL', rateMin: 0.03, rateMax: 0.05, color: 'text-slate-500', bgColor: 'bg-slate-100', description: '<2 hrs/week' },
  { minHoursAnnual: 100, maxHoursAnnual: 150, label: 'MODERATE', rateMin: 0.08, rateMax: 0.12, color: 'text-slate-600', bgColor: 'bg-slate-100', description: '2-3 hrs/week' },
  { minHoursAnnual: 150, maxHoursAnnual: Infinity, label: 'SIGNIFICANT', rateMin: 0.15, rateMax: 0.20, color: 'text-[#EA2C00]', bgColor: 'bg-slate-100', description: '3+ hrs/week' },
];

function getWellbeingThreshold(hoursPerProviderAnnual: number): WellbeingThreshold {
  return WELLBEING_THRESHOLDS.find(t => hoursPerProviderAnnual >= t.minHoursAnnual && hoursPerProviderAnnual < t.maxHoursAnnual) || WELLBEING_THRESHOLDS[0];
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
  const [edThroughputSettingsOpen, setEdThroughputSettingsOpen] = useState(false);
  const [ipOperationsSettingsOpen, setIpOperationsSettingsOpen] = useState(false);
  const [ipShowMetricsToTrack, setIpShowMetricsToTrack] = useState(false);
  
  // Editable percentage state
  const [editingCategory, setEditingCategory] = useState<keyof TimeAllocation | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  // Lock state for each allocation category
  const [lockedCategories, setLockedCategories] = useState<Set<keyof TimeAllocation>>(new Set());
  
  // Onboarding hints state
  const [showHints, setShowHints] = useState(() => {
    // Check if user has already interacted (stored in sessionStorage for this session)
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('timeAllocationHintsShown');
    }
    return true;
  });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showFirstClickFeedback, setShowFirstClickFeedback] = useState(false);
  const [showLockSuccessFeedback, setShowLockSuccessFeedback] = useState<keyof TimeAllocation | null>(null);
  
  // Auto-hide hints after 4 seconds or on first interaction
  useEffect(() => {
    if (showHints && !hasInteracted) {
      const timer = setTimeout(() => {
        setShowHints(false);
        setHasInteracted(true); // Prevent first-click feedback after passive dismissal
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('timeAllocationHintsShown', 'true');
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showHints, hasInteracted]);
  
  // Dismiss hints on any interaction
  const dismissHints = () => {
    if (showHints) {
      setShowHints(false);
      setHasInteracted(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('timeAllocationHintsShown', 'true');
      }
    }
  };

  const updateAssumption = (key: keyof EditableAssumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  // Toggle lock for a category
  const handleToggleLock = (id: keyof TimeAllocation) => {
    dismissHints();
    setLockedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        // Can't lock if already 2 are locked
        if (newSet.size >= 2) return prev;
        newSet.add(id);
        // Show success feedback when locking
        setShowLockSuccessFeedback(id);
        setTimeout(() => setShowLockSuccessFeedback(null), 800);
      }
      return newSet;
    });
  };

  // Get the auto-calculated category (when 2 are locked)
  const getAutoCalculatedCategory = (): keyof TimeAllocation | null => {
    if (lockedCategories.size !== 2) return null;
    // Compute visible categories inline (same logic as visibleOptions)
    const currentOptions = (isED || isInpatient || isNursing) 
      ? ALLOCATION_OPTIONS 
      : ALLOCATION_OPTIONS.filter(opt => !opt.isOptional || includeLocums);
    const allCategories = currentOptions.map(opt => opt.id);
    return allCategories.find(id => !lockedCategories.has(id)) || null;
  };

  // Check if a category is locked
  const isLocked = (id: keyof TimeAllocation) => lockedCategories.has(id);

  // Check if a category is auto-calculated
  const isAutoCalculated = (id: keyof TimeAllocation) => getAutoCalculatedCategory() === id;

  // Check if a category can be locked (max 2 locks)
  const canLock = (id: keyof TimeAllocation) => lockedCategories.size < 2 || lockedCategories.has(id);

  // Start editing a percentage
  const handleStartEdit = (id: keyof TimeAllocation) => {
    // If auto-calculated, can't edit
    if (isAutoCalculated(id)) return;
    dismissHints();
    // Show first click feedback
    if (!hasInteracted) {
      setShowFirstClickFeedback(true);
      setTimeout(() => setShowFirstClickFeedback(false), 500);
    }
    // If locked, unlock first
    if (isLocked(id)) {
      handleToggleLock(id);
    }
    setEditingCategory(id);
    setEditValue(state.timeAllocation[id].toString());
  };

  // Commit the edited percentage
  const handleCommitEdit = () => {
    if (!editingCategory) return;
    
    const newValue = Math.max(0, Math.min(100, parseInt(editValue) || 0));
    handleSliderChange(editingCategory, newValue);
    setEditingCategory(null);
    setEditValue('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditValue('');
  };

  // Increment/decrement by step
  const handleIncrement = (id: keyof TimeAllocation, step: number) => {
    // Can't adjust auto-calculated category
    if (isAutoCalculated(id)) return;
    dismissHints();
    const current = state.timeAllocation[id];
    const newValue = Math.max(0, Math.min(100, current + step));
    handleSliderChange(id, newValue);
  };

  // Find which category will be adjusted when editing
  const getAdjustingCategory = (editingId: keyof TimeAllocation): keyof TimeAllocation | null => {
    const current = { ...state.timeAllocation };
    const adjustableKeys = (Object.keys(current) as (keyof TimeAllocation)[])
      .filter(k => k !== editingId && (includeLocums || k !== 'reducingLocums'));
    
    if (adjustableKeys.length === 0) return null;
    return adjustableKeys.reduce((largest, k) => 
      current[k] > current[largest] ? k : largest
    , adjustableKeys[0]);
  };

  const handleToggleLocums = () => {
    dismissHints();
    const newIncludeLocums = !includeLocums;
    setIncludeLocums(newIncludeLocums);
    // Clear all locks when toggling locums
    setLockedCategories(new Set());
    
    if (!newIncludeLocums) {
      const currentLocums = state.timeAllocation.reducingLocums;
      const third = Math.round(currentLocums / 3);
      updateState({
        timeAllocation: {
          patientAccess: state.timeAllocation.patientAccess + third,
          patientExperience: state.timeAllocation.patientExperience + third,
          reducingLocums: 0,
          clinicianWellbeing: state.timeAllocation.clinicianWellbeing + (currentLocums - third * 2),
        }
      });
    } else {
      updateState({
        timeAllocation: {
          patientAccess: 30,
          patientExperience: 20,
          reducingLocums: 25,
          clinicianWellbeing: 25,
        }
      });
    }
  };

  const handleSliderChange = (id: keyof TimeAllocation, newValue: number) => {
    // Block changes to auto-calculated category
    if (isAutoCalculated(id)) return;
    
    const current = { ...state.timeAllocation };
    const oldValue = current[id];
    const diff = newValue - oldValue;
    
    // Get adjustable sliders (not the one being dragged, respect locums toggle, and respect locks)
    const adjustableKeys = (Object.keys(current) as (keyof TimeAllocation)[])
      .filter(k => k !== id && (includeLocums || k !== 'reducingLocums') && !lockedCategories.has(k));
    
    // If no adjustable keys, can't change
    if (adjustableKeys.length === 0) return;
    
    // Find the slider with the LARGEST percentage among adjustable keys (for use in multiple places)
    const largestKey = adjustableKeys.length > 0 
      ? adjustableKeys.reduce((largest, k) => current[k] > current[largest] ? k : largest, adjustableKeys[0])
      : null;
    
    // When 2 categories are locked, use explicit auto-calculation for the remaining category
    const autoCalcKey = getAutoCalculatedCategory();
    if (autoCalcKey && adjustableKeys.includes(autoCalcKey)) {
      // Set the edited value
      current[id] = Math.max(0, Math.min(100, newValue));
      
      // Calculate sum of all non-auto-calculated visible categories
      const visibleKeys = (Object.keys(current) as (keyof TimeAllocation)[])
        .filter(k => (includeLocums || k !== 'reducingLocums') && k !== autoCalcKey);
      const sumOthers = visibleKeys.reduce((sum, k) => sum + current[k], 0);
      
      // Auto-calculated category gets the remainder
      current[autoCalcKey] = Math.max(0, 100 - sumOthers);
    } else if (largestKey) {
      // Normal behavior: adjust the largest slider to absorb the change
      // This keeps other sliders fixed - only ONE slider adjusts
      const newLargestValue = current[largestKey] - diff;
      
      // Clamp the adjustment to valid range
      if (newLargestValue >= 0) {
        current[largestKey] = newLargestValue;
        current[id] = newValue;
      } else {
        // If largest can't absorb all, set it to 0 and limit the dragged slider
        const maxIncrease = current[largestKey];
        current[largestKey] = 0;
        current[id] = oldValue + maxIncrease;
      }
    } else {
      current[id] = newValue;
    }
    
    // Final validation: ensure total is exactly 100
    const total = current.patientAccess + 
      (isOutpatient ? current.patientExperience : 0) +
      (includeLocums ? current.reducingLocums : 0) + 
      current.clinicianWellbeing;
    
    if (total !== 100) {
      const adjustment = 100 - total;
      // Find any unlocked slider with value > 0 to absorb rounding error
      const fixKey = adjustableKeys.find(k => current[k] > 0) || largestKey;
      if (fixKey) {
        current[fixKey] = Math.max(0, current[fixKey] + adjustment);
      }
    }
    
    updateState({ timeAllocation: current });
  };

  const handlePreset = (preset: { allocation: TimeAllocation }) => {
    dismissHints();
    // Clear all locks when applying a preset
    setLockedCategories(new Set());
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
    const hoursPerProviderAnnual = hoursToWellbeing / safeProviders;
    const hoursPerProviderPerWeek = hoursPerProviderAnnual / 52;
    
    // Get threshold based on annual hours per provider
    const threshold = getWellbeingThreshold(hoursPerProviderAnnual);
    
    const baselineTurnoverRate = assumptions.baselineTurnoverRate / 100;
    
    // Simplified formula (no at-risk multiplier):
    // Annual departures = Providers × Turnover rate
    const annualDepartures = safeProviders * baselineTurnoverRate;
    
    // Use midpoint of retention range for display, but calculate min/max for ranges
    const retentionLiftMid = (threshold.rateMin + threshold.rateMax) / 2;
    const retentionLiftMin = threshold.rateMin;
    const retentionLiftMax = threshold.rateMax;
    
    // Providers retained = Annual departures × Retention lift %
    const providersRetainedMid = annualDepartures * retentionLiftMid;
    const providersRetainedMin = annualDepartures * retentionLiftMin;
    const providersRetainedMax = annualDepartures * retentionLiftMax;
    
    // Annual value = Providers retained × Replacement cost
    const valueMid = providersRetainedMid * assumptions.turnoverCost;
    const valueMin = providersRetainedMin * assumptions.turnoverCost;
    const valueMax = providersRetainedMax * assumptions.turnoverCost;
    
    // Check if low impact (under 100 hrs/year per provider)
    const isLowImpact = hoursPerProviderAnnual < 100;
    
    // Calculate next threshold info for nudge
    const currentThresholdIndex = WELLBEING_THRESHOLDS.findIndex(t => t.label === threshold.label);
    const nextThreshold = currentThresholdIndex < WELLBEING_THRESHOLDS.length - 1 
      ? WELLBEING_THRESHOLDS[currentThresholdIndex + 1] 
      : null;
    
    let allocationForNextThreshold: number | null = null;
    let valueAtNextThreshold: number | null = null;
    if (nextThreshold && hoursPerProviderAnnual < nextThreshold.minHoursAnnual) {
      const hoursNeeded = nextThreshold.minHoursAnnual * safeProviders;
      allocationForNextThreshold = Math.min(100, Math.ceil((hoursNeeded / safeTotalHours) * 100));
      
      const nextRetentionMid = (nextThreshold.rateMin + nextThreshold.rateMax) / 2;
      const nextProvidersRetained = annualDepartures * nextRetentionMid;
      valueAtNextThreshold = nextProvidersRetained * assumptions.turnoverCost;
    }
    
    return {
      hoursToWellbeing,
      hoursPerProviderAnnual,
      hoursPerProviderPerWeek,
      threshold,
      annualDepartures,
      retentionLift: retentionLiftMid,
      retentionLiftMin,
      retentionLiftMax,
      providersRetained: providersRetainedMid,
      value: Math.round(valueMid),
      valueMin: Math.round(valueMin),
      valueMax: Math.round(valueMax),
      isLowImpact,
      nextThreshold,
      allocationForNextThreshold,
      valueAtNextThreshold,
    };
  }, [totalHoursSaved, state.timeAllocation.clinicianWellbeing, state.numberOfProviders, assumptions]);

  const calculateDriverValue = (id: keyof TimeAllocation) => {
    const hours = getHoursForCategory(id);
    
    switch (id) {
      case 'patientAccess': {
        if (isED) {
          // ED LWBS Throughput calculation
          const edVisits = state.annualEncounters;
          const patientsLeaving = edVisits * (assumptions.edLwbsRate / 100);
          const patientsRetained = patientsLeaving * (assumptions.edRetentionRate / 100);
          const patientsAttributed = patientsRetained * (assumptions.edAbridgeAttribution / 100);
          const edVisitRevenue = patientsAttributed * assumptions.edVisitRevenue;
          
          let admissionRevenue = 0;
          let patientsAdmitted = 0;
          if (assumptions.edIncludeAdmissions) {
            patientsAdmitted = patientsAttributed * (assumptions.edAdmissionRate / 100);
            admissionRevenue = patientsAdmitted * assumptions.edAdmissionRevenue;
          }
          
          const totalValue = edVisitRevenue + admissionRevenue;
          
          return {
            value: Math.round(totalValue),
            hours,
            edVisits,
            patientsLeaving: Math.round(patientsLeaving),
            patientsRetained: Math.round(patientsRetained),
            patientsAttributed: Math.round(patientsAttributed),
            edVisitRevenue: Math.round(edVisitRevenue),
            patientsAdmitted: Math.round(patientsAdmitted),
            admissionRevenue: Math.round(admissionRevenue),
            isEDThroughput: true,
          };
        }
        
        if (isInpatient) {
          // Inpatient Clinical Operations calculation
          // If LOS toggle is OFF, return qualitative only
          if (!assumptions.ipModelLosImpact) {
            return {
              value: 0,
              hours,
              isQualitative: true,
              isInpatientOps: true,
            };
          }
          
          // LOS Impact calculation (experimental)
          const admissions = assumptions.ipAdmissions;
          const docDelayRate = assumptions.ipDocDelayRate / 100;
          const delayedDischarges = admissions * docDelayRate;
          const timeRecovered = assumptions.ipTimeRecoveredPerDischarge;
          const revenuePerBedHour = assumptions.ipRevenuePerBedHour;
          const grossValue = delayedDischarges * timeRecovered * revenuePerBedHour;
          const attributionFactor = assumptions.ipLosAttributionFactor / 100;
          const netValue = grossValue * attributionFactor;
          
          return {
            value: Math.round(netValue),
            hours,
            isInpatientOps: true,
            isLosModel: true,
            admissions,
            delayedDischarges: Math.round(delayedDischarges),
            timeRecovered,
            revenuePerBedHour,
            grossValue: Math.round(grossValue),
            attributionFactor: assumptions.ipLosAttributionFactor,
            netValue: Math.round(netValue),
          };
        }
        
        // Outpatient Patient Access calculation
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
      case 'patientExperience': {
        // Qualitative only - no dollar value
        return {
          value: 0, // No monetary value - purely qualitative
          hours,
          isQualitative: true,
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
    
    if (id === 'patientAccess' && isED) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-800">LWBS Revenue Recovery</span>
            <button
              onClick={() => setEdThroughputSettingsOpen(true)}
              className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
              data-testid="button-ed-throughput-settings"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
          
          <div className="bg-slate-100 rounded-lg p-3 border-l-4 border-[#EA2C00] mb-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">The Theory:</span> When patients leave without being seen, you lose that revenue entirely. Faster documentation means faster throughput, shorter wait times, and fewer walkouts. Some retained patients are simple ED visits—but some would have been admitted. Both represent recovered revenue.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Annual ED visits</span>
              <span className="text-slate-900">{calc.edVisits?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-50 -mx-3 px-3 py-1.5 rounded">
              <span className="flex items-center gap-1.5 text-slate-600">
                × LWBS rate
                <InfoTooltip>
                  <p className="font-semibold mb-1">Left Without Being Seen</p>
                  <p>Industry average is 2-5%. Higher rates during surges.</p>
                </InfoTooltip>
              </span>
              <span className="text-slate-900">{assumptions.edLwbsRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">= Patients leaving</span>
              <span className="text-slate-900 font-semibold">{calc.patientsLeaving?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-50 -mx-3 px-3 py-1.5 rounded">
              <span className="flex items-center gap-1.5 text-slate-600">
                × Retention rate
                <InfoTooltip>
                  <p className="font-semibold mb-1">% retained with faster throughput</p>
                  <p>Conservative estimate of patients who stay due to reduced wait times.</p>
                </InfoTooltip>
              </span>
              <span className="text-slate-900">{assumptions.edRetentionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">= Patients retained</span>
              <span className="text-slate-900">{calc.patientsRetained?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between bg-[#FFF5F2] -mx-3 px-3 py-1.5 rounded">
              <span className="flex items-center gap-1.5 text-[#EA2C00]">
                × Abridge attribution
                <InfoTooltip>
                  <p className="font-semibold mb-1">Why only {assumptions.edAbridgeAttribution}%?</p>
                  <p>Faster documentation contributes to overall throughput improvements alongside other ED optimization efforts.</p>
                </InfoTooltip>
              </span>
              <span className="text-[#EA2C00] font-semibold">{assumptions.edAbridgeAttribution}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">= Patients attributed</span>
              <span className="text-slate-900 font-semibold">{calc.patientsAttributed?.toLocaleString()}</span>
            </div>
            <div className="border-t border-dashed border-slate-200 my-2" />
            <div className="flex justify-between">
              <span className="text-slate-500">× Avg ED visit revenue</span>
              <span className="text-slate-900">${assumptions.edVisitRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">= ED visit revenue</span>
              <span className="text-slate-900 font-semibold">${calc.edVisitRevenue?.toLocaleString()}</span>
            </div>
            
            {assumptions.edIncludeAdmissions && (
              <>
                <div className="border-t border-dashed border-slate-200 my-2" />
                <div className="flex justify-between">
                  <span className="text-slate-500">× Admission rate</span>
                  <span className="text-slate-900">{assumptions.edAdmissionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">= Patients admitted</span>
                  <span className="text-slate-900">{calc.patientsAdmitted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">× Avg admission revenue</span>
                  <span className="text-slate-900">${assumptions.edAdmissionRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">= Admission revenue</span>
                  <span className="text-slate-900 font-semibold">${calc.admissionRevenue?.toLocaleString()}</span>
                </div>
              </>
            )}
            
            <div className="border-t border-slate-300 mt-2 pt-2" />
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-800">Total Annual Value</span>
              <span className="font-bold text-[#EA2C00]">${calc.value?.toLocaleString()}</span>
            </div>
          </div>
          
          {assumptions.edIncludeAdmissions && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                <span className="font-semibold">Capacity consideration:</span> Turn off admission revenue in settings if your hospital is at bed capacity and cannot accept additional admissions.
              </p>
            </div>
          )}
        </div>
      );
    }
    
    if (id === 'patientExperience' && isED) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-800">Patient Experience</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Qualitative</span>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Hours allocated</span>
              <span className="text-slate-900 font-semibold">{calc.hours.toLocaleString()} hrs/year</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Per physician per week</span>
              <span className="text-slate-600">{(calc.hours / Math.max(1, state.numberOfProviders) / 52).toFixed(1)} hrs</span>
            </div>
          </div>
          
          <div className="bg-slate-100 rounded-lg p-3 border-l-4 border-[#EA2C00]">
            <p className="text-sm font-semibold text-[#EA2C00] mb-2">Why we don't assign a dollar value:</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              ED patient experience improvements—better communication, reduced anxiety, clearer discharge instructions—create real value, but assigning speculative monetary figures would undermine the credibility of this model.
            </p>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-1">Qualitative outcomes to track:</p>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Patient satisfaction scores (Press Ganey)</li>
              <li>• Door-to-provider communication time</li>
              <li>• Discharge instruction clarity ratings</li>
              <li>• Patient complaints & grievances</li>
            </ul>
          </div>
        </div>
      );
    }
    
    // Inpatient Clinical Operations rendering
    if (id === 'patientAccess' && isInpatient) {
      const hoursPerWeek = calc.hours / 52 / Math.max(1, state.numberOfProviders);
      
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-800">Clinical Operations</span>
            {assumptions.ipModelLosImpact && (
              <button
                onClick={() => setIpOperationsSettingsOpen(true)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                data-testid="button-ip-operations-settings"
              >
                <Settings className="w-3.5 h-3.5 text-slate-600" />
              </button>
            )}
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Hours allocated</span>
              <span className="text-slate-900 font-semibold">{calc.hours.toLocaleString()} hrs/year</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Per hospitalist per week</span>
              <span className="text-slate-600">{hoursPerWeek.toFixed(1)} hrs</span>
            </div>
          </div>
          
          <button
            onClick={() => setIpShowMetricsToTrack(!ipShowMetricsToTrack)}
            className="flex items-center gap-2 text-sm text-[#EA2C00] hover:text-[#C72400] font-medium transition-colors"
            data-testid="button-ip-what-to-track"
          >
            {ipShowMetricsToTrack ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            What to track
          </button>
          
          <AnimatePresence>
            {ipShowMetricsToTrack && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">METRICS TO TRACK:</p>
                  <ul className="text-xs text-slate-600 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>Progress note completion time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>Discharge order timing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>Discharge summary turnaround</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>Discharge before noon rate</span>
                    </li>
                  </ul>
                  <p className="text-xs text-slate-500 italic pt-2 border-t border-slate-200">
                    These are directly influenced by documentation speed and measurable in your EHR.
                  </p>
                  
                  <div className="pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssumptions(prev => ({ ...prev, ipModelLosImpact: !prev.ipModelLosImpact }));
                        }}
                        className={`w-10 h-5 rounded-full transition-colors flex items-center ${assumptions.ipModelLosImpact ? 'bg-[#EA2C00]' : 'bg-slate-300'}`}
                        data-testid="toggle-ip-los-model"
                      >
                        <span className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${assumptions.ipModelLosImpact ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="text-xs text-slate-700">Model LOS impact (experimental)</span>
                    </label>
                  </div>
                </div>
                
                {assumptions.ipModelLosImpact && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3"
                  >
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800">
                        <span className="font-semibold">EXPERIMENTAL MODEL:</span> LOS impact is notoriously difficult to attribute to documentation improvements alone.
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Admissions</span>
                        <EditableValue 
                          value={assumptions.ipAdmissions} 
                          onChange={(v) => updateAssumption('ipAdmissions', v)}
                          min={1000}
                          max={50000}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          × Doc-driven discharge delays
                          <InfoTooltip>
                            <p className="font-semibold mb-1">Documentation-related delays</p>
                            <p>Percentage of discharges delayed due to documentation backlogs, incomplete progress notes, or slow discharge summaries.</p>
                            <p className="mt-2 text-white/70">Industry range: 15-30%</p>
                          </InfoTooltip>
                        </span>
                        <EditableValue 
                          value={assumptions.ipDocDelayRate} 
                          onChange={(v) => updateAssumption('ipDocDelayRate', v)}
                          suffix="%"
                          min={10}
                          max={40}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">= Delayed discharges</span>
                        <span className="text-slate-900 font-semibold">{calc.delayedDischarges?.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-dashed border-slate-200 my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">× Time recovered per discharge</span>
                        <EditableValue 
                          value={assumptions.ipTimeRecoveredPerDischarge} 
                          onChange={(v) => updateAssumption('ipTimeRecoveredPerDischarge', v)}
                          suffix=" hrs"
                          min={0.5}
                          max={6}
                          step={0.5}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">× Revenue per bed-hour</span>
                        <EditableValue 
                          value={assumptions.ipRevenuePerBedHour} 
                          onChange={(v) => updateAssumption('ipRevenuePerBedHour', v)}
                          prefix="$"
                          min={50}
                          max={300}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">= Gross value</span>
                        <span className="text-slate-900 font-semibold">${calc.grossValue?.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-dashed border-slate-200 my-2" />
                      <div className="flex items-center justify-between bg-[#FFF5F2] -mx-3 px-3 py-1.5 rounded">
                        <span className="flex items-center gap-1.5 text-[#EA2C00]">
                          × Attribution factor
                          <InfoTooltip>
                            <p className="font-semibold mb-1">Why so conservative?</p>
                            <p>"Documentation is one factor among many"—bed management, transport, pharmacy, case management all play roles.</p>
                            <p className="mt-2 text-white/70">Industry range: 15-35%</p>
                          </InfoTooltip>
                        </span>
                        <EditableValue 
                          value={assumptions.ipLosAttributionFactor} 
                          onChange={(v) => updateAssumption('ipLosAttributionFactor', v)}
                          suffix="%"
                          min={10}
                          max={50}
                        />
                      </div>
                      <div className="border-t border-slate-300 mt-2 pt-2" />
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-800">Net Value</span>
                        <span className="font-bold text-[#EA2C00]">${calc.netValue?.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 mt-2 italic">
                      Track "discharge before noon" rate to validate this model over time.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          {!assumptions.ipModelLosImpact && (
            <div className="bg-slate-100 rounded-lg p-3 border-l-4 border-slate-400">
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Value: Qualitative</span><br/>
                Enable "Model LOS impact" above to estimate potential financial value.
              </p>
            </div>
          )}
        </div>
      );
    }

    if (id === 'clinicianWellbeing' && isED) {
      const wc = wellbeingCalculation;
      const showNudge = wc.nextThreshold && wc.allocationForNextThreshold && 
        (wc.allocationForNextThreshold - state.timeAllocation.clinicianWellbeing) <= 15;
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Physician Retention Impact</span>
            <button
              onClick={() => setWellbeingSettingsOpen(true)}
              className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
              data-testid="button-ed-retention-settings"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
          
          <div className={`rounded-lg p-3 ${wc.threshold.bgColor} border border-slate-100`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Hours per physician per year</span>
              <span className="text-lg font-bold text-slate-900">{Math.round(wc.hoursPerProviderPerWeek * 52)} hrs</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>({wc.hoursPerProviderPerWeek.toFixed(1)} hrs/week)</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">IMPACT THRESHOLD</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FFF5F2] text-[#EA2C00]">
                {wc.threshold.label}
              </span>
            </div>
            
            <div className="space-y-1 text-xs font-mono">
              {WELLBEING_THRESHOLDS.map((t, i) => {
                const isCurrent = t.label === wc.threshold.label;
                return (
                  <div 
                    key={t.label} 
                    className={`flex items-center gap-2 py-1 px-2 rounded ${isCurrent ? 'bg-[#FFF5F2]' : ''}`}
                  >
                    <span className="text-slate-400 w-4">{i === 0 ? '├' : i === WELLBEING_THRESHOLDS.length - 1 ? '└' : '├'}─</span>
                    <span className={`w-36 ${isCurrent ? 'text-[#EA2C00] font-bold' : 'text-slate-500'}`}>
                      {t.maxHoursAnnual === Infinity ? `${t.minHoursAnnual}+ hrs/yr` : `${t.minHoursAnnual}-${t.maxHoursAnnual} hrs/yr`}
                      <span className={`text-[10px] ml-1 ${isCurrent ? 'text-[#EA2C00]/60' : 'text-slate-400'}`}>
                        ({t.description})
                      </span>
                    </span>
                    <span className={`${isCurrent ? 'text-[#EA2C00] font-bold' : 'text-slate-500'}`}>
                      {t.label} ({Math.round(t.rateMin * 100)}-{Math.round(t.rateMax * 100)}% reduction)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {showNudge && (
            <div className="bg-[#FFF5F2] border border-[#EA2C00]/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-[#EA2C00]" />
                <span className="text-slate-700">
                  Add <span className="font-bold text-[#EA2C00]">{wc.allocationForNextThreshold! - state.timeAllocation.clinicianWellbeing}%</span> more to reach <span className="font-bold">{wc.nextThreshold?.label}</span> tier
                </span>
              </div>
              {wc.valueAtNextThreshold && (
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  Potential value: ${wc.valueAtNextThreshold.toLocaleString()}
                </p>
              )}
            </div>
          )}
          
          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">ED physicians</span>
              <span className="text-slate-900">{state.numberOfProviders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">× Baseline turnover rate</span>
              <span className="text-slate-900">{assumptions.baselineTurnoverRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">= Expected departures/yr</span>
              <span className="text-slate-900">{(state.numberOfProviders * assumptions.baselineTurnoverRate / 100).toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between bg-[#FFF5F2] -mx-3 px-3 py-1.5 rounded">
              <span className="text-[#EA2C00]">× Retention lift ({wc.threshold.label})</span>
              <span className="text-[#EA2C00] font-semibold">{Math.round(wc.retentionLift * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">= Physicians retained</span>
              <span className="text-slate-900">{wc.providersRetained.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">× Replacement cost</span>
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
    
    // Inpatient Physician Wellbeing rendering
    if (id === 'clinicianWellbeing' && isInpatient) {
      const wc = wellbeingCalculation;
      const showNudge = wc.nextThreshold && wc.allocationForNextThreshold && 
        (wc.allocationForNextThreshold - state.timeAllocation.clinicianWellbeing) <= 15;
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Physician Wellbeing Impact</span>
            <button
              onClick={() => setWellbeingSettingsOpen(true)}
              className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
              data-testid="button-ip-wellbeing-settings"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
          
          <div className={`rounded-lg p-3 ${wc.threshold.bgColor} border border-slate-100`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Hours per hospitalist per year</span>
              <span className="text-lg font-bold text-slate-900">{Math.round(wc.hoursPerProviderPerWeek * 52)} hrs</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>({wc.hoursPerProviderPerWeek.toFixed(1)} hrs/week)</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">IMPACT THRESHOLD</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FFF5F2] text-[#EA2C00]">
                {wc.threshold.label}
              </span>
            </div>
            
            <div className="space-y-1 text-xs font-mono">
              {WELLBEING_THRESHOLDS.map((t, i) => {
                const isCurrent = t.label === wc.threshold.label;
                return (
                  <div 
                    key={t.label} 
                    className={`flex items-center gap-2 py-1 px-2 rounded ${isCurrent ? 'bg-[#FFF5F2]' : ''}`}
                  >
                    <span className="text-slate-400 w-4">{i === 0 ? '├' : i === WELLBEING_THRESHOLDS.length - 1 ? '└' : '├'}─</span>
                    <span className={`w-36 ${isCurrent ? 'text-[#EA2C00] font-bold' : 'text-slate-500'}`}>
                      {t.maxHoursAnnual === Infinity ? `${t.minHoursAnnual}+ hrs/yr` : `${t.minHoursAnnual}-${t.maxHoursAnnual} hrs/yr`}
                      <span className={`text-[10px] ml-1 ${isCurrent ? 'text-[#EA2C00]/60' : 'text-slate-400'}`}>
                        ({t.description})
                      </span>
                    </span>
                    <span className={`${isCurrent ? 'text-[#EA2C00] font-bold' : 'text-slate-500'}`}>
                      {t.label} ({Math.round(t.rateMin * 100)}-{Math.round(t.rateMax * 100)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {showNudge && (
            <div className="bg-[#FFF5F2] border border-[#EA2C00]/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-[#EA2C00]" />
                <span className="text-slate-700">
                  Add <span className="font-bold text-[#EA2C00]">{wc.allocationForNextThreshold! - state.timeAllocation.clinicianWellbeing}%</span> more to reach <span className="font-bold">{wc.nextThreshold?.label}</span> tier
                </span>
              </div>
              {wc.valueAtNextThreshold && (
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  Potential value: ${wc.valueAtNextThreshold.toLocaleString()}
                </p>
              )}
            </div>
          )}
          
          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Hospitalists</span>
              <span className="text-slate-900">{state.numberOfProviders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">× Annual turnover rate</span>
              <span className="text-slate-900">{assumptions.baselineTurnoverRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">= Annual departures</span>
              <span className="text-slate-900">{(state.numberOfProviders * assumptions.baselineTurnoverRate / 100).toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between bg-[#FFF5F2] -mx-3 px-3 py-1.5 rounded">
              <span className="text-[#EA2C00]">× Retention lift ({wc.threshold.label})</span>
              <span className="text-[#EA2C00] font-semibold">{Math.round(wc.retentionLift * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">= Physicians retained</span>
              <span className="text-slate-900">{wc.providersRetained.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">× Replacement cost</span>
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

    if (id === 'patientExperience' && isOutpatient) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-800">Qualitative Benefits</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Non-monetary</span>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Hours allocated</span>
              <span className="text-slate-900 font-semibold">{calc.hours.toLocaleString()} hrs/year</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Per provider per week</span>
              <span className="text-slate-600">{(calc.hours / Math.max(1, state.numberOfProviders) / 52).toFixed(1)} hrs</span>
            </div>
          </div>
          
          <div className="bg-slate-100 rounded-lg p-3 border-l-4 border-[#EA2C00]">
            <p className="text-sm font-semibold text-[#EA2C00] mb-2">Why we don't assign a dollar value:</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Patient experience improvements—deeper conversations, better education, stronger relationships—create real value, but assigning speculative monetary figures would undermine the credibility of this model.
            </p>
            <p className="text-xs text-slate-500 mt-3 italic">
              Instead, track qualitative outcomes: patient satisfaction scores, repeat visit rates, and referral patterns.
            </p>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-1">Qualitative outcomes to track:</p>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Patient satisfaction (HCAHPS/Press Ganey)</li>
              <li>• Appointment adherence & follow-up rates</li>
              <li>• Patient complaints & grievances</li>
              <li>• Referral patterns from satisfied patients</li>
            </ul>
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
          
          {/* Hours per provider metric - show both annual and weekly */}
          <div className={`rounded-lg p-3 ${wc.threshold.bgColor} border border-slate-100`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Hours per provider per year</span>
              <span className="text-lg font-bold text-slate-900">{Math.round(wc.hoursPerProviderPerWeek * 52)} hrs</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>({wc.hoursPerProviderPerWeek.toFixed(1)} hrs/week)</span>
            </div>
          </div>
          
          {/* Threshold visualization - show both annual and weekly */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">IMPACT THRESHOLD</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FFF5F2] text-[#EA2C00]">
                {wc.threshold.label}
              </span>
            </div>
            
            <div className="space-y-1 text-xs font-mono">
              {WELLBEING_THRESHOLDS.map((t, i) => {
                const isCurrent = t.label === wc.threshold.label;
                return (
                  <div 
                    key={t.label} 
                    className={`flex items-center gap-2 py-1 px-2 rounded ${isCurrent ? 'bg-[#FFF5F2]' : ''}`}
                  >
                    <span className="text-slate-400 w-4">{i === 0 ? '├' : i === WELLBEING_THRESHOLDS.length - 1 ? '└' : '├'}─</span>
                    <span className={`w-36 ${isCurrent ? 'text-[#EA2C00] font-bold' : 'text-slate-500'}`}>
                      {t.maxHoursAnnual === Infinity ? `${t.minHoursAnnual}+ hrs/yr` : `${t.minHoursAnnual}-${t.maxHoursAnnual} hrs/yr`}
                      <span className={`text-[10px] ml-1 ${isCurrent ? 'text-[#EA2C00]/60' : 'text-slate-400'}`}>
                        ({t.description})
                      </span>
                    </span>
                    <span className={`${isCurrent ? 'text-[#EA2C00] font-bold' : 'text-slate-500'}`}>
                      {t.label} ({Math.round(t.rateMin * 100)}-{Math.round(t.rateMax * 100)}%)
                    </span>
                    {isCurrent && <span className="text-xs ml-auto font-bold text-[#EA2C00]">← YOU ARE HERE</span>}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Nudge message - show next tier opportunity OR maximizing message */}
          {showNudge && wc.valueAtNextThreshold && wc.nextThreshold && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 bg-slate-100 rounded-lg p-3 border-l-4 border-[#EA2C00]"
            >
              <Zap className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700">
                <span className="font-semibold">At {wc.allocationForNextThreshold}% allocation</span>, you'd reach the{' '}
                <span className="font-semibold text-[#EA2C00]">{wc.nextThreshold.label}</span> tier with a value of{' '}
                <span className="font-bold text-[#EA2C00]">${wc.valueAtNextThreshold.toLocaleString()}</span>
              </p>
            </motion.div>
          )}
          
          {/* Maximizing impact message - when at SIGNIFICANT tier with high allocation */}
          {wc.threshold.label === 'SIGNIFICANT' && state.timeAllocation.clinicianWellbeing >= 80 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 bg-[#FFF5F2] rounded-lg p-3 border-l-4 border-[#EA2C00]"
            >
              <Zap className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700">
                <span className="font-semibold">At {state.timeAllocation.clinicianWellbeing}% allocation</span>, you're maximizing wellbeing impact with a value of{' '}
                <span className="font-bold text-[#EA2C00]">${wc.value.toLocaleString()}</span>
              </p>
            </motion.div>
          )}
          
          {/* Low impact warning for MINIMAL tier */}
          {wc.isLowImpact && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 bg-slate-50 rounded-lg p-3 border border-slate-200"
            >
              <AlertTriangle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-700 mb-1">LOW IMPACT THRESHOLD</p>
                <p className="mb-2">
                  At {wc.hoursPerProviderPerWeek.toFixed(1)} hrs/week per provider, retention impact is minimal.
                  Consider 60%+ allocation (2+ hrs/week) for measurable benefits.
                </p>
                <p className="text-slate-500 italic">
                  Current allocation supports daily stress relief but may not significantly impact annual turnover rates.
                </p>
              </div>
            </motion.div>
          )}
          
          {/* Step-by-step math - simplified */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-xs space-y-2">
            <p className="text-xs font-semibold text-slate-600 mb-2 font-sans">Step-by-Step Calculation</p>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Providers</span>
              <span className="text-slate-900">{state.numberOfProviders}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">× Annual turnover rate</span>
              <span className="text-slate-900">{assumptions.baselineTurnoverRate}%</span>
            </div>
            <div className="border-t border-dashed border-slate-200 my-1" />
            <div className="flex justify-between">
              <span className="text-slate-500">= Annual departures</span>
              <span className="text-slate-900 font-semibold">{wc.annualDepartures.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between bg-[#FFF5F2] -mx-3 px-3 py-1.5 rounded">
              <span className="text-[#EA2C00]">× Retention lift ({wc.threshold.label})</span>
              <span className="text-[#EA2C00] font-semibold">{Math.round(wc.retentionLiftMin * 100)}-{Math.round(wc.retentionLiftMax * 100)}%</span>
            </div>
            <div className="border-t border-dashed border-slate-200 my-1" />
            <div className="flex justify-between">
              <span className="text-slate-500">= Providers retained</span>
              <span className="text-slate-900 font-semibold">{wc.providersRetained.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">× Replacement cost</span>
              <span className="text-slate-900">${assumptions.turnoverCost.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-300 mt-2 pt-2" />
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-800">Annual Value</span>
              {wc.threshold.label === 'MINIMAL' ? (
                <span className="font-bold text-slate-600">${wc.valueMin.toLocaleString()} - ${wc.valueMax.toLocaleString()} <span className="text-xs font-normal">(limited)</span></span>
              ) : (
                <span className="font-bold text-[#EA2C00]">${wc.value.toLocaleString()}</span>
              )}
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
                {isInpatient ? "Allocate Hospitalist Efficiency" : isED ? "Allocate ED Efficiency Gains" : "Allocate Your Time Savings"}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
                Allocate Your Time Savings
              </h1>
              <p className="text-slate-600">
                You're unlocking <span className="font-bold text-[#EA2C00]">{totalHoursSaved.toLocaleString()} hours</span>. Decide how this time creates value.
              </p>
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
              
              {/* Live total allocation display */}
              <div className="ml-auto flex items-center gap-2">
                <span className={`text-sm font-medium ${totalAllocated === 100 ? 'text-slate-600' : 'text-[#EA2C00]'}`}>
                  Total: {totalAllocated}%
                </span>
                {totalAllocated === 100 && (
                  <Check className="w-4 h-4 text-slate-500" />
                )}
              </div>
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
                
                const categoryIsLocked = isLocked(option.id);
                const categoryIsAutoCalculated = isAutoCalculated(option.id);
                
                return (
                  <motion.div
                    key={option.id}
                    className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
                      categoryIsLocked 
                        ? 'border-l-4 border-l-[#EA2C00] border-t-slate-200 border-r-slate-200 border-b-slate-200' 
                        : categoryIsAutoCalculated
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-slate-200'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
                  >
                    <div className={`p-5 ${categoryIsAutoCalculated ? 'bg-slate-50' : ''}`}>
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
                            
                            {/* Clickable percentage with increment/decrement and lock */}
                            <div className="flex items-center gap-1">
                              {/* Decrement button - hidden when auto-calculated */}
                              <button
                                onClick={() => handleIncrement(option.id, -5)}
                                disabled={isAutoCalculated(option.id)}
                                className={`w-7 h-7 flex items-center justify-center rounded hover-elevate ${
                                  isAutoCalculated(option.id) ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400'
                                }`}
                                aria-label={`Decrease ${option.label} allocation`}
                                data-testid={`button-decrement-${option.id}`}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              
                              {/* Editable percentage */}
                              {editingCategory === option.id ? (
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ''))}
                                  onBlur={handleCommitEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitEdit();
                                    if (e.key === 'Escape') handleCancelEdit();
                                    if (e.key === 'Tab') {
                                      handleCommitEdit();
                                    }
                                  }}
                                  autoFocus
                                  aria-label={`Edit ${option.label} percentage`}
                                  className="w-14 text-2xl font-bold text-black text-center border-2 border-[#EA2C00] rounded-lg bg-white focus:outline-none"
                                  data-testid={`input-percentage-${option.id}`}
                                />
                              ) : isAutoCalculated(option.id) ? (
                                <span
                                  className="text-2xl font-bold text-slate-400 px-2 py-0.5"
                                  data-testid={`text-percentage-${option.id}`}
                                >
                                  {value}%
                                </span>
                              ) : (
                                <div className="relative group">
                                  <button
                                    onClick={() => handleStartEdit(option.id)}
                                    aria-label={`Click to edit ${option.label} percentage, currently ${value}%`}
                                    className={`text-2xl font-bold text-black hover-elevate px-2 py-0.5 rounded-lg cursor-pointer border-b-2 border-transparent hover:border-slate-300 transition-all ${showFirstClickFeedback && editingCategory === option.id ? 'ring-2 ring-[#EA2C00]/30' : ''}`}
                                    data-testid={`button-percentage-${option.id}`}
                                    title="Click to type exact percentage"
                                  >
                                    {value}%
                                  </button>
                                  {/* Persistent hover tooltip */}
                                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    Click to type exact percentage
                                  </div>
                                  {/* First-time hint tooltip */}
                                  <AnimatePresence>
                                    {showHints && index === 0 && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute -left-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-600 text-white text-xs rounded shadow-md whitespace-nowrap z-20 flex items-center gap-1"
                                      >
                                        Click to edit <ArrowRight className="w-3 h-3" />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                              
                              {/* Increment button - hidden when auto-calculated */}
                              <button
                                onClick={() => handleIncrement(option.id, 5)}
                                disabled={isAutoCalculated(option.id)}
                                className={`w-7 h-7 flex items-center justify-center rounded hover-elevate ${
                                  isAutoCalculated(option.id) ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400'
                                }`}
                                aria-label={`Increase ${option.label} allocation`}
                                data-testid={`button-increment-${option.id}`}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              
                              {/* Lock button */}
                              {isAutoCalculated(option.id) ? (
                                <div
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100"
                                  title="Auto-calculated to reach 100%"
                                  data-testid={`icon-auto-${option.id}`}
                                >
                                  <Calculator className="w-4 h-4 text-slate-400" />
                                </div>
                              ) : (
                                <div className="relative group">
                                  <motion.button
                                    onClick={() => handleToggleLock(option.id)}
                                    disabled={!canLock(option.id) && !isLocked(option.id)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                                      isLocked(option.id)
                                        ? 'bg-[#EA2C00]/10 text-[#EA2C00]'
                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                    } ${!canLock(option.id) && !isLocked(option.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    aria-label={isLocked(option.id) ? `Unlock ${option.label} (click to unlock)` : `Lock ${option.label} allocation`}
                                    data-testid={`button-lock-${option.id}`}
                                    initial={showHints && index === 0 ? { scale: 1 } : false}
                                    animate={showHints && index === 0 ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                                    transition={{ duration: 0.6, repeat: showHints ? 1 : 0 }}
                                  >
                                    {isLocked(option.id) ? (
                                      <Lock className="w-4 h-4" />
                                    ) : (
                                      <LockOpen className="w-4 h-4" />
                                    )}
                                    {/* Success checkmark */}
                                    <AnimatePresence>
                                      {showLockSuccessFeedback === option.id && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.5 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0 }}
                                          className="absolute -top-1 -right-1 w-4 h-4 bg-[#EA2C00] rounded-full flex items-center justify-center"
                                        >
                                          <Check className="w-2.5 h-2.5 text-white" />
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </motion.button>
                                  {/* Persistent hover tooltip */}
                                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    {isLocked(option.id) ? 'Unlock to edit' : 'Lock this allocation'}
                                  </div>
                                  {/* First-time hint tooltip */}
                                  <AnimatePresence>
                                    {showHints && index === 0 && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="absolute -right-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-600 text-white text-xs rounded shadow-md whitespace-nowrap z-20 flex items-center gap-1"
                                      >
                                        <ArrowRight className="w-3 h-3 rotate-180" /> Lock value
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-slate-500">{option.description}</p>
                          {categoryIsAutoCalculated && (
                            <p className="text-xs text-slate-400 mt-1 italic">
                              Auto-calculated to reach 100%
                            </p>
                          )}
                          {isWellbeing && !categoryIsAutoCalculated && (
                            <p className="text-xs text-slate-400 mt-1">
                              {wellbeingCalculation.hoursPerProviderPerWeek.toFixed(1)} hrs/provider/week
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Visual-only progress bar (display only) */}
                      <div 
                        className="w-full h-2 bg-slate-200 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={value}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${option.label} allocation: ${value}%`}
                        data-testid={`progressbar-${option.id}`}
                      >
                        <motion.div 
                          className="h-full bg-[#EA2C00] rounded-full"
                          initial={false}
                          animate={{ width: `${value}%` }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        />
                      </div>

                      {/* Value row */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <div>
                          {option.id === 'patientExperience' ? (
                            <>
                              <p className="text-xs text-slate-400 mb-0.5">{hours.toLocaleString()} hours invested</p>
                              <p className="text-xl font-bold text-[#F07B5F]">
                                Qualitative Benefits
                              </p>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                        
                        <div className="relative group">
                          <button
                            onClick={() => {
                              dismissHints();
                              toggleExpand(option.id);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                            data-testid={`button-expand-${option.id}`}
                          >
                            {option.id === 'patientExperience' ? (
                              <Info className="w-3.5 h-3.5" />
                            ) : (
                              <Calculator className="w-3.5 h-3.5" />
                            )}
                            <span>{isExpanded ? 'Hide' : (option.id === 'patientExperience' ? 'Learn more' : 'See the math')}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {/* Persistent hover tooltip */}
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            Customize assumptions
                          </div>
                          {/* First-time hint tooltip */}
                          <AnimatePresence>
                            {showHints && index === 0 && option.id !== 'patientExperience' && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.6 }}
                                className="absolute -right-16 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-600 text-white text-xs rounded shadow-md whitespace-nowrap z-20 flex items-center gap-1"
                              >
                                <ArrowRight className="w-3 h-3 rotate-180" /> Adjust math
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
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
                    {isNursing 
                      ? `From ${formatNumber(totalHoursSaved)} hours saved (per-shift model)`
                      : `From ${formatNumber(totalHoursSaved)} hours saved`
                    }
                  </p>
                </div>

                {/* Breakdown */}
                <div className="px-6 py-5 space-y-3">
                  {visibleOptions.map((option) => {
                    const Icon = option.icon;
                    const value = state.timeAllocation[option.id];
                    const driverCalc = calculateDriverValue(option.id);
                    const isQualitative = option.id === 'patientExperience';
                    
                    return (
                      <div key={option.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-white/50" />
                          <span className="text-sm text-white/70">{option.label}</span>
                        </div>
                        <div className="text-right">
                          {isQualitative ? (
                            <span className="text-sm text-white/50 italic">Qualitative</span>
                          ) : (
                            <span className="text-sm font-semibold text-white">${formatNumber(driverCalc?.value || 0)}</span>
                          )}
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

      {/* ED Throughput Settings Modal */}
      <AnimatePresence>
        {edThroughputSettingsOpen && (
          <SettingsModal
            isOpen={edThroughputSettingsOpen}
            onClose={() => setEdThroughputSettingsOpen(false)}
            title="ED Throughput Settings"
          >
            <div className="space-y-5">
              <ModalSlider
                label="LWBS Rate"
                value={assumptions.edLwbsRate}
                onChange={(v) => updateAssumption('edLwbsRate', v)}
                min={2}
                max={8}
                suffix="%"
                hint="% of patients who leave without being seen (industry avg: 2-5%)"
              />
              <ModalSlider
                label="Retention Rate with Faster Throughput"
                value={assumptions.edRetentionRate}
                onChange={(v) => updateAssumption('edRetentionRate', v)}
                min={5}
                max={15}
                hint="% of LWBS patients retained with reduced wait times"
              />
              <ModalSlider
                label="Abridge Attribution"
                value={assumptions.edAbridgeAttribution}
                onChange={(v) => updateAssumption('edAbridgeAttribution', v)}
                min={20}
                max={50}
                hint="% of throughput improvement attributed to faster documentation"
              />
              <ModalInput
                label="Average ED Visit Revenue"
                value={assumptions.edVisitRevenue}
                onChange={(v) => updateAssumption('edVisitRevenue', v)}
                prefix="$"
                min={400}
                max={1000}
                step={50}
                hint="Average revenue per ED visit ($400-$1,000)"
              />
              
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-slate-800">Include Admission Revenue</span>
                    <p className="text-xs text-slate-500 mt-0.5">For retained patients who get admitted</p>
                  </div>
                  <button
                    onClick={() => setAssumptions(prev => ({ ...prev, edIncludeAdmissions: !prev.edIncludeAdmissions }))}
                    className="flex items-center justify-center min-h-[48px] min-w-[48px] p-2"
                    data-testid="toggle-include-admissions"
                  >
                    {assumptions.edIncludeAdmissions ? (
                      <ToggleRight className="w-10 h-10 text-[#EA2C00]" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-slate-300" />
                    )}
                  </button>
                </div>
                
                {assumptions.edIncludeAdmissions && (
                  <div className="space-y-4 pl-4 border-l-2 border-[#EA2C00]/20">
                    <ModalSlider
                      label="Admission Rate for Retained Patients"
                      value={assumptions.edAdmissionRate}
                      onChange={(v) => updateAssumption('edAdmissionRate', v)}
                      min={10}
                      max={20}
                      hint="% of retained ED patients who get admitted"
                    />
                    <ModalInput
                      label="Average Admission Revenue"
                      value={assumptions.edAdmissionRevenue}
                      onChange={(v) => updateAssumption('edAdmissionRevenue', v)}
                      prefix="$"
                      min={10000}
                      max={25000}
                      step={1000}
                      hint="Average revenue per admission ($10K-$25K)"
                    />
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-800">
                        Turn OFF if your hospital is at bed capacity and cannot accept additional admissions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-3 border-t border-slate-100">
                <Button
                  onClick={() => setEdThroughputSettingsOpen(false)}
                  className="w-full bg-black hover:bg-black/90 text-white"
                  data-testid="button-save-ed-throughput-settings"
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
