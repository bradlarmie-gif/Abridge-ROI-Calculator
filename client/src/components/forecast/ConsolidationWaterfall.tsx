// client/src/components/forecast/ConsolidationWaterfall.tsx
// The consolidation hero: a deal-bridge waterfall. Today is a composed stack of
// the tools; each tool peels off into a coral step (taupe -> coral = "your tool
// becomes Abridge") as it sunsets; it lands on what stays. Below, a compact
// "how the sunset lands" phasing strip over the contract term.
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { buildStackBars, type AppRatItem } from "@/lib/appRationalizationCalc";
import { computeRoadmap } from "@/lib/appRationalizationRoadmap";

const TAUPE = ["#5A5148", "#7A6E60", "#8E8172", "#A2937F", "#B6A78F", "#C6B9A2"];
const STAYS_COLOR = "#C6B9A2";
const TERM_OPTIONS = [2, 3, 4, 5];

// geometry
const VB_W = 760;
const VB_H = 324;
const PLOT_LEFT = 56;
const PLOT_RIGHT = 712;
const BASELINE = 262;
const PLOT_TOP = 46;

function fmtM(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
}

export default function ConsolidationWaterfall({
  items, termYears, onTermChange,
}: { items: AppRatItem[]; termYears: number; onTermChange: (y: number) => void }) {
  const [hover, setHover] = useState<{ id: string; label: string; value: string; centerPct: number } | null>(null);
  const bars = useMemo(() => buildStackBars(items), [items]);
  const roadmap = useMemo(() => computeRoadmap(items, termYears), [items, termYears]);

  const L = useMemo(() => {
    const shadeFor = (i: number) => TAUPE[i % TAUPE.length];
    const todaySegs = bars.tools.map((t, i) => ({ id: t.id, name: t.name, spend: t.spend, shade: shadeFor(i) }));

    let running = bars.stackTotal;
    const steps = bars.tools
      .map((t, i) => ({ t, i }))
      .filter((x) => x.t.sunset > 0)
      .map(({ t, i }) => {
        const before = running;
        running -= t.sunset;
        return { id: t.id, name: t.name, amount: t.sunset, before, after: running, shade: shadeFor(i) };
      });

    const n = 2 + steps.length; // Today + steps + Stays
    const slotW = (PLOT_RIGHT - PLOT_LEFT) / n;
    const barW = Math.min(72, slotW * 0.56);
    const centerX = (i: number) => PLOT_LEFT + slotW * (i + 0.5);
    const maxV = Math.max(1, bars.stackTotal);
    const k = (BASELINE - PLOT_TOP) / maxV;
    const yOf = (v: number) => BASELINE - v * k;

    return { todaySegs, steps, n, barW, centerX, yOf, stays: bars.stays, stackTotal: bars.stackTotal, sunset: bars.sunset };
  }, [bars]);

  if (bars.stackTotal === 0) {
    return (
      <div className="rounded-[20px] p-10 text-center text-sm text-[#8C7E6E]" style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }} data-testid="ar-waterfall-empty">
        Add applications with annual spend to see the consolidation.
      </div>
    );
  }

  const { todaySegs, steps, n, barW, centerX, yOf } = L;
  const staysX = n - 1;
  const dim = (id: string) => hover !== null && hover.id !== id;

  // Today stacked segments (top to bottom by spend)
  let cursorV = L.stackTotal;
  const todayRects = todaySegs.map((s) => {
    const topV = cursorV;
    const botV = cursorV - s.spend;
    cursorV = botV;
    return { ...s, y: yOf(topV), h: yOf(botV) - yOf(topV) };
  });

  return (
    <div className="rounded-[20px] p-6 md:p-7" style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }} data-testid="ar-waterfall">
      <div className="relative">
        {hover && (
          <div className="absolute z-10 -translate-x-1/2 pointer-events-none" style={{ left: `${hover.centerPct}%`, top: 0 }}>
            <div className="bg-[#1A1A1A] text-white rounded-lg px-3 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.18)] whitespace-nowrap">
              <div className="text-[11px] font-semibold leading-tight">{hover.label}</div>
              <div className="text-[11px] text-white/70 tabular-nums leading-tight">{hover.value}</div>
            </div>
          </div>
        )}
        <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-[2px] text-[#B4A99B]">Your stack, consolidated</div>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="ar-waterfall-svg">
          {/* baseline */}
          <line x1={PLOT_LEFT} y1={BASELINE} x2={PLOT_RIGHT} y2={BASELINE} stroke="#E0D7C8" />

          {/* connectors at running levels */}
          <g stroke="#C4B8A8" strokeDasharray="4 4">
            {steps.length > 0 && (
              <line x1={centerX(0) + barW / 2} y1={yOf(L.stackTotal)} x2={centerX(1) - barW / 2} y2={yOf(L.stackTotal)} />
            )}
            {steps.map((s, j) => (
              <line key={s.id} x1={centerX(1 + j) + barW / 2} y1={yOf(s.after)} x2={centerX(1 + j + 1) - barW / 2} y2={yOf(s.after)} />
            ))}
          </g>

          {/* TODAY: composed stack of tools */}
          <g opacity={hover === null ? 1 : 0.999}>
            {todayRects.map((r) => (
              <rect
                key={r.id}
                x={centerX(0) - barW / 2}
                y={r.y}
                width={barW}
                height={Math.max(1, r.h)}
                fill={r.shade}
                opacity={dim(r.id) ? 0.35 : 1}
                stroke="#FDFBF8"
                strokeWidth={1.5}
                onMouseEnter={() => setHover({ id: r.id, label: r.name, value: `${fmtM(r.spend)} / yr`, centerPct: (centerX(0) / VB_W) * 100 })}
                onMouseLeave={() => setHover(null)}
              />
            ))}
            <text x={centerX(0)} y={yOf(L.stackTotal) - 9} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1A1A1A" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtM(L.stackTotal)}</text>
          </g>

          {/* DECREMENT steps: each tool sunsets (taupe -> coral) */}
          {steps.map((s, j) => {
            const yTop = yOf(s.before);
            const h = yOf(s.after) - yTop;
            return (
              <g key={s.id}>
                <rect
                  className="wf-step"
                  style={{ ["--wf-from" as string]: s.shade, animationDelay: `${0.15 + j * 0.16}s` }}
                  x={centerX(1 + j) - barW / 2}
                  y={yTop}
                  width={barW}
                  height={Math.max(2, h)}
                  rx={4}
                  fill="#EA2C00"
                  opacity={dim(s.id) ? 0.28 : 1}
                  onMouseEnter={() => setHover({ id: s.id, label: s.name, value: `${fmtM(s.amount)} sunsets onto Abridge`, centerPct: (centerX(1 + j) / VB_W) * 100 })}
                  onMouseLeave={() => setHover(null)}
                />
                <text x={centerX(1 + j)} y={yTop + Math.max(2, h) / 2 + 4} textAnchor="middle" fontSize={h > 26 ? 11 : 9} fontWeight={700} fill={h > 26 ? "#fff" : "#B23A12"} style={{ fontVariantNumeric: "tabular-nums" }}>−{fmtM(s.amount)}</text>
              </g>
            );
          })}

          {/* STAYS */}
          <rect x={centerX(staysX) - barW / 2} y={yOf(L.stays)} width={barW} height={Math.max(2, BASELINE - yOf(L.stays))} rx={4} fill={STAYS_COLOR} />
          <text x={centerX(staysX)} y={yOf(L.stays) - 9} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1A1A1A" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtM(L.stays)}</text>

          {/* x labels */}
          <g fontSize={10} fill="#8C7E6E" textAnchor="middle">
            <text x={centerX(0)} y={BASELINE + 18} fill="#1A1A1A" fontWeight={700}>Today</text>
            {steps.map((s, j) => (
              <text key={s.id} x={centerX(1 + j)} y={BASELINE + 18}>{s.name}</text>
            ))}
            <text x={centerX(staysX)} y={BASELINE + 18} fill="#1A1A1A" fontWeight={700}>Stays</text>
          </g>

          {/* sunset bracket + total */}
          {steps.length > 0 && (
            <>
              <path
                d={`M${centerX(1) - barW / 2},${BASELINE + 34} L${centerX(1) - barW / 2},${BASELINE + 40} L${centerX(steps.length) + barW / 2},${BASELINE + 40} L${centerX(steps.length) + barW / 2},${BASELINE + 34}`}
                fill="none" stroke="#EA2C00" strokeWidth={1.5} opacity={0.5}
              />
              <text x={(centerX(1) + centerX(steps.length)) / 2} y={BASELINE + 56} textAnchor="middle" fontSize={11} fontWeight={700} fill="#EA2C00">{fmtM(L.sunset)} sunsets onto Abridge</text>
            </>
          )}
        </svg>
      </div>

      {/* Phasing: how the sunset lands across the term */}
      <div className="mt-6 pt-5 border-t border-[#F0EBE4]">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7E6E]">How the sunset lands</span>
          <div className="flex items-center gap-2 text-[11px] text-[#8C7E6E]">
            <span>over a</span>
            <div className="relative">
              <select
                value={termYears}
                onChange={(e) => onTermChange(Number(e.target.value))}
                className="h-8 appearance-none bg-white border border-[#E8E2DA] rounded-lg pl-2.5 pr-7 text-[12px] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] cursor-pointer"
                data-testid="ar-term-select"
              >
                {TERM_OPTIONS.map((y) => <option key={y} value={y}>{y}-year</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C7E6E]" strokeWidth={2.25} />
            </div>
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
          .wf-step { animation: wfStep .6s ease-out both; }
        }
        @keyframes wfStep { from { fill: var(--wf-from); opacity: .25 } to { fill: #EA2C00; opacity: 1 } }
      `}</style>
    </div>
  );
}
