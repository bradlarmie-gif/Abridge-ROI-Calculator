import { useState, useEffect } from "react";
import { Download, Save, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import AttainmentCurve from "@/components/attain/AttainmentCurve";
import {
  leversFor,
  defaultLeverValues,
  type Lever,
  type LeverValues,
  type LeverContribution,
  type MultiGoalContributionsResult,
  type RealizationByGoal,
  type AttainBaseline,
} from "@/lib/attain/attainLevers";
import {
  decisionAttainmentFraction,
  decisionStatus,
  computeProgressAttainmentPct,
  latestEntry,
  currentValueFromEntries,
  nextCheckDueDate,
  computeActualTrajectory,
  todayISODate,
  type AttainmentStatus,
  type ProgressEntry,
  type DecisionProgressInput,
  type SignalProgressInput,
} from "@/lib/attain/attainProgress";
import { trackedMetricsByGoal, type TrackedMetric } from "@/lib/attain/measurementScorecard";
import { deriveMeasurementModelFor } from "./MeasurementPlanSurface";
import type { AttainPlanning } from "@/lib/attain/attainPlanning";
import { GOAL_CATALOG, getContent } from "@/lib/attain/attainGoals";
import type { AttainState, AttainSetting, GoalId, GoalDef, SettingGoalContent } from "@/lib/attain/attainTypes";
import type { GoalTargetResult, AttainmentResult } from "@/lib/attain/attainCalc";
import { CADENCE_LABEL, type Commitment, type GoalOwner, type SignalCadence } from "./StepCommit";
import { generateAttainPdf } from "@/lib/attain/attain-pdf";

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** The realized COUNT as a plain whole number the CFO reads at a glance
 * ("3,800", "6", "6,900"). Rounded because it is always framed as "about". */
function formatCount(n: number): string {
  return Math.round(n).toLocaleString();
}

/** The plan's lead outcome sentence: the goal's own template with the engine's
 * count or dollar dropped in and the number itself in coral. This is the
 * concrete thing the partner is buying, in their own unit, and it leads the
 * whole output rather than a bare dollar handed to them cold. */
function OutcomeSentence({ goalDef, count, dollar }: { goalDef: GoalDef; count: string; dollar: string }) {
  const token = goalDef.valueUnit.heroIsDollar ? "{dollar}" : "{count}";
  const value = goalDef.valueUnit.heroIsDollar ? dollar : count;
  const [pre, post] = goalDef.valueUnit.outcomeTemplate.split(token);
  return (
    <>
      {pre}
      <span className="text-[#EA2C00]">{value}</span>
      {post}
    </>
  );
}

/** "Jul 14, 2026" — every date on the Progress tab prints as a real,
 * absolute date (never a relative "just now"/"3d ago"), since the whole
 * point of Change 2 is a dated record that still reads correctly the next
 * time someone opens this for an EBR, not just in the moment it was typed. */
function formatDate(iso: string | undefined): string {
  if (!iso) return "Not logged yet";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Not logged yet";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const UNIT_LABEL: Record<string, string> = {
  outpatient: "providers",
  ed: "providers",
  inpatient: "hospitalists",
  nursing: "staffed beds",
};

const SETTING_LABEL: Record<string, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

/** The plan's real scope, as a one-line summary, built only from the
 * partner's own inputs: the service lines they selected and the unit count
 * derived on the Baseline step. Blank inputs collapse cleanly to the care
 * setting alone, never an invented specialty or count. Used for the plan
 * header subtitle so it can never contradict the "Scoped to N" figure. */
function scopeSummaryLine(
  setting: AttainSetting,
  unitCount: number,
  unitLabel: string,
  selectedLines: string[],
): string {
  const parts: string[] = [];
  if (selectedLines.length > 0) parts.push(selectedLines.join(", "));
  if (unitCount > 0) parts.push(`${unitCount.toLocaleString()} ${unitLabel}`);
  parts.push(SETTING_LABEL[setting] ?? setting);
  return parts.join(" · ");
}

/** The lines/departments the partner actually selected for a goal, read off
 * the goal's "lines" lever value. Empty until they pick some, so the
 * starting-point copy stays generic rather than naming invented specialties. */
function selectedLinesFor(goal: GoalId, setting: AttainSetting, values: LeverValues): string[] {
  const linesLever = leversFor(goal, setting).find((l) => l.control === "lines");
  if (!linesLever) return [];
  const v = values[linesLever.id];
  return Array.isArray(v) ? v : [];
}

const FLOW_CLASS: Record<string, string> = {
  start: "bg-[#EA2C00] text-white border-[#EA2C00] font-semibold",
  mid: "bg-[#F8F5F1] text-[#3A3A3A] border-[#E7E0D6]",
  risk: "bg-[#FFF6F3] text-[#EA2C00] border-[#EA2C00] font-semibold",
  end: "bg-white text-[#EA2C00] border-[#EA2C00] border-2 font-semibold",
};

// House palette only, never green/amber/RAG: gray for not started, coral for
// in motion, ink (filled) for landed.
const STATUS_LABEL: Record<AttainmentStatus, string> = {
  not_started: "Not started",
  in_motion: "In motion",
  landed: "Landed",
};
const STATUS_STYLE: Record<AttainmentStatus, string> = {
  not_started: "bg-[#F0ECE5] text-[#8C8C8C]",
  in_motion: "bg-[#FFF6F3] text-[#EA2C00] border border-[#EA2C00]",
  landed: "bg-[#1A1A1A] text-white",
};

function StatusPill({ status, testId }: { status: AttainmentStatus; testId: string }) {
  return (
    <span
      className={`inline-block text-[9.5px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLE[status]}`}
      data-testid={testId}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function isMoved(value: number | string[] | undefined, realityStart: number | string[]): boolean {
  if (Array.isArray(realityStart)) return Array.isArray(value) && value.length > 0;
  return typeof value === "number" && value !== realityStart;
}

interface CommittedLever {
  lever: Lever;
  contribution: LeverContribution | undefined;
  owner: string;
  due: string;
}

/** One priority's shared payload for Strategy's narrative arc — built once
 * (see `priorityData` in the main component) and handed to both "Your
 * Starting Point" near the top and "How this works" near the bottom, so a
 * multi-priority plan's two mentions of the same priority never disagree. */
interface PriorityData {
  goal: GoalId;
  index: number;
  total: number;
  goalDef: GoalDef;
  content: SettingGoalContent;
  committedLevers: CommittedLever[];
  goalMargin: number;
  goalCount: number;
  goalOwner: GoalOwner | undefined;
  isFreedTimeGoal: boolean;
  barAcc: number;
  /** Service lines the partner actually selected for this goal (may be empty).
   * Derived from the goal's "lines" lever, never a hardcoded specialty. */
  selectedLines: string[];
}

function committedLeversFor(
  goal: GoalId,
  setting: AttainSetting,
  values: LeverValues,
  perLever: LeverContribution[] | undefined,
  commitments: Record<string, Commitment>,
): CommittedLever[] {
  return leversFor(goal, setting)
    .filter((l) => isMoved(values[l.id], l.realityStart))
    .map((l) => ({
      lever: l,
      contribution: perLever?.find((p) => p.id === l.id),
      owner: commitments[`${goal}:${l.id}`]?.owner?.trim() || l.ownerRole,
      due: commitments[`${goal}:${l.id}`]?.due ?? l.defaultDue,
    }))
    .sort((a, b) => (b.contribution?.marginalMargin ?? 0) - (a.contribution?.marginalMargin ?? 0));
}

/**
 * One priority's card in the "value by domain" composition (Change 1) —
 * only rendered when a plan has 2+ priorities, so a single-priority plan
 * never shows this alongside the combined headline it would just repeat.
 */
function PriorityBreakdownCard({ goalDef, margin, count, share }: { goalDef: GoalDef; margin: number; count: number; share: number }) {
  return (
    <div className="flex-1 min-w-[150px] bg-[#F8F5F1] border border-[#E7E0D6] rounded-md p-4" data-testid={`card-attain-plan-priority-${goalDef.id}`}>
      <span
        className="inline-block text-[9px] font-bold uppercase tracking-[1.2px] text-white px-2 py-0.5 rounded-full mb-2.5"
        style={{ background: goalDef.pillBg }}
      >
        {goalDef.pill}
      </span>
      <p className="font-abridge text-3xl text-[#1A1A1A]" data-testid={`text-attain-plan-priority-value-${goalDef.id}`}>
        {formatCompact(margin)}
      </p>
      {goalDef.valueUnit.countNoun && (
        <p className="text-[11px] text-[#3A3A3A] mt-1" data-testid={`text-attain-plan-priority-count-${goalDef.id}`}>
          {formatCount(count)} {goalDef.valueUnit.countNoun}
        </p>
      )}
      <p className="text-[10px] text-[#8C8C8C] mt-1">
        <b className="text-[#3A3A3A]">{share}%</b> of combined · {goalDef.label}
      </p>
    </div>
  );
}

/** The dated, expandable history list under a signal — "how it moved and
 * why", most recent first. */
function SignalHistoryList({ entries, unit }: { entries: ProgressEntry[]; unit: string }) {
  const reversed = [...entries].reverse();
  return (
    <div className="mt-2 space-y-1.5" data-testid="list-attain-signal-history">
      {reversed.map((e, i) => (
        <div key={i} className="flex items-baseline gap-3 text-[11px]">
          <span className="text-[#8C8C8C] whitespace-nowrap w-[76px] flex-shrink-0">{formatDate(e.date)}</span>
          <span className="font-semibold text-[#1A1A1A] whitespace-nowrap">
            {e.value.toLocaleString()} {unit}
          </span>
          {e.note && <span className="text-[#8C8C8C] italic truncate">{e.note}</span>}
        </div>
      ))}
    </div>
  );
}

/** One tracked metric on the Progress tab: exactly what the partner chose in
 * the measurement Plan (its baseline, target, owner, and rough date), plus its
 * own dated log and the latest logged value. The loop closes here: this is a
 * `TrackedMetric` straight off `planning.measurement` with progress attached. */
interface MetricRowData extends TrackedMetric {
  entries: ProgressEntry[];
  current: number;
}

// ────────────────────────────────────────────────────────────────────────
// Change 2 — the horizontal, shared-time-axis tracker. Months run left to
// right (Committed -> Today -> Goal), the same convention the "Closing the
// Gap" curve already draws its x-axis on, so a signal's dots and the curve
// above it read as one continuous timeline rather than two unrelated
// widgets. Column widths are shared between the header ruler and every row
// via one constant, so a dot at a given left% always lines up under the
// same point on the ruler no matter which row it is in.
// ────────────────────────────────────────────────────────────────────────

const TRACKER_GRID_COLUMNS = "minmax(200px,1.3fr) 116px minmax(220px,2fr) 92px 138px 118px";

/** Clamped 0-1 fraction of the shared axis a given "months since committed"
 * figure sits at — pure display math, never fed back into any attainment
 * calculation. */
function monthsToFrac(months: number, totalMonths: number): number {
  return totalMonths > 0 ? Math.max(0, Math.min(1, months / totalMonths)) : 0;
}

/** The ruler every row's dots line up under: Committed at the left, Today
 * wherever the real logged history has actually reached, Goal at the right
 * — the same three anchors the curve above already plots. */
function ProgressAxisHeader({ totalMonths, todayFrac, startLabel }: { totalMonths: number; todayFrac: number; startLabel: string }) {
  return (
    <div
      className="grid gap-4 pb-6 mb-2 border-b border-[#E7E0D6]"
      style={{ gridTemplateColumns: TRACKER_GRID_COLUMNS }}
      data-testid="row-attain-tracker-axis-header"
    >
      <span className="text-[9px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C] self-end">Signal</span>
      <span className="text-[9px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C] self-end">Now</span>
      <div className="relative h-3 self-end">
        <div className="absolute left-0 right-0 top-0 h-[1.5px] bg-[#E7E0D6]" />
        <div className="absolute top-0 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#1A1A1A]" style={{ left: "0%" }} />
        <div
          className="absolute top-0 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#EA2C00]"
          style={{ left: `${todayFrac * 100}%` }}
          data-testid="marker-attain-tracker-today"
        />
        <div className="absolute top-0 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#EA2C00]" style={{ left: "100%" }} />
        {/* A plan logged the same day it was committed puts Today's dot
            right on top of Committed's — two separately-positioned labels
            would print on top of each other, so that case collapses to one
            merged caption instead of the normal three-label spread. */}
        {todayFrac < 0.08 ? (
          <span className="absolute top-3 left-0 text-[9px] font-semibold uppercase tracking-wide text-[#EA2C00] whitespace-nowrap">
            {startLabel} · Today
          </span>
        ) : (
          <>
            <span className="absolute top-3 left-0 text-[9px] font-semibold uppercase tracking-wide text-[#8C8C8C] whitespace-nowrap">{startLabel}</span>
            <span
              className="absolute top-3 text-[9px] font-semibold uppercase tracking-wide text-[#EA2C00] whitespace-nowrap"
              style={{
                left: `${todayFrac * 100}%`,
                transform: todayFrac > 0.9 ? "translateX(calc(-100% - 4px))" : "translateX(-50%)",
              }}
            >
              Today
            </span>
          </>
        )}
        <span className="absolute top-3 right-0 text-[9px] font-semibold uppercase tracking-wide text-[#EA2C00] whitespace-nowrap">
          Goal · Mo. {Math.round(totalMonths)}
        </span>
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C] self-end">Status</span>
      <span className="text-[9px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C] self-end">Checked</span>
      <span className="text-[9px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C] self-end">Update</span>
    </div>
  );
}

/** One signal's real, dated climb — every logged point placed at its true
 * position on the shared month axis (not evenly spaced by count, the way a
 * sparkline would), so a signal checked weekly and one checked quarterly
 * both read at their true pace against the same ruler. Fixed-size circular
 * HTML markers, not SVG, so a wide "Timeline" column never stretches a dot
 * into an ellipse. */
function SignalTimelineTrack({
  entries,
  dateToMonths,
  totalMonths,
  todayFrac,
}: {
  entries: ProgressEntry[];
  dateToMonths: Map<string, number>;
  totalMonths: number;
  todayFrac: number;
}) {
  const points = entries.map((e) => ({ frac: monthsToFrac(dateToMonths.get(e.date) ?? 0, totalMonths), entry: e }));
  const last = points[points.length - 1];
  return (
    <div className="relative h-6" data-testid="track-attain-progress-timeline">
      <div className="absolute left-0 right-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-[#F0ECE5]" />
      <div className="absolute top-0 bottom-0 w-0 border-l border-dashed border-[#D8CFC4]" style={{ left: `${todayFrac * 100}%` }} />
      {points.slice(0, -1).map((p, i) => (
        <div
          key={i}
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white border border-[#EA2C00]"
          style={{ left: `${p.frac * 100}%` }}
          title={`${formatDate(p.entry.date)} · ${p.entry.value.toLocaleString()}`}
          data-testid={`point-attain-progress-entry-${i}`}
        />
      ))}
      {last && (
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#EA2C00]"
          style={{ left: `${last.frac * 100}%` }}
          title={`${formatDate(last.entry.date)} · ${last.entry.value.toLocaleString()}`}
          data-testid="point-attain-progress-entry-latest"
        />
      )}
    </div>
  );
}

/** The measured status of one tracked metric. A numeric target reads honestly
 * off how far the latest logged value has moved from baseline toward it; a
 * directional/qualitative target (no number: "cleared", "collected each
 * quarter") can only ever read "In motion" once something is logged past the
 * baseline, never a fabricated "Landed" it has no number to prove. */
function metricStatus(row: MetricRowData): AttainmentStatus {
  if (row.targetNum !== null) {
    return decisionStatus(decisionAttainmentFraction(row.baselineNum, row.current, row.targetNum));
  }
  return row.current !== row.baselineNum ? "in_motion" : "not_started";
}

/** One tracked metric's row in the horizontal tracker: exactly the metric the
 * partner chose in Plan (its baseline -> target, its owner or an honest
 * "Unassigned", its rough date or "Undated"), its dated climb on the shared
 * axis, a status pill, when it was last logged and next due, and the "Log an
 * update" action with its own expandable dated history. */
function MetricTrackerRow({
  row,
  dateToMonths,
  totalMonths,
  todayFrac,
  planCadence,
  onLogProgressUpdate,
}: {
  row: MetricRowData;
  dateToMonths: Map<string, number>;
  totalMonths: number;
  todayFrac: number;
  planCadence: SignalCadence;
  onLogProgressUpdate: (metricKey: string, value: number, note?: string) => void;
}) {
  const { key: metricKey, label, linkTitle, owner, byWhen, fromProof, unit, baselineText, targetText, entries, current } = row;
  const [loggingOpen, setLoggingOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(current);
  const [draftNote, setDraftNote] = useState("");

  useEffect(() => {
    if (!loggingOpen) setDraftValue(current);
  }, [current, loggingOpen]);

  const status = metricStatus(row);
  const last = latestEntry(entries);
  // Every metric shares the SAME plan-wide review cadence — never per-row.
  const nextDue = last ? nextCheckDueDate(last.date, planCadence) : undefined;
  const isOverdue = !!nextDue && nextDue < todayISODate();

  function handleSave() {
    onLogProgressUpdate(metricKey, draftValue, draftNote);
    setDraftNote("");
    setLoggingOpen(false);
  }

  return (
    <div className="border-b border-[#F0ECE5] py-3.5 last:border-b-0" data-testid={`row-attain-progress-metric-${metricKey}`}>
      <div className="grid items-center gap-4" style={{ gridTemplateColumns: TRACKER_GRID_COLUMNS }}>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {fromProof && (
              <span
                className="inline-block text-[7.5px] font-bold uppercase tracking-wide text-white bg-[#1A1A1A] px-1.5 py-[1px] rounded-full flex-shrink-0"
                data-testid={`badge-attain-progress-fromproof-${metricKey}`}
              >
                From Align
              </span>
            )}
            <p className="text-[12px] font-bold text-[#1A1A1A] truncate">{label}</p>
          </div>
          <p className="text-[10px] text-[#8C8C8C] truncate">
            {linkTitle} · {owner.trim() ? owner : <span className="italic text-[#B4B4B4]">Unassigned</span>}
            {" · "}
            {byWhen ? `by ${formatDate(byWhen)}` : <span className="italic text-[#B4B4B4]">Undated</span>}
          </p>
        </div>

        <div className="text-[11px] leading-snug whitespace-nowrap">
          <p className="font-abridge text-base text-[#EA2C00]" data-testid={`text-attain-progress-current-${metricKey}`}>
            {current.toLocaleString()} <span className="text-[9px] font-sans text-[#8C8C8C]">{unit}</span>
          </p>
          <p className="text-[#8C8C8C]">{baselineText} &rarr; <span className="text-[#EA2C00] font-semibold">{targetText}</span></p>
        </div>

        <SignalTimelineTrack entries={entries} dateToMonths={dateToMonths} totalMonths={totalMonths} todayFrac={todayFrac} />

        <StatusPill status={status} testId={`badge-attain-progress-status-${metricKey}`} />

        <div className="text-[10px] text-[#8C8C8C] leading-snug">
          <p data-testid={`text-attain-progress-last-updated-${metricKey}`}>Logged {formatDate(last?.date)}</p>
          <p className={isOverdue ? "text-[#EA2C00] font-semibold" : ""} data-testid={`text-attain-progress-next-due-${metricKey}`}>
            Due {formatDate(nextDue)}{isOverdue ? " · overdue" : ""}
          </p>
        </div>

        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex items-center gap-1 text-[10.5px] font-semibold text-[#1A1A1A] hover:text-[#EA2C00]"
            data-testid={`button-attain-progress-history-toggle-${metricKey}`}
          >
            {entries.length} logged
            {historyOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {!loggingOpen && (
            <button
              type="button"
              onClick={() => setLoggingOpen(true)}
              className="text-[10.5px] text-[#EA2C00] font-semibold hover:underline"
              data-testid={`button-attain-progress-log-open-${metricKey}`}
            >
              + Log update
            </button>
          )}
        </div>
      </div>

      {historyOpen && (
        <div className="mt-1 pl-1" data-testid={`region-attain-progress-history-${metricKey}`}>
          <SignalHistoryList entries={entries} unit={unit} />
        </div>
      )}

      {loggingOpen && (
        <div className="mt-3 bg-[#F8F5F1] border border-[#E7E0D6] rounded-md p-3" data-testid={`form-attain-progress-log-${metricKey}`}>
          <div className="flex flex-wrap items-end gap-2.5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">New value ({unit})</p>
              <NumberField
                value={draftValue}
                onValueChange={setDraftValue}
                min={0}
                className="h-9 w-24 rounded-md border border-[#D8CFC4] bg-white px-2 text-xs text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                data-testid={`input-attain-progress-log-value-${metricKey}`}
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">What changed (optional)</p>
              <input
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="e.g., new EHR order set went live"
                className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                data-testid={`input-attain-progress-log-note-${metricKey}`}
              />
            </div>
            <Button
              onClick={handleSave}
              className="h-9 px-4 bg-[#EA2C00] hover:bg-[#D42600] text-white text-xs"
              data-testid={`button-attain-progress-log-save-${metricKey}`}
            >
              Save
            </Button>
            <button
              type="button"
              onClick={() => setLoggingOpen(false)}
              className="h-9 px-2 text-xs text-[#8C8C8C] hover:text-[#1A1A1A]"
              data-testid={`button-attain-progress-log-cancel-${metricKey}`}
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-[#B4B4B4] mt-2">Dated today, {formatDate(todayISODate())}, and added to this metric's history below.</p>
        </div>
      )}
    </div>
  );
}

/** Every tracked metric in one priority, grouped under that priority's pill,
 * so a multi-priority plan reads as clearly-separated bands on the same shared
 * axis rather than one long undifferentiated list. */
function PriorityTrackerGroup({
  goalDef,
  showPriority,
  rows,
  dateToMonths,
  totalMonths,
  todayFrac,
  planCadence,
  onLogProgressUpdate,
}: {
  goalDef: GoalDef;
  showPriority: boolean;
  rows: MetricRowData[];
  dateToMonths: Map<string, number>;
  totalMonths: number;
  todayFrac: number;
  planCadence: SignalCadence;
  onLogProgressUpdate: (metricKey: string, value: number, note?: string) => void;
}) {
  return (
    <div className="mb-1" data-testid={`group-attain-progress-tracker-${goalDef.id}`}>
      {showPriority && (
        <div className="flex items-center gap-2 mb-2 mt-5 first:mt-0">
          <span
            className="inline-block text-[9px] font-bold uppercase tracking-[1.2px] text-white px-2 py-0.5 rounded-full"
            style={{ background: goalDef.pillBg }}
          >
            {goalDef.pill}
          </span>
          <span className="text-[12px] font-bold text-[#1A1A1A]">{goalDef.label}</span>
        </div>
      )}
      <div>
        {rows.map((row) => (
          <MetricTrackerRow
            key={row.key}
            row={row}
            dateToMonths={dateToMonths}
            totalMonths={totalMonths}
            todayFrac={todayFrac}
            planCadence={planCadence}
            onLogProgressUpdate={onLogProgressUpdate}
          />
        ))}
      </div>
    </div>
  );
}

/** The measurement scorecard as one clean table — the exact metrics the
 * partner chose in Plan, each with its baseline -> target, its owner (or an
 * honest "Unassigned"), and its rough date (or "Undated"). This is the Strategy
 * tab's readout of what Progress tracks, so both tabs read off one chosen set. */
function ScorecardTable({ rows, testId }: { rows: TrackedMetric[]; testId: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse" data-testid={testId}>
        <thead>
          <tr>
            <th className="text-[9.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Metric</th>
            <th className="text-[9.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Baseline &rarr; target</th>
            <th className="text-[9.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Owner</th>
            <th className="text-[9.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6] text-right">By when</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.key} data-testid={`row-attain-scorecard-${m.goal}-${m.metricId}`}>
              <td className="py-3 px-2 border-b border-[#F0ECE5] align-top max-w-[320px]">
                <p className="text-[12.5px] font-bold text-[#1A1A1A]">{m.label}</p>
                <p className="text-[10.5px] text-[#8C8C8C] mt-0.5 leading-relaxed">{m.linkTitle}</p>
              </td>
              <td className="py-3 px-2 border-b border-[#F0ECE5] align-top text-[11.5px] text-[#3A3A3A]">
                {m.baselineText}
                {m.baselineTag === "benchmark" && (
                  <span className="ml-1.5 text-[8px] font-bold uppercase tracking-[1px] text-[#8C8C8C] bg-[#F0ECE5] rounded px-1.5 py-0.5 align-middle">
                    Benchmark
                  </span>
                )}{" "}
                <span className="text-[#B4B4B4]">&rarr;</span>{" "}
                <span className="text-[#EA2C00] font-semibold">{m.targetText}</span>
              </td>
              <td className="py-3 px-2 border-b border-[#F0ECE5] align-top text-[11.5px] text-[#3A3A3A] whitespace-nowrap">
                {m.owner.trim() ? m.owner : <span className="italic text-[#B4B4B4]">Unassigned</span>}
              </td>
              <td className="py-3 px-2 border-b border-[#F0ECE5] align-top text-[11.5px] text-[#3A3A3A] whitespace-nowrap text-right">
                {m.byWhen ? formatDate(m.byWhen) : <span className="italic text-[#B4B4B4]">Undated</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface StepAttainmentProps {
  state: AttainState;
  setting: AttainSetting;
  goals: GoalId[];
  /** The partner's operational baseline, so the Attainment hub can re-derive
   * the same measurement chain the Plan step built (deriveMeasurementModelFor
   * needs it). */
  baseline: AttainBaseline;
  /** The whole editable plan layer, including `planning.measurement` /
   * `measurementByGoal` — the metrics the partner chose to track. This is what
   * closes the loop: the hub tracks exactly what Plan wrote here. */
  planning: AttainPlanning;
  target: GoalTargetResult;
  attainment: AttainmentResult;
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult;
  commitments: Record<string, Commitment>;
  goalOwnerByPriority: Partial<Record<GoalId, GoalOwner>>;
  /** ONE plan-wide review cadence (Commit redesign) — every committed
   * signal's "next check due" below is derived off this single value,
   * never a per-signal setting. */
  planCadence: SignalCadence;
  freedTimeSplit: number;
  /** Per-priority realization/attribution rate (0-100, default 100 when a
   * goal is missing) - set on Build the case's "Realization rate" control.
   * Every dollar figure this component renders already reflects it (see
   * `combined`, already scaled by attainLevers.ts's `applyRealization`);
   * this is only threaded through to hand `generateAttainPdf` the same
   * value so the PDF's footnote can name it. */
  realizationByGoal: RealizationByGoal;
  /** Every committed signal's dated log (key = `${goal}:${leverId}:${signalId}`)
   * — the Progress tab's real memory. See the persistence note on this state
   * in AttainFlow: session-local until the save/backend layer lands. */
  progressEntries: Record<string, ProgressEntry[]>;
  /** Appends a dated entry (today, a new value, an optional note) to one
   * signal's log — the one write path "Log an update" uses. */
  onLogProgressUpdate: (signalKey: string, value: number, note?: string) => void;
  onMonthsElapsedChange: (months: number) => void;
  /** The real step number in the current (dynamic) sequence - one build-case
   * page per selected goal means Attainment's position shifts with goal
   * count. */
  stepNumber: number;
  /** Save-and-return: encodes the full plan (including commitments and
   * progress history), writes it to the local draft, copies a shareable
   * `?attain=` link to the clipboard, and resolves with that link — or
   * `null` if there is nothing yet worth saving (no setting/goal chosen).
   * See AttainFlow.tsx's `handleSave` and attainUrlState.ts. */
  onSave: () => Promise<string | null>;
}

export default function StepAttainment({
  state,
  setting,
  goals,
  baseline,
  planning,
  target,
  attainment,
  valuesByGoal,
  combined,
  commitments,
  goalOwnerByPriority,
  planCadence,
  freedTimeSplit,
  realizationByGoal,
  progressEntries,
  onLogProgressUpdate,
  onMonthsElapsedChange,
  stepNumber,
  onSave,
}: StepAttainmentProps) {
  // A clean, real, editable field rather than a dangling empty placeholder —
  // starts on a sensible default name the partner can overwrite with their
  // own organization's name.
  const [orgName, setOrgName] = useState("Your organization");
  const [tab, setTab] = useState<"strategy" | "progress">("strategy");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // The copied-link confirmation — holds the actual link so a partner can
  // read/copy it again by hand if the clipboard write silently failed
  // (Safari/permissions), not just a bare "saved" message.
  const [savedLink, setSavedLink] = useState<string | null>(null);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      const url = await onSave();
      setSavedLink(url);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await generateAttainPdf({
        state,
        setting,
        goals,
        target,
        attainment,
        valuesByGoal,
        combined,
        commitments,
        goalOwnerByPriority,
        planCadence,
        freedTimeSplit,
        realizationByGoal,
        orgName,
      });
    } catch (err) {
      console.error("Attain PDF export failed", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Both outpatient and ED access mechanically divide freed hours by a
  // conversion constant to create capacity/throughput, so both compete with
  // retention for the same freed hour - see attainLevers.ts's
  // computeMultiGoalContributions and attainEdAccess.ts's module header.
  const hasFreedTimeConflict = (setting === "outpatient" || setting === "ed") && goals.includes("access") && goals.includes("retention");
  const curveGoalLabel = `${formatCompact(target.margin)} · ${target.label}`;
  const remainingMonths = Math.max(0, state.totalMonths - state.monthsElapsed);
  const remainingMargin = Math.max(0, target.margin - attainment.marginToDate);
  const unitLabel = UNIT_LABEL[setting] ?? "units";

  // ── CLOSING THE LOOP ──────────────────────────────────────────────────────
  // The Progress tab tracks EXACTLY the metrics the partner chose in the
  // measurement Plan (planning.measurement / measurementByGoal), re-derived
  // here from the same Align state and the same picks the Plan step wrote, so
  // the hub and the plan can never track a different set. Each metric carries
  // its own dated log; `current` is the latest logged value (or its baseline
  // before the seeding effect in AttainFlow has run once — matching what that
  // effect seeds).
  const trackedByGoal = trackedMetricsByGoal({
    goals,
    setting,
    baseline,
    valuesByGoal,
    combined,
    freedTimeSplit,
    planning,
    defaultValues: (g) => defaultLeverValues(g, setting),
  });

  const attachProgress = (m: TrackedMetric): MetricRowData => {
    // A metric's log holds exactly one entry until a real update is logged: the
    // seed baseline, dated the day tracking started. That seed is written once
    // and never re-touched, so if the metric's LIVE baseline later shifts (e.g.
    // an ED LWBS rate that starts at a benchmark and is then typed on Align),
    // the stored seed value goes stale and would read as movement no one logged.
    // While only that seed exists (length <= 1), pin the baseline point to the
    // metric's live baseline, so measured attainment is honestly 0% until a real
    // dated update is appended. A logged update (length > 1) is used verbatim.
    const stored = progressEntries[m.key];
    const hasRealLog = (stored?.length ?? 0) > 1;
    const entries: ProgressEntry[] = hasRealLog
      ? (stored as ProgressEntry[])
      : [{ date: stored?.[0]?.date ?? todayISODate(), value: m.baselineNum }];
    return { ...m, entries, current: currentValueFromEntries(entries, m.baselineNum) };
  };

  // Metric rows grouped by PRIORITY for the horizontal tracker, in `goals`
  // order (empty goals already dropped by trackedMetricsByGoal).
  const priorityRowGroups = trackedByGoal.map(({ goal, rows }) => ({
    goal,
    goalDef: GOAL_CATALOG[goal],
    rows: rows.map(attachProgress),
  }));
  const metricRows: MetricRowData[] = priorityRowGroups.flatMap((g) => g.rows);

  // Measured attainment: only metrics with a NUMERIC target can be scored
  // against one; a directional/qualitative target ("cleared", "collected each
  // quarter") is still tracked and loggable, but never fabricates a numeric
  // percent. Every scored metric weighs equally, so the percent reads honestly
  // as "how far, on average, the metrics you chose have moved toward target."
  const numericRows = metricRows.filter((r) => r.targetNum !== null);
  const progressDecisionInputs: DecisionProgressInput[] = numericRows.map((r) => ({
    key: r.key,
    baseline: r.baselineNum,
    current: r.current,
    target: r.targetNum as number,
    worth: 1,
  }));
  const progressPct = computeProgressAttainmentPct(progressDecisionInputs);

  // The REAL, dated climb this plan has actually made — every scored metric's
  // log, carried forward date by date. This is what the curve plots below; it
  // is never a synthetic 3-point line on the Progress tab.
  const trajectorySignals: SignalProgressInput[] = numericRows.map((r) => ({
    key: r.key,
    baseline: r.baselineNum,
    target: r.targetNum as number,
    worth: 1,
    entries: r.entries,
  }));
  const trajectory = computeActualTrajectory(trajectorySignals, todayISODate());
  const trajectoryPct = trajectory.length > 0 ? trajectory[trajectory.length - 1].pct : progressPct;

  // Every entry's real position on the shared month axis, read straight off
  // the trajectory's own dated points — never a second, competing calculation.
  const dateToMonths = new Map(trajectory.map((p) => [p.date, p.monthsFromStart]));
  const axisTodayFrac = monthsToFrac(
    trajectory.length > 0 ? trajectory[trajectory.length - 1].monthsFromStart : state.monthsElapsed,
    state.totalMonths,
  );

  const goalDefs = goals.map((g) => GOAL_CATALOG[g]);
  const planTitle = goalDefs.length === 1 ? goalDefs[0].label : goalDefs.map((g) => g.label).join(" + ");

  // One shared per-priority payload for both "Your Starting Point" (near the
  // top of Strategy's narrative) and the "How this works" deep-dive reveal
  // (tucked near the bottom) — computed once so neither can drift from the
  // other or from the combined engine result.
  const priorityData: PriorityData[] = goals
    .map((goal, idx) => {
      const content = getContent(setting, goal);
      if (!content) return null;
      const goalDef = GOAL_CATALOG[goal];
      const values = valuesByGoal[goal] ?? defaultLeverValues(goal, setting);
      const result = combined.byGoal[goal];
      const committedLevers = committedLeversFor(goal, setting, values, result?.perLever, commitments);
      const isFreedTimeGoal = hasFreedTimeConflict && (goal === "access" || goal === "retention");
      const liveBarAcc = goal === "access" ? freedTimeSplit : 100 - freedTimeSplit;
      return {
        goal,
        index: idx,
        total: goals.length,
        goalDef,
        content,
        committedLevers,
        goalMargin: result?.totalMargin ?? 0,
        goalCount: result?.totalCount ?? 0,
        goalOwner: goalOwnerByPriority[goal],
        isFreedTimeGoal,
        barAcc: isFreedTimeGoal ? liveBarAcc : content.barAcc,
        selectedLines: selectedLinesFor(goal, setting, values),
      };
    })
    .filter((d): d is PriorityData => d !== null);

  // ── Honesty: quality's soft dollar never sums into "contribution margin" ──
  // Nursing quality's dollar is a cost-of-harm-avoided figure, attributed at a
  // partial share (see attainLevers.ts's `defaultRealizationPct`) — a SOFT
  // safety number, not hard contribution margin. In a multi-goal plan that
  // also carries a financial priority, `target.margin` (== `combined.combinedMargin`)
  // would otherwise fold that soft dollar into the one number labeled
  // "contribution margin". Only the DISPLAY below is adjusted: `target.margin`
  // itself still drives attainment tracking (curve, runway, "at a glance")
  // exactly as before, since that math is unchanged by this fix.
  const hasQualityGoal = goals.includes("quality");
  const isMultiGoalWithQuality = hasQualityGoal && goalDefs.length > 1;
  // A quality-only plan: the headline leads with the COUNT (events prevented),
  // never the soft cost-of-harm dollar. Same safety-first posture Align, Plan,
  // and the multi-goal hero already hold — applied here on the Attainment hub.
  const isQualityOnly = hasQualityGoal && goalDefs.length === 1;
  const qualityMargin = combined.byGoal.quality?.totalMargin ?? 0;
  const hardContributionMargin = target.margin - qualityMargin;
  const qualityValuesForPayoff = valuesByGoal.quality ?? defaultLeverValues("quality", setting);
  const qualityPayoffModel = hasQualityGoal
    ? deriveMeasurementModelFor("quality", setting, baseline, qualityValuesForPayoff, combined, 1)
    : null;
  const qualityHeroCount = qualityPayoffModel?.safetyHeadline?.heroValue ?? "count pending";
  const qualitySoftDollarNote = qualityPayoffModel?.safetyHeadline?.softDollarNote ?? "This plan leads with safety, not a dollar.";

  // ── The concrete outcome, in their own unit ──────────────────────────────
  // The output leads with the real thing the partner is buying (visits opened,
  // departures avoided, overtime hours off the schedule, harm events prevented,
  // or dollars of delivered care put back on the claim), never an abstract
  // "units of value". The dollar is the translation underneath, not the hero.
  const singleGoal = goalDefs.length === 1 ? goalDefs[0] : null;
  const singleGoalId = goals.length === 1 ? goals[0] : null;
  const singleGoalCount = singleGoalId ? combined.byGoal[singleGoalId]?.totalCount ?? 0 : 0;
  const singleGoalMargin = singleGoalId ? combined.byGoal[singleGoalId]?.totalMargin ?? 0 : 0;
  // Lead the payoff with the concrete count for a single count-goal; quality
  // (soft dollar) and revenue (the money IS the delivered work) keep their own
  // dollar-first / count-first heroes below.
  const payoffLeadWithCount = !!singleGoal && !singleGoal.valueUnit.heroIsDollar && !isQualityOnly;

  // The one metric that best expresses each priority's OUTCOME (its
  // highest-link scored metric short of the money link), so "Your Starting
  // Point" can open on the partner's own today -> target gap instead of a
  // benchmark. Undefined when nothing scored is tracked for that priority.
  const outcomeMetricByGoal: Partial<Record<GoalId, TrackedMetric>> = {};
  for (const { goal, rows } of trackedByGoal) {
    const scored = rows.filter((r) => r.targetNum !== null);
    // Prefer a metric with a real operational "today" (a non-zero baseline like
    // a 24-day wait), so the contrast reads "you are at X, this takes you to Y",
    // not "0 -> target" which is a build-up, not a current-state gap. Fall back
    // to the highest pre-money metric, then to anything scored.
    const preMoney = scored.filter((r) => r.linkN < 7);
    const operational = preMoney.filter((r) => r.baselineNum > 0);
    const pool = operational.length ? operational : preMoney.length ? preMoney : scored;
    const pick = [...pool].sort((a, b) => b.linkN - a.linkN)[0];
    if (pick) outcomeMetricByGoal[goal] = pick;
  }

  // The support line under the outcome: the dollar, the pace, and the coverage,
  // all demoted beneath the concrete outcome.
  const paceTail = `On pace to ${attainment.pct}% this month, tracked across ${metricRows.length} metric${metricRows.length === 1 ? "" : "s"}.`;
  let outcomeSupportLine: string;
  if (isQualityOnly) {
    outcomeSupportLine = `This plan leads with safety, not a dollar. ${paceTail}`;
  } else if (singleGoal?.valueUnit.heroIsDollar) {
    outcomeSupportLine = `That is contribution margin on care already delivered, counted once. ${paceTail}`;
  } else if (singleGoal) {
    outcomeSupportLine = `Worth about ${formatCompact(singleGoalMargin)} in contribution margin, counted once. ${paceTail}`;
  } else {
    const combinedStr = isMultiGoalWithQuality
      ? hardContributionMargin > 0
        ? formatCompact(hardContributionMargin)
        : "value pending"
      : formatCompact(target.margin);
    outcomeSupportLine = `Worth about ${combinedStr} in combined contribution margin, counted once${isMultiGoalWithQuality ? ", with nursing quality tracked as safety below" : ""}. ${paceTail}`;
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-1" data-testid="text-step-eyebrow">
            Step {stepNumber} · Attainment
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-black font-abridge uppercase tracking-tight" data-testid="text-step-title">
            Attainment
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            className="h-10 gap-2 border-[#EA2C00] text-[#EA2C00] hover:bg-[#FFF6F3] hover:text-[#EA2C00]"
            data-testid="button-attain-save"
            disabled={isSaving}
            onClick={handleSaveClick}
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving…" : "Save"}
          </Button>
          <Button
            className="h-10 gap-2 bg-black hover:bg-black/90 text-white"
            data-testid="button-attain-download-pdf"
            disabled={isDownloadingPdf}
            onClick={handleDownloadPdf}
          >
            <Download className="w-4 h-4" />
            {isDownloadingPdf ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Save confirmation — a link was just copied to the clipboard and
          written to this browser's local draft. Shows the real link (not
          just a bare "saved" message) so a partner whose clipboard write
          silently failed can still copy it by hand. Dismissable, never
          auto-hides mid-read. */}
      {savedLink && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50 max-w-md bg-[#1A1A1A] border border-[#EA2C00] rounded-lg shadow-lg p-4 flex items-start gap-3"
          data-testid="toast-attain-save-confirmation"
        >
          <div className="w-6 h-6 rounded-full bg-[#EA2C00] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-abridge text-sm text-white mb-1">Plan saved</p>
            <p className="text-[12.5px] text-white/70 leading-relaxed mb-2">
              A shareable link is copied to your clipboard. Open it anytime, on any device, to pick up exactly where
              you left off, decisions, commitments, and progress history included.
            </p>
            <p
              className="text-[11px] text-white/90 font-mono bg-white/10 rounded px-2 py-1.5 break-all"
              data-testid="text-attain-save-link"
            >
              {savedLink}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSavedLink(null)}
            className="text-white/50 hover:text-white flex-shrink-0"
            data-testid="button-attain-save-confirmation-dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Strategy / Progress — the hub's two faces. Strategy is the plan as
          authored; Progress is the surface the partner actually returns to
          between reviews. */}
      <div className="flex items-center gap-1 bg-[#F0ECE5] rounded-full p-1 mb-10 w-fit" data-testid="tabs-attain-hub">
        <button
          onClick={() => setTab("strategy")}
          className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${
            tab === "strategy" ? "bg-[#1A1A1A] text-white" : "text-[#8C8C8C] hover:text-[#1A1A1A]"
          }`}
          data-testid="tab-attain-strategy"
        >
          Strategy
        </button>
        <button
          onClick={() => setTab("progress")}
          className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${
            tab === "progress" ? "bg-[#1A1A1A] text-white" : "text-[#8C8C8C] hover:text-[#1A1A1A]"
          }`}
          data-testid="tab-attain-progress"
        >
          Progress
        </button>
      </div>

      {tab === "progress" && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid="panel-attain-progress">
          <p className="text-[11px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">Where This Stands</p>
          <h2 className="font-abridge text-[32px] text-[#1A1A1A] mb-4">Progress</h2>
          <p className="text-[15px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]" data-testid="text-attain-progress-cadence-lead">
            These are the exact metrics you chose in your measurement plan, reviewed <b>{CADENCE_LABEL[planCadence]}</b>.
            Log the real number for each one below. The date stamps itself, the trend and the curve climb with it, and
            the history builds a dated record for the next review. Nothing here is projected. It only moves when someone
            logs that something actually moved.
          </p>

          {metricRows.length === 0 ? (
            <div className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4" data-testid="text-attain-progress-empty">
              <p className="text-[15px] text-[#3A3A3A] leading-relaxed">
                No metrics are being tracked yet. Go back to your measurement plan and pick at least one metric to own.
              </p>
            </div>
          ) : (
            <>
              <AttainmentCurve
                pct={trajectoryPct}
                onPacePct={attainment.onPacePct}
                monthsElapsed={state.monthsElapsed}
                totalMonths={state.totalMonths}
                goalLabel={curveGoalLabel}
                startLabel="Committed"
                actualPoints={trajectory}
              />

              <div className="flex flex-wrap gap-3 my-6">
                <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-progress-stat-attainment">
                  <p className="text-[9.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">Attainment, measured</p>
                  <p className="font-abridge text-3xl text-[#EA2C00] mt-2 mb-1" data-testid="text-attain-progress-pct">{progressPct}%</p>
                  <p className="text-[10px] text-[#8C8C8C]">Averaged across the metrics you chose to track, from their logged updates</p>
                </div>
                <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-progress-stat-onpace">
                  <p className="text-[9.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">On-pace target</p>
                  <p className="font-abridge text-3xl text-[#1A1A1A] mt-2 mb-1">{attainment.onPacePct}%</p>
                  <p className="text-[10px] text-[#8C8C8C]">Where the plan expected this month</p>
                </div>
                <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-progress-stat-runway">
                  <p className="text-[9.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">Runway to goal</p>
                  <p className="font-abridge text-3xl text-[#1A1A1A] mt-2 mb-1">{remainingMonths} mo</p>
                  <p className="text-[10px] text-[#8C8C8C]">~{formatCompact(remainingMargin)} margin remaining</p>
                </div>
              </div>

              {/* The horizontal tracker — one shared month axis (Committed
                  -> Today -> Goal), every metric the partner chose in Plan a
                  row banded by priority, its dated log a march of dots across
                  that same ruler. */}
              <div className="border border-[#E7E0D6] rounded-lg bg-white p-5 md:p-6" data-testid="panel-attain-progress-tracker">
                <ProgressAxisHeader totalMonths={state.totalMonths} todayFrac={axisTodayFrac} startLabel="Committed" />
                <div data-testid="list-attain-progress-metrics">
                  {priorityRowGroups.map(({ goal, goalDef, rows }) => (
                    <PriorityTrackerGroup
                      key={goal}
                      goalDef={goalDef}
                      showPriority={goalDefs.length > 1}
                      rows={rows}
                      dateToMonths={dateToMonths}
                      totalMonths={state.totalMonths}
                      todayFrac={axisTodayFrac}
                      planCadence={planCadence}
                      onLogProgressUpdate={onLogProgressUpdate}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <p className="text-[11px] text-[#B4B4B4] leading-relaxed max-w-[600px] mt-6 border-t border-[#E5E5E5] pt-3">
            {/* Persistence note: Save writes this history into a shareable
                link and a local draft (see attainUrlState.ts). That covers
                "come back to this on this device, or from the link" - a real
                account tied to this organization, editable from any device
                without the link, is a future backend layer. */}
            Click Save above to copy a link back to this exact history, every tracked metric included. Reopening that
            link, on this device or any other, picks this plan up exactly where it stands today.
          </p>
        </motion.section>
      )}

      {tab === "strategy" && (
        <>
          {/* ============ HEADER + AT A GLANCE — the whole plan grasped in
              five seconds: goal, combined value, attainment, and the moves.
              A bounded card so it reads as the anchor of the page, not more
              scroll; everything below it is the supporting story. ============ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-white border border-[#E7E0D6] rounded-2xl shadow-sm p-8 md:p-10"
            data-testid="section-attain-cover"
          >
            <div className="pb-6 mb-6 border-b border-[#F0ECE5]">
              <p className="text-[11px] font-semibold uppercase tracking-[3.2px] text-[#8C8C8C] mb-2">Attainment</p>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {goalDefs.map((g) => (
                  <span
                    key={g.id}
                    className="inline-block text-[10px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
                    style={{ background: g.pillBg }}
                    data-testid={`pill-attain-plan-goal-${g.id}`}
                  >
                    {g.pill}
                  </span>
                ))}
              </div>
              <h2 className="font-abridge text-4xl md:text-5xl text-[#1A1A1A] mb-3" data-testid="text-attain-plan-title">
                {planTitle}
              </h2>
              <div className="w-[100px] h-1 bg-[#EA2C00] mb-4" />
              <p className="text-base text-[#8C8C8C]">
                {goalDefs.length === 1
                  ? scopeSummaryLine(setting, state.scope.unitCount, unitLabel, priorityData[0]?.selectedLines ?? [])
                  : `${goalDefs.length} priorities, one combined plan`}
              </p>
            </div>

            {/* THE OUTCOME — lead with the concrete thing the partner is
                buying, in their own unit. The dollar, the pace and the
                coverage are demoted to the support line beneath it. */}
            <div data-testid="panel-attain-glance" className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[2.5px] text-[#8C8C8C] mb-3">The outcome</p>

              {isQualityOnly ? (
                <p
                  className="font-abridge text-[28px] md:text-[34px] leading-[1.2] text-[#EA2C00] max-w-[760px] mb-4"
                  data-testid="text-attain-glance-outcome"
                >
                  {qualityHeroCount}
                </p>
              ) : singleGoal ? (
                <p
                  className="font-abridge text-[28px] md:text-[34px] leading-[1.2] text-[#1A1A1A] max-w-[760px] mb-4"
                  data-testid="text-attain-glance-outcome"
                >
                  <OutcomeSentence
                    goalDef={singleGoal}
                    count={formatCount(singleGoalCount)}
                    dollar={formatCompact(singleGoalMargin)}
                  />
                </p>
              ) : (
                <div className="mb-4">
                  <p className="font-abridge text-[26px] md:text-[30px] leading-[1.2] text-[#1A1A1A] mb-3">
                    One plan, {goalDefs.length} priorities.
                  </p>
                  <div className="flex flex-col gap-2 max-w-[760px]">
                    {priorityData.map((d) => (
                      <p
                        key={d.goal}
                        className="text-[15.5px] leading-relaxed text-[#3A3A3A]"
                        data-testid={`text-attain-glance-outcome-${d.goal}`}
                      >
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle"
                          style={{ background: d.goalDef.pillBg }}
                        />
                        <OutcomeSentence
                          goalDef={d.goalDef}
                          count={formatCount(d.goalCount)}
                          dollar={formatCompact(d.goalMargin)}
                        />
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <p
                className="text-[13.5px] leading-relaxed text-[#8C8C8C] max-w-[680px] mb-5"
                data-testid="text-attain-glance-support"
              >
                {outcomeSupportLine}
              </p>

              {metricRows.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="list-attain-glance-moves">
                  {metricRows.slice(0, 4).map((m) => (
                    <span
                      key={m.key}
                      className="inline-flex items-center gap-1.5 text-[11px] bg-[#F8F5F1] border border-[#E7E0D6] rounded-full pl-2 pr-3 py-1"
                      data-testid={`chip-attain-glance-move-${m.goal}-${m.metricId}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GOAL_CATALOG[m.goal].pillBg }} />
                      <b className="text-[#1A1A1A]">{m.label}</b>
                      <span className="text-[#8C8C8C]">· {m.owner.trim() ? m.owner : "Unassigned"}</span>
                    </span>
                  ))}
                  {metricRows.length > 4 && (
                    <span className="text-[11px] text-[#8C8C8C] self-center" data-testid="text-attain-glance-moves-more">
                      +{metricRows.length - 4} more
                    </span>
                  )}
                </div>
              )}
              {hasQualityGoal && (
                <p className="text-[11px] text-[#8C8C8C] leading-relaxed max-w-[560px] mt-3" data-testid="text-attain-glance-quality-soft">
                  <b className="text-[#3A3A3A]">Safety value, not contribution margin.</b> {qualitySoftDollarNote}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-start gap-6 pt-5 border-t border-[#F0ECE5]">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[2.5px] text-[#B4B4B4] mb-1">Prepared for</p>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="text-[16.5px] font-bold text-[#1A1A1A] bg-transparent border-b border-dashed border-[#D8CFC4] focus:border-[#EA2C00] outline-none"
                  data-testid="input-attain-org-name"
                />
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[2.5px] text-[#B4B4B4] mb-1">Prepared by</p>
                <p className="text-[16.5px] text-[#3A3A3A]">Abridge Partner Success · {today}</p>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[2.5px] text-[#B4B4B4] mb-1">Horizon</p>
                <p className="text-[16.5px] text-[#3A3A3A]">{state.totalMonths} months · {metricRows.length} metric{metricRows.length === 1 ? "" : "s"} tracked</p>
              </div>
            </div>
          </motion.section>

          {/* ============ YOUR STARTING POINT — their operation today, and what good looks like, one block per priority ============ */}
          {priorityData.map((d) => (
            <StartingPointSection
              key={d.goal}
              {...d}
              unitCount={state.scope.unitCount}
              unitLabel={unitLabel}
              outcomeMetric={outcomeMetricByGoal[d.goal]}
            />
          ))}

          {/* ============ CLOSING THE GAP (combined) ============ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-white border border-[#E7E0D6] rounded-2xl shadow-sm p-8 md:p-10"
            data-testid="section-attain-curve"
          >
            <div className="pb-5 mb-5 border-b border-[#F0ECE5]">
              <p className="text-[11px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">The Trajectory</p>
              <h2 className="font-abridge text-[32px] text-[#1A1A1A]">Closing the Gap</h2>
            </div>
            <p className="text-[15px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">
              The line below is your plan: the target trajectory from today to the goal, combined across every priority
              in this plan. The number at Today is where a fully on-pace plan would sit this month, a projection, not
              measured. Once you log real progress on the Progress tab, that tab plots your actual climb against this
              same target, so you can see exactly where you stand.
            </p>

            <AttainmentCurve
              pct={attainment.pct}
              onPacePct={attainment.onPacePct}
              monthsElapsed={state.monthsElapsed}
              totalMonths={state.totalMonths}
              goalLabel={curveGoalLabel}
            />

            <div className="flex items-center gap-3 mt-3 mb-6 max-w-[420px]">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C] whitespace-nowrap">
                Today: month {state.monthsElapsed} of {state.totalMonths}
              </label>
              <input
                type="range"
                min={0}
                max={state.totalMonths}
                value={state.monthsElapsed}
                onChange={(e) => onMonthsElapsedChange(Number(e.target.value))}
                className="flex-1 accent-[#EA2C00]"
                data-testid="input-attain-months-elapsed"
              />
            </div>

            <div className="flex flex-wrap gap-3 mb-2">
              <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-stat-attainment">
                <p className="text-[9.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">Projected, on-pace</p>
                <p className="font-abridge text-3xl text-[#EA2C00] mt-2 mb-1">{attainment.pct}%</p>
                <p className="text-[10px] text-[#8C8C8C]">A projection, not measured. Measured attainment is tracked on the Progress tab.</p>
              </div>
              <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-stat-onpace">
                <p className="text-[9.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">On-pace target</p>
                <p className="font-abridge text-3xl text-[#1A1A1A] mt-2 mb-1">{attainment.onPacePct}%</p>
                <p className="text-[10px] text-[#8C8C8C]">Where the plan expected this month</p>
              </div>
              <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-stat-runway">
                <p className="text-[9.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">Runway to goal</p>
                <p className="font-abridge text-3xl text-[#1A1A1A] mt-2 mb-1">{remainingMonths} mo</p>
                <p className="text-[10px] text-[#8C8C8C]">~{formatCompact(remainingMargin)} margin remaining</p>
              </div>
            </div>
          </motion.section>

          {/* ============ THE SCORECARD — the exact metrics chosen in Plan
              (metric -> baseline/target -> owner -> when). This is what the
              Progress tab measures against, so both tabs track one set. ============ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-white border border-[#E7E0D6] rounded-2xl shadow-sm p-8 md:p-10"
            data-testid="section-attain-checklist"
          >
            <div className="pb-5 mb-5 border-b border-[#F0ECE5]">
              <p className="text-[11px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">What You Will Measure</p>
              <h2 className="font-abridge text-[32px] text-[#1A1A1A]">The Scorecard</h2>
            </div>
            <p className="text-[15px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">
              These are the exact metrics you chose in your measurement plan, each with the baseline you started from,
              the target you set, an owner, and a rough date. This is the scorecard the Progress tab measures against,
              update by dated update.
            </p>

            {metricRows.length === 0 ? (
              <div className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4" data-testid="text-attain-plan-empty">
                <p className="text-[15px] text-[#3A3A3A] leading-relaxed">
                  No metrics are being tracked yet. Go back to your measurement plan and pick at least one metric to own.
                </p>
              </div>
            ) : goalDefs.length === 1 ? (
              <ScorecardTable rows={trackedByGoal[0]?.rows ?? []} testId="table-attain-scorecard" />
            ) : (
              <>
                {trackedByGoal.map(({ goal, rows }) => {
                  const g = GOAL_CATALOG[goal];
                  return (
                    <div key={goal} className="mb-8" data-testid={`group-attain-scorecard-${goal}`}>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span
                          className="inline-block text-[9px] font-bold uppercase tracking-[1.2px] text-white px-2 py-0.5 rounded-full"
                          style={{ background: g.pillBg }}
                        >
                          {g.pill}
                        </span>
                        <span className="text-[13px] font-bold text-[#1A1A1A]">{g.label}</span>
                      </div>
                      <ScorecardTable rows={rows} testId={`table-attain-scorecard-${goal}`} />
                    </div>
                  );
                })}
              </>
            )}
          </motion.section>

          {/* ============ THE PAYOFF — the combined value hero + the per-priority breakdown. The climax, not the opener. ============ */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-white border border-[#E7E0D6] rounded-2xl shadow-sm p-8 md:p-10"
            data-testid="section-attain-payoff"
          >
            <div className="pb-5 mb-5 border-b border-[#F0ECE5]">
              <p className="text-[11px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">What It's Worth</p>
              <h2 className="font-abridge text-[32px] text-[#1A1A1A]">The Payoff</h2>
            </div>
            <p className="text-[15px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">
              The starting point, the gap, and the scorecard all come down to this. Built the same way every figure on
              this plan was: from your own Align inputs, counted once.
            </p>

            {/* ONE combined headline number, full stop. Only when a plan
                actually holds 2+ priorities do we break that number out — as
                a row of compact per-priority cards below it, never a second
                copy of the same figure sitting right next to the first.
                When the plan also carries nursing quality, that number is the
                HARD contribution margin only — quality's cost-of-harm-avoided
                dollar is a soft, partially-attributed safety figure, so it is
                never folded into the number labeled "contribution margin".
                It gets its own count-first line below instead. */}
            <div className="bg-[#1A1A1A] rounded-lg p-8 md:p-10 mb-4" data-testid="card-attain-plan-combined-hero">
              {isQualityOnly ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[1.8px] text-white/55 mb-2">Harm events prevented per year</p>
                  <p className="font-abridge text-5xl md:text-6xl text-[#EA2C00]" data-testid="text-attain-plan-combined-value">
                    {qualityHeroCount}
                  </p>
                  <p className="text-[13px] text-white/50 mt-2">
                    Across 1 priority · {metricRows.length} metric{metricRows.length === 1 ? "" : "s"} tracked · lead with the count, not the dollar
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/10" data-testid="text-attain-plan-quality-soft">
                    <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/40 mb-1.5">
                      Safety value, not contribution margin
                    </p>
                    <p className="text-[11.5px] text-white/55 leading-relaxed max-w-[520px]" data-testid="text-attain-plan-quality-soft-dollar">
                      {qualitySoftDollarNote}
                    </p>
                  </div>
                </>
              ) : payoffLeadWithCount && singleGoal ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[1.8px] text-white/55 mb-2">{singleGoal.valueUnit.countNoun}</p>
                  <p className="font-abridge text-5xl md:text-6xl text-[#EA2C00]" data-testid="text-attain-plan-combined-value">
                    {formatCount(singleGoalCount)}
                  </p>
                  <p className="text-[13px] text-white/50 mt-2">
                    Worth about <b className="text-white/80">{formatCompact(singleGoalMargin)}</b> in contribution margin, counted once
                    {" · "}{metricRows.length} metric{metricRows.length === 1 ? "" : "s"} tracked
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[1.8px] text-white/55 mb-2">
                    {singleGoal?.valueUnit.heroIsDollar ? "Contribution margin captured" : "Combined contribution margin"}
                  </p>
                  <p className="font-abridge text-5xl md:text-6xl text-[#EA2C00]" data-testid="text-attain-plan-combined-value">
                    {isMultiGoalWithQuality
                      ? hardContributionMargin > 0
                        ? formatCompact(hardContributionMargin)
                        : "value pending"
                      : formatCompact(target.margin)}
                  </p>
                  <p className="text-[13px] text-white/50 mt-2">
                    Across {goalDefs.length} {goalDefs.length === 1 ? "priority" : "priorities"} · {metricRows.length} metric{metricRows.length === 1 ? "" : "s"} tracked
                    {isMultiGoalWithQuality ? ", nursing quality tracked separately below" : ""}
                  </p>

                  {isMultiGoalWithQuality && qualityPayoffModel && (
                    <div className="mt-4 pt-4 border-t border-white/10" data-testid="text-attain-plan-quality-soft">
                      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/40 mb-1.5">
                        Nursing quality · safety value, not contribution margin
                      </p>
                      <p className="text-[15px] font-semibold text-white" data-testid="text-attain-plan-quality-soft-count">
                        {qualityHeroCount}
                      </p>
                      <p className="text-[11.5px] text-white/55 mt-1 leading-relaxed max-w-[520px]" data-testid="text-attain-plan-quality-soft-dollar">
                        {qualitySoftDollarNote}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {goalDefs.length > 1 && (
              <div className="flex flex-wrap gap-3 mb-4" data-testid="grid-attain-plan-priority-breakdown">
                {goalDefs
                  .filter((g) => !isMultiGoalWithQuality || g.id !== "quality")
                  .map((g) => {
                    const goalMargin = combined.byGoal[g.id]?.totalMargin ?? 0;
                    const goalCountValue = combined.byGoal[g.id]?.totalCount ?? 0;
                    const shareBase = isMultiGoalWithQuality ? hardContributionMargin : target.margin;
                    const share = shareBase > 0 ? Math.round((goalMargin / shareBase) * 100) : 0;
                    return <PriorityBreakdownCard key={g.id} goalDef={g} margin={goalMargin} count={goalCountValue} share={share} />;
                  })}
              </div>
            )}

            <p className="text-[12.5px] text-[#B4B4B4] leading-relaxed max-w-[600px] border-t border-[#E5E5E5] pt-3">
              A value attainment plan is a shared commitment, co-authored at kickoff and steered monthly. Figures are
              illustrative and valued at contribution margin, and every priority's freed-time lever is counted once,
              never split across two goals' totals.
              {isMultiGoalWithQuality
                ? " Nursing quality's cost-of-harm-avoided dollar is a soft figure, attributed at a partial share, and is never counted in the contribution-margin total above."
                : ""}
            </p>
          </motion.section>

          {/* ============ HOW THIS WORKS — the deep methodology, tucked one click away ============ */}
          <HowThisWorksReveal priorityData={priorityData} setting={setting} freedTimeSplit={freedTimeSplit} />
        </>
      )}
    </div>
  );
}

/** Item (2) of Strategy's narrative arc — their operation today, then what
 * good looks like, for one priority. Rendered once per priority right after
 * the slim header and before "Closing the Gap", so the partner sees
 * themselves in the plan before any curve or number shows up. */
function StartingPointSection({
  goal,
  index,
  total,
  goalDef,
  content,
  committedLevers,
  goalMargin,
  goalCount,
  goalOwner,
  selectedLines,
  unitCount,
  unitLabel,
  outcomeMetric,
}: PriorityData & { unitCount: number; unitLabel: string; outcomeMetric?: TrackedMetric }) {
  const goalOwnerName = goalOwner?.name?.trim();
  const goalOwnerTitle = goalOwner?.title?.trim();
  const isRevenueHero = goalDef.valueUnit.heroIsDollar;
  const isQualityPriority = goal === "quality";
  // The scope card's footnote and the "Scoped to N" line below both read the
  // same unitCount, so they can never disagree the way the old hardcoded
  // "In scope 40" card did with a "Scoped to 50" footnote.
  const scopeFootnote =
    unitCount > 0
      ? selectedLines.length > 0
        ? `${unitLabel} · ${selectedLines.join(", ")}`
        : unitLabel
      : "Set on the Baseline step";

  return (
    <div
      className="mb-8 bg-white border border-[#E7E0D6] rounded-2xl shadow-sm p-8 md:p-10"
      data-testid={`section-attain-plan-priority-${goal}`}
    >
      <div className="flex items-center gap-3 mb-5">
        <span
          className="inline-block text-[10px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
          style={{ background: goalDef.pillBg }}
        >
          {goalDef.pill}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
          Priority {index + 1} of {total} · {goalDef.label}
        </p>
      </div>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid={`section-attain-starting-point-${goal}`}>
        <div className="pb-5 mb-5 border-b border-[#F0ECE5]">
          <p className="text-[11px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">Where You Are Today</p>
          <h2 className="font-abridge text-[32px] text-[#1A1A1A]">Your Starting Point</h2>
        </div>
        {/* The counterfactual, in their own numbers: where the outcome metric
            sits today versus where this plan takes it. Uses the partner's own
            baseline where the plan captured one, and labels a benchmark plainly
            when it did not, so a benchmark is never read as their measured
            number. */}
        {outcomeMetric && (
          <div
            className="mb-5 bg-[#F4F0EA] border border-[#E7E0D6] border-l-[3px] border-l-[#EA2C00] rounded-r-md p-4"
            data-testid={`banner-attain-counterfactual-${goal}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-2">Today vs this plan</p>
            <p className="text-[16.5px] leading-relaxed text-[#1A1A1A]">
              {outcomeMetric.label}:{" "}
              <b>{outcomeMetric.baselineText.replace(/\s*today\s*$/i, "").trim()}</b>
              {outcomeMetric.baselineTag === "benchmark" && (
                <span className="ml-1.5 text-[8px] font-bold uppercase tracking-[1px] text-[#8C8C8C] bg-white border border-[#E7E0D6] rounded-full px-1.5 py-0.5 align-middle">
                  Benchmark
                </span>
              )}{" "}
              today, <span className="text-[#EA2C00] font-semibold">{outcomeMetric.targetText}</span> on this plan.
            </p>
          </div>
        )}

        <p className="text-[13.5px] leading-relaxed text-[#8C8C8C] mb-5 max-w-[720px]">{content.p1Lead}</p>

        {/* The at-a-glance shape of the demand this priority is built
            against — kept front and center in the default view; the
            teaching prose about the opportunity and how it gets trapped now
            lives one click away, in "How this works". */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* The one derived card: the plan's real scope, from the partner's
              own inputs. No benchmark tag because it is their number, not a
              typical. */}
          <div
            className="flex-1 min-w-[150px] bg-[#F4F0EA] border border-[#E7E0D6] shadow-sm rounded-md p-4"
            data-testid={`card-attain-plan-world-${goal}-scope`}
          >
            <p className="text-[9.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">In scope</p>
            <p className="font-abridge text-3xl mt-2 mb-1 text-[#1A1A1A]">
              {unitCount > 0 ? unitCount.toLocaleString() : "Not set yet"}
            </p>
            <p className="text-[10px] text-[#8C8C8C]">{scopeFootnote}</p>
          </div>
          {/* The rest are industry benchmarks, each tagged so a benchmark is
              never read as the partner's own measured number. */}
          {content.worldCards.map((card, i) => (
            <div
              key={card.k}
              className="relative flex-1 min-w-[150px] bg-[#F4F0EA] border border-[#E7E0D6] shadow-sm rounded-md p-4"
              data-testid={`card-attain-plan-world-${goal}-${i}`}
            >
              {card.benchmark && (
                <span
                  className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-[1px] text-[#8C8C8C] bg-white border border-[#E7E0D6] rounded-full px-1.5 py-0.5"
                  data-testid={`tag-attain-plan-world-benchmark-${goal}-${i}`}
                >
                  Benchmark
                </span>
              )}
              <p className="text-[9.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C] pr-16">{card.k}</p>
              <p className={`font-abridge text-3xl mt-2 mb-1 ${card.coral ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
                {card.n}
              </p>
              <p className="text-[10px] text-[#8C8C8C]">{card.f}</p>
            </div>
          ))}
        </div>

        <p className="text-[16.5px] font-semibold text-[#1A1A1A] mb-3">{content.goodHead}</p>
        {/* Both figures come straight from the engine (`result`), never static
            copy. The concrete outcome leads (visits opened, departures avoided,
            overtime hours off the schedule, harm events prevented), in the
            goal's own named unit, and the dollar sits beside it as the
            translation. Revenue is the exception: the money IS the delivered
            work, so it leads. */}
        <div className="bg-[#1A1A1A] rounded-lg flex flex-wrap p-6 mb-2" data-testid={`card-attain-plan-goal-hero-${goal}`}>
          {isRevenueHero ? (
            <div className="flex-1 min-w-[200px] px-3">
              <p className="font-abridge text-4xl text-[#EA2C00]" data-testid={`text-attain-plan-goal-margin-${goal}`}>{formatCompact(goalMargin)}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[1.8px] text-white/55 mt-2">
                contribution margin on care already delivered, counted once
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-[140px] px-3">
                <p className="font-abridge text-4xl text-[#EA2C00]" data-testid={`text-attain-plan-goal-count-${goal}`}>{formatCount(goalCount)}</p>
                <p className="text-[9px] font-semibold uppercase tracking-[1.8px] text-white/55 mt-2">{goalDef.valueUnit.countNoun}</p>
              </div>
              <div className="flex-1 min-w-[140px] px-3">
                <p className="font-abridge text-4xl text-white" data-testid={`text-attain-plan-goal-margin-${goal}`}>{formatCompact(goalMargin)}</p>
                <p className="text-[9px] font-semibold uppercase tracking-[1.8px] text-white/55 mt-2">
                  {isQualityPriority ? "cost & harm avoided, a soft safety figure" : "contribution margin, this priority"}
                </p>
              </div>
            </>
          )}
        </div>
        <p className="text-[11px] text-[#8C8C8C]">
          Scoped to {unitCount.toLocaleString()} {unitLabel}, built from {committedLevers.length} committed
          decision{committedLevers.length === 1 ? "" : "s"} in this priority.
        </p>
        {(goalOwnerName || goalOwnerTitle) && (
          <p className="text-[11px] text-[#8C8C8C] mt-1" data-testid={`text-attain-plan-goal-owner-${goal}`}>
            Outcome owner: <b className="text-[#3A3A3A]">{[goalOwnerName, goalOwnerTitle].filter(Boolean).join(" · ")}</b>
          </p>
        )}
      </motion.section>
    </div>
  );
}

/** The "How this works" progressive disclosure (Change 1) — the 7-link value
 * chain table and the hardest-link mechanisms (plus the cadence that steers
 * them) tucked one click away, so the default read stays tight and
 * scannable while the full depth is still here for whoever wants it. One
 * toggle for the whole plan; every committed priority renders inside it. */
function HowThisWorksReveal({
  priorityData,
  setting,
  freedTimeSplit,
}: {
  priorityData: PriorityData[];
  setting: AttainSetting;
  freedTimeSplit: number;
}) {
  const [open, setOpen] = useState(false);
  if (priorityData.length === 0) return null;

  return (
    <section className="mb-10 pt-8 border-t border-[#E7E0D6]" data-testid="section-attain-how-it-works">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 group"
        data-testid="button-attain-how-it-works-toggle"
      >
        <span className="font-abridge text-2xl text-[#1A1A1A] group-hover:text-[#EA2C00]">How this works</span>
        {open ? <ChevronUp className="w-5 h-5 text-[#8C8C8C]" /> : <ChevronDown className="w-5 h-5 text-[#8C8C8C]" />}
      </button>
      <p className="text-[13px] text-[#8C8C8C] mt-2 max-w-[640px]">
        The seven-link value chain behind each priority's number, the hardest link to hold, and the monthly cadence
        that keeps it on track. Same math as the plan above, one click deeper.
      </p>

      {open && (
        <div className="mt-8" data-testid="panel-attain-how-it-works">
          {priorityData.map((d) => (
            <PriorityMechanics key={d.goal} {...d} setting={setting} freedTimeSplit={freedTimeSplit} />
          ))}
        </div>
      )}
    </section>
  );
}

/** The deep methodology for one priority, tucked inside "How this works":
 * the Value Chain (the seven links, who typically holds them, the fragile
 * middle), the Hardest Link (its mechanisms, the split, the freed-hour bar),
 * and the Cadence (the bends, the monthly check, who owns what, at
 * renewal). Content is unchanged from before Change 1 - only its position
 * (behind the reveal, not in the default scroll) moved. */
function PriorityMechanics({
  goal,
  index,
  total,
  goalDef,
  content,
  committedLevers,
  isFreedTimeGoal,
  barAcc,
  setting,
  freedTimeSplit,
}: PriorityData & { setting: AttainSetting; freedTimeSplit: number }) {
  return (
    <div className="mb-16 last:mb-0" data-testid={`section-attain-how-it-works-priority-${goal}`}>
      <div className="flex items-center gap-3 mb-6">
        <span
          className="inline-block text-[10px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
          style={{ background: goalDef.pillBg }}
        >
          {goalDef.pill}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
          Priority {index + 1} of {total} · {goalDef.label}
        </p>
      </div>

      {/* ============ The opportunity, and how it gets trapped — moved
          here from the main Strategy scroll (Change: at-a-glance rework) so
          the default view stays scannable while this reasoning stays one
          click away. Content unchanged. ============ */}
      <div className="bg-[#F4F0EA] border border-[#E7E0D6] border-l-[3px] border-l-[#EA2C00] shadow-sm rounded-r-md p-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1.5">The opportunity, in one line</p>
        <p className="text-[15px] text-[#3A3A3A] leading-relaxed">{content.opportunity}</p>
      </div>

      <div className="mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">{content.trappedLabel}</p>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {content.trappedSteps.map((step, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-[11px] px-3 py-2 rounded-md bg-[#F4F0EA] border border-[#E7E0D6] text-[#3A3A3A]">{step}</span>
              {i < content.trappedSteps.length - 1 && <span className="text-[#B4B4B4]">→</span>}
            </span>
          ))}
        </div>
        <p className="text-[11.5px] text-[#3A3A3A] leading-relaxed">{content.trappedCap}</p>
      </div>

      {/* ============ The Value Chain ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid={`section-attain-chain-${goal}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-block text-[10px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full" style={{ background: goalDef.pillBg }}>
            {goalDef.pill}
          </span>
          <span className="text-xs text-[#8C8C8C]">{goalDef.domainSub}</span>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1 mt-3">The Value Chain</p>
        <h2 className="font-abridge text-[32px] text-[#1A1A1A] mb-4">
          {goalDef.chainTitle} <span className="text-[#EA2C00]">{goalDef.chainArrow === "↑" ? "↗" : "↘"}</span>
        </h2>
        <p className="text-[15px] leading-relaxed text-[#3A3A3A] mb-4 max-w-[720px]">
          {goalDef.label} is the end of a chain of links that must all fire. Abridge does the heavy lifting on the first two,
          and the last two are the readout. <b className="text-[#1A1A1A]">Value leaks in the fragile middle, and
          every link there is owned by you.</b> This is the map the decisions on this plan are steering.
        </p>

        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C] mb-2">How value moves through the chain</p>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {goalDef.flow.map((f, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className={`text-[11px] px-3 py-1.5 rounded-md border whitespace-nowrap ${FLOW_CLASS[f.kind]}`}>{f.label}</span>
              {i < goalDef.flow.length - 1 && <span className="text-[#B4B4B4] text-xs">→</span>}
            </span>
          ))}
        </div>

        <hr className="border-t border-[#E7E0D6] mb-5" />

        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8C8C8C] mb-2">The seven links and who typically holds them</p>
        <div className="overflow-x-auto mb-5">
          <table className="w-full text-left border-collapse" data-testid={`table-attain-plan-chain-${goal}`}>
            <thead>
              <tr>
                <th className="text-[9.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Link</th>
                <th className="text-[9.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6] text-right">Typically owned by</th>
              </tr>
            </thead>
            <tbody>
              {goalDef.chain.map((link) => (
                <tr key={link.n} className={link.fragile ? "shadow-[inset_3px_0_0_#EA2C00]" : ""} data-testid={`row-attain-plan-chain-${goal}-${link.n}`}>
                  <td className="py-2 px-2 border-b border-[#F0ECE5] align-top">
                    <p className="text-[12.5px] font-bold text-[#1A1A1A]">{link.n} · {link.name}</p>
                    <p className="text-[10.5px] text-[#8C8C8C] mt-0.5">{link.signal}</p>
                  </td>
                  <td className="py-2 px-2 border-b border-[#F0ECE5] align-top text-[11px] text-[#3A3A3A] text-right">
                    {link.ownerRole}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[#F4F0EA] border border-[#E7E0D6] border-l-[3px] border-l-[#EA2C00] shadow-sm rounded-r-md p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1.5">The fragile middle</p>
          <p className="text-[15px] text-[#3A3A3A] leading-relaxed">{content.fragile}</p>
          <p className="text-[11px] text-[#8C8C8C] mt-2">
            {committedLevers.length} of {leversFor(goal, setting).length} available decisions committed to this priority today.
          </p>
        </div>
      </motion.section>

      {/* ============ The Hardest Link ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid={`section-attain-hardest-link-${goal}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">The Hardest Link</p>
        <h2 className="font-abridge text-[32px] text-[#1A1A1A] mb-4">
          {content.hardestTitle} <span className="text-[#EA2C00]">{content.hardestArrow === "↑" ? "↗" : "↘"}</span>
        </h2>
        <p className="text-[15px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">{content.hardestLead}</p>

        <div className="flex flex-col gap-3 mb-6">
          {goalDef.mechanisms.map((m, i) => (
            <div key={i} className="bg-[#F8F5F1] border border-[#E7E0D6] rounded-md p-4">
              <p className="text-[12.5px] font-bold text-[#1A1A1A] mb-1">
                <span className="font-abridge text-[#EA2C00] mr-2">{String(i + 1).padStart(2, "0")}</span>
                {m.heading}
              </p>
              <p className="text-[11.5px] leading-relaxed text-[#3A3A3A]">{m.body}</p>
            </div>
          ))}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">{content.splitLabel}</p>
        <div className="flex flex-wrap gap-3 mb-3">
          <div className="flex-1 min-w-[220px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#8C8C8C]">{content.splitLeft[0]}</p>
            <p className="text-[11px] leading-relaxed text-[#3A3A3A] mt-1.5">{content.splitLeft[1]}</p>
          </div>
          <div className="flex-1 min-w-[220px] border border-[#F3C9BE] bg-[#FFF6F3] rounded-md p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00]">{content.splitRight[0]}</p>
            <p className="text-[11px] leading-relaxed text-[#3A3A3A] mt-1.5">{content.splitRight[1]}</p>
          </div>
        </div>
        <p className="text-[11.5px] leading-relaxed text-[#3A3A3A] mb-6">{content.splitCloser}</p>

        <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">
          {isFreedTimeGoal ? "Where the freed hour is going, per your split" : content.barHead}
        </p>
        <div className="relative mb-2">
          <div className="flex h-8 rounded-md overflow-hidden">
            <div className="bg-[#EA2C00]" style={{ width: `${barAcc}%` }} />
            <div className="bg-[#E4DCD0]" style={{ width: `${100 - barAcc}%` }} />
          </div>
          {!isFreedTimeGoal && (
            <div className="absolute top-[-6px] bottom-[-6px] w-[2px] bg-[#1A1A1A]" style={{ left: `${content.barTarget}%` }}>
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8.5px] font-bold text-[#1A1A1A] whitespace-nowrap">
                Target · {content.barTarget}%
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-between text-[10.5px] text-[#8C8C8C] mt-3">
          <span><b className="text-[#1A1A1A]">{barAcc}%</b> {content.barAccLbl}</span>
          <span><b className="text-[#1A1A1A]">{100 - barAcc}%</b> {content.barRelLbl}</span>
        </div>
        {isFreedTimeGoal && (
          <p className="text-[11px] text-[#8C8C8C] mt-2" data-testid={`text-attain-plan-freed-time-live-${goal}`}>
            This reflects the live freed-time split from Align, {freedTimeSplit}% to access.
          </p>
        )}
      </motion.section>

      {/* ============ The Cadence ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14 last:mb-0" data-testid={`section-attain-cadence-${goal}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">How This Gets Steered</p>
        <h2 className="font-abridge text-[32px] text-[#1A1A1A] mb-4">The Cadence, {goalDef.label}</h2>
        <p className="text-[15px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">{content.bendsLead}</p>

        <div className="flex flex-col gap-3 mb-6">
          {content.bends.map((b, i) => (
            <div key={i} className="flex gap-3 items-baseline">
              <span className="font-abridge text-[#EA2C00] text-lg min-w-[24px]">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[15px] leading-relaxed text-[#3A3A3A]">{b}</span>
            </div>
          ))}
        </div>
        <p className="text-[11.5px] leading-relaxed text-[#3A3A3A] mb-6">{content.bendsCloser}</p>

        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">The monthly check</p>
          <p className="text-[12.5px] leading-relaxed text-[#3A3A3A] mb-3">
            Same five questions every month. Five minutes. This is what catches a slipping decision before it becomes
            a lost quarter.
          </p>
          <div className="flex flex-col gap-3">
            {content.monthly.map((q, i) => (
              <div key={i} className="flex gap-3 items-baseline">
                <span className="font-abridge text-[#EA2C00] text-lg min-w-[24px]">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[15px] leading-relaxed text-[#3A3A3A]">{q}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">Who owns what</p>
          <div className="flex flex-wrap gap-3">
            {committedLevers.map(({ lever, owner, due }) => (
              <div key={lever.id} className="flex-1 min-w-[150px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-3" data-testid={`card-attain-owner-${goal}-${lever.id}`}>
                <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">{lever.label}</p>
                <p className="text-[12.5px] font-bold text-[#1A1A1A] mt-1">{owner}</p>
                <p className="text-[10px] text-[#8C8C8C]">{due}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#F4F0EA] border border-[#E7E0D6] border-l-[3px] border-l-[#EA2C00] shadow-sm rounded-r-md p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1.5">At renewal</p>
          <p className="text-[15px] text-[#1A1A1A] leading-relaxed">{content.renewal}</p>
        </div>
      </motion.section>
    </div>
  );
}
