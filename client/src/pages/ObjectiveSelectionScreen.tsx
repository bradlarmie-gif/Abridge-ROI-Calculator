import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BackgroundPattern } from "@/components/BackgroundPattern";
import { CareSettingCard } from "@/components/CareSettingCard";
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
  Settings2,
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
      className="flex items-start space-x-4 p-4 rounded-md border border-neutral-200 hover:border-neutral-400 transition-colors bg-white"
      data-testid={`lever-option-${lever.id}`}
    >
      <Checkbox
        id={lever.id}
        checked={selectedLevers.has(lever.id)}
        onCheckedChange={() => handleLeverToggle(lever.id)}
        className="mt-1"
        data-testid={`checkbox-lever-${lever.id}`}
      />
      <div className="flex-1">
        <Label
          htmlFor={lever.id}
          className="font-medium cursor-pointer text-black"
        >
          {lever.label}
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
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

  return (
    <div className="min-h-screen bg-white relative">
      <BackgroundPattern />
      
      <div className="relative z-10 px-8 py-12 min-h-screen">
        <div className="w-full max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-black font-sans">Abridge ROI Studio</h1>
            <p className="text-muted-foreground">
              Select your care setting and customize which strategic initiatives to include
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
            <Card className="border-neutral-200">
              <CardHeader className="pb-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Current setting: {CARE_SETTING_LABELS[selectedSetting]}
                  </p>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-black">
                    <Settings2 className="h-5 w-5" />
                    Select which strategic initiatives you would like Abridge to assist you with.
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div 
                  className="max-h-[340px] overflow-y-auto pr-2"
                  style={{ scrollbarGutter: "stable" }}
                >
                  <div className="space-y-6">
                    {renderCategorySection("time", leversByCategory.time)}
                    {renderCategorySection("documentation", leversByCategory.documentation)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center pt-2">
            <Button
              size="lg"
              disabled={!selectedSetting || selectedLevers.size === 0}
              onClick={handleContinue}
              className="bg-black hover:bg-neutral-900 text-[#D7C8B6]"
              data-testid="button-continue"
            >
              Enter the ROI Studio
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
