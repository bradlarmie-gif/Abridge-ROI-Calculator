// The "When it lands" view: your plan vs riding every contract to its renewal.
// You already run Abridge, so every tool you retire is pure additional savings.
// A step chart plots the annual savings run-rate on a real calendar: a faint
// dashed "ride to renewal" baseline (each tool comes off at its contract end)
// and a solid coral "your plan" (each tool at its chosen exit). The gap between
// them, captured earlier, is savings you pocket sooner instead of paying through
// renewal. Below, one slider per tool sets its exit month, clamped to its
// contract. The contract term itself is set upstream (Applications), not here.
import { useMemo, type ReactNode } from "react";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import {
  buildCumulativeSavings, timingSummary, itemDisplayName, type AppRatItem, type CumulativeTool,
} from "@/lib/appRationalizationCalc";

// SVG viewBox and plot rect (matches the locked mockup's geometry).
const VB_W = 1000, VB_H = 300;
const X0 = 70, X1 = 980, Y0 = 40, Y1 = 250;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// $X.XXM / $XXXK / $X for chart labels, the read line and the captured stat.
function fmtC(v: number): string {
  const a = Math.abs(Math.round(v));
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${a}`;
}
// Full dollars with commas for row amounts and the year-1 / captured stats.
const fmtFull = (v: number): string => `$${Math.round(v).toLocaleString("en-US")}`;

export default function ConsolidationTiming({
  items, horizonYears, onHorizonChange, onUpdateItem,
}: {
  items: AppRatItem[];
  // Kept for the caller's contract; the locked design derives its calendar span
  // from the contracts themselves, so the horizon selector isn't shown here.
  horizonYears: number;
  onHorizonChange: (y: number) => void;
  onUpdateItem: (id: string, patch: Partial<AppRatItem>) => void;
}) {
  void horizonYears; void onHorizonChange;

  const cs = useMemo(() => buildCumulativeSavings(items, 60), [items]);
  const summary = useMemo(() => timingSummary(items), [items]);
  // A stable "now" so labels don't drift between renders within a session.
  const now = useMemo(() => new Date(), []);

  if (!cs.hasCurve) {
    return (
      <div className="rounded-[20px] p-10 text-center text-sm text-[#8C7E6E]" style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }} data-testid="ar-timing-empty">
        Add applications with annual spend to see when the savings land.
      </div>
    );
  }

  // "MMM 'YY" from now + months (e.g. Jul 2026 + 6 -> "Jan '27").
  const monthLabel = (m: number): string => {
    const d = new Date(now.getFullYear(), now.getMonth() + Math.max(0, Math.round(m)), 1);
    return `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
  };

  const tools = cs.tools;
  const runRate = (t: CumulativeTool) => t.monthlySaving * 12; // annual savings that switch on when it comes off
  const FULL = Math.max(1, tools.reduce((s, t) => s + runRate(t), 0)); // full run-rate ceiling

  // Calendar span: reach a bit past the last renewal so both lines plateau and
  // the "sooner" bracket has room. Rounded up to a clean 6-month grid.
  const spanEnd = Math.max(summary.renewalFinishMonths, summary.planFinishMonths, 6);
  const axisMax = Math.max(12, Math.ceil((spanEnd + 4) / 6) * 6);
  const xStep = axisMax <= 24 ? 6 : 12;

  const xf = (m: number) => X0 + (Math.max(0, Math.min(m, axisMax)) / axisMax) * (X1 - X0);
  const yf = (v: number) => Y1 - (v / FULL) * (Y1 - Y0);

  // Step points for a run-rate line: it jumps by each tool's run-rate at the
  // month it comes off (sunset for the plan, contract end for the baseline).
  const stepPts = (key: "sunsetMonths" | "contractMonths"): [number, number][] => {
    const sorted = [...tools].sort((a, b) => a[key] - b[key]);
    let cum = 0;
    const p: [number, number][] = [[0, 0]];
    for (const t of sorted) { p.push([t[key], cum]); cum += runRate(t); p.push([t[key], cum]); }
    p.push([axisMax, cum]);
    return p;
  };
  const planPts = stepPts("sunsetMonths");
  const renewalPts = stepPts("contractMonths");
  const toXY = (p: [number, number]) => `${xf(p[0]).toFixed(1)},${yf(p[1]).toFixed(1)}`;
  const planLine = "M " + planPts.map(toXY).join(" L ");
  const renewalLine = "M " + renewalPts.map(toXY).join(" L ");
  const baseArea = `M ${xf(0)},${Y1} L ` + renewalPts.map(toXY).join(" L ") + ` L ${xf(axisMax)},${Y1} Z`;
  const band = "M " + planPts.map(toXY).join(" L ") + " L " + [...renewalPts].reverse().map(toXY).join(" L ") + " Z";

  const captured = summary.capturedSooner;
  const sooner = summary.monthsSooner;

  // Named dots on the plan line: each name rides the flat run to the right of its
  // dot (last one flips left), with a white halo and vertical de-collision so
  // stacked names never hide each other.
  const sortedPlan = [...tools].sort((a, b) => a.sunsetMonths - b.sunsetMonths);
  let cumPlan = 0;
  const nodes = sortedPlan.map((t) => { cumPlan += runRate(t); return { t, x: xf(t.sunsetMonths), y: yf(cumPlan) }; });
  const shortName = (n: string) => (n.length > 15 ? n.slice(0, 14).trimEnd() + "…" : n);
  const labels = nodes.map((n) => {
    const right = n.x <= X1 - 130;
    return { name: shortName(n.t.name), x: n.x, lx: right ? n.x + 11 : n.x - 11, ly: n.y - 11, anchor: right ? "start" as const : "end" as const };
  });
  const byY = [...labels].sort((a, b) => a.ly - b.ly);
  for (let i = 1; i < byY.length; i++) {
    const a = byY[i - 1], b = byY[i];
    if (Math.abs(a.x - b.x) < 95 && b.ly - a.ly < 18) b.ly = a.ly + 18;
  }

  // Year-1 run-rate reached (tools that have come off by month 12).
  const year1 = tools.reduce((s, t) => s + (t.sunsetMonths <= 12 ? runRate(t) : 0), 0);
  const y1x = xf(12), y1y = yf(year1);

  // "N months sooner" bracket at the ceiling, only when the plan finishes earlier.
  const fx = xf(summary.planFinishMonths), bx = xf(summary.renewalFinishMonths);
  const bmid = (fx + bx) / 2;
  const bLabel = `${sooner} ${sooner === 1 ? "month" : "months"} sooner`;
  const bw = Math.max(120, bLabel.length * 8.2);

  const consolidatedLabel = summary.planFinishMonths === 0 ? "now" : monthLabel(summary.planFinishMonths);

  // Row model: saving tools get a slider; tools with spend but no displaceable
  // share stay on, unchanged.
  const byId = new Map(tools.map((t) => [t.id, t]));
  const rows = items
    .filter((i) => (i.annualSpend || 0) > 0)
    .map((i) => ({ item: i, tool: byId.get(i.id) }));

  return (
    <div className="rounded-[20px] p-6 md:p-8" style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }} data-testid="ar-timing">
      {/* framing */}
      <div className="mb-6">
        <h2 className="font-abridge text-[28px] leading-[1.05] text-[#1A1A1A]">How soon it lands is your call.</h2>
        <p className="text-[15px] text-[#8C7E6E] mt-3 max-w-[680px] leading-[1.5]">
          You already run Abridge, so every tool you retire is pure additional savings. Each contract frees its spend on its real renewal date; negotiate out early and it lands sooner.
        </p>
      </div>

      {/* chart title + legend */}
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[12px] font-extrabold tracking-[0.08em] uppercase text-[#443A32]">Additional savings, on the calendar</span>
        <span className="flex items-center gap-4 text-[12px] text-[#8C7E6E]">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-[18px] border-t-2 border-dashed border-[#C3B7A8]" /> ride to renewal</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block w-[18px] border-t-[3px] border-[#EA2C00]" /> your plan</span>
        </span>
      </div>

      {/* the run-rate step chart */}
      <div className="rounded-[18px] bg-white border border-[#E8E2DA] px-4 py-3" data-testid="ar-timing-chart">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" className="block">
          <defs>
            <linearGradient id="ar-ramp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EA2C00" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#EA2C00" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* axes + gridlines */}
          <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke="#E8E2DA" strokeWidth={1} />
          <line x1={X0} y1={(Y0 + Y1) / 2} x2={X1} y2={(Y0 + Y1) / 2} stroke="#F1EAE0" strokeWidth={1} />
          <text x={X0 - 8} y={Y0 + 4} textAnchor="end" fontFamily="Manrope" fontSize={11} fill="#6E6157">{fmtC(FULL)}</text>
          <text x={X0 - 8} y={Y1 + 4} textAnchor="end" fontFamily="Manrope" fontSize={11} fill="#6E6157">$0</text>
          {Array.from({ length: Math.floor(axisMax / xStep) + 1 }, (_, i) => i * xStep).map((m) => (
            <text key={m} x={xf(m)} y={Y1 + 22} textAnchor="middle" fontFamily="Manrope" fontSize={11} fill="#6E6157">
              {m === 0 ? `now · ${monthLabel(0)}` : monthLabel(m)}
            </text>
          ))}

          {/* fill under the baseline; gap band + dashed baseline only when acting early captures something */}
          <path d={baseArea} fill="url(#ar-ramp)" />
          {captured > 0 && <path d={band} fill="#EA2C00" fillOpacity={0.22} />}
          {captured > 0 && <path d={renewalLine} fill="none" stroke="#C3B7A8" strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" />}
          <path d={planLine} fill="none" stroke="#EA2C00" strokeWidth={3} strokeLinejoin="round" />

          {/* year-1 marker */}
          <line x1={y1x} y1={y1y} x2={y1x} y2={Y1} stroke="#D9CDBE" strokeWidth={1.5} strokeDasharray="5 5" />
          <text x={y1x + 8} y={Math.max(y1y + 18, Y0 + 22)} fontFamily="Manrope" fontSize={12} fontWeight={700} fill="#5E534A" stroke="#FDFCFA" strokeWidth={3.5} paintOrder="stroke" strokeLinejoin="round">
            Year 1 · {fmtC(year1)}
          </text>

          {/* full run-rate ceiling label */}
          <text x={X1 - 2} y={Y0 - 10} textAnchor="end" fontFamily="Manrope" fontSize={12.5} fontWeight={800} fill="#EA2C00" stroke="#FDFCFA" strokeWidth={3.5} paintOrder="stroke" strokeLinejoin="round">
            {fmtC(FULL)} / yr · full run-rate
          </text>

          {/* "N months sooner" bracket */}
          {sooner > 0 && (
            <g>
              <line x1={fx} y1={Y0 - 8} x2={fx} y2={Y0 + 8} stroke="#EA2C00" strokeWidth={3} />
              <line x1={bx} y1={Y0 - 8} x2={bx} y2={Y0 + 8} stroke="#C3B7A8" strokeWidth={2} />
              <line x1={fx} y1={Y0} x2={bx} y2={Y0} stroke="#EA2C00" strokeWidth={3} />
              <rect x={bmid - bw / 2} y={Y0 - 32} width={bw} height={24} rx={12} fill="#EA2C00" />
              <text x={bmid} y={Y0 - 15} textAnchor="middle" fontFamily="Manrope" fontSize={14} fontWeight={800} fill="#fff">{bLabel}</text>
            </g>
          )}

          {/* named dots on the plan line */}
          {labels.map((l, i) => (
            <text key={`l-${i}`} x={l.lx} y={l.ly} textAnchor={l.anchor} fontFamily="Manrope" fontSize={12} fontWeight={700} fill="#6E6157" stroke="#FDFCFA" strokeWidth={3.5} paintOrder="stroke" strokeLinejoin="round">{l.name}</text>
          ))}
          {nodes.map((n) => (
            <circle key={`d-${n.t.id}`} cx={n.x} cy={n.y} r={5.5} fill="#EA2C00" stroke="#fff" strokeWidth={3} />
          ))}
        </svg>
      </div>

      {/* the read line */}
      <p className="text-[15px] text-[#8C7E6E] mt-[18px] leading-[1.55] max-w-[780px]" data-testid="ar-timing-readline">
        {captured > 0 && sooner > 0 ? (
          <>Your plan reaches full consolidation <NeutralSpan>{consolidatedLabel}</NeutralSpan>, <CoralSpan>{sooner} months</CoralSpan> ahead of riding to renewal, and captures <CoralSpan>{fmtC(captured)}</CoralSpan> from vendors on the way there.</>
        ) : captured > 0 ? (
          <>Pulling these in captures <CoralSpan>{fmtC(captured)}</CoralSpan> you'd otherwise keep paying through renewal. The finish line holds at <NeutralSpan>{monthLabel(summary.renewalFinishMonths)}</NeutralSpan> until you pull <NeutralSpan>{summary.gatingToolName}</NeutralSpan> in too.</>
        ) : (
          <><NeutralSpan>Every contract is riding to its renewal.</NeutralSpan> Pull one in below and the gap that opens up is savings you capture sooner instead of paying through renewal.</>
        )}
      </p>

      {/* per-tool levers */}
      <div className="mt-6">
        {rows.map(({ item, tool }) => {
          if (!tool) {
            // Spend that stays: no displaceable share, so it rides on unchanged.
            return (
              <div key={item.id} className="flex items-center gap-3.5 py-3.5 border-b border-[#F2ECE4] last:border-b-0 opacity-90" data-testid={`ar-timing-row-${item.id}`}>
                <span className="w-[11px] h-[11px] rounded-[3px] bg-[#D8CEC1] shrink-0" />
                <span className="text-[15.5px] font-bold text-[#8C7E6E] min-w-[180px]">{itemDisplayName(item)}</span>
                <span className="font-abridge text-[17px] text-[#8C7E6E] min-w-[80px] tabular-nums">{fmtFull(item.annualSpend || 0)}</span>
                <span className="ml-auto text-[13px] text-[#8C7E6E]">stays on · unchanged</span>
              </div>
            );
          }
          const mtm = tool.contractMonths === 0;
          const earlyMo = tool.earlyMonths;
          return (
            <div key={item.id} className="flex items-center gap-3.5 py-3.5 border-b border-[#F2ECE4] last:border-b-0" data-testid={`ar-timing-row-${item.id}`}>
              <span className="w-[11px] h-[11px] rounded-[3px] bg-[#EA2C00] shrink-0" />
              <span className="text-[15.5px] font-bold text-[#1A1A1A] min-w-[180px] truncate">{tool.name}</span>
              <span className="font-abridge text-[17px] text-[#1A1A1A] min-w-[80px] tabular-nums">{fmtFull(runRate(tool))}</span>
              <div className="ml-auto flex items-center gap-3.5">
                <span className="text-[12px] text-[#8C7E6E]">{mtm ? "comes off" : "exit"}</span>
                <input
                  type="range"
                  min={0}
                  max={tool.contractMonths}
                  step={1}
                  value={Math.min(tool.sunsetMonths, tool.contractMonths)}
                  disabled={mtm}
                  onChange={(e) => onUpdateItem(item.id, { sunsetMonths: Math.max(0, Math.min(tool.contractMonths, Number(e.target.value))) })}
                  aria-label={`When ${tool.name} comes off`}
                  className="h-1 w-[150px] rounded-[3px] bg-[#E8E2DA] appearance-none outline-none cursor-ew-resize disabled:opacity-50 [accent-color:#EA2C00]"
                  data-testid={`ar-timing-slider-${item.id}`}
                />
                <span className="text-[13px] font-bold text-right min-w-[150px] tabular-nums" data-testid={`ar-timing-when-${item.id}`}>
                  {mtm ? (
                    <span className="text-[#EA2C00]">now · month-to-month</span>
                  ) : earlyMo <= 0 ? (
                    <span className="text-[#1A1A1A]">renews {monthLabel(tool.contractMonths)}</span>
                  ) : (
                    <span className="text-[#1A1A1A]">{monthLabel(tool.sunsetMonths)} · <span className="text-[#EA2C00]">{earlyMo} mo early</span></span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* hero stats */}
      <div className="grid grid-cols-3 mt-9 border-t border-b border-[#E8E2DA]">
        <div className="py-[22px] border-r border-[#E8E2DA]">
          <div className="text-[11px] font-extrabold tracking-[0.07em] uppercase text-[#443A32]">Additional savings, year 1</div>
          <div className="font-abridge text-[30px] mt-2 text-[#1A1A1A]">
            <AnimatedValue value={year1} format={fmtFull} duration={600} className="tabular-nums" />
            <span className="text-[13px] text-[#8C7E6E] font-sans font-normal"> / yr</span>
          </div>
        </div>
        <div className="py-[22px] pl-7 border-r border-[#E8E2DA]">
          <div className="text-[11px] font-extrabold tracking-[0.07em] uppercase text-[#443A32]">Captured sooner by acting</div>
          <div className="font-abridge text-[30px] mt-2">
            <AnimatedValue value={captured} format={fmtFull} duration={600} className="tabular-nums" style={{ color: captured > 0 ? "#EA2C00" : "#B4A99B" }} />
          </div>
        </div>
        <div className="py-[22px] pl-7">
          <div className="text-[11px] font-extrabold tracking-[0.07em] uppercase text-[#443A32]">Fully consolidated</div>
          <div className="font-abridge text-[30px] mt-2 text-[#1A1A1A]">{consolidatedLabel}</div>
          {sooner > 0 && <span className="block text-[12.5px] text-[#EA2C00] font-bold mt-1.5">{sooner} mo earlier than {monthLabel(summary.renewalFinishMonths)}</span>}
        </div>
      </div>
    </div>
  );
}

function CoralSpan({ children }: { children: ReactNode }) {
  return <span className="font-abridge text-[18px] text-[#EA2C00]" style={{ fontWeight: 400 }}>{children}</span>;
}
function NeutralSpan({ children }: { children: ReactNode }) {
  return <span className="font-bold text-[#5E534A]">{children}</span>;
}
