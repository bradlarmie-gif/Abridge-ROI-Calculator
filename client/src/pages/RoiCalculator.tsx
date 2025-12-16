import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { InputSection, InputField } from "@/components/InputSection";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { WaterfallChart } from "@/components/WaterfallChart";
import { LeverAccordion } from "@/components/LeverAccordion";
import { CommentaryBox } from "@/components/CommentaryBox";
import { StrategicDriverCard } from "@/components/StrategicDriverCard";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import { defaultInputs, type RoiInputs, type LeverId, type Lever, leverLabels, leverDescriptions } from "@/lib/roi-types";
import { calculateRoi, formatCurrency, formatNumber, formatPercent } from "@/lib/roi-calculator";
import { CARE_SETTING_LABELS, SETTING_CONFIG, type CareSettingType } from "@/lib/SETTING_CONFIG";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  Percent,
  Calculator,
  Settings,
  Target,
} from "lucide-react";

interface RoiCalculatorProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  onBack: () => void;
}

interface LeverWithSetting extends Lever {
  settingId: CareSettingType;
}

export default function RoiCalculator({ selectedSettings, selectedLevers, onBack }: RoiCalculatorProps) {
  const [leverStates, setLeverStates] = useState<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>();
    selectedLevers.forEach((l) => {
      map.set(`${l.settingId}:${l.leverId}`, l.active);
    });
    return map;
  });
  
  const [inputs, setInputs] = useState<RoiInputs>(() => {
    const initial: RoiInputs = JSON.parse(JSON.stringify(defaultInputs));
    const allLeverIds: LeverId[] = ["patientAccess", "overtime", "workforce", "wrvu", "denials", "riskAdjustment"];
    allLeverIds.forEach((id) => {
      initial.levers[id] = selectedLevers.some(
        (l) => l.leverId === id && l.active
      );
    });
    return initial;
  });
  const [commentary, setCommentary] = useState("");

  const results = useMemo(() => calculateRoi(inputs), [inputs]);

  const annualAbridgeCost = useMemo(
    () =>
      inputs.numberOfProviders * inputs.monthlyCostPerProvider * 12 +
      inputs.implementationCostYear1,
    [inputs.numberOfProviders, inputs.monthlyCostPerProvider, inputs.implementationCostYear1]
  );

  const leversWithSettings: LeverWithSetting[] = useMemo(() => {
    const leverList: LeverWithSetting[] = [];
    
    selectedSettings.forEach((settingId) => {
      selectedLevers
        .filter((l) => l.settingId === settingId)
        .forEach((l) => {
          const matchingLever = results.levers.find((rl) => rl.id === l.leverId);
          if (matchingLever) {
            const key = `${settingId}:${l.leverId}`;
            leverList.push({
              ...matchingLever,
              settingId,
              enabled: leverStates.get(key) ?? l.active,
            });
          }
        });
    });
    
    return leverList;
  }, [selectedSettings, selectedLevers, results.levers, leverStates]);

  const totalBenefitFromSelectedLevers = useMemo(() => {
    return leversWithSettings
      .filter((l) => l.enabled)
      .reduce((sum, l) => sum + l.value, 0);
  }, [leversWithSettings]);

  const adjustedRoiMultiple = useMemo(() => {
    return annualAbridgeCost > 0 ? totalBenefitFromSelectedLevers / annualAbridgeCost : 0;
  }, [totalBenefitFromSelectedLevers, annualAbridgeCost]);

  const adjustedNetValue = useMemo(() => {
    return totalBenefitFromSelectedLevers - annualAbridgeCost;
  }, [totalBenefitFromSelectedLevers, annualAbridgeCost]);

  const handleInputChange = (path: string, value: number | boolean) => {
    setInputs((prev) => {
      const newInputs = JSON.parse(JSON.stringify(prev)) as RoiInputs;
      const keys = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = newInputs;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      return newInputs;
    });
  };

  const handleLeverToggle = (settingId: CareSettingType, leverId: LeverId) => {
    const key = `${settingId}:${leverId}`;
    const newState = !leverStates.get(key);
    
    setLeverStates((prev) => {
      const next = new Map(prev);
      next.set(key, newState);
      return next;
    });
    
    setInputs((prev) => {
      const newInputs = JSON.parse(JSON.stringify(prev)) as RoiInputs;
      const anyLeverActiveForId = Array.from(leverStates.entries()).some(
        ([k, v]) => k.endsWith(`:${leverId}`) && k !== key && v
      ) || newState;
      newInputs.levers[leverId] = anyLeverActiveForId;
      return newInputs;
    });
  };

  const waterfallLevers: Lever[] = useMemo(() => {
    const leverMap = new Map<LeverId, Lever>();
    
    leversWithSettings.forEach((l) => {
      const existing = leverMap.get(l.id);
      if (existing) {
        if (l.enabled) {
          leverMap.set(l.id, {
            ...existing,
            value: existing.value + l.value,
            enabled: true,
          });
        }
      } else {
        leverMap.set(l.id, {
          id: l.id,
          label: l.label,
          value: l.enabled ? l.value : 0,
          enabled: l.enabled,
          description: l.description,
        });
      }
    });
    
    return Array.from(leverMap.values()).filter((l) => l.enabled);
  }, [leversWithSettings]);

  const settingsText = selectedSettings.map((s) => CARE_SETTING_LABELS[s]).join(", ");

  return (
    <div className="min-h-screen relative font-sans" style={{ backgroundColor: '#FAFAF8' }}>
      <div className="relative z-10 flex flex-col h-screen">
        <div className="bg-white border-b border-neutral-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <span 
              className="text-xl font-semibold tracking-wide"
              style={{ color: '#F03319' }}
            >
              ABRIDGE
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-sm text-neutral-600">
              {settingsText}
            </span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-96 bg-white border-r border-neutral-200 flex flex-col">
            <div className="p-6 border-b border-neutral-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="mb-2 -ml-2"
                data-testid="button-back"
              >
                Back to Selection
              </Button>
              <h1 className="text-2xl font-bold text-black">ROI Studio</h1>
              <p className="text-xs text-neutral-500 mt-1">
                Current Selection: {settingsText}
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {selectedSettings.includes("outpatient") && selectedSettings.length === 1 ? (
                  <>
                    <InputSection title="Scenario Inputs" icon={<Settings className="h-5 w-5" />}>
                      <InputField label="Abridge Utilization (%)">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Slider
                              value={[inputs.abridgeUtilizationPct]}
                              onValueChange={([v]) =>
                                handleInputChange("abridgeUtilizationPct", v)
                              }
                              max={100}
                              step={1}
                              className="flex-1"
                              data-testid="slider-utilization"
                            />
                            <span className="text-sm font-mono w-12">
                              {inputs.abridgeUtilizationPct}%
                            </span>
                          </div>
                        </div>
                      </InputField>
                      <InputField label="Annual Outpatient Encounters (in scope)">
                        <Input
                          type="number"
                          value={inputs.annualOutpatientEncounters}
                          onChange={(e) =>
                            handleInputChange("annualOutpatientEncounters", Number(e.target.value))
                          }
                          data-testid="input-encounters"
                        />
                      </InputField>
                      <InputField label="Providers in Scope">
                        <Input
                          type="number"
                          value={inputs.numberOfProviders}
                          onChange={(e) =>
                            handleInputChange("numberOfProviders", Number(e.target.value))
                          }
                          data-testid="input-num-providers"
                        />
                      </InputField>
                      <InputField label="Average Revenue per Encounter ($)">
                        <Input
                          type="number"
                          value={inputs.avgNetRevenuePerEncounter}
                          onChange={(e) =>
                            handleInputChange("avgNetRevenuePerEncounter", Number(e.target.value))
                          }
                          data-testid="input-avg-revenue"
                        />
                      </InputField>
                    </InputSection>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-neutral-600" />
                        <h3 className="text-sm font-semibold text-neutral-800 uppercase tracking-wide">
                          Strategic Drivers
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {SETTING_CONFIG.outpatient.map((lever) => {
                          const key = `outpatient:${lever.id}`;
                          const isActive = leverStates.get(key) ?? false;
                          return (
                            <StrategicDriverCard
                              key={lever.id}
                              title={lever.label}
                              active={isActive}
                              onClick={() => handleLeverToggle("outpatient", lever.id as LeverId)}
                              onShowWork={() => {}}
                              testId={`driver-card-${lever.id}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <InputSection title="Commercial Terms" icon={<DollarSign className="h-5 w-5" />}>
                      <InputField label="Contract Length (years)">
                        <Input
                          type="number"
                          value={inputs.contractLengthYears}
                          onChange={(e) =>
                            handleInputChange("contractLengthYears", Number(e.target.value))
                          }
                          data-testid="input-contract-length"
                        />
                      </InputField>
                      <InputField label="Number of Providers">
                        <Input
                          type="number"
                          value={inputs.numberOfProviders}
                          onChange={(e) =>
                            handleInputChange("numberOfProviders", Number(e.target.value))
                          }
                          data-testid="input-num-providers"
                        />
                      </InputField>
                      <InputField label="Monthly Cost per Provider ($)">
                        <Input
                          type="number"
                          value={inputs.monthlyCostPerProvider}
                          onChange={(e) =>
                            handleInputChange("monthlyCostPerProvider", Number(e.target.value))
                          }
                          data-testid="input-monthly-cost"
                        />
                      </InputField>
                      <InputField label="Implementation Cost Year 1 ($)">
                        <Input
                          type="number"
                          value={inputs.implementationCostYear1}
                          onChange={(e) =>
                            handleInputChange("implementationCostYear1", Number(e.target.value))
                          }
                          data-testid="input-impl-cost"
                        />
                      </InputField>
                      <InputField label="Annual Abridge Cost (Year 1)" readOnly>
                        <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                          <Calculator className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold font-mono" data-testid="text-annual-cost">
                            {formatCurrency(annualAbridgeCost)}
                          </span>
                        </div>
                      </InputField>
                    </InputSection>

                    <InputSection
                      title="Baseline Volume & Economics"
                      icon={<BarChart3 className="h-5 w-5" />}
                    >
                      <InputField label="Annual Outpatient Encounters">
                        <Input
                          type="number"
                          value={inputs.annualOutpatientEncounters}
                          onChange={(e) =>
                            handleInputChange("annualOutpatientEncounters", Number(e.target.value))
                          }
                          data-testid="input-encounters"
                        />
                      </InputField>
                      <InputField label="Abridge Utilization (%)">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Slider
                              value={[inputs.abridgeUtilizationPct]}
                              onValueChange={([v]) =>
                                handleInputChange("abridgeUtilizationPct", v)
                              }
                              max={100}
                              step={1}
                              className="flex-1"
                              data-testid="slider-utilization"
                            />
                            <span className="text-sm font-mono w-12">
                              {inputs.abridgeUtilizationPct}%
                            </span>
                          </div>
                        </div>
                      </InputField>
                      <InputField label="Avg Net Revenue per Encounter ($)">
                        <Input
                          type="number"
                          value={inputs.avgNetRevenuePerEncounter}
                          onChange={(e) =>
                            handleInputChange("avgNetRevenuePerEncounter", Number(e.target.value))
                          }
                          data-testid="input-avg-revenue"
                        />
                      </InputField>
                      <InputField label="Baseline wRVU per Encounter">
                        <Input
                          type="number"
                          step="0.01"
                          value={inputs.baselineWrvuPerEncounter}
                          onChange={(e) =>
                            handleInputChange("baselineWrvuPerEncounter", Number(e.target.value))
                          }
                          data-testid="input-baseline-wrvu"
                        />
                      </InputField>
                      <InputField label="Total MA Attributed Patients">
                        <Input
                          type="number"
                          value={inputs.totalMedicareAdvantagePatients}
                          onChange={(e) =>
                            handleInputChange(
                              "totalMedicareAdvantagePatients",
                              Number(e.target.value)
                            )
                          }
                          data-testid="input-ma-patients"
                        />
                      </InputField>
                      <InputField
                        label="Total Provider Hours Reclaimed"
                        helperText="Annual hours saved across all providers"
                      >
                        <Input
                          type="number"
                          value={inputs.totalProviderHoursReclaimed}
                          onChange={(e) =>
                            handleInputChange(
                              "totalProviderHoursReclaimed",
                              Number(e.target.value)
                            )
                          }
                          data-testid="input-hours-reclaimed"
                        />
                      </InputField>
                    </InputSection>

                    <LeverAccordion inputs={inputs} onInputChange={handleInputChange} />
                  </>
                )}
              </div>
            </ScrollArea>
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden bg-white/50">
            <header className="p-6 border-b border-neutral-200 bg-white">
              <h2 className="text-xl font-semibold text-black">Results Summary</h2>
            </header>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6 max-w-7xl">
                <KpiGrid>
                  <KpiCard
                    label="ROI Multiple"
                    value={`${adjustedRoiMultiple.toFixed(2)}x`}
                    icon={<TrendingUp className="h-8 w-8" />}
                    variant={adjustedRoiMultiple >= 1 ? "positive" : "negative"}
                  />
                  <KpiCard
                    label="Total Annual Benefit"
                    value={formatCurrency(totalBenefitFromSelectedLevers)}
                    icon={<DollarSign className="h-8 w-8" />}
                    variant="positive"
                  />
                  <KpiCard
                    label="Investment Cost Year 1"
                    value={formatCurrency(annualAbridgeCost)}
                    icon={<DollarSign className="h-8 w-8" />}
                    variant="negative"
                  />
                  <KpiCard
                    label="Net Value Created"
                    value={formatCurrency(adjustedNetValue)}
                    icon={<TrendingUp className="h-8 w-8" />}
                    variant={adjustedNetValue >= 0 ? "positive" : "negative"}
                  />
                  <KpiCard
                    label="Provider Hours Reclaimed"
                    value={formatNumber(results.totalProviderHoursReclaimed)}
                    icon={<Clock className="h-8 w-8" />}
                    variant="neutral"
                  />
                  <KpiCard
                    label="Post-Abridge wRVU"
                    value={results.postWrvuPerEncounter.toFixed(2)}
                    icon={<Users className="h-8 w-8" />}
                    variant="neutral"
                  />
                  <KpiCard
                    label="New Effective Denial Rate"
                    value={formatPercent(results.newEffectiveDenialRate)}
                    icon={<Percent className="h-8 w-8" />}
                    variant="positive"
                  />
                </KpiGrid>

                <WaterfallChart
                  levers={waterfallLevers}
                  investmentCost={annualAbridgeCost}
                  netValue={adjustedNetValue}
                />

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">Annual Impact by Lever</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 text-center">Active</TableHead>
                          <TableHead>Lever</TableHead>
                          <TableHead>Setting</TableHead>
                          <TableHead className="text-right">Annual Value</TableHead>
                          <TableHead className="hidden md:table-cell">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leversWithSettings.map((lever) => {
                          const key = `${lever.settingId}:${lever.id}`;
                          return (
                            <TableRow 
                              key={key} 
                              className={!lever.enabled ? "opacity-50" : ""}
                              data-testid={`lever-row-${key}`}
                            >
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={lever.enabled}
                                  onCheckedChange={() => handleLeverToggle(lever.settingId, lever.id)}
                                  data-testid={`checkbox-${key}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{lever.label}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {CARE_SETTING_LABELS[lever.settingId]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {lever.enabled ? formatCurrency(lever.value) : "—"}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                {lever.description}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="font-semibold bg-muted/50">
                          <TableCell></TableCell>
                          <TableCell>Total Annual Benefit</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(totalBenefitFromSelectedLevers)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell"></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <CommentaryBox value={commentary} onChange={setCommentary} />
              </div>
            </ScrollArea>
          </main>
        </div>
      </div>
    </div>
  );
}
