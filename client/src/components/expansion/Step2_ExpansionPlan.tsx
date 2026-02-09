import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, ArrowRight, Users, Clock, DollarSign, Check, AlertTriangle, Lightbulb } from "lucide-react";
import type { BaselineData, ExpansionInputs, PhasedPlan } from "./expansion-types";
import { formatCurrency, getVolumeDiscount } from "./expansion-calculations";

interface Step2Props {
  baseline: BaselineData;
  inputs: ExpansionInputs;
  onUpdate: (updates: Partial<ExpansionInputs>) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function Step2_ExpansionPlan({
  baseline,
  inputs,
  onUpdate,
  onContinue,
  onBack,
}: Step2Props) {
  const [targetProviders, setTargetProviders] = useState(inputs.targetProviders);
  const [rolloutType, setRolloutType] = useState(inputs.rolloutType);
  const [phasedPlan, setPhasedPlan] = useState<PhasedPlan>(inputs.phasedPlan);
  const [pricingModel, setPricingModel] = useState(inputs.pricingModel);
  const [enterpriseCost, setEnterpriseCost] = useState(inputs.enterpriseCost);

  const newProviders = targetProviders - baseline.providers;
  const maxSliderValue = Math.max(baseline.providers * 3, 200);

  useEffect(() => {
    if (rolloutType === "phased" && newProviders > 0) {
      const wave1 = Math.round(newProviders * 0.4);
      const wave2 = Math.round(newProviders * 0.3);
      const wave3 = newProviders - wave1 - wave2;
      setPhasedPlan({
        wave1: { providers: wave1, month: 1 },
        wave2: { providers: wave2, month: 4 },
        wave3: { providers: wave3, month: 7 },
      });
    }
  }, [newProviders, rolloutType]);

  const handleContinue = () => {
    onUpdate({
      targetProviders,
      rolloutType,
      phasedPlan,
      pricingModel,
      enterpriseCost: pricingModel === "enterprise" ? enterpriseCost : null,
    });
    onContinue();
  };

  const calculateCost = () => {
    if (pricingModel === "per-provider") {
      return targetProviders * baseline.costPerProviderMonth * 12;
    }
    if (enterpriseCost && enterpriseCost > 0) {
      return enterpriseCost;
    }
    const discount = getVolumeDiscount(targetProviders);
    return targetProviders * baseline.costPerProviderMonth * 12 * (1 - discount);
  };

  const standardCost = targetProviders * baseline.costPerProviderMonth * 12;
  const actualCost = calculateCost();
  const discount = getVolumeDiscount(targetProviders);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Plan Your Expansion</h1>
        <p className="text-muted-foreground">
          Let's map out how you'll scale from {baseline.providers} to your target deployment.
        </p>
      </div>

      <Card className="border-[#EA2C00]/20 bg-[#EA2C00]/5">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">
              How many providers do you want to expand to?
            </Label>

            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={targetProviders}
                onChange={(e) => setTargetProviders(parseInt(e.target.value) || baseline.providers)}
                min={baseline.providers}
                max={500}
                className="w-32"
                data-testid="input-target-providers"
              />
              <span className="text-muted-foreground">providers</span>
            </div>

            <Slider
              value={[targetProviders]}
              onValueChange={([value]) => setTargetProviders(value)}
              min={baseline.providers}
              max={maxSliderValue}
              step={5}
              className="w-full"
              data-testid="slider-target-providers"
            />

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{baseline.providers}</span>
              <span className="font-medium text-foreground">
                {targetProviders}
                {newProviders > 0 && (
                  <span className="text-[#0E9F6E] ml-1">+{newProviders}</span>
                )}
              </span>
              <span>{maxSliderValue}</span>
            </div>

            {newProviders <= 0 && (
              <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  Target must be greater than current deployment ({baseline.providers} providers)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {newProviders > 0 && (
        <>
          <Card>
            <CardContent className="p-6 space-y-6">
              <Label className="text-base font-medium">When will they go live?</Label>

              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    rolloutType === "all-at-once"
                      ? "border-[#EA2C00] bg-[#EA2C00]/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => setRolloutType("all-at-once")}
                  data-testid="option-all-at-once"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                      rolloutType === "all-at-once" ? "border-[#EA2C00]" : "border-muted-foreground"
                    }`}>
                      {rolloutType === "all-at-once" && (
                        <div className="w-2 h-2 bg-[#EA2C00] rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">All at Once</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        All {newProviders} providers go live in Month 1
                      </p>
                      <div className="flex flex-col gap-1 mt-3 text-xs">
                        <span className="flex items-center gap-1 text-[#0E9F6E]">
                          <Check className="h-3 w-3" /> Faster time to value
                        </span>
                        <span className="flex items-center gap-1 text-yellow-600">
                          <AlertTriangle className="h-3 w-3" /> Higher change management risk
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    rolloutType === "phased"
                      ? "border-[#EA2C00] bg-[#EA2C00]/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => setRolloutType("phased")}
                  data-testid="option-phased"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                      rolloutType === "phased" ? "border-[#EA2C00]" : "border-muted-foreground"
                    }`}>
                      {rolloutType === "phased" && (
                        <div className="w-2 h-2 bg-[#EA2C00] rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Phased Rollout</span>
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Deploy in waves over 12 months
                      </p>
                      <div className="flex flex-col gap-1 mt-3 text-xs">
                        <span className="flex items-center gap-1 text-[#0E9F6E]">
                          <Check className="h-3 w-3" /> Lower risk, apply learnings
                        </span>
                        <span className="flex items-center gap-1 text-[#0E9F6E]">
                          <Check className="h-3 w-3" /> Spread investment over time
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {rolloutType === "phased" && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Wave 1</span>
                        <span className="text-muted-foreground">Months 1-3</span>
                      </div>
                      <Input
                        type="number"
                        value={phasedPlan.wave1.providers}
                        onChange={(e) =>
                          setPhasedPlan({
                            ...phasedPlan,
                            wave1: { ...phasedPlan.wave1, providers: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="text-center"
                        data-testid="input-wave1-providers"
                      />
                      <span className="text-xs text-muted-foreground block text-center">providers</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Wave 2</span>
                        <span className="text-muted-foreground">Months 4-6</span>
                      </div>
                      <Input
                        type="number"
                        value={phasedPlan.wave2.providers}
                        onChange={(e) =>
                          setPhasedPlan({
                            ...phasedPlan,
                            wave2: { ...phasedPlan.wave2, providers: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="text-center"
                        data-testid="input-wave2-providers"
                      />
                      <span className="text-xs text-muted-foreground block text-center">providers</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Wave 3</span>
                        <span className="text-muted-foreground">Months 7-12</span>
                      </div>
                      <Input
                        type="number"
                        value={phasedPlan.wave3.providers}
                        onChange={(e) =>
                          setPhasedPlan({
                            ...phasedPlan,
                            wave3: { ...phasedPlan.wave3, providers: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="text-center"
                        data-testid="input-wave3-providers"
                      />
                      <span className="text-xs text-muted-foreground block text-center">providers</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Phased rollout reduces risk and allows you to refine your approach between cohorts
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-6">
              <Label className="text-base font-medium">Pricing for expansion</Label>

              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    pricingModel === "per-provider"
                      ? "border-[#EA2C00] bg-[#EA2C00]/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => setPricingModel("per-provider")}
                  data-testid="option-per-provider"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                      pricingModel === "per-provider" ? "border-[#EA2C00]" : "border-muted-foreground"
                    }`}>
                      {pricingModel === "per-provider" && (
                        <div className="w-2 h-2 bg-[#EA2C00] rounded-full" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">Per-Provider Pricing</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        ${baseline.costPerProviderMonth}/provider/month
                      </p>
                      <div className="text-xs text-muted-foreground mt-2">
                        Same as your current deployment
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    pricingModel === "enterprise"
                      ? "border-[#EA2C00] bg-[#EA2C00]/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => setPricingModel("enterprise")}
                  data-testid="option-enterprise"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                      pricingModel === "enterprise" ? "border-[#EA2C00]" : "border-muted-foreground"
                    }`}>
                      {pricingModel === "enterprise" && (
                        <div className="w-2 h-2 bg-[#EA2C00] rounded-full" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Enterprise Annual Contract</span>
                        {discount > 0 && (
                          <Badge className="bg-[#0E9F6E] text-white text-xs">
                            {(discount * 100).toFixed(0)}% discount
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Custom pricing for large deployments
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {pricingModel === "enterprise" && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Custom annual contract value (optional)
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter annual cost"
                        value={enterpriseCost ? enterpriseCost.toLocaleString("en-US") : ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/,/g, "");
                          setEnterpriseCost(val ? parseFloat(val) : null);
                        }}
                        className="flex-1"
                        data-testid="input-enterprise-cost"
                      />
                      <span className="text-muted-foreground">/year</span>
                    </div>
                  </div>

                  {discount > 0 && (
                    <div className="bg-[#0E9F6E]/10 p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Standard pricing</span>
                        <span className="line-through text-muted-foreground">
                          {formatCurrency(standardCost)}/year
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">With {(discount * 100).toFixed(0)}% discount</span>
                        <span className="font-bold text-[#0E9F6E]">
                          {formatCurrency(actualCost)}/year
                        </span>
                      </div>
                      <Badge className="bg-[#0E9F6E] text-white">
                        Save {formatCurrency(standardCost - actualCost)}/year
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="p-6">
              <h4 className="font-medium mb-4">Expansion Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">Adding</div>
                  <div className="font-bold text-[#0E9F6E]" data-testid="text-adding-providers">+{newProviders} providers</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Rollout</div>
                  <div className="font-medium">
                    {rolloutType === "phased" ? "Phased (12 months)" : "All at once"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Annual Investment</div>
                  <div className="font-medium" data-testid="text-annual-investment">{formatCurrency(actualCost)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Cost per Provider</div>
                  <div className="font-medium">
                    ${Math.round(actualCost / targetProviders / 12)}/month
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={newProviders <= 0}
          className="gap-2"
          data-testid="button-continue-reality-check"
        >
          Continue to Reality Check
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
