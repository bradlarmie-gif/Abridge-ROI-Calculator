import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/NumberField";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, AlertTriangle, Clock, Users, TrendingUp, FileText, Lightbulb, Heart } from "lucide-react";
import type { BaselineData, ExpansionInputs, DriverValidation, AccessValidation, RetentionValidation, LosValidation, DefaultDriverValidation } from "./expansion-types";
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

const DRIVER_NAMES: Record<string, string> = {
  patientAccess: "Patient Access",
  workforce: "Clinician Retention",
  wrvu: "Accurate Level of Service",
  overtime: "Overtime & Locum Savings",
  denials: "Denial Prevention",
  hcc: "HCC Capture",
};

const DRIVER_ICONS: Record<string, typeof Users> = {
  patientAccess: Users,
  workforce: Heart,
  wrvu: TrendingUp,
  overtime: Clock,
  denials: AlertTriangle,
  hcc: FileText,
};

function getDefaultValidation(driverId: LeverId, baselineValue: number, baseline: BaselineData, providerRatio: number): DriverValidation {
  const defaultScaling = getScalingFactor(driverId, providerRatio, providerRatio);
  
  switch(driverId) {
    case "patientAccess":
      return {
        driverId,
        baselineValue,
        scalingFactor: defaultScaling,
        adjustedValue: baselineValue * defaultScaling,
        confidence: "high",
        notes: "",
        hasCapacity: true,
        sameDemand: true,
        additionalVisitsPerWeek: baselineValue > 0 && baseline.providers > 0
          ? Math.round((baselineValue / baseline.providers / 48 / 200) * 10) / 10
          : 2.5,
      } as AccessValidation;
    case "workforce":
      return {
        driverId,
        baselineValue,
        scalingFactor: defaultScaling,
        adjustedValue: baselineValue * defaultScaling,
        confidence: "high",
        notes: "",
        sameTurnoverRisk: true,
        turnoverReduction: 1.6,
      } as RetentionValidation;
    case "wrvu":
      return {
        driverId,
        baselineValue,
        scalingFactor: defaultScaling,
        adjustedValue: baselineValue * defaultScaling,
        confidence: "high",
        notes: "",
        sameCaseMix: true,
        wrvuUplift: baselineValue > 0 && baseline.providers > 0
          ? Math.round(baselineValue / baseline.providers / 40)
          : 68,
      } as LosValidation;
    default:
      return {
        driverId,
        baselineValue,
        scalingFactor: defaultScaling,
        adjustedValue: baselineValue * defaultScaling,
        confidence: "high",
        notes: "",
        inheritsFromBaseline: true,
      } as DefaultDriverValidation;
  }
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
  const newProviders = inputs.targetProviders - baseline.providers;

  const [currentDriverIndex, setCurrentDriverIndex] = useState(0);
  const currentDriver = activeDrivers[currentDriverIndex];

  const [validations, setValidations] = useState<Record<LeverId, DriverValidation>>(() => {
    const initial: Record<string, DriverValidation> = {};
    activeDrivers.forEach(({ key, value }) => {
      initial[key] = getDefaultValidation(key, value, baseline, providerRatio);
    });
    return initial as Record<LeverId, DriverValidation>;
  });

  useEffect(() => {
    const updated: Record<string, DriverValidation> = {};
    activeDrivers.forEach(({ key, value }) => {
      const existing = validations[key];
      if (existing) {
        updated[key] = {
          ...existing,
          baselineValue: value,
          adjustedValue: value * existing.scalingFactor,
        };
      } else {
        updated[key] = getDefaultValidation(key, value, baseline, providerRatio);
      }
    });
    setValidations(updated as Record<LeverId, DriverValidation>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.targetProviders, JSON.stringify(baseline.benefits), careSetting]);

  const updateValidation = (driverId: LeverId, updates: Partial<DriverValidation>) => {
    setValidations((prev) => {
      const current = prev[driverId];
      const updated = { ...current, ...updates };
      if ('scalingFactor' in updates && updates.scalingFactor !== undefined) {
        updated.adjustedValue = updated.baselineValue * updates.scalingFactor;
      }
      return { ...prev, [driverId]: updated };
    });
  };

  const handleNext = () => {
    if (currentDriverIndex < activeDrivers.length - 1) {
      setCurrentDriverIndex(currentDriverIndex + 1);
    } else {
      onUpdate({ driverValidations: validations });
      onContinue();
    }
  };

  const handlePrevious = () => {
    if (currentDriverIndex > 0) {
      setCurrentDriverIndex(currentDriverIndex - 1);
    } else {
      onBack();
    }
  };

  const progress = ((currentDriverIndex + 1) / activeDrivers.length) * 100;

  const getDriverLabel = (driverId: LeverId): string => {
    const config = leverConfigs.find((l: LeverConfig) => l.id === driverId);
    return config?.label || DRIVER_NAMES[driverId] || driverId;
  };

  if (activeDrivers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Reality Check</h1>
          <p className="text-muted-foreground">No active drivers to validate.</p>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={onContinue} className="gap-2" data-testid="button-continue-maturity">
            Continue to Projections
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const renderDriverValidation = () => {
    if (!currentDriver) return null;
    
    const { key, value } = currentDriver;
    const validation = validations[key];
    if (!validation) return null;

    const valuePerProvider = value / baseline.providers;

    switch (key) {
      case "patientAccess":
        return (
          <AccessValidationCard
            baseline={baseline}
            validation={validation as AccessValidation}
            onUpdate={(updates) => updateValidation(key, updates)}
            valuePerProvider={valuePerProvider}
            newProviders={newProviders}
            inputs={inputs}
          />
        );
      case "workforce":
        return (
          <RetentionValidationCard
            baseline={baseline}
            validation={validation as RetentionValidation}
            onUpdate={(updates) => updateValidation(key, updates)}
            valuePerProvider={valuePerProvider}
            newProviders={newProviders}
            inputs={inputs}
          />
        );
      case "wrvu":
        return (
          <LosValidationCard
            baseline={baseline}
            validation={validation as LosValidation}
            onUpdate={(updates) => updateValidation(key, updates)}
            valuePerProvider={valuePerProvider}
            newProviders={newProviders}
            inputs={inputs}
          />
        );
      default:
        return (
          <DefaultValidationCard
            driverId={key}
            baseline={baseline}
            validation={validation as DefaultDriverValidation}
            valuePerProvider={valuePerProvider}
            newProviders={newProviders}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Reality Check</h1>
        <p className="text-muted-foreground">
          Let's make sure our expansion model reflects your actual situation.
          We'll go through each value driver to validate assumptions.
        </p>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Driver {currentDriverIndex + 1} of {activeDrivers.length}
            </span>
            <span className="font-medium">{getDriverLabel(currentDriver.key)}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex gap-2 flex-wrap">
            {activeDrivers.map(({ key }, index) => {
              const DriverIcon = DRIVER_ICONS[key] || TrendingUp;
              return (
                <Badge
                  key={key}
                  variant={index === currentDriverIndex ? "default" : index < currentDriverIndex ? "secondary" : "outline"}
                  className={`gap-1 cursor-pointer ${index === currentDriverIndex ? "bg-[#EA2C00]" : ""}`}
                  onClick={() => setCurrentDriverIndex(index)}
                  data-testid={`badge-driver-${key}`}
                >
                  <DriverIcon className="h-3 w-3" />
                  {DRIVER_NAMES[key] || key}
                  {index < currentDriverIndex && <Check className="h-3 w-3" />}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="min-h-[400px]" data-testid={`driver-validation-${currentDriver.key}`}>
        {renderDriverValidation()}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious} className="gap-2" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          {currentDriverIndex === 0 ? "Back" : "Previous Driver"}
        </Button>
        <Button onClick={handleNext} className="gap-2" data-testid="button-continue-maturity">
          {currentDriverIndex < activeDrivers.length - 1 ? "Next Driver" : "View Your Model"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface AccessValidationCardProps {
  baseline: BaselineData;
  validation: AccessValidation;
  onUpdate: (updates: Partial<AccessValidation>) => void;
  valuePerProvider: number;
  newProviders: number;
  inputs: ExpansionInputs;
}

function AccessValidationCard({ baseline, validation, onUpdate, valuePerProvider, newProviders, inputs }: AccessValidationCardProps) {
  const additionalVisitsPerWeek = validation.additionalVisitsPerWeek || 2.5;
  const revenuePerVisit = 200;
  const calculatedValue = additionalVisitsPerWeek * 48 * revenuePerVisit;

  return (
    <div className="space-y-6">
      <Card className="border-[#EA2C00]/20 bg-[#EA2C00]/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#EA2C00]/10 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-[#EA2C00]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Patient Access</h2>
              <p className="text-muted-foreground">Turn documentation efficiency into additional visit capacity</p>
            </div>
          </div>
          
          <div className="bg-background rounded-lg p-4 mb-6">
            <div className="text-sm text-muted-foreground mb-1">Your current performance:</div>
            <div className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(valuePerProvider)}/provider/year</div>
            <div className="text-sm text-muted-foreground">
              ~{additionalVisitsPerWeek.toFixed(1)} additional visits per week × ${revenuePerVisit}/visit
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-2 text-lg font-medium">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Capacity Constraint Check
          </div>

          <div className="space-y-3">
            <Label className="text-base">Are your provider schedules currently full?</Label>
            <p className="text-sm text-muted-foreground">
              Patient Access value requires available patient demand. If schedules aren't full, adding capacity won't generate revenue.
            </p>

            <div className="grid gap-3">
              <div
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  validation.hasCapacity ? "border-[#0E9F6E] bg-[#0E9F6E]/5" : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => onUpdate({ hasCapacity: true })}
                data-testid="option-has-capacity-yes"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                    validation.hasCapacity ? "border-[#0E9F6E]" : "border-muted-foreground"
                  }`}>
                    {validation.hasCapacity && <div className="w-2 h-2 bg-[#0E9F6E] rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <strong>Yes - We have wait times / limited availability</strong>
                    <p className="text-sm text-muted-foreground">Patient demand exists, capacity is the constraint</p>
                    {validation.hasCapacity && (
                      <Badge className="mt-2 bg-[#0E9F6E]">
                        <Check className="h-3 w-3 mr-1" />
                        Patient demand supports access value
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  !validation.hasCapacity ? "border-yellow-500 bg-yellow-500/5" : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => onUpdate({ hasCapacity: false })}
                data-testid="option-has-capacity-no"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                    !validation.hasCapacity ? "border-yellow-500" : "border-muted-foreground"
                  }`}>
                    {!validation.hasCapacity && <div className="w-2 h-2 bg-yellow-500 rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <strong>No - We have unfilled appointment slots</strong>
                    <p className="text-sm text-muted-foreground">Patient demand may limit access value</p>
                    {!validation.hasCapacity && (
                      <Badge className="mt-2 bg-yellow-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Access value may be lower than projected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {validation.hasCapacity && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base">
                Will your NEW {newProviders} providers serve the same patient population?
              </Label>
              <div className="grid gap-3">
                <div
                  className={`p-3 border rounded-lg cursor-pointer ${
                    validation.sameDemand ? "border-[#EA2C00] bg-[#EA2C00]/5" : "border-border"
                  }`}
                  onClick={() => onUpdate({ sameDemand: true })}
                  data-testid="option-same-demand-yes"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      validation.sameDemand ? "border-[#EA2C00] bg-[#EA2C00]" : "border-muted-foreground"
                    }`} />
                    <span>Same patient population (same demand level)</span>
                  </div>
                </div>
                <div
                  className={`p-3 border rounded-lg cursor-pointer ${
                    !validation.sameDemand ? "border-[#EA2C00] bg-[#EA2C00]/5" : "border-border"
                  }`}
                  onClick={() => onUpdate({ sameDemand: false })}
                  data-testid="option-same-demand-no"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      !validation.sameDemand ? "border-[#EA2C00] bg-[#EA2C00]" : "border-muted-foreground"
                    }`} />
                    <span>Different population or lower demand environment</span>
                  </div>
                </div>
              </div>

              {!validation.sameDemand && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <Label>Expected additional visits for new providers (per week):</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[additionalVisitsPerWeek]}
                      onValueChange={([v]) => onUpdate({ additionalVisitsPerWeek: v })}
                      min={0}
                      max={5}
                      step={0.5}
                      className="flex-1"
                      data-testid="slider-visits-per-week"
                    />
                    <NumberField
                      value={additionalVisitsPerWeek}
                      onValueChange={(v) => onUpdate({ additionalVisitsPerWeek: v })}
                      className="w-20"
                      data-testid="input-visits-per-week"
                    />
                    <span className="text-sm text-muted-foreground">visits/week</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Projected Expansion Value (Patient Access)
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Year 1</div>
              <div className="text-lg font-bold text-[#0E9F6E]">
                {formatCurrency(Math.round(calculatedValue * newProviders * 0.5))}
              </div>
              <div className="text-xs text-muted-foreground">50% avg utilization</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Year 2</div>
              <div className="text-lg font-bold text-[#0E9F6E]">
                {formatCurrency(Math.round(calculatedValue * newProviders * 0.8))}
              </div>
              <div className="text-xs text-muted-foreground">80% as adoption matures</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Year 3</div>
              <div className="text-lg font-bold text-[#0E9F6E]">
                {formatCurrency(Math.round(calculatedValue * newProviders))}
              </div>
              <div className="text-xs text-muted-foreground">100% matches current</div>
            </div>
          </div>
          {!validation.hasCapacity && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              Values above assume capacity constraints are addressed. Actual value may be lower if patient demand is insufficient.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface RetentionValidationCardProps {
  baseline: BaselineData;
  validation: RetentionValidation;
  onUpdate: (updates: Partial<RetentionValidation>) => void;
  valuePerProvider: number;
  newProviders: number;
  inputs: ExpansionInputs;
}

function RetentionValidationCard({ baseline, validation, onUpdate, valuePerProvider, newProviders, inputs }: RetentionValidationCardProps) {
  const replacementCost = 250000;
  const preventedDepartures = baseline.benefits.workforce ? (baseline.benefits.workforce / replacementCost) : 0;

  return (
    <div className="space-y-6">
      <Card className="border-[#EA2C00]/20 bg-[#EA2C00]/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#EA2C00]/10 rounded-full flex items-center justify-center">
              <Heart className="h-6 w-6 text-[#EA2C00]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Clinician Retention</h2>
              <p className="text-muted-foreground">Lower burnout and turnover by reducing administrative burden</p>
            </div>
          </div>
          
          <div className="bg-background rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Your current performance:</div>
            <div className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(valuePerProvider)}/provider/year</div>
            <div className="text-sm text-muted-foreground">
              Preventing ~{preventedDepartures.toFixed(2)} departures/year
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Clock className="h-5 w-5 text-yellow-500" />
            Timing Reality Check
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <p className="font-medium">
              Retention benefits take 12-18 months to materialize. Here's why:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-[#EA2C00] mb-1">Month 3</div>
                <div className="text-sm font-medium">Early Experience</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Providers start feeling time savings
                </p>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-[#EA2C00] mb-1">Month 6</div>
                <div className="text-sm font-medium">Burnout Reduction</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Improved work-life balance
                </p>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-[#0E9F6E] mb-1">Month 12-18</div>
                <div className="text-sm font-medium">Retention Decision</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Providers choose to stay
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm bg-background p-3 rounded-lg">
              <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span>
                This lag effect means Year 1 retention value is lower while providers experience the benefits.
                By Year 3, full retention value is realized.
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Will new providers have similar turnover risk?</Label>
            <div className="grid gap-3">
              <div
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  validation.sameTurnoverRisk ? "border-[#EA2C00] bg-[#EA2C00]/5" : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => onUpdate({ sameTurnoverRisk: true })}
                data-testid="option-same-turnover-yes"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                    validation.sameTurnoverRisk ? "border-[#EA2C00]" : "border-muted-foreground"
                  }`}>
                    {validation.sameTurnoverRisk && <div className="w-2 h-2 bg-[#EA2C00] rounded-full" />}
                  </div>
                  <div>
                    <strong>Yes - Same specialties, same burnout factors</strong>
                    <p className="text-sm text-muted-foreground">New providers face similar retention challenges</p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  !validation.sameTurnoverRisk ? "border-[#EA2C00] bg-[#EA2C00]/5" : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => onUpdate({ sameTurnoverRisk: false })}
                data-testid="option-same-turnover-no"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                    !validation.sameTurnoverRisk ? "border-[#EA2C00]" : "border-muted-foreground"
                  }`}>
                    {!validation.sameTurnoverRisk && <div className="w-2 h-2 bg-[#EA2C00] rounded-full" />}
                  </div>
                  <div>
                    <strong>No - Different situation</strong>
                    <p className="text-sm text-muted-foreground">Adjust expected turnover reduction below</p>
                  </div>
                </div>
              </div>
            </div>

            {!validation.sameTurnoverRisk && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <Label>Expected turnover reduction (%):</Label>
                <div className="flex items-center gap-4">
                  <NumberField
                    value={validation.turnoverReduction}
                    onValueChange={(v) => onUpdate({ turnoverReduction: v })}
                    className="w-24"
                    data-testid="input-turnover-reduction"
                  />
                  <span className="text-sm text-muted-foreground">Current: 1.6% reduction (8% → 6.4%)</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Projected Expansion Value (Retention)
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Year 1</div>
              <div className="text-lg font-bold text-[#0E9F6E]">
                {formatCurrency(Math.round(valuePerProvider * newProviders * 0.2))}
              </div>
              <div className="text-xs text-muted-foreground">20% of full value - lag effect</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Year 2</div>
              <div className="text-lg font-bold text-[#0E9F6E]">
                {formatCurrency(Math.round(valuePerProvider * newProviders * 0.7))}
              </div>
              <div className="text-xs text-muted-foreground">70% - providers reaching decisions</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Year 3</div>
              <div className="text-lg font-bold text-[#0E9F6E]">
                {formatCurrency(Math.round(valuePerProvider * newProviders))}
              </div>
              <div className="text-xs text-muted-foreground">100% - full retention benefit</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-[#0E9F6E]/10 border border-[#0E9F6E]/20 rounded-lg text-sm text-[#0E9F6E] flex items-start gap-2">
            <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
            This conservative approach accounts for the time it takes for retention benefits to materialize.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface LosValidationCardProps {
  baseline: BaselineData;
  validation: LosValidation;
  onUpdate: (updates: Partial<LosValidation>) => void;
  valuePerProvider: number;
  newProviders: number;
  inputs: ExpansionInputs;
}

function LosValidationCard({ baseline, validation, onUpdate, valuePerProvider, newProviders, inputs }: LosValidationCardProps) {
  const wrvuUplift = validation.wrvuUplift || 68;
  const wrvuRate = 40;

  return (
    <div className="space-y-6">
      <Card className="border-[#EA2C00]/20 bg-[#EA2C00]/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#EA2C00]/10 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-[#EA2C00]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Accurate Level of Service</h2>
              <p className="text-muted-foreground">Capture wRVUs accurately through better documentation</p>
            </div>
          </div>
          
          <div className="bg-background rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Your current performance:</div>
            <div className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(valuePerProvider)}/provider/year</div>
            <div className="text-sm text-muted-foreground">
              {wrvuUplift} incremental wRVUs × ${wrvuRate}/wRVU
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-base">Will new providers have similar case mix?</Label>
            <p className="text-sm text-muted-foreground">
              wRVU opportunity depends on visit complexity and specialty mix
            </p>
            <div className="grid gap-3">
              <div
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  validation.sameCaseMix ? "border-[#0E9F6E] bg-[#0E9F6E]/5" : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => onUpdate({ sameCaseMix: true })}
                data-testid="option-same-case-mix-yes"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                    validation.sameCaseMix ? "border-[#0E9F6E]" : "border-muted-foreground"
                  }`}>
                    {validation.sameCaseMix && <div className="w-2 h-2 bg-[#0E9F6E] rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <strong>Yes - Same specialties, similar complexity</strong>
                    <p className="text-sm text-muted-foreground">New providers will see similar wRVU opportunity</p>
                    {validation.sameCaseMix && (
                      <Badge className="mt-2 bg-[#0E9F6E]">
                        <Check className="h-3 w-3 mr-1" />
                        wRVU capture will scale proportionally
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  !validation.sameCaseMix ? "border-[#EA2C00] bg-[#EA2C00]/5" : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => onUpdate({ sameCaseMix: false })}
                data-testid="option-same-case-mix-no"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                    !validation.sameCaseMix ? "border-[#EA2C00]" : "border-muted-foreground"
                  }`}>
                    {!validation.sameCaseMix && <div className="w-2 h-2 bg-[#EA2C00] rounded-full" />}
                  </div>
                  <div>
                    <strong>No - Different specialties or case mix</strong>
                    <p className="text-sm text-muted-foreground">Adjust expected wRVU uplift below</p>
                  </div>
                </div>
              </div>
            </div>

            {!validation.sameCaseMix && (
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <Label>Expected wRVU uplift for new providers (per year):</Label>
                <div className="flex items-center gap-4">
                  <NumberField
                    value={wrvuUplift}
                    onValueChange={(v) => onUpdate({ wrvuUplift: v })}
                    className="w-24"
                    data-testid="input-wrvu-uplift"
                  />
                  <span className="text-sm text-muted-foreground">wRVUs/year (typical range: 50-150)</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Projected Expansion Value (Level of Service)
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Year 1</div>
              <div className="text-lg font-bold text-[#0E9F6E]">
                {formatCurrency(Math.round(wrvuUplift * wrvuRate * newProviders * 0.5))}
              </div>
              <div className="text-xs text-muted-foreground">50% avg utilization</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Year 2</div>
              <div className="text-lg font-bold text-[#0E9F6E]">
                {formatCurrency(Math.round(wrvuUplift * wrvuRate * newProviders * 0.8))}
              </div>
              <div className="text-xs text-muted-foreground">80% as documentation improves</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Year 3</div>
              <div className="text-lg font-bold text-[#0E9F6E]">
                {formatCurrency(Math.round(wrvuUplift * wrvuRate * newProviders))}
              </div>
              <div className="text-xs text-muted-foreground">100% matches current</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DefaultValidationCardProps {
  driverId: LeverId;
  baseline: BaselineData;
  validation: DefaultDriverValidation;
  valuePerProvider: number;
  newProviders: number;
}

function DefaultValidationCard({ driverId, baseline, validation, valuePerProvider, newProviders }: DefaultValidationCardProps) {
  const DriverIcon = DRIVER_ICONS[driverId] || TrendingUp;
  const driverName = DRIVER_NAMES[driverId] || driverId;

  return (
    <div className="space-y-6">
      <Card className="border-[#EA2C00]/20 bg-[#EA2C00]/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#EA2C00]/10 rounded-full flex items-center justify-center">
              <DriverIcon className="h-6 w-6 text-[#EA2C00]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{driverName}</h2>
            </div>
          </div>
          
          <div className="bg-background rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Your current performance:</div>
            <div className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(valuePerProvider)}/provider/year</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 p-4 bg-[#0E9F6E]/10 rounded-lg">
            <Check className="h-5 w-5 text-[#0E9F6E] mt-0.5" />
            <div>
              <strong className="text-[#0E9F6E]">Inheriting from baseline</strong>
              <p className="text-sm text-muted-foreground mt-1">
                This driver will scale proportionally based on your proven performance.
                New providers expected to generate similar value per provider as your current deployment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Projected Expansion Value
          </h4>
          <div className="bg-background rounded-lg p-4">
            <div className="text-lg mb-2">
              {formatCurrency(valuePerProvider)} per provider × {newProviders} new providers
            </div>
            <div className="text-2xl font-bold text-[#0E9F6E]">
              = {formatCurrency(Math.round(valuePerProvider * newProviders))} annual value at maturity
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
