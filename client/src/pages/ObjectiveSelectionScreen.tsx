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
}

const SETTING_ICONS: Record<AllSettingType, typeof Stethoscope> = {
  outpatient: Stethoscope,
  ed: Siren,
  nursing: HeartPulse,
  inpatient: Building2,
};

const SETTING_SUBTITLES: Record<AllSettingType, string> = {
  outpatient: "Clinical Note",
  ed: "Clinical Note",
  nursing: "Flowsheet Documentation",
  inpatient: "Coming soon",
};

const CATEGORY_ICONS: Record<LeverCategory, typeof Clock> = {
  time: Clock,
  documentation: FileText,
};

const ALL_SETTINGS: AllSettingType[] = ["outpatient", "ed", "nursing", "inpatient"];

export default function ObjectiveSelectionScreen({
  onComplete,
}: ObjectiveSelectionScreenProps) {
  const [selectedSettings, setSelectedSettings] = useState<CareSettingType[]>([]);
  const [selectedLevers, setSelectedLevers] = useState<Set<string>>(new Set());
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
        className="w-full flex items-start space-x-4 p-4 rounded-xl bg-white border border-neutral-200 shadow-sm hover:border-black hover:shadow-md transition-all duration-200 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
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

  const isButtonDisabled = selectedSettings.length === 0 || selectedLevers.size === 0;
  const currentSelectionText = selectedSettings.length > 0
    ? selectedSettings.map((s) => CARE_SETTING_LABELS[s]).join(", ")
    : "None";

  return (
    <div className="min-h-screen relative font-sans" style={{ backgroundColor: '#FAFAF8' }}>
      <BackgroundShape />
      
      <div className="absolute top-0 left-0 px-6 pt-6 z-20">
        <span 
          className="text-2xl font-semibold tracking-wide"
          style={{ color: '#F03319' }}
        >
          ABRIDGE
        </span>
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto pt-24 pb-24 px-8">
        <div className="space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-semibold text-black">
              The ROI Workbook by <span style={{ color: '#F03319' }}>Abridge</span>
            </h1>
            <p className="text-lg font-medium text-neutral-700">
              Select Care Setting(s) Below
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ALL_SETTINGS.map((setting) => {
              const isInpatient = setting === "inpatient";
              return (
                <CareSettingCard
                  key={setting}
                  icon={SETTING_ICONS[setting]}
                  title={CARE_SETTING_LABELS[setting]}
                  subtitle={SETTING_SUBTITLES[setting]}
                  selected={selectedSettings.includes(setting as CareSettingType)}
                  disabled={isInpatient}
                  onClick={() => handleSettingToggle(setting)}
                  data-testid={`card-setting-${setting}`}
                />
              );
            })}
          </div>

          {selectedSettings.length > 0 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-xs text-neutral-500">
                  Current Selection: {currentSelectionText}
                </p>
                <h2 className="text-xl font-semibold text-black">
                  Select your strategic priorities
                </h2>
              </div>
              
              <div 
                className="max-h-[500px] overflow-y-auto pr-2"
                style={{ scrollbarGutter: "stable" }}
              >
                <div className="space-y-12">
                  {selectedSettings.map((settingId) => renderSettingSection(settingId))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-2 pt-4">
            {showValidationError && (
              <p className="text-sm text-red-600" data-testid="error-no-setting">
                Select at least one care setting to continue.
              </p>
            )}
            <button
              type="button"
              disabled={isButtonDisabled}
              onClick={handleContinue}
              className={`
                inline-flex items-center justify-center gap-2 px-8 py-3 
                rounded-xl border font-semibold text-base
                transition-all duration-200
                ${isButtonDisabled 
                  ? 'opacity-50 cursor-not-allowed bg-white border-neutral-300 text-neutral-400' 
                  : 'bg-white border-black text-black hover:bg-black hover:text-white cursor-pointer'
                }
              `}
              data-testid="button-continue"
            >
              Enter the ROI Studio
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
