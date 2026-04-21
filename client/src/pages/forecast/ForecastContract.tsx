import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Calculator,
  Calendar as CalendarLucide,
  CalendarIcon,
  CheckCircle2,
  ChevronDown,
  Circle,
  DollarSign,
  Layers,
  User,
  type LucideIcon,
} from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { BackgroundPattern } from "@/components/BackgroundPattern";
import { cn } from "@/lib/utils";
import {
  type ForecastState,
  type PricingConfig,
  type PricingModel,
  PRICING_MODEL_LABELS,
  PRICING_UNIT_LABELS,
  makeDefaultUtilizationCurve,
  makeDefaultEncounterShareCurve,
} from "./types";

interface ForecastContractProps {
  state: ForecastState;
  updateState: (updates: Partial<ForecastState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const FORECAST_STEP_LABELS = ["Start", "Baseline", "Contract & Pricing"];
const TERM_OPTIONS = [1, 2, 3, 4, 5];

interface PricingTile {
  model: PricingModel;
  icon: LucideIcon;
  title: string;
  desc: string;
}

const PRICING_TILES: PricingTile[] = [
  { model: "perProvider", icon: User, title: "Per Provider", desc: "Monthly fee per active provider" },
  { model: "perStaffedBed", icon: BedDouble, title: "Per Staffed Bed", desc: "Monthly fee per staffed bed" },
  { model: "annualFlat", icon: CalendarLucide, title: "Annual Flat", desc: "Single annual fee" },
  { model: "perEncounter", icon: Activity, title: "Per Encounter", desc: "Variable usage-based fee" },
  { model: "hybrid", icon: Layers, title: "Hybrid", desc: "Base fee plus secondary unit" },
];

const DYNAMIC_UNIT_LABELS: Record<PricingModel, string> = {
  perProvider: "$ per provider / month",
  perStaffedBed: "$ per staffed bed / month",
  annualFlat: "Total annual fee",
  perEncounter: "$ per encounter",
  hybrid: "Base $ per provider / month",
};

function formatCurrency(n: number): string {
  if (!isFinite(n) || n <= 0) return "$0";
  return `$${Math.round(n).toLocaleString()}`;
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2.5" data-testid={`checklist-${done ? "done" : "todo"}`}>
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-4 h-4 text-neutral-300 flex-shrink-0 mt-0.5" />
      )}
      <span className={cn("text-xs leading-snug", done ? "text-neutral-400 line-through" : "text-[#1A1A1A]")}>
        {label}
      </span>
    </div>
  );
}

export default function ForecastContract({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: ForecastContractProps) {
  const [escalatorsOpen, setEscalatorsOpen] = useState(false);

  const startDate = state.contractStartDate ? new Date(state.contractStartDate) : null;
  const termYears = state.contractTermMonths / 12;

  const { monthsElapsed, monthsRemaining, endDate, progressPct } = useMemo(() => {
    if (!startDate) {
      return {
        monthsElapsed: 0,
        monthsRemaining: state.contractTermMonths,
        endDate: null as Date | null,
        progressPct: 0,
      };
    }
    const now = new Date();
    const elapsed = Math.max(
      0,
      (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth()),
    );
    const remaining = Math.max(0, state.contractTermMonths - elapsed);
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + state.contractTermMonths);
    const pct = Math.min(100, Math.max(0, (elapsed / state.contractTermMonths) * 100));
    return { monthsElapsed: elapsed, monthsRemaining: remaining, endDate: end, progressPct: pct };
  }, [startDate, state.contractTermMonths]);

  const setTermYears = (years: number) => {
    const months = years * 12;
    const sharePct =
      state.totalOrgEncountersLTM > 0
        ? (state.abridgeEncountersLTM / state.totalOrgEncountersLTM) * 100
        : 60;
    updateState({
      contractTermMonths: months,
      utilizationCurve: makeDefaultUtilizationCurve(months),
      encounterShareCurve: makeDefaultEncounterShareCurve(months, sharePct),
    });
  };

  const setStartDate = (d: Date | undefined) => {
    if (!d) {
      updateState({ contractStartDate: null });
      return;
    }
    updateState({
      contractStartDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    });
  };

  const updatePricing = (patch: Partial<PricingConfig>) => {
    updateState({ currentPricing: { ...state.currentPricing, ...patch } });
  };

  const setModel = (model: PricingModel) => {
    const next: PricingConfig = { ...state.currentPricing, model };
    if (model !== "hybrid") {
      next.secondaryModel = undefined;
      next.secondaryUnitPrice = undefined;
    }
    if (model === "hybrid" && !next.secondaryModel) {
      next.secondaryModel = "perEncounter";
      next.secondaryUnitPrice = next.secondaryUnitPrice ?? 1;
    }
    updateState({ currentPricing: next });
  };

  const updateEscalator = (yearIdx: number, pct: number) => {
    const arr = [...(state.currentPricing.yearlyEscalators ?? [])];
    while (arr.length < termYears) arr.push(0);
    arr[yearIdx] = pct;
    updatePricing({ yearlyEscalators: arr });
  };

  const isEncounterMode =
    state.currentPricing.model === "perEncounter" ||
    state.currentPricing.model === "hybrid";
  const isHybrid = state.currentPricing.model === "hybrid";

  // Annualized spend
  const annualizedSpend = useMemo(() => {
    const p = state.currentPricing;
    const unit = p.unitPrice || 0;
    let primary = 0;
    switch (p.model) {
      case "perProvider":
        primary = unit * (state.activeUsersToday || 0) * 12;
        break;
      case "perStaffedBed":
        primary = unit * (state.nursingStaffedBeds || 0) * 12;
        break;
      case "annualFlat":
        primary = unit;
        break;
      case "perEncounter":
        primary = unit * (state.abridgeEncountersLTM || 0);
        break;
      case "hybrid":
        primary = unit * (state.activeUsersToday || 0) * 12;
        break;
    }
    let secondary = 0;
    if (p.model === "hybrid" && p.secondaryModel && p.secondaryUnitPrice) {
      const s = p.secondaryUnitPrice;
      switch (p.secondaryModel) {
        case "perProvider":
          secondary = s * (state.activeUsersToday || 0) * 12;
          break;
        case "perStaffedBed":
          secondary = s * (state.nursingStaffedBeds || 0) * 12;
          break;
        case "annualFlat":
          secondary = s;
          break;
        case "perEncounter":
          secondary = s * (state.abridgeEncountersLTM || 0);
          break;
      }
    }
    return primary + secondary;
  }, [state.currentPricing, state.activeUsersToday, state.nursingStaffedBeds, state.abridgeEncountersLTM]);

  const totalOverTerm = annualizedSpend * termYears;

  const insight = useMemo(() => {
    const p = state.currentPricing;
    if (
      p.model === "perEncounter" &&
      p.contractEncounterLimit &&
      state.abridgeEncountersLTM > p.contractEncounterLimit
    ) {
      return {
        warn: true,
        text: "Current usage trajectory suggests you may hit the contract limit — model on the Dashboard",
      };
    }
    if (
      p.model === "perProvider" &&
      state.activeUsersToday > 0 &&
      state.provisionedSeats > 0 &&
      state.activeUsersToday < state.provisionedSeats * 0.7
    ) {
      return {
        warn: false,
        text: "Active utilization is below 70% of provisioned — Dashboard will model adoption levers",
      };
    }
    return {
      warn: false,
      text: "Your current contract at a glance. Dashboard will model what-if scenarios.",
    };
  }, [state.currentPricing, state.abridgeEncountersLTM, state.activeUsersToday, state.provisionedSeats]);

  const validationErrors: string[] = [];
  if (startDate) {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (startDate < fiveYearsAgo) {
      validationErrors.push("Contract start date must be within the last 5 years.");
    }
  }
  if (
    isEncounterMode &&
    (!state.currentPricing.contractEncounterLimit ||
      state.currentPricing.contractEncounterLimit <= 0)
  ) {
    validationErrors.push("Encounter-mode pricing requires a contract encounter limit.");
  }
  if (state.currentPricing.unitPrice <= 0) {
    validationErrors.push("Unit price must be greater than 0.");
  }
  const canContinue = validationErrors.length === 0;

  const nursingDisabled = !state.careSettings.includes("nursing");
  const unitPriceLabel = DYNAMIC_UNIT_LABELS[state.currentPricing.model];

  // Gating: At-a-Glance shows real numbers only when all required inputs exist
  const hasActiveUsers = state.activeUsersToday > 0;
  const hasStartDate = !!startDate;
  const hasUnitPrice = state.currentPricing.unitPrice > 0;
  const glanceReady = hasActiveUsers && hasStartDate && hasUnitPrice;

  const requiredMissing: string[] = [];
  if (!hasStartDate) requiredMissing.push("Pick a contract start date");
  if (!hasUnitPrice) requiredMissing.push("Enter your unit price");
  if (
    isEncounterMode &&
    (!state.currentPricing.contractEncounterLimit ||
      state.currentPricing.contractEncounterLimit <= 0)
  ) {
    requiredMissing.push("Set the contract encounter limit");
  }

  const sectionHeader = (Icon: LucideIcon, label: string) => (
    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-neutral-100">
      <Icon className="w-3.5 h-3.5 text-[#888888]" />
      <h3
        className="text-xs font-semibold uppercase text-[#888888]"
        style={{ letterSpacing: "1.5px" }}
      >
        {label}
      </h3>
    </div>
  );

  return (
    <div className="min-h-screen bg-white relative">
      <BackgroundPattern />

      <div className="relative z-10">
        <UnifiedHeader
          pathType="forecast"
          currentStep={3}
          totalSteps={3}
          stepName="Contract & Pricing"
          onBack={onBack}
          onHome={onHome}
          stepLabels={FORECAST_STEP_LABELS}
        />
        <UnifiedHeaderSpacer />

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10"
          >
            <h1
              className="text-3xl md:text-4xl font-bold text-[#1A1A1A] font-abridge uppercase"
              style={{ letterSpacing: "0.005em" }}
            >
              Your current contract
            </h1>
            <div className="h-0.5 w-10 bg-[#EA2C00] mt-3 mb-4" />
            <p className="text-sm text-[#666666] max-w-2xl leading-relaxed">
              Confirm the terms. We'll compare other pricing models on the Dashboard.
            </p>
          </motion.div>

          {/* Two-column: Contract Terms + At a Glance */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mb-6">
            {/* Contract Terms */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              data-testid="section-contract-terms"
              className="bg-white rounded-xl border border-neutral-100 shadow-md p-8"
            >
              {sectionHeader(CalendarLucide, "Contract Terms")}

              {/* Term pills */}
              <div className="space-y-2 mb-6">
                <Label className="text-xs text-neutral-500 font-medium">
                  Contract Term
                </Label>
                <div className="flex flex-wrap gap-2">
                  {TERM_OPTIONS.map((y) => {
                    const active = termYears === y;
                    return (
                      <button
                        key={y}
                        type="button"
                        data-testid={`btn-term-${y}`}
                        onClick={() => setTermYears(y)}
                        className={cn(
                          "px-5 py-2.5 rounded-full border text-sm font-medium transition-all duration-150",
                          active
                            ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm"
                            : "bg-white text-[#1A1A1A] border-neutral-200 hover:border-neutral-400 hover:-translate-y-px hover:shadow-sm",
                        )}
                      >
                        {y} yr
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start date */}
              <div className="space-y-2 mb-6">
                <Label className="text-xs text-neutral-500 font-medium">
                  Contract Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-testid="btn-contract-start-date"
                      className="w-[240px] h-11 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#888888]" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate ?? undefined}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Timeline visualization or empty placeholder */}
              <AnimatePresence mode="wait">
                {startDate && endDate ? (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, y: 4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="pt-4 border-t border-neutral-100 overflow-hidden"
                    data-testid="contract-timeline"
                  >
                    <div className="relative h-2 rounded-full bg-neutral-100 overflow-visible">
                      <div
                        className="absolute top-0 left-0 h-full rounded-full bg-[#EA2C00] transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                      <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#EA2C00] border-2 border-white shadow-sm" />
                      <div
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#1A1A1A] border-2 border-white shadow-sm"
                        style={{ left: `${progressPct}%` }}
                      />
                      <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-neutral-300 border-2 border-white shadow-sm" />
                    </div>
                    <div className="flex justify-between mt-3 text-[11px] text-neutral-500">
                      <span>Started {format(startDate, "MMM yyyy")}</span>
                      <span className="font-medium text-[#1A1A1A]">Today</span>
                      <span>Ends {format(endDate, "MMM yyyy")}</span>
                    </div>
                    <p
                      className="text-xs font-sans font-semibold text-neutral-600 mt-3 text-center"
                      data-testid="text-contract-elapsed"
                    >
                      {monthsElapsed} months elapsed · {monthsRemaining} months remaining
                    </p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="timeline-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="text-sm text-gray-400 italic"
                    data-testid="text-timeline-empty"
                  >
                    Pick a start date to see your contract timeline.
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.section>

            {/* At a glance */}
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              data-testid="section-at-a-glance"
            >
              <div className="lg:sticky lg:top-24">
                <div className="bg-white rounded-xl border border-neutral-100 shadow-md border-l-4 border-l-[#EA2C00] p-6">
                  <p
                    className="text-[11px] font-semibold uppercase text-[#888888] mb-4"
                    style={{ letterSpacing: "1.5px" }}
                  >
                    At a Glance
                  </p>

                  <AnimatePresence mode="wait">
                    {glanceReady ? (
                      <motion.div
                        key="ready"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        data-testid="glance-ready"
                      >
                        {/* Contract window */}
                        <div className="mb-5">
                          <p
                            className="text-base font-semibold text-[#1A1A1A]"
                            data-testid="text-contract-window"
                          >
                            {endDate
                              ? `${format(startDate!, "MMM yyyy")} → ${format(endDate, "MMM yyyy")}`
                              : ""}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {state.contractTermMonths}-month term
                          </p>
                        </div>

                        <div className="border-t border-neutral-100 pt-4 mb-4">
                          <p
                            className="text-[10px] uppercase text-neutral-500 mb-1.5"
                            style={{ letterSpacing: "1.2px" }}
                          >
                            Annualized Spend
                          </p>
                          <p
                            className="font-abridge font-bold text-[#EA2C00] leading-none"
                            style={{ fontSize: "2.5rem" }}
                            data-testid="text-annualized-spend"
                          >
                            {formatCurrency(annualizedSpend)}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-1.5">
                            at current pricing
                          </p>
                        </div>

                        <div className="border-t border-neutral-100 pt-4 mb-4">
                          <p
                            className="text-[10px] uppercase text-neutral-500 mb-1.5"
                            style={{ letterSpacing: "1.2px" }}
                          >
                            Total Over Term
                          </p>
                          <p
                            className="font-abridge font-bold text-[#1A1A1A] leading-none"
                            style={{ fontSize: "1.75rem" }}
                            data-testid="text-total-over-term"
                          >
                            {formatCurrency(totalOverTerm)}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-1.5">
                            simple projection, before escalators
                          </p>
                        </div>

                        <div
                          className={cn(
                            "border-t border-neutral-100 pt-4 flex gap-2 items-start",
                            insight.warn && "text-[#A82200]",
                          )}
                          data-testid="text-glance-insight"
                        >
                          {insight.warn && (
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          )}
                          <p
                            className={cn(
                              "text-xs leading-snug",
                              insight.warn ? "font-medium" : "text-neutral-600",
                            )}
                          >
                            {insight.text}
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                        data-testid="glance-empty"
                      >
                        <div className="flex justify-center mb-4">
                          <Calculator
                            className="w-10 h-10 text-neutral-300"
                            style={{ opacity: 0.6 }}
                          />
                        </div>
                        <p className="text-sm font-semibold text-[#1A1A1A] text-center">
                          Your contract snapshot will appear here.
                        </p>
                        <p className="text-xs text-neutral-500 text-center mt-1.5 mb-5">
                          Each item turns into a green check as you go.
                        </p>

                        <div className="border-t border-neutral-100 pt-4 space-y-3">
                          <p
                            className="text-[10px] font-semibold uppercase text-[#888888] mb-2"
                            style={{ letterSpacing: "1.2px" }}
                          >
                            To see projections
                          </p>
                          <ChecklistItem
                            done={hasActiveUsers}
                            label="Confirm active users on Baseline"
                          />
                          <ChecklistItem
                            done={hasStartDate}
                            label="Pick a contract start date"
                          />
                          <ChecklistItem
                            done={hasUnitPrice}
                            label="Enter your unit price"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.aside>
          </div>

          {/* Pricing Model card (full width) */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24 }}
            data-testid="section-pricing-model"
            className="bg-white rounded-xl border border-neutral-100 shadow-md p-8"
          >
            {sectionHeader(DollarSign, "Pricing Model")}

            {/* Tile selector */}
            <TooltipProvider delayDuration={150}>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {PRICING_TILES.map((tile) => {
                  const selected = state.currentPricing.model === tile.model;
                  const disabled = tile.model === "perStaffedBed" && nursingDisabled;
                  const Icon = tile.icon;
                  const tileBtn = (
                    <button
                      type="button"
                      onClick={() => {
                        if (disabled) return;
                        setModel(tile.model);
                      }}
                      aria-disabled={disabled}
                      data-testid={`tile-pricing-${tile.model}`}
                      className={cn(
                        "relative bg-white rounded-xl text-left transition-all duration-200 p-4 flex flex-col gap-2 w-full min-h-32",
                        disabled
                          ? "opacity-40 cursor-not-allowed border border-neutral-200"
                          : selected
                          ? "border-l-4 shadow-md border-y border-r border-neutral-100"
                          : "border border-neutral-200 hover:border-neutral-300 hover:shadow-sm hover:-translate-y-px",
                      )}
                      style={
                        selected && !disabled
                          ? { borderLeftColor: "#EA2C00" }
                          : undefined
                      }
                    >
                      <div className="h-9 w-9 rounded-lg bg-[#F3E9DD] flex items-center justify-center">
                        <Icon className="h-4 w-4" style={{ color: "#111111" }} />
                      </div>
                      <div className="text-sm font-semibold text-[#1A1A1A]">
                        {tile.title}
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        {tile.desc}
                      </div>
                    </button>
                  );

                  if (disabled) {
                    return (
                      <Tooltip key={tile.model}>
                        <TooltipTrigger asChild>
                          <span className="block">{tileBtn}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Add Nursing as a care setting on Baseline to enable per-bed pricing
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return <div key={tile.model}>{tileBtn}</div>;
                })}
              </div>
            </TooltipProvider>

            <div className="border-t border-neutral-100 my-6" />

            {/* Unit price */}
            <AnimatePresence mode="wait">
              <motion.div
                key={state.currentPricing.model}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 max-w-md"
              >
                <Label className="text-xs text-neutral-500 font-medium">
                  {unitPriceLabel}
                </Label>
                <FormattedNumberInput
                  data-testid="input-unit-price"
                  value={state.currentPricing.unitPrice || ""}
                  onChange={(v) => updatePricing({ unitPrice: v })}
                  placeholder="0"
                  step={state.currentPricing.model === "perEncounter" ? 0.01 : 1}
                  className="h-14 font-sans font-semibold text-lg focus-visible:ring-[#EA2C00]/30"
                />
              </motion.div>
            </AnimatePresence>

            {/* Encounter-mode extras */}
            <AnimatePresence>
              {isEncounterMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 bg-neutral-50 rounded-lg p-6">
                    <h4
                      className="text-xs font-semibold uppercase text-[#888888] mb-4"
                      style={{ letterSpacing: "1.5px" }}
                    >
                      Encounter-mode Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <Label className="text-xs text-neutral-500 font-medium">
                          Contract Encounter Limit
                        </Label>
                        <FormattedNumberInput
                          data-testid="input-encounter-limit"
                          value={state.currentPricing.contractEncounterLimit ?? ""}
                          onChange={(v) => updatePricing({ contractEncounterLimit: v })}
                          placeholder="e.g. 500,000"
                          className="h-11 font-sans font-semibold focus-visible:ring-[#EA2C00]/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-neutral-500 font-medium">
                          Total Capacity Ceiling
                        </Label>
                        <FormattedNumberInput
                          data-testid="input-capacity-ceiling"
                          value={state.currentPricing.capacityCeiling ?? ""}
                          onChange={(v) => updatePricing({ capacityCeiling: v })}
                          placeholder={
                            state.currentPricing.contractEncounterLimit
                              ? `${Math.round(
                                  state.currentPricing.contractEncounterLimit * 1.2,
                                ).toLocaleString()} (default)`
                              : "e.g. 600,000"
                          }
                          className="h-11 font-sans font-semibold focus-visible:ring-[#EA2C00]/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-neutral-500 font-medium">
                          Overage Rate ($/encounter)
                        </Label>
                        <FormattedNumberInput
                          data-testid="input-overage-rate"
                          value={state.currentPricing.overageRate ?? ""}
                          onChange={(v) => updatePricing({ overageRate: v })}
                          step={0.01}
                          placeholder="0.00"
                          className="h-11 font-sans font-semibold focus-visible:ring-[#EA2C00]/30"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hybrid secondary */}
            <AnimatePresence>
              {isHybrid && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 bg-neutral-50 rounded-lg p-6">
                    <h4
                      className="text-xs font-semibold uppercase text-[#888888] mb-4"
                      style={{ letterSpacing: "1.5px" }}
                    >
                      Secondary Pricing Component
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-xs text-neutral-500 font-medium">
                          Secondary Model
                        </Label>
                        <Select
                          value={state.currentPricing.secondaryModel ?? "perEncounter"}
                          onValueChange={(v) =>
                            updatePricing({ secondaryModel: v as PricingModel })
                          }
                        >
                          <SelectTrigger
                            data-testid="select-secondary-model"
                            className="h-11"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="perProvider">
                              {PRICING_MODEL_LABELS.perProvider}
                            </SelectItem>
                            <SelectItem value="perStaffedBed" disabled={nursingDisabled}>
                              {PRICING_MODEL_LABELS.perStaffedBed}
                            </SelectItem>
                            <SelectItem value="annualFlat">
                              {PRICING_MODEL_LABELS.annualFlat}
                            </SelectItem>
                            <SelectItem value="perEncounter">
                              {PRICING_MODEL_LABELS.perEncounter}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-neutral-500 font-medium">
                          Secondary Unit Price
                        </Label>
                        <FormattedNumberInput
                          data-testid="input-secondary-unit-price"
                          value={state.currentPricing.secondaryUnitPrice ?? ""}
                          onChange={(v) => updatePricing({ secondaryUnitPrice: v })}
                          step={0.01}
                          placeholder="0.00"
                          className="h-11 font-sans font-semibold focus-visible:ring-[#EA2C00]/30"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Annual escalators (collapsible) */}
            <div className="mt-6 pt-4 border-t border-neutral-100">
              <button
                type="button"
                data-testid="btn-toggle-escalators"
                onClick={() => setEscalatorsOpen((o) => !o)}
                className="flex items-center gap-2 text-xs uppercase font-semibold text-[#888888] hover:text-[#1A1A1A] transition-colors"
                style={{ letterSpacing: "1.5px" }}
              >
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    escalatorsOpen && "rotate-180",
                  )}
                />
                Annual Escalators
              </button>
              <AnimatePresence>
                {escalatorsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                      {Array.from({ length: termYears }, (_, i) => i).map((i) => (
                        <div key={i} className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                            Year {i + 1} Escalator
                          </Label>
                          <div className="relative">
                            <FormattedNumberInput
                              data-testid={`input-escalator-y${i + 1}`}
                              value={state.currentPricing.yearlyEscalators?.[i] || ""}
                              onChange={(v) => updateEscalator(i, v)}
                              step={0.1}
                              placeholder="0"
                              className="h-10 font-sans font-semibold pr-7 focus-visible:ring-[#EA2C00]/30"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">
                              %
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500 mt-3">
                      Year 1 = baseline (no escalator). Subsequent years compound.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {validationErrors.length > 0 && (
            <div
              className="mt-8 rounded-md border border-red-200 bg-red-50 p-3"
              data-testid="contract-validation-errors"
            >
              <p className="text-xs font-semibold text-red-700 mb-1.5 uppercase tracking-wide">
                Fix before continuing
              </p>
              <ul className="text-sm text-red-800 space-y-0.5 list-disc pl-5">
                {validationErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.32 }}
            className="flex items-center justify-between mt-12"
          >
            <Button
              variant="outline"
              onClick={onBack}
              data-testid="btn-contract-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <motion.div
                      key={canContinue ? "ready" : "blocked"}
                      initial={canContinue ? { scale: 0.98, opacity: 0.9 } : false}
                      animate={canContinue ? { scale: 1, opacity: 1 } : {}}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <Button
                        onClick={onNext}
                        disabled={!canContinue}
                        data-testid="btn-contract-continue"
                        className={cn(
                          "text-white",
                          canContinue
                            ? "bg-[#EA2C00] hover:bg-[#C92500]"
                            : "bg-neutral-300 hover:bg-neutral-300 cursor-not-allowed",
                        )}
                      >
                        Continue to Dashboard
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  </span>
                </TooltipTrigger>
                {!canContinue && (
                  <TooltipContent>Complete the required fields to continue</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
