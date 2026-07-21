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

export function AttainmentCurve({ pct, onPacePct, monthsElapsed, totalMonths, goalLabel, usualLabel }: AttainmentCurveProps) {
  const todayFrac = totalMonths > 0 ? monthsElapsed / totalMonths : 0;
  const xToday = Math.max(X0 + 4, xAt(todayFrac));

  const yTodayCoral = yAt(pct);
  const yGoalCoral = yAt(100);
  const coralPoints: Point[] = [
    { x: X0, y: Y_BASE },
    { x: xToday, y: yTodayCoral },
    { x: X1, y: yGoalCoral },
  ];

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
            <path d={buildPath(coralPoints)} fill="none" stroke="#EA2C00" strokeWidth={2.5} />

            <circle cx={X0} cy={Y_BASE} r={4} fill="#1A1A1A" />
            {/* faint on-pace tick: where the plan expected attainment today */}
            <circle cx={xToday} cy={yOnPaceToday} r={4} fill="#fff" stroke="#8C8C8C" strokeWidth={1.5} data-testid="marker-onpace" />
            <circle cx={xToday} cy={yTodayCoral} r={6.5} fill="#EA2C00" data-testid="marker-today" />
            <circle cx={X1} cy={yGoalCoral} r={7.5} fill="#EA2C00" data-testid="marker-goal" />
            <circle cx={X1} cy={yUsualFinal} r={5} fill="#fff" stroke="#B4B4B4" strokeWidth={2} />

            <text x={Math.min(xToday - 10, X1 - 30)} y={yTodayCoral - 10} textAnchor="end" style={{ font: "600 12px Inter", fill: "#1A1A1A" }}>
              Today · {Math.round(pct)}%
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
            <span>Deal signed</span>
            <span className="text-[#EA2C00]">Month {Math.round(monthsElapsed)} · Today</span>
            <span>Month {Math.round(totalMonths)} · Goal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttainmentCurve;
