import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { NumberField } from "@/components/NumberField";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CategoryIcon } from "./CategoryIcon";
import ArPriceControl from "./ArPriceControl";
import {
  itemRetired, itemStays, resolveAnnualSpend, renewalPatch, renewalDateLabel, APP_RAT_CATEGORIES,
  type AppRatItem, type ArPricingModel,
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

  // Pricing, derived from the item so the inline popover edits the same source of
  // truth the modal wrote. annualSpend stays canonical: per-user edits recompute
  // it from seats x rate; flat edits set it directly; a user count on a flat tool
  // is plain context and never touches the price.
  const model: ArPricingModel = item.pricingModel ?? "flat";
  const users = item.userCount ?? 0;
  const perUser = item.perUserCost ?? 0;
  const setModel = (m: ArPricingModel) =>
    m === "perUser"
      ? onChange({ pricingModel: m, annualSpend: resolveAnnualSpend("perUser", 0, users, perUser) })
      : onChange({ pricingModel: m });
  const setFlat = (v: number) => onChange({ annualSpend: v });
  const setUsers = (v: number) =>
    model === "perUser"
      ? onChange({ userCount: v, annualSpend: resolveAnnualSpend("perUser", 0, v, perUser) })
      : onChange({ userCount: v > 0 ? v : undefined });
  const setPerUser = (v: number) =>
    onChange({ perUserCost: v, annualSpend: resolveAnnualSpend("perUser", 0, users, v) });

  return (
    <div
      className="ar-row grid grid-cols-1 md:grid-cols-[1fr_116px_188px_104px_120px] gap-3.5 items-center bg-white border border-[#E8E2DA] rounded-2xl px-4 py-3.5 mb-2.5"
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

      {/* Price: click to edit inline (flat / per-user) */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="flex items-center justify-between h-10 w-full bg-white border border-[#E8E2DA] rounded-[10px] px-3 text-left hover:border-[#1A1A1A] focus:border-[#EA2C00] outline-none transition-colors"
            data-testid={`ar-row-price-${item.id}`}
          >
            <span className="min-w-0">
              <span className="block text-sm text-[#1A1A1A] tabular-nums leading-none">{fmtM(item.annualSpend)}</span>
              {users > 0 && (
                <span className="block text-[9.5px] text-[#8C7E6E] tabular-nums leading-none mt-0.5 truncate">
                  {users.toLocaleString()} users
                </span>
              )}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#B4A99B] flex-shrink-0" strokeWidth={2.25} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[300px] p-4 rounded-2xl border-[#E8E2DA] shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
          <ArPriceControl
            pricingModel={model} onPricingModel={setModel}
            flatSpend={item.annualSpend} onFlatSpend={setFlat}
            users={users} onUsers={setUsers}
            perUser={perUser} onPerUser={setPerUser}
            effectiveSpend={item.annualSpend}
            idPrefix={`ar-row-price-${item.id}`}
          />
        </PopoverContent>
      </Popover>

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

      {/* Renews: months to contract end; setting it resets sunset to ride-to-renewal */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center h-10 bg-white border border-[#E8E2DA] rounded-[10px] px-2.5 gap-1 focus-within:border-[#EA2C00]">
          <NumberField
            value={item.contractMonths}
            onValueChange={(v) => onChange(renewalPatch(v))}
            min={0}
            decimal={false}
            aria-label="Renews in months"
            className="w-full min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums"
            data-testid={`ar-row-renews-${item.id}`}
          />
          <span className="text-[11px] text-[#8C7E6E]">mo</span>
        </div>
        <span className="block text-[9.5px] text-[#8C7E6E] tabular-nums leading-none mt-1 pl-0.5 truncate">
          {renewalDateLabel(item.contractMonths)}
        </span>
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
