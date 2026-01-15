import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  AlertCircle, 
  HeartPulse, 
  Building2, 
  ArrowLeft,
  TrendingUp,
  Target,
  Save,
  Lightbulb,
  Check,
  DollarSign,
  Users,
  Calendar
} from "lucide-react";
import type { BaselineData } from "./expansion-types";
import { formatCurrency, formatNumber, formatPercent, getVolumeDiscount } from "./expansion-calculations";
import { 
  calculateCombinedDeployment, 
  getDriverDisplayName, 
  CARE_SETTING_DEFAULTS,
  type NewSettingConfig,
  type CombinedDeploymentModel
} from "./newCareSettingCalculations";

interface CombinedPreviewProps {
  baseline: BaselineData;
  settingType: "ed" | "nursing" | "inpatient";
  onBack: () => void;
  onSave: (scenario: {
    name: string;
    type: string;
    model: CombinedDeploymentModel;
  }) => void;
}

const SETTING_ICONS = {
  ed: AlertCircle,
  nursing: HeartPulse,
  inpatient: Building2,
};

const SETTING_NAMES = {
  ed: "Emergency Department",
  nursing: "Nursing",
  inpatient: "Inpatient",
};

export function CombinedPreview({ baseline, settingType, onBack, onSave }: CombinedPreviewProps) {
  const [config, setConfig] = useState<NewSettingConfig>({
    type: settingType,
    providers: 20,
    encounters: null,
    customEncounters: false,
    utilization: baseline.utilization || 0.65,
  });

  const settingDefaults = CARE_SETTING_DEFAULTS[settingType];
  const Icon = SETTING_ICONS[settingType];
  const settingName = SETTING_NAMES[settingType];

  const model = useMemo(() => {
    return calculateCombinedDeployment(baseline, config);
  }, [baseline, config]);

  const totalProviders = baseline.providers + config.providers;
  const volumeDiscount = getVolumeDiscount(totalProviders);

  const calculatedEncounters = config.encounters || 
    (config.providers * settingDefaults.encountersPerProvider);

  const handleProviderChange = (value: number[]) => {
    setConfig(prev => ({ ...prev, providers: value[0] }));
  };

  const handleSaveScenario = () => {
    onSave({
      name: `${baseline.careSetting || "Outpatient"} + ${settingName}`,
      type: "combined-setting",
      model,
    });
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-back-to-settings"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </button>

      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Icon className="h-8 w-8 text-[#F03319]" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {baseline.careSetting || "Outpatient"} + {settingName}
        </h1>
        <p className="text-muted-foreground">
          Explore how {settingName} would combine with your {baseline.careSetting || "Outpatient"} deployment
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_480px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="h-5 w-5 text-[#F03319]" />
                {settingName} Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">
                  How many {settingName} providers?
                </Label>
                
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={config.providers}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      providers: Math.max(1, parseInt(e.target.value) || 1) 
                    }))}
                    min={1}
                    max={100}
                    className="w-24"
                    data-testid="input-new-providers"
                  />
                  <span className="text-muted-foreground">providers</span>
                </div>

                <Slider
                  value={[config.providers]}
                  onValueChange={handleProviderChange}
                  min={5}
                  max={50}
                  step={5}
                  className="py-2"
                  data-testid="slider-new-providers"
                />

                <p className="text-sm text-muted-foreground">
                  Typical {settingName}: {settingDefaults.typicalProviders} providers
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Annual encounters</Label>
                
                <RadioGroup
                  value={config.customEncounters ? "custom" : "typical"}
                  onValueChange={(val) => setConfig(prev => ({
                    ...prev,
                    customEncounters: val === "custom",
                    encounters: val === "custom" ? prev.encounters : null,
                  }))}
                  className="space-y-3"
                >
                  <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    !config.customEncounters ? "border-[#F03319]/30 bg-[#F03319]/5" : "border-border"
                  }`}>
                    <RadioGroupItem value="typical" id="typical" className="mt-1" />
                    <div>
                      <Label htmlFor="typical" className="font-medium cursor-pointer">
                        Typical volume
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {config.providers} providers x {formatNumber(settingDefaults.encountersPerProvider)} = {formatNumber(config.providers * settingDefaults.encountersPerProvider)} encounters/year
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    config.customEncounters ? "border-[#F03319]/30 bg-[#F03319]/5" : "border-border"
                  }`}>
                    <RadioGroupItem value="custom" id="custom" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="custom" className="font-medium cursor-pointer">
                        Custom volume
                      </Label>
                      {config.customEncounters && (
                        <Input
                          type="number"
                          placeholder="Enter encounters/year"
                          value={config.encounters || ""}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            encounters: parseInt(e.target.value) || null,
                          }))}
                          className="mt-2 w-48"
                          data-testid="input-custom-encounters"
                        />
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {settingDefaults.avgWRVU && (
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4 text-[#F03319]" />
                    {settingName}-Specific Metrics
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Avg wRVU/encounter:</span>
                      <span className="ml-2 font-medium">{settingDefaults.avgWRVU}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expected utilization:</span>
                      <span className="ml-2 font-medium">{(config.utilization * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    {settingName} generates higher LoS value due to higher wRVU density
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-[#F03319]" />
                Value Drivers for {settingName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pre-selected based on {settingName} best practices:
              </p>
              
              <div className="space-y-3">
                {Object.entries(model.newSetting.benefits).map(([driver, value]) => (
                  <div key={driver} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-[#0E9F6E]" />
                        <span className="font-medium">{getDriverDisplayName(driver)}</span>
                      </div>
                      <span className="text-[#0E9F6E] font-medium">
                        {formatCurrency(value)}/year
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-[#F03319]" />
                Investment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost per provider/month:</span>
                  <span>${baseline.costPerProviderMonth}</span>
                </div>
                
                {volumeDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-[#0E9F6E]">
                      <span>Volume discount ({totalProviders} total providers):</span>
                      <span>-{(volumeDiscount * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Effective rate:</span>
                      <span>${(baseline.costPerProviderMonth * (1 - volumeDiscount)).toFixed(0)}/month</span>
                    </div>
                  </>
                )}
                
                <div className="flex justify-between pt-2 border-t border-border font-medium">
                  <span>Annual investment for {settingName}:</span>
                  <span>{formatCurrency(model.newSetting.cost)}</span>
                </div>
              </div>

              {volumeDiscount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-[#0E9F6E]/10 rounded-lg text-sm">
                  <Check className="h-4 w-4 text-[#0E9F6E] mt-0.5 flex-shrink-0" />
                  <span>
                    Reaching {totalProviders} providers unlocks {(volumeDiscount * 100).toFixed(0)}% enterprise discount
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="border-[#0E9F6E]/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Combined Deployment</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  Updates in real-time
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left py-2"></th>
                      <th className="text-right py-2 px-2">
                        <div>{baseline.careSetting || "Outpatient"}</div>
                        <div className="text-xs font-normal">(current)</div>
                      </th>
                      <th className="text-center py-2 px-1">+</th>
                      <th className="text-right py-2 px-2">
                        <div>{settingName}</div>
                        <div className="text-xs font-normal">(new)</div>
                      </th>
                      <th className="text-center py-2 px-1">=</th>
                      <th className="text-right py-2 px-2 text-[#0E9F6E]">
                        <div>Combined</div>
                        <div className="text-xs font-normal">(total)</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="py-2 text-muted-foreground">Providers</td>
                      <td className="text-right py-2 px-2">{model.baseline.providers}</td>
                      <td className="text-center py-2 px-1 text-muted-foreground">+</td>
                      <td className="text-right py-2 px-2">{model.newSetting.providers}</td>
                      <td className="text-center py-2 px-1 text-muted-foreground">=</td>
                      <td className="text-right py-2 px-2">
                        <div className="font-medium">{model.combined.providers}</div>
                        <div className="text-xs text-[#0E9F6E]">+{model.deltas.providersIncrease}%</div>
                      </td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-2 text-muted-foreground">Encounters</td>
                      <td className="text-right py-2 px-2">{formatNumber(model.baseline.encounters)}</td>
                      <td className="text-center py-2 px-1 text-muted-foreground">+</td>
                      <td className="text-right py-2 px-2">{formatNumber(model.newSetting.encounters)}</td>
                      <td className="text-center py-2 px-1 text-muted-foreground">=</td>
                      <td className="text-right py-2 px-2">
                        <div className="font-medium">{formatNumber(model.combined.encounters)}</div>
                        <div className="text-xs text-[#0E9F6E]">+{model.deltas.encountersIncrease}%</div>
                      </td>
                    </tr>
                    <tr className="border-t-2 border-border">
                      <td className="py-2 text-muted-foreground">Investment</td>
                      <td className="text-right py-2 px-2">{formatCurrency(model.baseline.cost)}</td>
                      <td className="text-center py-2 px-1 text-muted-foreground">+</td>
                      <td className="text-right py-2 px-2">{formatCurrency(model.newSetting.cost)}</td>
                      <td className="text-center py-2 px-1 text-muted-foreground">=</td>
                      <td className="text-right py-2 px-2 font-medium">{formatCurrency(model.combined.cost)}</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-2 text-muted-foreground">Benefit</td>
                      <td className="text-right py-2 px-2">{formatCurrency(model.baseline.benefit)}</td>
                      <td className="text-center py-2 px-1 text-muted-foreground">+</td>
                      <td className="text-right py-2 px-2">{formatCurrency(model.newSetting.totalBenefit)}</td>
                      <td className="text-center py-2 px-1 text-muted-foreground">=</td>
                      <td className="text-right py-2 px-2 font-medium">{formatCurrency(model.combined.benefit)}</td>
                    </tr>
                    <tr className="border-t border-border bg-[#0E9F6E]/5">
                      <td className="py-3 font-medium">Net Gain</td>
                      <td className="text-right py-3 px-2">
                        <div>{formatCurrency(model.baseline.netGain)}</div>
                        <div className="text-xs text-muted-foreground">baseline</div>
                      </td>
                      <td className="text-center py-3 px-1 text-muted-foreground">+</td>
                      <td className="text-right py-3 px-2">
                        <div>{formatCurrency(model.newSetting.netGain)}</div>
                        <div className="text-xs text-[#0E9F6E]">+{model.deltas.netGainIncrease}%</div>
                      </td>
                      <td className="text-center py-3 px-1 text-muted-foreground">=</td>
                      <td className="text-right py-3 px-2">
                        <div className="text-lg font-bold text-[#0E9F6E]">{formatCurrency(model.combined.netGain)}</div>
                        <div className="text-xs text-[#0E9F6E]">+{model.deltas.netGainIncrease}%</div>
                      </td>
                    </tr>
                    <tr className="border-t border-border bg-muted/30">
                      <td className="py-3 font-medium">ROI</td>
                      <td className="text-right py-3 px-2">{model.baseline.roi.toFixed(1)}x</td>
                      <td className="text-center py-3 px-1"></td>
                      <td className="text-right py-3 px-2">
                        <div className="font-medium">{model.newSetting.roi.toFixed(1)}x</div>
                        {model.newSetting.roi > model.baseline.roi && (
                          <Badge className="bg-[#0E9F6E] text-white text-xs mt-1">Higher!</Badge>
                        )}
                      </td>
                      <td className="text-center py-3 px-1"></td>
                      <td className="text-right py-3 px-2">
                        <div className="text-lg font-bold">{model.combined.roi.toFixed(1)}x</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-foreground mb-1">Key Insight</div>
                    <p className="text-sm text-muted-foreground">{model.insight}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Value Breakdown (Combined)</h4>
                
                <div className="space-y-2">
                  {Object.entries(model.combined.benefitsByDriver).map(([driver, value]) => {
                    const percentage = model.combined.benefit > 0 
                      ? (value / model.combined.benefit * 100) 
                      : 0;
                    const isFromBaseline = (baseline.benefits?.[driver as keyof typeof baseline.benefits] || 0) > 0;
                    const isFromNew = (model.newSetting.benefits[driver] || 0) > 0;
                    
                    return (
                      <div key={driver} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span>{getDriverDisplayName(driver)}</span>
                            {isFromBaseline && isFromNew && (
                              <Badge variant="outline" className="text-xs">Both</Badge>
                            )}
                            {isFromBaseline && !isFromNew && (
                              <Badge variant="secondary" className="text-xs">
                                From {baseline.careSetting || "Outpatient"}
                              </Badge>
                            )}
                            {!isFromBaseline && isFromNew && (
                              <Badge className="bg-[#F03319]/10 text-[#F03319] text-xs">
                                New from {settingName}
                              </Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {formatCurrency(value)} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#0E9F6E] rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="pt-2 border-t border-border text-sm">
                  <div className="flex justify-between font-medium">
                    <span>Total Annual Benefit:</span>
                    <span className="text-[#0E9F6E]">{formatCurrency(model.combined.benefit)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <h4 className="font-medium">3-Year Projection</h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Year 1-3 cumulative net gain:</span>
                  <span className="text-xl font-bold text-[#0E9F6E]">
                    {formatCurrency(model.combined.threeYearValue)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-[#0E9F6E]" />
                  Assumes same {(config.utilization * 100).toFixed(0)}% utilization as current {baseline.careSetting || "Outpatient"}
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.print()}
                  data-testid="button-export-model"
                >
                  Export Model
                </Button>
                <Button 
                  className="flex-1 bg-[#F03319] hover:bg-[#F03319]/90"
                  onClick={handleSaveScenario}
                  data-testid="button-save-scenario"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Scenario
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
