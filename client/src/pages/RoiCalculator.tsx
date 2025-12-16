import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InputSection, InputField } from "@/components/InputSection";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { WaterfallChart } from "@/components/WaterfallChart";
import { LeverTable } from "@/components/LeverTable";
import { LeverAccordion } from "@/components/LeverAccordion";
import { CommentaryBox } from "@/components/CommentaryBox";
import { CareSettingCard } from "@/components/CareSettingCard";
import { defaultInputs, type RoiInputs, type LeverId } from "@/lib/roi-types";
import { calculateRoi, formatCurrency, formatNumber, formatPercent } from "@/lib/roi-calculator";
import { CARE_SETTING_LABELS, type CareSettingType, type AllSettingType } from "@/lib/SETTING_CONFIG";
import {
  DollarSign,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  Percent,
  Calculator,
  Stethoscope,
  Siren,
  HeartPulse,
  Building2,
} from "lucide-react";

interface RoiCalculatorProps {
  setting: CareSettingType;
  selectedLevers: string[];
  onBack: () => void;
  onSettingChange?: (setting: CareSettingType) => void;
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

const ALL_SETTINGS: AllSettingType[] = ["outpatient", "ed", "nursing", "inpatient"];

export default function RoiCalculator({ setting, selectedLevers, onBack, onSettingChange }: RoiCalculatorProps) {
  const [inputs, setInputs] = useState<RoiInputs>(defaultInputs);
  const [commentary, setCommentary] = useState("");

  useEffect(() => {
    setInputs(defaultInputs);
    setCommentary("");
  }, [setting]);

  const results = useMemo(() => calculateRoi(inputs), [inputs]);

  const annualAbridgeCost = useMemo(
    () =>
      inputs.numberOfProviders * inputs.monthlyCostPerProvider * 12 +
      inputs.implementationCostYear1,
    [inputs.numberOfProviders, inputs.monthlyCostPerProvider, inputs.implementationCostYear1]
  );

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

  const handleLeverToggle = (id: LeverId) => {
    handleInputChange(`levers.${id}`, !inputs.levers[id]);
  };

  const handleSettingClick = (clickedSetting: AllSettingType) => {
    if (clickedSetting === "inpatient") return;
    if (clickedSetting !== setting && onSettingChange) {
      onSettingChange(clickedSetting);
    }
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#FAF6F0' }}>
      <div className="relative z-10 flex flex-col h-screen">
        <div className="bg-white border-b border-neutral-200 px-6 py-3">
          <div className="flex items-center gap-3 overflow-x-auto">
            {ALL_SETTINGS.map((s) => {
              const isInpatient = s === "inpatient";
              return (
                <CareSettingCard
                  key={s}
                  icon={SETTING_ICONS[s]}
                  title={CARE_SETTING_LABELS[s]}
                  subtitle={SETTING_SUBTITLES[s]}
                  selected={setting === s}
                  disabled={isInpatient}
                  compact
                  onClick={() => handleSettingClick(s)}
                />
              );
            })}
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
              <h1 className="text-2xl font-bold text-black">Abridge ROI Studio</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {CARE_SETTING_LABELS[setting]} Analysis
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
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
                    value={`${results.roiMultiple.toFixed(2)}x`}
                    icon={<TrendingUp className="h-8 w-8" />}
                    variant={results.roiMultiple >= 1 ? "positive" : "negative"}
                  />
                  <KpiCard
                    label="Total Annual Benefit"
                    value={formatCurrency(results.totalAnnualBenefit)}
                    icon={<DollarSign className="h-8 w-8" />}
                    variant="positive"
                  />
                  <KpiCard
                    label="Investment Cost Year 1"
                    value={formatCurrency(results.annualAbridgeCost)}
                    icon={<DollarSign className="h-8 w-8" />}
                    variant="negative"
                  />
                  <KpiCard
                    label="Net Value Created"
                    value={formatCurrency(results.netValueCreated)}
                    icon={<TrendingUp className="h-8 w-8" />}
                    variant={results.netValueCreated >= 0 ? "positive" : "negative"}
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
                  levers={results.levers}
                  investmentCost={results.annualAbridgeCost}
                  netValue={results.netValueCreated}
                />

                <LeverTable levers={results.levers} onToggle={handleLeverToggle} />

                <CommentaryBox value={commentary} onChange={setCommentary} />
              </div>
            </ScrollArea>
          </main>
        </div>
      </div>
    </div>
  );
}
