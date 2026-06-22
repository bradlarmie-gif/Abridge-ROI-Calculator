import { X } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/roi-calculator";
import { useEffect } from "react";

export interface PatientAccessInputs {
  minutesSavedPerEncounter: number;
  cliniciansInScope: number;
  encountersPerClinician: number;
  visitMinutes: number;
  reinvestRate: number;
  netRevenuePerEncounter: number;
}

export interface PatientAccessCalculations {
  totalHoursSaved: number;
  reinvestedHours: number;
  additionalVisits: number;
  incrementalRevenue: number;
}

interface PatientAccessDrawerProps {
  open: boolean;
  onClose: () => void;
  inputs: PatientAccessInputs;
  onChange: (field: keyof PatientAccessInputs, value: number) => void;
  calculations: PatientAccessCalculations;
}

export function PatientAccessDrawer({
  open,
  onClose,
  inputs,
  onChange,
  calculations,
}: PatientAccessDrawerProps) {
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
        data-testid="drawer-backdrop"
      />
      <div
        className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-white shadow-xl z-50 md:rounded-l-xl overflow-y-auto"
        data-testid="patient-access-drawer"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold text-black">Patient Access</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Assumptions and logic behind this driver
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-drawer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="mb-6">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Patient access is shaped by how much of the clinical day remains usable. 
              Documentation steals small blocks of time across each visit, and those minutes 
              compress schedules and limit available slots. These inputs describe how much time 
              returns to clinicians and how that flows into added access.
            </p>
          </div>

          <Separator className="my-4" />

          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Assumptions
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="minutes-saved" className="text-sm font-medium">
                  Minutes saved per encounter
                </Label>
                <span className="text-sm font-mono text-neutral-700">
                  {inputs.minutesSavedPerEncounter} min
                </span>
              </div>
              <Slider
                id="minutes-saved"
                min={1}
                max={6}
                step={0.5}
                value={[inputs.minutesSavedPerEncounter]}
                onValueChange={([v]) => onChange("minutesSavedPerEncounter", v)}
                data-testid="slider-minutes-saved"
              />
              <p className="text-xs text-neutral-500">
                Typical Abridge range is 1–6 minutes per visit.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicians-scope" className="text-sm font-medium">
                Clinicians included in this analysis
              </Label>
              <NumberField
                id="clinicians-scope"
                value={inputs.cliniciansInScope}
                onValueChange={(v) => onChange("cliniciansInScope", v)}
                className="font-mono"
                data-testid="input-clinicians-scope"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="encounters-per-clinician" className="text-sm font-medium">
                Annual encounters per clinician
              </Label>
              <NumberField
                id="encounters-per-clinician"
                value={inputs.encountersPerClinician}
                onValueChange={(v) => onChange("encountersPerClinician", v)}
                className="font-mono"
                data-testid="input-encounters-per-clinician"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visit-duration" className="text-sm font-medium">
                Typical visit length
              </Label>
              <Select
                value={String(inputs.visitMinutes)}
                onValueChange={(v) => onChange("visitMinutes", Number(v))}
              >
                <SelectTrigger id="visit-duration" data-testid="select-visit-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reinvest-rate" className="text-sm font-medium">
                  % of reclaimed time used to see more patients
                </Label>
                <span className="text-sm font-mono text-neutral-700">
                  {(inputs.reinvestRate * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                id="reinvest-rate"
                min={0}
                max={50}
                step={1}
                value={[inputs.reinvestRate * 100]}
                onValueChange={([v]) => onChange("reinvestRate", v / 100)}
                data-testid="slider-reinvest-rate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="net-revenue" className="text-sm font-medium">
                Net revenue per encounter ($)
              </Label>
              <NumberField
                id="net-revenue"
                value={inputs.netRevenuePerEncounter}
                onValueChange={(v) => onChange("netRevenuePerEncounter", v)}
                className="font-mono"
                data-testid="input-net-revenue"
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
              Calculated Outputs
            </h3>

            <div className="bg-neutral-50 rounded-lg p-4 space-y-3" data-testid="patient-access-calculated-outputs">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Total clinician hours recovered (annual)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-total-hours-saved">
                  {formatNumber(calculations.totalHoursSaved)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Reinvested hours (used for added capacity)</span>
                <span className="font-mono text-sm font-medium" data-testid="output-reinvested-hours">
                  {formatNumber(calculations.reinvestedHours)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Additional visits enabled</span>
                <span className="font-mono text-sm font-medium" data-testid="output-additional-visits">
                  {formatNumber(calculations.additionalVisits)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-800">Incremental annual revenue</span>
                <span className="font-mono text-base font-semibold text-neutral-900" data-testid="output-incremental-revenue">
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
{`Incremental annual revenue =
  Clinicians × Annual encounters per clinician
  × (Minutes saved per encounter ÷ 60)
  × % of reclaimed time used to see more patients
  × (60 ÷ visit duration)
  × Net revenue per encounter`}
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
