import { X } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatNumber } from "@/lib/roi-calculator";
import { useEffect } from "react";

export interface ClinicianRetentionInputs {
  cliniciansInScope: number;
  attritionRate: number;
  burnoutShare: number;
  reductionWithAbridge: number;
  realizationFactor: number;
  costPerDeparture: number;
}

export interface ClinicianRetentionCalculations {
  totalExits: number;
  burnoutExits: number;
  modeledExitsAvoided: number;
  realizedExitsAvoided: number;
  annualSavings: number;
}

interface ClinicianRetentionDrawerProps {
  open: boolean;
  onClose: () => void;
  inputs: ClinicianRetentionInputs;
  onChange: (field: keyof ClinicianRetentionInputs, value: number) => void;
  calculations: ClinicianRetentionCalculations;
}

export function ClinicianRetentionDrawer({
  open,
  onClose,
  inputs,
  onChange,
  calculations,
}: ClinicianRetentionDrawerProps) {
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
        data-testid="retention-drawer-backdrop"
      />
      <div
        className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-white shadow-xl z-50 md:rounded-l-xl overflow-y-auto"
        data-testid="clinician-retention-drawer"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold text-black">Clinician Retention</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Assumptions and logic behind this driver
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-retention-drawer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="mb-6">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Retention is shaped as much by the workday structure as by clinical complexity. 
              When documentation routinely spills into evenings, clinicians quietly absorb those hours 
              as personal time, attrition risk climbs, and replacement costs mount. These inputs estimate 
              how much of your current turnover is tied to documentation burden and what portion 
              reasonably improves when that burden is reduced.
            </p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Assumptions
            </h3>

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Provider population & baseline turnover
              </p>

              <div className="space-y-2">
                <Label htmlFor="clinicians-scope-retention" className="text-sm font-medium">
                  Clinicians included in this analysis
                </Label>
                <NumberField
                  id="clinicians-scope-retention"
                  value={inputs.cliniciansInScope}
                  onValueChange={(v) => onChange("cliniciansInScope", v)}
                  className="font-mono"
                  data-testid="input-clinicians-retention"
                />
                <p className="text-xs text-neutral-500">
                  Total clinicians in scope for this scenario.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="attrition-rate" className="text-sm font-medium">
                    Baseline annual attrition rate (%)
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {(inputs.attritionRate * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="attrition-rate"
                  min={0}
                  max={30}
                  step={1}
                  value={[inputs.attritionRate * 100]}
                  onValueChange={([v]) => onChange("attritionRate", v / 100)}
                  data-testid="slider-attrition-rate"
                />
                <p className="text-xs text-neutral-500">
                  Typical percentage of clinicians leaving per year today.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="burnout-share" className="text-sm font-medium">
                    % of attrition tied to burnout and documentation burden
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {(inputs.burnoutShare * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="burnout-share"
                  min={0}
                  max={80}
                  step={1}
                  value={[inputs.burnoutShare * 100]}
                  onValueChange={([v]) => onChange("burnoutShare", v / 100)}
                  data-testid="slider-burnout-share"
                />
                <p className="text-xs text-neutral-500">
                  Share of exits where workload and documentation are major drivers.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Impact of Abridge on burnout-related exits
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reduction-abridge" className="text-sm font-medium">
                    Expected reduction in burnout-related exits with Abridge
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {(inputs.reductionWithAbridge * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="reduction-abridge"
                  min={0}
                  max={75}
                  step={1}
                  value={[inputs.reductionWithAbridge * 100]}
                  onValueChange={([v]) => onChange("reductionWithAbridge", v / 100)}
                  data-testid="slider-reduction-abridge"
                />
                <p className="text-xs text-neutral-500">
                  Portion of burnout-linked departures you expect to prevent.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="realization-factor-retention" className="text-sm font-medium">
                    Realization factor for avoided exits
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {(inputs.realizationFactor * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="realization-factor-retention"
                  min={0}
                  max={100}
                  step={1}
                  value={[inputs.realizationFactor * 100]}
                  onValueChange={([v]) => onChange("realizationFactor", v / 100)}
                  data-testid="slider-realization-factor-retention"
                />
                <p className="text-xs text-neutral-500">
                  Conservative share of modeled exits avoided that you are comfortable taking credit for.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Financial impact per departure
              </p>

              <div className="space-y-2">
                <Label htmlFor="cost-per-departure" className="text-sm font-medium">
                  Cost per departure ($)
                </Label>
                <NumberField
                  id="cost-per-departure"
                  value={inputs.costPerDeparture}
                  onValueChange={(v) => onChange("costPerDeparture", v)}
                  className="font-mono"
                  data-testid="input-cost-per-departure"
                />
                <p className="text-xs text-neutral-500">
                  All-in cost to replace one clinician (recruiting, onboarding, ramp-up, lost productivity).
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Calculated Outputs
            </h3>

            <div className="bg-neutral-50 rounded-lg p-4 space-y-3" data-testid="retention-calculated-outputs">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Total annual exits (baseline)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-total-exits">
                  {formatNumber(calculations.totalExits)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Burnout-linked exits (baseline)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-burnout-exits">
                  {formatNumber(calculations.burnoutExits)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Exits avoided (modeled)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-modeled-exits-avoided">
                  {formatNumber(calculations.modeledExitsAvoided)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Realized exits avoided (after haircut)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-realized-exits-avoided">
                  {formatNumber(calculations.realizedExitsAvoided)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-800">Estimated annual savings</span>
                <span className="font-mono text-base font-semibold text-neutral-900" data-testid="output-retention-savings">
                  {formatCurrency(calculations.annualSavings)}
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
{`Annual retention savings =
  Clinicians in scope
  × Baseline attrition rate
  × % of exits linked to burnout and documentation
  × % reduction in burnout-related exits with Abridge
  × Realization factor
  × Cost per departure`}
              </pre>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <p className="text-xs text-neutral-500 italic">
              Adjust these assumptions to match your organization. The model updates your retention impact, 
              waterfall, KPIs, and enterprise projections automatically.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
