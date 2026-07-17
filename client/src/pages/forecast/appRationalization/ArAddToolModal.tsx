// Guided "add a tool" popup: pick a capability (card or search) -> capture
// vendor / spend / displace % / sunset timing here, so the row lands COMPLETE
// (no blank $0 rows). One modal for all entry points; inline row editing handles
// tweaks afterward. Spend routes through the shared NumberField (live thousands
// separators). Copy: "When does it sunset?", single "Add to stack".
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { NumberField } from "@/components/NumberField";
import { CategoryIcon } from "./CategoryIcon";
import {
  APP_RAT_CATEGORIES, AR_WHEN_OPTIONS, makeItem,
  type AppRatCategoryId, type AppRatItem, type AppRatWhen,
} from "@/lib/appRationalizationCalc";
import { cn } from "@/lib/utils";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default function ArAddToolModal({
  open, category, vendorName, onOpenChange, onConfirm,
}: {
  open: boolean;
  category: AppRatCategoryId | null;
  vendorName?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (init: Partial<AppRatItem>) => void;
}) {
  const cat = useMemo(() => (category ? APP_RAT_CATEGORIES.find((c) => c.id === category) ?? null : null), [category]);
  const seed = useMemo(() => (category ? makeItem("seed", category) : null), [category]);

  const [vendor, setVendor] = useState("");
  const [spend, setSpend] = useState(0);
  const [pct, setPct] = useState(100);
  const [when, setWhen] = useState<AppRatWhen>("thisYear");

  // reset the form each time a new tool is opened
  useEffect(() => {
    if (open && seed) {
      setVendor(vendorName ?? "");
      setSpend(0);
      setPct(seed.coveragePct);
      setWhen(seed.when);
    }
  }, [open, category, vendorName, seed]);

  if (!cat) return null;
  const retired = Math.round(spend * pct / 100);
  const stays = Math.max(0, spend - retired);
  const canAdd = spend > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[472px] p-0 gap-0 rounded-[20px] border-[#E8E2DA] overflow-hidden bg-white" data-testid="ar-add-modal">
        <DialogDescription className="sr-only">Add this tool to your consolidation stack.</DialogDescription>

        {/* header */}
        <div className="flex items-center gap-3.5 px-6 pt-6 pb-4">
          <div className="w-[46px] h-[46px] rounded-[13px] bg-[#F5F0EB] flex items-center justify-center text-[#6B5E4F] flex-shrink-0">
            <CategoryIcon icon={cat.icon} className="w-[22px] h-[22px]" />
          </div>
          <div>
            <div className="font-abridge uppercase tracking-[0.15em] text-[9.5px] text-[#B4A99B]">Add to your stack</div>
            <DialogTitle className="font-abridge text-[23px] tracking-[-0.01em] leading-none mt-1 text-[#1A1A1A]">{cat.label}</DialogTitle>
          </div>
        </div>

        {/* body */}
        <div className="px-6 pb-1">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8C7E6E] mb-1.5">
              Vendor <span className="font-semibold tracking-normal normal-case text-[#B4A99B]">optional</span>
            </div>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder={`e.g. ${cat.hint}`}
              className="w-full h-11 border border-[#E8E2DA] rounded-[11px] px-3.5 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00] placeholder:text-[#B4A99B]"
              data-testid="ar-add-vendor"
            />
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8C7E6E] mb-1.5">Annual spend</div>
            <div className="flex items-center h-11 bg-white border border-[#E8E2DA] rounded-[11px] px-3.5 gap-1.5 focus-within:border-[#EA2C00]">
              <span className="text-[#8C7E6E] text-sm">$</span>
              <NumberField
                value={spend}
                onValueChange={setSpend}
                min={0}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums"
                data-testid="ar-add-spend"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8C7E6E] mb-2">How much could you displace?</div>
            <div className="flex items-center gap-3">
              <Slider min={0} max={100} step={5} value={[pct]} onValueChange={(v) => setPct(v[0])} accent="coral" aria-label="How much could you displace" />
              <span className="text-[13px] font-extrabold text-[#EA2C00] tabular-nums w-11 text-right">{pct}%</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8C7E6E] mb-2">When does it sunset?</div>
            <div className="grid grid-cols-4 gap-1 bg-[#F1EBE3] border border-[#E4DDD2] rounded-[11px] p-[3px]">
              {AR_WHEN_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setWhen(o.value)}
                  className={cn(
                    "text-[11.5px] font-bold rounded-lg py-2 transition-colors",
                    when === o.value ? "bg-[#1A1A1A] text-white shadow-sm" : "text-[#8C7E6E] hover:text-[#1A1A1A]",
                  )}
                  data-testid={`ar-add-when-${o.value}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 min-h-[58px] flex items-center px-4 py-3.5 bg-[#FAF7F2] border border-[#EFE7DC] rounded-xl">
            {canAdd ? (
              <div className="flex items-baseline justify-between w-full">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-[#8C7E6E]">Sunsets onto Abridge / yr</div>
                  <div className="text-[18px] font-bold text-[#EA2C00] tabular-nums mt-1">{fmt(retired)}</div>
                </div>
                <div className="text-[12px] text-[#8C7E6E] tabular-nums">{fmt(stays)} stays on this tool</div>
              </div>
            ) : (
              <div className="text-[12.5px] text-[#8C7E6E]">Enter a spend to see what sunsets onto Abridge.</div>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="px-6 pt-4 pb-6 mt-3 border-t border-[#F2ECE4]">
          <button
            disabled={!canAdd}
            onClick={() => onConfirm({ vendorName: vendor.trim() || undefined, annualSpend: spend, coveragePct: pct, when })}
            className="w-full h-11 rounded-xl bg-[#EA2C00] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#d92800] transition-opacity"
            data-testid="ar-add-confirm"
          >
            Add to stack
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
