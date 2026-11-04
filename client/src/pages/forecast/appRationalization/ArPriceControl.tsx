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
  label,
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
  // label = the heading shown beside the toggle. The add-tool popup passes
  // "Annual spend" so it carries one label, not "Annual spend" over "Price".
  label?: string;
}) {
  return (
    <div>
      <div className={`flex items-center justify-between ${label ? "mb-2" : "mb-1.5"}`}>
        {label
          ? <div className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#443A32]">{label}</div>
          : <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#443A32]">Price</div>}
        <div className="flex items-center gap-0.5 p-0.5 bg-[#F5F0EB] rounded-[9px]">
          {([["flat", "Annual fee"], ["perUser", "Per user"]] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => onPricingModel(m)}
              className={`h-7 px-2.5 rounded-[7px] text-[11px] font-bold transition-colors ${pricingModel === m ? "bg-white text-[#EA2C00] shadow-sm" : "text-[#565250] hover:text-[#1A1A1A]"}`}
              data-testid={`${idPrefix}-pricing-${m}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {pricingModel === "flat" ? (
        <>
          <div className="flex items-center h-11 bg-white border border-[#E8E2DA] rounded-[11px] px-3.5 gap-1.5 focus-within:border-[#1A1A1A]">
            <span className="text-[#565250] text-sm">$</span>
            <NumberField
              value={flatSpend}
              onValueChange={onFlatSpend}
              min={0}
              className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums"
              data-testid={`${idPrefix}-spend`}
            />
            <span className="text-[#565250] text-[12px]">/ yr</span>
          </div>
          {!compact && (
            <>
              <div className="mt-2 flex items-center h-10 bg-white border border-[#E8E2DA] rounded-[11px] px-3.5 gap-1.5 focus-within:border-[#1A1A1A]">
                <NumberField
                  value={users}
                  onValueChange={onUsers}
                  min={0}
                  className="flex-1 min-w-0 bg-transparent text-[13px] text-[#1A1A1A] outline-none tabular-nums"
                  data-testid={`${idPrefix}-users`}
                />
                <span className="text-[#565250] text-[12px]">users <span className="text-[#565250]">· optional</span></span>
              </div>
              <p className="text-[10px] leading-tight text-[#565250] mt-1.5">Enterprise or flat contract, or if you don't know the user count. Add the count if you have it; it won't change the price.</p>
            </>
          )}
        </>
      ) : (
        <>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 min-w-0 flex items-center h-11 bg-white border border-[#E8E2DA] rounded-[11px] px-3.5 gap-1.5 focus-within:border-[#1A1A1A]">
              <NumberField
                value={users}
                onValueChange={onUsers}
                min={0}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums"
                data-testid={`${idPrefix}-users`}
              />
              <span className="text-[#565250] text-[12px] shrink-0">users</span>
            </div>
            <div className="flex items-center text-[#565250] text-sm shrink-0">×</div>
            <div className="flex-1 min-w-0 flex items-center h-11 bg-white border border-[#E8E2DA] rounded-[11px] px-3.5 gap-1.5 focus-within:border-[#1A1A1A]">
              <span className="text-[#565250] text-sm">$</span>
              <NumberField
                value={perUser}
                onValueChange={onPerUser}
                min={0}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums"
                data-testid={`${idPrefix}-peruser`}
              />
              <span className="text-[#565250] text-[12px] shrink-0">/ user</span>
            </div>
          </div>
          <p className="text-[10.5px] leading-tight text-[#565250] mt-1.5 tabular-nums">= <b className="text-[#1A1A1A]">{fmt(effectiveSpend)}</b> / yr</p>
        </>
      )}
    </div>
  );
}
