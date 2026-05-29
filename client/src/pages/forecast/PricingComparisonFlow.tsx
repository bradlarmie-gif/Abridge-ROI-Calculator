import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, X } from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type PricingModel,
  type OverageModel,
  PRICING_MODEL_LABELS,
  PRICING_MODEL_UNIT_LABELS,
  type DealOption,
  type VolumeInputs,
  computeDealResult,
  makeDefaultDeal,
  syncYearConfigs,
} from "@/lib/pricingComparisonCalc";

interface PricingComparisonFlowProps {
  onBack: () => void;
  onHome: () => void;
}

const PRICING_COMPARISON_STEP_LABELS = ["Compare Pricing"];

const DEAL_COLORS = ["#EA2C00", "#1A1A1A", "#2D6F6B"];

const CONTRACT_TERMS = [
  { label: "1-Year", months: 12 },
  { label: "2-Year", months: 24 },
  { label: "3-Year", months: 36 },
  { label: "5-Year", months: 60 },
];

const ESCALATORS = [
  { label: "Flat", pct: 0 },
  { label: "+3%", pct: 3 },
  { label: "+5%", pct: 5 },
  { label: "+8%", pct: 8 },
];

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtEnc(n: number): string {
  return `$${n.toFixed(2)}`;
}

function volumeLabel(model: PricingModel): string {
  if (model === "perProviderMonth") return "providers";
  if (model === "perEncounterAnnual" || model === "platform") return "encounters";
  return "";
}

// Pill toggle group
function PillToggle<T extends string | number>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  getLabel?: (o: { label: string; value: T }) => string;
  getValue?: (o: { label: string; value: T }) => T;
}) {
  return (
    <div className="inline-flex bg-[#F5F0EB] rounded-full p-0.5 gap-0.5 flex-wrap">
      {options.map((opt) => {
        const v = getValue ? getValue(opt) : opt.value;
        const label = getLabel ? getLabel(opt) : opt.label;
        const active = v === value;
        return (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              active
                ? "bg-white text-[#1A1A1A] shadow-sm"
                : "text-[#666666] hover:text-[#1A1A1A]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Number input styled for this project (plain input, not Shadcn)
function NumberInput({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center bg-white border border-[#E8E2DA] rounded-lg px-3 h-10 gap-1 focus-within:border-[#1A1A1A] transition-colors ${className ?? ""}`}
    >
      {prefix && <span className="text-[#8C7E6E] text-sm flex-shrink-0">{prefix}</span>}
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder={placeholder ?? "0"}
        className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="text-[#8C7E6E] text-xs flex-shrink-0 whitespace-nowrap">{suffix}</span>}
    </div>
  );
}

// Individual deal card
function DealCard({
  deal,
  index,
  volumes,
  showValueLayer,
  annualValueEstimate,
  onUpdate,
  onRemove,
  canRemove,
}: {
  deal: DealOption;
  index: number;
  volumes: VolumeInputs;
  showValueLayer: boolean;
  annualValueEstimate: number;
  onUpdate: (updates: Partial<DealOption>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const color = DEAL_COLORS[index] ?? DEAL_COLORS[0];
  const effectiveValue = showValueLayer ? annualValueEstimate : 0;
  const result = useMemo(
    () => computeDealResult(deal, volumes, effectiveValue),
    [deal, volumes, effectiveValue],
  );

  const PRICING_MODELS: { label: string; value: PricingModel }[] = [
    { label: PRICING_MODEL_LABELS.perProviderMonth, value: "perProviderMonth" },
    { label: PRICING_MODEL_LABELS.perEncounterAnnual, value: "perEncounterAnnual" },
    { label: PRICING_MODEL_LABELS.enterpriseFlat, value: "enterpriseFlat" },
    { label: PRICING_MODEL_LABELS.platform, value: "platform" },
  ];

  const showVolumeInput = deal.model !== "enterpriseFlat";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white rounded-xl border border-[#E8E2DA] overflow-hidden flex flex-col"
    >
      {/* Color accent bar */}
      <div className="h-1" style={{ backgroundColor: color }} />

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Header row: editable label + remove */}
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={deal.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="flex-1 min-w-0 text-base font-bold text-[#1A1A1A] bg-transparent outline-none border-b border-transparent focus:border-[#E8E2DA] transition-colors placeholder-[#A39888] truncate"
            placeholder="Deal label"
          />
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F5F0EB] text-[#8C7E6E] hover:text-[#1A1A1A] transition-colors"
              aria-label="Remove deal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pricing model */}
        <div>
          <p className="text-[10px] uppercase font-medium text-[#8C7E6E] tracking-widest mb-2">
            Pricing Model
          </p>
          <div className="flex flex-col gap-1.5">
            {PRICING_MODELS.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => onUpdate({ model: pm.value })}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-all border ${
                  deal.model === pm.value
                    ? "border-[#1A1A1A] bg-[#F5F0EB] text-[#1A1A1A] font-medium"
                    : "border-[#E8E2DA] bg-white text-[#666666] hover:bg-[#F5F0EB]"
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full border flex-shrink-0 transition-all ${
                    deal.model === pm.value
                      ? "border-[#1A1A1A] bg-[#1A1A1A]"
                      : "border-[#A39888] bg-white"
                  }`}
                />
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Unit price — platform gets two inputs, others get one */}
        {deal.model === "platform" ? (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-[#8C7E6E] mb-1">Platform Fee</p>
              <div className="flex items-center bg-white border border-[#E8E2DA] rounded-lg focus-within:border-[#EA2C00] transition-colors overflow-hidden">
                <span className="pl-3 text-sm text-[#A39888]">$</span>
                <input
                  type="number"
                  value={deal.platformFee || ""}
                  onChange={(e) => onUpdate({ platformFee: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="flex-1 px-2 py-2 text-sm bg-transparent outline-none"
                />
                <span className="pr-2 text-xs text-[#A39888]">/yr</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#8C7E6E] mb-1">Per Encounter</p>
              <div className="flex items-center bg-white border border-[#E8E2DA] rounded-lg focus-within:border-[#EA2C00] transition-colors overflow-hidden">
                <span className="pl-3 text-sm text-[#A39888]">$</span>
                <input
                  type="number"
                  value={deal.unitPrice || ""}
                  onChange={(e) => onUpdate({ unitPrice: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="flex-1 px-2 py-2 text-sm bg-transparent outline-none"
                />
                <span className="pr-2 text-xs text-[#A39888]">/enc</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[10px] uppercase font-medium text-[#8C7E6E] tracking-widest mb-2">
              Unit Price
            </p>
            <NumberInput
              value={deal.unitPrice}
              onChange={(v) => onUpdate({ unitPrice: v })}
              prefix="$"
              suffix={PRICING_MODEL_UNIT_LABELS[deal.model]}
              className="w-full"
            />
          </div>
        )}

        {/* Contract term */}
        <div>
          <p className="text-[10px] uppercase font-medium text-[#8C7E6E] tracking-widest mb-2">
            Contract Term
          </p>
          <PillToggle
            options={CONTRACT_TERMS.map((t) => ({ label: t.label, value: t.months }))}
            value={deal.contractTermMonths}
            onChange={(months) => {
              const newYears = Math.ceil(months / 12);
              const relevantDefault =
                deal.model === "perEncounterAnnual" || deal.model === "platform"
                  ? volumes.annualEncounters
                  : volumes.providerCount;
              onUpdate({
                contractTermMonths: months,
                yearConfigs: syncYearConfigs(deal.yearConfigs, newYears, relevantDefault),
              });
            }}
          />
        </div>

        {/* Annual escalator */}
        <div>
          <p className="text-[10px] uppercase font-medium text-[#8C7E6E] tracking-widest mb-2">
            Annual Escalator
          </p>
          <PillToggle
            options={ESCALATORS.map((e) => ({ label: e.label, value: e.pct }))}
            value={deal.escalatorPct}
            onChange={(v) => onUpdate({ escalatorPct: v })}
          />
        </div>

        {/* Cost summary — editable per-year table */}
        <div className="bg-[#F5F0EB] rounded-xl p-4 mt-auto">
          {/* Year-by-year rows */}
          {result.years.map((yr, idx) => (
            <div key={yr.year} className="flex items-center gap-2 py-1.5">
              <span className="text-xs text-[#8C7E6E] w-10 flex-shrink-0">Year {yr.year}</span>
              {showVolumeInput && (
                <input
                  type="number"
                  value={
                    deal.yearConfigs[idx]?.provisionedVolume === 0
                      ? ""
                      : deal.yearConfigs[idx]?.provisionedVolume
                  }
                  onChange={(e) => {
                    const newConfigs = [...deal.yearConfigs];
                    newConfigs[idx] = { provisionedVolume: Number(e.target.value) || 0 };
                    onUpdate({ yearConfigs: newConfigs });
                  }}
                  placeholder="0"
                  className="w-20 px-2 py-0.5 text-xs bg-white border border-[#E8E2DA] rounded focus:border-[#EA2C00] outline-none text-center"
                />
              )}
              {showVolumeInput && (
                <span className="text-[10px] text-[#A39888] flex-shrink-0">
                  {volumeLabel(deal.model)}
                </span>
              )}
              <span className="ml-auto text-sm font-semibold text-neutral-900">
                {fmt(yr.annualCost)}
              </span>
            </div>
          ))}

          {/* Total contract cost */}
          <div className="flex items-center justify-between border-t border-[#E8E2DA] pt-2 mt-1 mb-2">
            <span className="text-xs font-semibold text-[#1A1A1A]">Total Contract</span>
            <span
              className="text-base font-bold tabular-nums"
              style={{ color }}
            >
              {fmt(result.totalContractCost)}
            </span>
          </div>

          {/* Per-unit metrics */}
          {result.costPerProvider !== null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8C7E6E]">Cost / Provider</span>
              <span className="text-[#666666] tabular-nums">
                {fmt(result.costPerProvider)}
              </span>
            </div>
          )}
          {result.costPerEncounter !== null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8C7E6E]">Cost / Encounter</span>
              <span className="text-[#666666] tabular-nums">
                {fmtEnc(result.costPerEncounter)}
              </span>
            </div>
          )}

          {/* Value layer metrics */}
          {showValueLayer && result.vtcYear1 !== null && (
            <div className="mt-2 pt-2 border-t border-[#E8E2DA] space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8C7E6E]">VTC Year 1</span>
                <span className="text-emerald-600 font-semibold tabular-nums">
                  {result.vtcYear1.toFixed(1)}×
                </span>
              </div>
              {result.termVtc !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C7E6E]">Term VTC</span>
                  <span className="text-emerald-600 font-semibold tabular-nums">
                    {result.termVtc.toFixed(1)}×
                  </span>
                </div>
              )}
              {result.paybackMonths !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C7E6E]">Payback Month</span>
                  <span className="text-emerald-600 font-semibold tabular-nums">
                    Mo. {result.paybackMonths}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Overage section */}
          {deal.model !== "enterpriseFlat" && (
            <div className="border-t border-[#E0D9D0] pt-3 mt-1">
              <p className="text-[10px] text-[#A39888] uppercase tracking-wide mb-2">
                If usage exceeds provisioned
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {(["hardCap", "billedPerUnit", "included"] as OverageModel[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => onUpdate({ overageModel: m })}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      deal.overageModel === m
                        ? "bg-[#EA2C00] text-white"
                        : "bg-white border border-[#E8E2DA] text-[#6B5E4F] hover:border-[#EA2C00]"
                    }`}
                  >
                    {m === "hardCap" ? "Hard cap" : m === "billedPerUnit" ? "Bill overage" : "Included"}
                  </button>
                ))}
              </div>
              {deal.overageModel === "billedPerUnit" && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-[#A39888]">Overage rate</span>
                  <div className="flex items-center bg-white border border-[#E8E2DA] rounded focus-within:border-[#EA2C00] transition-colors overflow-hidden">
                    <span className="pl-2 text-xs text-[#A39888]">$</span>
                    <input
                      type="number"
                      value={deal.overageUnitPrice === 0 ? "" : deal.overageUnitPrice}
                      onChange={(e) => onUpdate({ overageUnitPrice: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-16 px-1.5 py-0.5 text-xs bg-transparent outline-none"
                    />
                    <span className="pr-2 text-[10px] text-[#A39888]">/{volumeLabel(deal.model)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function PricingComparisonFlow({
  onBack,
  onHome,
}: PricingComparisonFlowProps) {
  const [partnerName, setPartnerName] = useState("");
  const [volumes, setVolumes] = useState<VolumeInputs>({
    providerCount: 0,
    annualEncounters: 0,
    staffedBeds: 0,
  });
  const [deals, setDeals] = useState<DealOption[]>([
    makeDefaultDeal("Option A", "deal-a"),
    makeDefaultDeal("Option B", "deal-b"),
  ]);
  const [showValueLayer, setShowValueLayer] = useState(false);
  const [annualValueEstimate, setAnnualValueEstimate] = useState(0);

  const updateDeal = (id: string, updates: Partial<DealOption>) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    );
  };

  const removeDeal = (id: string) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  const addDealC = () => {
    setDeals((prev) => [...prev, makeDefaultDeal("Option C", "deal-c")]);
  };

  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <UnifiedHeader
        pathType="forecast"
        currentStep={1}
        totalSteps={1}
        stepName="Compare Pricing"
        onBack={onBack}
        onHome={onHome}
        stepLabels={PRICING_COMPARISON_STEP_LABELS}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8">
        {/* Section 1: Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <p
              className="text-[11px] uppercase font-medium text-[#EA2C00] mb-2"
              style={{ letterSpacing: "2.5px" }}
            >
              Deal Cost Comparison
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-2">
              Compare Pricing Options
            </h1>
            <p className="text-sm text-[#666666] max-w-lg leading-relaxed">
              Side-by-side cost math across deal structures. Add a value estimate
              to unlock ROI.
            </p>
          </div>

          {/* Partner name input — right-aligned */}
          <div className="sm:flex-shrink-0 sm:w-64">
            <label
              className="block text-[10px] uppercase font-medium text-[#8C7E6E] tracking-widest mb-1.5"
            >
              Partner Name
            </label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="e.g. Memorial Health"
              className="w-full h-10 bg-white border border-[#E8E2DA] rounded-lg px-3 text-sm text-[#1A1A1A] outline-none placeholder-[#A39888] focus:border-[#1A1A1A] transition-colors"
            />
          </div>
        </div>

        {/* Section 2: Volume inputs */}
        <div className="bg-white rounded-xl border border-[#E8E2DA] p-5 mb-6">
          <p
            className="text-[10px] uppercase font-medium text-[#8C7E6E] tracking-widest mb-4"
          >
            Volume
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1.5">
                Providers
              </label>
              <NumberInput
                value={volumes.providerCount}
                onChange={(v) => setVolumes((prev) => ({ ...prev, providerCount: v }))}
                suffix="providers"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1.5">
                Annual Encounters
              </label>
              <NumberInput
                value={volumes.annualEncounters}
                onChange={(v) =>
                  setVolumes((prev) => ({ ...prev, annualEncounters: v }))
                }
                suffix="encounters/yr"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1.5">
                Staffed Beds (Nursing)
              </label>
              <NumberInput
                value={volumes.staffedBeds}
                onChange={(v) => setVolumes((prev) => ({ ...prev, staffedBeds: v }))}
                suffix="beds"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Deal cards */}
        <div className="mb-4">
          <p
            className="text-[10px] uppercase font-medium text-[#8C7E6E] tracking-widest mb-4"
          >
            Deal Options
          </p>
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deals.map((deal, index) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  index={index}
                  volumes={volumes}
                  showValueLayer={showValueLayer}
                  annualValueEstimate={annualValueEstimate}
                  onUpdate={(updates) => updateDeal(deal.id, updates)}
                  onRemove={() => removeDeal(deal.id)}
                  canRemove={deals.length > 2}
                />
              ))}

              {/* Add Option C */}
              {deals.length < 3 && (
                <motion.button
                  key="add-option-c"
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.22 }}
                  type="button"
                  onClick={addDealC}
                  className="rounded-xl border-2 border-dashed border-[#E8E2DA] bg-white/60 hover:bg-white hover:border-[#A39888] transition-all flex items-center justify-center min-h-[160px] text-[#8C7E6E] hover:text-[#1A1A1A] gap-2 text-sm font-medium"
                >
                  <span className="text-lg leading-none">+</span>
                  Add Option C
                </motion.button>
              )}
            </div>
          </AnimatePresence>
        </div>

        {/* Section 4: Value layer toggle */}
        <div className="bg-white rounded-xl border border-[#E8E2DA] p-5 mt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  Add Value Estimate
                </p>
                <p className="text-xs text-[#8C7E6E] leading-relaxed">
                  Unlocks ROI, VTC, and payback rows for each option
                </p>
              </div>
            </div>

            {/* Toggle switch */}
            <button
              type="button"
              onClick={() => setShowValueLayer((v) => !v)}
              aria-pressed={showValueLayer}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                showValueLayer ? "bg-emerald-500" : "bg-[#E8E2DA]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  showValueLayer ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Value layer expansion */}
          <AnimatePresence>
            {showValueLayer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-[#E8E2DA]">
                  <p className="text-xs text-[#8C7E6E] mb-3 leading-relaxed">
                    Use a ProformaHub or Forecast model to derive this number, or enter your own estimate.
                  </p>
                  <div className="max-w-xs">
                    <label className="block text-xs font-medium text-[#666666] mb-1.5">
                      Annual Value Estimate
                    </label>
                    <NumberInput
                      value={annualValueEstimate}
                      onChange={setAnnualValueEstimate}
                      prefix="$"
                      suffix="/year"
                      placeholder="0"
                      className="w-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
