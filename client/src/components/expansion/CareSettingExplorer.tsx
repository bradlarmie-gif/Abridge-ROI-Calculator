import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  HeartPulse, 
  Building2, 
  ArrowLeft,
  TrendingUp,
  Target,
  Zap,
  DollarSign
} from "lucide-react";
import type { BaselineData } from "./expansion-types";
import { formatCurrency, formatNumber } from "./expansion-calculations";
import { CARE_SETTING_DEFAULTS, getDriverDisplayName } from "./newCareSettingCalculations";
import type { LeverId } from "@/lib/roi-types";

interface CareSettingExplorerProps {
  baseline: BaselineData;
  onSelect: (settingType: "ed" | "nursing" | "inpatient") => void;
  onBack: () => void;
}

const SETTING_ICONS = {
  ed: AlertCircle,
  nursing: HeartPulse,
  inpatient: Building2,
};

const SETTING_ICON_COLORS = {
  ed: "text-red-500",
  nursing: "text-pink-500",
  inpatient: "text-blue-500",
};

interface SettingCardData {
  id: "ed" | "nursing" | "inpatient";
  name: string;
  tagline: string;
  available: boolean;
  characteristics: string[];
  drivers: LeverId[];
  typicalROI: string;
  why: string;
  pricingNote: string;
}

export function CareSettingExplorer({ baseline, onSelect, onBack }: CareSettingExplorerProps) {
  const settings: SettingCardData[] = [
    {
      id: "ed",
      name: "Emergency Department",
      tagline: "High-volume, fast-paced acute care",
      available: true,
      characteristics: [
        "3,000-8,000 encounters per provider per year",
        "Higher wRVU density (2.4-3.2 per encounter)",
        "Time pressure makes efficiency critical"
      ],
      drivers: ["edThroughput", "edLevelOfService", "edDenialReduction"],
      typicalROI: "6-8x",
      why: "Time pressure makes documentation efficiency critical. Every minute saved = more patients seen = higher throughput = significant revenue impact.",
      pricingNote: `Same as Outpatient ($${baseline.costPerProviderMonth}/provider/month)`
    },
    {
      id: "nursing",
      name: "Nursing",
      tagline: "Bedside documentation, care coordination",
      available: false,
      characteristics: [
        "Different encounter patterns than providers",
        "Focus on time savings & documentation quality",
        "Significant overtime reduction opportunity"
      ],
      drivers: ["rnDocTime", "rnCommunication", "rnSafetyReduction"],
      typicalROI: "4-6x",
      why: "Nurses spend 25-35% of shift time on documentation. Abridge reclaims this time for patient care.",
      pricingNote: "Different structure (contact for details)"
    },
    {
      id: "inpatient",
      name: "Inpatient",
      tagline: "Hospital admissions, daily rounding",
      available: false,
      characteristics: [
        "Complex, multi-day encounters",
        "High HCC capture opportunity",
        "Critical for risk adjustment"
      ],
      drivers: ["hcc", "wrvu", "denials"],
      typicalROI: "5-7x",
      why: "Inpatient encounters generate the most complete clinical narratives, maximizing HCC capture and accurate coding.",
      pricingNote: `Same as Outpatient ($${baseline.costPerProviderMonth}/provider/month)`
    }
  ];

  const activeDriverNames = Object.entries(baseline.benefits || {})
    .filter(([, value]) => value && value > 0)
    .map(([key]) => getDriverDisplayName(key))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-back-to-scenarios"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Scenario Builder
      </button>

      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Building2 className="h-8 w-8 text-[#F03319]" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Add a New Care Setting</h1>
        <p className="text-muted-foreground">
          Explore how different care settings would combine with your current deployment
        </p>
      </div>

      <Card className="border-[#F03319]/20 bg-[#F03319]/5">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Your Current Deployment</div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-background">
                  {baseline.careSetting || "Outpatient"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatNumber(baseline.providers)} providers
                </span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-[#0E9F6E] font-medium">
                  {formatCurrency(baseline.netGain)} net gain
                </span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm font-medium">
                  {baseline.roi.toFixed(1)}x ROI
                </span>
              </div>
            </div>
            {activeDriverNames.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Active: {activeDriverNames.join(" • ")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {settings.map((setting) => {
          const Icon = SETTING_ICONS[setting.id];
          const iconColor = SETTING_ICON_COLORS[setting.id];
          
          return (
            <Card 
              key={setting.id}
              className={`relative overflow-hidden transition-all ${
                setting.available 
                  ? "cursor-pointer hover-elevate border-border hover:border-[#F03319]/30" 
                  : "opacity-60 cursor-not-allowed"
              }`}
              onClick={() => setting.available && onSelect(setting.id)}
              data-testid={`card-setting-${setting.id}`}
            >
              {!setting.available && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </div>
              )}
              
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-muted/50`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{setting.name}</h3>
                    <p className="text-sm text-muted-foreground">{setting.tagline}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    Typical Economics
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {setting.characteristics.map((char, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-muted-foreground/50">•</span>
                        {char}
                      </li>
                    ))}
                    <li className="flex items-start gap-2 text-[#0E9F6E] font-medium">
                      <span className="text-[#0E9F6E]/50">•</span>
                      {setting.typicalROI} ROI typical
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Target className="h-3.5 w-3.5" />
                    Key Value Drivers
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {setting.drivers.map((driver) => (
                      <Badge key={driver} variant="secondary" className="text-xs">
                        {getDriverDisplayName(driver)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Zap className="h-3.5 w-3.5" />
                    Why {setting.name}?
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {setting.why}
                  </p>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-2">
                    Pricing: {setting.pricingNote}
                  </div>
                  {setting.available && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      data-testid={`button-preview-${setting.id}`}
                    >
                      Preview Combined Impact
                      <TrendingUp className="h-3.5 w-3.5 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
