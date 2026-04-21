import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  Download,
  Home,
  Info,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  type ForecastCalibration,
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

export function recalculateProjectedDelta(driver: ForecastValueDriver): number {
  const ci = driver.clinicalInputs;
  if (!ci || !ci.formulaType) return driver.projectedDelta;

  const before = ci.metricBefore ?? 0;
  const after = ci.metricAfter ?? 0;
  const allocPct = (ci.allocationPct ?? 100) / 100;

  // Directional improvement — clamp negative (worsening) to 0 so a deterioration
  // never produces positive ROI. For metrics where higher = better (wRVU, E/M,
  // CMI, HCC capture) improvement = after - before. For metrics where lower =
  // better (time in notes, work outside hours, denial rate, OT, LOS)
  // improvement = before - after.
  const improvementHigherBetter = Math.max(0, after - before);
  const improvementLowerBetter = Math.max(0, before - after);

  switch (ci.formulaType) {
    case "timeSavingsWorkforce": {
      // (minutesDelta / 60) * hourlyRate * allocationPct
      return (improvementLowerBetter / 60) * (ci.factor1Value ?? 150) * allocPct;
    }
    case "timeSavingsCapacity": {
      // (minutesDelta / 60 / minutesPerVisit) * revenuePerVisit * allocationPct
      const minPerVisit = Math.max(ci.factor1Value ?? 30, 1);
      const revPerVisit = ci.factor2Value ?? 200;
      return (improvementLowerBetter / 60 / minPerVisit) * revPerVisit * allocPct;
    }
    case "workOutsideHoursReduction": {
      // Hours/week reduction → monthly $ per active user.
      // (hrsPerWeekDelta * 52 / 12) * hourlyRate
      return (improvementLowerBetter * 52 / 12) * (ci.factor1Value ?? 150);
    }
    case "wrvuLift":
      return improvementHigherBetter * (ci.factor1Value ?? 33);
    case "emLevelLift":
      return improvementHigherBetter * (ci.factor1Value ?? 15);
    case "cmiLift":
      return improvementHigherBetter * (ci.factor1Value ?? 1500);
    case "retentionLift":
      // 3% lift × replacement cost ÷ 12 (monthly per user); no metric needed.
      return (0.03 * (ci.factor1Value ?? 150_000)) / 12;
    case "hccCapture":
      return (improvementHigherBetter / 100) * (ci.factor1Value ?? 1200);
    case "denialReduction":
      return (improvementLowerBetter / 100) * (ci.factor1Value ?? 350);
    case "nursingOvertimeReduction":
      return improvementLowerBetter * (ci.factor1Value ?? 50) * 1.5;
    case "losReduction":
      return improvementLowerBetter * (ci.factor1Value ?? 2800);
    default:
      return driver.projectedDelta;
  }
}

export function recalculateAllDrivers(
  drivers: ForecastValueDriver[],
  calibration: ForecastCalibration,
): ForecastValueDriver[] {
  return drivers.map((d) => {
    if (
      !d.clinicalInputs?.formulaType ||
      d.clinicalInputs.formulaType === "customDollar"
    ) {
      return d;
    }
    const updatedCi = { ...d.clinicalInputs };
    switch (d.clinicalInputs.formulaType) {
      case "timeSavingsWorkforce":
      case "workOutsideHoursReduction":
        updatedCi.factor1Value = calibration.otHourlyRate;
        break;
      case "timeSavingsCapacity":
        updatedCi.factor1Value = calibration.minutesPerVisit;
        updatedCi.factor2Value = calibration.revenuePerVisit;
        break;
      case "wrvuLift":
        updatedCi.factor1Value = calibration.wrvuConversionFactor;
        break;
      case "denialReduction":
        updatedCi.factor1Value = calibration.avgClaimValue;
        break;
      case "nursingOvertimeReduction":
        updatedCi.factor1Value = calibration.nursingHourlyRate;
        break;
      case "retentionLift":
        updatedCi.factor1Value = calibration.providerReplacementCost;
        break;
      // emLevelLift, cmiLift, hccCapture, losReduction — driver-specific factors,
      // not surfaced in the global calibration panel.
    }
    const newDelta = recalculateProjectedDelta({ ...d, clinicalInputs: updatedCi });
    return { ...d, clinicalInputs: updatedCi, projectedDelta: newDelta };
  });
}

interface DriverTemplateDef {
  id: string;
  label: string;
  formulaType?: import("./types").DriverClinicalInputs["formulaType"];
  domain: ValueDomain;
  onset: DriverOnset;
  scaling: ScalingUnit;
  defaultLabel: string;
  category: ForecastValueDriver["category"];
  metricLabel?: string;
  metricUnit?: string;
  factor1Label?: string;
  factor1Value?: number;
  factor2Label?: string;
  factor2Value?: number;
  allocationLabel?: string;
  allocationPct?: number;
}

const DRIVER_TEMPLATES: DriverTemplateDef[] = [
  {
    id: "custom",
    label: "Custom (enter dollar value directly)",
    domain: "revenue",
    onset: "delayed",
    scaling: "perEncounter",
    defaultLabel: "",
    category: "documentation",
  },
  {
    id: "timeSavingsWorkforce",
    label: "Time savings → Cost reduction",
    formulaType: "timeSavingsWorkforce",
    domain: "workforce",
    onset: "immediate",
    scaling: "perEncounter",
    defaultLabel: "Time saved on documentation",
    category: "time",
    metricLabel: "Minutes in note",
    metricUnit: "min/encounter",
    factor1Label: "OT hourly rate ($/hr)",
    factor1Value: 150,
    allocationLabel: "Allocated to cost savings",
    allocationPct: 50,
  },
  {
    id: "timeSavingsCapacity",
    label: "Time savings → Patient access",
    formulaType: "timeSavingsCapacity",
    domain: "capacity",
    onset: "delayed",
    scaling: "perEncounter",
    defaultLabel: "Throughput from time saved",
    category: "time",
    metricLabel: "Minutes in note",
    metricUnit: "min/encounter",
    factor1Label: "Minutes per visit",
    factor1Value: 30,
    factor2Label: "Revenue per visit ($)",
    factor2Value: 200,
    allocationLabel: "Allocated to new patient capacity",
    allocationPct: 20,
  },
  {
    id: "wrvuLift",
    label: "wRVU improvement → Revenue",
    formulaType: "wrvuLift",
    domain: "revenue",
    onset: "delayed",
    scaling: "perEncounter",
    defaultLabel: "wRVU lift per encounter",
    category: "documentation",
    metricLabel: "wRVU per encounter",
    metricUnit: "wRVU/encounter",
    factor1Label: "wRVU conversion factor ($/wRVU)",
    factor1Value: 33,
  },
  {
    id: "emLevelLift",
    label: "E/M level improvement → Revenue",
    formulaType: "emLevelLift",
    domain: "revenue",
    onset: "delayed",
    scaling: "perEncounter",
    defaultLabel: "E/M level improvement",
    category: "documentation",
    metricLabel: "E/M level",
    metricUnit: "avg E/M level",
    factor1Label: "Value per E/M level ($)",
    factor1Value: 15,
  },
  {
    id: "cmiLift",
    label: "CMI improvement → Revenue (inpatient)",
    formulaType: "cmiLift",
    domain: "quality",
    onset: "phased",
    scaling: "perEncounter",
    defaultLabel: "CMI improvement",
    category: "documentation",
    metricLabel: "Case-mix index",
    metricUnit: "CMI points",
    factor1Label: "Value per CMI point ($)",
    factor1Value: 1500,
  },
  {
    id: "hccCapture",
    label: "HCC capture rate → Revenue",
    formulaType: "hccCapture",
    domain: "revenue",
    onset: "phased",
    scaling: "perEncounter",
    defaultLabel: "HCC capture improvement",
    category: "documentation",
    metricLabel: "HCC capture rate",
    metricUnit: "%",
    factor1Label: "RAF value ($)",
    factor1Value: 1200,
  },
  {
    id: "denialReduction",
    label: "Denial rate reduction → Revenue",
    formulaType: "denialReduction",
    domain: "revenue",
    onset: "phased",
    scaling: "perEncounter",
    defaultLabel: "Denial rate reduction",
    category: "documentation",
    metricLabel: "Initial denial rate",
    metricUnit: "% denial rate",
    factor1Label: "Avg claim value ($)",
    factor1Value: 350,
  },
  {
    id: "retentionLift",
    label: "Provider retention improvement",
    formulaType: "retentionLift",
    domain: "workforce",
    onset: "longTerm",
    scaling: "perActiveUser",
    defaultLabel: "Provider retention lift",
    category: "retention",
    factor1Label: "Replacement cost per provider ($)",
    factor1Value: 150_000,
  },
  {
    id: "nursingOvertimeReduction",
    label: "Nursing overtime reduction",
    formulaType: "nursingOvertimeReduction",
    domain: "workforce",
    onset: "immediate",
    scaling: "perBed",
    defaultLabel: "Nursing overtime reduction",
    category: "time",
    metricLabel: "Overtime hours per nurse",
    metricUnit: "hrs/month overtime",
    factor1Label: "Nursing hourly rate ($/hr)",
    factor1Value: 50,
  },
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

        {/* Calibration assumptions — cascade to all drivers */}
        <CalibrationPanel state={state} updateState={updateState} />

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

            {/* Clinical inputs — shown when driver has formula-based inputs */}
            {d.clinicalInputs?.formulaType &&
              d.clinicalInputs.formulaType !== "customDollar" && (
                <div
                  className="mt-3 pt-3 border-t border-[#E8E2DA]"
                  data-testid={`clinical-inputs-${d.id}`}
                >
                  <p className="text-[10px] uppercase tracking-widest text-[#999999] font-semibold mb-2">
                    Adjust Inputs · recalculates live
                  </p>
                  <div className="space-y-2">
                    {d.clinicalInputs.metricLabel && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-500 w-32 flex-shrink-0">
                          {d.clinicalInputs.metricLabel} (before)
                        </span>
                        <FormattedNumberInput
                          data-testid={`input-ci-before-${d.id}`}
                          value={d.clinicalInputs.metricBefore ?? ""}
                          onChange={(v) => {
                            const newCi = { ...d.clinicalInputs!, metricBefore: v };
                            updateDriver(d.id, {
                              clinicalInputs: newCi,
                              projectedDelta: recalculateProjectedDelta({
                                ...d,
                                clinicalInputs: newCi,
                              }),
                            });
                          }}
                          step={0.01}
                          className="h-7 text-xs w-24 bg-white border-[#E8E2DA]"
                        />
                        <span className="text-[11px] text-neutral-400">
                          {d.clinicalInputs.metricUnit}
                        </span>
                      </div>
                    )}
                    {d.clinicalInputs.metricLabel && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-500 w-32 flex-shrink-0">
                          {d.clinicalInputs.metricLabel} (after)
                        </span>
                        <FormattedNumberInput
                          data-testid={`input-ci-after-${d.id}`}
                          value={d.clinicalInputs.metricAfter ?? ""}
                          onChange={(v) => {
                            const newCi = { ...d.clinicalInputs!, metricAfter: v };
                            updateDriver(d.id, {
                              clinicalInputs: newCi,
                              projectedDelta: recalculateProjectedDelta({
                                ...d,
                                clinicalInputs: newCi,
                              }),
                            });
                          }}
                          step={0.01}
                          className="h-7 text-xs w-24 bg-white border-[#E8E2DA]"
                        />
                        <span className="text-[11px] text-neutral-400">
                          {d.clinicalInputs.metricUnit}
                        </span>
                      </div>
                    )}
                    {d.clinicalInputs.factor1Label && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-500 w-32 flex-shrink-0">
                          {d.clinicalInputs.factor1Label}
                        </span>
                        <FormattedNumberInput
                          data-testid={`input-ci-factor1-${d.id}`}
                          value={d.clinicalInputs.factor1Value ?? ""}
                          onChange={(v) => {
                            const newCi = { ...d.clinicalInputs!, factor1Value: v };
                            updateDriver(d.id, {
                              clinicalInputs: newCi,
                              projectedDelta: recalculateProjectedDelta({
                                ...d,
                                clinicalInputs: newCi,
                              }),
                            });
                          }}
                          step={0.01}
                          className="h-7 text-xs w-24 bg-white border-[#E8E2DA]"
                        />
                      </div>
                    )}
                    {d.clinicalInputs.factor2Label && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-500 w-32 flex-shrink-0">
                          {d.clinicalInputs.factor2Label}
                        </span>
                        <FormattedNumberInput
                          data-testid={`input-ci-factor2-${d.id}`}
                          value={d.clinicalInputs.factor2Value ?? ""}
                          onChange={(v) => {
                            const newCi = { ...d.clinicalInputs!, factor2Value: v };
                            updateDriver(d.id, {
                              clinicalInputs: newCi,
                              projectedDelta: recalculateProjectedDelta({
                                ...d,
                                clinicalInputs: newCi,
                              }),
                            });
                          }}
                          step={0.01}
                          className="h-7 text-xs w-24 bg-white border-[#E8E2DA]"
                        />
                      </div>
                    )}
                    {d.clinicalInputs.allocationLabel && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-500 w-32 flex-shrink-0">
                          {d.clinicalInputs.allocationLabel}
                        </span>
                        <FormattedNumberInput
                          data-testid={`input-ci-alloc-${d.id}`}
                          value={d.clinicalInputs.allocationPct ?? ""}
                          onChange={(v) => {
                            const newCi = {
                              ...d.clinicalInputs!,
                              allocationPct: Math.min(100, Math.max(0, v)),
                            };
                            updateDriver(d.id, {
                              clinicalInputs: newCi,
                              projectedDelta: recalculateProjectedDelta({
                                ...d,
                                clinicalInputs: newCi,
                              }),
                            });
                          }}
                          step={1}
                          className="h-7 text-xs w-24 bg-white border-[#E8E2DA]"
                        />
                        <span className="text-[11px] text-neutral-400">%</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#E8E2DA]">
                      <p className="text-[11px] text-neutral-500">
                        Calculated value:{" "}
                        <span
                          className="font-semibold text-[#EA2C00]"
                          data-testid={`text-ci-calc-${d.id}`}
                        >
                          {fmtCurrencyShort(recalculateProjectedDelta(d))} /{" "}
                          {SCALING_UNIT_LABELS[d.scalingUnit]}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
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

function CalibrationPanel({
  state,
  updateState,
}: {
  state: ForecastState;
  updateState: (u: Partial<ForecastState>) => void;
}) {
  const [open, setOpen] = useState(false);
  const cal = state.calibration;

  const updateCal = (patch: Partial<ForecastCalibration>) => {
    const next = { ...cal, ...patch };
    const recalcedDrivers = recalculateAllDrivers(state.valueDrivers, next);
    updateState({ calibration: next, valueDrivers: recalcedDrivers });
  };

  return (
    <div
      className={`${CARD_BG} ${CARD_BORDER} rounded-xl mb-8`}
      data-testid="section-calibration"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        data-testid="btn-calibration-toggle"
      >
        <div className="flex items-center gap-2.5">
          <Settings className="w-3.5 h-3.5 text-[#888888]" />
          <span className="text-[11px] uppercase tracking-[2px] text-[#666666] font-semibold">
            Calibration Assumptions
          </span>
          <span className="text-[10px] text-neutral-400 normal-case tracking-normal">
            · changes cascade to all drivers
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#E8E2DA] pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CalField
              label="OT hourly rate"
              unit="$/hr"
              value={cal.otHourlyRate}
              onChange={(v) => updateCal({ otHourlyRate: v })}
              tooltip="Used to value time savings allocated to workforce cost reduction"
              testId="cal-ot-hourly-rate"
            />
            <CalField
              label="wRVU conversion"
              unit="$/wRVU"
              value={cal.wrvuConversionFactor}
              onChange={(v) => updateCal({ wrvuConversionFactor: v })}
              tooltip="Physician fee schedule conversion factor. CMS default ~$33"
              testId="cal-wrvu-conversion"
            />
            <CalField
              label="Revenue per visit"
              unit="$/visit"
              value={cal.revenuePerVisit}
              onChange={(v) => updateCal({ revenuePerVisit: v })}
              tooltip="Average revenue per incremental patient visit (used for capacity drivers)"
              testId="cal-revenue-per-visit"
            />
            <CalField
              label="Avg visit length"
              unit="min"
              value={cal.minutesPerVisit}
              onChange={(v) => updateCal({ minutesPerVisit: v })}
              tooltip="Average appointment length — determines how many extra visits freed time creates"
              testId="cal-minutes-per-visit"
            />
            <CalField
              label="Avg claim value"
              unit="$"
              value={cal.avgClaimValue}
              onChange={(v) => updateCal({ avgClaimValue: v })}
              tooltip="Average net claim value — used to calculate denial reduction impact"
              testId="cal-avg-claim-value"
            />
            <CalField
              label="Nursing hourly rate"
              unit="$/hr"
              value={cal.nursingHourlyRate}
              onChange={(v) => updateCal({ nursingHourlyRate: v })}
              tooltip="Nursing hourly rate used for overtime reduction calculations"
              testId="cal-nursing-hourly-rate"
            />
            <CalField
              label="Provider replacement cost"
              unit="$"
              value={cal.providerReplacementCost}
              onChange={(v) => updateCal({ providerReplacementCost: v })}
              tooltip="Fully loaded cost to recruit and onboard a replacement physician (~$150K–$300K)"
              testId="cal-provider-replacement-cost"
            />
          </div>
          <p className="text-[10px] text-neutral-400 mt-4">
            These are shared assumptions. Individual drivers can be fine-tuned by expanding them below.
          </p>
        </div>
      )}
    </div>
  );
}

function CalField({
  label,
  unit,
  value,
  onChange,
  tooltip,
  testId,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  tooltip: string;
  testId: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-medium">
          {label}
        </label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-neutral-300 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-1.5">
        <FormattedNumberInput
          value={value}
          onChange={onChange}
          className="h-8 text-xs"
          data-testid={`input-${testId}`}
        />
        <span className="text-[11px] text-neutral-400 flex-shrink-0">{unit}</span>
      </div>
    </div>
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
  const [templateId, setTemplateId] = useState<string>("custom");
  const template = useMemo(
    () => DRIVER_TEMPLATES.find((t) => t.id === templateId) ?? DRIVER_TEMPLATES[0],
    [templateId],
  );
  const isCustom = templateId === "custom";

  const [label, setLabel] = useState("");
  const [domain, setDomain] = useState<ValueDomain>("revenue");
  const [onset, setOnset] = useState<DriverOnset>("delayed");
  const [scalingUnit, setScalingUnit] = useState<ScalingUnit>("perEncounter");
  // Custom-only fields
  const [baselineValue, setBaselineValue] = useState(0);
  const [measuredValue, setMeasuredValue] = useState(0);
  const [conversionFactor, setConversionFactor] = useState(0);
  const [unitLabel, setUnitLabel] = useState("");
  // Formula-based fields
  const [metricBefore, setMetricBefore] = useState<number>(0);
  const [metricAfter, setMetricAfter] = useState<number>(0);
  const [factor1Value, setFactor1Value] = useState<number>(0);
  const [factor2Value, setFactor2Value] = useState<number>(0);
  const [allocationPct, setAllocationPct] = useState<number>(100);
  // Common
  const [attribution, setAttribution] = useState(62);
  const [realization, setRealization] = useState(80);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = DRIVER_TEMPLATES.find((x) => x.id === id) ?? DRIVER_TEMPLATES[0];
    setLabel(t.defaultLabel);
    setDomain(t.domain);
    setOnset(t.onset);
    setScalingUnit(t.scaling);
    setMetricBefore(0);
    setMetricAfter(0);
    setFactor1Value(t.factor1Value ?? 0);
    setFactor2Value(t.factor2Value ?? 0);
    setAllocationPct(t.allocationPct ?? 100);
    if (id === "custom") {
      setBaselineValue(0);
      setMeasuredValue(0);
      setConversionFactor(0);
      setUnitLabel("");
    }
  };

  // Live preview for formula-based templates
  const previewClinical = useMemo<import("./types").DriverClinicalInputs | undefined>(() => {
    if (isCustom || !template.formulaType) return undefined;
    return {
      metricBefore,
      metricAfter,
      metricUnit: template.metricUnit,
      metricLabel: template.metricLabel,
      factor1Value,
      factor1Label: template.factor1Label,
      factor2Value: template.factor2Label ? factor2Value : undefined,
      factor2Label: template.factor2Label,
      allocationPct: template.allocationLabel ? allocationPct : undefined,
      allocationLabel: template.allocationLabel,
      formulaType: template.formulaType,
    };
  }, [isCustom, template, metricBefore, metricAfter, factor1Value, factor2Value, allocationPct]);

  const previewProjected = useMemo(() => {
    if (isCustom) return Math.abs((measuredValue - baselineValue) * conversionFactor);
    if (!previewClinical) return 0;
    return recalculateProjectedDelta({
      id: "preview",
      label: "preview",
      domain,
      category: template.category,
      scalingUnit,
      projectedDelta: 0,
      confidence: attribution,
      realizationPct: realization,
      onset,
      clinicalInputs: previewClinical,
    });
  }, [
    isCustom,
    measuredValue,
    baselineValue,
    conversionFactor,
    previewClinical,
    domain,
    template.category,
    scalingUnit,
    attribution,
    realization,
    onset,
  ]);

  const canSave = isCustom
    ? label.trim().length > 0 &&
      conversionFactor > 0 &&
      Math.abs(measuredValue - baselineValue) > 0
    : label.trim().length > 0 && previewProjected > 0;

  const fmtPreview = (n: number) => {
    if (!Number.isFinite(n) || n === 0) return "—";
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  const resetForm = () => {
    setTemplateId("custom");
    setLabel("");
    setBaselineValue(0);
    setMeasuredValue(0);
    setConversionFactor(0);
    setUnitLabel("");
    setMetricBefore(0);
    setMetricAfter(0);
    setFactor1Value(0);
    setFactor2Value(0);
    setAllocationPct(100);
  };

  const handleSave = () => {
    if (!canSave) return;
    if (isCustom) {
      const delta = measuredValue - baselineValue;
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
        projectedDelta: Math.abs(delta * conversionFactor),
        confidence: attribution,
        realizationPct: realization,
        onset,
        source: "manual",
      });
    } else {
      onSave({
        id: `drv-${Date.now().toString(36)}`,
        label: label.trim() || template.defaultLabel,
        domain,
        category: template.category,
        scalingUnit,
        baselineValue: metricBefore,
        measuredValue: metricAfter,
        unitLabel: template.metricUnit,
        projectedDelta: previewProjected,
        confidence: attribution,
        realizationPct: realization,
        onset,
        source: "manual",
        clinicalInputs: previewClinical,
      });
    }
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md max-h-[85vh] overflow-y-auto"
        data-testid="dialog-add-driver"
      >
        <DialogHeader>
          <DialogTitle>Add value driver</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide">Template</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger
                className="h-8 text-xs"
                data-testid="select-driver-template"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DRIVER_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id} data-testid={`option-template-${t.id}`}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isCustom && (
              <p className="text-[10px] text-neutral-500">
                Inputs auto-calculate the dollar value using the {template.label.toLowerCase()} formula.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide">Driver name</Label>
            <Input
              data-testid="input-new-driver-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={template.defaultLabel || "e.g. wRVU per encounter"}
              autoFocus
            />
          </div>

          {isCustom ? (
            <div className="rounded-md bg-[#FAF8F5] border border-[#E8E2DA] p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#EA2C00]">
                Partner&apos;s measured data
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                    Before Abridge
                  </Label>
                  <FormattedNumberInput
                    data-testid="input-baseline"
                    value={baselineValue || ""}
                    onChange={setBaselineValue}
                    step={0.01}
                    placeholder="0.00"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                    After Abridge
                  </Label>
                  <FormattedNumberInput
                    data-testid="input-measured"
                    value={measuredValue || ""}
                    onChange={setMeasuredValue}
                    step={0.01}
                    placeholder="0.00"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                    Conversion factor ($/unit)
                  </Label>
                  <FormattedNumberInput
                    data-testid="input-conversion"
                    value={conversionFactor || ""}
                    onChange={setConversionFactor}
                    step={0.01}
                    placeholder="e.g. 33 for $/wRVU"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                    Unit label
                  </Label>
                  <Input
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    placeholder="e.g. wRVU/enc"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              {Math.abs(measuredValue - baselineValue) > 0 && conversionFactor > 0 && (
                <div className="rounded border border-[#E8E2DA] bg-white px-3 py-2">
                  <p className="text-[11px] text-neutral-500">
                    Δ {(measuredValue - baselineValue) >= 0 ? "+" : ""}
                    {(measuredValue - baselineValue).toFixed(2)} {unitLabel} × $
                    {conversionFactor.toFixed(2)} ={" "}
                    <span className="font-bold text-[#EA2C00]">
                      {fmtPreview(previewProjected)}
                    </span>{" "}
                    per {SCALING_UNIT_LABELS[scalingUnit]}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md bg-[#FAF8F5] border border-[#E8E2DA] p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#EA2C00]">
                Clinical inputs
              </p>
              {template.metricLabel && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                        {template.metricLabel} (before)
                      </Label>
                      <FormattedNumberInput
                        data-testid="input-template-before"
                        value={metricBefore || ""}
                        onChange={setMetricBefore}
                        step={0.01}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                        {template.metricLabel} (after)
                      </Label>
                      <FormattedNumberInput
                        data-testid="input-template-after"
                        value={metricAfter || ""}
                        onChange={setMetricAfter}
                        step={0.01}
                        placeholder="0.00"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  {template.metricUnit && (
                    <p className="text-[10px] text-neutral-400">Units: {template.metricUnit}</p>
                  )}
                </>
              )}
              {template.factor1Label && (
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                    {template.factor1Label}
                  </Label>
                  <FormattedNumberInput
                    data-testid="input-template-factor1"
                    value={factor1Value || ""}
                    onChange={setFactor1Value}
                    step={0.01}
                    className="h-8 text-sm"
                  />
                </div>
              )}
              {template.factor2Label && (
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                    {template.factor2Label}
                  </Label>
                  <FormattedNumberInput
                    data-testid="input-template-factor2"
                    value={factor2Value || ""}
                    onChange={setFactor2Value}
                    step={0.01}
                    className="h-8 text-sm"
                  />
                </div>
              )}
              {template.allocationLabel && (
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                    {template.allocationLabel} (%)
                  </Label>
                  <FormattedNumberInput
                    data-testid="input-template-allocation"
                    value={allocationPct || ""}
                    onChange={(v) => setAllocationPct(Math.min(100, Math.max(0, v)))}
                    step={1}
                    className="h-8 text-sm"
                  />
                </div>
              )}
              {previewProjected > 0 && (
                <div className="rounded border border-[#E8E2DA] bg-white px-3 py-2">
                  <p className="text-[11px] text-neutral-500">
                    Calculated value:{" "}
                    <span className="font-bold text-[#EA2C00]">
                      {fmtPreview(previewProjected)}
                    </span>{" "}
                    per {SCALING_UNIT_LABELS[scalingUnit]}
                  </p>
                </div>
              )}
            </div>
          )}

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
