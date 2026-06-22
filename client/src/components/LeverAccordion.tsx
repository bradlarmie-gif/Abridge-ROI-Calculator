import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/NumberField";
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
    { id: "overtime", label: "Overtime & Locum Cost Avoidance" },
    { id: "workforce", label: "Clinician Retention" },
    { id: "hcc", label: "HCC & Chronic Condition Capture" },
    { id: "wrvu", label: "Level of Service Alignment" },
    { id: "denials", label: "Medical Necessity–Driven Denials" },
  ];

  const availableLevers = leverItems.filter(lever => 
    inputs.levers && lever.id in inputs.levers
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Primary Levers</h3>
      
      <div className="space-y-2">
        {availableLevers.map((lever) => (
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
        {inputs.patientAccess && (
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
                  <NumberField
                    value={inputs.patientAccess.avgVisitDurationMinutes}
                    onValueChange={(v) =>
                      onInputChange("patientAccess.avgVisitDurationMinutes", v)
                    }
                    data-testid="input-visit-duration"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Avg Revenue per Visit ($)</Label>
                  <NumberField
                    value={inputs.patientAccess.avgNetRevenuePerVisit}
                    onValueChange={(v) =>
                      onInputChange("patientAccess.avgNetRevenuePerVisit", v)
                    }
                    data-testid="input-revenue-per-visit"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {inputs.overtime && (
          <AccordionItem value="overtime" className="border rounded-md px-4">
            <AccordionTrigger className="text-sm font-medium py-3">
              Overtime & Locum Cost Avoidance Settings
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
                <NumberField
                  value={inputs.overtime.blendedOvertimeRate}
                  onValueChange={(v) =>
                    onInputChange("overtime.blendedOvertimeRate", v)
                  }
                  data-testid="input-overtime-rate"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {inputs.workforce && (
          <AccordionItem value="workforce" className="border rounded-md px-4">
            <AccordionTrigger className="text-sm font-medium py-3">
              Clinician Retention Settings
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Provider Count</Label>
                  <NumberField
                    decimal={false}
                    value={inputs.workforce.providerCount}
                    onValueChange={(v) =>
                      onInputChange("workforce.providerCount", v)
                    }
                    data-testid="input-workforce-provider-count"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Baseline Attrition Rate (%)</Label>
                  <NumberField
                    value={inputs.workforce.baselineAttritionRate}
                    onValueChange={(v) =>
                      onInputChange("workforce.baselineAttritionRate", v)
                    }
                    data-testid="input-attrition-rate"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">% Attrition from Burnout</Label>
                  <NumberField
                    value={inputs.workforce.pctAttritionLinkedToBurnout}
                    onValueChange={(v) =>
                      onInputChange("workforce.pctAttritionLinkedToBurnout", v)
                    }
                    data-testid="input-burnout-attrition"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">% Burnout Exits Avoided</Label>
                  <NumberField
                    value={inputs.workforce.pctBurnoutExitsAvoided}
                    onValueChange={(v) =>
                      onInputChange("workforce.pctBurnoutExitsAvoided", v)
                    }
                    data-testid="input-burnout-avoided"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cost per Provider Departure ($)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={inputs.workforce.costPerDeparture ? inputs.workforce.costPerDeparture.toLocaleString("en-US") : ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value.replace(/,/g, "")) || 0;
                    onInputChange("workforce.costPerDeparture", v);
                  }}
                  data-testid="input-departure-cost"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {inputs.wrvu && (
          <AccordionItem value="wrvu" className="border rounded-md px-4">
            <AccordionTrigger className="text-sm font-medium py-3">
              Level of Service Alignment Settings
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">wRVU Conversion Factor ($)</Label>
                  <NumberField
                    value={inputs.wrvu.wrvuConversionFactor}
                    onValueChange={(v) =>
                      onInputChange("wrvu.wrvuConversionFactor", v)
                    }
                    data-testid="input-wrvu-factor"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">% wRVU Increase per Encounter</Label>
                  <NumberField
                    value={inputs.wrvu.pctIncreaseWrvuPerEncounter}
                    onValueChange={(v) =>
                      onInputChange("wrvu.pctIncreaseWrvuPerEncounter", v)
                    }
                    data-testid="input-wrvu-increase"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {inputs.denials && (
          <AccordionItem value="denials" className="border rounded-md px-4">
            <AccordionTrigger className="text-sm font-medium py-3">
              Medical Necessity–Driven Denials Settings
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Net Collectible Revenue ($)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={inputs.denials.netCollectibleRevenue ? inputs.denials.netCollectibleRevenue.toLocaleString("en-US") : ""}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value.replace(/,/g, "")) || 0;
                      onInputChange("denials.netCollectibleRevenue", v);
                    }}
                    data-testid="input-collectible-revenue"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Baseline Denial Rate (%)</Label>
                  <NumberField
                    value={inputs.denials.baselineDenialRate}
                    onValueChange={(v) =>
                      onInputChange("denials.baselineDenialRate", v)
                    }
                    data-testid="input-denial-rate"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">% Denials from Documentation</Label>
                  <NumberField
                    value={inputs.denials.pctDenialsFromDocumentation}
                    onValueChange={(v) =>
                      onInputChange("denials.pctDenialsFromDocumentation", v)
                    }
                    data-testid="input-denials-documentation"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">% Doc Denials Recovered</Label>
                  <NumberField
                    value={inputs.denials.pctDocDenialsRecovered}
                    onValueChange={(v) =>
                      onInputChange("denials.pctDocDenialsRecovered", v)
                    }
                    data-testid="input-denials-recovered"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {inputs.hcc && (
          <AccordionItem value="hcc" className="border rounded-md px-4">
            <AccordionTrigger className="text-sm font-medium py-3">
              HCC & Chronic Condition Capture Settings
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Impacted MA Patients</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={inputs.hcc.impactedMaPatients ? inputs.hcc.impactedMaPatients.toLocaleString("en-US") : ""}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value.replace(/,/g, "")) || 0;
                      onInputChange("hcc.impactedMaPatients", v);
                    }}
                    data-testid="input-ma-patients"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Avg Conditions/Member</Label>
                  <NumberField
                    value={inputs.hcc.avgConditionsPerMember}
                    onValueChange={(v) =>
                      onInputChange("hcc.avgConditionsPerMember", v)
                    }
                    data-testid="input-conditions-per-member"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">% Conditions Missed</Label>
                  <NumberField
                    value={inputs.hcc.pctConditionsMissed}
                    onValueChange={(v) =>
                      onInputChange("hcc.pctConditionsMissed", v)
                    }
                    data-testid="input-conditions-missed"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">% Missed Recaptured</Label>
                  <NumberField
                    value={inputs.hcc.pctMissedConditionsRecaptured}
                    onValueChange={(v) =>
                      onInputChange("hcc.pctMissedConditionsRecaptured", v)
                    }
                    data-testid="input-missed-recaptured"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">% New Conditions Found</Label>
                  <NumberField
                    value={inputs.hcc.pctNewConditionsIdentified}
                    onValueChange={(v) =>
                      onInputChange("hcc.pctNewConditionsIdentified", v)
                    }
                    data-testid="input-new-conditions"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">RAF Gain per Condition</Label>
                  <NumberField
                    value={inputs.hcc.rafGainPerCondition}
                    onValueChange={(v) =>
                      onInputChange("hcc.rafGainPerCondition", v)
                    }
                    data-testid="input-raf-gain"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">RAF Realization Haircut (%)</Label>
                  <NumberField
                    value={inputs.hcc.rafRealizationHaircut}
                    onValueChange={(v) =>
                      onInputChange("hcc.rafRealizationHaircut", v)
                    }
                    data-testid="input-raf-haircut"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">PMPM Benchmark ($)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={inputs.hcc.pmpmBenchmark ? inputs.hcc.pmpmBenchmark.toLocaleString("en-US") : ""}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value.replace(/,/g, "")) || 0;
                      onInputChange("hcc.pmpmBenchmark", v);
                    }}
                    data-testid="input-pmpm-benchmark"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
