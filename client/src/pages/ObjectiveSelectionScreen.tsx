import { useState, useMemo } from "react";
import { BackgroundShape } from "@/components/BackgroundShape";
import {
  CARE_SETTING_LABELS,
  getLeversByCategory,
  type CareSettingType,
  type AllSettingType,
  type LeverConfig,
  type LeverCategory,
} from "@/lib/SETTING_CONFIG";
import {
  Stethoscope,
  Siren,
  HeartPulse,
  Building2,
  ChevronRight,
  Check,
  Clock,
  FileText,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export interface SelectedLever {
  settingId: CareSettingType;
  leverId: string;
  active: boolean;
}

interface ObjectiveSelectionScreenProps {
  onComplete: (selectedSettings: CareSettingType[], selectedLevers: SelectedLever[]) => void;
  initialSelectedSettings?: CareSettingType[];
  initialSelectedLevers?: SelectedLever[];
}

const SETTING_ICONS: Record<AllSettingType, typeof Stethoscope> = {
  outpatient: Stethoscope,
  ed: Siren,
  nursing: HeartPulse,
  inpatient: Building2,
};

const CATEGORY_ICONS: Record<LeverCategory, typeof Clock> = {
  time: Clock,
  documentation: FileText,
};

const ALL_SETTINGS: AllSettingType[] = ["outpatient", "ed", "nursing", "inpatient"];

function StepIndicator({ 
  stepNumber, 
  label, 
  isActive, 
  isCompleted 
}: { 
  stepNumber: number; 
  label: string; 
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div 
        className={`
          w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
          transition-all duration-200
          ${isCompleted 
            ? 'bg-[#F03319] text-white' 
            : isActive 
              ? 'bg-[#F03319] text-white' 
              : 'bg-neutral-200 text-neutral-400'
          }
        `}
      >
        {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNumber}
      </div>
      <span 
        className={`
          text-sm transition-colors duration-200
          ${isActive || isCompleted ? 'text-neutral-700 font-medium' : 'text-neutral-400'}
        `}
      >
        {label}
      </span>
    </div>
  );
}

function Stepper({ 
  selectedSetting, 
  hasSelectedLevers 
}: { 
  selectedSetting: CareSettingType | null; 
  hasSelectedLevers: boolean;
}) {
  const step1Complete = selectedSetting !== null;
  const step2Complete = hasSelectedLevers;
  
  return (
    <div className="flex items-center gap-2">
      <StepIndicator 
        stepNumber={1} 
        label="Care Setting" 
        isActive={!step1Complete}
        isCompleted={step1Complete}
      />
      <div className="w-8 h-px bg-neutral-300 mx-1" />
      <StepIndicator 
        stepNumber={2} 
        label="ROI Priorities" 
        isActive={step1Complete && !step2Complete}
        isCompleted={step2Complete}
      />
      <div className="w-8 h-px bg-neutral-300 mx-1" />
      <StepIndicator 
        stepNumber={3} 
        label="Calculator" 
        isActive={step1Complete && step2Complete}
        isCompleted={false}
      />
    </div>
  );
}

function CareSettingPill({
  icon: Icon,
  label,
  selected,
  disabled,
  onClick,
}: {
  icon: typeof Stethoscope;
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-200
        ${disabled
          ? 'opacity-65 cursor-default border-neutral-200 bg-white'
          : selected
            ? 'border-[#F03319] bg-[#FEFAF9]'
            : 'border-neutral-300 bg-white hover:border-neutral-400 cursor-pointer'
        }
      `}
      data-testid={`pill-setting-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Icon className={`w-4 h-4 ${disabled ? 'text-neutral-400' : 'text-neutral-700'}`} />
      <span className={`text-sm ${selected ? 'font-medium text-neutral-900' : disabled ? 'text-neutral-500' : 'text-neutral-700'}`}>
        {label}
      </span>
      {disabled && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
          Coming Soon
        </span>
      )}
    </button>
  );
}

function PriorityCard({
  lever,
  isSelected,
  onToggle,
}: {
  lever: LeverConfig;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`
        relative w-full rounded-xl transition-all duration-200 text-left cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(240,51,25,0.5)]
        border border-neutral-200 hover:border-neutral-300
        overflow-hidden
        ${isSelected ? 'bg-[#FEFCFB]' : 'bg-white'}
      `}
      data-testid={`priority-card-${lever.id}`}
    >
      {isSelected && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: '#F03319' }}
        />
      )}
      <div className={`py-3.5 px-4 ${isSelected ? 'pl-5' : ''}`}>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            className="flex-shrink-0"
            data-testid={`checkbox-${lever.id}`}
          />
          <h4 className="font-medium text-neutral-900 text-sm">
            {lever.label}
          </h4>
        </div>
        <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed pl-6">
          {lever.description}
        </p>
        <p className="text-sm mt-1 pl-6">
          <span className="font-semibold text-neutral-700">This lever drives:</span>{' '}
          <span className="text-neutral-500">{lever.driverSummary}</span>
        </p>
      </div>
    </div>
  );
}

export default function ObjectiveSelectionScreen({
  onComplete,
  initialSelectedSettings = [],
  initialSelectedLevers = [],
}: ObjectiveSelectionScreenProps) {
  const [selectedSetting, setSelectedSetting] = useState<CareSettingType | null>(
    initialSelectedSettings.length > 0 ? initialSelectedSettings[0] : null
  );
  const [selectedLeverIds, setSelectedLeverIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    initialSelectedLevers.forEach(lever => ids.add(lever.leverId));
    return ids;
  });

  const leversByCategory = useMemo(() => {
    if (!selectedSetting) return null;
    return getLeversByCategory(selectedSetting);
  }, [selectedSetting]);

  const handleSettingSelect = (setting: AllSettingType) => {
    if (setting === "inpatient") {
      return;
    }
    if (selectedSetting === setting) {
      setSelectedSetting(null);
      setSelectedLeverIds(new Set());
    } else {
      setSelectedSetting(setting);
      setSelectedLeverIds(new Set());
    }
  };

  const handleLeverToggle = (leverId: string) => {
    setSelectedLeverIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leverId)) {
        newSet.delete(leverId);
      } else {
        newSet.add(leverId);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    if (!selectedSetting || selectedLeverIds.size === 0) {
      return;
    }
    
    const levers: SelectedLever[] = Array.from(selectedLeverIds).map(leverId => ({
      settingId: selectedSetting,
      leverId,
      active: true,
    }));
    
    onComplete([selectedSetting], levers);
  };

  const canContinue = selectedSetting !== null && selectedLeverIds.size > 0;

  const renderCategorySection = (category: LeverCategory, levers: LeverConfig[], isFirst: boolean) => {
    if (levers.length === 0) return null;
    const CategoryIcon = CATEGORY_ICONS[category];
    const categoryLabel = category === 'time' ? 'CAPACITY & LABOR' : 'REVENUE & RISK';

    return (
      <div key={category}>
        <div className={`flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2.5 ${isFirst ? '' : 'mt-6'}`}>
          <CategoryIcon className="h-3.5 w-3.5" />
          {categoryLabel}
        </div>
        <div className="space-y-3">
          {levers.map((lever) => (
            <PriorityCard
              key={lever.id}
              lever={lever}
              isSelected={selectedLeverIds.has(lever.id)}
              onToggle={() => handleLeverToggle(lever.id)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col relative font-sans" style={{ backgroundColor: '#F5F5F5' }}>
      <BackgroundShape />
      
      <div className="relative z-10 flex-1 overflow-y-auto pb-20">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 pt-6 md:pt-8">
          
          <div className="bg-white rounded-2xl shadow-sm px-6 md:px-7 pt-6 pb-5 mb-5">
            <div className="max-w-xl">
              <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 leading-tight">
                The ROI Calculator
              </h1>
              <p className="text-sm font-medium mt-1" style={{ color: '#F03319' }}>
                by Abridge
              </p>
              <p className="text-sm text-neutral-500 mt-2.5 leading-relaxed max-w-lg">
                Build a focused, defensible ROI model across any care setting in three simple steps.
              </p>
            </div>
            
            <div className="mt-4 overflow-x-auto">
              <Stepper selectedSetting={selectedSetting} hasSelectedLevers={selectedLeverIds.size > 0} />
            </div>
            
            <div className="border-t border-neutral-100 mt-5" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm px-6 md:px-7 py-6">
            <div className="mb-7">
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">
                Step 1 - Choose your care setting
              </h2>
              <p className="text-sm text-neutral-500 mb-4">
                Pick where you want to measure impact first. You can always come back and run another setting.
              </p>

              <div className="flex flex-wrap gap-3">
                {ALL_SETTINGS.map((setting) => {
                  const isInpatient = setting === "inpatient";
                  return (
                    <CareSettingPill
                      key={setting}
                      icon={SETTING_ICONS[setting]}
                      label={CARE_SETTING_LABELS[setting]}
                      selected={selectedSetting === setting}
                      disabled={isInpatient}
                      onClick={() => handleSettingSelect(setting)}
                    />
                  );
                })}
              </div>

              {!selectedSetting && (
                <p className="text-xs text-neutral-400 mt-2">
                  You'll choose your ROI priorities next.
                </p>
              )}
            </div>

            <div 
              className={`
                transition-opacity duration-300
                ${selectedSetting ? 'opacity-100' : 'opacity-40 pointer-events-none'}
              `}
            >
              <h2 className="text-lg font-semibold text-neutral-900 mb-1">
                Step 2 - Choose your ROI priorities
              </h2>
              <p className="text-sm text-neutral-500 mb-4">
                Select all ROI levers you want included in this model. You can choose more than one — most organizations activate multiple levers at once.
              </p>

              {!selectedSetting && (
                <p className="text-sm text-neutral-400 py-2">
                  Choose a setting above to see relevant priorities.
                </p>
              )}

              {selectedSetting && leversByCategory && (
                <div>
                  {renderCategorySection("time", leversByCategory.time, true)}
                  {renderCategorySection("documentation", leversByCategory.documentation, false)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-neutral-200">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            {selectedLeverIds.size > 0 
              ? `${selectedLeverIds.size} lever${selectedLeverIds.size > 1 ? 's' : ''} selected`
              : 'No levers selected'
            }
          </p>
          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            className={`
              inline-flex items-center justify-center gap-2 px-5 md:px-6 py-2.5 
              rounded-full font-medium text-sm
              transition-all duration-200
              ${canContinue
                ? 'bg-neutral-900 text-white cursor-pointer hover:bg-neutral-800'
                : 'opacity-40 bg-neutral-400 text-white cursor-default pointer-events-none'
              }
            `}
            data-testid="button-continue"
          >
            Continue to Calculator
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
