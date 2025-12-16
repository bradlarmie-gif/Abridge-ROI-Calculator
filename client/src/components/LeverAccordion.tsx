import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { type RoiInputs, type LeverId } from "@/lib/roi-types";

interface LeverAccordionProps {
  inputs: RoiInputs;
  onInputChange: (path: string, value: number | boolean) => void;
}

export function LeverAccordion({ inputs, onInputChange }: LeverAccordionProps) {
  const leverItems: { id: LeverId; label: string }[] = [
    { id: "patientAccess", label: "Patient Access" },
    { id: "overtime", label: "Overtime & Locum Savings" },
    { id: "workforce", label: "Workforce Retention" },
    { id: "riskAdjustment", label: "Risk Adjustment / HCC" },
    { id: "wrvu", label: "wRVU & Level-of-Service Alignment" },
    { id: "denials", label: "Denial Reduction Savings" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Primary Levers</h3>
      
      <div className="space-y-2">
        {leverItems.map((lever) => (
          <div key={lever.id} className="flex items-center space-x-2">
            <Checkbox
              id={lever.id}
              checked={inputs.levers[lever.id]}
              onCheckedChange={(checked) => 
                onInputChange(`levers.${lever.id}`, checked as boolean)
              }
              data-testid={`toggle-${lever.id}`}
            />
            <Label htmlFor={lever.id} className="text-sm cursor-pointer">
              {lever.label}
            </Label>
          </div>
        ))}
      </div>

      <Accordion type="multiple" className="w-full space-y-2">
        <AccordionItem value="patientAccess" className="border rounded-md px-4">
          <AccordionTrigger className="text-sm font-medium py-3">
            Patient Access Settings
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label className="text-xs">% Time Reinvested into New Visits</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[inputs.patientAccess.pctTimeToNewVisits]}
                  onValueChange={([v]) => 
                    onInputChange("patientAccess.pctTimeToNewVisits", v)
                  }
                  max={100}
                  step={1}
                  className="flex-1"
                  data-testid="slider-pct-time-new-visits"
                />
                <span className="text-sm font-mono w-12">
                  {inputs.patientAccess.pctTimeToNewVisits}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Avg Visit Duration (min)</Label>
                <Input
                  type="number"
                  value={inputs.patientAccess.avgVisitDurationMinutes}
                  onChange={(e) => 
                    onInputChange("patientAccess.avgVisitDurationMinutes", Number(e.target.value))
                  }
                  data-testid="input-visit-duration"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Avg Revenue per Visit ($)</Label>
                <Input
                  type="number"
                  value={inputs.patientAccess.avgNetRevenuePerVisit}
                  onChange={(e) => 
                    onInputChange("patientAccess.avgNetRevenuePerVisit", Number(e.target.value))
                  }
                  data-testid="input-revenue-per-visit"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="overtime" className="border rounded-md px-4">
          <AccordionTrigger className="text-sm font-medium py-3">
            Overtime & Locum Settings
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label className="text-xs">% Overtime/Locum Hours Avoided</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[inputs.overtime.pctOvertimeReduced]}
                  onValueChange={([v]) => 
                    onInputChange("overtime.pctOvertimeReduced", v)
                  }
                  max={100}
                  step={1}
                  className="flex-1"
                  data-testid="slider-overtime-reduced"
                />
                <span className="text-sm font-mono w-12">
                  {inputs.overtime.pctOvertimeReduced}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Blended Overtime/Locum Rate ($/hr)</Label>
              <Input
                type="number"
                value={inputs.overtime.blendedOvertimeRate}
                onChange={(e) => 
                  onInputChange("overtime.blendedOvertimeRate", Number(e.target.value))
                }
                data-testid="input-overtime-rate"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="workforce" className="border rounded-md px-4">
          <AccordionTrigger className="text-sm font-medium py-3">
            Workforce Retention Settings
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Provider Count</Label>
                <Input
                  type="number"
                  value={inputs.workforce.providerCount}
                  onChange={(e) => 
                    onInputChange("workforce.providerCount", Number(e.target.value))
                  }
                  data-testid="input-workforce-provider-count"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Baseline Attrition Rate (%)</Label>
                <Input
                  type="number"
                  value={inputs.workforce.baselineAttritionRate}
                  onChange={(e) => 
                    onInputChange("workforce.baselineAttritionRate", Number(e.target.value))
                  }
                  data-testid="input-attrition-rate"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">% Attrition from Burnout</Label>
                <Input
                  type="number"
                  value={inputs.workforce.pctAttritionLinkedToBurnout}
                  onChange={(e) => 
                    onInputChange("workforce.pctAttritionLinkedToBurnout", Number(e.target.value))
                  }
                  data-testid="input-burnout-attrition"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">% Burnout Exits Avoided</Label>
                <Input
                  type="number"
                  value={inputs.workforce.pctBurnoutExitsAvoided}
                  onChange={(e) => 
                    onInputChange("workforce.pctBurnoutExitsAvoided", Number(e.target.value))
                  }
                  data-testid="input-burnout-avoided"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cost per Provider Departure ($)</Label>
              <Input
                type="number"
                value={inputs.workforce.costPerDeparture}
                onChange={(e) => 
                  onInputChange("workforce.costPerDeparture", Number(e.target.value))
                }
                data-testid="input-departure-cost"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="wrvu" className="border rounded-md px-4">
          <AccordionTrigger className="text-sm font-medium py-3">
            wRVU & Level-of-Service Settings
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">wRVU Conversion Factor ($)</Label>
                <Input
                  type="number"
                  value={inputs.wrvu.wrvuConversionFactor}
                  onChange={(e) => 
                    onInputChange("wrvu.wrvuConversionFactor", Number(e.target.value))
                  }
                  data-testid="input-wrvu-factor"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">% wRVU Increase per Encounter</Label>
                <Input
                  type="number"
                  value={inputs.wrvu.pctIncreaseWrvuPerEncounter}
                  onChange={(e) => 
                    onInputChange("wrvu.pctIncreaseWrvuPerEncounter", Number(e.target.value))
                  }
                  data-testid="input-wrvu-increase"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="denials" className="border rounded-md px-4">
          <AccordionTrigger className="text-sm font-medium py-3">
            Denial Reduction Settings
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Net Collectible Revenue ($)</Label>
                <Input
                  type="number"
                  value={inputs.denials.netCollectibleRevenue}
                  onChange={(e) => 
                    onInputChange("denials.netCollectibleRevenue", Number(e.target.value))
                  }
                  data-testid="input-collectible-revenue"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Baseline Denial Rate (%)</Label>
                <Input
                  type="number"
                  value={inputs.denials.baselineDenialRate}
                  onChange={(e) => 
                    onInputChange("denials.baselineDenialRate", Number(e.target.value))
                  }
                  data-testid="input-denial-rate"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">% Denials from Documentation</Label>
                <Input
                  type="number"
                  value={inputs.denials.pctDenialsFromDocumentation}
                  onChange={(e) => 
                    onInputChange("denials.pctDenialsFromDocumentation", Number(e.target.value))
                  }
                  data-testid="input-denials-documentation"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">% Doc Denials Recovered</Label>
                <Input
                  type="number"
                  value={inputs.denials.pctDocDenialsRecovered}
                  onChange={(e) => 
                    onInputChange("denials.pctDocDenialsRecovered", Number(e.target.value))
                  }
                  data-testid="input-denials-recovered"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="riskAdjustment" className="border rounded-md px-4">
          <AccordionTrigger className="text-sm font-medium py-3">
            Risk Adjustment / HCC Settings
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Impacted MA Patients</Label>
                <Input
                  type="number"
                  value={inputs.riskAdjustment.impactedMaPatients}
                  onChange={(e) => 
                    onInputChange("riskAdjustment.impactedMaPatients", Number(e.target.value))
                  }
                  data-testid="input-ma-patients"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Avg Conditions/Member</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={inputs.riskAdjustment.avgConditionsPerMember}
                  onChange={(e) => 
                    onInputChange("riskAdjustment.avgConditionsPerMember", Number(e.target.value))
                  }
                  data-testid="input-conditions-per-member"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">% Conditions Missed</Label>
                <Input
                  type="number"
                  value={inputs.riskAdjustment.pctConditionsMissed}
                  onChange={(e) => 
                    onInputChange("riskAdjustment.pctConditionsMissed", Number(e.target.value))
                  }
                  data-testid="input-conditions-missed"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">% Missed Recaptured</Label>
                <Input
                  type="number"
                  value={inputs.riskAdjustment.pctMissedConditionsRecaptured}
                  onChange={(e) => 
                    onInputChange("riskAdjustment.pctMissedConditionsRecaptured", Number(e.target.value))
                  }
                  data-testid="input-missed-recaptured"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">% New Conditions Found</Label>
                <Input
                  type="number"
                  value={inputs.riskAdjustment.pctNewConditionsIdentified}
                  onChange={(e) => 
                    onInputChange("riskAdjustment.pctNewConditionsIdentified", Number(e.target.value))
                  }
                  data-testid="input-new-conditions"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">RAF Gain per Condition</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={inputs.riskAdjustment.rafGainPerCondition}
                  onChange={(e) => 
                    onInputChange("riskAdjustment.rafGainPerCondition", Number(e.target.value))
                  }
                  data-testid="input-raf-gain"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">RAF Realization Haircut (%)</Label>
                <Input
                  type="number"
                  value={inputs.riskAdjustment.rafRealizationHaircut}
                  onChange={(e) => 
                    onInputChange("riskAdjustment.rafRealizationHaircut", Number(e.target.value))
                  }
                  data-testid="input-raf-haircut"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PMPM Benchmark ($)</Label>
                <Input
                  type="number"
                  value={inputs.riskAdjustment.pmpmBenchmark}
                  onChange={(e) => 
                    onInputChange("riskAdjustment.pmpmBenchmark", Number(e.target.value))
                  }
                  data-testid="input-pmpm-benchmark"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
