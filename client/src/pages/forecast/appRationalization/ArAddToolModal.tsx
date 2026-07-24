// Guided "add a tool" popup: pick a capability (card or search) -> capture
// vendor / spend / displace % here, so the row lands COMPLETE (no blank $0 rows).
// One modal for all entry points; inline row editing handles tweaks afterward.
// Spend routes through the shared NumberField (live thousands separators). Timing
// (contract runway / sunset) is set later on the Consolidation screen.
//
// Custom path (unknown vendor / "not on the list"): a "What kind of tool is it?"
// picker leads, defaulting to "Other" so we never mislabel it. Picking a real
// capability categorizes the tool properly (right icon, sensible default displace),
// which keeps the consolidation story intact.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { CategoryIcon } from "./CategoryIcon";
import ArPriceControl from "./ArPriceControl";
import {
  APP_RAT_CATEGORIES, makeItem, resolveAnnualSpend,
  type AppRatCategoryId, type AppRatItem, type ArPricingModel,
} from "@/lib/appRationalizationCalc";
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default function ArAddToolModal({
  open, category, vendorName, onOpenChange, onConfirm,
}: {
  open: boolean;
  category: AppRatCategoryId | null;
  vendorName?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (category: AppRatCategoryId, init: Partial<AppRatItem>) => void;
}) {
  // The custom path lets them re-categorize inside the modal; known paths are fixed.
  // activeCategory / entryIsCustom persist through close so the content stays
  // mounted and Radix can play its fade-out (category prop goes null on close).
  const [activeCategory, setActiveCategory] = useState<AppRatCategoryId>(category ?? "custom");
  const [entryIsCustom, setEntryIsCustom] = useState(false);
  const [vendor, setVendor] = useState("");
  const [pricingModel, setPricingModel] = useState<ArPricingModel>("flat");
  const [flatSpend, setFlatSpend] = useState(0);
  const [users, setUsers] = useState(0);
  const [perUser, setPerUser] = useState(0);
  const [pct, setPct] = useState(100);

  // reset the form each time a new tool is opened
  useEffect(() => {
    if (open && category) {
      const s = makeItem("seed", category);
      setActiveCategory(category);
      setEntryIsCustom(category === "custom");
      setVendor(vendorName ?? "");
      setPricingModel("flat");
      setFlatSpend(0);
      setUsers(0);
      setPerUser(0);
      setPct(s.coveragePct);
    }
  }, [open, category, vendorName]);

  const cat = useMemo(() => APP_RAT_CATEGORIES.find((c) => c.id === activeCategory) ?? null, [activeCategory]);

  // picking a capability re-seeds the default displace % for that capability
  const changeCategory = (id: AppRatCategoryId) => {
    setActiveCategory(id);
    setPct(makeItem("seed", id).coveragePct);
  };

  // Keep rendering through the close (open=false) so Radix animates the exit;
  // only bail before the modal has ever had a category to show.
  if (!cat) return null;
  const spend = resolveAnnualSpend(pricingModel, flatSpend, users, perUser);
  const retired = Math.round(spend * pct / 100);
  const stays = Math.max(0, spend - retired);
  const canAdd = spend > 0;
  const title = activeCategory === "custom" ? "Add an application" : cat.label;
  const vendorPlaceholder = activeCategory === "custom" ? "e.g. the tool's name" : `e.g. ${cat.hint}`;

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
            <DialogTitle className="font-abridge text-[23px] tracking-[-0.01em] leading-none mt-1 text-[#1A1A1A]">{title}</DialogTitle>
          </div>
        </div>

        {/* body */}
        <div className="px-6 pb-1">
          {/* capability picker: custom path only */}
          {entryIsCustom && (
            <div className="mb-1">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8C7E6E] mb-1.5">What kind of tool is it?</div>
              <div className="relative">
                <select
                  value={activeCategory}
                  onChange={(e) => changeCategory(e.target.value as AppRatCategoryId)}
                  className="w-full h-11 appearance-none bg-white border border-[#E8E2DA] rounded-[11px] pl-3.5 pr-9 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00] cursor-pointer"
                  data-testid="ar-add-capability"
                >
                  {APP_RAT_CATEGORIES.filter((c) => c.id !== "custom").map((c) => (
                    <option key={c.id} value={c.id} disabled={c.comingSoon}>{c.label}{c.comingSoon ? " (coming soon)" : ""}</option>
                  ))}
                  <option value="custom">Other</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7E6E]" strokeWidth={2.25} />
              </div>
            </div>
          )}

          <div className={entryIsCustom ? "mt-4" : ""}>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8C7E6E] mb-1.5">
              Vendor <span className="font-semibold tracking-normal normal-case text-[#B4A99B]">optional</span>
            </div>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder={vendorPlaceholder}
              className="w-full h-11 border border-[#E8E2DA] rounded-[11px] px-3.5 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00] placeholder:text-[#B4A99B]"
              data-testid="ar-add-vendor"
            />
          </div>

          <div className="mt-4">
            <ArPriceControl
              pricingModel={pricingModel} onPricingModel={setPricingModel}
              flatSpend={flatSpend} onFlatSpend={setFlatSpend}
              users={users} onUsers={setUsers}
              perUser={perUser} onPerUser={setPerUser}
              effectiveSpend={spend}
              idPrefix="ar-add"
            />
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8C7E6E] mb-2">How much could you displace?</div>
            <div className="flex items-center gap-3">
              <Slider min={0} max={100} step={5} value={[pct]} onValueChange={(v) => setPct(v[0])} accent="coral" aria-label="How much could you displace" />
              <span className="text-[13px] font-extrabold text-[#EA2C00] tabular-nums w-11 text-right">{pct}%</span>
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
            onClick={() => onConfirm(activeCategory, {
              vendorName: vendor.trim() || undefined,
              annualSpend: spend,
              coveragePct: pct,
              pricingModel,
              userCount: users > 0 ? users : undefined,
              perUserCost: pricingModel === "perUser" ? perUser : undefined,
            })}
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
