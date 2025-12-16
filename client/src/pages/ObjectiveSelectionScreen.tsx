import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CareSettingCard } from "@/components/CareSettingCard";
import { BackgroundShape } from "@/components/BackgroundShape";
import {
  SETTING_CONFIG,
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

interface ObjectiveSelectionScreenProps {
  onComplete: (setting: CareSettingType, selectedLevers: string[]) => void;
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
  const [selectedSetting, setSelectedSetting] = useState<CareSettingType | null>(null);
  const [selectedLevers, setSelectedLevers] = useState<Set<string>>(new Set());

  const handleSettingSelect = (setting: AllSettingType) => {
    if (setting === "inpatient") {
      return;
    }
    setSelectedSetting(setting);
    setSelectedLevers(new Set());
  };

  const handleLeverToggle = (leverId: string) => {
    setSelectedLevers((prev) => {
      const next = new Set(prev);
      if (next.has(leverId)) {
        next.delete(leverId);
      } else {
        next.add(leverId);
      }
      return next;
    });
  };

  const handleContinue = () => {
    if (selectedSetting && selectedLevers.size > 0) {
      onComplete(selectedSetting, Array.from(selectedLevers));
    }
  };

  const leversByCategory = selectedSetting
    ? getLeversByCategory(selectedSetting)
    : null;

  const renderLeverItem = (lever: LeverConfig) => (
    <div
      key={lever.id}
      role="button"
      tabIndex={0}
      onClick={() => handleLeverToggle(lever.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleLeverToggle(lever.id);
        }
      }}
      className="w-full flex items-start space-x-4 p-4 rounded-xl bg-white border border-neutral-200 shadow-sm hover:border-black hover:shadow-md transition-all duration-200 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
      data-testid={`lever-option-${lever.id}`}
    >
      <Checkbox
        id={lever.id}
        checked={selectedLevers.has(lever.id)}
        onCheckedChange={() => handleLeverToggle(lever.id)}
        className="mt-1 pointer-events-none"
        tabIndex={-1}
        data-testid={`checkbox-lever-${lever.id}`}
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

  const renderCategorySection = (category: LeverCategory, levers: LeverConfig[]) => {
    if (levers.length === 0) return null;
    const CategoryIcon = CATEGORY_ICONS[category];

    return (
      <div key={category} className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <CategoryIcon className="h-4 w-4" />
          {CATEGORY_LABELS[category]}
        </div>
        <div className="space-y-3">
          {levers.map(renderLeverItem)}
        </div>
      </div>
    );
  };

  const isButtonDisabled = !selectedSetting || selectedLevers.size === 0;

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
            <h1 className="text-3xl font-semibold text-black">Abridge ROI Studio</h1>
            <p className="text-neutral-600 leading-relaxed">
              Choose your care setting to begin.
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
                  selected={selectedSetting === setting}
                  disabled={isInpatient}
                  onClick={() => handleSettingSelect(setting)}
                />
              );
            })}
          </div>

          {selectedSetting && leversByCategory && (
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-xs text-neutral-500">
                  Current Selection: {CARE_SETTING_LABELS[selectedSetting]}
                </p>
                <h2 className="text-xl font-semibold text-black">
                  Select your strategic priorities
                </h2>
              </div>
              
              <div 
                className="max-h-[400px] overflow-y-auto pr-2"
                style={{ scrollbarGutter: "stable" }}
              >
                <div className="space-y-8">
                  {renderCategorySection("time", leversByCategory.time)}
                  {renderCategorySection("documentation", leversByCategory.documentation)}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
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
