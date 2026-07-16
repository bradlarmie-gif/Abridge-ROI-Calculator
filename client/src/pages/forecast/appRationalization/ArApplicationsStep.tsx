import { useMemo } from "react";
import ArCommandSearch from "./ArCommandSearch";
import ArStackRow from "./ArStackRow";
import { NumberField } from "@/components/NumberField";
import { computeNet, type AppRatItem, type AppRatCategoryId } from "@/lib/appRationalizationCalc";

function fmtM(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
}

const COL_HEADERS = ["Application", "Annual spend", "How much could you displace?", "Over", "Displaceable"];

export default function ArApplicationsStep({
  items, orgName, onOrgNameChange, abridgePrice, onAbridgePriceChange, onAdd, onUpdate, onRemove, onContinue,
}: {
  items: AppRatItem[];
  orgName: string;
  onOrgNameChange: (v: string) => void;
  abridgePrice: number;
  onAbridgePriceChange: (v: number) => void;
  onAdd: (category: AppRatCategoryId, vendorName?: string) => void;
  onUpdate: (id: string, patch: Partial<AppRatItem>) => void;
  onRemove: (id: string) => void;
  onContinue: () => void;
}) {
  const net = useMemo(() => computeNet(items, abridgePrice), [items, abridgePrice]);
  const pctSunset = net.stackTotal > 0 ? Math.round((net.sunset / net.stackTotal) * 100) : 0;

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8">
      {/* Header: title + org + Abridge price */}
      <div className="flex items-start justify-between gap-6 mb-2">
        <div>
          <h1 className="font-abridge text-4xl uppercase tracking-tight text-[#1A1A1A]">Applications</h1>
          <p className="text-sm text-[#6B6B6B] mt-2.5">Browse the capabilities, or type a vendor and we place it for you.</p>
        </div>
        <div className="flex items-end gap-3 shrink-0">
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
          </div>
        </div>
      </div>

      {/* Hero command search */}
      <div className="mt-6"><ArCommandSearch onSelect={onAdd} /></div>

      {items.length > 0 && (
        <>
          <div className="text-[11px] font-bold uppercase tracking-[2px] text-[#8C7E6E] mt-8 mb-3" data-testid="ar-stack-count">
            Your stack · {items.length} added
          </div>

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
        <p className="text-center text-[13px] text-[#8C7E6E] mt-10" data-testid="ar-empty-hint">
          Search a vendor or pick a capability above to start building the stack.
        </p>
      )}
    </div>
  );
}
