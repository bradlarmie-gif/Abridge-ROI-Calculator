import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarIcon, ChevronDown } from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
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

export default function ForecastContract({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: ForecastContractProps) {
  const startDate = state.contractStartDate ? new Date(state.contractStartDate) : null;

  const { monthsElapsed, monthsRemaining } = useMemo(() => {
    if (!startDate) return { monthsElapsed: 0, monthsRemaining: state.contractTermMonths };
    const now = new Date();
    const elapsed = Math.max(
      0,
      (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth()),
    );
    const remaining = Math.max(0, state.contractTermMonths - elapsed);
    return { monthsElapsed: elapsed, monthsRemaining: remaining };
  }, [startDate, state.contractTermMonths]);

  const setTermYears = (years: number) => {
    const months = years * 12;
    // Keep curves in sync with new term length
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
    if (model !== "perEncounter" && model !== "hybrid") {
      // keep limit fields if user already set them, but reset overage requirements
    }
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
    while (arr.length < state.contractTermMonths / 12) arr.push(0);
    arr[yearIdx] = pct;
    updatePricing({ yearlyEscalators: arr });
  };

  const isEncounterMode =
    state.currentPricing.model === "perEncounter" ||
    state.currentPricing.model === "hybrid";

  const isHybrid = state.currentPricing.model === "hybrid";

  const validationErrors: string[] = [];
  if (startDate) {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (startDate < fiveYearsAgo) {
      validationErrors.push("Contract start date must be within the last 5 years.");
    }
  }
  if (isEncounterMode && (!state.currentPricing.contractEncounterLimit || state.currentPricing.contractEncounterLimit <= 0)) {
    validationErrors.push("Encounter-mode pricing requires a contract encounter limit.");
  }
  if (state.currentPricing.unitPrice <= 0) {
    validationErrors.push("Unit price must be greater than 0.");
  }
  const canContinue = validationErrors.length === 0;

  const nursingDisabled = !state.careSettings.includes("nursing");

  const unitPriceLabel = PRICING_UNIT_LABELS[state.currentPricing.model];

  const termYears = state.contractTermMonths / 12;

  return (
    <div className="min-h-screen bg-white">
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

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p
            className="text-[11px] uppercase font-medium text-[#EA2C00] mb-3"
            style={{ letterSpacing: "2.5px" }}
          >
            Step 3 · Contract & Pricing
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-[#1A1A1A] font-abridge uppercase mb-3"
            style={{ letterSpacing: "0.02em" }}
          >
            Your current contract
          </h1>
          <p className="text-base text-[#666666] max-w-2xl leading-relaxed mb-10">
            Confirm the terms. We'll compare other pricing models on the Dashboard.
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Term + start */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wide text-neutral-500">
                  Contract term
                </Label>
                <div className="inline-flex rounded-md border border-neutral-200 p-0.5 bg-neutral-50">
                  {TERM_OPTIONS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      data-testid={`btn-term-${y}`}
                      onClick={() => setTermYears(y)}
                      className={`px-4 py-1.5 rounded text-sm transition-colors ${
                        termYears === y
                          ? "bg-white text-[#1A1A1A] shadow-sm font-semibold"
                          : "text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      {y} yr
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-neutral-500">
                  Contract start date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      data-testid="btn-contract-start-date"
                      className="w-[280px] justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
                {startDate && (
                  <p
                    className="text-xs text-neutral-500"
                    data-testid="text-contract-elapsed"
                  >
                    Started {format(startDate, "MMM yyyy")} · {monthsElapsed} months elapsed ·{" "}
                    {monthsRemaining} months remaining
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing model */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-neutral-500">
                    Current pricing model
                  </Label>
                  <Select
                    value={state.currentPricing.model}
                    onValueChange={(v) => setModel(v as PricingModel)}
                  >
                    <SelectTrigger data-testid="select-pricing-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="perProvider">
                        {PRICING_MODEL_LABELS.perProvider}
                      </SelectItem>
                      <SelectItem
                        value="perStaffedBed"
                        disabled={nursingDisabled}
                      >
                        {PRICING_MODEL_LABELS.perStaffedBed}
                        {nursingDisabled ? " (nursing not active)" : ""}
                      </SelectItem>
                      <SelectItem value="annualFlat">
                        {PRICING_MODEL_LABELS.annualFlat}
                      </SelectItem>
                      <SelectItem value="perEncounter">
                        {PRICING_MODEL_LABELS.perEncounter}
                      </SelectItem>
                      <SelectItem value="hybrid">
                        {PRICING_MODEL_LABELS.hybrid}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-neutral-500">
                    {unitPriceLabel}
                  </Label>
                  <FormattedNumberInput
                    data-testid="input-unit-price"
                    value={state.currentPricing.unitPrice || ""}
                    onChange={(v) => updatePricing({ unitPrice: v })}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Annual escalators */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="btn-toggle-escalators"
                    className="text-xs uppercase tracking-wide text-neutral-600 -ml-2"
                  >
                    <ChevronDown className="w-3.5 h-3.5 mr-1" />
                    Annual escalators
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
                    {Array.from({ length: termYears }, (_, i) => i).map((i) => (
                      <div key={i} className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                          Y{i + 1} %
                        </Label>
                        <FormattedNumberInput
                          data-testid={`input-escalator-y${i + 1}`}
                          value={state.currentPricing.yearlyEscalators?.[i] || ""}
                          onChange={(v) => updateEscalator(i, v)}
                          step={0.1}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    Y1 = baseline (no escalator). Subsequent years compound.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

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
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1A1A1A]">
                      Encounter-mode terms
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-neutral-500">
                          Contract encounter limit
                        </Label>
                        <FormattedNumberInput
                          data-testid="input-encounter-limit"
                          value={state.currentPricing.contractEncounterLimit ?? ""}
                          onChange={(v) => updatePricing({ contractEncounterLimit: v })}
                          placeholder="e.g. 500,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-neutral-500">
                          Total capacity ceiling
                        </Label>
                        <FormattedNumberInput
                          data-testid="input-capacity-ceiling"
                          value={state.currentPricing.capacityCeiling ?? ""}
                          onChange={(v) => updatePricing({ capacityCeiling: v })}
                          placeholder={
                            state.currentPricing.contractEncounterLimit
                              ? `${Math.round(state.currentPricing.contractEncounterLimit * 1.2).toLocaleString()} (default)`
                              : "e.g. 600,000"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-neutral-500">
                          Overage rate ($/encounter)
                        </Label>
                        <FormattedNumberInput
                          data-testid="input-overage-rate"
                          value={state.currentPricing.overageRate ?? ""}
                          onChange={(v) => updatePricing({ overageRate: v })}
                          step={0.01}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hybrid extras */}
          <AnimatePresence>
            {isHybrid && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1A1A1A]">
                      Hybrid secondary
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-neutral-500">
                          Secondary model
                        </Label>
                        <Select
                          value={state.currentPricing.secondaryModel ?? "perEncounter"}
                          onValueChange={(v) =>
                            updatePricing({ secondaryModel: v as PricingModel })
                          }
                        >
                          <SelectTrigger data-testid="select-secondary-model">
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
                        <Label className="text-xs uppercase tracking-wide text-neutral-500">
                          Secondary unit price
                        </Label>
                        <FormattedNumberInput
                          data-testid="input-secondary-unit-price"
                          value={state.currentPricing.secondaryUnitPrice ?? ""}
                          onChange={(v) => updatePricing({ secondaryUnitPrice: v })}
                          step={0.01}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

        <div className="flex items-center justify-between mt-12">
          <Button
            variant="outline"
            onClick={onBack}
            data-testid="btn-contract-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={onNext}
            disabled={!canContinue}
            data-testid="btn-contract-continue"
            className="bg-[#EA2C00] hover:bg-[#C92500] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
