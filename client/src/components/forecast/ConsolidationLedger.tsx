import { useMemo } from "react";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import { computeNet, type AppRatItem } from "@/lib/appRationalizationCalc";

function fmtM(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
}

export default function ConsolidationLedger({
  items, abridgePrice,
}: { items: AppRatItem[]; abridgePrice: number }) {
  const net = useMemo(() => computeNet(items, abridgePrice), [items, abridgePrice]);
  const hasPrice = net.abridgePrice > 0;

  // Segments of the whole stack for the vertical bar. Positive net:
  // Net savings + Abridge price + Stays = stackTotal. Net cost: no negative
  // segment, show Sunsets + Stays only.
  const total = Math.max(1, net.stackTotal);
  const pct = (v: number) => `${(v / total) * 100}%`;
  const segments = net.isNetCost
    ? [
        { key: "sunset", label: "Sunsets onto Abridge", value: net.sunset, color: "#EA2C00" },
        { key: "stays",  label: "Stays in place",       value: net.stays,  color: "#D8CEC1" },
      ]
    : [
        { key: "net",   label: "Net savings",    value: Math.max(0, net.netSavings), color: "#EA2C00" },
        ...(hasPrice ? [{ key: "price", label: "Abridge price", value: net.abridgePrice, color: "#B23A12" }] : []),
        { key: "stays", label: "Stays in place", value: net.stays, color: "#D8CEC1" },
      ];

  const netLabel = net.isNetCost ? "Net cost / yr" : "Net savings / yr";

  return (
    <div
      className="bg-white border border-[#E8E2DA] rounded-[18px] p-6 md:p-7 grid grid-cols-1 md:grid-cols-[1fr_1px_minmax(220px,0.9fr)] gap-6 md:gap-7 items-center"
      data-testid="ar-consolidation-ledger"
    >
      {/* Left: ledger */}
      <div>
        <div className="font-abridge uppercase tracking-[0.03em] text-[17px] text-[#1A1A1A] mb-4">The Consolidation</div>

        <div className="flex justify-between items-baseline text-sm mt-2.5">
          <span className="text-[#6B6B6B]">Sunsets onto Abridge</span>
          <AnimatedValue value={net.sunset} format={fmtM} className="font-bold text-[#1A1A1A] tabular-nums" />
        </div>

        {hasPrice && (
          <div className="flex justify-between items-baseline text-sm mt-2.5">
            <span className="text-[#6B6B6B]">Abridge price</span>
            <AnimatedValue value={net.abridgePrice} format={(v) => `−${fmtM(v)}`} className="font-bold text-[#8C7E6E] tabular-nums" />
          </div>
        )}

        <div className="border-t border-[#E8E2DA] mt-3.5 mb-1" />

        <div className="flex justify-between items-baseline mt-3">
          <span className="text-[13px] font-bold text-[#1A1A1A]">{netLabel}</span>
          <AnimatedValue
            value={Math.abs(net.netSavings)}
            format={fmtM}
            className={`text-[34px] font-extrabold tabular-nums ${net.isNetCost ? "text-[#1A1A1A]" : "text-[#EA2C00]"}`}
            style={{ letterSpacing: "-0.01em" }}
            data-testid="ar-ledger-net"
          />
        </div>
        <div className="text-[12px] text-[#8C7E6E] mt-1.5">+ {fmtM(net.stays)} stays in place</div>
      </div>

      {/* Divider */}
      <div className="hidden md:block bg-[#E8E2DA] w-px h-full" />

      {/* Right: vertical proportion bar */}
      <div className="flex items-center gap-4">
        <div
          className="w-[46px] h-[210px] rounded-[10px] overflow-hidden flex flex-col shrink-0"
          style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,.03)" }}
          data-testid="ar-ledger-bar"
        >
          {segments.map((s) => (
            <div key={s.key} style={{ height: pct(s.value), background: s.color }} />
          ))}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7E6E] mb-3">Your {fmtM(net.stackTotal)} stack</div>
          {segments.map((s) => (
            <div key={s.key} className="mb-3">
              <div className="text-[11px] text-[#6B6B6B] flex items-center gap-2">
                <i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: s.color }} />
                {s.label}
              </div>
              <div className="text-[15px] font-extrabold text-[#1A1A1A] tabular-nums mt-0.5">{fmtM(s.value)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
