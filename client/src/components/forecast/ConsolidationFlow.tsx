// client/src/components/forecast/ConsolidationFlow.tsx
import { useMemo } from "react";
import { computeConsolidationLayout } from "@/lib/consolidationLayout";
import type { AppRatItem } from "@/lib/appRationalizationCalc";

function fmtM(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function ribbonPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

export default function ConsolidationFlow({ items }: { items: AppRatItem[] }) {
  const layout = useMemo(() => computeConsolidationLayout(items), [items]);
  const { width, height, ribbonStartX, sinkX, sinkWidth, sources, ribbons, abridge, stays, totals } = layout;

  if (sources.length === 0) {
    return (
      <div
        className="rounded-[22px] p-10 text-center text-white/60 text-sm"
        style={{ background: "linear-gradient(155deg,#211D18,#141210)" }}
      >
        Add applications with annual spend to see the consolidation.
      </div>
    );
  }

  return (
    <div className="rounded-[22px] p-6 md:p-8" style={{ background: "linear-gradient(155deg,#211D18,#141210)" }}>
      <div className="flex justify-between px-1 pb-4 text-[11px] font-bold uppercase tracking-[2px] text-white/40">
        <span>Your tools · what Abridge takes</span>
        <span>Two ways it lands</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="consolidation-svg">
        {sources.map((s) => {
          const mine = ribbons.filter((r) => r.id === s.id);
          return (
            <g key={s.id} className="crf-fg">
              {mine.map((r) => (
                <path
                  key={r.kind}
                  d={ribbonPath(ribbonStartX, r.y1, sinkX, r.y2)}
                  fill="none"
                  stroke={r.kind === "retired" ? "#EA2C00" : "#6B6258"}
                  strokeOpacity={r.kind === "retired" ? 0.6 : 0.4}
                  strokeWidth={Math.max(1.5, r.thickness)}
                  strokeLinecap="butt"
                />
              ))}
              <text x={40} y={s.rowCenterY - 4} fill="#ffffff" fontSize={15} fontWeight={700}>{s.name}</text>
              <text x={40} y={s.rowCenterY + 13} fill="#8C8377" fontSize={11} style={{ fontVariantNumeric: "tabular-nums" }}>{s.category} · {fmtM(s.spend)}</text>
              <text x={ribbonStartX - 20} y={s.rowCenterY + 2} textAnchor="end" fill="#EA2C00" fontSize={20} fontWeight={800} style={{ fontVariantNumeric: "tabular-nums" }}>{s.coveragePct}%</text>
            </g>
          );
        })}

        <rect x={sinkX} y={abridge.y} width={sinkWidth} height={abridge.height} rx={12} fill="#EA2C00" />
        <text x={sinkX + sinkWidth / 2} y={abridge.y + abridge.height / 2 - 2} textAnchor="middle" fill="#ffffff" fontSize={15} fontWeight={800}>Abridge</text>
        <text x={sinkX + sinkWidth / 2} y={abridge.y + abridge.height / 2 + 16} textAnchor="middle" fill="#ffffff" fontSize={11.5} fontWeight={700} opacity={0.95} style={{ fontVariantNumeric: "tabular-nums" }}>{fmtM(totals.toAbridge)}</text>

        {stays.height > 0 && (
          <>
            <rect x={sinkX} y={stays.y} width={sinkWidth} height={stays.height} rx={8} fill="#2A2621" stroke="#3A342D" />
            <text x={sinkX + sinkWidth} y={stays.y - 8} textAnchor="end" fill="#8C8377" fontSize={11} fontWeight={600} style={{ fontVariantNumeric: "tabular-nums" }}>Stays {fmtM(totals.stays)}</text>
          </>
        )}
      </svg>
      <style>{`svg:hover .crf-fg { opacity: .25; transition: opacity .18s } svg .crf-fg:hover { opacity: 1 }`}</style>
    </div>
  );
}
