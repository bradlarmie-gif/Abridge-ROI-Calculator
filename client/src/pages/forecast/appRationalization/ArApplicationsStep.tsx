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

const COL_HEADERS = ["Application", "Price / yr", "How much could you displace?", "Displaceable"];

// The documentation stack, read top to bottom: what you capture, how you keep it
// coded and clean, and what you reach for at the point of care. Every non-custom
// capability in APP_RAT_CATEGORIES belongs to exactly one layer; custom is added
// through the affordance below the layers, never as a browsable card.
const CAPABILITY_LAYERS: { num: string; name: string; ids: AppRatCategoryId[] }[] = [
  { num: "01", name: "Capture", ids: ["ambientDoc", "dictation", "scribe", "transcription"] },
  { num: "02", name: "Coding & integrity", ids: ["preChartRisk", "inEncounterCdi", "postChartCoding"] },
  { num: "03", name: "Decision support", ids: ["cds", "clinicalEvidence"] },
];

function CapabilityCard({ id, onPick }: { id: AppRatCategoryId; onPick: (category: AppRatCategoryId) => void }) {
  const cat = APP_RAT_CATEGORIES.find((c) => c.id === id);
  if (!cat) return null;

  if (cat.comingSoon) {
    return (
      <div
        aria-disabled
        className="relative bg-[#FAF7F2] border border-dashed border-[#C9BBA9] rounded-2xl p-[17px_18px] cursor-not-allowed"
        data-testid={`ar-browse-${cat.id}`}
      >
        <span className="absolute top-[15px] right-[15px] text-[8.5px] font-extrabold uppercase tracking-[0.09em] text-[#8C7E6E] bg-white border border-[#E8E2DA] rounded-full px-2 py-[3px]">
          Coming soon
        </span>
        <div className="w-[42px] h-[42px] rounded-xl bg-[#EFE7DC] flex items-center justify-center text-[#B4A99B]">
          <CategoryIcon icon={cat.icon} className="w-5 h-5" />
        </div>
        <p className="font-bold text-[14.5px] text-[#8C7E6E] mt-[13px]">{cat.label}</p>
        <p className="text-[12px] text-[#B4A99B] mt-[3px] truncate">{cat.hint}</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => onPick(cat.id)}
      className="group text-left bg-white border border-[#E8E2DA] rounded-2xl p-[17px_18px] hover:border-[#1A1A1A] transition-all"
      data-testid={`ar-browse-${cat.id}`}
    >
      <div className="w-[42px] h-[42px] rounded-xl bg-[#F5F0EB] flex items-center justify-center text-[#6B5E4F] group-hover:bg-[#EA2C00]/10 group-hover:text-[#EA2C00] transition-colors">
        <CategoryIcon icon={cat.icon} className="w-5 h-5" />
      </div>
      <p className="font-bold text-[14.5px] text-[#1A1A1A] mt-[13px]">{cat.label}</p>
      <p className="text-[12px] text-[#8C7E6E] mt-[3px] truncate">{cat.hint}</p>
    </button>
  );
}

// The three-layer stack map: each layer is a numbered header (coral number +
// Abridge-face name + a thin rule) over a grid of its capabilities.
function CapabilityLayers({ onPick }: { onPick: (category: AppRatCategoryId) => void }) {
  return (
    <div>
      {CAPABILITY_LAYERS.map((layer, i) => (
        <div key={layer.num} className={i === 0 ? "" : "mt-8"}>
          <div className="flex items-baseline gap-[15px] mb-[18px]">
            <span className="font-abridge text-[15px] text-[#EA2C00] tracking-[0.02em]">{layer.num}</span>
            <span className="font-abridge text-[26px] text-[#1A1A1A] tracking-[0.01em]">{layer.name}</span>
            <span className="flex-1 h-px bg-[#E8E2DA] self-center" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {layer.ids.map((id) => (
              <CapabilityCard key={id} id={id} onPick={onPick} />
            ))}
          </div>
        </div>
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

  // The "not on the list" affordance under the layers: routes to the custom path.
  const customAffordance = (
    <button
      onClick={() => openPick("custom")}
      className="group flex items-center gap-2.5 mt-6 text-[13.5px] text-[#8C7E6E]"
      data-testid="ar-add-custom-tool"
    >
      <span className="w-[26px] h-[26px] rounded-lg border border-dashed border-[#C9BBA9] flex items-center justify-center text-[#8C7E6E] group-hover:border-[#1A1A1A] group-hover:text-[#1A1A1A] transition-colors">
        <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
      </span>
      <span>
        Running something that isn't listed? <b className="font-bold text-[#1A1A1A]">Add it as a custom tool.</b>
      </span>
    </button>
  );

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8">
      {/* Topbar: eyebrow + org + Abridge price */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="text-[11px] font-bold uppercase tracking-[1.4px] text-[#8C7E6E] pt-1">Forecast · App Rationalization</div>
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
            <p className="text-[9.5px] leading-tight text-[#B4A99B] max-w-[168px]">Leave $0 if they already have Abridge; savings is the tools they retire.</p>
          </div>
        </div>
      </div>

      {/* Hero: editorial headline + subhead */}
      <div>
        <h1 className="font-abridge text-[38px] leading-[1.08] text-[#1A1A1A] max-w-[720px]">What's in your documentation stack?</h1>
        <p className="text-[16px] leading-[1.5] text-[#8C7E6E] mt-[15px] max-w-[600px]">
          Pick a capability to add, or search a vendor. Everything you run around the clinical note, in one place.
        </p>
      </div>

      {/* Hero command search */}
      <div className="mt-7"><ArCommandSearch onSelect={openPick} /></div>

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
            <div className="mb-4 p-5 bg-[#FAF7F2] border border-[#E8E2DA] rounded-2xl" data-testid="ar-browse-panel">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#443A32] mb-4">Choose a capability to add</div>
              <CapabilityLayers onPick={openPick} />
              {customAffordance}
            </div>
          )}

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[1fr_120px_220px_130px] gap-3.5 px-4 pb-2">
            {COL_HEADERS.map((h, i) => (
              <span key={h} className={`text-[9px] font-bold uppercase tracking-[0.13em] text-[#B4A99B] ${i === COL_HEADERS.length - 1 ? "text-right" : ""}`}>{h}</span>
            ))}
          </div>

          {items.map((it) => (
            <ArStackRow key={it.id} item={it} onChange={(p) => onUpdate(it.id, p)} onRemove={() => onRemove(it.id)} />
          ))}

          {/* Slim total bar with the net */}
          <div className="flex flex-wrap items-center gap-4 mt-4 px-5 py-4 bg-[#FAF7F2] border border-[#E8E2DA] rounded-2xl">
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
        <div className="mt-12" data-testid="ar-empty-browse">
          <CapabilityLayers onPick={openPick} />
          {customAffordance}
        </div>
      )}

      {/* Guided add-tool popup: card / search / custom all route here */}
      <ArAddToolModal
        open={pick !== null}
        category={pick?.category ?? null}
        vendorName={pick?.vendorName}
        onOpenChange={(o) => { if (!o) setPick(null); }}
        onConfirm={(category, init) => { onAdd(category, init); setPick(null); }}
      />
    </div>
  );
}
