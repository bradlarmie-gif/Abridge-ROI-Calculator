import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Info } from "lucide-react";
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

function DealCard({
  deal, index, volumes, annualValueEstimate, onUpdate, onRemove, canRemove,
}: {
  deal: DealOption;
  index: number;
  volumes: VolumeInputs;
  annualValueEstimate: number;
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

  const scenarios = useMemo(() => computeUsageScenarios(deal), [deal]);

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
      className="bg-white rounded-2xl border border-[#E8E2DA] overflow-hidden flex flex-col"
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
              {deal.model === "enterpriseFlat" ? "Annual Cost" : "Provisioned Volume & Cost"}
            </p>
          </div>
          <div className="divide-y divide-[#F0EAE3]">
            {result.years.map((yr, idx) => (
              <div key={yr.year} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8C7E6E] w-11 flex-shrink-0">Yr {yr.year}</span>
                  {showVolumeInput && (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={(deal.yearConfigs[idx]?.provisionedVolume ?? 0) === 0 ? "" : (deal.yearConfigs[idx]?.provisionedVolume ?? 0).toLocaleString("en-US")}
                      onChange={(e) => {
                        const newConfigs = [...deal.yearConfigs];
                        newConfigs[idx] = { provisionedVolume: parseFloat(e.target.value.replace(/,/g, "")) || 0 };
                        onUpdate({ yearConfigs: newConfigs });
                      }}
                      placeholder="0"
                      className="w-20 px-2 py-0.5 text-xs bg-white border border-[#E8E2DA] rounded-md focus:border-[#EA2C00] outline-none text-center"
                    />
                  )}
                  {showVolumeInput && (
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
            <span className="text-base font-bold tabular-nums" style={{ color }}>{fmt(result.totalContractCost)}</span>
          </div>
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

        {/* Overage handling */}
        {deal.model !== "enterpriseFlat" && (
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

        {/* Usage scenarios */}
        {scenarios.length > 0 && (
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
                <p className="text-[10px] text-[#8C7E6E] mb-0.5">Year 1 VTC</p>
                <p className="text-base font-bold text-[#1A1A1A]">{result.vtcYear1.toFixed(1)}×</p>
              </div>
              {result.termVtc !== null && (
                <div>
                  <p className="text-[10px] text-[#8C7E6E] mb-0.5">Term VTC</p>
                  <p className="text-base font-bold text-[#1A1A1A]">{result.termVtc.toFixed(1)}×</p>
                </div>
              )}
              {result.paybackMonths !== null && (
                <div>
                  <p className="text-[10px] text-[#8C7E6E] mb-0.5">Payback</p>
                  <p className="text-base font-bold text-[#1A1A1A]">Mo. {result.paybackMonths}</p>
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
  deals, volumes, annualValueEstimate, onValueChange,
}: {
  deals: DealOption[];
  volumes: VolumeInputs;
  annualValueEstimate: number;
  onValueChange: (v: number) => void;
}) {
  const results = deals.map((d) => computeDealResult(d, volumes, annualValueEstimate));

  // Chart data: one entry per year of the longest contract
  const maxYears = Math.max(...deals.map((d) => Math.ceil(d.contractTermMonths / 12)));
  const chartData = Array.from({ length: maxYears }, (_, i) => {
    const entry: Record<string, number | string> = { year: `Year ${i + 1}` };
    deals.forEach((deal, di) => {
      const yr = results[di].years[i];
      entry[deal.label] = yr ? yr.annualCost : 0;
    });
    return entry;
  });

  const hasValue = annualValueEstimate > 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2DA] overflow-hidden mt-6">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E8E2DA] bg-[#FAFAF8]">
        <div className="w-8 h-8 rounded-full bg-[#F5F0EB] flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-[#EA2C00]" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-[#1A1A1A]">ROI Analysis</h2>
          <p className="text-xs text-[#8C7E6E]">Layer in expected value to compare ROI across options</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#666666] font-medium whitespace-nowrap">Annual Value Estimate</label>
          <NumberInput
            value={annualValueEstimate}
            onChange={onValueChange}
            prefix="$"
            suffix="/yr"
            placeholder="0"
            className="w-44"
          />
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Multi-year cost chart */}
        <div>
          <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-4">Annual Cost by Year</p>
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
              {deals.map((deal, di) => (
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
                      <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Year 1 VTC</td>
                      {results.map((r, ri) => (
                        <td key={ri} className="py-2.5 px-3 text-right text-sm font-semibold tabular-nums" style={{ color: DEAL_COLORS[ri] }}>
                          {r.vtcYear1 !== null ? `${r.vtcYear1.toFixed(1)}×` : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-xs text-[#8C7E6E]">Term VTC</td>
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
                          {r.paybackMonths !== null ? `Mo. ${r.paybackMonths}` : "—"}
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
              Enter an annual value estimate above to unlock ROI, VTC, and payback comparisons.
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
    <div className="min-h-screen bg-[#F5F0EB]">
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
            <label className="block text-[10px] uppercase font-medium text-[#8C7E6E] tracking-widest mb-1.5">Partner Name</label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="e.g. Memorial Health"
              className="w-full h-10 bg-white border border-[#E8E2DA] rounded-lg px-3 text-sm text-[#1A1A1A] outline-none placeholder-[#A39888] focus:border-[#1A1A1A] transition-colors"
            />
          </div>
        </div>

        {/* Volume inputs */}
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-5 mb-6">
          <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-4">Organization Volume</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1.5">Providers</label>
              <NumberInput value={volumes.providerCount} onChange={(v) => setVolumes((p) => ({ ...p, providerCount: v }))} suffix="providers" className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1.5">Annual Encounters</label>
              <NumberInput value={volumes.annualEncounters} onChange={(v) => setVolumes((p) => ({ ...p, annualEncounters: v }))} suffix="encounters/yr" className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#666666] mb-1.5">Staffed Beds (Nursing)</label>
              <NumberInput value={volumes.staffedBeds} onChange={(v) => setVolumes((p) => ({ ...p, staffedBeds: v }))} suffix="beds" className="w-full" />
            </div>
          </div>
        </div>

        {/* Deal cards */}
        <div className="mb-2">
          <p className="text-[10px] uppercase font-semibold text-[#8C7E6E] tracking-widest mb-4">Deal Options</p>
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {deals.map((deal, index) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  index={index}
                  volumes={volumes}
                  annualValueEstimate={annualValueEstimate}
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

        {/* ROI Analysis section */}
        <RoiAnalysisSection
          deals={deals}
          volumes={volumes}
          annualValueEstimate={annualValueEstimate}
          onValueChange={setAnnualValueEstimate}
        />
      </div>
    </div>
  );
}
