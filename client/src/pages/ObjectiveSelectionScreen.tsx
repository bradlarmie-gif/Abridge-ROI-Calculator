import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CareSettingCard } from "@/components/CareSettingCard";
import { BackgroundShape } from "@/components/BackgroundShape";
import {
  CARE_SETTING_LABELS,
  CATEGORY_LABELS,
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
  Clock,
  FileText,
} from "lucide-react";

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

export default function ObjectiveSelectionScreen({
  onComplete,
  initialSelectedSettings = [],
  initialSelectedLevers = [],
}: ObjectiveSelectionScreenProps) {
  const [selectedSettings, setSelectedSettings] = useState<CareSettingType[]>(initialSelectedSettings);
  const [selectedLevers, setSelectedLevers] = useState<Set<string>>(() => {
    return new Set(initialSelectedLevers.map(l => `${l.settingId}:${l.leverId}`));
  });
  const [showValidationError, setShowValidationError] = useState(false);

  const handleSettingToggle = (setting: AllSettingType) => {
    if (setting === "inpatient") {
      return;
    }
    setSelectedSettings((prev) => {
      if (prev.includes(setting)) {
        return prev.filter((s) => s !== setting);
      } else {
        return [...prev, setting];
      }
    });
    setShowValidationError(false);
  };

  const handleLeverToggle = (settingId: CareSettingType, leverId: string) => {
    const key = `${settingId}:${leverId}`;
    setSelectedLevers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isLeverSelected = (settingId: CareSettingType, leverId: string) => {
    return selectedLevers.has(`${settingId}:${leverId}`);
  };

  const handleContinue = () => {
    if (selectedSettings.length === 0) {
      setShowValidationError(true);
      return;
    }
    if (selectedLevers.size === 0) {
      return;
    }
    
    const levers: SelectedLever[] = [];
    selectedLevers.forEach((key) => {
      const [settingId, leverId] = key.split(":");
      levers.push({
        settingId: settingId as CareSettingType,
        leverId,
        active: true,
      });
    });
    
    onComplete(selectedSettings, levers);
  };

  const renderLeverItem = (settingId: CareSettingType, lever: LeverConfig) => {
    const isSelected = isLeverSelected(settingId, lever.id);
    return (
      <div
        key={`${settingId}-${lever.id}`}
        role="button"
        tabIndex={0}
        onClick={() => handleLeverToggle(settingId, lever.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLeverToggle(settingId, lever.id);
          }
        }}
        className={`w-full flex items-start space-x-4 p-4 rounded-xl bg-white transition-all duration-200 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(240,51,25,0.5)] ${
          isSelected 
            ? "border-2 shadow-md" 
            : "border border-neutral-200 shadow-sm hover:shadow-md"
        }`}
        style={{ borderColor: isSelected ? '#F03319' : undefined }}
        data-testid={`lever-option-${settingId}-${lever.id}`}
      >
        <Checkbox
          id={`${settingId}-${lever.id}`}
          checked={isSelected}
          onCheckedChange={() => handleLeverToggle(settingId, lever.id)}
          className="mt-1 pointer-events-none"
          tabIndex={-1}
          data-testid={`checkbox-lever-${settingId}-${lever.id}`}
        />
        <div className="flex-1">
          <span className="font-semibold text-black">
            {lever.label}
          </span>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {lever.description}
          </p>
        </div>
      </div>
    );
  };

  const renderCategorySection = (settingId: CareSettingType, category: LeverCategory, levers: LeverConfig[]) => {
    if (levers.length === 0) return null;
    const CategoryIcon = CATEGORY_ICONS[category];

    return (
      <div key={`${settingId}-${category}`} className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <CategoryIcon className="h-4 w-4" />
          {CATEGORY_LABELS[category]}
        </div>
        <div className="space-y-3">
          {levers.map((lever) => renderLeverItem(settingId, lever))}
        </div>
      </div>
    );
  };

  const renderSettingSection = (settingId: CareSettingType) => {
    const leversByCategory = getLeversByCategory(settingId);
    
    return (
      <div key={settingId} className="space-y-6">
        <h3 className="text-lg font-medium text-neutral-700">
          {CARE_SETTING_LABELS[settingId]}
        </h3>
        <div className="space-y-8">
          {renderCategorySection(settingId, "time", leversByCategory.time)}
          {renderCategorySection(settingId, "documentation", leversByCategory.documentation)}
        </div>
      </div>
    );
  };

  const hasSelectedPriorities = selectedLevers.size > 0;
  const currentSelectionText = selectedSettings.length > 0
    ? selectedSettings.map((s) => CARE_SETTING_LABELS[s]).join(", ")
    : "None";

  const handleButtonClick = () => {
    if (!hasSelectedPriorities) {
      setShowValidationError(true);
      return;
    }
    handleContinue();
  };

  return (
    <div className="min-h-screen flex flex-col relative font-sans" style={{ backgroundColor: '#FAFAF8' }}>
      <BackgroundShape />
      
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto pt-12 pb-6 px-8">
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-semibold" style={{ color: '#111111' }}>
                The ROI Calculator
              </h1>
              <p className="text-xl font-semibold" style={{ color: '#F03319' }}>
                by Abridge
              </p>
              <p className="text-sm text-neutral-600 pt-2">
                Select the care setting(s) you want to explore.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-5">
              {ALL_SETTINGS.map((setting) => {
                const isInpatient = setting === "inpatient";
                return (
                  <CareSettingCard
                    key={setting}
                    icon={SETTING_ICONS[setting]}
                    title={CARE_SETTING_LABELS[setting]}
                    selected={selectedSettings.includes(setting as CareSettingType)}
                    disabled={isInpatient}
                    onClick={() => handleSettingToggle(setting)}
                  />
                );
              })}
            </div>

            {selectedSettings.length > 0 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs text-neutral-500">
                    Current Selection: {currentSelectionText}
                  </p>
                  <h2 className="text-xl font-semibold text-black">
                    Select Your Strategic Priorities
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Build your business case. One priority at a time.
                  </p>
                </div>
                
                <div className="space-y-12">
                  {selectedSettings.map((settingId) => renderSettingSection(settingId))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div 
        className="relative z-20 border-t border-neutral-200 py-4 px-8"
        style={{ backgroundColor: '#FAFAF8' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:justify-end items-center gap-2">
          {showValidationError && !hasSelectedPriorities && (
            <p className="text-sm text-red-600" data-testid="error-no-priority">
              Select at least one strategic priority to continue.
            </p>
          )}
          <button
            type="button"
            disabled={!hasSelectedPriorities}
            onClick={handleButtonClick}
            className={`
              inline-flex items-center justify-center gap-2 px-6 py-2.5 
              rounded-lg border font-medium text-base
              transition-all duration-200
              w-full sm:w-auto
              ${hasSelectedPriorities
                ? 'bg-black border-black text-[#FAFAF8] cursor-pointer hover:bg-neutral-800'
                : 'opacity-60 bg-white border-black text-black cursor-pointer'
              }
            `}
            data-testid="button-continue"
          >
            Explore the Calculator
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
