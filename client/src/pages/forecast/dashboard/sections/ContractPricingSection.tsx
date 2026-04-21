import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { CalendarIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import {
  type ComparisonPricing,
  type ForecastState,
  type PricingConfig,
  type PricingModel,
  PRICING_MODEL_LABELS,
  PRICING_UNIT_LABELS,
  makeDefaultEncounterShareCurve,
  makeDefaultUtilizationCurve,
} from "../../types";
import { SectionShell } from "./SectionShell";

interface Props {
  state: ForecastState;
  updateState: (updates: Partial<ForecastState>) => void;
}

const TERM_OPTIONS = [1, 2, 3, 4, 5];
const ALL_MODELS: PricingModel[] = [
  "perProvider",
  "perStaffedBed",
  "annualFlat",
  "perEncounter",
  "hybrid",
];

export function ContractPricingSection({ state, updateState }: Props) {
  const { currentPricing, comparisonPricing, careSettings, contractTermMonths } = state;
  const startDate = state.contractStartDate ? new Date(state.contractStartDate) : null;
  const nursingActive = careSettings.includes("nursing");

  const isEncounterMode =
    currentPricing.model === "perEncounter" || currentPricing.model === "hybrid";
  const isHybrid = currentPricing.model === "hybrid";
  const termYears = contractTermMonths / 12;

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

  const updatePricing = (patch: Partial<PricingConfig>) =>
    updateState({ currentPricing: { ...currentPricing, ...patch } });

  const setModel = (model: PricingModel) => {
    const next: PricingConfig = { ...currentPricing, model };
    if (model !== "hybrid") {
      next.secondaryModel = undefined;
      next.secondaryUnitPrice = undefined;
    }
    if (model === "hybrid" && !next.secondaryModel) {
      next.secondaryModel = "perEncounter";
      next.secondaryUnitPrice = next.secondaryUnitPrice ?? 0;
    }
    updateState({ currentPricing: next });
  };

  const updateEscalator = (yearIdx: number, pct: number) => {
    const arr = [...(currentPricing.yearlyEscalators ?? [])];
    while (arr.length < termYears) arr.push(0);
    arr[yearIdx] = pct;
    updatePricing({ yearlyEscalators: arr });
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

  const availableComparisonModels = useMemo(
    () =>
      ALL_MODELS.filter((m) => m !== currentPricing.model)
        .filter((m) => (m === "perStaffedBed" ? nursingActive : true)),
    [currentPricing.model, nursingActive],
  );

  const isComparisonChecked = (m: PricingModel) =>
    comparisonPricing.some((c) => c.pricing.model === m);
  const compareCount = comparisonPricing.length;
  const maxReached = compareCount >= 3;

  const toggleComparison = (m: PricingModel) => {
    if (isComparisonChecked(m)) {
      updateState({
        comparisonPricing: comparisonPricing.filter((c) => c.pricing.model !== m),
      });
    } else {
      if (maxReached) return;
      const id = `cmp-${m}-${Date.now().toString(36)}`;
      const newCmp: ComparisonPricing = {
        id,
        label: `Switch to ${PRICING_MODEL_LABELS[m]}`,
        pricing: {
          model: m,
          unitPrice: 0,
          yearlyEscalators: [0, 0, 0, 0, 0],
          ...(m === "hybrid"
            ? { secondaryModel: "perEncounter", secondaryUnitPrice: 0 }
            : {}),
        },
      };
      updateState({ comparisonPricing: [...comparisonPricing, newCmp] });
    }
  };

  const updateComparison = (id: string, patch: Partial<ComparisonPricing>) => {
    updateState({
      comparisonPricing: comparisonPricing.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    });
  };

  const updateComparisonPricing = (id: string, patch: Partial<PricingConfig>) => {
    updateState({
      comparisonPricing: comparisonPricing.map((c) =>
        c.id === id ? { ...c, pricing: { ...c.pricing, ...patch } } : c,
      ),
    });
  };

  return (
    <SectionShell
      title="Contract & Pricing"
      icon={<FileText className="w-4 h-4" />}
      defaultOpen
      testId="section-contract-pricing"
    >
      {/* Term */}
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
          Term
        </Label>
        <div className="inline-flex rounded-md border border-neutral-200 p-0.5 bg-neutral-50">
          {TERM_OPTIONS.map((y) => (
            <button
              key={y}
              type="button"
              data-testid={`btn-term-${y}`}
              onClick={() => setTermYears(y)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                termYears === y
                  ? "bg-white text-[#1A1A1A] shadow-sm font-semibold"
                  : "text-neutral-500"
              }`}
            >
              {y} yr
            </button>
          ))}
        </div>
      </div>

      {/* Start date */}
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
          Start date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              data-testid="btn-contract-start-date"
              className="w-full justify-start text-left font-normal text-xs"
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {startDate ? format(startDate, "MMM d, yyyy") : "Pick a date"}
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

      {/* Model */}
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
          Pricing model
        </Label>
        <Select value={currentPricing.model} onValueChange={(v) => setModel(v as PricingModel)}>
          <SelectTrigger data-testid="select-pricing-model" className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_MODELS.map((m) => (
              <SelectItem
                key={m}
                value={m}
                disabled={m === "perStaffedBed" && !nursingActive}
              >
                {PRICING_MODEL_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unit price */}
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
          {PRICING_UNIT_LABELS[currentPricing.model]}
        </Label>
        <FormattedNumberInput
          data-testid="input-unit-price"
          value={currentPricing.unitPrice || ""}
          onChange={(v) => updatePricing({ unitPrice: v })}
          step={currentPricing.model === "perEncounter" ? 0.01 : 1}
          placeholder="0"
        />
      </div>

      {/* Encounter-mode extras */}
      <AnimatePresence>
        {isEncounterMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                  Contract encounter limit
                </Label>
                <FormattedNumberInput
                  data-testid="input-encounter-limit"
                  value={currentPricing.contractEncounterLimit ?? ""}
                  onChange={(v) => updatePricing({ contractEncounterLimit: v })}
                  placeholder="500,000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                  Capacity ceiling
                </Label>
                <FormattedNumberInput
                  data-testid="input-capacity-ceiling"
                  value={currentPricing.capacityCeiling ?? ""}
                  onChange={(v) => updatePricing({ capacityCeiling: v })}
                  placeholder="600,000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                  Overage rate ($/enc)
                </Label>
                <FormattedNumberInput
                  data-testid="input-overage-rate"
                  value={currentPricing.overageRate ?? ""}
                  onChange={(v) => updatePricing({ overageRate: v })}
                  step={0.01}
                  placeholder="0.00"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hybrid extras */}
      <AnimatePresence>
        {isHybrid && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2">
              <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                Secondary model
              </Label>
              <Select
                value={currentPricing.secondaryModel ?? "perEncounter"}
                onValueChange={(v) => updatePricing({ secondaryModel: v as PricingModel })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_MODELS.filter((m) => m !== "hybrid").map((m) => (
                    <SelectItem
                      key={m}
                      value={m}
                      disabled={m === "perStaffedBed" && !nursingActive}
                    >
                      {PRICING_MODEL_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                Secondary unit price
              </Label>
              <FormattedNumberInput
                data-testid="input-secondary-unit-price"
                value={currentPricing.secondaryUnitPrice ?? ""}
                onChange={(v) => updatePricing({ secondaryUnitPrice: v })}
                step={0.01}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Escalators */}
      <div className="space-y-2 pt-2 border-t border-neutral-100">
        <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
          Annual escalators (%)
        </Label>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: termYears }, (_, i) => i).map((i) => (
            <div key={i} className="space-y-1">
              <span className="text-[10px] text-neutral-500">Y{i + 1}</span>
              <FormattedNumberInput
                data-testid={`input-escalator-y${i + 1}`}
                value={currentPricing.yearlyEscalators?.[i] || ""}
                onChange={(v) => updateEscalator(i, v)}
                step={0.1}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Compare against */}
      <div className="space-y-2 pt-3 border-t border-neutral-100">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
            Compare against (max 3)
          </Label>
          <span className="text-[10px] font-sans font-semibold text-neutral-500">
            {compareCount}/3
          </span>
        </div>
        <TooltipProvider delayDuration={200}>
          <div className="space-y-1">
            {availableComparisonModels.map((m) => {
              const checked = isComparisonChecked(m);
              const disabled = !checked && maxReached;
              const cmp = comparisonPricing.find((c) => c.pricing.model === m);

              const row = (
                <label
                  key={m}
                  data-testid={`compare-${m}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                    disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-50 cursor-pointer"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggleComparison(m)}
                    data-testid={`checkbox-compare-${m}`}
                  />
                  <span className="text-[#1A1A1A]">{PRICING_MODEL_LABELS[m]}</span>
                </label>
              );

              return (
                <div key={m}>
                  {disabled ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{row}</TooltipTrigger>
                      <TooltipContent>Max 3 comparisons</TooltipContent>
                    </Tooltip>
                  ) : (
                    row
                  )}
                  <AnimatePresence>
                    {checked && cmp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-6 mt-2 space-y-2 p-2 rounded bg-neutral-50 border border-neutral-200">
                          <Input
                            data-testid={`input-cmp-label-${cmp.id}`}
                            value={cmp.label}
                            onChange={(e) => updateComparison(cmp.id, { label: e.target.value })}
                            className="h-7 text-xs"
                          />
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                              {PRICING_UNIT_LABELS[cmp.pricing.model]}
                            </Label>
                            <FormattedNumberInput
                              data-testid={`input-cmp-unit-${cmp.id}`}
                              value={cmp.pricing.unitPrice || ""}
                              onChange={(v) => updateComparisonPricing(cmp.id, { unitPrice: v })}
                              step={cmp.pricing.model === "perEncounter" ? 0.01 : 1}
                            />
                          </div>
                          {(cmp.pricing.model === "perEncounter" ||
                            cmp.pricing.model === "hybrid") && (
                            <>
                              <FormattedNumberInput
                                data-testid={`input-cmp-limit-${cmp.id}`}
                                value={cmp.pricing.contractEncounterLimit ?? ""}
                                onChange={(v) =>
                                  updateComparisonPricing(cmp.id, { contractEncounterLimit: v })
                                }
                                placeholder="Encounter limit"
                              />
                              <FormattedNumberInput
                                data-testid={`input-cmp-overage-${cmp.id}`}
                                value={cmp.pricing.overageRate ?? ""}
                                onChange={(v) =>
                                  updateComparisonPricing(cmp.id, { overageRate: v })
                                }
                                step={0.01}
                                placeholder="Overage rate"
                              />
                            </>
                          )}
                          {cmp.pricing.model === "hybrid" && (
                            <>
                              <Select
                                value={cmp.pricing.secondaryModel ?? "perEncounter"}
                                onValueChange={(v) =>
                                  updateComparisonPricing(cmp.id, {
                                    secondaryModel: v as PricingModel,
                                  })
                                }
                              >
                                <SelectTrigger className="text-xs h-7">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ALL_MODELS.filter((m2) => m2 !== "hybrid").map((m2) => (
                                    <SelectItem key={m2} value={m2}>
                                      {PRICING_MODEL_LABELS[m2]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormattedNumberInput
                                value={cmp.pricing.secondaryUnitPrice ?? ""}
                                onChange={(v) =>
                                  updateComparisonPricing(cmp.id, { secondaryUnitPrice: v })
                                }
                                step={0.01}
                                placeholder="Secondary price"
                              />
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </div>
    </SectionShell>
  );
}
