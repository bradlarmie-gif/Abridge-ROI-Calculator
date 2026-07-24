/**
 * The "Closing the Gap" attainment curve — an inline SVG: a coral "plan"
 * line from the start point through Today to the Goal (always 100%), with the
 * area beneath the plan shaded. On the Progress tab it plots the real, dated
 * climb (see `actualPoints`) instead of the synthetic plan line, so the only
 * comparison it ever draws is the plan/target versus where you actually are.
 * There is no illustrative "drift" line: on a tracking view the honest
 * comparison is plan versus actual, never a fabricated typical-outcome line.
 *
 * Geometry is parametric (driven by `pct`/`monthsElapsed`/`totalMonths`) so
 * it renders correctly for any goal/setting/ambition combination.
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

// ── Label collision avoidance ──────────────────────────────────────────
// Every other label on this chart sits at a fixed spot relative to its own
// marker, but the "Today" marker moves across the full width of the curve
// as the slider (or the real dated log) moves — so it's the one label that
// can end up sharing canvas with the fixed "Goal" label near the end.
// Rather than hand-tune thresholds, estimate each label's actual footprint
// from its own text (so a long dollar figure is protected exactly like a
// short one) and only move "Today" when its default position truly overlaps
// a neighbor.
interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function estimateLabelWidth(text: string, fontSizePx: number, weight: number): number {
  const perChar = weight >= 700 ? 0.6 : weight >= 600 ? 0.56 : 0.52;
  return text.length * fontSizePx * perChar;
}

function labelBox(
  anchorX: number,
  baselineY: number,
  text: string,
  fontSizePx: number,
  weight: number,
  anchor: "start" | "end",
): LabelBox {
  const width = estimateLabelWidth(text, fontSizePx, weight);
  const left = anchor === "end" ? anchorX - width : anchorX;
  const right = anchor === "end" ? anchorX : anchorX + width;
  return { left, right, top: baselineY - fontSizePx * 0.82, bottom: baselineY + fontSizePx * 0.3 };
}

function boxesCollide(a: LabelBox, b: LabelBox, padX = 6, padY = 3): boolean {
  return a.left - padX < b.right && b.left - padX < a.right && a.top - padY < b.bottom && b.top - padY < a.bottom;
}

export function AttainmentCurve({
  pct,
  onPacePct,
  monthsElapsed,
  totalMonths,
  goalLabel,
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

  // The shaded area sits BENEATH the plan line — from the plan line down to
  // the baseline and back to the start. There is no second "drift" line to
  // shade a gap against; the only comparison this curve draws is the
  // plan/target versus where you actually are.
  const areaPath = `${buildPath(coralPoints)} L${X1},${Y_BASE} L${coralPoints[0].x},${Y_BASE} Z`;

  const yOnPaceToday = yAt(onPacePct);

  // Fixed label first — Goal never moves; only "Today" adapts around it. On
  // the Progress tab (real dated log) the moving marker reads "Today" against
  // the measured climb; on the Strategy tab it is an on-pace projection, not
  // measured, so it reads "On-pace" to keep the two unmistakably distinct.
  const todayPctValue = Math.round(hasActual ? lastActual!.pct : pct);
  const todayText = hasActual ? `Today · ${todayPctValue}%` : `On-pace · ${todayPctValue}%`;
  const goalText = `Goal · ${goalLabel}`;

  const goalTextX = X1 - 10;
  const goalTextY = yGoalCoral - 14;
  const goalBox = labelBox(goalTextX, goalTextY, goalText, 13, 700, "end");

  // Right-anchored, so on day one (today essentially equal to the start
  // point — the common Progress-tab case right after committing) it needs
  // a floor, not just a ceiling, or its right-anchored text runs off the
  // left edge of the viewBox.
  const todayX = Math.max(120, Math.min(xToday - 10, X1 - 30));
  const todayAboveY = yTodayCoral - 10;
  const todayAboveBox = labelBox(todayX, todayAboveY, todayText, 13, 600, "end");
  // Today's default sits just above its own dot. That collides with "Goal"
  // when today is parked at or near the goal (the right-edge case). Drop
  // Today below its dot instead of touching the label it collided with.
  const todayBelowY = yTodayCoral + 22;
  const needsFlip = boxesCollide(todayAboveBox, goalBox);
  const todayTextY = needsFlip ? todayBelowY : todayAboveY;
  const todayTextX = todayX;

  // The Today and Goal dots sit at the exact same point when today has
  // reached the goal — draw Today on top with a thin white ring so both
  // remain visible as a "bullseye" instead of Goal's larger dot fully
  // hiding Today's.
  const todayAtGoal = Math.hypot(X1 - xToday, yGoalCoral - yTodayCoral) < 14;

  return (
    <div data-testid="attainment-curve">
      <div className="flex gap-1.5">
        <div
          className="text-[9.5px] font-semibold uppercase tracking-[2px] text-[#B4B4B4] flex items-center justify-center"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Value Realized
        </div>
        <div className="flex-1">
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto block" data-testid="svg-attainment-curve">
            <path d={areaPath} fill="#EA2C00" opacity="0.05" />
            <line x1={X0} y1={Y_BASE} x2={X1} y2={Y_BASE} stroke="#E7E0D6" strokeWidth={1.5} />
            <line x1={xToday} y1={Y_BASE} x2={xToday} y2={yTodayCoral} stroke="#D8CFC4" strokeWidth={1} strokeDasharray="3 3" />
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
            <circle cx={X1} cy={yGoalCoral} r={7.5} fill="#EA2C00" data-testid="marker-goal" />
            {/* Drawn after Goal, so when the two coincide (today has
                reached the goal) Today's dot still shows as a distinct
                ring on top rather than being fully hidden underneath. */}
            <circle
              cx={xToday}
              cy={yTodayCoral}
              r={6.5}
              fill="#EA2C00"
              stroke={todayAtGoal ? "#fff" : "none"}
              strokeWidth={todayAtGoal ? 1.5 : 0}
              data-testid="marker-today"
            />

            {/* Position resolved above: sits just above the dot by default,
                and drops below it whenever that default would collide with
                "Goal" (today at/near the goal) — see the collision-avoidance
                block above. */}
            <text x={todayTextX} y={todayTextY} textAnchor="end" style={{ font: "600 13px Inter", fill: "#1A1A1A" }} data-testid="text-attainment-today">
              {todayText}
            </text>
            <text x={goalTextX} y={goalTextY} textAnchor="end" style={{ font: "700 13px Inter", fill: "#EA2C00" }} data-testid="text-attainment-goal">
              {goalText}
            </text>
          </svg>
          <div className="flex justify-between text-[9.5px] font-semibold uppercase tracking-[1.5px] text-[#666666] mt-1 ml-[34px]">
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
