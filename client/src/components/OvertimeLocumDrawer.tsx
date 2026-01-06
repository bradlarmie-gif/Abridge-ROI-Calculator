import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatNumber, parseFormattedNumber } from "@/lib/roi-calculator";
import { useEffect } from "react";

export interface OvertimeLocumInputs {
  pctHoursPreviouslyPremium: number;
  pctPremiumRealized: number;
  overtimeRate: number;
  locumRate: number;
  locumShare: number;
}

export interface OvertimeLocumCalculations {
  reclaimedHours: number;
  premiumHoursExposed: number;
  premiumHoursReduced: number;
  blendedRate: number;
  annualSavings: number;
}

interface OvertimeLocumDrawerProps {
  open: boolean;
  onClose: () => void;
  inputs: OvertimeLocumInputs;
  onChange: (field: keyof OvertimeLocumInputs, value: number) => void;
  calculations: OvertimeLocumCalculations;
}

export function OvertimeLocumDrawer({
  open,
  onClose,
  inputs,
  onChange,
  calculations,
}: OvertimeLocumDrawerProps) {
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
        data-testid="overtime-drawer-backdrop"
      />
      <div
        className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-white shadow-xl z-50 md:rounded-l-xl overflow-y-auto"
        data-testid="overtime-locum-drawer"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold text-black">Overtime & Locum Cost Avoidance</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Assumptions and logic behind this driver
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-overtime-drawer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="mb-6">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Overtime and locum spend usually arise when documentation spills past the clinic day, 
              not because staffing suddenly changes. When notes get finished inside scheduled hours, 
              fewer shifts bleed into premium time and clinics rely less on locums to keep coverage stable. 
              These inputs estimate how much of the time reclaimed by Abridge translates into avoided 
              overtime and locum costs.
            </p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Assumptions
            </h3>

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Hours available to reduce premium labor
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Reclaimed clinician hours (annual)
                  </Label>
                  <span className="font-mono text-sm font-medium text-neutral-700">
                    {formatNumber(calculations.reclaimedHours)}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Total hours regained from reduced documentation time.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pct-premium" className="text-sm font-medium">
                    % of reclaimed hours that would have been overtime/locum
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {(inputs.pctHoursPreviouslyPremium * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="pct-premium"
                  min={0}
                  max={50}
                  step={1}
                  value={[inputs.pctHoursPreviouslyPremium * 100]}
                  onValueChange={([v]) => onChange("pctHoursPreviouslyPremium", v / 100)}
                  data-testid="slider-pct-premium"
                />
                <p className="text-xs text-neutral-500">
                  Portion of reclaimed hours that today appear as overtime or locum coverage.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pct-realized" className="text-sm font-medium">
                    % of premium hours realistically avoided
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {(inputs.pctPremiumRealized * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="pct-realized"
                  min={0}
                  max={100}
                  step={1}
                  value={[inputs.pctPremiumRealized * 100]}
                  onValueChange={([v]) => onChange("pctPremiumRealized", v / 100)}
                  data-testid="slider-pct-realized"
                />
                <p className="text-xs text-neutral-500">
                  Not all premium hours disappear; this estimates the share that truly goes away.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Premium labor cost structure
              </p>

              <div className="space-y-2">
                <Label htmlFor="overtime-rate" className="text-sm font-medium">
                  Overtime hourly rate ($)
                </Label>
                <Input
                  id="overtime-rate"
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(inputs.overtimeRate)}
                  onChange={(e) => onChange("overtimeRate", parseFormattedNumber(e.target.value))}
                  className="font-mono"
                  data-testid="input-overtime-rate"
                />
                <p className="text-xs text-neutral-500">
                  Hourly overtime cost for employed clinicians or support staff.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locum-rate" className="text-sm font-medium">
                  Locum hourly rate ($)
                </Label>
                <Input
                  id="locum-rate"
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(inputs.locumRate)}
                  onChange={(e) => onChange("locumRate", parseFormattedNumber(e.target.value))}
                  className="font-mono"
                  data-testid="input-locum-rate"
                />
                <p className="text-xs text-neutral-500">
                  Typical hourly rate for locum or premium provider coverage.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="locum-share" className="text-sm font-medium">
                    % of premium hours covered by locums
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {(inputs.locumShare * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="locum-share"
                  min={0}
                  max={100}
                  step={1}
                  value={[inputs.locumShare * 100]}
                  onValueChange={([v]) => onChange("locumShare", v / 100)}
                  data-testid="slider-locum-share"
                />
                <p className="text-xs text-neutral-500">
                  The remainder is assumed to be paid as overtime.
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Calculated Outputs
            </h3>

            <div className="bg-neutral-50 rounded-lg p-4 space-y-3" data-testid="overtime-calculated-outputs">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Premium hours reduced (annual)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-premium-hours-reduced">
                  {formatNumber(calculations.premiumHoursReduced)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Blended premium hourly rate</span>
                <span className="font-mono text-sm font-medium" data-testid="output-blended-rate">
                  {formatCurrency(calculations.blendedRate)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-800">Estimated annual savings</span>
                <span className="font-mono text-base font-semibold text-neutral-900" data-testid="output-annual-savings">
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
{`Annual savings =
  Reclaimed clinician hours
  × % of hours that would have been overtime or locum
  × % of those hours realistically avoided
  × Blended premium hourly rate

Blended premium hourly rate =
  (Locum share × Locum hourly rate)
  + (Overtime share × Overtime hourly rate)`}
              </pre>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <p className="text-xs text-neutral-500 italic">
              Changes here update the waterfall, KPIs, impact cards, and enterprise projections automatically.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
