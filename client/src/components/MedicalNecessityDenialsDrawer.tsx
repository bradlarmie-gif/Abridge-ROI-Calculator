import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/roi-calculator";
import { useEffect } from "react";

export interface MedicalNecessityDenialsInputs {
  netCollectibleRevenue: number;
  baselineDenialRate: number;
  pctRecoveredWithRework: number;
  pctUnrecoverableDueToDocumentation: number;
  pctReductionWithAbridge: number;
  realizationFactor: number;
}

export interface MedicalNecessityDenialsCalculations {
  baselineDeniedRevenue: number;
  unrecoveredAfterRework: number;
  documentationDrivenUnrecoverable: number;
  modeledRecovered: number;
  realizedRecovered: number;
}

interface MedicalNecessityDenialsDrawerProps {
  open: boolean;
  onClose: () => void;
  inputs: MedicalNecessityDenialsInputs;
  onChange: (field: keyof MedicalNecessityDenialsInputs, value: number) => void;
  calculations: MedicalNecessityDenialsCalculations;
}

export function MedicalNecessityDenialsDrawer({
  open,
  onClose,
  inputs,
  onChange,
  calculations,
}: MedicalNecessityDenialsDrawerProps) {
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
        data-testid="denials-drawer-backdrop"
      />
      <div
        className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-white shadow-xl z-50 md:rounded-l-xl overflow-y-auto"
        data-testid="medical-necessity-denials-drawer"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold text-black">Medical Necessity-Driven Denials</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Assumptions and logic behind this driver
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-denials-drawer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="mb-6">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Many denials cannot be recovered because the documentation does not clearly justify 
              why care was medically necessary. When the note lacks sufficient detail in the MDM 
              or fails to show the clinical reasoning behind decisions, payers treat the claim as 
              unsupported. These inputs estimate how much of your current denial volume falls into 
              this unrecoverable category and how much of that Abridge can realistically help prevent.
            </p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Assumptions
            </h3>

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Baseline denial landscape
              </p>

              <div className="space-y-2">
                <Label htmlFor="net-collectible-revenue" className="text-sm font-medium">
                  Net collectible outpatient revenue ($)
                </Label>
                <Input
                  id="net-collectible-revenue"
                  type="number"
                  min={0}
                  value={inputs.netCollectibleRevenue}
                  onChange={(e) => onChange("netCollectibleRevenue", Number(e.target.value) || 0)}
                  className="font-mono"
                  data-testid="input-net-collectible-revenue"
                />
                <p className="text-xs text-neutral-500">
                  Revenue expected after contract adjustments.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="baseline-denial-rate" className="text-sm font-medium">
                    Baseline denial rate (%)
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.baselineDenialRate.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="baseline-denial-rate"
                  min={0}
                  max={20}
                  step={0.5}
                  value={[inputs.baselineDenialRate]}
                  onValueChange={([v]) => onChange("baselineDenialRate", v)}
                  data-testid="slider-baseline-denial-rate"
                />
                <p className="text-xs text-neutral-500">
                  Portion of collectible revenue initially denied by payers.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pct-recovered-rework" className="text-sm font-medium">
                    % of denied revenue typically recovered
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.pctRecoveredWithRework.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="pct-recovered-rework"
                  min={0}
                  max={100}
                  step={1}
                  value={[inputs.pctRecoveredWithRework]}
                  onValueChange={([v]) => onChange("pctRecoveredWithRework", v)}
                  data-testid="slider-pct-recovered-rework"
                />
                <p className="text-xs text-neutral-500">
                  Denied revenue that is usually overturned through rework or appeals.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Documentation-related unrecoverable portion
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pct-unrecoverable-doc" className="text-sm font-medium">
                    % of denied revenue unrecoverable due to documentation gaps
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.pctUnrecoverableDueToDocumentation.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="pct-unrecoverable-doc"
                  min={0}
                  max={60}
                  step={1}
                  value={[inputs.pctUnrecoverableDueToDocumentation]}
                  onValueChange={([v]) => onChange("pctUnrecoverableDueToDocumentation", v)}
                  data-testid="slider-pct-unrecoverable-doc"
                />
                <p className="text-xs text-neutral-500">
                  Portion of denials that cannot be overturned because medical necessity was not sufficiently documented.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Abridge's impact
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pct-reduction-abridge" className="text-sm font-medium">
                    % reduction in documentation-driven denials with Abridge
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.pctReductionWithAbridge.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="pct-reduction-abridge"
                  min={0}
                  max={100}
                  step={1}
                  value={[inputs.pctReductionWithAbridge]}
                  onValueChange={([v]) => onChange("pctReductionWithAbridge", v)}
                  data-testid="slider-pct-reduction-abridge"
                />
                <p className="text-xs text-neutral-500">
                  Estimated improvement from clearer MDM and stronger encounter narratives.
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Realization factor
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="realization-factor-denials" className="text-sm font-medium">
                    Realization factor
                  </Label>
                  <span className="text-sm font-mono text-neutral-700">
                    {inputs.realizationFactor.toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="realization-factor-denials"
                  min={0}
                  max={100}
                  step={1}
                  value={[inputs.realizationFactor]}
                  onValueChange={([v]) => onChange("realizationFactor", v)}
                  data-testid="slider-realization-factor-denials"
                />
                <p className="text-xs text-neutral-500">
                  Conservative portion of the modeled reduction you want to claim.
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Calculated Outputs
            </h3>

            <div className="bg-neutral-50 rounded-lg p-4 space-y-3" data-testid="denials-calculated-outputs">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Baseline denied revenue</span>
                <span className="font-mono text-sm font-medium" data-testid="output-baseline-denied">
                  {formatCurrency(calculations.baselineDeniedRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Unrecovered after rework/appeals</span>
                <span className="font-mono text-sm font-medium" data-testid="output-unrecovered">
                  {formatCurrency(calculations.unrecoveredAfterRework)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Documentation-driven unrecoverable</span>
                <span className="font-mono text-sm font-medium" data-testid="output-doc-driven-unrecoverable">
                  {formatCurrency(calculations.documentationDrivenUnrecoverable)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Denials prevented (modeled)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-modeled-recovered">
                  {formatCurrency(calculations.modeledRecovered)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-800">Incremental annual revenue</span>
                <span className="font-mono text-base font-semibold text-neutral-900" data-testid="output-realized-recovered">
                  {formatCurrency(calculations.realizedRecovered)}
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
{`Baseline denied revenue =
  Net collectible outpatient revenue
  × Baseline denial rate

Unrecoverable documentation-driven portion =
  Baseline denied revenue
  × (1 − % recovered with rework)
  × % unrecoverable due to documentation gaps

Annual revenue recovered =
  Unrecoverable documentation-driven portion
  × % reduction with Abridge
  × Realization factor`}
              </pre>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <p className="text-xs text-neutral-500 italic">
              Changes here update the denials impact, waterfall, KPIs, and enterprise projections automatically.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
