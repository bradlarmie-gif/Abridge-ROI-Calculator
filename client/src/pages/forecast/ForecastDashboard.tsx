import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
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
  X,
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
  type ForecastState,
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
  type ForecastNarrative,
  generateCalibrationChangeSentence,
  generateForecastNarrative,
} from "@/lib/forecastNarrative";
import {
  DOMAIN_BADGE_CLASS,
  ONSET_LABELS,
  SCALING_UNIT_LABELS,
  confidenceLabelFor,
} from "./dashboard/constants";
import {
  FORECAST_DRIVER_CATALOG_IDS,
  resolveForecastDriver,
} from "@/lib/forecastDriverCatalog";

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
  /** exploreDrivers catalog id — the driver's display name/copy comes from there. Absent when no catalog entry fits. */
  catalogId?: string;
  formulaType?: import("./types").DriverClinicalInputs["formulaType"];
  domain: ValueDomain;
  onset: DriverOnset;
  scaling: ScalingUnit;
  /** Fallback driver name for templates with no catalogId; catalog-mapped templates take their name from the catalog. */
  defaultLabel?: string;
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
    catalogId: FORECAST_DRIVER_CATALOG_IDS.timeSavingsCapacity,
    formulaType: "timeSavingsCapacity",
    domain: "capacity",
    onset: "delayed",
    scaling: "perEncounter",
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
    catalogId: FORECAST_DRIVER_CATALOG_IDS.wrvuLift,
    formulaType: "wrvuLift",
    domain: "revenue",
    onset: "delayed",
    scaling: "perEncounter",
    category: "documentation",
    metricLabel: "wRVU per encounter",
    metricUnit: "wRVU/encounter",
    factor1Label: "wRVU conversion factor ($/wRVU)",
    factor1Value: 33,
  },
  {
    id: "emLevelLift",
    label: "E/M level improvement → Revenue",
    catalogId: FORECAST_DRIVER_CATALOG_IDS.emLevelLift,
    formulaType: "emLevelLift",
    domain: "revenue",
    onset: "delayed",
    scaling: "perEncounter",
    category: "documentation",
    metricLabel: "E/M level",
    metricUnit: "avg E/M level",
    factor1Label: "Value per E/M level ($)",
    factor1Value: 15,
  },
  {
    id: "cmiLift",
    label: "CMI improvement → Revenue (inpatient)",
    catalogId: FORECAST_DRIVER_CATALOG_IDS.cmiLift,
    formulaType: "cmiLift",
    domain: "quality",
    onset: "phased",
    scaling: "perEncounter",
    category: "documentation",
    metricLabel: "Case-mix index",
    metricUnit: "CMI points",
    factor1Label: "Value per CMI point ($)",
    factor1Value: 1500,
  },
  {
    id: "hccCapture",
    label: "HCC capture rate → Revenue",
    catalogId: FORECAST_DRIVER_CATALOG_IDS.hccCapture,
    formulaType: "hccCapture",
    domain: "revenue",
    onset: "phased",
    scaling: "perEncounter",
    category: "documentation",
    metricLabel: "HCC capture rate",
    metricUnit: "%",
    factor1Label: "RAF value ($)",
    factor1Value: 1200,
  },
  {
    id: "denialReduction",
    label: "Denial rate reduction → Revenue",
    catalogId: FORECAST_DRIVER_CATALOG_IDS.denialReduction,
    formulaType: "denialReduction",
    domain: "revenue",
    onset: "phased",
    scaling: "perEncounter",
    category: "documentation",
    metricLabel: "Initial denial rate",
    metricUnit: "% denial rate",
    factor1Label: "Avg claim value ($)",
    factor1Value: 350,
  },
  {
    id: "retentionLift",
    label: "Provider retention improvement",
    catalogId: FORECAST_DRIVER_CATALOG_IDS.retentionLift,
    formulaType: "retentionLift",
    domain: "workforce",
    onset: "longTerm",
    scaling: "perActiveUser",
    category: "retention",
    factor1Label: "Replacement cost per provider ($)",
    factor1Value: 150_000,
  },
  {
    id: "nursingOvertimeReduction",
    label: "Nursing overtime reduction",
    catalogId: FORECAST_DRIVER_CATALOG_IDS.nursingOvertimeReduction,
    formulaType: "nursingOvertimeReduction",
    domain: "workforce",
    onset: "immediate",
    scaling: "perBed",
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
  const narrative = useMemo(
    () => generateForecastNarrative(state, result),
    [state, result],
  );

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
        <NarrativeBar narrative={narrative} hasDrivers={state.valueDrivers.length > 0} />
        <HeroROI result={result} state={state} />

        {/* Measured Outcomes (only when imported from Measure) */}
        <MeasuredOutcomesPanel state={state} />

        {/* Unified scenario comparison (replaces saved scenarios + pricing comparison) */}
        <ScenarioComparison
          state={state}
          updateState={updateState}
          currentResult={result}
        />

        {/* Calibration assumptions — cascade to all drivers */}
        <CalibrationPanel state={state} updateState={updateState} result={result} />

        {/* Value Drivers */}
        <ValueDriversBlock state={state} updateState={updateState} narrative={narrative} />

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

        <BottomLinePanel narrative={narrative} />

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
      className="rounded-2xl text-white p-6 md:p-8 mb-8 relative overflow-hidden"
      style={{ background: "linear-gradient(155deg, #211E1B 0%, #131110 100%)" }}
      data-testid="section-hero-roi"
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: ACCENT }} />

      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
        <p className="text-[10px] uppercase tracking-[2.5px] text-white/45 font-semibold">
          Forecast Summary
        </p>
      </div>
      <p className="text-4xl md:text-[52px] leading-none font-bold font-abridge mb-3 tabular-nums" data-testid="text-hero-tcv">
        {fmtCurrencyShort(tcv)}
      </p>
      <p className="text-sm text-white/60 mb-7">
        modeled total contract value at <span className="font-semibold" style={{ color: ACCENT }}>{pricingLabel}</span>
      </p>

      <div className="flex pt-6 border-t border-white/10">
        <div className="flex-1 pr-4">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1.5">Net Value</p>
          <p
            className="text-xl md:text-2xl font-bold font-abridge tabular-nums"
            style={{ color: hasDrivers && ncv < 0 ? "#FF6B6B" : ACCENT }}
            data-testid="text-hero-ncv"
          >
            {ncvDisplay}
          </p>
        </div>
        <div className="flex-1 px-4 border-l border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1.5">ROI Multiple</p>
          <p
            className="text-xl md:text-2xl font-bold font-abridge tabular-nums"
            style={{ color: ACCENT }}
            data-testid="text-hero-roi"
          >
            {roiDisplay}
          </p>
        </div>
        <div className="flex-1 pl-4 border-l border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-1.5">Break-Even</p>
          <p className="text-xl md:text-2xl font-bold font-abridge text-white tabular-nums" data-testid="text-hero-be">
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

function NarrativeBar({
  narrative,
  hasDrivers,
}: {
  narrative: ForecastNarrative;
  hasDrivers: boolean;
}) {
  if (!hasDrivers) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#E8E2DA] rounded-xl px-5 py-4 mb-4 flex items-start gap-3"
      style={{ borderLeft: "3px solid #EA2C00" }}
      data-testid="narrative-bar"
    >
      <TrendingUp className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-0.5" />
      <p className="text-sm leading-relaxed text-[#1A1A1A]">{narrative.heroSummary}</p>
    </motion.div>
  );
}

function BottomLinePanel({ narrative }: { narrative: ForecastNarrative }) {
  if (!narrative.heroSummary || narrative.heroSummary.includes("Add value")) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border-2 border-[#EA2C00]/20 bg-white p-6 mb-8"
      data-testid="section-bottom-line"
    >
      <p className="text-[11px] uppercase tracking-[2px] text-[#EA2C00] font-semibold mb-3">
        Executive Summary · Ready to share
      </p>
      <p className="text-sm text-[#1A1A1A] leading-relaxed mb-4">{narrative.heroSummary}</p>
      <p className="text-sm text-[#444444] leading-relaxed mb-4">
        {narrative.breakEvenInsight}
      </p>
      <div className="border-t border-neutral-100 pt-4">
        <p className="text-[11px] uppercase tracking-wide text-[#888888] font-semibold mb-2">
          Recommended next lever
        </p>
        <p className="text-sm text-[#444444] leading-relaxed">
          {narrative.topLeverRecommendation}
        </p>
      </div>
    </motion.section>
  );
}

function ValueDriversBlock({
  state,
  updateState,
  narrative,
}: {
  state: ForecastState;
  updateState: (u: Partial<ForecastState>) => void;
  narrative: ForecastNarrative;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preset, setPreset] = useState<PresetId>("standard");
  const [fineTuneOpen, setFineTuneOpen] = useState<Record<string, boolean>>({});

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

            {narrative.driverInsights[d.id] && (
              <p
                className="text-[11px] text-[#666666] italic leading-snug bg-white/60 rounded px-3 py-2 mb-3"
                data-testid={`text-driver-insight-${d.id}`}
              >
                {narrative.driverInsights[d.id]}
              </p>
            )}

            <div className="mb-3">
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

            {/* Fine-tune — set-once config tucked away to keep the card focused on the story */}
            <div className="mt-3 pt-3 border-t border-[#E8E2DA]">
              <button
                type="button"
                onClick={() => setFineTuneOpen((s) => ({ ...s, [d.id]: !s[d.id] }))}
                className="flex items-center gap-1.5 text-[11px] font-medium text-[#9E948C] hover:text-[#525252] transition-colors"
                data-testid={`toggle-finetune-${d.id}`}
              >
                <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${fineTuneOpen[d.id] ? "rotate-0" : "-rotate-90"}`} />
                {fineTuneOpen[d.id] ? "Hide fine-tune" : "Fine-tune · onset & scaling"}
              </button>
              <AnimatePresence initial={false}>
                {fineTuneOpen[d.id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wide text-[#666666]">Onset</Label>
                        <Select value={d.onset} onValueChange={(v) => updateDriver(d.id, { onset: v as DriverOnset })}>
                          <SelectTrigger className="text-xs h-9 bg-white border-[#E8E2DA]" data-testid={`select-onset-${d.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ONSET_VALUES.map((o) => (
                              <SelectItem key={o} value={o}>{ONSET_LABELS[o]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wide text-[#666666]">Scaling</Label>
                        <Select value={d.scalingUnit} onValueChange={(v) => updateDriver(d.id, { scalingUnit: v as ScalingUnit })}>
                          <SelectTrigger className="text-xs h-9 bg-white border-[#E8E2DA]" data-testid={`select-scaling-${d.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCALING_VALUES.map((s) => (
                              <SelectItem key={s} value={s}>{SCALING_UNIT_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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

function CalibrationPanel({
  state,
  updateState,
  result,
}: {
  state: ForecastState;
  updateState: (u: Partial<ForecastState>) => void;
  result: ForecastResult;
}) {
  const [open, setOpen] = useState(false);
  const [lastChange, setLastChange] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const cal = state.calibration;

  useEffect(
    () => () => {
      if (toastTimerRef.current != null) {
        window.clearTimeout(toastTimerRef.current);
      }
    },
    [],
  );

  const updateCal = (patch: Partial<ForecastCalibration>) => {
    const next = { ...cal, ...patch };
    const recalcedDrivers = recalculateAllDrivers(state.valueDrivers, next);
    const oldNet = result.kpis.netContractValue;
    const nextState: ForecastState = {
      ...state,
      calibration: next,
      valueDrivers: recalcedDrivers,
    };
    const newNet = calculateForecast(nextState).kpis.netContractValue;
    updateState({ calibration: next, valueDrivers: recalcedDrivers });

    const [field, newVal] = Object.entries(patch)[0] as [
      keyof ForecastCalibration,
      number,
    ];
    const oldVal = cal[field];
    setLastChange(
      generateCalibrationChangeSentence(field, oldVal, newVal, newNet - oldNet),
    );
    if (toastTimerRef.current != null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setLastChange(null);
      toastTimerRef.current = null;
    }, 4000);
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
          <AnimatePresence>
            {lastChange && (
              <motion.p
                key={lastChange}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-[#EA2C00] mt-3"
                data-testid="text-calibration-change"
              >
                {lastChange}
              </motion.p>
            )}
          </AnimatePresence>
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
  // Driver name and copy come from the shared exploreDrivers catalog by catalogId.
  const resolvedTemplate = useMemo(() => resolveForecastDriver(template), [template]);
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
    setLabel(resolveForecastDriver(t).label);
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
        label: label.trim() || resolvedTemplate.label,
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
              placeholder={resolvedTemplate.label || "e.g. wRVU per encounter"}
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
// Scenario Comparison — unified "what if we changed the deal?"
// Replaces the legacy PricingComparisonBlock + ScenariosStrip.
// ────────────────────────────────────────────────────────────
interface ComparisonColumn {
  id: string;
  label: string;
  pricing: PricingConfig;
  adoptionMultiplier: 0.8 | 1.0 | 1.2;
}

const ADOPTION_PACES: { value: 0.8 | 1.0 | 1.2; label: string; emoji: string }[] = [
  { value: 0.8, label: "Slower", emoji: "🐢" },
  { value: 1.0, label: "Current", emoji: "→" },
  { value: 1.2, label: "Faster", emoji: "🚀" },
];

function clonePricing(p: PricingConfig): PricingConfig {
  return { ...p, yearlyEscalators: [...(p.yearlyEscalators ?? [])] };
}

function buildAltState(base: ForecastState, alt: ComparisonColumn): ForecastState {
  const adoptionCurve = {
    ...base.adoptionCurve,
    startPct: Math.min(95, base.adoptionCurve.startPct * alt.adoptionMultiplier),
    endPct: Math.min(98, base.adoptionCurve.endPct * alt.adoptionMultiplier),
  };
  return {
    ...base,
    currentPricing: alt.pricing,
    adoptionCurve,
  };
}

function formatPricingHeadline(p: PricingConfig): string {
  const u = `$${p.unitPrice.toLocaleString()}`;
  switch (p.model) {
    case "perProvider": return `${u} / provider / mo`;
    case "perStaffedBed": return `${u} / bed / mo`;
    case "annualFlat": return `${u} / year`;
    case "perEncounter": return `${u} / encounter`;
    case "hybrid": return `${u} / unit`;
  }
}

function unitSuffix(model: PricingModel): string {
  switch (model) {
    case "perProvider": return "/prov-mo";
    case "perStaffedBed": return "/bed-mo";
    case "annualFlat": return "/year";
    case "perEncounter": return "/enc";
    case "hybrid": return "/unit";
  }
}

function ScenarioComparison({
  state,
  updateState,
  currentResult,
}: {
  state: ForecastState;
  updateState: (u: Partial<ForecastState>) => void;
  currentResult: ForecastResult;
}) {
  const [alternatives, setAlternatives] = useState<ComparisonColumn[]>(() =>
    state.comparisonPricing.slice(0, 3).map((c) => ({
      id: c.id,
      label: c.label || `Alternative`,
      pricing: clonePricing(c.pricing),
      adoptionMultiplier: 1.0 as const,
    })),
  );

  // Track the comparisonPricing snapshot we last wrote so we can detect
  // external mutations (e.g. AlertsZone.applySwap) and re-hydrate.
  const lastMirrorRef = useRef<ComparisonPricing[]>(
    alternatives.map((a) => ({ id: a.id, label: a.label, pricing: a.pricing })),
  );

  useEffect(() => {
    const incoming = state.comparisonPricing;
    const mine = lastMirrorRef.current;
    const sameIds =
      incoming.length === mine.length &&
      incoming.every((c, i) => c.id === mine[i]?.id && c.pricing === mine[i]?.pricing);
    if (sameIds) return;
    // External change — rehydrate local alternatives, defaulting adoption to 1.0
    const next: ComparisonColumn[] = incoming.slice(0, 3).map((c) => ({
      id: c.id,
      label: c.label || "Alternative",
      pricing: clonePricing(c.pricing),
      adoptionMultiplier: 1.0,
    }));
    lastMirrorRef.current = next.map((a) => ({ id: a.id, label: a.label, pricing: a.pricing }));
    setAlternatives(next);
  }, [state.comparisonPricing]);

  const syncToState = useCallback(
    (next: ComparisonColumn[]) => {
      setAlternatives(next);
      const mirror: ComparisonPricing[] = next.map((a) => ({
        id: a.id,
        label: a.label,
        pricing: clonePricing(a.pricing),
      }));
      lastMirrorRef.current = mirror;
      updateState({ comparisonPricing: mirror });
    },
    [updateState],
  );

  const updateAlt = (id: string, patch: Partial<ComparisonColumn>) => {
    syncToState(alternatives.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const removeAlt = (id: string) => {
    syncToState(alternatives.filter((a) => a.id !== id));
  };

  const addAlternative = () => {
    if (alternatives.length >= 3) return;
    const next: ComparisonColumn = {
      id: `alt-${Date.now().toString(36)}`,
      label: `Alternative ${alternatives.length + 1}`,
      pricing: clonePricing(state.currentPricing),
      adoptionMultiplier: 1.0,
    };
    syncToState([...alternatives, next]);
  };

  const altResults = useMemo(
    () =>
      alternatives.map((alt) => ({
        id: alt.id,
        result: calculateForecast(buildAltState(state, alt)),
      })),
    [alternatives, state],
  );

  const winnerId = useMemo(() => {
    if (!altResults.length) return null;
    const best = altResults.reduce((acc, r) =>
      r.result.kpis.netContractValue > acc.result.kpis.netContractValue ? r : acc,
    );
    return best.result.kpis.netContractValue > currentResult.kpis.netContractValue
      ? best.id
      : null;
  }, [altResults, currentResult]);

  const applyAlternative = (alt: ComparisonColumn) => {
    const remaining = alternatives.filter((a) => a.id !== alt.id);
    setAlternatives(remaining);
    updateState({
      currentPricing: clonePricing(alt.pricing),
      comparisonPricing: remaining.map((a) => ({
        id: a.id,
        label: a.label,
        pricing: clonePricing(a.pricing),
      })),
    });
  };

  const totalCols = 1 + alternatives.length;
  const desktopGrid =
    totalCols === 1 ? "md:grid-cols-1" : totalCols === 2 ? "md:grid-cols-2" : totalCols === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  const currentColumn = (
    <CurrentColumn pricing={state.currentPricing} result={currentResult} />
  );

  const altColumns = alternatives.map((alt) => {
    const altResult = altResults.find((r) => r.id === alt.id)?.result ?? currentResult;
    return (
      <AlternativeColumn
        key={alt.id}
        alt={alt}
        altResult={altResult}
        baseline={currentResult}
        isWinner={winnerId === alt.id}
        onUpdate={(patch) => updateAlt(alt.id, patch)}
        onRemove={() => removeAlt(alt.id)}
        onApply={() => applyAlternative(alt)}
      />
    );
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="mb-8"
      data-testid="section-scenario-comparison"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[11px] uppercase tracking-[2px] text-[#666666] font-semibold">
            What If We Changed The Deal?
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Model alternate structures side by side. Changes show delta vs current.
          </p>
        </div>
      </div>

      {/* Desktop: equal-width grid */}
      <div className={`hidden md:grid ${desktopGrid} gap-3`}>
        {currentColumn}
        {altColumns}
      </div>

      {/* Mobile: horizontal scroll-snap, 85vw cards */}
      <div className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4">
        <div className="snap-start flex-shrink-0 w-[85vw]">{currentColumn}</div>
        {alternatives.map((alt) => {
          const altResult = altResults.find((r) => r.id === alt.id)?.result ?? currentResult;
          return (
            <div key={alt.id} className="snap-start flex-shrink-0 w-[85vw]">
              <AlternativeColumn
                alt={alt}
                altResult={altResult}
                baseline={currentResult}
                isWinner={winnerId === alt.id}
                onUpdate={(patch) => updateAlt(alt.id, patch)}
                onRemove={() => removeAlt(alt.id)}
                onApply={() => applyAlternative(alt)}
              />
            </div>
          );
        })}
      </div>

      {alternatives.length < 3 && (
        <button
          type="button"
          onClick={addAlternative}
          data-testid="btn-add-alternative"
          className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-[#E8E2DA] text-sm text-neutral-400 hover:border-[#EA2C00] hover:text-[#EA2C00] transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add alternative deal structure
        </button>
      )}
    </motion.section>
  );
}

function CurrentColumn({
  pricing,
  result,
}: {
  pricing: PricingConfig;
  result: ForecastResult;
}) {
  return (
    <div
      className="rounded-xl bg-[#1A1A1A] text-white p-5 flex flex-col gap-4"
      data-testid="scenario-column-current"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[2px] text-white/50 font-semibold">
          Current Deal
        </span>
        <span className="text-[10px] uppercase tracking-[2px] text-[#EA2C00] font-semibold bg-[#EA2C00]/10 px-2 py-0.5 rounded">
          Active
        </span>
      </div>
      <div>
        <p className="text-xs text-white/50 mb-1">{PRICING_MODEL_LABELS[pricing.model]}</p>
        <p className="text-lg font-bold font-abridge">{formatPricingHeadline(pricing)}</p>
      </div>
      <KPIRows result={result} baseline={null} />
    </div>
  );
}

function AlternativeColumn({
  alt,
  altResult,
  baseline,
  isWinner,
  onUpdate,
  onRemove,
  onApply,
}: {
  alt: ComparisonColumn;
  altResult: ForecastResult;
  baseline: ForecastResult;
  isWinner: boolean;
  onUpdate: (patch: Partial<ComparisonColumn>) => void;
  onRemove: () => void;
  onApply: () => void;
}) {
  return (
    <div
      className="rounded-xl bg-white border border-[#E8E2DA] p-5 flex flex-col gap-4 relative"
      data-testid={`scenario-column-${alt.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <input
          value={alt.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          data-testid={`input-alt-label-${alt.id}`}
          className="text-sm font-semibold text-[#1A1A1A] bg-transparent border-0 border-b border-dashed border-neutral-300 focus:outline-none focus:border-[#EA2C00] w-full py-0.5"
          placeholder="Alternative name"
        />
        <button
          type="button"
          onClick={onRemove}
          data-testid={`btn-remove-alt-${alt.id}`}
          aria-label="Remove alternative"
          className="text-neutral-300 hover:text-red-500 flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Pricing Model</p>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {ALL_MODELS.map((model) => (
            <button
              type="button"
              key={model}
              onClick={() => onUpdate({ pricing: { ...alt.pricing, model } })}
              data-testid={`btn-alt-model-${alt.id}-${model}`}
              className={`text-[11px] py-1.5 px-2 rounded-lg border text-left transition-all ${
                alt.pricing.model === model
                  ? "border-[#1A1A1A] bg-[#1A1A1A] text-white font-semibold"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {PRICING_MODEL_LABELS[model].replace(" / Month", "/mo")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500 flex-shrink-0">Unit price</span>
          <FormattedNumberInput
            value={alt.pricing.unitPrice}
            onChange={(v) => onUpdate({ pricing: { ...alt.pricing, unitPrice: v } })}
            data-testid={`input-alt-unit-price-${alt.id}`}
            className="h-8 text-sm font-semibold flex-1"
          />
          <span className="text-[11px] text-neutral-400 flex-shrink-0">
            {unitSuffix(alt.pricing.model)}
          </span>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-2">Adoption Pace</p>
        <div className="grid grid-cols-3 gap-1">
          {ADOPTION_PACES.map(({ value, label, emoji }) => (
            <button
              type="button"
              key={value}
              onClick={() => onUpdate({ adoptionMultiplier: value })}
              data-testid={`btn-alt-adoption-${alt.id}-${value}`}
              className={`text-[11px] py-1.5 rounded-lg border text-center transition-all ${
                alt.adoptionMultiplier === value
                  ? "border-[#EA2C00] bg-[#FBE9E2] text-[#A82200] font-semibold"
                  : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      <KPIRows result={altResult} baseline={baseline} />

      {isWinner && (
        <div
          className="text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-center font-semibold"
          data-testid={`badge-winner-${alt.id}`}
        >
          ✓ Best net value
        </div>
      )}

      <button
        type="button"
        onClick={onApply}
        data-testid={`btn-use-deal-${alt.id}`}
        className="w-full py-2 rounded-lg border border-[#1A1A1A] text-[#1A1A1A] text-sm font-semibold hover:bg-[#1A1A1A] hover:text-white transition-all"
      >
        Use this deal →
      </button>
    </div>
  );
}

type KpiRow = {
  label: "Total Cost" | "Net Value" | "ROI" | "Break-Even";
  current: number | null;
  fmt: (n: number) => string;
  lowerIsBetter: boolean;
  isMonth?: boolean;
};

function KPIRows({
  result,
  baseline,
}: {
  result: ForecastResult;
  baseline: ForecastResult | null;
}) {
  const rows: KpiRow[] = [
    {
      label: "Total Cost",
      current: result.kpis.totalContractCost,
      fmt: fmtCurrencyShort,
      lowerIsBetter: true,
    },
    {
      label: "Net Value",
      current: result.kpis.netContractValue,
      fmt: fmtCurrencyShort,
      lowerIsBetter: false,
    },
    {
      label: "ROI",
      current: result.kpis.roiMultiple,
      fmt: (n: number) => `${n.toFixed(2)}x`,
      lowerIsBetter: false,
    },
    {
      label: "Break-Even",
      current: result.kpis.fullBreakEvenMonth,
      fmt: (n: number) => `Month ${n}`,
      lowerIsBetter: true,
      isMonth: true,
    },
  ];

  const baseValueFor = (label: KpiRow["label"]): number | null => {
    if (!baseline) return null;
    switch (label) {
      case "Total Cost": return baseline.kpis.totalContractCost;
      case "Net Value": return baseline.kpis.netContractValue;
      case "ROI": return baseline.kpis.roiMultiple;
      case "Break-Even": return baseline.kpis.fullBreakEvenMonth;
    }
  };

  return (
    <div
      className={`space-y-3 pt-4 ${baseline === null ? "border-t border-white/10" : "border-t border-neutral-200"}`}
    >
      {rows.map((row) => {
        const val = row.current;
        const baseVal = baseValueFor(row.label);

        let deltaStr = "";
        let deltaColor = "text-neutral-400";

        if (
          baseline !== null &&
          baseVal !== null &&
          val !== null &&
          typeof val === "number" &&
          typeof baseVal === "number"
        ) {
          const delta = val - baseVal;
          const isGood = row.lowerIsBetter ? delta < 0 : delta > 0;
          const isBad = row.lowerIsBetter ? delta > 0 : delta < 0;

          if (row.isMonth) {
            deltaStr =
              delta === 0
                ? "="
                : delta < 0
                  ? `${Math.abs(delta)}mo earlier`
                  : `${delta}mo later`;
          } else if (row.label === "ROI") {
            deltaStr = delta === 0 ? "=" : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}x`;
          } else {
            deltaStr =
              delta === 0
                ? "="
                : `${delta > 0 ? "+" : "-"}${fmtCurrencyShort(Math.abs(delta))}`;
          }

          deltaColor = isGood
            ? "text-emerald-600"
            : isBad
              ? "text-red-500"
              : "text-neutral-400";
        }

        const display =
          val === null || val === undefined
            ? row.isMonth
              ? "Not reached"
              : "—"
            : row.fmt(val as number);

        return (
          <div key={row.label} className="flex items-center justify-between">
            <span
              className={`text-[10px] uppercase tracking-wide font-semibold ${
                baseline === null ? "text-white/50" : "text-neutral-400"
              }`}
            >
              {row.label}
            </span>
            <div className="flex items-center gap-2">
              {deltaStr && (
                <span className={`text-[11px] font-semibold ${deltaColor}`}>{deltaStr}</span>
              )}
              <span
                className={`text-sm font-bold font-abridge ${
                  baseline === null ? "text-white" : "text-[#1A1A1A]"
                }`}
              >
                {display}
              </span>
            </div>
          </div>
        );
      })}
    </div>
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

