/**
 * Attain — Progress-from-committed-decisions math.
 *
 * The Attainment hub's Progress tab tracks every committed decision on its
 * own baseline -> current -> target line (the "before" the partner entered
 * on Commit, where the metric actually is today, and the lever value they
 * dialed on Build the case). This module is the ONLY place attainment gets
 * computed off those REAL, partner-entered observations. `attainCalc.ts`'s
 * `AttainmentResult` is a projection (pace x whether committed decisions'
 * due dates have arrived) and is unchanged by this module — the Strategy
 * tab keeps showing that figure; the Progress tab shows this one.
 */

export interface DecisionProgressInput {
  key: string;
  baseline: number;
  current: number;
  target: number;
  /** Dollar worth used to weight this decision in the combined percent —
   * always the same marginalMargin figure shown elsewhere in the plan,
   * never invented. Negative worth is treated as 0 weight (never has a
   * negative pull on the average). */
  worth: number;
}

export type AttainmentStatus = "not_started" | "in_motion" | "landed";

/** Turns a lever's chosen/reality value (a plain number for percent/count/
 * toggle controls, or a string array for "lines" controls) into the single
 * number the progress track is built from — the array's length for a
 * "lines" lever (how many lines are actually live), the number itself
 * otherwise. Shared by the baseline default (realityStart) and the target
 * (the chosen build-case value), so both sides of a track are always
 * derived the same way. */
export function leverNumericValue(value: number | string[] | undefined): number {
  if (Array.isArray(value)) return value.length;
  return typeof value === "number" ? value : 0;
}

/**
 * 0-1 how far `current` has moved from `baseline` toward `target`, for one
 * decision. Direction-agnostic: works whether the metric climbs toward its
 * target (e.g. a percent moving up) or falls toward it (e.g. query
 * turnaround days moving down), because the numerator and denominator flip
 * sign together. Clamped to [0, 1] so overshoot reads as fully landed and
 * moving the wrong way never reads as negative attainment.
 */
export function decisionAttainmentFraction(baseline: number, current: number, target: number): number {
  const span = target - baseline;
  if (span === 0) return current === target ? 1 : 0;
  return Math.min(1, Math.max(0, (current - baseline) / span));
}

/** Status label from a decision's fraction, house-palette only: gray for
 * not started, coral for in motion, ink for landed. Never green, never
 * amber — see the UI layer's `STATUS_STYLE` for the actual colors. */
export function decisionStatus(fraction: number): AttainmentStatus {
  if (fraction >= 1) return "landed";
  if (fraction <= 0) return "not_started";
  return "in_motion";
}

/**
 * Weighted average attainment percent (0-100) across every committed
 * decision, weighted by each decision's own worth so a high-value decision
 * moves the number more than a token one — the same "worth" already shown
 * on Commit and in the plan's decision table, never a separate figure.
 * Falls back to a plain (unweighted) average when every decision's worth is
 * 0 or negative, so a plan that hasn't built a dollar figure yet still has
 * a real, moving percent instead of being stuck at 0. Returns 0 for an
 * empty decision list.
 */
/**
 * Multi-signal Commit (Change 3) — each committed decision now carries a
 * LIST of signals to watch rather than one. `parseSignalBaseline` and
 * `perSignalWorth` are the two small, pure helpers that let the Progress
 * tab fan a decision out into one `DecisionProgressInput` row per signal
 * and still feed `computeProgressAttainmentPct` above unchanged.
 */

/** Reads the leading number out of a free-text "baseline today" capture
 * like "18 days" or "62%" -> 18 / 62. Signals are captured as free text
 * (not a NumberField) so a partner can write "18 days" in one field rather
 * than juggling a separate value + unit pair while typing; this is the one
 * place that text gets turned back into the number the fraction math above
 * needs. Returns 0 for blank, undefined, or non-numeric text — never NaN,
 * matching the same "not-yet-entered reads as 0" rule the Starting-point
 * baseline follows. */
export function parseSignalBaseline(raw: string | undefined): number {
  if (!raw) return 0;
  const match = raw.match(/-?\d+(\.\d+)?/);
  if (!match) return 0;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : 0;
}

/** Splits a decision's total worth (its own `marginalMargin`, already shown
 * on Commit) evenly across however many signals it has, so breaking a
 * decision out into two signal rows for the combined attainment percent
 * never gives it more pull than a decision left at one signal — the two
 * signals' worths still sum back to exactly the decision's own worth.
 * Negative worth and a zero signal count both resolve to 0, never a
 * negative share or a divide-by-zero NaN/Infinity. */
export function perSignalWorth(decisionWorth: number, signalCount: number): number {
  if (signalCount <= 0) return 0;
  return Math.max(0, decisionWorth) / signalCount;
}

export function computeProgressAttainmentPct(decisions: DecisionProgressInput[]): number {
  if (decisions.length === 0) return 0;

  const totalWorth = decisions.reduce((sum, d) => sum + Math.max(0, d.worth), 0);

  if (totalWorth <= 0) {
    const avg =
      decisions.reduce((sum, d) => sum + decisionAttainmentFraction(d.baseline, d.current, d.target), 0) /
      decisions.length;
    return Math.round(avg * 100);
  }

  const weighted = decisions.reduce(
    (sum, d) => sum + decisionAttainmentFraction(d.baseline, d.current, d.target) * Math.max(0, d.worth),
    0,
  );
  return Math.round((weighted / totalWorth) * 100);
}

// ────────────────────────────────────────────────────────────────────────
// Change 2 — a TIME dimension for Progress. Each committed signal now
// carries a dated log (`entries`) instead of one editable "current" number:
// one seed entry at commit (the baseline, dated the day the decision was
// first committed), and one more appended every time the partner "logs an
// update". `current` everywhere above is now always the LATEST entry's
// value, never a separately-edited field, so the fraction/status/percent
// math already proven above needs no changes — only what feeds it does.
//
// Persistence note: entries live in local/session React state only (see
// AttainFlow.tsx). True cross-session memory (so a log entered today is
// still there next month, for the EBR) needs the save/backend layer — out
// of scope for this pass; that state is exactly what would move there.
// ────────────────────────────────────────────────────────────────────────

export interface ProgressEntry {
  date: string; // ISO yyyy-mm-dd
  value: number;
  note?: string;
}

/** The most recently APPENDED entry (last in the array), not the latest by
 * date — logging an update always appends, so "latest" and "most recent by
 * date" agree in normal use; this is simply the cheap, unambiguous read. */
export function latestEntry(entries: ProgressEntry[] | undefined): ProgressEntry | undefined {
  if (!entries || entries.length === 0) return undefined;
  return entries[entries.length - 1];
}

/** `current` for every calc above: the latest logged value, or the
 * signal's own baseline when nothing has been logged yet (should not
 * happen once seeding has run, but keeps this function safe standalone). */
export function currentValueFromEntries(entries: ProgressEntry[] | undefined, baseline: number): number {
  return latestEntry(entries)?.value ?? baseline;
}

/** Today, as the same YYYY-MM-DD shape every entry's `date` uses. */
export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Every cadence a signal can be checked on, in days — mirrors
 * `SignalCadence` in StepCommit.tsx (a plain literal union, so no import is
 * needed for structural typing to line up; this module stays a leaf with no
 * dependency on a step component). */
export type Cadence = "weekly" | "biweekly" | "monthly" | "quarterly";

const CADENCE_DAYS: Record<Cadence, number> = { weekly: 7, biweekly: 14, monthly: 30, quarterly: 91 };

/** When a signal's next check falls due, off its own last-logged date and
 * the single plan-wide cadence every signal in the plan now shares (see
 * AttainFlow's `planCadence`). */
export function nextCheckDueDate(lastDateISO: string, cadence: Cadence): string {
  const d = new Date(`${lastDateISO}T00:00:00`);
  d.setDate(d.getDate() + CADENCE_DAYS[cadence]);
  return d.toISOString().slice(0, 10);
}

export interface SignalProgressInput {
  key: string;
  baseline: number;
  target: number;
  worth: number;
  entries: ProgressEntry[];
}

export interface TrajectoryPoint {
  date: string;
  /** Months since the EARLIEST entry across every signal — the plan's own
   * real starting point, not the abstract monthsElapsed slider. */
  monthsFromStart: number;
  pct: number;
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30;

/**
 * The real, dated climb the Progress curve plots: one point per distinct
 * date any signal was logged on, plus today, each carrying every signal's
 * most recently known value FORWARD from its latest entry on or before that
 * date (never invented, never a straight line between two far-apart facts).
 * A signal that has not been committed yet as of a given date (no entry
 * with date <= that date) is left out of that date's weighting entirely —
 * it should not drag a plan down before it existed, the same reasoning
 * `computeProgressAttainmentPct` already applies to worth.
 */
export function computeActualTrajectory(signals: SignalProgressInput[], todayISO: string): TrajectoryPoint[] {
  const allDates = signals.flatMap((s) => s.entries.map((e) => e.date));
  if (allDates.length === 0) return [];

  const startMs = new Date(`${[...allDates].sort()[0]}T00:00:00`).getTime();
  const dates = Array.from(new Set([...allDates, todayISO])).sort();

  return dates.map((date) => {
    const decisions: DecisionProgressInput[] = [];
    for (const s of signals) {
      const asOf = s.entries.filter((e) => e.date <= date).sort((a, b) => a.date.localeCompare(b.date));
      if (asOf.length === 0) continue; // not committed yet as of this date
      decisions.push({ key: s.key, baseline: s.baseline, current: asOf[asOf.length - 1].value, target: s.target, worth: s.worth });
    }
    const pct = computeProgressAttainmentPct(decisions);
    const monthsFromStart = (new Date(`${date}T00:00:00`).getTime() - startMs) / MS_PER_MONTH;
    return { date, monthsFromStart, pct };
  });
}

// ────────────────────────────────────────────────────────────────────────
// Bespoke per-signal sparkline geometry (baseline -> ... -> current, against
// the target) — a small pure scale-to-pixel helper so the SVG that renders
// it (StepAttainment.tsx) stays a thin presentational layer over tested
// math, the same split as the rest of this module.
// ────────────────────────────────────────────────────────────────────────

export interface SparklinePoint {
  x: number;
  y: number;
}

export interface SparklineGeometry {
  points: SparklinePoint[];
  targetY: number;
}

/** Maps a signal's logged values (in append order) plus its target onto an
 * SVG-ready `width` x `height` box: x spread evenly left to right, y scaled
 * so the lowest of (every value, the target) sits at the bottom and the
 * highest sits at the top — the target is always in-range, never clipped
 * off the top of its own reference line. Falls back to the box's vertical
 * midpoint for every point when values and target all collapse to the same
 * number, so a flat, not-yet-moved signal never divides by zero into NaN. */
export function computeSparklineGeometry(values: number[], target: number, width: number, height: number): SparklineGeometry {
  if (values.length === 0) return { points: [], targetY: height / 2 };

  const all = [...values, target];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min;

  const yFor = (v: number) => (span === 0 ? height / 2 : height - ((v - min) / span) * height);
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((v, i) => ({ x: values.length > 1 ? i * stepX : width / 2, y: yFor(v) }));

  return { points, targetY: yFor(target) };
}
