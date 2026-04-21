import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import {
  type DriverOnset,
  type ForecastState,
  type ForecastValueDriver,
  type ScalingUnit,
  type ValueDomain,
  VALUE_DOMAIN_LABELS,
} from "../../types";
import { SectionShell } from "./SectionShell";
import {
  DOMAIN_BADGE_CLASS,
  ONSET_LABELS,
  SCALING_UNIT_LABELS,
  confidenceLabelFor,
} from "../constants";

interface Props {
  state: ForecastState;
  updateState: (updates: Partial<ForecastState>) => void;
}

const DOMAIN_VALUES: ValueDomain[] = ["capacity", "revenue", "workforce", "quality"];
const ONSET_VALUES: DriverOnset[] = ["immediate", "delayed", "phased", "longTerm"];
const SCALING_VALUES: ScalingUnit[] = ["perEncounter", "perActiveUser", "perBed", "annualFlat"];

export function ValueDriversSection({ state, updateState }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const updateDriver = (id: string, patch: Partial<ForecastValueDriver>) => {
    updateState({
      valueDrivers: state.valueDrivers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });
  };
  const removeDriver = (id: string) => {
    updateState({ valueDrivers: state.valueDrivers.filter((d) => d.id !== id) });
  };
  const addDriver = (d: ForecastValueDriver) => {
    updateState({ valueDrivers: [...state.valueDrivers, d] });
  };

  return (
    <SectionShell
      title="Value Drivers"
      icon={<Sparkles className="w-4 h-4" />}
      defaultOpen
      testId="section-value-drivers"
    >
      {state.valueDrivers.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center">
          <p className="text-xs text-neutral-600">No drivers yet — add one below.</p>
        </div>
      )}

      <div className="space-y-3">
        {state.valueDrivers.map((d) => (
          <div
            key={d.id}
            data-testid={`driver-card-${d.id}`}
            className="rounded-lg border border-neutral-200 bg-white p-3 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  data-testid={`input-driver-label-${d.id}`}
                  value={d.label}
                  onChange={(e) => updateDriver(d.id, { label: e.target.value })}
                  className="h-7 text-sm font-semibold border-0 px-1 -ml-1 focus-visible:ring-1"
                />
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase tracking-wide ${DOMAIN_BADGE_CLASS[d.domain]}`}
                  >
                    {VALUE_DOMAIN_LABELS[d.domain]}
                  </Badge>
                  {d.source === "measure" && (
                    <Badge className="text-[10px] uppercase tracking-wide bg-[#FBE9E2] text-[#A82200] hover:bg-[#FBE9E2]">
                      from Measure
                    </Badge>
                  )}
                </div>
              </div>
              <button
                type="button"
                data-testid={`btn-driver-remove-${d.id}`}
                onClick={() => removeDriver(d.id)}
                className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50"
                aria-label="Remove driver"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {typeof d.measuredDelta === "number" && (
              <p className="text-[11px] font-sans font-semibold text-neutral-500">
                Measured: ${d.measuredDelta.toLocaleString()}
              </p>
            )}

            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                Projected going forward
              </Label>
              <FormattedNumberInput
                data-testid={`input-driver-projected-${d.id}`}
                value={d.projectedDelta || ""}
                onChange={(v) => updateDriver(d.id, { projectedDelta: v })}
                step={0.01}
                className="border-2 focus:border-[#EA2C00] focus-visible:ring-[#EA2C00]/30"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-700">Confidence</span>
                <span className="font-sans font-semibold">{d.confidence}%</span>
              </div>
              <Slider
                data-testid={`slider-confidence-${d.id}`}
                value={[d.confidence]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => updateDriver(d.id, { confidence: v[0] })}
              />
              <p className="text-[10px] text-neutral-500 italic">
                {confidenceLabelFor(d.confidence)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-700">Realization</span>
                <span className="font-sans font-semibold">{d.realizationPct}%</span>
              </div>
              <Slider
                data-testid={`slider-realization-${d.id}`}
                value={[d.realizationPct]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => updateDriver(d.id, { realizationPct: v[0] })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-neutral-500">Onset</Label>
                <Select
                  value={d.onset}
                  onValueChange={(v) => updateDriver(d.id, { onset: v as DriverOnset })}
                >
                  <SelectTrigger className="text-xs h-8" data-testid={`select-onset-${d.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ONSET_VALUES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {ONSET_LABELS[o]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                  Scaling
                </Label>
                <Select
                  value={d.scalingUnit}
                  onValueChange={(v) => updateDriver(d.id, { scalingUnit: v as ScalingUnit })}
                >
                  <SelectTrigger className="text-xs h-8" data-testid={`select-scaling-${d.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCALING_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SCALING_UNIT_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        size="sm"
        variant="outline"
        data-testid="btn-add-driver"
        onClick={() => setDialogOpen(true)}
        className="w-full"
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add value driver
      </Button>

      <AddDriverDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={(d) => {
          addDriver(d);
          setDialogOpen(false);
        }}
      />
    </SectionShell>
  );
}

function AddDriverDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onSave: (d: ForecastValueDriver) => void;
}) {
  const [label, setLabel] = useState("");
  const [domain, setDomain] = useState<ValueDomain>("capacity");
  const [projectedDelta, setProjectedDelta] = useState(0);
  const [confidence, setConfidence] = useState(60);
  const [realization, setRealization] = useState(80);
  const [onset, setOnset] = useState<DriverOnset>("delayed");
  const [scalingUnit, setScalingUnit] = useState<ScalingUnit>("perEncounter");

  const handleSave = () => {
    if (!label.trim()) return;
    onSave({
      id: `drv-${Date.now().toString(36)}`,
      label: label.trim(),
      domain,
      category: "documentation",
      scalingUnit,
      projectedDelta,
      confidence,
      realizationPct: realization,
      onset,
      source: "manual",
    });
    setLabel("");
    setProjectedDelta(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-add-driver">
        <DialogHeader>
          <DialogTitle>Add value driver</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide">Label</Label>
            <Input
              data-testid="input-new-driver-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. wRVU lift"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide">Domain</Label>
              <Select value={domain} onValueChange={(v) => setDomain(v as ValueDomain)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOMAIN_VALUES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {VALUE_DOMAIN_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide">Onset</Label>
              <Select value={onset} onValueChange={(v) => setOnset(v as DriverOnset)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ONSET_VALUES.map((o) => (
                    <SelectItem key={o} value={o}>{ONSET_LABELS[o]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide">Scaling</Label>
              <Select value={scalingUnit} onValueChange={(v) => setScalingUnit(v as ScalingUnit)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCALING_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>{SCALING_UNIT_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide">Projected Δ</Label>
              <FormattedNumberInput
                data-testid="input-new-driver-delta"
                value={projectedDelta || ""}
                onChange={setProjectedDelta}
                step={0.01}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Confidence</span>
              <span className="font-sans font-semibold">{confidence}%</span>
            </div>
            <Slider value={[confidence]} min={0} max={100} step={5} onValueChange={(v) => setConfidence(v[0])} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Realization</span>
              <span className="font-sans font-semibold">{realization}%</span>
            </div>
            <Slider value={[realization]} min={0} max={100} step={5} onValueChange={(v) => setRealization(v[0])} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!label.trim()}
            data-testid="btn-save-new-driver"
            className="bg-[#EA2C00] hover:bg-[#C92500] text-white"
          >
            Add driver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
