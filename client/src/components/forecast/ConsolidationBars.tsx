import { useMemo, useState } from "react";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import { buildStackBars, computeNet, type AppRatItem } from "@/lib/appRationalizationCalc";
import { computeRoadmap } from "@/lib/appRationalizationRoadmap";

const TAUPE = ["#5A5148", "#7A6E60", "#8E8172", "#A2937F", "#B6A78F", "#C6B9A2"];
const TERM_OPTIONS = [2, 3, 4, 5];

function fmtM(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
}

interface Seg { key: string; label: string; value: string; widthPct: number; centerPct: number; color: string; }

function Bar({ segments, animClass, height = 48 }: { segments: Seg[]; animClass: string; height?: number }) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const hovered = segments.find((s) => s.key === hoverKey) ?? null;
  return (
    <div className="relative">
      {hovered && (
        <div
          className="absolute z-10 pointer-events-none -translate-x-1/2"
          style={{ left: `${hovered.centerPct}%`, bottom: `${height + 10}px` }}
        >
          <div className="bg-[#1A1A1A] text-white rounded-lg px-3 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.18)] whitespace-nowrap">
            <div className="text-[11px] font-semibold leading-tight">{hovered.label}</div>
            <div className="text-[11px] text-white/70 tabular-nums leading-tight">{hovered.value}</div>
          </div>
        </div>
      )}
      <div
        className={`flex rounded-xl overflow-hidden ${animClass}`}
        style={{ height, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05)" }}
      >
        {segments.map((s, i) => (
          <div
            key={s.key}
            className="h-full transition-[filter] duration-150"
            style={{
              width: `${s.widthPct}%`,
              background: s.color,
              borderLeft: i > 0 ? "2px solid #fff" : undefined,
              filter: hoverKey && hoverKey !== s.key ? "brightness(0.88)" : hoverKey === s.key ? "brightness(1.06)" : undefined,
            }}
            onMouseEnter={() => setHoverKey(s.key)}
            onMouseLeave={() => setHoverKey(null)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ConsolidationBars({
  items, abridgePrice, termYears, onTermChange,
}: { items: AppRatItem[]; abridgePrice: number; termYears: number; onTermChange: (y: number) => void }) {
  const bars = useMemo(() => buildStackBars(items), [items]);
  const net = useMemo(() => computeNet(items, abridgePrice), [items, abridgePrice]);
  const roadmap = useMemo(() => computeRoadmap(items, termYears, abridgePrice), [items, termYears, abridgePrice]);

  const { todaySegs, abridgeSegs } = useMemo(() => {
    const total = Math.max(1, bars.stackTotal);
    const shade = (i: number) => TAUPE[i % TAUPE.length];

    let a = 0;
    const todaySegs: Seg[] = bars.tools.map((t, i) => {
      const widthPct = (t.spend / total) * 100;
      const seg: Seg = { key: t.id, label: t.name, value: `${fmtM(t.spend)} / yr`, widthPct, centerPct: a + widthPct / 2, color: shade(i) };
      a += widthPct;
      return seg;
    });

    let b = 0;
    const abridgeSegs: Seg[] = [];
    if (bars.sunset > 0) {
      const coralW = (bars.sunset / total) * 100;
      abridgeSegs.push({ key: "abridge", label: "Sunsets onto Abridge", value: fmtM(bars.sunset), widthPct: coralW, centerPct: b + coralW / 2, color: "#EA2C00" });
      b += coralW;
    }
    bars.tools.forEach((t, i) => {
      if (t.stays <= 0) return;
      const w = (t.stays / total) * 100;
      abridgeSegs.push({ key: `${t.id}-stays`, label: `${t.name} stays`, value: fmtM(t.stays), widthPct: w, centerPct: b + w / 2, color: shade(i) });
      b += w;
    });

    return { todaySegs, abridgeSegs };
  }, [bars]);

  if (bars.stackTotal === 0) {
    return (
      <div className="rounded-[18px] border border-[#E8E2DA] bg-white p-10 text-center text-sm text-[#8C7E6E]" data-testid="ar-consolidation-bars-empty">
        Add applications with annual spend to see the consolidation.
      </div>
    );
  }

  const futureSpend = net.abridgePrice + net.stays;

  return (
    <div className="rounded-[18px] border border-[#E8E2DA] bg-white p-6 md:p-7" data-testid="ar-consolidation-bars">
      {/* Header: The Consolidation + net savings hero */}
      <div className="flex items-start justify-between gap-6 mb-7">
        <div className="font-abridge uppercase tracking-[0.03em] text-[18px] text-[#1A1A1A] pt-1">The Consolidation</div>
        <div className="text-right leading-none">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7E6E] mb-1.5">
            {net.isNetCost ? "Net cost / yr" : "Net savings / yr"}
          </div>
          <AnimatedValue
            value={Math.abs(net.netSavings)}
            format={fmtM}
            className={`text-[34px] font-extrabold tabular-nums ${net.isNetCost ? "text-[#1A1A1A]" : "text-[#EA2C00]"}`}
            style={{ letterSpacing: "-0.01em" }}
            data-testid="ar-bars-net"
          />
          <div className="text-[12px] text-[#8C7E6E] tabular-nums mt-1.5">
            {fmtM(bars.stackTotal)} today → {fmtM(futureSpend)} on Abridge
          </div>
        </div>
      </div>

      {/* Today bar */}
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[12px] font-bold text-[#1A1A1A]">Today · fragmented</span>
        <span className="text-[12px] text-[#8C7E6E] tabular-nums">{fmtM(bars.stackTotal)} / yr</span>
      </div>
      <Bar segments={todaySegs} animClass="cb-wipe cb-wipe-1" />
      <div className="mt-2 text-[11px] text-[#8C7E6E]">Each tool, sized by spend</div>

      {/* On Abridge bar */}
      <div className="flex justify-between items-baseline mb-2 mt-6">
        <span className="text-[12px] font-bold text-[#1A1A1A]">On Abridge</span>
        <span className="text-[12px] text-[#8C7E6E] tabular-nums">{fmtM(bars.stackTotal)} / yr</span>
      </div>
      <Bar segments={abridgeSegs} animClass="cb-wipe cb-wipe-2" />
      <div className="mt-2 flex justify-between text-[11px]">
        <span className="text-[#8C7E6E]"><b className="text-[#EA2C00]">{fmtM(bars.sunset)}</b> sunsets onto Abridge</span>
        <span className="text-[#8C7E6E] tabular-nums">{fmtM(bars.stays)} stays</span>
      </div>

      {/* Phasing: how the sunset lands across the contract term */}
      <div className="mt-6 pt-5 border-t border-[#F0EBE4]">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7E6E]">How the sunset lands</span>
          <div className="flex items-center gap-2 text-[11px] text-[#8C7E6E]">
            <span>over a</span>
            <select
              value={termYears}
              onChange={(e) => onTermChange(Number(e.target.value))}
              className="h-8 bg-white border border-[#E8E2DA] rounded-lg px-2.5 text-[12px] text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
              data-testid="ar-term-select"
            >
              {TERM_OPTIONS.map((y) => <option key={y} value={y}>{y}-year</option>)}
            </select>
            <span>term</span>
          </div>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${roadmap.deltas.length}, minmax(0, 1fr))` }}>
          {roadmap.deltas.map((d) => (
            <div key={d.year} className="rounded-xl border border-[#EFE7DC] bg-[#FAF8F5] px-3 py-2.5" data-testid={`ar-phase-year-${d.year}`}>
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8C7E6E]">Year {d.year}</div>
              <div className={`text-[15px] font-extrabold tabular-nums mt-0.5 ${d.amount > 0 ? "text-[#EA2C00]" : "text-[#C4B8A8]"}`}>{fmtM(d.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference){
          .cb-wipe { clip-path: inset(0 100% 0 0); animation: cbWipe .7s cubic-bezier(.4,.7,.3,1) forwards; }
          .cb-wipe-2 { animation-delay: .38s; }
        }
        @keyframes cbWipe { to { clip-path: inset(0 0 0 0); } }
      `}</style>
    </div>
  );
}
