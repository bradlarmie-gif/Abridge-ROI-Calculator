import ArCommandSearch from "./ArCommandSearch";
import ArStackCard from "./ArStackCard";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import { computeTotals, type AppRatItem, type AppRatCategoryId } from "@/lib/appRationalizationCalc";

function fmtM(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export default function ArApplicationsStep({
  items, onAdd, onUpdate, onRemove, onContinue,
}: {
  items: AppRatItem[];
  onAdd: (category: AppRatCategoryId, vendorName?: string) => void;
  onUpdate: (id: string, patch: Partial<AppRatItem>) => void;
  onRemove: (id: string) => void;
  onContinue: () => void;
}) {
  const totals = computeTotals(items);

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8">
      <h1 className="font-abridge text-4xl uppercase tracking-tight text-[#1A1A1A] text-center">Applications</h1>
      <p className="text-sm text-[#6B6B6B] text-center mt-2.5 mb-8">
        Browse the capabilities, or type a vendor and we place it for you.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_296px] gap-6 items-start">
        <div>
          <div className="mb-6"><ArCommandSearch onSelect={onAdd} /></div>

          {items.length > 0 && (
            <div className="text-[11px] font-bold uppercase tracking-[2px] text-[#8C7E6E] mb-3" data-testid="ar-stack-count">
              Your stack · {items.length} added
            </div>
          )}
          {items.map((it) => (
            <ArStackCard key={it.id} item={it} onChange={(p) => onUpdate(it.id, p)} onRemove={() => onRemove(it.id)} />
          ))}
        </div>

        <div className="lg:sticky lg:top-20 rounded-2xl p-5 text-white" style={{ background: "linear-gradient(155deg,#221E19,#141210)" }}>
          <div className="text-[10px] font-bold uppercase tracking-[1.6px] text-white/45">Stack today</div>
          <AnimatedValue value={totals.stackTotal} format={fmtM} className="block text-[32px] font-extrabold tracking-tight mt-1.5 tabular-nums" data-testid="ar-sidebar-total" />
          <div className="text-xs text-white/50 mt-1">/ year · {items.length} {items.length === 1 ? "application" : "applications"}</div>

          <div className="my-4">
            <div className="flex justify-between items-center text-[12.5px] mb-2">
              <span className="flex items-center gap-2 text-white/80"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#EA2C00" }} />To Abridge</span>
              <b className="tabular-nums">{fmtM(totals.toAbridge)}</b>
            </div>
            <div className="flex justify-between items-center text-[12.5px]">
              <span className="flex items-center gap-2 text-white/80"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#D8CEC1" }} />Stays</span>
              <b className="tabular-nums">{fmtM(totals.stays)}</b>
            </div>
            <div className="h-2 rounded-md overflow-hidden flex mt-2">
              <div style={{ width: `${totals.pctToAbridge}%`, background: "#EA2C00" }} />
              <div style={{ width: `${100 - totals.pctToAbridge}%`, background: "#D8CEC1" }} />
            </div>
          </div>

          <button
            onClick={onContinue}
            disabled={items.length === 0}
            className="w-full h-11 rounded-xl bg-[#EA2C00] text-white text-sm font-bold disabled:opacity-40"
            data-testid="ar-see-consolidation"
          >
            See the consolidation →
          </button>
        </div>
      </div>
    </div>
  );
}
