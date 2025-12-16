import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  SETTING_CONFIG,
  CARE_SETTING_LABELS,
  type CareSettingType,
  type AllSettingType,
  type LeverConfig,
} from "@/lib/SETTING_CONFIG";
import {
  Stethoscope,
  Siren,
  HeartPulse,
  Building2,
  ChevronRight,
  Settings2,
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

const ALL_SETTINGS: AllSettingType[] = ["outpatient", "ed", "nursing", "inpatient"];

export default function ObjectiveSelectionScreen({
  onComplete,
}: ObjectiveSelectionScreenProps) {
  const [selectedSetting, setSelectedSetting] = useState<CareSettingType | null>(null);
  const [selectedLevers, setSelectedLevers] = useState<Set<string>>(new Set());
  const [showInpatientMessage, setShowInpatientMessage] = useState(false);

  const handleSettingSelect = (setting: AllSettingType) => {
    if (setting === "inpatient") {
      setShowInpatientMessage(true);
      setSelectedSetting(null);
      setSelectedLevers(new Set());
      return;
    }
    setShowInpatientMessage(false);
    setSelectedSetting(setting);
    const allLeverIds = SETTING_CONFIG[setting].map((l) => l.id);
    setSelectedLevers(new Set(allLeverIds));
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

  const levers: LeverConfig[] = selectedSetting
    ? SETTING_CONFIG[selectedSetting]
    : [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-5xl space-y-12">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold">Abridge ROI Studio</h1>
          <p className="text-muted-foreground">
            Select your care setting and customize which impact areas to include
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ALL_SETTINGS.map((setting) => {
            const Icon = SETTING_ICONS[setting];
            const isInpatient = setting === "inpatient";
            const isSelected = selectedSetting === setting;

            return (
              <Card
                key={setting}
                className={`cursor-pointer transition-all border-2 ${
                  isSelected
                    ? "border-foreground shadow-md"
                    : "border-transparent hover:border-foreground/50"
                } ${isInpatient ? "opacity-80" : ""}`}
                onClick={() => handleSettingSelect(setting)}
                data-testid={`card-setting-${setting}`}
              >
                <CardContent className="p-8 text-center space-y-4">
                  <div
                    className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                      isSelected
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">
                      {CARE_SETTING_LABELS[setting]}
                    </h3>
                    {isInpatient && (
                      <Badge variant="secondary" className="text-xs">
                        Coming soon
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {showInpatientMessage && (
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Inpatient ROI model is under development.
            </p>
          </div>
        )}

        {selectedSetting && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Select Impact Areas for {CARE_SETTING_LABELS[selectedSetting]}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div 
                className="max-h-[340px] overflow-y-auto pr-2"
                style={{ scrollbarGutter: "stable" }}
              >
                <div className="space-y-4">
                  {levers.map((lever) => (
                    <div
                      key={lever.id}
                      className="flex items-start space-x-4 p-4 rounded-md border border-border hover:border-foreground/30 transition-colors"
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
                          className="font-medium cursor-pointer"
                        >
                          {lever.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {lever.description}
                        </p>
                      </div>
                    </div>
                  ))}
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
            data-testid="button-continue"
          >
            Continue to ROI Studio
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
