import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Users, Calendar, Percent, TrendingUp, DollarSign, CheckCircle2 } from "lucide-react";
import type { BaselineData } from "./expansion-types";
import type { LeverId } from "@/lib/roi-types";
import type { CareSettingType, LeverConfig } from "@/lib/SETTING_CONFIG";
import { formatCurrency, formatNumber, formatPercent, formatROI } from "./expansion-calculations";
import { SETTING_CONFIG } from "@/lib/SETTING_CONFIG";

interface Step1Props {
  baseline: BaselineData;
  careSetting: CareSettingType;
  onContinue: () => void;
  onBack: () => void;
}

const DRIVER_ICONS: Record<string, string> = {
  patientAccess: "Users",
  workforce: "Heart",
  wrvu: "TrendingUp",
  overtime: "Clock",
  denials: "AlertTriangle",
  hcc: "Activity",
  edThroughput: "Zap",
  edRetention: "Heart",
  edLevelOfService: "TrendingUp",
  edDenialReduction: "AlertTriangle",
  rnDocTime: "Clock",
  rnCommunication: "MessageCircle",
  rnSafetyReduction: "Shield",
  rnDiagnosisSeverity: "Activity",
};

export function Step1_BaselineReview({
  baseline,
  careSetting,
  onContinue,
  onBack,
}: Step1Props) {
  const activeDrivers = Object.entries(baseline.benefits || {})
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key: key as LeverId, value: value as number }));

  const leverConfigs = SETTING_CONFIG[careSetting] as LeverConfig[];

  const getDriverLabel = (driverId: LeverId): string => {
    const config = leverConfigs.find((l: LeverConfig) => l.id === driverId);
    return config?.label || driverId;
  };

  const getMaturityStatus = () => {
    if (baseline.utilization >= 0.75) {
      return {
        label: "Mature deployment (75%+ utilization)",
        variant: "default" as const,
        className: "bg-[#0E9F6E] text-white",
      };
    } else if (baseline.utilization >= 0.6) {
      return {
        label: "Maturing deployment (60-75% utilization)",
        variant: "secondary" as const,
        className: "bg-blue-500 text-white",
      };
    } else {
      return {
        label: "Ramping up (40-60% utilization)",
        variant: "outline" as const,
        className: "bg-yellow-500 text-white",
      };
    }
  };

  const maturityStatus = getMaturityStatus();

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-back-to-calculator"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Calculator
      </button>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Your Current Abridge Deployment</h1>
        <p className="text-muted-foreground">
          Let's start with what you've already proven. We'll use this as the foundation for your expansion model.
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#F03319]" />
              Deployment
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-foreground" data-testid="text-baseline-providers">
                  {formatNumber(baseline.providers)}
                </div>
                <div className="text-sm text-muted-foreground">providers</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-foreground" data-testid="text-baseline-encounters">
                  {formatNumber(baseline.encounters)}
                </div>
                <div className="text-sm text-muted-foreground">encounters/year</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-foreground" data-testid="text-baseline-utilization">
                  {formatPercent(baseline.utilization)}
                </div>
                <div className="text-sm text-muted-foreground">utilization</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl font-bold text-foreground">
                  {formatNumber(Math.round(baseline.encounters / baseline.providers))}
                </div>
                <div className="text-sm text-muted-foreground">encounters/provider</div>
              </div>
            </div>

            <div className="flex justify-center">
              <Badge className={maturityStatus.className} data-testid="badge-maturity-status">
                {maturityStatus.label}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#F03319]" />
              Financial Performance
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Annual Investment</span>
                <span className="font-medium" data-testid="text-baseline-cost">{formatCurrency(baseline.annualCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Annual Benefit</span>
                <span className="font-medium text-[#0E9F6E]" data-testid="text-baseline-benefit">{formatCurrency(baseline.totalBenefit)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50 bg-muted/30 px-3 rounded">
                <span className="font-medium">Net Gain</span>
                <span className="font-bold text-[#0E9F6E]" data-testid="text-baseline-net-gain">{formatCurrency(baseline.netGain)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-muted/30 px-3 rounded">
                <span className="font-medium">ROI</span>
                <span className="font-bold text-[#0E9F6E]" data-testid="text-baseline-roi">{formatROI(baseline.roi)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#F03319]" />
              Active Value Drivers
            </h3>
            <div className="space-y-2">
              {activeDrivers.length > 0 ? (
                activeDrivers.map(({ key, value }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    data-testid={`driver-item-${key}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#F03319]/10 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-[#F03319]" />
                      </div>
                      <div>
                        <div className="font-medium">{getDriverLabel(key)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(value)}/year
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(Math.round(value / baseline.providers))}/provider
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No active drivers configured</p>
              )}
            </div>
          </div>

          <div className="bg-[#0E9F6E]/10 border border-[#0E9F6E]/20 rounded-lg p-4 flex items-start gap-4">
            <div className="w-10 h-10 bg-[#0E9F6E]/20 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-[#0E9F6E]" />
            </div>
            <div>
              <strong className="text-foreground">This is your proven performance.</strong>
              <p className="text-sm text-muted-foreground mt-1">
                We'll use these real results to model your expansion, accounting for ramp-up time and maturity curves.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onContinue} className="gap-2" data-testid="button-start-expansion">
          Start Expansion Model
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
