import { X } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatNumber } from "@/lib/roi-calculator";
import { useEffect } from "react";

export interface LevelOfServiceInputs {
  annualEncounters: number;
  baselineUnderCodedRate: number;
  pctUnderCodedCorrected: number;
  incrementalWrvuPerVisit: number;
  wrvuConversionFactor: number;
}

export interface LevelOfServiceCalculations {
  totalUnderCodedVisits: number;
  correctedVisits: number;
  addedWrvus: number;
  incrementalRevenue: number;
}

interface LevelOfServiceDrawerProps {
  open: boolean;
  onClose: () => void;
  inputs: LevelOfServiceInputs;
  onChange: (field: keyof LevelOfServiceInputs, value: number) => void;
  calculations: LevelOfServiceCalculations;
}

export function LevelOfServiceDrawer({
  open,
  onClose,
  inputs,
  onChange,
  calculations,
}: LevelOfServiceDrawerProps) {
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
        data-testid="los-drawer-backdrop"
      />
      <div
        className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-white shadow-xl z-50 md:rounded-l-xl overflow-y-auto"
        data-testid="level-of-service-drawer"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold text-black">Level of Service Alignment</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Assumptions and logic behind this driver
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-los-drawer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="mb-6">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Visits are frequently coded below their true complexity because key clinical reasoning 
              isn't fully documented. When documentation captures the full picture, coding can align 
              with the work actually performed, recovering revenue that would otherwise be left on the table.
            </p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Assumptions
            </h3>

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Encounter volume & baseline under-coding
              </p>

              <div className="space-y-2">
                <Label htmlFor="annual-encounters-los" className="text-sm font-medium">
                  Annual encounters in this analysis
                </Label>
                <NumberField
                  id="annual-encounters-los"
                  value={inputs.annualEncounters}
                  onValueChange={(v) => onChange("annualEncounters", v)}
                  className="font-mono"
                  data-testid="input-encounters-los"
                />
                <p className="text-xs text-neutral-500">
                  Total encounters included in this ROI scenario.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="under-coded-rate" className="text-sm font-medium">
                    Baseline under-coded visit rate (%)
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.baselineUnderCodedRate.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="under-coded-rate"
                  min={0}
                  max={50}
                  step={1}
                  value={[inputs.baselineUnderCodedRate]}
                  onValueChange={([v]) => onChange("baselineUnderCodedRate", v)}
                  data-testid="slider-under-coded-rate"
                />
                <p className="text-xs text-neutral-500">
                  Estimated share of visits coded at a lower level than clinically warranted.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Impact of Abridge on coding accuracy
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pct-corrected" className="text-sm font-medium">
                    % of under-coded visits corrected with Abridge
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.pctUnderCodedCorrected.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="pct-corrected"
                  min={0}
                  max={100}
                  step={1}
                  value={[inputs.pctUnderCodedCorrected]}
                  onValueChange={([v]) => onChange("pctUnderCodedCorrected", v)}
                  data-testid="slider-pct-corrected"
                />
                <p className="text-xs text-neutral-500">
                  Share of under-coded visits that improved documentation helps correct.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incremental-wrvu" className="text-sm font-medium">
                  Incremental wRVU per corrected visit
                </Label>
                <NumberField
                  id="incremental-wrvu"
                  value={inputs.incrementalWrvuPerVisit}
                  onValueChange={(v) => onChange("incrementalWrvuPerVisit", v)}
                  className="font-mono"
                  data-testid="input-incremental-wrvu"
                />
                <p className="text-xs text-neutral-500">
                  Average additional wRVU captured when a visit is correctly coded.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Revenue conversion
              </p>

              <div className="space-y-2">
                <Label htmlFor="wrvu-conversion" className="text-sm font-medium">
                  wRVU conversion factor ($)
                </Label>
                <NumberField
                  id="wrvu-conversion"
                  value={inputs.wrvuConversionFactor}
                  onValueChange={(v) => onChange("wrvuConversionFactor", v)}
                  className="font-mono"
                  data-testid="input-wrvu-conversion"
                />
                <p className="text-xs text-neutral-500">
                  Blended reimbursement rate per wRVU across your payer mix.
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Calculated Outputs
            </h3>

            <div className="bg-neutral-50 rounded-lg p-4 space-y-3" data-testid="los-calculated-outputs">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Total under-coded visits</span>
                <span className="font-mono text-sm font-medium" data-testid="output-under-coded-visits">
                  {formatNumber(calculations.totalUnderCodedVisits)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Corrected visits with Abridge</span>
                <span className="font-mono text-sm font-medium" data-testid="output-corrected-visits">
                  {formatNumber(calculations.correctedVisits)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Added wRVUs</span>
                <span className="font-mono text-sm font-medium" data-testid="output-added-wrvus">
                  {formatNumber(calculations.addedWrvus)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-800">Incremental annual revenue</span>
                <span className="font-mono text-base font-semibold text-neutral-900" data-testid="output-los-revenue">
                  {formatCurrency(calculations.incrementalRevenue)}
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
{`Total under-coded visits =
  Annual encounters in this analysis
  × (Baseline under-coded visit rate ÷ 100)

Corrected visits with Abridge =
  Total under-coded visits
  × (% of under-coded visits corrected ÷ 100)

Added wRVUs =
  Corrected visits with Abridge
  × Incremental wRVU per corrected visit

Incremental annual revenue =
  Added wRVUs
  × wRVU conversion factor`}
              </pre>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <p className="text-xs text-neutral-500 italic">
              Adjust these assumptions to match your organization. The model updates your Level of Service 
              impact, waterfall, KPIs, and enterprise projections automatically.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
