// client/src/components/forecast/RoadmapChart.tsx
import { useMemo } from "react";
import { computeRoadmap } from "@/lib/appRationalizationRoadmap";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import type { AppRatItem } from "@/lib/appRationalizationCalc";

const TAUPE = ["#5A5148", "#7A6E60", "#8E8172", "#A2937F", "#B6A78F", "#C6B9A2"];

function fmtM(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export default function RoadmapChart({ items, termYears }: { items: AppRatItem[]; termYears: number }) {
  const rm = useMemo(() => computeRoadmap(items, termYears), [items, termYears]);
  const tools = rm.snapshots[0]?.perTool ?? [];
  const colorFor = (id: string) => {
    const idx = tools.findIndex((t) => t.id === id);
    return TAUPE[(idx < 0 ? 0 : idx) % TAUPE.length];
  };

  // geometry
  const W = 860, baseline = 270, plotTop = 60, plotLeft = 70, plotRight = 800;
  const n = rm.snapshots.length;
  const slotW = (plotRight - plotLeft) / Math.max(1, n);
  const barW = Math.min(76, slotW * 0.5);
  const centerX = (i: number) => plotLeft + slotW * (i + 0.5);
  const maxTotal = Math.max(1, rm.snapshots[0]?.total ?? 1);
  const k = (baseline - plotTop) / maxTotal;
  const yOf = (v: number) => baseline - v * k;

  const trendPts = rm.snapshots.map((s, i) => `${centerX(i)},${yOf(s.total)}`).join(" ");

  if (tools.length === 0) {
    return (
      <div className="rounded-[24px] p-10 text-center text-[#8C7E6E] text-sm" style={{ background: "linear-gradient(180deg,#F8F3EA,#F3ECE0)", border: "1px solid #EBE2D3" }}>
        Add applications with annual spend to see the roadmap.
      </div>
    );
  }

  return (
    <div
      className="rounded-[24px] p-7 md:p-8"
      style={{ background: "linear-gradient(180deg,#F8F3EA,#F3ECE0)", border: "1px solid #EBE2D3", boxShadow: "0 24px 60px rgba(120,100,70,.10), 0 2px 6px rgba(120,100,70,.05)" }}
    >
      <div className="flex justify-between items-start">
        <div className="text-[10.5px] font-bold uppercase tracking-[2px] text-[#8C7E6E] pt-2">Adjacent stack cost · over the term</div>
        <div className="text-right leading-none">
          <AnimatedValue value={rm.totalRetired} format={(v) => `−${fmtM(v)}`} className="text-[30px] font-extrabold text-[#EA2C00] tracking-tight tabular-nums" />
          <div className="text-[11px] text-[#8C7E6E] font-semibold mt-1.5">retired across {rm.termYears} {rm.termYears === 1 ? "year" : "years"}</div>
        </div>
      </div>

      <div className="flex gap-2.5 mt-4 mb-1 items-start" style={{ padding: "11px 15px", background: "rgba(234,44,0,.05)", borderLeft: "3px solid #EA2C00", borderRadius: 8 }}>
        <span className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#EA2C00] pt-0.5 whitespace-nowrap">The read</span>
        <span className="text-[13px] text-[#4A443D] leading-relaxed">{rm.read}</span>
      </div>

      <div className="flex gap-[15px] flex-wrap my-3.5 text-[11.5px] text-[#6B6B6B]">
        {tools.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1.5">
            <i className="w-[11px] h-[11px] rounded-[3px] inline-block" style={{ background: colorFor(t.id) }} />
            {t.name}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} 300`} width="100%" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="roadmap-svg">
        <defs>
          {rm.snapshots.map((s, i) => (
            <clipPath key={i} id={`rm-clip-${i}`}>
              <rect x={centerX(i) - barW / 2} y={yOf(s.total)} width={barW} height={baseline - yOf(s.total) + 12} rx={7} />
            </clipPath>
          ))}
          <filter id="rm-ps" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* y refs */}
        {[0, maxTotal / 2, maxTotal].map((v, i) => (
          <g key={i}>
            <line x1={plotLeft} y1={yOf(v)} x2={plotRight} y2={yOf(v)} stroke={v === 0 ? "#DED4C3" : "#EAE1D2"} />
            <text x={plotLeft - 10} y={yOf(v) + 4} textAnchor="end" fill="#B4A99B" fontSize={10}>{fmtM(v)}</text>
          </g>
        ))}

        {/* trend */}
        <polyline className="rm-trend" points={trendPts} fill="none" stroke="#EA2C00" strokeWidth={1.5} strokeDasharray="6 5" opacity={0.6} />

        {/* bars */}
        {rm.snapshots.map((s, i) => {
          const bx = centerX(i) - barW / 2;
          let cursor = baseline;
          return (
            <g key={i} className="rm-bar" style={{ animationDelay: `${0.05 + i * 0.13}s` }}>
              <g clipPath={`url(#rm-clip-${i})`}>
                {s.perTool.filter((t) => t.remaining > 0).map((t) => {
                  const h = t.remaining * k;
                  const y = cursor - h;
                  cursor = y;
                  return <rect key={t.id} x={bx} y={y} width={barW} height={h} fill={colorFor(t.id)} />;
                })}
              </g>
              <text x={centerX(i)} y={yOf(s.total) - 8} textAnchor="middle" fill="#1A1A1A" fontSize={13.5} fontWeight={800} style={{ fontVariantNumeric: "tabular-nums" }}>{fmtM(s.total)}</text>
              <text x={centerX(i)} y={baseline + 20} textAnchor="middle" fill="#8C7E6E" fontSize={10.5} fontWeight={700} letterSpacing={1}>{s.label.toUpperCase()}</text>
            </g>
          );
        })}

        {/* delta pills */}
        {rm.deltas.filter((d) => d.amount > 0).map((d) => {
          const x = (centerX(d.year - 1) + centerX(d.year)) / 2;
          const py = (yOf(rm.snapshots[d.year - 1].total) + yOf(rm.snapshots[d.year].total)) / 2;
          const label = `−${fmtM(d.amount)}`;
          const w = 30 + label.length * 8;
          return (
            <g key={d.year} className="rm-pill" style={{ animationDelay: `${0.9 + d.year * 0.18}s` }} filter="url(#rm-ps)">
              <rect x={x - w / 2} y={py - 11} width={w} height={22} rx={11} fill="#EA2C00" />
              <text x={x} y={py + 4} textAnchor="middle" fill="#fff" fontSize={11.5} fontWeight={800} style={{ fontVariantNumeric: "tabular-nums" }}>{label}</text>
            </g>
          );
        })}
      </svg>

      <div className="grid gap-2.5 mt-5" style={{ gridTemplateColumns: `repeat(${Math.min(rm.deltas.length, 4)}, 1fr)` }}>
        {rm.deltas.filter((d) => d.amount > 0).slice(0, 4).map((d) => (
          <div key={d.year} className="rounded-[12px] p-[13px_15px]" style={{ background: "#FCFAF5", border: "1px solid #ECE4D6" }}>
            <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#8C7E6E]">Year {d.year}</div>
            <div className="text-[12.5px] text-[#4A443D] mt-1.5">{d.tools.join(", ")}</div>
            <div className="text-[16px] font-extrabold text-[#EA2C00] mt-1.5 tabular-nums">−{fmtM(d.amount)}</div>
            <div className="text-[10.5px] text-[#8C7E6E] mt-1 tabular-nums">running {fmtM(d.running)} retired</div>
          </div>
        ))}
      </div>

      <style>{`
        .rm-bar{opacity:1}
        .rm-pill{opacity:1}
        @media (prefers-reduced-motion: no-preference){
          .rm-bar{opacity:0;transform:translateY(20px);animation:rmRise .7s cubic-bezier(.2,.7,.3,1) forwards}
          .rm-trend{stroke-dashoffset:900;animation:rmDraw 1.1s .5s ease-out forwards}
          .rm-pill{opacity:0;transform:scale(.85);animation:rmPop .4s both}
        }
        @keyframes rmRise{to{opacity:1;transform:translateY(0)}}
        @keyframes rmDraw{to{stroke-dashoffset:0}}
        @keyframes rmPop{to{opacity:1;transform:scale(1)}}
      `}</style>
    </div>
  );
}
