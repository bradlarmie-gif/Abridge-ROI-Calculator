/**
 * The "Closing the Gap" attainment curve — an inline SVG reproducing the
 * locked mockup (`value-attainment-patient-access.html`, page 2): a coral
 * "plan" line from deal-signed through Today to the Goal (always 100%), a
 * dashed gray "what usually happens" line most deployments drift onto, and
 * the shaded gap between them.
 *
 * Geometry is parametric (driven by `pct`/`monthsElapsed`/`totalMonths`) so
 * it renders correctly for any goal/setting/ambition combination, not just
 * the one scenario baked into the mockup.
 */

interface Point {
  x: number;
  y: number;
}

interface AttainmentCurveProps {
  /** 0-100. Actual attainment today (the coral "Today" marker). */
  pct: number;
  /** 0-100. Where the plan expected attainment to be today (a faint tick). */
  onPacePct: number;
  monthsElapsed: number;
  totalMonths: number;
  /** e.g. "$760K · 3,800 visits" */
  goalLabel: string;
  /** e.g. "~$300K" */
  usualLabel: string;
  /** Label for the x-axis's left anchor — "Deal signed" on Strategy's
   * projected curve, "Committed" on Progress's real one. */
  startLabel?: string;
  /**
   * The REAL, dated climb (from `attainProgress.ts`'s
   * `computeActualTrajectory`) — when present (Progress tab only), the
   * solid coral line plots these actual logged points instead of the
   * synthetic 3-point plan line, then continues to the Goal marker as a
   * thin dashed coral projection (not yet observed). Absent on the
   * Strategy tab, which keeps showing the projected pace line only.
   */
  actualPoints?: { monthsFromStart: number; pct: number }[];
}

const VB_W = 720;
const VB_H = 300;
const X0 = 60;
const X1 = 700;
const Y_BASE = 250; // 0%
const Y_TOP = 62; // 100%
// Illustrative ceiling for "what usually happens" — drift settles around here
// across the goal catalog's usual-vs-goal ratios (~38-42% of the plan).
// Exported so callers can derive a matching dollar figure for the "usual"
// label without re-deriving this assumption themselves.
export const USUAL_CEILING_PCT = 39;

const xAt = (frac: number) => X0 + Math.max(0, Math.min(1, frac)) * (X1 - X0);
const yAt = (pct: number) => Y_BASE - (Math.max(0, Math.min(100, pct)) / 100) * (Y_BASE - Y_TOP);

function smoothSegment(a: Point, b: Point): string {
  const midX = a.x + (b.x - a.x) / 2;
  return `C${midX},${a.y} ${midX},${b.y} ${b.x},${b.y}`;
}

function buildPath(points: Point[]): string {
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) d += ` ${smoothSegment(points[i - 1], points[i])}`;
  return d;
}

export function AttainmentCurve({
  pct,
  onPacePct,
  monthsElapsed,
  totalMonths,
  goalLabel,
  usualLabel,
  startLabel = "Deal signed",
  actualPoints,
}: AttainmentCurveProps) {
  const hasActual = !!actualPoints && actualPoints.length > 0;
  const lastActual = hasActual ? actualPoints![actualPoints!.length - 1] : null;
  // With real dated entries, "today" on this chart's x-axis is the last
  // actual point's own position, not the Strategy tab's manually-set
  // monthsElapsed slider — the whole point of Change 2 is that this curve
  // is driven by what was actually logged, not a synthetic input.
  const todayFrac = hasActual
    ? totalMonths > 0 ? lastActual!.monthsFromStart / totalMonths : 0
    : totalMonths > 0 ? monthsElapsed / totalMonths : 0;
  const xToday = Math.max(X0 + 4, xAt(todayFrac));

  const yTodayCoral = hasActual ? yAt(lastActual!.pct) : yAt(pct);
  const yGoalCoral = yAt(100);

  // The solid coral line: the REAL dated climb when we have one (every
  // logged point, baseline through today), else the synthetic 3-point plan
  // line Strategy still shows. Either way it ends at the same (xToday,
  // yTodayCoral) the gap-shading and markers below already anchor on.
  const solidCoralPoints: Point[] = hasActual
    ? actualPoints!.map((p) => ({ x: xAt(totalMonths > 0 ? p.monthsFromStart / totalMonths : 0), y: yAt(p.pct) }))
    : [{ x: X0, y: Y_BASE }, { x: xToday, y: yTodayCoral }];
  // From today onward to the Goal marker is never observed yet — always a
  // thin dashed coral projection, distinct from the solid observed line.
  const projectedCoralPoints: Point[] = [{ x: xToday, y: yTodayCoral }, { x: X1, y: yGoalCoral }];
  const coralPoints: Point[] = [...solidCoralPoints, { x: X1, y: yGoalCoral }];

  const usualTodayPct = USUAL_CEILING_PCT * Math.max(0, Math.min(1, todayFrac));
  const yUsualToday = yAt(usualTodayPct);
  const yUsualFinal = yAt(USUAL_CEILING_PCT);
  const grayPoints: Point[] = [
    { x: X0, y: Y_BASE },
    { x: xToday, y: yUsualToday },
    { x: X1, y: yUsualFinal },
  ];

  const reversedGray = [...grayPoints].reverse();
  let backPath = "";
  for (let i = 1; i < reversedGray.length; i++) backPath += ` ${smoothSegment(reversedGray[i - 1], reversedGray[i])}`;
  const gapPath = `${buildPath(coralPoints)} L${reversedGray[0].x},${reversedGray[0].y}${backPath} Z`;

  const yOnPaceToday = yAt(onPacePct);
  // "the gap" label sits roughly halfway between deal-signed and Today,
  // vertically centered between the coral and gray lines at that point.
  const gapLabelX = X0 + (xToday - X0) * 0.55;
  const gapCoralY = (Y_BASE + yTodayCoral) / 2;
  const gapGrayY = (Y_BASE + yUsualToday) / 2;
  const gapLabelY = Math.max(Y_TOP + 10, Math.min(Y_BASE - 10, (gapCoralY + gapGrayY) / 2));

  return (
    <div data-testid="attainment-curve">
      <div className="flex gap-1.5">
        <div
          className="text-[8.5px] font-semibold uppercase tracking-[2px] text-[#B4B4B4] flex items-center justify-center"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Value Realized
        </div>
        <div className="flex-1">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto block" data-testid="svg-attainment-curve">
            <path d={gapPath} fill="#EA2C00" opacity="0.05" />
            <line x1={X0} y1={Y_BASE} x2={X1} y2={Y_BASE} stroke="#E7E0D6" strokeWidth={1.5} />
            <line x1={xToday} y1={Y_BASE} x2={xToday} y2={yTodayCoral} stroke="#D8CFC4" strokeWidth={1} strokeDasharray="3 3" />
            <path d={buildPath(grayPoints)} fill="none" stroke="#B4B4B4" strokeWidth={2} strokeDasharray="6 4" />
            {/* Solid = observed (the real dated climb, or the whole plan
                line when there is no dated log). Dashed = not yet observed,
                only ever drawn when we have real entries to fall short of. */}
            <path d={buildPath(solidCoralPoints)} fill="none" stroke="#EA2C00" strokeWidth={2.5} data-testid="path-attainment-actual" />
            {hasActual && (
              <path d={buildPath(projectedCoralPoints)} fill="none" stroke="#EA2C00" strokeWidth={1.5} strokeDasharray="5 4" opacity="0.55" data-testid="path-attainment-projected" />
            )}

            <circle cx={X0} cy={Y_BASE} r={4} fill="#1A1A1A" />
            {/* faint on-pace tick: where the plan expected attainment today */}
            <circle cx={xToday} cy={yOnPaceToday} r={4} fill="#fff" stroke="#8C8C8C" strokeWidth={1.5} data-testid="marker-onpace" />
            {/* every intermediate logged point along the real climb, so the
                "and then what" of each update reads as a mark on the line,
                not just a smoothed curve through two facts */}
            {hasActual && solidCoralPoints.slice(1, -1).map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke="#EA2C00" strokeWidth={2} data-testid={`marker-actual-${i}`} />
            ))}
            <circle cx={xToday} cy={yTodayCoral} r={6.5} fill="#EA2C00" data-testid="marker-today" />
            <circle cx={X1} cy={yGoalCoral} r={7.5} fill="#EA2C00" data-testid="marker-goal" />
            <circle cx={X1} cy={yUsualFinal} r={5} fill="#fff" stroke="#B4B4B4" strokeWidth={2} />

            <text x={Math.min(xToday - 10, X1 - 30)} y={yTodayCoral - 10} textAnchor="end" style={{ font: "600 12px Inter", fill: "#1A1A1A" }}>
              Today · {Math.round(hasActual ? lastActual!.pct : pct)}%
            </text>
            <text x={X1 - 10} y={yGoalCoral - 14} textAnchor="end" style={{ font: "700 12px Inter", fill: "#EA2C00" }}>
              Goal · {goalLabel}
            </text>
            <text x={X1 - 10} y={yUsualFinal + 22} textAnchor="end" style={{ font: "500 11px Inter", fill: "#8C8C8C" }}>
              What usually happens · {usualLabel}
            </text>
            <text x={gapLabelX} y={gapLabelY} style={{ font: "italic 600 12px Inter", fill: "#B4B4B4" }}>
              the gap
            </text>
          </svg>
          <div className="flex justify-between text-[8.5px] font-semibold uppercase tracking-[1.5px] text-[#666666] mt-1 ml-[34px]">
            <span>{startLabel}</span>
            <span className="text-[#EA2C00]">Month {Math.round(hasActual ? lastActual!.monthsFromStart : monthsElapsed)} · Today</span>
            <span>Month {Math.round(totalMonths)} · Goal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttainmentCurve;
