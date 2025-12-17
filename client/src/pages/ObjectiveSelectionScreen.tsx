import { useState, useMemo } from "react";
import { CareSettingCard } from "@/components/CareSettingCard";
import { BackgroundShape } from "@/components/BackgroundShape";
import {
  CARE_SETTING_LABELS,
  CATEGORY_LABELS,
  SETTING_CONFIG,
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
          w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium
          transition-all duration-200
          ${isCompleted 
            ? 'bg-[#F03319] text-white' 
            : isActive 
              ? 'bg-[#F03319] text-white' 
              : 'bg-neutral-200 text-neutral-500'
          }
        `}
      >
        {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
      </div>
      <span 
        className={`
          text-sm font-medium transition-colors duration-200
          ${isActive || isCompleted ? 'text-neutral-900' : 'text-neutral-400'}
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
    <div className="flex items-center justify-center gap-8 py-4">
      <StepIndicator 
        stepNumber={1} 
        label="Care Setting" 
        isActive={!step1Complete}
        isCompleted={step1Complete}
      />
      <div className="w-8 h-px bg-neutral-300" />
      <StepIndicator 
        stepNumber={2} 
        label="ROI Priorities" 
        isActive={step1Complete && !step2Complete}
        isCompleted={step2Complete}
      />
      <div className="w-8 h-px bg-neutral-300" />
      <StepIndicator 
        stepNumber={3} 
        label="Calculator" 
        isActive={step1Complete && step2Complete}
        isCompleted={false}
      />
    </div>
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
        w-full p-5 rounded-xl bg-white transition-all duration-200 text-left cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(240,51,25,0.5)]
        ${isSelected 
          ? "border-2 shadow-md" 
          : "border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300"
        }
      `}
      style={{ borderColor: isSelected ? '#F03319' : undefined }}
      data-testid={`priority-card-${lever.id}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-0.5 flex-shrink-0"
          data-testid={`checkbox-${lever.id}`}
        />
        <div className="flex-1">
          <h4 className="font-semibold text-black text-base">
            {lever.label}
          </h4>
          <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
            {lever.description}
          </p>
          <p className="text-sm mt-2">
            <span className="font-semibold text-neutral-800">This lever drives:</span>{' '}
            <span className="text-neutral-600">{lever.driverSummary}</span>
          </p>
        </div>
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
    setSelectedSetting(setting);
    setSelectedLeverIds(new Set());
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

  const renderCategorySection = (category: LeverCategory, levers: LeverConfig[]) => {
    if (levers.length === 0) return null;
    const CategoryIcon = CATEGORY_ICONS[category];
    const categoryLabel = category === 'time' ? 'Capacity & Labor' : 'Revenue & Risk';

    return (
      <div key={category} className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-500 uppercase tracking-wide">
          <CategoryIcon className="h-4 w-4" />
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
    <div className="min-h-screen flex flex-col relative font-sans" style={{ backgroundColor: '#FAFAF8' }}>
      <BackgroundShape />
      
      <div className="relative z-10 flex-1 overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto pt-10 pb-6 px-6">
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <div className="leading-tight">
                <h1 className="text-4xl font-bold" style={{ color: '#111111' }}>
                  The ROI Calculator
                </h1>
                <p className="text-lg font-semibold mt-1" style={{ color: '#F03319' }}>
                  by Abridge
                </p>
              </div>
              <p className="text-base text-neutral-600 pt-3 max-w-xl mx-auto">
                Build a focused, defensible ROI model across any care setting in three simple steps.
              </p>
            </div>

            <Stepper selectedSetting={selectedSetting} hasSelectedLevers={selectedLeverIds.size > 0} />

            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-black">
                  Step 1 - Choose your care setting
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Pick where you want to measure impact first. You can always come back and run another setting.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                {ALL_SETTINGS.map((setting) => {
                  const isInpatient = setting === "inpatient";
                  return (
                    <CareSettingCard
                      key={setting}
                      icon={SETTING_ICONS[setting]}
                      title={CARE_SETTING_LABELS[setting]}
                      selected={selectedSetting === setting}
                      disabled={isInpatient}
                      onClick={() => handleSettingSelect(setting)}
                    />
                  );
                })}
              </div>

              {!selectedSetting && (
                <p className="text-xs text-neutral-500 italic">
                  You'll choose your ROI priority next.
                </p>
              )}
            </div>

            <div 
              className={`
                space-y-5 transition-opacity duration-300
                ${selectedSetting ? 'opacity-100' : 'opacity-40 pointer-events-none'}
              `}
            >
              <div>
                <h2 className="text-lg font-semibold text-black">
                  Step 2 - Choose your ROI priorities
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Select all ROI levers you want included in this model. You can choose more than one — most organizations activate multiple levers at once.
                </p>
              </div>

              {!selectedSetting && (
                <p className="text-sm text-neutral-500 py-4">
                  Choose a setting above to see relevant priorities.
                </p>
              )}

              {selectedSetting && leversByCategory && (
                <div className="space-y-6">
                  {renderCategorySection("time", leversByCategory.time)}
                  {renderCategorySection("documentation", leversByCategory.documentation)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-1.5">
        {canContinue && (
          <p className="text-sm text-neutral-500">
            {selectedLeverIds.size} lever{selectedLeverIds.size > 1 ? 's' : ''} selected
          </p>
        )}
        <button
          type="button"
          disabled={!canContinue}
          onClick={handleContinue}
          className={`
            inline-flex items-center justify-center gap-2 px-6 py-2.5 
            rounded-lg border font-medium text-base
            transition-all duration-200
            ${canContinue
              ? 'bg-black border-black text-[#FAFAF8] cursor-pointer hover:bg-neutral-800'
              : 'opacity-50 bg-white border-neutral-300 text-neutral-400 cursor-not-allowed'
            }
          `}
          data-testid="button-continue"
        >
          Continue to calculator
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
