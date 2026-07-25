// Shared price entry: an "Annual fee" / "Per user" toggle plus the fields for
// each mode. Used by both the add-tool popup and the inline edit popover on the
// stack row, so the two can never drift. Purely presentational: the parent owns
// the four values and their setters, and passes the already-computed effective
// annual spend for the "= $X / yr" readout.
//
// The user count is collected in BOTH modes: in Per user it multiplies the rate
// into the annual spend; in Annual fee it is plain context (does not change the
// price).
import { NumberField } from "@/components/NumberField";
import type { ArPricingModel } from "@/lib/appRationalizationCalc";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default function ArPriceControl({
  pricingModel, onPricingModel,
  flatSpend, onFlatSpend,
  users, onUsers,
  perUser, onPerUser,
  effectiveSpend,
  idPrefix = "ar-price",
  compact = false,
}: {
  pricingModel: ArPricingModel;
  onPricingModel: (m: ArPricingModel) => void;
  flatSpend: number; onFlatSpend: (v: number) => void;
  users: number; onUsers: (v: number) => void;
  perUser: number; onPerUser: (v: number) => void;
  effectiveSpend: number;
  idPrefix?: string;
  // compact = the add-tool modal: hide the optional users field + helper in
  // annual-fee mode so it matches the tight AddPopup mockup (just the $ input).
  compact?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8C7E6E]">Price</div>
        <div className="flex items-center gap-0.5 p-0.5 bg-[#F5F0EB] rounded-[9px]">
          {([["flat", "Annual fee"], ["perUser", "Per user"]] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => onPricingModel(m)}
              className={`h-7 px-2.5 rounded-[7px] text-[11px] font-bold transition-colors ${pricingModel === m ? "bg-white text-[#EA2C00] shadow-sm" : "text-[#8C7E6E] hover:text-[#1A1A1A]"}`}
              data-testid={`${idPrefix}-pricing-${m}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {pricingModel === "flat" ? (
        <>
          <div className="flex items-center h-11 bg-white border border-[#E8E2DA] rounded-[11px] px-3.5 gap-1.5 focus-within:border-[#EA2C00]">
            <span className="text-[#8C7E6E] text-sm">$</span>
            <NumberField
              value={flatSpend}
              onValueChange={onFlatSpend}
              min={0}
              className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums"
              data-testid={`${idPrefix}-spend`}
            />
            <span className="text-[#B4A99B] text-[12px]">/ yr</span>
          </div>
          {!compact && (
            <>
              <div className="mt-2 flex items-center h-10 bg-white border border-[#E8E2DA] rounded-[11px] px-3.5 gap-1.5 focus-within:border-[#EA2C00]">
                <NumberField
                  value={users}
                  onValueChange={onUsers}
                  min={0}
                  className="flex-1 min-w-0 bg-transparent text-[13px] text-[#1A1A1A] outline-none tabular-nums"
                  data-testid={`${idPrefix}-users`}
                />
                <span className="text-[#B4A99B] text-[12px]">users <span className="text-[#C9BFB2]">· optional</span></span>
              </div>
              <p className="text-[10px] leading-tight text-[#B4A99B] mt-1.5">Enterprise or flat contract, or if you don't know the user count. Add the count if you have it; it won't change the price.</p>
            </>
          )}
        </>
      ) : (
        <>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 flex items-center h-11 bg-white border border-[#E8E2DA] rounded-[11px] px-3.5 gap-1.5 focus-within:border-[#EA2C00]">
              <NumberField
                value={users}
                onValueChange={onUsers}
                min={0}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums"
                data-testid={`${idPrefix}-users`}
              />
              <span className="text-[#B4A99B] text-[12px]">users</span>
            </div>
            <div className="flex items-center text-[#B4A99B] text-sm">×</div>
            <div className="flex-1 flex items-center h-11 bg-white border border-[#E8E2DA] rounded-[11px] px-3.5 gap-1.5 focus-within:border-[#EA2C00]">
              <span className="text-[#8C7E6E] text-sm">$</span>
              <NumberField
                value={perUser}
                onValueChange={onPerUser}
                min={0}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums"
                data-testid={`${idPrefix}-peruser`}
              />
              <span className="text-[#B4A99B] text-[12px]">/ user</span>
            </div>
          </div>
          <p className="text-[10.5px] leading-tight text-[#8C7E6E] mt-1.5 tabular-nums">= <b className="text-[#1A1A1A]">{fmt(effectiveSpend)}</b> / yr</p>
        </>
      )}
    </div>
  );
}
