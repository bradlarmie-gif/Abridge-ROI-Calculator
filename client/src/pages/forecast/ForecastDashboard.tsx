import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Download,
  Home,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { UnifiedHeader } from "@/components/UnifiedHeader";
import {
  calculateForecast,
  type ForecastResult,
} from "@/lib/forecastCalculator";
import {
  type ComparisonPricing,
  type DriverOnset,
  type ForecastScenario,
  type ForecastState,
  type ForecastStateSnapshot,
  type ForecastValueDriver,
  type PricingConfig,
  type PricingModel,
  type ScalingUnit,
  type ValueDomain,
  PRICING_MODEL_LABELS,
  PRICING_UNIT_LABELS,
  VALUE_DOMAIN_LABELS,
} from "./types";
import { EncounterTrajectory } from "./dashboard/charts/EncounterTrajectory";
import { AlertsZone } from "./dashboard/AlertsZone";
import { ExportDialog } from "./dashboard/ExportDialog";
import { MeasuredOutcomesPanel } from "./dashboard/MeasuredOutcomesPanel";
import { useSmoothCountUp } from "./dashboard/useSmoothCountUp";
import { fmtCurrencyShort } from "./dashboard/charts/shared";
import {
  DOMAIN_BADGE_CLASS,
  ONSET_LABELS,
  SCALING_UNIT_LABELS,
  SCENARIO_COLORS,
  confidenceLabelFor,
} from "./dashboard/constants";

interface Props {
  state: ForecastState;
  updateState: (updates: Partial<ForecastState>) => void;
  replaceState: (next: ForecastState) => void;
  onBack: () => void;
  onHome: () => void;
}

const ACCENT = "#EA2C00";
const CARD_BG = "bg-[#FAF8F5]";
const CARD_BORDER = "border border-[#E8E2DA]";
const PAGE_BG = "bg-[#FAFAF8]";

const MAX_SCENARIOS = 4;

const ALL_MODELS: PricingModel[] = [
  "perProvider",
  "perStaffedBed",
  "annualFlat",
  "perEncounter",
  "hybrid",
];

const ATTRIBUTION_PRESETS = [
  { id: "conservative", label: "Conservative", confidence: 50, realization: 60 },
  { id: "standard", label: "Standard", confidence: 70, realization: 80 },
  { id: "favorable", label: "Favorable", confidence: 90, realization: 95 },
] as const;

type PresetId = (typeof ATTRIBUTION_PRESETS)[number]["id"];

export default function ForecastDashboard({
  state,
  updateState,
  replaceState,
  onBack,
  onHome,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false);

  const result = useMemo(() => calculateForecast(state), [state]);

  const isEncounterMode =
    state.currentPricing.model === "perEncounter" ||
    state.currentPricing.model === "hybrid" ||
    state.comparisonPricing.some(
      (c) => c.pricing.model === "perEncounter" || c.pricing.model === "hybrid",
    );

  const applySwap = useCallback(
    (cmp: ComparisonPricing) => {
      replaceState({
        ...state,
        currentPricing: {
          ...cmp.pricing,
          yearlyEscalators: [...(cmp.pricing.yearlyEscalators ?? [])],
        },
        comparisonPricing: [
          ...state.comparisonPricing.filter((c) => c.id !== cmp.id),
          {
            id: `cmp-prev-${Date.now().toString(36)}`,
            label: "Previous pricing",
            pricing: {
              ...state.currentPricing,
              yearlyEscalators: [...(state.currentPricing.yearlyEscalators ?? [])],
            },
          },
        ].slice(-3),
      });
    },
    [state, replaceState],
  );

  const partner = state.partnerName?.trim() || "Untitled partner";
  const termYears = state.contractTermMonths / 12;
  const startDate = state.contractStartDate ? new Date(state.contractStartDate) : null;
  const contractWindow = startDate
    ? `${format(startDate, "MMM yyyy")} – ${format(
        new Date(startDate.getFullYear() + termYears, startDate.getMonth(), startDate.getDate()),
        "MMM yyyy",
      )}`
    : `${termYears} year term`;

  return (
    <div className={`min-h-screen ${PAGE_BG}`}>
      <UnifiedHeader
        pathType="forecast"
        currentStep={4}
        totalSteps={4}
        stepName="Dashboard"
        onHome={onHome}
      />

      {/* Sub-header */}
      <div className="border-b border-[#E8E2DA] bg-white">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              data-testid="btn-dashboard-back"
              className="text-[#666666]"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <div className="min-w-0">
              <Input
                value={state.partnerName}
                onChange={(e) => updateState({ partnerName: e.target.value })}
                placeholder="Untitled partner"
                data-testid="input-dashboard-partner-name"
                className="h-7 text-sm font-semibold px-2 py-0.5 w-56 border-transparent hover:border-[#E8E2DA] focus:border-[#CCCCCC] bg-transparent hover:bg-[#FAF8F5] transition-colors"
              />
              <div className="flex items-center gap-2 mt-0.5 px-2">
                <span
                  className="inline-flex items-center text-[10px] uppercase tracking-widest font-semibold text-[#A82200] bg-[#FBE9E2] px-2 py-0.5 rounded"
                  data-testid="pill-contract-window"
                >
                  {contractWindow}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onHome}
              data-testid="btn-dashboard-home"
              className="text-[#666666]"
            >
              <Home className="w-4 h-4 mr-1.5" /> Home
            </Button>
            <Button
              size="sm"
              data-testid="btn-export"
              onClick={() => setExportOpen(true)}
              className="bg-[#EA2C00] hover:bg-[#C92500] text-white"
            >
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Page title */}
        {(() => {
          const fromMeasure = state.importSource.type === "measure";
          const measuredCount = state.valueDrivers.filter(
            (d) => d.source === "measure",
          ).length;
          const subtitle = fromMeasure
            ? `Based on ${measuredCount} measured outcome${measuredCount === 1 ? "" : "s"}`
            : "Exploratory model";
          return (
            <>
              <motion.h1
                className="text-2xl md:text-3xl font-bold text-[#1A1A1A] font-abridge uppercase tracking-tight mb-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                data-testid="text-dashboard-title"
              >
                {termYears}-Year Forecast · {partner}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="text-sm text-[#666666] mb-8"
                data-testid="text-dashboard-subtitle"
              >
                {subtitle}
              </motion.p>
            </>
          );
        })()}

        {/* Hero ROI card */}
        {state.valueDrivers.length === 0 && (
          <p className="text-xs text-[#999999] mb-2" data-testid="text-cost-comparison-hint">
            Cost comparison active — add value drivers to see ROI
          </p>
        )}
        <HeroROI result={result} state={state} />

        {/* Measured Outcomes (only when imported from Measure) */}
        <MeasuredOutcomesPanel state={state} />

        {/* Saved Scenarios pill strip */}
        <ScenariosStrip state={state} updateState={updateState} replaceState={replaceState} />

        {/* Pricing comparison */}
        <PricingComparisonBlock
          state={state}
          updateState={updateState}
          result={result}
          applySwap={applySwap}
        />

        {/* Value Drivers */}
        <ValueDriversBlock state={state} updateState={updateState} />

        {/* Levers */}
        <LeversBlock state={state} updateState={updateState} />

        {/* Alerts */}
        <div className="mb-8">
          <AlertsZone
            alerts={result.alerts}
            comparisons={state.comparisonPricing}
            applySwap={applySwap}
            state={state}
          />
        </div>

        {/* Encounter Runway (conditional) */}
        {isEncounterMode && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${CARD_BG} ${CARD_BORDER} rounded-xl p-3.5 md:p-5 mb-8`}
            data-testid="section-encounter-runway"
          >
            <h2 className="text-[11px] uppercase tracking-[2px] text-[#666666] font-semibold mb-4">
              Encounter Runway
            </h2>
            <EncounterTrajectory result={result} state={state} />
          </motion.section>
        )}
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} state={state} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Hero ROI
// ────────────────────────────────────────────────────────────
function HeroROI({ result, state }: { result: ForecastResult; state: ForecastState }) {
  const { totalContractValue, netContractValue, roiMultiple, fullBreakEvenMonth } = result.kpis;
  const hasDrivers = state.valueDrivers.length > 0;

  const tcv = useSmoothCountUp(Number.isFinite(totalContractValue) ? totalContractValue : 0);
  const ncv = useSmoothCountUp(Number.isFinite(netContractValue) ? netContractValue : 0);
  const roi = useSmoothCountUp(Number.isFinite(roiMultiple) ? roiMultiple : 0);

  const breakEvenLabel = !hasDrivers
    ? "—"
    : fullBreakEvenMonth != null
      ? `Month ${fullBreakEvenMonth}`
      : "Not within term";
  const ncvDisplay = hasDrivers ? fmtCurrencyShort(ncv) : "—";
  const roiDisplay = hasDrivers ? `${roi.toFixed(2)}×` : "—";
  const pricingLabel = PRICING_MODEL_LABELS[state.currentPricing.model];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl bg-[#1A1A1A] text-white p-6 md:p-8 mb-8 relative overflow-hidden"
      data-testid="section-hero-roi"
    >
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20"
        style={{ background: ACCENT }}
      />
      <p className="text-[10px] uppercase tracking-[2px] text-white/50 font-semibold mb-2">
        Forecast Summary
      </p>
      <p className="text-4xl md:text-5xl font-bold font-abridge mb-2" data-testid="text-hero-tcv">
        {fmtCurrencyShort(tcv)}
      </p>
      <p className="text-sm text-white/70 mb-6">
        modeled total contract value at <span style={{ color: ACCENT }}>{pricingLabel}</span>
      </p>

      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Net Value</p>
          <p
            className="text-xl md:text-2xl font-bold font-abridge"
            style={{ color: hasDrivers && ncv < 0 ? "#FF6B6B" : ACCENT }}
            data-testid="text-hero-ncv"
          >
            {ncvDisplay}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">ROI Multiple</p>
          <p
            className="text-xl md:text-2xl font-bold font-abridge"
            style={{ color: ACCENT }}
            data-testid="text-hero-roi"
          >
            {roiDisplay}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Break-Even</p>
          <p className="text-xl md:text-2xl font-bold font-abridge text-white" data-testid="text-hero-be">
            {breakEvenLabel}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

// ────────────────────────────────────────────────────────────
// Value Drivers
// ────────────────────────────────────────────────────────────
const DOMAIN_VALUES: ValueDomain[] = ["capacity", "revenue", "workforce", "quality"];
const ONSET_VALUES: DriverOnset[] = ["immediate", "delayed", "phased", "longTerm"];
const SCALING_VALUES: ScalingUnit[] = ["perEncounter", "perActiveUser", "perBed", "annualFlat"];

function ValueDriversBlock({
  state,
  updateState,
}: {
  state: ForecastState;
  updateState: (u: Partial<ForecastState>) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preset, setPreset] = useState<PresetId>("standard");

  const updateDriver = (id: string, patch: Partial<ForecastValueDriver>) => {
    updateState({
      valueDrivers: state.valueDrivers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });
  };
  const removeDriver = (id: string) =>
    updateState({ valueDrivers: state.valueDrivers.filter((d) => d.id !== id) });
  const addDriver = (d: ForecastValueDriver) =>
    updateState({ valueDrivers: [...state.valueDrivers, d] });

  const selectPreset = (p: PresetId) => {
    setPreset(p);
    const def = ATTRIBUTION_PRESETS.find((x) => x.id === p)!;
    updateState({
      valueDrivers: state.valueDrivers.map((d) => ({
        ...d,
        confidence: def.confidence,
        realizationPct: def.realization,
      })),
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-8"
      data-testid="section-value-drivers"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] uppercase tracking-[2px] text-[#666666] font-semibold flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" /> Value Drivers
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          data-testid="btn-add-driver"
          className="h-7 text-xs border-[#E8E2DA]"
        >
          <Plus className="w-3 h-3 mr-1" /> Add driver
        </Button>
      </div>

      <div className="space-y-4">
        {state.valueDrivers.length === 0 && (
          <div className={`${CARD_BG} ${CARD_BORDER} rounded-xl p-6 text-center`}>
            <p className="text-sm text-[#999999]">No drivers yet — add one above.</p>
          </div>
        )}
        {state.valueDrivers.map((d) => {
          const hasRaw = d.baselineValue != null && d.measuredValue != null && d.conversionFactor != null;
          const rawDelta = hasRaw ? d.measuredValue! - d.baselineValue! : null;
          return (
          <div
            key={d.id}
            data-testid={`driver-card-${d.id}`}
            className={`${CARD_BG} ${CARD_BORDER} rounded-xl p-4 md:p-5`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <Input
                  data-testid={`input-driver-label-${d.id}`}
                  value={d.label}
                  onChange={(e) => updateDriver(d.id, { label: e.target.value })}
                  className="h-7 text-sm font-semibold border-0 px-1 -ml-1 focus-visible:ring-1 bg-transparent"
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
                {hasRaw && rawDelta !== null && (
                  <p className="text-[11px] text-[#666666] mt-1.5">
                    {d.baselineValue!.toFixed(2)} → {d.measuredValue!.toFixed(2)} {d.unitLabel ?? ""} × ${d.conversionFactor!.toFixed(2)} = <span className="font-semibold text-[#EA2C00]">${d.projectedDelta.toFixed(2)}</span> / {SCALING_UNIT_LABELS[d.scalingUnit] ?? d.scalingUnit}
                  </p>
                )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-[#666666]">
                  Projected Δ
                </Label>
                <FormattedNumberInput
                  data-testid={`input-driver-projected-${d.id}`}
                  value={d.projectedDelta || ""}
                  onChange={(v) => updateDriver(d.id, { projectedDelta: v })}
                  step={0.01}
                  className="bg-white border-[#E8E2DA]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-[#666666]">
                    Onset
                  </Label>
                  <Select
                    value={d.onset}
                    onValueChange={(v) => updateDriver(d.id, { onset: v as DriverOnset })}
                  >
                    <SelectTrigger
                      className="text-xs h-9 bg-white border-[#E8E2DA]"
                      data-testid={`select-onset-${d.id}`}
                    >
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
                  <Label className="text-[10px] uppercase tracking-wide text-[#666666]">
                    Scaling
                  </Label>
                  <Select
                    value={d.scalingUnit}
                    onValueChange={(v) => updateDriver(d.id, { scalingUnit: v as ScalingUnit })}
                  >
                    <SelectTrigger
                      className="text-xs h-9 bg-white border-[#E8E2DA]"
                      data-testid={`select-scaling-${d.id}`}
                    >
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#666666]">Confidence</span>
                  <span className="font-semibold text-[#1A1A1A]">{d.confidence}%</span>
                </div>
                <Slider
                  data-testid={`slider-confidence-${d.id}`}
                  value={[d.confidence]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(v) => updateDriver(d.id, { confidence: v[0] })}
                />
                <p className="text-[10px] text-[#999999] italic">
                  {confidenceLabelFor(d.confidence)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#666666]">Realization</span>
                  <span className="font-semibold text-[#1A1A1A]">{d.realizationPct}%</span>
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
            </div>
          </div>
          );
        })}
      </div>

      {/* Preset chips — apply to all drivers */}
      <div className="mt-6" data-testid="attribution-presets">
        <p className="text-[10px] uppercase tracking-widest text-[#666666] font-semibold mb-2">
          Apply to all drivers:
        </p>
        <div className="flex gap-3">
          {ATTRIBUTION_PRESETS.map((p) => {
            const disabled = state.valueDrivers.length === 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => !disabled && selectPreset(p.id)}
                disabled={disabled}
                data-testid={`preset-${p.id}`}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                  disabled
                    ? "border-[#E8E2DA] bg-white/40 opacity-50 cursor-not-allowed"
                    : preset === p.id
                      ? "border-[#1A1A1A] bg-white shadow-sm"
                      : "border-[#E8E2DA] bg-white/60 hover:border-[#CCCCCC]"
                }`}
              >
                <p
                  className={`text-sm font-semibold mb-0.5 ${
                    !disabled && preset === p.id ? "text-[#1A1A1A]" : "text-[#666666]"
                  }`}
                >
                  {p.label}
                </p>
                <p className="text-[11px] text-[#999999] leading-snug">
                  {p.confidence}% attribution · {p.realization}% realization
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <AddDriverDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={(d) => {
          addDriver(d);
          setDialogOpen(false);
        }}
      />
    </motion.section>
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
  const [domain, setDomain] = useState<ValueDomain>("revenue");
  const [onset, setOnset] = useState<DriverOnset>("delayed");
  const [scalingUnit, setScalingUnit] = useState<ScalingUnit>("perEncounter");
  const [baselineValue, setBaselineValue] = useState(0);
  const [measuredValue, setMeasuredValue] = useState(0);
  const [conversionFactor, setConversionFactor] = useState(0);
  const [unitLabel, setUnitLabel] = useState("");
  const [attribution, setAttribution] = useState(62);
  const [realization, setRealization] = useState(80);

  const delta = measuredValue - baselineValue;
  const projectedDelta = delta * conversionFactor;
  const canSave = label.trim().length > 0 && conversionFactor > 0 && Math.abs(delta) > 0;

  const fmtPreview = (n: number) => {
    if (!Number.isFinite(n) || n === 0) return "—";
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: `drv-${Date.now().toString(36)}`,
      label: label.trim(),
      domain,
      category: "documentation",
      scalingUnit,
      baselineValue,
      measuredValue,
      conversionFactor,
      unitLabel: unitLabel.trim() || undefined,
      projectedDelta: Math.abs(projectedDelta),
      confidence: attribution,
      realizationPct: realization,
      onset,
      source: "manual",
    });
    setLabel(""); setBaselineValue(0); setMeasuredValue(0); setConversionFactor(0); setUnitLabel("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-add-driver">
        <DialogHeader>
          <DialogTitle>Add value driver</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide">Driver name</Label>
            <Input
              data-testid="input-new-driver-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. wRVU per encounter"
              autoFocus
            />
          </div>

          <div className="rounded-md bg-[#FAF8F5] border border-[#E8E2DA] p-3 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#EA2C00]">Partner's measured data</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-neutral-500">Before Abridge</Label>
                <FormattedNumberInput data-testid="input-baseline" value={baselineValue || ""} onChange={setBaselineValue} step={0.01} placeholder="0.00" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-neutral-500">After Abridge</Label>
                <FormattedNumberInput data-testid="input-measured" value={measuredValue || ""} onChange={setMeasuredValue} step={0.01} placeholder="0.00" className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-neutral-500">Conversion factor ($/unit)</Label>
                <FormattedNumberInput data-testid="input-conversion" value={conversionFactor || ""} onChange={setConversionFactor} step={0.01} placeholder="e.g. 33 for $/wRVU" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-neutral-500">Unit label</Label>
                <Input value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} placeholder="e.g. wRVU/enc" className="h-8 text-sm" />
              </div>
            </div>
            {Math.abs(delta) > 0 && conversionFactor > 0 && (
              <div className="rounded border border-[#E8E2DA] bg-white px-3 py-2">
                <p className="text-[11px] text-neutral-500">
                  Δ {delta >= 0 ? "+" : ""}{delta.toFixed(2)} {unitLabel} × ${conversionFactor.toFixed(2)} = <span className="font-bold text-[#EA2C00]">{fmtPreview(projectedDelta)}</span> per {SCALING_UNIT_LABELS[scalingUnit]}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide">Domain</Label>
              <Select value={domain} onValueChange={(v) => setDomain(v as ValueDomain)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOMAIN_VALUES.map((d) => (
                    <SelectItem key={d} value={d}>{VALUE_DOMAIN_LABELS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide">Onset</Label>
              <Select value={onset} onValueChange={(v) => setOnset(v as DriverOnset)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ONSET_VALUES.map((o) => (
                    <SelectItem key={o} value={o}>{ONSET_LABELS[o]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide">Scaling</Label>
            <Select value={scalingUnit} onValueChange={(v) => setScalingUnit(v as ScalingUnit)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCALING_VALUES.map((s) => (
                  <SelectItem key={s} value={s}>{SCALING_UNIT_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs"><span>Attribution</span><span className="font-semibold">{attribution}%</span></div>
            <Slider value={[attribution]} min={0} max={100} step={5} onValueChange={([v]) => setAttribution(v)} />
            <p className="text-[10px] text-neutral-400">How much of the improvement is attributed to Abridge</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs"><span>Realization</span><span className="font-semibold">{realization}%</span></div>
            <Slider value={[realization]} min={0} max={100} step={5} onValueChange={([v]) => setRealization(v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
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

// ────────────────────────────────────────────────────────────
// Pricing Comparison ("What if you changed pricing?")
// ────────────────────────────────────────────────────────────
function defaultPricingFor(model: PricingModel): PricingConfig {
  return {
    model,
    unitPrice:
      model === "annualFlat"
        ? 500_000
        : model === "perEncounter"
          ? 5
          : model === "perStaffedBed"
            ? 150
            : 200,
    yearlyEscalators: [0, 0, 0, 0, 0],
    ...(model === "perEncounter" || model === "hybrid"
      ? { contractEncounterLimit: 500_000, capacityCeiling: 600_000, overageRate: 8 }
      : {}),
    ...(model === "hybrid" ? { secondaryModel: "perEncounter", secondaryUnitPrice: 1 } : {}),
  };
}

function PricingComparisonBlock({
  state,
  updateState,
  result,
  applySwap,
}: {
  state: ForecastState;
  updateState: (u: Partial<ForecastState>) => void;
  result: ForecastResult;
  applySwap: (cmp: ComparisonPricing) => void;
}) {
  const nursingActive = state.careSettings.includes("nursing");
  const currentModel = state.currentPricing.model;

  // Build display set: current first, then existing comparisons, top up with defaults
  const cards = useMemo(() => {
    const arr: { id: string; label: string; pricing: PricingConfig; isCurrent: boolean; cmpId?: string }[] = [
      {
        id: "current",
        label: PRICING_MODEL_LABELS[currentModel],
        pricing: state.currentPricing,
        isCurrent: true,
      },
    ];
    const used = new Set<PricingModel>([currentModel]);
    for (const c of state.comparisonPricing) {
      if (used.has(c.pricing.model)) continue;
      arr.push({
        id: c.id,
        label: PRICING_MODEL_LABELS[c.pricing.model],
        pricing: c.pricing,
        isCurrent: false,
        cmpId: c.id,
      });
      used.add(c.pricing.model);
    }
    for (const m of ALL_MODELS) {
      if (arr.length >= 4) break;
      if (used.has(m)) continue;
      if (m === "perStaffedBed" && !nursingActive) continue;
      arr.push({
        id: `default-${m}`,
        label: PRICING_MODEL_LABELS[m],
        pricing: defaultPricingFor(m),
        isCurrent: false,
      });
      used.add(m);
    }
    return arr.slice(0, 4);
  }, [currentModel, state.currentPricing, state.comparisonPricing, nursingActive]);

  const computeCardKpi = (card: (typeof cards)[number]) => {
    if (card.isCurrent) return result.kpis;
    if (card.cmpId && result.alternateKpis[card.cmpId]) return result.alternateKpis[card.cmpId];
    // ad-hoc compute via clone
    const cloneState: ForecastState = {
      ...state,
      currentPricing: card.pricing,
      comparisonPricing: [],
    };
    return calculateForecast(cloneState).kpis;
  };

  const makePrimary = (card: (typeof cards)[number]) => {
    if (card.isCurrent) return;
    const synthetic: ComparisonPricing = card.cmpId
      ? (state.comparisonPricing.find((c) => c.id === card.cmpId) as ComparisonPricing)
      : {
          id: `cmp-${card.pricing.model}-${Date.now().toString(36)}`,
          label: `Switch to ${PRICING_MODEL_LABELS[card.pricing.model]}`,
          pricing: card.pricing,
        };
    if (synthetic) applySwap(synthetic);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="mb-8"
      data-testid="section-pricing-comparison"
    >
      <h2 className="text-[11px] uppercase tracking-[2px] text-[#666666] font-semibold mb-1">
        What If We Changed The Deal?
      </h2>
      <p className="text-xs text-[#999999] mb-4">
        Model alternate pricing structures and see the impact on your break-even and net value.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const kpis = computeCardKpi(card);
          const ncv = Number.isFinite(kpis.netContractValue) ? kpis.netContractValue : 0;
          const tcv = Number.isFinite(kpis.totalContractValue) ? kpis.totalContractValue : 0;
          return (
            <div
              key={card.id}
              data-testid={`pricing-card-${card.pricing.model}`}
              className={`rounded-xl p-4 transition-all ${
                card.isCurrent
                  ? "bg-white border-2 border-[#1A1A1A] shadow-sm"
                  : `${CARD_BG} ${CARD_BORDER} hover:border-[#CCCCCC]`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-widest text-[#666666] font-semibold">
                  {card.label}
                </p>
                {card.isCurrent && (
                  <Badge className="text-[9px] bg-[#FBE9E2] text-[#A82200] hover:bg-[#FBE9E2]">
                    Current
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#999999] mb-3">
                ${card.pricing.unitPrice.toLocaleString()} {PRICING_UNIT_LABELS[card.pricing.model]}
              </p>
              <div className="space-y-2 mb-3 pb-3 border-b border-[#E8E2DA]">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#999999]">TCV</p>
                  <p className="text-base font-bold font-abridge text-[#1A1A1A]">
                    {fmtCurrencyShort(tcv)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#999999]">Net Value</p>
                  <p
                    className="text-base font-bold font-abridge"
                    style={{ color: ncv < 0 ? "#FF6B6B" : ACCENT }}
                  >
                    {fmtCurrencyShort(ncv)}
                  </p>
                </div>
              </div>
              {card.isCurrent ? (
                <div
                  className="flex items-center justify-center gap-1 text-[11px] text-[#1A1A1A] font-semibold py-2"
                  data-testid={`pricing-card-active-${card.pricing.model}`}
                >
                  <Check className="w-3 h-3" /> Active
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  data-testid={`btn-make-primary-${card.pricing.model}`}
                  onClick={() => makePrimary(card)}
                  className="w-full h-8 text-[11px] border-[#E8E2DA] hover:border-[#1A1A1A] hover:bg-white"
                >
                  Make this primary
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

// ────────────────────────────────────────────────────────────
// Levers (2x2 sliders)
// ────────────────────────────────────────────────────────────
function LeversBlock({
  state,
  updateState,
}: {
  state: ForecastState;
  updateState: (u: Partial<ForecastState>) => void;
}) {
  const ramp = state.adoptionCurve.rampMonths;
  const utilization = useMemo(() => {
    const vals = state.utilizationCurve.values;
    if (!vals.length) return 75;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }, [state.utilizationCurve.values]);
  const growth = state.historicalGrowthMonthly[0] ?? 4;
  const share = useMemo(() => {
    const vals = state.encounterShareCurve.values;
    if (!vals.length) return 60;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }, [state.encounterShareCurve.values]);

  const setUtilization = (pct: number) => {
    updateState({
      utilizationCurve: {
        values: state.utilizationCurve.values.map(() => Math.max(0, Math.min(100, pct))),
      },
    });
  };
  const setShare = (pct: number) => {
    updateState({
      encounterShareCurve: {
        values: state.encounterShareCurve.values.map(() => Math.max(0, Math.min(100, pct))),
      },
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className={`${CARD_BG} ${CARD_BORDER} rounded-xl p-4 md:p-5 mb-8`}
      data-testid="section-levers"
    >
      <h2 className="text-[11px] uppercase tracking-[2px] text-[#666666] font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5" /> Levers
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <LeverRow
          label="Adoption speed"
          value={`${ramp} months`}
          slider={
            <Slider
              data-testid="lever-adoption-ramp"
              value={[ramp]}
              min={1}
              max={12}
              step={1}
              onValueChange={(v) =>
                updateState({ adoptionCurve: { ...state.adoptionCurve, rampMonths: v[0] } })
              }
            />
          }
          hint="Months to reach end-state adoption"
        />
        <LeverRow
          label="Utilization"
          value={`${utilization}%`}
          slider={
            <Slider
              data-testid="lever-utilization"
              value={[utilization]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setUtilization(v[0])}
            />
          }
          hint="Avg % of provisioned seats actively using Abridge"
        />
        <LeverRow
          label="Encounter growth (MoM)"
          value={`${growth.toFixed(1)}%`}
          slider={
            <Slider
              data-testid="lever-growth"
              value={[growth]}
              min={0}
              max={15}
              step={0.5}
              onValueChange={(v) =>
                updateState({ historicalGrowthMonthly: [v[0]], growthSource: "benchmark" })
              }
            />
          }
          hint="Org-wide encounter growth rate"
        />
        <LeverRow
          label="Abridge encounter share"
          value={`${share}%`}
          slider={
            <Slider
              data-testid="lever-share"
              value={[share]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setShare(v[0])}
            />
          }
          hint="Avg % of org encounters captured by Abridge"
        />
      </div>
    </motion.section>
  );
}

function LeverRow({
  label,
  value,
  slider,
  hint,
}: {
  label: string;
  value: string;
  slider: React.ReactNode;
  hint: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs font-semibold text-[#1A1A1A]">{label}</Label>
        <span className="text-sm font-bold text-[#1A1A1A] font-abridge">{value}</span>
      </div>
      {slider}
      <p className="text-[10px] text-[#999999] mt-1.5">{hint}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Saved Scenarios horizontal pill strip
// ────────────────────────────────────────────────────────────
function ScenariosStrip({
  state,
  updateState,
  replaceState,
}: {
  state: ForecastState;
  updateState: (u: Partial<ForecastState>) => void;
  replaceState: (s: ForecastState) => void;
}) {
  const [name, setName] = useState("");
  const atLimit = state.scenarios.length >= MAX_SCENARIOS;

  const saveScenario = () => {
    if (!name.trim() || atLimit) return;
    const { scenarios: _omit, ...snapshot } = state;
    void _omit;
    const next: ForecastScenario = {
      id: `scn-${Date.now().toString(36)}`,
      name: name.trim(),
      snapshot: snapshot as ForecastStateSnapshot,
      createdAt: Date.now(),
      overlayOnChart: false,
      colorIdx: state.scenarios.length % SCENARIO_COLORS.length,
    };
    updateState({ scenarios: [...state.scenarios, next] });
    setName("");
  };

  const removeScenario = (id: string) =>
    updateState({ scenarios: state.scenarios.filter((s) => s.id !== id) });

  const loadScenario = (s: ForecastScenario) => {
    replaceState({
      ...(s.snapshot as ForecastStateSnapshot),
      scenarios: state.scenarios,
    } as ForecastState);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mb-4"
      data-testid="section-scenarios-strip"
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-[11px] uppercase tracking-[2px] text-[#666666] font-semibold flex items-center gap-2">
          <Bookmark className="w-3.5 h-3.5" /> Saved Scenarios
        </h2>
        <div className="flex items-center gap-2">
          <Input
            data-testid="input-scenario-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scenario name"
            disabled={atLimit}
            className="h-8 text-xs w-44 bg-white border-[#E8E2DA]"
          />
          <Button
            size="sm"
            data-testid="btn-save-scenario"
            disabled={!name.trim() || atLimit}
            onClick={saveScenario}
            className="h-8 text-xs bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white"
          >
            Save current
          </Button>
        </div>
      </div>
      {atLimit && (
        <p className="text-[10px] text-[#999999] mb-2">Max {MAX_SCENARIOS} scenarios saved.</p>
      )}
      <div className="flex flex-wrap gap-2" data-testid="scenarios-pills">
        {state.scenarios.length === 0 && (
          <p className="text-xs text-[#999999] italic">
            No saved scenarios yet — name one and save your current view to compare later.
          </p>
        )}
        <AnimatePresence>
          {state.scenarios.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              data-testid={`scenario-pill-${s.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#E8E2DA] bg-white pl-2 pr-1 py-1"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: SCENARIO_COLORS[s.colorIdx] ?? SCENARIO_COLORS[0] }}
              />
              <button
                type="button"
                onClick={() => loadScenario(s)}
                data-testid={`btn-load-scenario-${s.id}`}
                className="text-xs font-medium text-[#1A1A1A] hover:text-[#EA2C00]"
              >
                {s.name}
              </button>
              <span className="text-[10px] text-[#999999]">
                {format(new Date(s.createdAt), "MMM d")}
              </span>
              <button
                type="button"
                onClick={() => removeScenario(s.id)}
                data-testid={`btn-delete-scenario-${s.id}`}
                aria-label={`Delete scenario ${s.name}`}
                className="p-1 rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
