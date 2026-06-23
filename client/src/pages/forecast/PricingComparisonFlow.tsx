import { useMemo, useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Info, ChevronDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type PricingModel,
  type OverageModel,
  PRICING_MODEL_LABELS,
  type DealOption,
  type VolumeInputs,
  computeDealResult,
  computeUsageScenarios,
  makeDefaultDeal,
  syncYearConfigs,
  orgVolumeForModel,
  type DisplacedVendor,
  type DisplacementCategoryId,
  DISPLACEMENT_CATEGORIES,
  makeDefaultVendor,
  vendorDisplacedAnnual,
  computeNetResult,
  buildDealInsight,
} from "@/lib/pricingComparisonCalc";

interface PricingComparisonFlowProps {
  onBack: () => void;
  onHome: () => void;
}

const DEAL_COLORS = ["#EA2C00", "#1A1A1A", "#2D6F6B"];
const DEAL_COLORS_LIGHT = ["#FFF0ED", "#F0F0F0", "#EEF5F4"];

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

function fmtFull(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function volumeLabel(model: PricingModel): string {
  if (model === "perProviderMonth") return "providers";
  if (model === "perEncounterAnnual" || model === "platform") return "encounters";
  return "";
}

function PillToggle<T extends string | number>({
  options, value, onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex bg-[#F5F0EB] rounded-full p-0.5 gap-0.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
            opt.value === value
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-[#666666] hover:text-[#1A1A1A]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function NumberInput({
  value, onChange, prefix, suffix, placeholder, className,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center bg-white border border-[#E8E2DA] rounded-lg px-3 h-10 gap-1 focus-within:border-[#1A1A1A] transition-colors ${className ?? ""}`}>
      {prefix && <span className="text-[#8C7E6E] text-sm flex-shrink-0">{prefix}</span>}
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? "" : value.toLocaleString("en-US")}
        onChange={(e) => onChange(parseFloat(e.target.value.replace(/,/g, "")) || 0)}
        placeholder={placeholder ?? "0"}
        className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none"
      />
      {suffix && <span className="text-[#8C7E6E] text-xs flex-shrink-0 whitespace-nowrap">{suffix}</span>}
    </div>
  );
}

// Rolls a number from its current value to the next whenever it changes (easeOutCubic).
// This is what makes the deal desk feel alive — tweak an input and the totals count, not snap.
// Honors prefers-reduced-motion.
function useAnimatedNumber(value: number, duration = 480): number {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    if (from === to) return;

    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || Math.abs(to - from) < 1) {
      displayRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = from + (to - from) * eased;
      displayRef.current = cur;
      setDisplay(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else displayRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return display;
}

function AnimatedNumber({
  value, format, className, style,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  style?: CSSProperties;
}) {
  const display = useAnimatedNumber(value);
  return <span className={className} style={style}>{format(display)}</span>;
}

// One label scale for the whole deal desk (kills the four competing label treatments).
const KICKER = "text-[10px] uppercase font-semibold tracking-widest text-[#8C7E6E]";
const FIELD_LABEL = "block text-xs font-medium text-[#666666] mb-1.5";

// Groups the page into Setup / Recommendation / Deal options with a hairline rule.
function SectionHeader({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 mt-12 mb-4 first:mt-0">
      <span className="text-[11px] uppercase font-semibold tracking-[2px] text-[#6B5E4F] flex-shrink-0">
        {label}
      </span>
      <span className="h-px flex-1 bg-[#E8E2DA]" />
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Brand-styled category picker — matches Compare Pricing's inputs (no native <select>).
function CategorySelect({ value, onChange }: {
  value: DisplacementCategoryId;
  onChange: (v: DisplacementCategoryId) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = DISPLACEMENT_CATEGORIES.find((c) => c.id === value) ?? DISPLACEMENT_CATEGORIES[0];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 flex items-center justify-between gap-2 bg-white border border-[#E8E2DA] rounded-lg px-3 text-sm text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
      >
        <span className="truncate">{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#8C7E6E] flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full min-w-[220px] bg-white border border-[#E8E2DA] rounded-lg shadow-lg py-1 max-h-72 overflow-auto">
            {DISPLACEMENT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F5F0EB] transition-colors flex items-baseline justify-between gap-2 ${
                  c.id === value ? "text-[#EA2C00] font-medium" : "text-[#1A1A1A]"
                }`}
              >
                <span>{c.label}</span>
                {c.hint && <span className="text-[10px] text-[#A39888] flex-shrink-0">{c.hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DealCard({
  deal, index, volumes, annualValueEstimate, advanced, vendors, displacementOn, isLowest, lowestCost, onUpdate, onRemove, canRemove,
}: {
  deal: DealOption;
  index: number;
  volumes: VolumeInputs;
  annualValueEstimate: number;
  advanced: boolean;
  vendors: DisplacedVendor[];
  displacementOn: boolean;
  isLowest: boolean;
  lowestCost: number | null;
  onUpdate: (updates: Partial<DealOption>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const color = DEAL_COLORS[index] ?? DEAL_COLORS[0];
  const colorLight = DEAL_COLORS_LIGHT[index] ?? DEAL_COLORS_LIGHT[0];

  const result = useMemo(
    () => computeDealResult(deal, volumes, annualValueEstimate),
    [deal, volumes, annualValueEstimate],
  );

  const net = useMemo(() => computeNetResult(result, vendors), [result, vendors]);
  const showNet = displacementOn && net.totalDisplaced > 0;

  // Gap vs the cheapest option, on the same basis the scoreboard ranks by (net when displacing).
  const dealCost = displacementOn ? net.netTotalContract : result.totalContractCost;
  const deltaVsLowest = lowestCost !== null && result.totalContractCost > 0 ? dealCost - lowestCost : 0;

  const scenarios = useMemo(() => computeUsageScenarios(deal, volumes), [deal, volumes]);

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
      className={`bg-white rounded-2xl border overflow-hidden flex flex-col transition-shadow ${
        isLowest ? "border-[#EA2C00] shadow-[0_10px_34px_rgba(234,44,0,0.13)]" : "border-[#E8E2DA]"
      }`}
    >
      <div className="h-1.5" style={{ backgroundColor: color }} />

      <div className="p-6 flex flex-col flex-1 gap-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={deal.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="flex-1 min-w-0 text-lg font-bold text-[#1A1A1A] bg-transparent outline-none border-b border-transparent focus:border-[#E8E2DA] transition-colors placeholder-[#A39888]"
            placeholder="Deal label"
          />
          {isLowest && (
            <motion.span
              layoutId="lowest-deal-badge"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="flex-shrink-0 inline-flex items-center rounded-full text-white text-[10px] font-bold uppercase tracking-[0.5px] px-2 py-0.5"
              style={{ backgroundColor: "#EA2C00" }}
            >
              Lowest
            </motion.span>
          )}
          {canRemove && (
            <button type="button" onClick={onRemove}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F5F0EB] text-[#8C7E6E] hover:text-[#1A1A1A] transition-colors"
              aria-label="Remove deal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pricing model */}
        <div>
          <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-2">Pricing Model</p>
          <div className="flex flex-col gap-1.5">
            {PRICING_MODELS.map((pm) => (
              <button key={pm.value} type="button" onClick={() => onUpdate({ model: pm.value })}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-left transition-all border ${
                  deal.model === pm.value
                    ? "border-[#1A1A1A] text-[#1A1A1A] font-medium"
                    : "border-[#E8E2DA] bg-white text-[#666666] hover:bg-[#F5F0EB]"
                }`}
                style={deal.model === pm.value ? { backgroundColor: colorLight } : {}}
              >
                <span className={`w-3 h-3 rounded-full border flex-shrink-0 transition-all ${
                  deal.model === pm.value ? "border-[#1A1A1A] bg-[#1A1A1A]" : "border-[#A39888] bg-white"
                }`} />
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price inputs */}
        {deal.model === "platform" ? (
          <div>
            <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-2">Pricing</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-[#8C7E6E] mb-1">Platform Fee</p>
                <div className="flex items-center bg-white border border-[#E8E2DA] rounded-lg focus-within:border-[#EA2C00] transition-colors overflow-hidden">
                  <span className="pl-3 text-sm text-[#A39888]">$</span>
                  <input type="text" inputMode="numeric"
                    value={deal.platformFee ? deal.platformFee.toLocaleString("en-US") : ""}
                    placeholder="0"
                    onChange={(e) => onUpdate({ platformFee: parseFloat(e.target.value.replace(/,/g, "")) || 0 })}
                    className="flex-1 px-2 py-2.5 text-sm bg-transparent outline-none"
                  />
                  <span className="pr-2 text-xs text-[#A39888]">/yr</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#8C7E6E] mb-1">Per Encounter</p>
                <div className="flex items-center bg-white border border-[#E8E2DA] rounded-lg focus-within:border-[#EA2C00] transition-colors overflow-hidden">
                  <span className="pl-3 text-sm text-[#A39888]">$</span>
                  <input type="text" inputMode="numeric"
                    value={deal.unitPrice ? deal.unitPrice.toLocaleString("en-US") : ""}
                    placeholder="0"
                    onChange={(e) => onUpdate({ unitPrice: parseFloat(e.target.value.replace(/,/g, "")) || 0 })}
                    className="flex-1 px-2 py-2.5 text-sm bg-transparent outline-none"
                  />
                  <span className="pr-2 text-xs text-[#A39888]">/enc</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-2">Unit Price</p>
            <NumberInput
              value={deal.unitPrice}
              onChange={(v) => onUpdate({ unitPrice: v })}
              prefix="$"
              suffix={deal.model === "perProviderMonth" ? "/provider/mo" : deal.model === "perEncounterAnnual" ? "/encounter" : "/year"}
              className="w-full"
            />
          </div>
        )}

        {/* Contract term + escalator */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-2">Contract Term</p>
            <PillToggle
              options={CONTRACT_TERMS.map((t) => ({ label: t.label, value: t.months }))}
              value={deal.contractTermMonths}
              onChange={(months) => {
                const newYears = Math.ceil(months / 12);
                const defaultVol = deal.model === "perEncounterAnnual" || deal.model === "platform"
                  ? volumes.annualEncounters : volumes.providerCount;
                onUpdate({ contractTermMonths: months, yearConfigs: syncYearConfigs(deal.yearConfigs, newYears, defaultVol) });
              }}
            />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-2">Annual Escalator</p>
            <PillToggle
              options={ESCALATORS.map((e) => ({ label: e.label, value: e.pct }))}
              value={deal.escalatorPct}
              onChange={(v) => onUpdate({ escalatorPct: v })}
            />
          </div>
        </div>

        {/* Per-year provisioned table */}
        <div className="rounded-xl overflow-hidden border border-[#E8E2DA]">
          <div className="px-4 py-2.5 border-b border-[#E8E2DA]" style={{ backgroundColor: colorLight }}>
            <p className="text-[10px] uppercase font-semibold tracking-widest" style={{ color }}>
              {deal.model === "enterpriseFlat" ? "Annual Cost" : advanced ? "Provisioned Volume & Cost" : "Cost by Year"}
            </p>
          </div>
          <div className="divide-y divide-[#F0EAE3]">
            {result.years.map((yr, idx) => (
              <div key={yr.year} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8C7E6E] w-11 flex-shrink-0">Yr {yr.year}</span>
                  {advanced && showVolumeInput && (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={(deal.yearConfigs[idx]?.provisionedVolume ?? 0) === 0 ? "" : (deal.yearConfigs[idx]?.provisionedVolume ?? 0).toLocaleString("en-US")}
                      onChange={(e) => {
                        const newConfigs = [...deal.yearConfigs];
                        newConfigs[idx] = { provisionedVolume: parseFloat(e.target.value.replace(/,/g, "")) || 0 };
                        onUpdate({ yearConfigs: newConfigs });
                      }}
                      placeholder={orgVolumeForModel(volumes, deal.model) > 0 ? orgVolumeForModel(volumes, deal.model).toLocaleString("en-US") : "0"}
                      className="w-20 px-2 py-0.5 text-xs bg-white border border-[#E8E2DA] rounded-md focus:border-[#EA2C00] outline-none text-center"
                    />
                  )}
                  {advanced && showVolumeInput && (
                    <span className="text-[10px] text-[#A39888] flex-shrink-0">{volumeLabel(deal.model)}</span>
                  )}
                  <span className="ml-auto text-sm font-semibold text-[#1A1A1A]">{fmt(yr.annualCost)}</span>
                </div>
                {/* Platform fee breakdown */}
                {deal.model === "platform" && yr.platformFeePortion > 0 && (
                  <div className="flex items-center justify-between mt-1 pl-11">
                    <span className="text-[10px] text-[#A39888]">
                      {fmtFull(yr.platformFeePortion)} platform + {fmtFull(yr.volumeCostPortion)} encounters
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E2DA] bg-[#FAFAF8]">
            <span className="text-xs font-bold text-[#1A1A1A]">Total Contract</span>
            <AnimatedNumber value={result.totalContractCost} format={fmt} className="text-base font-bold tabular-nums" style={{ color }} />
          </div>
          {showNet && (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-t border-[#F0EAE3]">
                <span className="text-xs text-[#8C7E6E]">− Displaced spend</span>
                <AnimatedNumber value={net.totalDisplaced} format={(n) => `−${fmt(n)}`} className="text-xs font-medium text-[#8C7E6E] tabular-nums" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E2DA] bg-[#FFF0ED]">
                <span className="text-xs font-bold text-[#1A1A1A]">Net contract</span>
                <AnimatedNumber value={net.netTotalContract} format={fmt} className="text-base font-bold tabular-nums" style={{ color: "#EA2C00" }} />
              </div>
            </>
          )}
          {!isLowest && deltaVsLowest > 0 && (
            <div className="flex items-center justify-end gap-1 px-4 py-1.5 border-t border-[#F0EAE3]">
              <span className="text-[11px] font-semibold text-[#8C7E6E] tabular-nums">
                +<AnimatedNumber value={deltaVsLowest} format={fmt} /> vs lowest
              </span>
            </div>
          )}
          {result.costPerProvider !== null && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#F0EAE3]">
              <span className="text-xs text-[#8C7E6E]">Effective cost / provider</span>
              <span className="text-xs font-medium text-[#666666] tabular-nums">{fmt(result.costPerProvider)}</span>
            </div>
          )}
          {result.costPerEncounter !== null && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#F0EAE3]">
              <span className="text-xs text-[#8C7E6E]">Effective cost / encounter</span>
              <span className="text-xs font-medium text-[#666666] tabular-nums">${result.costPerEncounter.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Overage handling — advanced only */}
        {advanced && deal.model !== "enterpriseFlat" && (
          <div>
            <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-2">If Usage Exceeds Provisioned</p>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {(["hardCap", "billedPerUnit", "included"] as OverageModel[]).map((m) => (
                <button key={m} onClick={() => onUpdate({ overageModel: m })}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    deal.overageModel === m
                      ? "text-white"
                      : "bg-white border border-[#E8E2DA] text-[#6B5E4F] hover:border-[#EA2C00]"
                  }`}
                  style={deal.overageModel === m ? { backgroundColor: color } : {}}
                >
                  {m === "hardCap" ? "Hard cap" : m === "billedPerUnit" ? "Bill overage" : "Included"}
                </button>
              ))}
            </div>
            {deal.overageModel === "billedPerUnit" && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-[#8C7E6E] flex-shrink-0">Overage rate</span>
                <div className="flex items-center bg-white border border-[#E8E2DA] rounded-lg focus-within:border-[#EA2C00] transition-colors overflow-hidden">
                  <span className="pl-2.5 text-xs text-[#A39888]">$</span>
                  <input type="text" inputMode="numeric"
                    value={deal.overageUnitPrice ? deal.overageUnitPrice.toLocaleString("en-US") : ""}
                    onChange={(e) => onUpdate({ overageUnitPrice: parseFloat(e.target.value.replace(/,/g, "")) || 0 })}
                    placeholder="0"
                    className="w-16 px-1.5 py-1.5 text-xs bg-transparent outline-none"
                  />
                  <span className="pr-2 text-[10px] text-[#A39888]">/{volumeLabel(deal.model)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Usage scenarios — advanced only */}
        {advanced && scenarios.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest">Usage Scenarios</p>
              <div className="group relative">
                <Info className="w-3 h-3 text-[#A39888] cursor-help" />
                <div className="absolute bottom-5 left-0 hidden group-hover:block z-10 w-56 bg-[#1A1A1A] text-white text-xs rounded-lg p-2.5 leading-relaxed shadow-xl">
                  Based on Year 1 provisioned volume at different utilization levels. "Over Provisioned" shows what happens at 125% of your contracted volume.
                </div>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-[#E8E2DA]">
              <div className="grid grid-cols-3 text-center">
                {scenarios.map((s, si) => {
                  const isOver = s.utilizationPct > 100;
                  const hasOverage = s.overageCost > 0;
                  return (
                    <div key={s.label}
                      className={`p-3 ${si < scenarios.length - 1 ? "border-r border-[#E8E2DA]" : ""} ${isOver ? "bg-[#FFF8F6]" : "bg-white"}`}
                    >
                      <p className="text-[10px] font-medium text-[#8C7E6E] mb-0.5">{s.label}</p>
                      <p className="text-[10px] text-[#A39888] mb-1.5">{s.utilizationPct}% usage</p>
                      <p className="text-sm font-bold text-[#1A1A1A]">{fmt(s.totalCost)}</p>
                      {hasOverage && (
                        <p className="text-[10px] text-[#EA2C00] mt-0.5">+{fmt(s.overageCost)} overage</p>
                      )}
                      {isOver && !hasOverage && deal.overageModel === "hardCap" && (
                        <p className="text-[10px] text-[#8C7E6E] mt-0.5">capped</p>
                      )}
                      {isOver && !hasOverage && deal.overageModel === "included" && (
                        <p className="text-[10px] text-[#2D6F6B] mt-0.5">no extra</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ROI metrics (when value is set) */}
        {annualValueEstimate > 0 && result.vtcYear1 !== null && (
          <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: color, backgroundColor: colorLight }}>
            <p className="text-[10px] uppercase font-semibold tracking-widest" style={{ color }}>ROI at This Price</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-[#8C7E6E] mb-0.5">Year 1 ROI</p>
                <p className="text-base font-bold text-[#1A1A1A]">{result.vtcYear1.toFixed(1)}×</p>
              </div>
              {result.termVtc !== null && (
                <div>
                  <p className="text-[10px] text-[#8C7E6E] mb-0.5">Term ROI</p>
                  <p className="text-base font-bold text-[#1A1A1A]">{result.termVtc.toFixed(1)}×</p>
                </div>
              )}
              {result.paybackMonths !== null && (
                <div>
                  <p className="text-[10px] text-[#8C7E6E] mb-0.5">Payback</p>
                  <p className="text-base font-bold text-[#1A1A1A]">{result.paybackMonths} months</p>
                </div>
              )}
            </div>
            {result.annualRoiPct !== null && (
              <div className="flex items-center justify-between pt-1 border-t border-[#E8E2DA]">
                <span className="text-xs text-[#8C7E6E]">Annual ROI</span>
                <span className="text-sm font-bold" style={{ color }}>
                  {result.annualRoiPct >= 0 ? "+" : ""}{Math.round(result.annualRoiPct)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function RoiAnalysisSection({
  deals, volumes, annualValueEstimate, vendors, displacementOn,
}: {
  deals: DealOption[];
  volumes: VolumeInputs;
  annualValueEstimate: number;
  vendors: DisplacedVendor[];
  displacementOn: boolean;
}) {
  const results = deals.map((d) => computeDealResult(d, volumes, annualValueEstimate));
  const nets = results.map((r) => computeNetResult(r, vendors));
  const showNet = displacementOn && nets.some((n) => n.totalDisplaced > 0);
  // ROI / payback are computed on GROSS Abridge cost — never net of displacement. Displaced
  // spend is shown separately (the net-cost rows + switch-economics block) so it can never
  // inflate the ROI multiple. Keeps the ratio bulletproof against "you're juicing it."

  // Chart data: one entry per year of the longest contract. When displacement is on,
  // the bars show net cost by year (gross − displaced).
  const maxYears = Math.max(...deals.map((d) => Math.ceil(d.contractTermMonths / 12)));
  const chartData = Array.from({ length: maxYears }, (_, i) => {
    const entry: Record<string, number | string> = { year: `Year ${i + 1}` };
    deals.forEach((deal, di) => {
      const yr = results[di].years[i];
      const gross = yr ? yr.annualCost : 0;
      if (showNet) {
        const yrNet = nets[di].netByYear[i] ?? gross;
        // net (solid) + displaced (shaded) stack to the gross bar height, so you see the takeout.
        entry[`${deal.label} (net)`] = yrNet;
        entry[`${deal.label} (displaced)`] = Math.max(0, gross - yrNet);
      } else {
        entry[deal.label] = gross;
      }
    });
    return entry;
  });

  const hasValue = annualValueEstimate > 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2DA] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E8E2DA] bg-[#FAFAF8]">
        <div className="w-8 h-8 rounded-full bg-[#F5F0EB] flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-[#EA2C00]" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-[#1A1A1A]">Total Cost of Ownership</h2>
          <p className="text-xs text-[#8C7E6E]">Full cost per option side by side. Add a value estimate to layer in ROI.</p>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Multi-year cost chart */}
        <div>
          <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-1">{showNet ? "Cost by Year — net vs displaced" : "Annual Cost by Year"}</p>
          {showNet && <p className="text-[11px] text-[#A39888] mb-3">Solid = net cost you pay · shaded = spend displaced from existing vendors</p>}
          {!showNet && maxYears > 1 && <p className="text-[11px] text-[#A39888] mb-3">Each bar includes that deal's annual price escalator — see "Cost growth" in the table below.</p>}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE3" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#8C7E6E" }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => fmt(v)}
                tick={{ fontSize: 10, fill: "#8C7E6E" }}
                axisLine={false} tickLine={false} width={56}
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [fmtFull(value), name]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8E2DA", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              {showNet
                ? deals.flatMap((deal, di) => [
                    <Bar key={`${deal.id}-net`} dataKey={`${deal.label} (net)`} stackId={deal.id} fill={DEAL_COLORS[di] ?? DEAL_COLORS[0]} radius={[0, 0, 0, 0]} />,
                    <Bar key={`${deal.id}-disp`} dataKey={`${deal.label} (displaced)`} stackId={deal.id} fill={DEAL_COLORS[di] ?? DEAL_COLORS[0]} fillOpacity={0.22} radius={[3, 3, 0, 0]} legendType="none" />,
                  ])
                : deals.map((deal, di) => (
                    <Bar key={deal.id} dataKey={deal.label} fill={DEAL_COLORS[di] ?? DEAL_COLORS[0]} radius={[3, 3, 0, 0]} />
                  ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison table */}
        <div>
          <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-3">Side-by-Side Comparison</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E2DA]">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-[#8C7E6E] w-36">Metric</th>
                  {deals.map((deal, di) => (
                    <th key={deal.id} className="text-right py-2 px-3 text-xs font-bold" style={{ color: DEAL_COLORS[di] }}>
                      {deal.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F0EB]">
                <tr>
                  <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Total Contract Cost</td>
                  {results.map((r, ri) => (
                    <td key={ri} className="py-2.5 px-3 text-right text-sm font-semibold text-[#1A1A1A] tabular-nums">
                      {fmt(r.totalContractCost)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Avg Annual Cost</td>
                  {results.map((r, ri) => (
                    <td key={ri} className="py-2.5 px-3 text-right text-sm text-[#666666] tabular-nums">
                      {fmt(r.averageAnnualCost)}
                    </td>
                  ))}
                </tr>
                {maxYears > 1 && (
                  <tr>
                    <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Cost growth · Y1→Y{maxYears}</td>
                    {results.map((r, ri) => {
                      const first = r.years[0]?.annualCost ?? 0;
                      const last = r.years[r.years.length - 1]?.annualCost ?? 0;
                      const g = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
                      return (
                        <td key={ri} className="py-2.5 px-3 text-right text-sm tabular-nums" style={{ color: g > 0 ? "#B0411F" : "#8C9A6E" }}>
                          {first <= 0 ? "—" : g > 0 ? `+${g}%` : g < 0 ? `${g}%` : "Flat"}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {showNet && (
                  <>
                    <tr>
                      <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Displaced / yr</td>
                      {nets.map((nr, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right text-sm text-[#8C7E6E] tabular-nums">
                          −{fmt(nr.totalDisplaced / Math.max(1, results[ri].years.length))}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t-2 border-[#E8E2DA]">
                      <td className="py-2.5 pr-4 text-xs font-semibold text-[#1A1A1A]">Net Contract Cost</td>
                      {nets.map((nr, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right text-sm font-bold tabular-nums" style={{ color: "#EA2C00" }}>
                          {fmt(nr.netTotalContract)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Net Annual Cost</td>
                      {nets.map((nr, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right text-sm text-[#666666] tabular-nums">
                          {fmt(nr.netAverageAnnual)}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
                {results.some((r) => r.costPerProvider !== null) && (
                  <tr>
                    <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Cost / Provider</td>
                    {results.map((r, ri) => (
                      <td key={ri} className="py-2.5 px-3 text-right text-sm text-[#666666] tabular-nums">
                        {r.costPerProvider !== null ? fmt(r.costPerProvider) : "—"}
                      </td>
                    ))}
                  </tr>
                )}
                {results.some((r) => r.costPerEncounter !== null) && (
                  <tr>
                    <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Cost / Encounter</td>
                    {results.map((r, ri) => (
                      <td key={ri} className="py-2.5 px-3 text-right text-sm text-[#666666] tabular-nums">
                        {r.costPerEncounter !== null ? `$${r.costPerEncounter.toFixed(2)}` : "—"}
                      </td>
                    ))}
                  </tr>
                )}
                {hasValue && (
                  <>
                    <tr className="border-t-2 border-[#E8E2DA]">
                      <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Annual Value</td>
                      {results.map((_, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right text-sm text-[#1A1A1A] tabular-nums">
                          {fmt(annualValueEstimate)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Year 1 ROI</td>
                      {results.map((r, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right text-sm font-semibold tabular-nums" style={{ color: DEAL_COLORS[ri] }}>
                          {r.vtcYear1 !== null ? `${r.vtcYear1.toFixed(1)}×` : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Term ROI</td>
                      {results.map((r, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right text-sm font-semibold tabular-nums" style={{ color: DEAL_COLORS[ri] }}>
                          {r.termVtc !== null ? `${r.termVtc.toFixed(1)}×` : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Annual ROI</td>
                      {results.map((r, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right text-sm font-bold tabular-nums" style={{ color: DEAL_COLORS[ri] }}>
                          {r.annualRoiPct !== null ? `${r.annualRoiPct >= 0 ? "+" : ""}${Math.round(r.annualRoiPct)}%` : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Payback Period</td>
                      {results.map((r, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right text-sm font-semibold tabular-nums" style={{ color: DEAL_COLORS[ri] }}>
                          {r.paybackMonths !== null ? `${r.paybackMonths} months` : "—"}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          {!hasValue && (
            <p className="text-xs text-[#A39888] mt-3 italic">
              Enter an annual value estimate above to unlock ROI and payback comparisons.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PricingComparisonFlow({ onBack, onHome }: PricingComparisonFlowProps) {
  const [partnerName, setPartnerName] = useState("");
  const [volumes, setVolumes] = useState<VolumeInputs>({ providerCount: 0, annualEncounters: 0, staffedBeds: 0 });
  const [deals, setDeals] = useState<DealOption[]>([
    makeDefaultDeal("Option A", "deal-a"),
    makeDefaultDeal("Option B", "deal-b"),
  ]);
  const [annualValueEstimate, setAnnualValueEstimate] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [displacementOn, setDisplacementOn] = useState(false);
  const [vendors, setVendors] = useState<DisplacedVendor[]>([]);
  // Once the Switch-savings panel finishes expanding, let it show overflow so the
  // category dropdown isn't clipped by the height-animation's overflow-hidden.
  const [vendorPanelSettled, setVendorPanelSettled] = useState(false);

  const addVendor = () => setVendors((p) => [...p, makeDefaultVendor(`v-${Date.now()}`)]);
  const updateVendor = (id: string, u: Partial<DisplacedVendor>) =>
    setVendors((p) => p.map((v) => (v.id === id ? { ...v, ...u } : v)));
  const removeVendor = (id: string) => setVendors((p) => p.filter((v) => v.id !== id));
  const toggleDisplacement = () =>
    setDisplacementOn((on) => {
      const next = !on;
      if (next && vendors.length === 0) setVendors([makeDefaultVendor(`v-${Date.now()}`)]);
      return next;
    });
  const totalDisplacedAtScale = useMemo(
    () => vendors.reduce((s, v) => s + vendorDisplacedAnnual(v), 0),
    [vendors],
  );

  // Total-cost-of-ownership verdict across the deals (the lead). When displacement is on,
  // the lead becomes the lowest NET cost after takeout.
  const verdict = useMemo(() => {
    const priced = deals
      .map((d) => {
        const result = computeDealResult(d, volumes, annualValueEstimate);
        const net = computeNetResult(result, vendors);
        return { deal: d, result, net, termVtc: result.termVtc };
      })
      .filter((x) => x.result.totalContractCost > 0);
    if (priced.length < 2) return null;
    const cost = (x: (typeof priced)[number]) => (displacementOn ? x.net.netTotalContract : x.result.totalContractCost);
    const sorted = [...priced].sort((a, b) => cost(a) - cost(b));
    const cheapest = sorted[0];
    const runnerUp = sorted[1];
    const savings = cost(runnerUp) - cost(cheapest);
    const bestRoi = annualValueEstimate > 0
      ? [...priced].sort((a, b) => (b.termVtc ?? 0) - (a.termVtc ?? 0))[0]
      : null;
    const termYears = Math.max(1, Math.ceil(cheapest.deal.contractTermMonths / 12));
    const lowestCost = cost(cheapest);
    return { cheapest, runnerUp, savings, bestRoi, termYears, lowestCost };
  }, [deals, volumes, annualValueEstimate, vendors, displacementOn]);

  const updateDeal = (id: string, updates: Partial<DealOption>) => {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const removeDeal = (id: string) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  const addDealC = () => {
    setDeals((prev) => [...prev, makeDefaultDeal("Option C", `deal-c-${Date.now()}`)]);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <UnifiedHeader
        pathType="forecast"
        currentStep={1}
        totalSteps={1}
        stepName="Compare Pricing"
        onBack={onBack}
        onHome={onHome}
        stepLabels={["Compare Pricing"]}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] uppercase font-medium text-[#EA2C00] mb-2" style={{ letterSpacing: "2.5px" }}>
              Deal Cost Comparison
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-2">Compare Pricing Options</h1>
            <p className="text-sm text-[#666666] max-w-lg leading-relaxed">
              Model deal structures side by side — cost, escalation, usage scenarios, and ROI in one view.
            </p>
          </div>
          <div className="sm:flex-shrink-0 sm:w-64">
            <label className={`${KICKER} block mb-1.5`}>Partner Name</label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="e.g. Memorial Health"
              className="w-full h-10 bg-white border border-[#E8E2DA] rounded-lg px-3 text-sm text-[#1A1A1A] outline-none placeholder-[#A39888] focus:border-[#1A1A1A] transition-colors"
            />
          </div>
        </div>

        {/* Live scoreboard — pinned readout of whatever's configured (updates as they tweak) */}
        {verdict && (
          <div className="sticky top-14 sm:top-16 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-[#F7F6F3]/90 backdrop-blur-md border-b border-[#E8E2DA]">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="inline-flex items-baseline gap-2">
                <span className={KICKER}>
                  {displacementOn && verdict.cheapest.net.totalDisplaced > 0 ? "Lowest net" : "Lowest cost"}
                </span>
                <span className="text-sm font-bold text-[#1A1A1A]">{verdict.cheapest.deal.label}</span>
                <AnimatedNumber
                  value={displacementOn ? verdict.cheapest.net.netTotalContract : verdict.cheapest.result.totalContractCost}
                  format={fmtFull}
                  className="text-sm font-bold tabular-nums"
                  style={{ color: "#EA2C00" }}
                />
                <span className="text-xs text-[#8C7E6E]">/ {verdict.termYears} yr{verdict.termYears === 1 ? "" : "s"}</span>
              </span>
              {verdict.savings > 0 && (
                <span className="text-xs text-[#666666]">saves <AnimatedNumber value={verdict.savings} format={fmtFull} className="font-semibold text-[#1A1A1A] tabular-nums" /> vs next</span>
              )}
              {verdict.bestRoi && verdict.bestRoi.termVtc !== null && (
                <span className="text-xs text-[#666666]">best ROI <span className="font-semibold text-[#1A1A1A] tabular-nums">{verdict.bestRoi.termVtc.toFixed(1)}×</span></span>
              )}
              {displacementOn && verdict.cheapest.net.totalDisplaced > 0 && (
                <span className="text-xs text-[#666666]"><span className="font-semibold tabular-nums" style={{ color: "#EA2C00" }}>{Math.round(verdict.cheapest.net.pctCovered)}%</span> covered by current spend</span>
              )}
            </div>
          </div>
        )}

        {/* SETUP — their world today: volume, value baseline, displaceable spend */}
        <SectionHeader label="Setup · their world today" />
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-5 mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={FIELD_LABEL}>Providers</label>
              <NumberInput value={volumes.providerCount} onChange={(v) => setVolumes((p) => ({ ...p, providerCount: v }))} suffix="providers" className="w-full" />
            </div>
            <div>
              <label className={FIELD_LABEL}>Annual Encounters</label>
              <NumberInput value={volumes.annualEncounters} onChange={(v) => setVolumes((p) => ({ ...p, annualEncounters: v }))} suffix="encounters/yr" className="w-full" />
            </div>
            <div>
              <label className={FIELD_LABEL}>Staffed Beds (Nursing)</label>
              <NumberInput value={volumes.staffedBeds} onChange={(v) => setVolumes((p) => ({ ...p, staffedBeds: v }))} suffix="beds" className="w-full" />
            </div>
            <div>
              <label className={FIELD_LABEL}>Annual Value Estimate</label>
              <NumberInput value={annualValueEstimate} onChange={setAnnualValueEstimate} prefix="$" suffix="/yr" placeholder="0" className="w-full" />
            </div>
          </div>
          <p className="text-xs text-[#A39888] mt-3 leading-relaxed">
            Value estimate unlocks ROI and payback comparisons — use Measure to calculate it, or enter an estimate.
          </p>
        </div>

        {/* Switch savings — optional displacement bolt-on (part of Setup) */}
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-5 mb-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]">Switch savings <span className="font-medium text-[#A39888]">· optional</span></p>
              <p className="text-xs text-[#8C7E6E] mt-0.5 max-w-xl leading-relaxed">
                Switching from existing tech? Add what they'd retire — each option shows its net after takeout, applied over the contract years.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleDisplacement}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors flex-shrink-0 ${
                displacementOn ? "bg-[#EA2C00] text-white border-[#EA2C00]" : "bg-white text-[#6B5E4F] border-[#E8E2DA] hover:border-[#1A1A1A]"
              }`}
              data-testid="button-switch-savings"
            >
              {displacementOn ? "On" : "Off"}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {displacementOn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className={vendorPanelSettled ? "overflow-visible" : "overflow-hidden"}
                onAnimationStart={() => setVendorPanelSettled(false)}
                onAnimationComplete={() => setVendorPanelSettled(true)}
              >
                <div className="mt-5 pt-5 border-t border-[#F0EAE3]">
                  <p className="text-[10px] uppercase font-semibold text-[#EA2C00] tracking-widest mb-3">What they pay today</p>
                  <div className="space-y-2.5">
                    {vendors.map((v) => (
                      <div key={v.id} className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1.3fr_auto_auto] gap-2.5 items-start">
                        <div className="space-y-1.5">
                          <CategorySelect
                            value={v.category}
                            onChange={(cat) => {
                              const meta = DISPLACEMENT_CATEGORIES.find((c) => c.id === cat);
                              updateVendor(v.id, { category: cat, label: meta && cat !== "custom" ? meta.label : "" });
                            }}
                          />
                          {v.category === "custom" && (
                            <input
                              type="text"
                              value={v.label}
                              onChange={(e) => updateVendor(v.id, { label: e.target.value })}
                              placeholder="Name this vendor"
                              className="w-full h-9 bg-white border border-[#E8E2DA] rounded-lg px-3 text-sm text-[#1A1A1A] outline-none placeholder-[#A39888] focus:border-[#1A1A1A] transition-colors"
                            />
                          )}
                        </div>
                        <NumberInput value={v.annualSpend} onChange={(n) => updateVendor(v.id, { annualSpend: n })} prefix="$" placeholder="annual spend" className="w-full" />
                        <div className="flex items-center gap-2">
                          <input
                            type="range" min={0} max={100} value={v.displacementPct}
                            onChange={(e) => updateVendor(v.id, { displacementPct: parseInt(e.target.value, 10) })}
                            className="flex-1 accent-[#EA2C00] cursor-pointer"
                            aria-label="Percent displaced"
                          />
                          <span className="text-xs font-semibold text-[#EA2C00] w-11 text-right tabular-nums">{v.displacementPct}%</span>
                        </div>
                        <PillToggle
                          options={[{ label: "Now", value: 0 }, { label: "6mo", value: 6 }, { label: "1yr", value: 12 }, { label: "2yr", value: 24 }]}
                          value={v.transitionMonths}
                          onChange={(m) => updateVendor(v.id, { transitionMonths: m })}
                        />
                        <button
                          type="button" onClick={() => removeVendor(v.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F5F0EB] text-[#8C7E6E] hover:text-[#1A1A1A] transition-colors justify-self-end"
                          aria-label="Remove vendor"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                    <button type="button" onClick={addVendor} className="text-xs font-semibold text-[#EA2C00] hover:text-[#C42600] transition-colors">+ Add vendor</button>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest">Displaceable / yr at scale</span>
                      <span className="text-lg font-bold text-[#1A1A1A] tabular-nums">{fmt(totalDisplacedAtScale)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BUILD THE DEALS — the playground: tweak pricing models + costs, compare side by side */}
        <SectionHeader
          label="Build the deals"
          action={
            <button
              type="button"
              onClick={() => setAdvanced((a) => !a)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                advanced ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#6B5E4F] border-[#E8E2DA] hover:border-[#1A1A1A]"
              }`}
              data-testid="button-advanced-provisioning"
            >
              {advanced ? "Hide" : "Show"} provisioning & usage
            </button>
          }
        />
        <div className="mb-2">
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {deals.map((deal, index) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  index={index}
                  volumes={volumes}
                  annualValueEstimate={annualValueEstimate}
                  advanced={advanced}
                  vendors={vendors}
                  displacementOn={displacementOn}
                  isLowest={verdict?.cheapest.deal.id === deal.id}
                  lowestCost={verdict?.lowestCost ?? null}
                  onUpdate={(updates) => updateDeal(deal.id, updates)}
                  onRemove={() => removeDeal(deal.id)}
                  canRemove={deals.length > 2}
                />
              ))}

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
                  className="rounded-2xl border-2 border-dashed border-[#E8E2DA] bg-white/60 hover:bg-white hover:border-[#A39888] transition-all flex items-center justify-center min-h-[200px] text-[#8C7E6E] hover:text-[#1A1A1A] gap-2 text-sm font-medium"
                >
                  <span className="text-lg leading-none">+</span>
                  Add Option C
                </motion.button>
              )}
            </div>
          </AnimatePresence>
        </div>

        {/* HOW IT PANS OUT — 3-year cost growth + ROI, then the switch takeout */}
        <SectionHeader label="How it pans out" />
        {verdict && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-[#1A1A1A] text-white p-5 sm:p-6 mb-4"
          >
            <p className="text-[10px] uppercase font-semibold tracking-widest text-white/40 mb-2">The read</p>
            <p className="text-sm sm:text-[15px] leading-relaxed text-white/90">
              {buildDealInsight({
                cheapestLabel: verdict.cheapest.deal.label,
                cheapestModelLabel: PRICING_MODEL_LABELS[verdict.cheapest.deal.model],
                cheapestCost: displacementOn ? verdict.cheapest.net.netTotalContract : verdict.cheapest.result.totalContractCost,
                termYears: verdict.termYears,
                savings: verdict.savings,
                runnerUpLabel: verdict.runnerUp?.deal.label ?? null,
                displaced: displacementOn ? verdict.cheapest.net.totalDisplaced : 0,
                pctCovered: displacementOn ? verdict.cheapest.net.pctCovered : 0,
                termVtc: annualValueEstimate > 0 ? verdict.cheapest.termVtc : null,
                fmtMoney: fmt,
              })}
            </p>
          </motion.div>
        )}
        <RoiAnalysisSection
          deals={deals}
          volumes={volumes}
          annualValueEstimate={annualValueEstimate}
          vendors={vendors}
          displacementOn={displacementOn}
        />

        {/* Switch economics — before → after (the takeout moment) */}
        {displacementOn && verdict && totalDisplacedAtScale > 0 && (() => {
          const best = verdict.cheapest;
          const grossAnnual = best.result.averageAnnualCost;
          const displacedAnnual = totalDisplacedAtScale;
          const netAnnual = Math.max(0, grossAnnual - displacedAnnual);
          const pct = grossAnnual > 0 ? Math.min(100, Math.round((displacedAnnual / grossAnnual) * 100)) : 0;
          const active = vendors.filter((v) => v.annualSpend > 0 && v.displacementPct > 0);
          const labelFor = (v: DisplacedVendor) =>
            v.category === "custom" ? (v.label || "Custom") : (DISPLACEMENT_CATEGORIES.find((c) => c.id === v.category)?.label ?? v.label);
          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-[#E8E2DA] p-5 sm:p-6 mt-6"
            >
              <p className={`${KICKER} mb-4`}>Switch economics · {best.deal.label}</p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                <div className="rounded-xl bg-[#F5F0EB] p-4">
                  <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-2.5">What they pay today</p>
                  {active.map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-black/[0.06] last:border-0 text-sm">
                      <span className="text-[#666666] truncate pr-2">{labelFor(v)}</span>
                      <span className="font-semibold text-[#1A1A1A] tabular-nums">{fmt(vendorDisplacedAnnual(v))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t-2 border-[#1A1A1A] text-sm font-bold">
                    <span>Displaceable / yr</span><span className="tabular-nums">{fmt(displacedAnnual)}</span>
                  </div>
                </div>
                <div className="text-[#EA2C00] text-2xl font-bold text-center rotate-90 sm:rotate-0">&rarr;</div>
                <div className="rounded-xl border border-[#E8E2DA] p-4">
                  <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-2.5">With Abridge · / yr at scale</p>
                  <div className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-[#666666]">Abridge gross</span><span className="font-semibold text-[#1A1A1A] tabular-nums">{fmt(grossAnnual)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-[#666666]">&minus; Displaced spend</span><span className="font-semibold text-[#EA2C00] tabular-nums">&minus;{fmt(displacedAnnual)}</span>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-[#E8E2DA]">
                    <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest">Net new / yr</p>
                    <p className="text-3xl font-bold text-[#EA2C00] tabular-nums mt-0.5">{fmt(netAnnual)}</p>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-[#8C7E6E] mt-4">
                <span className="font-semibold text-[#1A1A1A]">{fmt(displacedAnnual)}</span> of Abridge is covered by spend they already make
                {" "}— <span className="font-semibold text-[#EA2C00]">{pct}%</span> covered.
              </p>
            </motion.div>
          );
        })()}
      </div>
    </div>
  );
}
