import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight, Check, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { BaselineData, ExpansionInputs, DriverValidation } from "./expansion-types";
import type { LeverId } from "@/lib/roi-types";
import type { CareSettingType, LeverConfig } from "@/lib/SETTING_CONFIG";
import { formatCurrency, getScalingFactor } from "./expansion-calculations";
import { SETTING_CONFIG } from "@/lib/SETTING_CONFIG";

interface Step3Props {
  baseline: BaselineData;
  inputs: ExpansionInputs;
  careSetting: CareSettingType;
  onUpdate: (updates: Partial<ExpansionInputs>) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function Step3_RealityCheck({
  baseline,
  inputs,
  careSetting,
  onUpdate,
  onContinue,
  onBack,
}: Step3Props) {
  const leverConfigs = SETTING_CONFIG[careSetting] as LeverConfig[];
  
  const activeDrivers = Object.entries(baseline.benefits || {})
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key: key as LeverId, value: value as number }));

  const providerRatio = inputs.targetProviders / baseline.providers;
  const encounterRatio = providerRatio;

  const [validations, setValidations] = useState<Record<LeverId, DriverValidation>>(() => {
    const initial: Record<string, DriverValidation> = {};
    activeDrivers.forEach(({ key, value }) => {
      const scaling = getScalingFactor(key, providerRatio, encounterRatio);
      initial[key] = {
        driverId: key,
        baselineValue: value,
        scalingFactor: scaling,
        adjustedValue: value * scaling,
        confidence: "high",
        notes: "",
      };
    });
    return initial as Record<LeverId, DriverValidation>;
  });

  useEffect(() => {
    const updated: Record<string, DriverValidation> = {};
    activeDrivers.forEach(({ key, value }) => {
      const defaultScaling = getScalingFactor(key, providerRatio, encounterRatio);
      const existing = validations[key];
      const userScale = existing?.scalingFactor || defaultScaling;
      updated[key] = {
        driverId: key,
        baselineValue: value,
        scalingFactor: userScale,
        adjustedValue: value * userScale,
        confidence: existing?.confidence || "high",
        notes: existing?.notes || "",
      };
    });
    setValidations(updated as Record<LeverId, DriverValidation>);
  }, [inputs.targetProviders]);

  const getDriverLabel = (driverId: LeverId): string => {
    const config = leverConfigs.find((l: LeverConfig) => l.id === driverId);
    return config?.label || driverId;
  };

  const updateDriverScaling = (driverId: LeverId, factor: number) => {
    setValidations((prev) => ({
      ...prev,
      [driverId]: {
        ...prev[driverId],
        scalingFactor: factor,
        adjustedValue: prev[driverId].baselineValue * factor,
      },
    }));
  };

  const updateDriverConfidence = (driverId: LeverId, confidence: "high" | "medium" | "low") => {
    setValidations((prev) => ({
      ...prev,
      [driverId]: {
        ...prev[driverId],
        confidence,
      },
    }));
  };

  const handleContinue = () => {
    onUpdate({
      driverValidations: validations,
    });
    onContinue();
  };

  const totalProjectedBenefit = Object.values(validations).reduce(
    (sum, v) => sum + v.adjustedValue,
    0
  );

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-[#0E9F6E] text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-red-500 text-white";
      default:
        return "bg-muted";
    }
  };

  const getScalingIcon = (factor: number, defaultFactor: number) => {
    if (factor > defaultFactor * 1.05) {
      return <TrendingUp className="h-4 w-4 text-[#0E9F6E]" />;
    } else if (factor < defaultFactor * 0.95) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Reality Check</h1>
        <p className="text-muted-foreground">
          Validate how each value driver will scale with your expansion. Adjust expectations based on your organization's context.
        </p>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">Expansion Multiplier</span>
              <div className="text-lg font-bold">{providerRatio.toFixed(1)}x providers</div>
            </div>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Projected Annual Benefit</span>
              <div className="text-lg font-bold text-[#0E9F6E]" data-testid="text-projected-benefit">
                {formatCurrency(totalProjectedBenefit)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {activeDrivers.map(({ key, value }) => {
          const validation = validations[key];
          if (!validation) return null;

          const defaultScaling = getScalingFactor(key, providerRatio, encounterRatio);
          
          return (
            <Card key={key} className="border-border" data-testid={`driver-validation-${key}`}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F03319]/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-[#F03319]" />
                    </div>
                    <div>
                      <h4 className="font-medium">{getDriverLabel(key)}</h4>
                      <p className="text-sm text-muted-foreground">
                        Baseline: {formatCurrency(value)}/year
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {getScalingIcon(validation.scalingFactor, defaultScaling)}
                      <span className="text-lg font-bold text-[#0E9F6E]">
                        {formatCurrency(validation.adjustedValue)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {validation.scalingFactor.toFixed(1)}x scaling
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Label>Scaling factor</Label>
                    <span className="text-muted-foreground">
                      Default: {defaultScaling.toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    value={[validation.scalingFactor]}
                    onValueChange={([v]) => updateDriverScaling(key, v)}
                    min={0.5}
                    max={Math.max(defaultScaling * 1.5, 3)}
                    step={0.1}
                    className="w-full"
                    data-testid={`slider-scaling-${key}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Conservative (0.5x)</span>
                    <span>Aggressive ({Math.max(defaultScaling * 1.5, 3).toFixed(1)}x)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Confidence level</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={validation.confidence === "high" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateDriverConfidence(key, "high")}
                      className={validation.confidence === "high" ? "bg-[#0E9F6E] hover:bg-[#0E9F6E]/90" : ""}
                      data-testid={`button-confidence-high-${key}`}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      High
                    </Button>
                    <Button
                      variant={validation.confidence === "medium" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateDriverConfidence(key, "medium")}
                      className={validation.confidence === "medium" ? "bg-yellow-500 hover:bg-yellow-500/90" : ""}
                      data-testid={`button-confidence-medium-${key}`}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Medium
                    </Button>
                    <Button
                      variant={validation.confidence === "low" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateDriverConfidence(key, "low")}
                      className={validation.confidence === "low" ? "bg-red-500 hover:bg-red-500/90" : ""}
                      data-testid={`button-confidence-low-${key}`}
                    >
                      Low
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeDrivers.length === 0 && (
        <Card className="border-border">
          <CardContent className="p-6 text-center text-muted-foreground">
            No active value drivers to validate. Please enable drivers in the calculator.
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#F03319]/5 border-[#F03319]/20">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="w-10 h-10 bg-[#F03319]/20 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-[#F03319]" />
          </div>
          <div>
            <strong className="text-foreground">These projections are modeled, not guaranteed.</strong>
            <p className="text-sm text-muted-foreground mt-1">
              Actual results will depend on implementation quality, adoption rates, and organizational factors.
              Use conservative estimates for budget planning.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleContinue} className="gap-2" data-testid="button-continue-maturity">
          View Your Maturity Model
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
