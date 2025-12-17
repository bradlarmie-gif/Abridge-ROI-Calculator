import { useState, useMemo } from "react";
import { BackgroundShape } from "@/components/BackgroundShape";
import {
  CARE_SETTING_LABELS,
  getLeversByCategory,
  SETTING_CONFIG,
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
          w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
          transition-all duration-200
          ${isCompleted 
            ? 'bg-white border-2 border-neutral-300 text-neutral-500' 
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
          text-xs font-semibold uppercase tracking-wide transition-colors duration-200
          ${isActive ? 'text-neutral-700' : isCompleted ? 'text-neutral-500' : 'text-neutral-400'}
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
  
  return (
    <div className="flex items-center gap-4">
      <StepIndicator 
        stepNumber={1} 
        label="Care Setting" 
        isActive={!step1Complete}
        isCompleted={step1Complete}
      />
      <div className="w-6 h-px bg-neutral-300" />
      <StepIndicator 
        stepNumber={2} 
        label="ROI Priorities" 
        isActive={step1Complete}
        isCompleted={false}
      />
      <div className="w-6 h-px bg-neutral-300" />
      <StepIndicator 
        stepNumber={3} 
        label="Calculator" 
        isActive={false}
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
        inline-flex items-center gap-2 px-[18px] py-2.5 rounded-full border transition-all duration-150
        ${disabled
          ? 'opacity-65 cursor-default border-neutral-200 bg-white pointer-events-none'
          : selected
            ? 'border-[#F03319] bg-[#FFF4F2]'
            : 'border-[#D9D9D9] bg-white hover:border-neutral-400 cursor-pointer'
        }
      `}
      data-testid={`pill-setting-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Icon className={`w-4 h-4 ${selected ? 'text-[#F03319]' : disabled ? 'text-neutral-400' : 'text-neutral-600'}`} />
      <span className={`text-sm ${selected ? 'font-medium text-neutral-800' : disabled ? 'text-neutral-500' : 'text-neutral-700'}`}>
        {label}
      </span>
      {disabled && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400">
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
        relative w-full rounded-2xl transition-all duration-150 text-left cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(240,51,25,0.5)]
        border border-[#E2E2E2] hover:border-neutral-300
        overflow-hidden
        ${isSelected ? 'bg-[#FFF7F5]' : 'bg-white'}
      `}
      data-testid={`priority-card-${lever.id}`}
    >
      {isSelected && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: '#F03319' }}
        />
      )}
      <div className={`py-4 px-5 ${isSelected ? 'pl-6' : ''}`}>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            className="flex-shrink-0"
            data-testid={`checkbox-${lever.id}`}
          />
          <h4 className="font-medium text-neutral-900 text-[15px]">
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

function ModelSummaryPanel({
  selectedSetting,
  selectedLeverIds,
}: {
  selectedSetting: CareSettingType | null;
  selectedLeverIds: Set<string>;
}) {
  const selectedLevers = useMemo(() => {
    if (!selectedSetting) return [];
    const levers = SETTING_CONFIG[selectedSetting];
    return levers.filter((lever: LeverConfig) => selectedLeverIds.has(lever.id));
  }, [selectedSetting, selectedLeverIds]);

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 lg:p-6">
      <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-4">
        Model Summary
      </h3>
      
      {!selectedSetting ? (
        <p className="text-sm text-neutral-400 italic">
          Your model summary will appear here.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">Care Setting</p>
            <p className="text-sm font-medium text-neutral-800">
              {CARE_SETTING_LABELS[selectedSetting]}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-2">
              ROI Priorities ({selectedLevers.length})
            </p>
            {selectedLevers.length === 0 ? (
              <p className="text-sm text-neutral-400 italic">No priorities selected yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedLevers.map((lever: LeverConfig) => (
                  <li key={lever.id} className="flex items-start gap-2 text-sm text-neutral-700">
                    <Check className="w-4 h-4 text-[#F03319] flex-shrink-0 mt-0.5" />
                    <span>{lever.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
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
        <div className={`flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 ${isFirst ? '' : 'mt-6'}`}>
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
    <div className="min-h-screen flex flex-col relative font-sans" style={{ backgroundColor: '#F7F7F7' }}>
      <BackgroundShape />
      
      <header className="relative z-20 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[1300px] mx-auto px-6 md:px-8 h-[72px] md:h-[80px] flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 leading-tight">
              The ROI Calculator
            </h1>
            <p className="text-xs md:text-sm font-medium" style={{ color: '#F03319' }}>
              by Abridge
            </p>
          </div>
          
          <div className="hidden md:block">
            <Stepper selectedSetting={selectedSetting} hasSelectedLevers={selectedLeverIds.size > 0} />
          </div>
        </div>
        
        <div className="md:hidden border-t border-neutral-100 py-3 px-6">
          <Stepper selectedSetting={selectedSetting} hasSelectedLevers={selectedLeverIds.size > 0} />
        </div>
      </header>
      
      <div className="relative z-10 flex-1 overflow-y-auto pb-20">
        <div className="max-w-[1300px] mx-auto px-6 md:px-8 py-6 md:py-8">
          
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            
            <div className="flex-1 lg:w-[65%]">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-neutral-900 mb-1">
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
                <h2 className="text-xl font-semibold text-neutral-900 mb-1">
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
            
            <div className="lg:w-[35%]">
              <div className="lg:sticky lg:top-6">
                <ModelSummaryPanel 
                  selectedSetting={selectedSetting} 
                  selectedLeverIds={selectedLeverIds} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[#E5E5E5]">
        <div className="max-w-[1300px] mx-auto px-6 md:px-8 py-3 md:py-4 flex items-center justify-between gap-4">
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
              inline-flex items-center justify-center gap-2 px-6 py-2.5 
              rounded-full font-medium text-sm
              transition-all duration-200
              ${canContinue
                ? 'bg-neutral-900 text-white cursor-pointer hover:bg-neutral-800'
                : 'opacity-45 bg-neutral-900 text-white cursor-default pointer-events-none'
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
