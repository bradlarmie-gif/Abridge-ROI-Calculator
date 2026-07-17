import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { NumberField } from "@/components/NumberField";
import { CategoryIcon } from "./CategoryIcon";
import {
  itemRetired, itemStays, APP_RAT_CATEGORIES, AR_WHEN_OPTIONS,
  type AppRatItem, type AppRatWhen,
} from "@/lib/appRationalizationCalc";

function fmtM(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export default function ArStackRow({
  item, onChange, onRemove,
}: { item: AppRatItem; onChange: (patch: Partial<AppRatItem>) => void; onRemove: () => void }) {
  const cat = useMemo(() => APP_RAT_CATEGORIES.find((c) => c.id === item.category)!, [item.category]);
  const retired = itemRetired(item);
  const stays = itemStays(item);

  return (
    <div
      className="ar-row grid grid-cols-1 md:grid-cols-[1fr_120px_190px_150px_120px] gap-3.5 items-center bg-white border border-[#E8E2DA] rounded-2xl px-4 py-3.5 mb-2.5"
      data-testid={`ar-row-${item.id}`}
    >
      {/* Application: icon + editable vendor name + category */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-[38px] h-[38px] rounded-[11px] bg-[#F5F0EB] flex items-center justify-center text-[#6B5E4F] flex-shrink-0">
          <CategoryIcon icon={cat.icon} className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <input
            value={item.vendorName ?? ""}
            onChange={(e) => onChange({ vendorName: e.target.value })}
            placeholder={`Name this ${cat.label.toLowerCase()} tool`}
            aria-label="Vendor name"
            className="w-full -ml-1.5 px-1.5 py-0.5 rounded-md bg-transparent text-[14px] font-bold text-[#1A1A1A] outline-none placeholder:font-medium placeholder:text-[#B4A99B] truncate hover:bg-[#F7F3EE] focus:bg-white focus:ring-1 focus:ring-[#EA2C00] transition-colors"
            data-testid={`ar-row-vendor-${item.id}`}
          />
          <div className="text-[11.5px] text-[#8C7E6E] truncate mt-0.5">{cat.label}</div>
        </div>
      </div>

      {/* Annual spend */}
      <div className="flex items-center h-10 bg-white border border-[#E8E2DA] rounded-[10px] px-3 gap-1 focus-within:border-[#EA2C00]">
        <span className="text-[#8C7E6E] text-sm">$</span>
        <NumberField
          value={item.annualSpend}
          onValueChange={(v) => onChange({ annualSpend: v })}
          min={0}
          className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums"
          data-testid={`ar-row-spend-${item.id}`}
        />
      </div>

      {/* How much could you displace */}
      <div className="flex items-center gap-2.5">
        <Slider
          min={0} max={100} step={5}
          value={[item.coveragePct]}
          onValueChange={(vals) => onChange({ coveragePct: vals[0] })}
          accent="coral"
          aria-label="How much could you displace"
          data-testid={`ar-row-displace-${item.id}`}
        />
        <span className="text-[13px] font-extrabold text-[#EA2C00] tabular-nums w-9 text-right">{item.coveragePct}%</span>
      </div>

      {/* Over (when) */}
      <div className="relative">
        <select
          value={item.when ?? "thisYear"}
          onChange={(e) => onChange({ when: e.target.value as AppRatWhen })}
          aria-label="When this tool comes off"
          className="w-full h-10 appearance-none bg-white border border-[#E8E2DA] rounded-[10px] pl-3 pr-8 text-[12.5px] text-[#1A1A1A] outline-none focus:border-[#EA2C00] cursor-pointer"
          data-testid={`ar-row-when-${item.id}`}
        >
          {AR_WHEN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C7E6E]" strokeWidth={2.25} />
      </div>

      {/* Displaceable result + remove */}
      <div className="flex items-center justify-end gap-2.5">
        <div className="text-right tabular-nums">
          <div className="text-[13.5px] font-bold text-[#1A1A1A]">{fmtM(retired)}</div>
          <div className="text-[11px] text-[#8C7E6E]">{fmtM(stays)} stays</div>
        </div>
        <button
          onClick={onRemove}
          className="text-[#C4B8A8] hover:text-[#1A1A1A] text-lg leading-none"
          aria-label="Remove"
          data-testid={`ar-row-remove-${item.id}`}
        >
          ×
        </button>
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference){
          .ar-row{animation:arRowIn .55s ease-out}
        }
        @keyframes arRowIn{
          from{box-shadow:0 0 0 3px rgba(234,44,0,.28)}
          to{box-shadow:0 0 0 0 rgba(234,44,0,0)}
        }
      `}</style>
    </div>
  );
}
