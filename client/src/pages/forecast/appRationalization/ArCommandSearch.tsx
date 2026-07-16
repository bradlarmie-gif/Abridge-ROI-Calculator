import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";
import {
  searchApplications, categoryLabel, APP_RAT_CATEGORIES,
  type AppRatCategoryId, type AppRatCategory, type KnownVendor,
} from "@/lib/appRationalizationCalc";

type Option =
  | { kind: "vendor"; vendor: KnownVendor }
  | { kind: "category"; category: AppRatCategory }
  | { kind: "custom"; text: string };

export default function ArCommandSearch({
  onSelect,
}: { onSelect: (category: AppRatCategoryId, vendorName?: string) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses and opens the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { vendors, categories } = useMemo(() => searchApplications(query), [query]);

  const options = useMemo<Option[]>(() => {
    const opts: Option[] = [
      ...vendors.map((v) => ({ kind: "vendor", vendor: v } as Option)),
      ...categories.map((c) => ({ kind: "category", category: c } as Option)),
    ];
    if (query.trim()) opts.push({ kind: "custom", text: query.trim() });
    return opts;
  }, [vendors, categories, query]);

  const close = () => { setOpen(false); inputRef.current?.blur(); };

  const choose = (opt: Option) => {
    if (opt.kind === "vendor") onSelect(opt.vendor.category, opt.vendor.name);
    else if (opt.kind === "category") onSelect(opt.category.id);
    else onSelect("custom", opt.text);
    setQuery("");
    setActive(0);
    close(); // dropdown collapses after a pick; click the search again to add another
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (options[active]) choose(options[active]); }
    else if (e.key === "Escape") { setQuery(""); setActive(0); close(); }
  };

  const vendorStart = 0;
  const categoryStart = vendors.length;

  return (
    <div className="relative">
      <div className={`flex items-center gap-3 h-14 rounded-2xl px-4 bg-white transition-all ${
        open
          ? "border-[1.5px] border-[#EA2C00] shadow-[0_0_0_4px_rgba(234,44,0,0.08)]"
          : "border border-[#E8E2DA] hover:border-[#C4B8A8]"
      }`}>
        <Search className="w-5 h-5 text-[#B4A99B] flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder="Search a vendor, or browse capabilities"
          className="flex-1 bg-transparent outline-none text-[16px] text-[#1A1A1A] placeholder-[#B4A99B]"
          data-testid="ar-search-input"
        />
        <span className="text-[11px] font-bold text-[#8C7E6E] bg-[#F5F0EB] border border-[#E8E2DA] rounded-md px-2 py-1">⌘K</span>
      </div>

      {open && (
        // preventDefault on mousedown keeps the input focused when a row is clicked,
        // so the click registers before the blur-close fires.
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 z-20 mt-2 bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden shadow-[0_22px_54px_rgba(0,0,0,0.10)]"
        >
          {vendors.length > 0 && (
            <div className="px-[18px] pt-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-[1.6px] text-[#8C7E6E]">Best match</div>
          )}
          {vendors.map((v, i) => {
            const idx = vendorStart + i;
            return (
              <Row key={`v-${v.name}`} activeRow={active === idx} onEnter={() => setActive(idx)} onClick={() => choose({ kind: "vendor", vendor: v })} icon={APP_RAT_CATEGORIES.find((c) => c.id === v.category)!.icon} name={v.name} sub={categoryLabel(v.category)} right="↵ Add" testid={`ar-opt-vendor-${v.name.replace(/\s+/g, "-").toLowerCase()}`} />
            );
          })}

          {categories.length > 0 && (
            <div className="px-[18px] pt-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-[1.6px] text-[#8C7E6E]">
              {query.trim() ? "Or pick a category" : "All capabilities"}
            </div>
          )}
          {categories.map((c, i) => {
            const idx = categoryStart + i;
            return (
              <Row key={`c-${c.id}`} activeRow={active === idx} onEnter={() => setActive(idx)} onClick={() => choose({ kind: "category", category: c })} icon={c.icon} name={c.label} sub={c.hint} right="›" testid={`ar-opt-category-${c.id}`} />
            );
          })}

          {query.trim() && (
            <>
              <div className="h-px bg-[#F2ECE4] my-1.5" />
              <Row activeRow={active === options.length - 1} onEnter={() => setActive(options.length - 1)} onClick={() => choose({ kind: "custom", text: query.trim() })} icon="custom" name={`Add “${query.trim()}” as a custom application`} sub="" right="" testid="ar-opt-custom" />
            </>
          )}

          <div className="flex gap-[18px] px-[18px] py-3 border-t border-[#F2ECE4] text-[11.5px] text-[#8C7E6E]">
            <span><b className="text-[#1A1A1A]">↑ ↓</b> navigate</span>
            <span><b className="text-[#1A1A1A]">↵</b> add</span>
            <span><b className="text-[#1A1A1A]">esc</b> close</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  activeRow, onEnter, onClick, icon, name, sub, right, testid,
}: {
  activeRow: boolean; onEnter: () => void; onClick: () => void;
  icon: React.ComponentProps<typeof CategoryIcon>["icon"]; name: string; sub: string; right: string; testid: string;
}) {
  return (
    <div
      onMouseEnter={onEnter}
      onClick={onClick}
      className={`flex items-center gap-3.5 px-[18px] py-2.5 cursor-pointer ${activeRow ? "bg-[#F5F0EB]" : ""}`}
      data-testid={testid}
    >
      <div className="w-9 h-9 rounded-[10px] bg-[#F5F0EB] flex items-center justify-center text-[#6B5E4F] flex-shrink-0">
        <CategoryIcon icon={icon} className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-[#1A1A1A] truncate">{name}</div>
        {sub && <div className="text-[12.5px] text-[#8C7E6E] truncate">{sub}</div>}
      </div>
      {right && <div className="text-[12px] text-[#B4A99B] flex-shrink-0">{right}</div>}
    </div>
  );
}
