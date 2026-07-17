import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import ArCommandSearch from "./ArCommandSearch";
import ArStackRow from "./ArStackRow";
import ArAddToolModal from "./ArAddToolModal";
import { CategoryIcon } from "./CategoryIcon";
import { NumberField } from "@/components/NumberField";
import { APP_RAT_CATEGORIES, computeNet, type AppRatItem, type AppRatCategoryId } from "@/lib/appRationalizationCalc";

function fmtM(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
}

const COL_HEADERS = ["Application", "Annual spend", "How much could you displace?", "Comes off", "Displaceable"];

// The browsable capability cards, reused by the empty state and the on-demand
// "+ Add application" panel. Clicking a card opens the add-tool modal.
function CapabilityGrid({ onPick }: { onPick: (category: AppRatCategoryId) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {APP_RAT_CATEGORIES.filter((c) => c.id !== "custom").map((cat) => (
        <button
          key={cat.id}
          onClick={() => onPick(cat.id)}
          className="group text-left bg-white border border-[#E8E2DA] rounded-2xl p-5 hover:border-[#1A1A1A] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all"
          data-testid={`ar-browse-${cat.id}`}
        >
          <div className="w-11 h-11 rounded-xl bg-[#F5F0EB] flex items-center justify-center mb-4 text-[#6B5E4F] group-hover:bg-[#EA2C00]/10 group-hover:text-[#EA2C00] transition-colors">
            <CategoryIcon icon={cat.icon} className="w-5 h-5" />
          </div>
          <p className="font-bold text-[#1A1A1A] text-[15px]">{cat.label}</p>
          <p className="text-[12px] text-[#8C7E6E] mt-1 truncate">{cat.hint}</p>
        </button>
      ))}
    </div>
  );
}

export default function ArApplicationsStep({
  items, orgName, onOrgNameChange, abridgePrice, onAbridgePriceChange, onAdd, onUpdate, onRemove, onContinue,
}: {
  items: AppRatItem[];
  orgName: string;
  onOrgNameChange: (v: string) => void;
  abridgePrice: number;
  onAbridgePriceChange: (v: number) => void;
  onAdd: (category: AppRatCategoryId, init?: Partial<AppRatItem>) => void;
  onUpdate: (id: string, patch: Partial<AppRatItem>) => void;
  onRemove: (id: string) => void;
  onContinue: () => void;
}) {
  const net = useMemo(() => computeNet(items, abridgePrice), [items, abridgePrice]);
  const pctSunset = net.stackTotal > 0 ? Math.round((net.sunset / net.stackTotal) * 100) : 0;

  // Which capability the add-tool modal is open for (null = closed), and whether
  // the on-demand browse panel is showing (once the stack has rows).
  const [pick, setPick] = useState<{ category: AppRatCategoryId; vendorName?: string } | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);

  const openPick = (category: AppRatCategoryId, vendorName?: string) => {
    setBrowseOpen(false);
    setPick({ category, vendorName });
  };

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8">
      {/* Header: title + org + Abridge price */}
      <div className="flex items-start justify-between gap-6 mb-2">
        <div>
          <h1 className="font-abridge text-4xl uppercase tracking-tight text-[#1A1A1A]">Applications</h1>
          <p className="text-sm text-[#6B6B6B] mt-2.5">Browse the capabilities, or type a vendor and we place it for you.</p>
        </div>
        <div className="flex items-start gap-3 shrink-0">
          <div className="flex flex-col items-start gap-1.5">
            <label htmlFor="ar-org" className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8C7E6E]">Organization</label>
            <input
              id="ar-org"
              value={orgName}
              onChange={(e) => onOrgNameChange(e.target.value)}
              placeholder="Organization name"
              className="w-[180px] h-9 bg-white border border-[#E8E2DA] rounded-[9px] px-3 text-[13px] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] placeholder-[#B4A99B]"
              data-testid="ar-org-name"
            />
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8C7E6E]">Abridge price / yr</label>
            <div className="flex items-center h-9 bg-white border border-[#E8E2DA] rounded-[9px] px-3 gap-1 focus-within:border-[#1A1A1A]">
              <span className="text-[#8C7E6E] text-[13px]">$</span>
              <NumberField
                value={abridgePrice}
                onValueChange={onAbridgePriceChange}
                min={0}
                className="w-[120px] bg-transparent text-[13px] text-[#1A1A1A] outline-none tabular-nums"
                data-testid="ar-abridge-price"
              />
            </div>
            <p className="text-[9.5px] leading-tight text-[#B4A99B] max-w-[168px]">Leave $0 if they already have Abridge — savings is the tools they retire.</p>
          </div>
        </div>
      </div>

      {/* Hero command search */}
      <div className="mt-6"><ArCommandSearch onSelect={openPick} /></div>

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-8 mb-3">
            <div className="text-[11px] font-bold uppercase tracking-[2px] text-[#8C7E6E]" data-testid="ar-stack-count">
              Your stack · {items.length} added
            </div>
            <button
              onClick={() => setBrowseOpen((v) => !v)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E8E2DA] bg-white text-[12px] font-bold text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
              data-testid="ar-add-application"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add application
            </button>
          </div>

          {browseOpen && (
            <div className="mb-4 p-5 bg-[#FAF8F5] border border-[#E8E2DA] rounded-2xl" data-testid="ar-browse-panel">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7E6E] mb-3">Choose a capability to add</div>
              <CapabilityGrid onPick={openPick} />
            </div>
          )}

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[1fr_120px_190px_150px_120px] gap-3.5 px-4 pb-2">
            {COL_HEADERS.map((h, i) => (
              <span key={h} className={`text-[9px] font-bold uppercase tracking-[0.13em] text-[#B4A99B] ${i === COL_HEADERS.length - 1 ? "text-right" : ""}`}>{h}</span>
            ))}
          </div>

          {items.map((it) => (
            <ArStackRow key={it.id} item={it} onChange={(p) => onUpdate(it.id, p)} onRemove={() => onRemove(it.id)} />
          ))}

          {/* Slim total bar with the net */}
          <div className="flex flex-wrap items-center gap-4 mt-4 px-5 py-4 bg-[#FAF8F5] border border-[#E8E2DA] rounded-2xl">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8C7E6E]">Stack today</div>
              <div className="text-[19px] font-extrabold text-[#1A1A1A] tabular-nums">
                {fmtM(net.stackTotal)} <span className="text-[12px] font-medium text-[#8C7E6E]">/ yr</span>
              </div>
            </div>
            <div className="h-2 rounded-md overflow-hidden flex" style={{ width: 170 }}>
              <div style={{ width: `${pctSunset}%`, background: "#EA2C00" }} />
              <div style={{ width: `${100 - pctSunset}%`, background: "#D8CEC1" }} />
            </div>
            <div className="text-[12.5px] text-[#6B6B6B] tabular-nums">
              <b className="text-[#1A1A1A]">{fmtM(net.sunset)}</b> sunsets onto Abridge
              {net.abridgePrice > 0 && (
                <>
                  {" · −"}{fmtM(net.abridgePrice)} Abridge{" · "}
                  <b className={net.isNetCost ? "text-[#1A1A1A]" : "text-[#EA2C00]"}>{fmtM(Math.abs(net.netSavings))}</b>
                  {net.isNetCost ? " net cost" : " net"}
                </>
              )}
              {" · "}{fmtM(net.stays)} stays
            </div>
            <button
              onClick={onContinue}
              className="ml-auto h-11 px-5 rounded-xl bg-[#EA2C00] text-white text-sm font-bold"
              data-testid="ar-see-consolidation"
            >
              See the consolidation →
            </button>
          </div>
        </>
      )}

      {items.length === 0 && (
        <div className="mt-9" data-testid="ar-empty-browse">
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-[#8C7E6E] mb-4">Browse capabilities to consolidate</div>
          <CapabilityGrid onPick={openPick} />
          <p className="text-[12px] text-[#8C7E6E] mt-5">Or search a specific vendor above · add anything not listed as <span className="font-semibold text-[#1A1A1A]">Custom</span>.</p>
        </div>
      )}

      {/* Guided add-tool popup: card / search / custom all route here */}
      <ArAddToolModal
        open={pick !== null}
        category={pick?.category ?? null}
        vendorName={pick?.vendorName}
        onOpenChange={(o) => { if (!o) setPick(null); }}
        onConfirm={(init) => { if (pick) onAdd(pick.category, init); setPick(null); }}
      />
    </div>
  );
}
