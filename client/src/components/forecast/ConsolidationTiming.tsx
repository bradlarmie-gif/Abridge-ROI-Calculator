// The "Cumulative savings" view: one instrument. On top, an aggregate curve of
// dollars saved over the horizon (coral "your plan" vs a dashed "if you moved
// now" ceiling). Below, each tool on the SAME x-axis: a neutral "still paying"
// runway from today to its sunset, a draggable coral sunset thumb, and a
// contract-end tick. Drag a sunset earlier and the curve lifts. The what lives
// in the waterfall; this is purely the when.
import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import { NumberField } from "@/components/NumberField";
import {
  buildCumulativeSavings, cumulativeSavedAt, sunsetDateLabel, type AppRatItem,
} from "@/lib/appRationalizationCalc";

const HORIZON_OPTIONS = [2, 3, 4, 5];

// SVG viewBox for the curve; overlays positioned by percentage of these dims.
const VB_W = 1000, VB_H = 250;
const PL = 8, PR = 720, PT = 26, PB = 196; // plot rect inside the viewBox (right gutter for labels)
// One shared x-mapping (percent of width) for the curve overlay AND every timeline track.
const L_PCT = (PL / VB_W) * 100;                 // 0.8
const SPAN_PCT = ((PR - PL) / VB_W) * 100;       // 71.2
const xPct = (month: number, horizon: number) => L_PCT + (horizon <= 0 ? 0 : (month / horizon)) * SPAN_PCT;

function fmtM(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
}

export default function ConsolidationTiming({
  items, horizonYears, onHorizonChange, onUpdateItem,
}: {
  items: AppRatItem[];
  horizonYears: number;
  onHorizonChange: (y: number) => void;
  onUpdateItem: (id: string, patch: Partial<AppRatItem>) => void;
}) {
  const horizon = horizonYears * 12;
  const cs = useMemo(() => buildCumulativeSavings(items, horizon), [items, horizon]);

  if (!cs.hasCurve) {
    return (
      <div className="rounded-[20px] p-10 text-center text-sm text-[#8C7E6E]" style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }} data-testid="ar-timing-empty">
        Add applications with annual spend to see the savings build over time.
      </div>
    );
  }

  // Curve paths, sampled monthly.
  const maxY = Math.max(1, cs.nowTotal) * 1.06;
  const X = (m: number) => PL + (m / horizon) * (PR - PL);
  const Y = (v: number) => PB - (v / maxY) * (PB - PT);
  const path = (mode: "plan" | "now") => {
    let d = "";
    for (let m = 0; m <= horizon; m++) d += `${m ? "L" : "M"} ${X(m).toFixed(1)} ${Y(cumulativeSavedAt(cs.tools, m, mode)).toFixed(1)} `;
    return d.trim();
  };
  const planD = path("plan");
  const nowD = path("now");
  const pctX = (x: number) => (x / VB_W) * 100;
  const pctY = (y: number) => (y / VB_H) * 100;
  const yearMarks = Array.from({ length: horizonYears }, (_, i) => (i + 1) * 12);

  return (
    <div className="rounded-[20px] p-6 md:p-8" style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }} data-testid="ar-timing">
      {/* header: eyebrow + horizon selector */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <span className="font-abridge uppercase tracking-[0.16em] text-[11px] text-[#B4A99B]">Cumulative savings, over time</span>
        <div className="flex items-center gap-2 text-[11px] text-[#8C7E6E]">
          <span>over a</span>
          <div className="relative">
            <select
              value={horizonYears}
              onChange={(e) => onHorizonChange(Number(e.target.value))}
              className="h-8 appearance-none bg-white border border-[#E8E2DA] rounded-lg pl-2.5 pr-7 text-[12px] text-[#1A1A1A] outline-none focus:border-[#1A1A1A] cursor-pointer"
              data-testid="ar-horizon-select"
            >
              {HORIZON_OPTIONS.map((y) => <option key={y} value={y}>{y}-year</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C7E6E]" strokeWidth={2.25} />
          </div>
          <span>horizon</span>
        </div>
      </div>

      {/* the aggregate curve */}
      <div className="relative" data-testid="ar-timing-chart">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" className="block">
          <defs>
            <clipPath id="ar-reveal">
              {/* wipes left to right so both lines and the fill draw in "over time" */}
              <rect className="ar-reveal-rect" x={PL} y={0} width={PR + 170 - PL} height={VB_H} />
            </clipPath>
          </defs>
          <line x1={PL} y1={PB} x2={PR + 170} y2={PB} stroke="#DDD5C8" />
          {yearMarks.map((m) => <line key={m} x1={X(m)} y1={PT} x2={X(m)} y2={PB} stroke="#EFE7DC" strokeDasharray="2 4" />)}
          <g clipPath="url(#ar-reveal)">
            <path d={`${planD} L ${X(horizon)} ${PB} L ${X(0)} ${PB} Z`} fill="rgba(234,44,0,0.09)" />
            <path d={nowD} fill="none" stroke="#B4A99B" strokeWidth={2} strokeDasharray="6 5" strokeLinecap="round" />
            <path d={planD} fill="none" stroke="#EA2C00" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={X(horizon)} cy={Y(cs.planTotal)} r={6} fill="#EA2C00" />
            <circle cx={X(horizon)} cy={Y(cs.nowTotal)} r={5} fill="#B4A99B" />
          </g>
        </svg>

        {/* x labels */}
        <div className="absolute text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#9CA3AF]" style={{ left: `${pctX(PL)}%`, top: `${pctY(PB + 12)}%` }}>Today</div>
        {yearMarks.map((m, i) => (
          <div key={m} className="absolute text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#9CA3AF]" style={{ left: `${pctX(X(m))}%`, top: `${pctY(PB + 12)}%`, transform: "translateX(-50%)" }}>Year {i + 1}</div>
        ))}

        {/* endpoint labels */}
        <div className="absolute" style={{ left: `${pctX(X(horizon) + 14)}%`, top: `${pctY(Y(cs.nowTotal))}%`, transform: "translateY(-50%)" }}>
          <div className="text-[8px] font-extrabold uppercase tracking-[0.13em] text-[#B4A99B]">If you moved now</div>
          <div className="text-[14px] font-extrabold tabular-nums text-[#B4A99B] leading-none mt-0.5">{fmtM(cs.nowTotal)}</div>
        </div>
        <div className="absolute" style={{ left: `${pctX(X(horizon) + 14)}%`, top: `${pctY(Y(cs.planTotal))}%`, transform: "translateY(-50%)" }}>
          <div className="text-[8px] font-extrabold uppercase tracking-[0.13em] text-[#B4A99B]">Your plan</div>
          <AnimatedValue value={cs.planTotal} format={fmtM} duration={3000} fromZero className="text-[21px] font-extrabold tabular-nums text-[#EA2C00] leading-none block mt-0.5" style={{ letterSpacing: "-0.01em" }} />
          <div className="text-[10px] text-[#6B7280] mt-0.5">captured over {horizonYears} yrs</div>
        </div>
      </div>

      {/* per-tool levers */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#E8E2DA]">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#B4A99B]">Your tools · drag when each comes off</span>
        <div className="flex items-center gap-4 text-[10.5px] text-[#6B7280]">
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-1.5 rounded-[3px] bg-[#9C8F7D]" /> Still paying</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#EA2C00] border-2 border-[#FDFBF8]" /> Sunsets</span>
        </div>
      </div>

      <div className="mt-1">
        {cs.tools.map((t) => {
          const item = items.find((i) => i.id === t.id)!;
          const sliderMax = Math.min(t.contractMonths, horizon);
          const runwayRightPct = 100 - xPct(Math.min(t.sunsetMonths, horizon), horizon);
          const tickLeftPct = xPct(Math.min(t.contractMonths, horizon), horizon);
          const thumbLeftPct = xPct(Math.min(t.sunsetMonths, horizon), horizon);
          const contractDate = sunsetDateLabel(t.contractMonths);
          return (
            <div key={t.id} className="py-4 border-t border-[#EFE7DC] first:border-t-0" data-testid={`ar-timing-row-${t.id}`}>
              <div className="flex items-baseline justify-between mb-3.5 gap-3 flex-wrap">
                <div className="text-[14px] font-bold text-[#1A1A1A] min-w-0 truncate">
                  {t.name}
                  <span className="text-[12px] font-bold text-[#EA2C00] tabular-nums ml-2">{fmtM(t.spend)}/yr</span>
                  <span className="text-[11px] font-medium text-[#9CA3AF] ml-2">{t.capability}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                    <span>Contract ends in</span>
                    <div className="flex items-center h-7 w-11 bg-white border border-[#E8E2DA] rounded-md px-1.5 focus-within:border-[#EA2C00]">
                      <NumberField
                        value={item.contractMonths}
                        onValueChange={(v) => {
                          const c = Math.max(0, Math.min(120, v));
                          onUpdateItem(t.id, { contractMonths: c, sunsetMonths: Math.min(item.sunsetMonths, c) });
                        }}
                        min={0}
                        className="w-full bg-transparent text-center text-[12.5px] font-bold text-[#1A1A1A] outline-none tabular-nums"
                        data-testid={`ar-timing-contract-${t.id}`}
                      />
                    </div>
                    <span>mo</span>
                    <span className="text-[#C4B8A8]">·</span>
                    <span className="text-[10.5px] text-[#9CA3AF]">{contractDate}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 min-w-[140px] justify-end">
                    <span className="text-[8.5px] font-extrabold uppercase tracking-[0.11em] text-[#B4A99B]">Sunsets</span>
                    <span className="text-[13.5px] font-extrabold text-[#1A1A1A] tabular-nums" data-testid={`ar-timing-sunset-${t.id}`}>{sunsetDateLabel(t.sunsetMonths)}</span>
                  </div>
                </div>
              </div>

              <div className="relative h-[26px]">
                <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-[2px] bg-[#E4DBCC] opacity-60" style={{ left: `${xPct(0, horizon)}%`, right: `${100 - xPct(horizon, horizon)}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-[3px] bg-[#9C8F7D]" style={{ left: `${xPct(0, horizon)}%`, right: `${runwayRightPct}%` }} />
                <div className="absolute top-1/2 w-0.5 h-4 rounded-[1px] bg-[#B4A99B]" style={{ left: `${tickLeftPct}%`, transform: "translate(-50%,-50%)" }} />
                <div className="absolute text-[8.5px] font-semibold text-[#9CA3AF] whitespace-nowrap" style={{ left: `${tickLeftPct}%`, top: "100%", transform: "translateX(-50%)" }}>contract ends</div>
                <div className="absolute top-1/2 w-[15px] h-[15px] rounded-full bg-[#EA2C00] border-[2.5px] border-[#FDFBF8] shadow-[0_1px_4px_rgba(234,44,0,0.35)] pointer-events-none" style={{ left: `${thumbLeftPct}%`, transform: "translate(-50%,-50%)" }} />
                <input
                  type="range" min={0} max={sliderMax} step={1}
                  value={Math.min(t.sunsetMonths, sliderMax)}
                  onChange={(e) => onUpdateItem(t.id, { sunsetMonths: Number(e.target.value) })}
                  className="absolute top-1/2 -translate-y-1/2 h-[22px] m-0 opacity-0 cursor-pointer"
                  style={{ left: `${xPct(0, horizon)}%`, width: `${xPct(sliderMax, horizon) - xPct(0, horizon)}%` }}
                  aria-label={`When ${t.name} sunsets`}
                  data-testid={`ar-timing-slider-${t.id}`}
                />
              </div>

              <div className="text-[10px] font-bold text-[#EA2C00] mt-4 min-h-[12px]">
                {t.earlyMonths > 0 ? `Exit ${t.earlyMonths} mo early · ${fmtM(t.earlySaving)} sooner` : ""}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference){
          .ar-reveal-rect{ transform: scaleX(0); transform-origin: left center; transform-box: fill-box; animation: arReveal 3s cubic-bezier(0.33,0,0.2,1) forwards; }
          @keyframes arReveal{ to{ transform: scaleX(1); } }
        }
      `}</style>
    </div>
  );
}
