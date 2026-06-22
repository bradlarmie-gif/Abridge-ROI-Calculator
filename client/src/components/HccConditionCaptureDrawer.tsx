import { X } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatNumber } from "@/lib/roi-calculator";
import { useEffect } from "react";

export interface HccConditionCaptureInputs {
  riskBasedPatients: number;
  avgConditionsPerPatient: number;
  pctConditionsNotDocumented: number;
  pctMissedConditionsCaptured: number;
  pctNewlyIdentifiedConditions: number;
  realizationFactor: number;
  revenuePerCondition: number;
}

export interface HccConditionCaptureCalculations {
  totalConditions: number;
  missedConditions: number;
  capturedMissedConditions: number;
  newlyIdentifiedConditions: number;
  modeledCaptured: number;
  realizedCaptured: number;
  annualImpact: number;
}

interface HccConditionCaptureDrawerProps {
  open: boolean;
  onClose: () => void;
  inputs: HccConditionCaptureInputs;
  onChange: (field: keyof HccConditionCaptureInputs, value: number) => void;
  calculations: HccConditionCaptureCalculations;
}

export function HccConditionCaptureDrawer({
  open,
  onClose,
  inputs,
  onChange,
  calculations,
}: HccConditionCaptureDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        data-testid="hcc-drawer-backdrop"
      />
      <div
        className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-white shadow-xl z-50 md:rounded-l-xl overflow-y-auto"
        data-testid="hcc-condition-capture-drawer"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold text-black">HCC & Chronic Condition Capture</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Assumptions and logic behind this driver
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-hcc-drawer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="mb-6">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Risk scores fall when chronic conditions that are clinically present fail to appear 
              in the documentation. Some of these conditions are known but not consistently restated, 
              and some surface only when the encounter narrative is complete enough to reveal them. 
              These inputs estimate how many conditions are being missed today and how much of that 
              gap Abridge can realistically help clinicians close.
            </p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Assumptions
            </h3>

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Population & baseline condition burden
              </p>

              <div className="space-y-2">
                <Label htmlFor="risk-based-patients" className="text-sm font-medium">
                  Risk-based patients in this analysis
                </Label>
                <NumberField
                  id="risk-based-patients"
                  value={inputs.riskBasedPatients}
                  onValueChange={(v) => onChange("riskBasedPatients", v)}
                  className="font-mono"
                  data-testid="input-risk-based-patients"
                />
                <p className="text-xs text-neutral-500">
                  Patients under Medicare Advantage or other risk-bearing contracts.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avg-conditions" className="text-sm font-medium">
                  Average chronic conditions per patient
                </Label>
                <NumberField
                  id="avg-conditions"
                  value={inputs.avgConditionsPerPatient}
                  onValueChange={(v) => onChange("avgConditionsPerPatient", v)}
                  className="font-mono"
                  data-testid="input-avg-conditions"
                />
                <p className="text-xs text-neutral-500">
                  Typical number of clinically present chronic conditions per member.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pct-not-documented" className="text-sm font-medium">
                    % of present conditions not documented annually
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.pctConditionsNotDocumented.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="pct-not-documented"
                  min={0}
                  max={60}
                  step={1}
                  value={[inputs.pctConditionsNotDocumented]}
                  onValueChange={([v]) => onChange("pctConditionsNotDocumented", v)}
                  data-testid="slider-pct-not-documented"
                />
                <p className="text-xs text-neutral-500">
                  Conditions known or present but not consistently captured in documentation.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Abridge's documentation impact
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pct-missed-captured" className="text-sm font-medium">
                    % of missed conditions captured with Abridge
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.pctMissedConditionsCaptured.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="pct-missed-captured"
                  min={0}
                  max={80}
                  step={1}
                  value={[inputs.pctMissedConditionsCaptured]}
                  onValueChange={([v]) => onChange("pctMissedConditionsCaptured", v)}
                  data-testid="slider-pct-missed-captured"
                />
                <p className="text-xs text-neutral-500">
                  Portion of under-documented conditions surfaced through richer narratives.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pct-newly-identified" className="text-sm font-medium">
                    % newly identified conditions
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.pctNewlyIdentifiedConditions.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="pct-newly-identified"
                  min={0}
                  max={10}
                  step={0.5}
                  value={[inputs.pctNewlyIdentifiedConditions]}
                  onValueChange={([v]) => onChange("pctNewlyIdentifiedConditions", v)}
                  data-testid="slider-pct-newly-identified"
                />
                <p className="text-xs text-neutral-500">
                  New diagnoses that emerge when the clinical narrative is more complete.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="realization-factor-hcc" className="text-sm font-medium">
                    Realization factor
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.realizationFactor.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="realization-factor-hcc"
                  min={0}
                  max={100}
                  step={1}
                  value={[inputs.realizationFactor]}
                  onValueChange={([v]) => onChange("realizationFactor", v)}
                  data-testid="slider-realization-factor-hcc"
                />
                <p className="text-xs text-neutral-500">
                  Conservative share of modeled RAF improvement you want to claim.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Revenue mapping
              </p>

              <div className="space-y-2">
                <Label htmlFor="revenue-per-condition" className="text-sm font-medium">
                  Incremental revenue per captured condition ($)
                </Label>
                <NumberField
                  id="revenue-per-condition"
                  value={inputs.revenuePerCondition}
                  onValueChange={(v) => onChange("revenuePerCondition", v)}
                  className="font-mono"
                  data-testid="input-revenue-per-condition"
                />
                <p className="text-xs text-neutral-500">
                  RAF lift x PMPM x months per year, per captured condition.
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Calculated Outputs
            </h3>

            <div className="bg-neutral-50 rounded-lg p-4 space-y-3" data-testid="hcc-calculated-outputs">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Total chronic conditions (expected)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-total-conditions">
                  {formatNumber(calculations.totalConditions)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Conditions currently missed (annual)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-missed-conditions">
                  {formatNumber(calculations.missedConditions)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Conditions captured with Abridge (modeled)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-captured-conditions">
                  {formatNumber(calculations.capturedMissedConditions)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Newly surfaced conditions</span>
                <span className="font-mono text-sm font-medium" data-testid="output-newly-surfaced">
                  {formatNumber(calculations.newlyIdentifiedConditions)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Realized captured conditions (after haircut)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-realized-captured">
                  {formatNumber(calculations.realizedCaptured)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-800">Incremental annual revenue</span>
                <span className="font-mono text-base font-semibold text-neutral-900" data-testid="output-hcc-annual-impact">
                  {formatCurrency(calculations.annualImpact)}
                </span>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              How this is calculated
            </h4>
            <div className="bg-neutral-100 rounded-md p-3">
              <pre className="text-xs font-mono text-neutral-700 whitespace-pre-wrap leading-relaxed">
{`Annual revenue impact =
  Risk-based patients
  × Average chronic conditions per patient
  × % of present conditions not documented
  × % captured with Abridge
  + (Risk-based patients × Average conditions
     × % newly identified)
  → multiplied by realization factor
  → multiplied by incremental revenue per condition`}
              </pre>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <p className="text-xs text-neutral-500 italic">
              Adjust these assumptions as needed. The model updates your waterfall, KPIs, 
              total impact, and enterprise projections automatically.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
