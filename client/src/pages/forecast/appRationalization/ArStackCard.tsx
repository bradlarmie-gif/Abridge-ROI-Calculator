import { Slider } from "@/components/ui/slider";
import { NumberField } from "@/components/NumberField";
import { CategoryIcon } from "./CategoryIcon";
import {
  itemRetired, itemStays, categoryLabel, APP_RAT_CATEGORIES, KNOWN_VENDORS,
  type AppRatItem,
} from "@/lib/appRationalizationCalc";

function fmtM(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

const RENEWALS = ["Open term", "2026", "Mid 2027", "2028", "Unknown"];

export default function ArStackCard({
  item, onChange, onRemove,
}: { item: AppRatItem; onChange: (patch: Partial<AppRatItem>) => void; onRemove: () => void }) {
  const cat = APP_RAT_CATEGORIES.find((c) => c.id === item.category)!;
  const vendorSuggestions = KNOWN_VENDORS.filter((v) => v.category === item.category).map((v) => v.name);
  const retired = itemRetired(item);
  const stays = itemStays(item);

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5 mb-3.5" data-testid={`ar-card-${item.id}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-[38px] h-[38px] rounded-[11px] bg-[#F5F0EB] flex items-center justify-center text-[#6B5E4F] flex-shrink-0">
          <CategoryIcon icon={cat.icon} className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold text-[#1A1A1A] truncate">{item.vendorName?.trim() || cat.label}</div>
          <div className="text-[11.5px] text-[#8C7E6E]">{cat.label}</div>
        </div>
        <button onClick={onRemove} className="ml-auto text-[#C4B8A8] hover:text-[#1A1A1A] text-lg leading-none" aria-label="Remove" data-testid={`ar-card-remove-${item.id}`}>×</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr] gap-3">
        <Field label="Vendor">
          <input
            list={`ar-vend-${item.id}`}
            value={item.vendorName ?? ""}
            onChange={(e) => onChange({ vendorName: e.target.value })}
            placeholder={cat.label}
            className="w-full h-10 bg-white border border-[#E8E2DA] rounded-[10px] px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A] placeholder-[#B4A99B]"
            data-testid={`ar-card-vendor-${item.id}`}
          />
          <datalist id={`ar-vend-${item.id}`}>{vendorSuggestions.map((n) => <option key={n} value={n} />)}</datalist>
        </Field>
        <Field label="Annual spend">
          <div className="flex items-center h-10 bg-white border border-[#E8E2DA] rounded-[10px] px-3 gap-1 focus-within:border-[#1A1A1A]">
            <span className="text-[#8C7E6E] text-sm">$</span>
            <NumberField value={item.annualSpend} onValueChange={(v) => onChange({ annualSpend: v })} min={0} className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A1A] outline-none tabular-nums" data-testid={`ar-card-spend-${item.id}`} />
          </div>
        </Field>
        <Field label="Renews">
          <select
            value={item.renewal ?? ""}
            onChange={(e) => onChange({ renewal: e.target.value || undefined })}
            className="w-full h-10 bg-white border border-[#E8E2DA] rounded-[10px] px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
            data-testid={`ar-card-renews-${item.id}`}
          >
            <option value="">Select…</option>
            {RENEWALS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-5 items-center mt-4 pt-3.5 border-t border-[#F2ECE4]">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[12.5px] text-[#6B6B6B]">Abridge covers</span>
            <span className="text-base font-extrabold text-[#EA2C00] tabular-nums">{item.coveragePct}%</span>
          </div>
          <Slider min={0} max={100} step={5} value={[item.coveragePct]} onValueChange={(vals) => onChange({ coveragePct: vals[0] })} accent="coral" aria-label="Coverage" data-testid={`ar-card-coverage-${item.id}`} />
        </div>
        <Field label="Covered by (Abridge)">
          <input
            value={item.abridgeProduct ?? ""}
            onChange={(e) => onChange({ abridgeProduct: e.target.value })}
            placeholder={cat.label}
            className="w-full h-10 bg-white border border-[#E8E2DA] rounded-[10px] px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A] placeholder-[#B4A99B]"
            data-testid={`ar-card-abridge-${item.id}`}
          />
        </Field>
      </div>

      <div className="mt-4 text-[12.5px] text-[#6B6B6B] tabular-nums">
        <b className="text-[#1A1A1A]">{fmtM(retired)}</b> to Abridge · {fmtM(stays)} stays
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-[#8C7E6E] uppercase tracking-[0.5px] mb-1.5">{label}</label>
      {children}
    </div>
  );
}
