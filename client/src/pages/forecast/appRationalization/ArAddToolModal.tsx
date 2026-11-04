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
import { NumberField } from "@/components/NumberField";
import { CategoryIcon } from "./CategoryIcon";
import ArPriceControl from "./ArPriceControl";
import { CAPABILITY_ART } from "./capabilityArt";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import {
  APP_RAT_CATEGORIES, makeItem, resolveAnnualSpend, renewalPatch, renewalDateLabel,
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
  const [renewMonths, setRenewMonths] = useState(12);

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
      setRenewMonths(s.contractMonths);
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
      <DialogContent className="max-w-[460px] max-h-[90vh] flex flex-col p-0 gap-0 rounded-[20px] border-[#E8E2DA] overflow-hidden bg-white" data-testid="ar-add-modal">
        <DialogDescription className="sr-only">Add this tool to your consolidation stack.</DialogDescription>

        {/* header: icon tile + eyebrow + capability title */}
        <div className="flex items-center gap-3.5 px-6 pt-6 pb-4 shrink-0">
          {/* the same drawing as the tile that opened this, its live mark coral */}
          {CAPABILITY_ART[activeCategory] ? (
            <div className="group w-[78px] h-[52px] rounded-[13px] bg-[#F6F1EA] flex-shrink-0 p-1" aria-pressed="true" data-testid="ar-add-art">
              {CAPABILITY_ART[activeCategory]}
            </div>
          ) : (
            <div className="w-[52px] h-[52px] rounded-[13px] bg-[#F6F1EA] flex items-center justify-center text-[#443A32] flex-shrink-0">
              <CategoryIcon icon={cat.icon} className="w-[22px] h-[22px]" />
            </div>
          )}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#443A32]">Add to your stack</div>
            <DialogTitle className="font-abridge text-[23px] tracking-[-0.01em] leading-none mt-[5px] text-[#1A1A1A]">{title}</DialogTitle>
          </div>
        </div>

        {/* body */}
        <div className="px-6 pb-1 flex-1 overflow-y-auto min-h-0">
          {/* capability picker: custom path only */}
          {entryIsCustom && (
            <div className="mb-1">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#443A32] mb-2">What kind of tool is it?</div>
              <div className="relative">
                <select
                  value={activeCategory}
                  onChange={(e) => changeCategory(e.target.value as AppRatCategoryId)}
                  className="w-full h-11 appearance-none bg-white border border-[#E8E2DA] rounded-[11px] pl-3.5 pr-9 text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A] cursor-pointer"
                  data-testid="ar-add-capability"
                >
                  {APP_RAT_CATEGORIES.filter((c) => c.id !== "custom").map((c) => (
                    <option key={c.id} value={c.id} disabled={c.comingSoon}>{c.label}{c.comingSoon ? " (coming soon)" : ""}</option>
                  ))}
                  <option value="custom">Other</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#565250]" strokeWidth={2.25} />
              </div>
            </div>
          )}

          <div className={entryIsCustom ? "mt-4" : ""}>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#443A32] mb-2">
              Vendor <span className="font-medium tracking-normal normal-case text-[#565250]">optional</span>
            </div>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder={vendorPlaceholder}
              className="w-full h-11 border border-[#E8E2DA] rounded-[11px] px-3.5 text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A] placeholder:text-[#8A827C]"
              data-testid="ar-add-vendor"
            />
          </div>

          <div className="mt-4">
            <ArPriceControl
              label="Annual spend"
              pricingModel={pricingModel} onPricingModel={setPricingModel}
              flatSpend={flatSpend} onFlatSpend={setFlatSpend}
              users={users} onUsers={setUsers}
              perUser={perUser} onPerUser={setPerUser}
              effectiveSpend={spend}
              idPrefix="ar-add"
              compact
            />
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#443A32] mb-2">How much of it moves onto Abridge?</div>
            <div className="flex items-center gap-3.5">
              <Slider min={0} max={100} step={5} value={[pct]} onValueChange={(v) => setPct(v[0])} accent="coral" aria-label="How much of it moves onto Abridge" />
              <span className="text-[16px] font-extrabold text-[#1A1A1A] tabular-nums w-12 text-right">{pct}%</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#443A32] mb-2">Renews in</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center h-11 w-[136px] bg-white border border-[#E8E2DA] rounded-[11px] px-3.5 gap-1.5 focus-within:border-[#1A1A1A]">
                <NumberField
                  value={renewMonths}
                  onValueChange={setRenewMonths}
                  min={0}
                  decimal={false}
                  className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums"
                  data-testid="ar-add-renews"
                />
                <span className="text-[#565250] text-[12px]">months</span>
              </div>
              <span className="text-[12.5px] text-[#565250] tabular-nums">renews {renewalDateLabel(renewMonths)}</span>
            </div>
          </div>

          {/* result band: always present, counts up as the spend and share change */}
          <div className="mt-[18px] px-[18px] py-4 bg-[#F6F1EA] rounded-xl" data-testid="ar-add-result">
            <div className="flex items-end justify-between gap-4 w-full">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#443A32]">Comes off the bill every year</div>
                <div className={`font-abridge text-[26px] leading-none tabular-nums mt-2 ${canAdd ? "text-[#EA2C00]" : "text-[#C9BFB2]"}`}>
                  <AnimatedValue value={retired} format={fmt} duration={500} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#443A32]">Stays on</div>
                <div className={`font-abridge text-[19px] leading-none tabular-nums mt-2 ${canAdd ? "text-[#1A1A1A]" : "text-[#C9BFB2]"}`}>
                  <AnimatedValue value={stays} format={fmt} duration={500} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="px-6 pt-3.5 pb-5 border-t border-[#EFE9E1] shrink-0">
          <button
            disabled={!canAdd}
            onClick={() => onConfirm(activeCategory, {
              vendorName: vendor.trim() || undefined,
              annualSpend: spend,
              coveragePct: pct,
              ...renewalPatch(renewMonths),
              pricingModel,
              userCount: users > 0 ? users : undefined,
              perUserCost: pricingModel === "perUser" ? perUser : undefined,
            })}
            className="w-full h-[49px] rounded-[13px] bg-[#EA2C00] text-white text-[14.5px] font-extrabold hover:bg-[#d92800] transition-colors disabled:bg-[#ECE7E1] disabled:text-[#8A827C] disabled:cursor-not-allowed"
            data-testid="ar-add-confirm"
          >
            Add to stack
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
