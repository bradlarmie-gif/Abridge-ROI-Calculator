// client/src/components/forecast/ConsolidationWaterfall.tsx
// The consolidation hero: an editorial deal-bridge waterfall (Direction A).
// Today is a composed stack of the tools; each peels off into a coral step
// (taupe -> coral = "your tool becomes Abridge") as it sunsets, landing on what
// stays. SVG draws the bars/connectors; all type is crisp HTML (AnimatedValue
// count-ups) overlaid by percentage so it scales. Phasing strip folded in below.
import { useMemo, useState } from "react";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import { buildStackBars, type AppRatItem } from "@/lib/appRationalizationCalc";

const TODAY_COLOR = "#7E7263";   // one warm neutral for the whole current stack
const STAYS_COLOR = "#C6B9A2";

// SVG geometry (labels overlaid in HTML by percentage of these dims)
const VB_W = 760, VB_H = 262;
const PLOT_LEFT = 56, PLOT_RIGHT = 712, BASELINE = 210, PLOT_TOP = 44;
const pctX = (x: number) => (x / VB_W) * 100;
const pctY = (y: number) => (y / VB_H) * 100;

function fmtM(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
}

export default function ConsolidationWaterfall({
  items,
}: { items: AppRatItem[] }) {
  const [hover, setHover] = useState<{ id: string; label: string; value: string; sub?: string; leftPct: number; topPct: number } | null>(null);
  const bars = useMemo(() => buildStackBars(items), [items]);

  const L = useMemo(() => {
    const total = Math.max(1, bars.stackTotal);
    const k = (BASELINE - PLOT_TOP) / total;
    const yOf = (v: number) => BASELINE - v * k;

    let running = bars.stackTotal;
    const steps = bars.tools
      .filter((t) => t.sunset > 0)
      .map((t) => {
        const before = running;
        running -= t.sunset;
        return { id: t.id, name: t.name, amount: t.sunset, stays: t.stays, spend: t.spend, before, after: running };
      });

    const n = 2 + steps.length;
    const slotW = (PLOT_RIGHT - PLOT_LEFT) / n;
    const barW = Math.min(66, slotW * 0.5);
    const centerX = (i: number) => PLOT_LEFT + slotW * (i + 0.5);

    // Today composed segments (top to bottom by spend), one neutral, split by hairlines
    let cursorV = bars.stackTotal;
    const todaySegs = bars.tools.map((t) => {
      const topV = cursorV, botV = cursorV - t.spend;
      cursorV = botV;
      return { id: t.id, name: t.name, spend: t.spend, sunset: t.sunset, stays: t.stays, yTop: yOf(topV), yBot: yOf(botV) };
    });

    return { steps, todaySegs, n, barW, centerX, yOf, stays: bars.stays, stackTotal: bars.stackTotal, sunset: bars.sunset };
  }, [bars]);

  if (bars.stackTotal === 0) {
    return (
      <div className="rounded-[20px] p-10 text-center text-sm text-[#8C7E6E]" style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }} data-testid="ar-waterfall-empty">
        Add applications with annual spend to see the consolidation.
      </div>
    );
  }

  const { steps, todaySegs, n, barW, centerX, yOf } = L;
  const staysX = n - 1;
  const dim = (id: string) => hover !== null && hover.id !== id;
  const half = barW / 2;

  const numCls = "font-semibold text-[#1A1A1A] tabular-nums";

  return (
    <div className="rounded-[20px] p-6 md:p-8" style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }} data-testid="ar-waterfall">
      <div className="uppercase tracking-[0.16em] text-[10.5px] font-bold text-[#B4A99B] mb-5 px-0.5">Your stack, consolidated</div>

      <div className="relative">
        {/* hover tooltip */}
        {hover && (
          <div className="absolute z-10 pointer-events-none" style={{ left: `${hover.leftPct}%`, top: `${hover.topPct}%`, transform: "translate(-50%, -120%)" }}>
            <div className="bg-[#1A1A1A] text-white rounded-lg px-3 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.18)] whitespace-nowrap">
              <div className="text-[11px] font-semibold leading-tight">{hover.label}</div>
              <div className="text-[11px] text-white/70 tabular-nums leading-tight">{hover.value}</div>
              {hover.sub && <div className="text-[10.5px] text-white/50 tabular-nums leading-tight mt-0.5">{hover.sub}</div>}
            </div>
          </div>
        )}

        {/* SVG bars + connectors (no text) */}
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" className="block" data-testid="ar-waterfall-svg">
          <line x1={PLOT_LEFT} y1={BASELINE} x2={PLOT_RIGHT} y2={BASELINE} stroke="#E4DBCC" />

          <g stroke="#C9BCA9" strokeDasharray="3 4">
            {steps.length > 0 && <line x1={centerX(0) + half} y1={yOf(L.stackTotal)} x2={centerX(1) - half} y2={yOf(L.stackTotal)} />}
            {steps.map((s, j) => (
              <line key={s.id} x1={centerX(1 + j) + half} y1={yOf(s.after)} x2={centerX(1 + j + 1) - half} y2={yOf(s.after)} />
            ))}
          </g>

          {/* Today composed stack */}
          {todaySegs.map((s) => (
            <rect
              key={s.id}
              x={centerX(0) - half} y={s.yTop} width={barW} height={Math.max(1, s.yBot - s.yTop)}
              fill={TODAY_COLOR} opacity={dim(s.id) ? 0.35 : 1}
              stroke="#FDFBF8" strokeWidth={2}
              onMouseEnter={() => setHover({ id: s.id, label: s.name, value: `${fmtM(s.spend)} / yr`, sub: s.sunset > 0 ? `${fmtM(s.sunset)} sunsets · ${fmtM(s.stays)} stays` : undefined, leftPct: pctX(centerX(0)), topPct: pctY(s.yTop) })}
              onMouseLeave={() => setHover(null)}
            />
          ))}

          {/* Decrement steps (taupe -> coral) */}
          {steps.map((s, j) => {
            const yTop = yOf(s.before);
            return (
              <rect
                key={s.id}
                className="wf-step"
                style={{ ["--wf-from" as string]: TODAY_COLOR, animationDelay: `${0.15 + j * 0.16}s` }}
                x={centerX(1 + j) - half} y={yTop} width={barW} height={Math.max(2, yOf(s.after) - yTop)} rx={3}
                fill="#EA2C00" opacity={dim(s.id) ? 0.28 : 1}
                onMouseEnter={() => setHover({ id: s.id, label: s.name, value: `${fmtM(s.amount)} sunsets onto Abridge`, sub: s.stays > 0 ? `${fmtM(s.stays)} stays · ${Math.round((s.stays / Math.max(1, s.spend)) * 100)}%` : undefined, leftPct: pctX(centerX(1 + j)), topPct: pctY(yTop) })}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}

          {/* Stays */}
          <rect x={centerX(staysX) - half} y={yOf(L.stays)} width={barW} height={Math.max(2, BASELINE - yOf(L.stays))} rx={3} fill={STAYS_COLOR} />
        </svg>

        {/* HTML labels overlaid by percentage */}
        {/* value: Today */}
        <div className="absolute text-[14px]" style={{ left: `${pctX(centerX(0))}%`, top: `${pctY(yOf(L.stackTotal))}%`, transform: "translate(-50%, -128%)" }}>
          <AnimatedValue value={L.stackTotal} format={fmtM} className={`${numCls} text-[15px] font-bold`} />
        </div>
        {/* value: steps */}
        {steps.map((s, j) => (
          <div key={s.id} className="absolute text-[13px]" style={{ left: `${pctX(centerX(1 + j))}%`, top: `${pctY(yOf(s.before))}%`, transform: "translate(-50%, -128%)" }}>
            <AnimatedValue value={s.amount} format={(v) => `−${fmtM(v)}`} className={numCls} />
          </div>
        ))}
        {/* value: stays */}
        <div className="absolute text-[13px]" style={{ left: `${pctX(centerX(staysX))}%`, top: `${pctY(yOf(L.stays))}%`, transform: "translate(-50%, -128%)" }}>
          <AnimatedValue value={L.stays} format={fmtM} className={numCls} />
        </div>

        {/* x labels */}
        <div className="absolute text-[11px] text-[#1A1A1A] font-semibold" style={{ left: `${pctX(centerX(0))}%`, top: `${pctY(228)}%`, transform: "translate(-50%,0)" }}>Today</div>
        {steps.map((s, j) => (
          <div key={s.id} className="absolute text-[11px] text-[#8C7E6E] text-center max-w-[120px] truncate" style={{ left: `${pctX(centerX(1 + j))}%`, top: `${pctY(228)}%`, transform: "translate(-50%,0)" }}>{s.name}</div>
        ))}
        <div className="absolute text-[11px] text-[#1A1A1A] font-semibold" style={{ left: `${pctX(centerX(staysX))}%`, top: `${pctY(228)}%`, transform: "translate(-50%,0)" }}>Stays</div>

        {/* sunset total */}
        {steps.length > 0 && (
          <div className="absolute text-[12px] font-semibold text-[#EA2C00] tabular-nums" style={{ left: `${pctX((centerX(1) + centerX(steps.length)) / 2)}%`, top: `${pctY(248)}%`, transform: "translate(-50%,0)" }}>
            {fmtM(L.sunset)} sunsets onto Abridge
          </div>
        )}
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
