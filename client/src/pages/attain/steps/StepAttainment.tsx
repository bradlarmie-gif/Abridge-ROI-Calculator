import { useState, useEffect } from "react";
import { Download, Save, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/NumberField";
import AttainmentCurve, { USUAL_CEILING_PCT } from "@/components/attain/AttainmentCurve";
import {
  leversFor,
  defaultLeverValues,
  type Lever,
  type LeverValues,
  type LeverContribution,
  type MultiGoalContributionsResult,
  type RealizationByGoal,
} from "@/lib/attain/attainLevers";
import {
  leverNumericValue,
  decisionAttainmentFraction,
  decisionStatus,
  computeProgressAttainmentPct,
  parseSignalBaseline,
  perSignalWorth,
  latestEntry,
  currentValueFromEntries,
  nextCheckDueDate,
  computeActualTrajectory,
  computeSparklineGeometry,
  todayISODate,
  type AttainmentStatus,
  type ProgressEntry,
  type DecisionProgressInput,
  type SignalProgressInput,
} from "@/lib/attain/attainProgress";
import { GOAL_CATALOG, getContent } from "@/lib/attain/attainGoals";
import type { AttainState, AttainSetting, GoalId, GoalDef, SettingGoalContent } from "@/lib/attain/attainTypes";
import type { GoalTargetResult, AttainmentResult } from "@/lib/attain/attainCalc";
import { defaultCommitmentFor, type Commitment, type GoalOwner, type SignalCadence } from "./StepCommit";
import { generateAttainPdf } from "@/lib/attain/attain-pdf";

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
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
      className={`inline-block text-[8.5px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLE[status]}`}
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
 * The decisions checklist, as one clean table — extracted so a multi-priority
 * plan can render one of these per priority (grouped, Change 1) while a
 * single-priority plan still gets exactly one, with no repeated "Priority"
 * column that was mostly blank alignment noise before.
 */
function DecisionsTable({
  rows,
  testId,
}: {
  rows: Array<CommittedLever & { goal: GoalId }>;
  testId: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse" data-testid={testId}>
        <thead>
          <tr>
            <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Decision</th>
            <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Owner</th>
            <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">By when</th>
            <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6] text-right">Worth</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ goal, lever, contribution, owner, due }) => (
            <tr key={`${goal}:${lever.id}`} data-testid={`row-attain-plan-decision-${goal}-${lever.id}`}>
              <td className="py-3 px-2 border-b border-[#F0ECE5] align-top max-w-[320px]">
                <p className="text-[11px] font-bold text-[#1A1A1A]">{lever.label}</p>
                <p className="text-[9.5px] text-[#8C8C8C] mt-0.5 leading-relaxed">{lever.help}</p>
              </td>
              <td className="py-3 px-2 border-b border-[#F0ECE5] align-top text-[10.5px] text-[#3A3A3A] whitespace-nowrap">{owner}</td>
              <td className="py-3 px-2 border-b border-[#F0ECE5] align-top text-[10.5px] text-[#3A3A3A] whitespace-nowrap">{due}</td>
              <td className="py-3 px-2 border-b border-[#F0ECE5] align-top text-right whitespace-nowrap">
                {/* Fine to show per-decision here, but never sum marginalMargin across a chain; use the chain's totalMargin. */}
                <p className="text-[11px] font-bold text-[#EA2C00]">{formatCompact(contribution?.marginalMargin ?? 0)}</p>
                <p className="text-[9px] text-[#8C8C8C]">{Math.round((contribution?.pctOfTotal ?? 0) * 100)}% of its priority</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One priority's card in the "value by domain" composition (Change 1) —
 * only rendered when a plan has 2+ priorities, so a single-priority plan
 * never shows this alongside the combined headline it would just repeat.
 */
function PriorityBreakdownCard({ goalDef, margin, share }: { goalDef: GoalDef; margin: number; share: number }) {
  return (
    <div className="flex-1 min-w-[150px] bg-[#F8F5F1] border border-[#E7E0D6] rounded-md p-4" data-testid={`card-attain-plan-priority-${goalDef.id}`}>
      <span
        className="inline-block text-[8px] font-bold uppercase tracking-[1.2px] text-white px-2 py-0.5 rounded-full mb-2.5"
        style={{ background: goalDef.pillBg }}
      >
        {goalDef.pill}
      </span>
      <p className="font-abridge text-2xl text-[#1A1A1A]" data-testid={`text-attain-plan-priority-value-${goalDef.id}`}>
        {formatCompact(margin)}
      </p>
      <p className="text-[9px] text-[#8C8C8C] mt-1">
        <b className="text-[#3A3A3A]">{share}%</b> of combined · {goalDef.label}
      </p>
    </div>
  );
}

/** A signal's baseline -> ... -> current sparkline, scaled against its own
 * target so the line's rise (or fall) toward the reference line reads at a
 * glance. Bespoke inline SVG, not a chart-library default — geometry comes
 * from the tested `computeSparklineGeometry` helper. */
function SignalSparkline({ entries, target }: { entries: ProgressEntry[]; target: number }) {
  const W = 96;
  const H = 28;
  const values = entries.map((e) => e.value);
  const geo = computeSparklineGeometry(values, target, W, H);
  if (geo.points.length === 0) return null;
  const path = geo.points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const last = geo.points[geo.points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} data-testid="svg-attain-signal-sparkline">
      <line x1={0} y1={geo.targetY} x2={W} y2={geo.targetY} stroke="#D8CFC4" strokeWidth={1} strokeDasharray="2 2" />
      <path d={path} fill="none" stroke="#EA2C00" strokeWidth={1.75} />
      {geo.points.slice(0, -1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.75} fill="#fff" stroke="#EA2C00" strokeWidth={1.25} />
      ))}
      <circle cx={last.x} cy={last.y} r={2.75} fill="#EA2C00" />
    </svg>
  );
}

/** The dated, expandable history list under a signal — "how it moved and
 * why", most recent first. */
function SignalHistoryList({ entries, unit }: { entries: ProgressEntry[]; unit: string }) {
  const reversed = [...entries].reverse();
  return (
    <div className="mt-2 space-y-1.5" data-testid="list-attain-signal-history">
      {reversed.map((e, i) => (
        <div key={i} className="flex items-baseline gap-3 text-[10px]">
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

/** One signal's row inside a decision's progress card: the baseline -> current
 * -> target track, its trend, when it was last checked and when it's due
 * again, the "Log an update" action (the "and then what" after typing a
 * number), and its own expandable dated history. */
function SignalProgressRow({
  signalKey,
  signalLabel,
  unit,
  cadence,
  baseline,
  target,
  entries,
  onLogProgressUpdate,
}: {
  signalKey: string;
  signalLabel: string;
  unit: string;
  cadence: SignalCadence;
  baseline: number;
  target: number;
  entries: ProgressEntry[];
  onLogProgressUpdate: (signalKey: string, value: number, note?: string) => void;
}) {
  const current = currentValueFromEntries(entries, baseline);
  const [loggingOpen, setLoggingOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(current);
  const [draftNote, setDraftNote] = useState("");

  useEffect(() => {
    if (!loggingOpen) setDraftValue(current);
  }, [current, loggingOpen]);

  const fraction = decisionAttainmentFraction(baseline, current, target);
  const status = decisionStatus(fraction);
  const last = latestEntry(entries);
  const nextDue = last ? nextCheckDueDate(last.date, cadence) : undefined;
  const isOverdue = !!nextDue && nextDue < todayISODate();

  function handleSave() {
    onLogProgressUpdate(signalKey, draftValue, draftNote);
    setDraftNote("");
    setLoggingOpen(false);
  }

  return (
    <div className="border-t border-[#F0ECE5] pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0" data-testid={`row-attain-progress-signal-${signalKey}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold text-[#1A1A1A]">{signalLabel}</p>
          <p className="text-[9px] text-[#8C8C8C] capitalize">Checked {cadence}</p>
        </div>
        <StatusPill status={status} testId={`badge-attain-progress-status-${signalKey}`} />
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-2.5">
        <div className="flex items-baseline gap-2 text-[10.5px] whitespace-nowrap">
          <span className="text-[#8C8C8C]">{baseline.toLocaleString()}</span>
          <span className="text-[#B4B4B4]">&rarr;</span>
          <span className="font-abridge text-lg text-[#EA2C00]" data-testid={`text-attain-progress-current-${signalKey}`}>
            {current.toLocaleString()}
          </span>
          <span className="text-[#B4B4B4]">&rarr;</span>
          <span className="font-semibold text-[#1A1A1A]">{target.toLocaleString()}</span>
          <span className="text-[#8C8C8C]">{unit}</span>
        </div>
        <SignalSparkline entries={entries} target={target} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[9.5px] text-[#8C8C8C]">
        <span data-testid={`text-attain-progress-last-updated-${signalKey}`}>Last logged {formatDate(last?.date)}</span>
        <span className={isOverdue ? "text-[#EA2C00] font-semibold" : ""} data-testid={`text-attain-progress-next-due-${signalKey}`}>
          Next check due {formatDate(nextDue)}
          {isOverdue ? " · overdue" : ""}
        </span>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="flex items-center gap-1 font-semibold text-[#1A1A1A] hover:text-[#EA2C00]"
          data-testid={`button-attain-progress-history-toggle-${signalKey}`}
        >
          {entries.length} logged entr{entries.length === 1 ? "y" : "ies"}
          {historyOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {!loggingOpen && (
          <button
            type="button"
            onClick={() => setLoggingOpen(true)}
            className="text-[#EA2C00] font-semibold hover:underline"
            data-testid={`button-attain-progress-log-open-${signalKey}`}
          >
            + Log an update
          </button>
        )}
      </div>

      {historyOpen && <SignalHistoryList entries={entries} unit={unit} />}

      {loggingOpen && (
        <div className="mt-3 bg-[#F8F5F1] border border-[#E7E0D6] rounded-md p-3" data-testid={`form-attain-progress-log-${signalKey}`}>
          <div className="flex flex-wrap items-end gap-2.5">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">New value ({unit})</p>
              <NumberField
                value={draftValue}
                onValueChange={setDraftValue}
                min={0}
                className="h-9 w-24 rounded-md border border-[#D8CFC4] bg-white px-2 text-xs text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                data-testid={`input-attain-progress-log-value-${signalKey}`}
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">What changed (optional)</p>
              <input
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder="e.g., new EHR order set went live"
                className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                data-testid={`input-attain-progress-log-note-${signalKey}`}
              />
            </div>
            <Button
              onClick={handleSave}
              className="h-9 px-4 bg-[#EA2C00] hover:bg-[#D42600] text-white text-xs"
              data-testid={`button-attain-progress-log-save-${signalKey}`}
            >
              Save
            </Button>
            <button
              type="button"
              onClick={() => setLoggingOpen(false)}
              className="h-9 px-2 text-xs text-[#8C8C8C] hover:text-[#1A1A1A]"
              data-testid={`button-attain-progress-log-cancel-${signalKey}`}
            >
              Cancel
            </button>
          </div>
          <p className="text-[9px] text-[#B4B4B4] mt-2">Dated today, {formatDate(todayISODate())}, and added to this signal's history below.</p>
        </div>
      )}
    </div>
  );
}

interface ProgressSignalRowData {
  key: string;
  decisionKey: string;
  goal: GoalId;
  lever: Lever;
  owner: string;
  due: string;
  signalLabel: string;
  unit: string;
  cadence: SignalCadence;
  baseline: number;
  target: number;
  worth: number;
  entries: ProgressEntry[];
  current: number;
}

/** One committed decision's card on the Progress tab: the decision, its
 * owner, every signal it watches (each with its own baseline -> current ->
 * target track, trend, and Log-update action), rolled up to one status. A
 * decision only reads as "Landed" once EVERY signal it watches has - a
 * decision with two signals, one landed and one still moving, is honestly
 * "In motion", not landed on the strength of its easier signal alone. */
function DecisionProgressCard({
  rows,
  showPriority,
  goalDef,
  onLogProgressUpdate,
}: {
  rows: ProgressSignalRowData[];
  showPriority: boolean;
  goalDef: GoalDef;
  onLogProgressUpdate: (signalKey: string, value: number, note?: string) => void;
}) {
  const first = rows[0];
  const fractions = rows.map((r) => decisionAttainmentFraction(r.baseline, r.current, r.target));
  const minFraction = Math.min(...fractions);
  const status = decisionStatus(minFraction);

  return (
    <div className="border border-[#E7E0D6] rounded-lg bg-white p-4 mb-3" data-testid={`card-attain-progress-decision-${first.decisionKey}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {showPriority && (
              <span
                className="inline-block text-[8px] font-bold uppercase tracking-[1.2px] text-white px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: goalDef.pillBg }}
              >
                {goalDef.pill}
              </span>
            )}
            <p className="text-[12.5px] font-bold text-[#1A1A1A]">{first.lever.label}</p>
          </div>
          <p className="text-[10px] text-[#8C8C8C]">
            {first.owner} · due {first.due}
          </p>
        </div>
        <StatusPill status={status} testId={`badge-attain-progress-decision-status-${first.decisionKey}`} />
      </div>

      <div>
        {rows.map((row) => (
          <SignalProgressRow
            key={row.key}
            signalKey={row.key}
            signalLabel={row.signalLabel}
            unit={row.unit}
            cadence={row.cadence}
            baseline={row.baseline}
            target={row.target}
            entries={row.entries}
            onLogProgressUpdate={onLogProgressUpdate}
          />
        ))}
      </div>
    </div>
  );
}

interface StepAttainmentProps {
  state: AttainState;
  setting: AttainSetting;
  goals: GoalId[];
  target: GoalTargetResult;
  attainment: AttainmentResult;
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult;
  commitments: Record<string, Commitment>;
  goalOwnerByPriority: Partial<Record<GoalId, GoalOwner>>;
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
  target,
  attainment,
  valuesByGoal,
  combined,
  commitments,
  goalOwnerByPriority,
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

  // ED access does not compete with retention for the same freed hour - see
  // attainLevers.ts's computeMultiGoalContributions and
  // attainEdAccess.ts's module header - so this conflict is outpatient-only.
  const hasFreedTimeConflict = setting === "outpatient" && goals.includes("access") && goals.includes("retention");
  const usualMargin = target.margin * (USUAL_CEILING_PCT / 100);
  const curveGoalLabel = `${formatCompact(target.margin)} · ${target.label}`;
  const curveUsualLabel = `~${formatCompact(usualMargin)}`;
  const remainingMonths = Math.max(0, state.totalMonths - state.monthsElapsed);
  const remainingMargin = Math.max(0, target.margin - attainment.marginToDate);
  const unitLabel = UNIT_LABEL[setting] ?? "units";

  // Every committed decision, per goal, sourced live from the same combined
  // engine result that built the total above — nothing here is invented.
  const allCommitted = goals.flatMap((goal) => {
    const values = valuesByGoal[goal] ?? defaultLeverValues(goal, setting);
    const result = combined.byGoal[goal];
    return committedLeversFor(goal, setting, values, result?.perLever, commitments).map((c) => ({ ...c, goal }));
  }).sort((a, b) => (b.contribution?.marginalMargin ?? 0) - (a.contribution?.marginalMargin ?? 0));

  // The Progress tab's per-SIGNAL rows, now sourced from each signal's dated
  // log (Change 2) rather than one editable "current" field. `current` is
  // always the latest logged entry (or the baseline itself, before the
  // seeding effect in AttainFlow has had a chance to run once on mount —
  // see the fallback below, which matches what that effect would seed).
  const progressRows: ProgressSignalRowData[] = allCommitted.flatMap(({ goal, lever, contribution, owner, due }) => {
    const key = `${goal}:${lever.id}`;
    const commitment = commitments[key] ?? defaultCommitmentFor(goal, lever, setting);
    const chosenValue = (valuesByGoal[goal] ?? defaultLeverValues(goal, setting))[lever.id];
    const targetValue = leverNumericValue(chosenValue);
    // Per-decision only, for splitting across its own signals below — never sum marginalMargin across a chain; use the chain's totalMargin.
    const worthTotal = Math.max(0, contribution?.marginalMargin ?? 0);
    const signals = commitment.signals.length > 0 ? commitment.signals : defaultCommitmentFor(goal, lever, setting).signals;
    const worthPerSignal = perSignalWorth(worthTotal, signals.length);
    return signals.map((sig) => {
      const signalKey = `${key}:${sig.id}`;
      const baseline = parseSignalBaseline(sig.baseline);
      const entries = progressEntries[signalKey] ?? [{ date: todayISODate(), value: baseline }];
      return {
        key: signalKey,
        decisionKey: key,
        goal,
        lever,
        owner,
        due,
        signalLabel: sig.label.trim() || lever.signal,
        unit: sig.unit.trim() || lever.unit,
        cadence: sig.cadence,
        baseline,
        target: targetValue,
        worth: worthPerSignal,
        entries,
        current: currentValueFromEntries(entries, baseline),
      };
    });
  });

  const progressDecisionInputs: DecisionProgressInput[] = progressRows.map((r) => ({
    key: r.key,
    baseline: r.baseline,
    current: r.current,
    target: r.target,
    worth: r.worth,
  }));
  const progressPct = computeProgressAttainmentPct(progressDecisionInputs);

  // The REAL, dated climb this plan has actually made — every signal's log,
  // carried forward date by date, weighted by worth exactly like the percent
  // above. This is what the curve plots below; it is never a synthetic
  // 3-point line on the Progress tab.
  const trajectorySignals: SignalProgressInput[] = progressRows.map((r) => ({
    key: r.key,
    baseline: r.baseline,
    target: r.target,
    worth: r.worth,
    entries: r.entries,
  }));
  const trajectory = computeActualTrajectory(trajectorySignals, todayISODate());
  const trajectoryPct = trajectory.length > 0 ? trajectory[trajectory.length - 1].pct : progressPct;

  // Signal rows grouped back into one card per DECISION (Change 2) — a
  // decision with two signals reads as one card watching two things, not
  // two unrelated rows.
  const decisionKeysOrdered = Array.from(new Set(progressRows.map((r) => r.decisionKey)));
  const decisionCards = decisionKeysOrdered.map((decisionKey) => ({
    decisionKey,
    rows: progressRows.filter((r) => r.decisionKey === decisionKey),
  }));

  const goalDefs = goals.map((g) => GOAL_CATALOG[g]);
  const planTitle = goalDefs.length === 1 ? goalDefs[0].label : goalDefs.map((g) => g.label).join(" + ");

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
            <p className="text-[11px] text-white/70 leading-relaxed mb-2">
              A shareable link is copied to your clipboard. Open it anytime, on any device, to pick up exactly where
              you left off, decisions, commitments, and progress history included.
            </p>
            <p
              className="text-[10px] text-white/90 font-mono bg-white/10 rounded px-2 py-1.5 break-all"
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
          <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">Where This Stands</p>
          <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">Progress</h2>
          <p className="text-[13px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">
            This is the surface to come back to. On a cadence, log the real number for each signal below — the date
            stamps itself, the trend and the curve climb with it, and the history builds a dated record for the next
            review. Nothing here is projected. It only moves when someone logs that something actually moved.
          </p>

          {progressRows.length === 0 ? (
            <div className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4" data-testid="text-attain-progress-empty">
              <p className="text-xs text-[#3A3A3A] leading-relaxed">
                No decisions are committed yet. Go back to Commit and give at least one decision an owner and a date.
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
                usualLabel={curveUsualLabel}
                startLabel="Committed"
                actualPoints={trajectory}
              />

              <div className="flex flex-wrap gap-3 my-6">
                <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-progress-stat-attainment">
                  <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">Attainment, from real progress</p>
                  <p className="font-abridge text-2xl text-[#EA2C00] mt-2 mb-1" data-testid="text-attain-progress-pct">{progressPct}%</p>
                  <p className="text-[9px] text-[#8C8C8C]">Weighted by each decision's worth</p>
                </div>
                <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-progress-stat-onpace">
                  <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">On-pace target</p>
                  <p className="font-abridge text-2xl text-[#1A1A1A] mt-2 mb-1">{attainment.onPacePct}%</p>
                  <p className="text-[9px] text-[#8C8C8C]">Where the plan expected this month</p>
                </div>
              </div>

              <div data-testid="list-attain-progress-decisions">
                {decisionCards.map(({ decisionKey, rows }) => (
                  <DecisionProgressCard
                    key={decisionKey}
                    rows={rows}
                    showPriority={goalDefs.length > 1}
                    goalDef={GOAL_CATALOG[rows[0].goal]}
                    onLogProgressUpdate={onLogProgressUpdate}
                  />
                ))}
              </div>
            </>
          )}

          <p className="text-[10px] text-[#B4B4B4] leading-relaxed max-w-[600px] mt-6 border-t border-[#E5E5E5] pt-3">
            {/* Persistence note: Save writes this history into a shareable
                link and a local draft (see attainUrlState.ts). That covers
                "come back to this on this device, or from the link" - a real
                account tied to this organization, editable from any device
                without the link, is a future backend layer. */}
            Click Save above to copy a link back to this exact history, decisions included. Reopening that link,
            on this device or any other, picks this plan up exactly where it stands today.
          </p>
        </motion.section>
      )}

      {tab === "strategy" && (
        <>
          {/* ============ SECTION 1 · COVER SUMMARY (combined) ============ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid="section-attain-cover">
            <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#8C8C8C] mb-2">Attainment</p>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {goalDefs.map((g) => (
                <span
                  key={g.id}
                  className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
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
            <p className="text-base text-[#8C8C8C] mb-4">
              {goalDefs.length === 1 ? getContent(setting, goals[0])?.subtitle : `${goalDefs.length} priorities, one combined plan`}
            </p>
            <p className="text-[15px] leading-relaxed text-[#3A3A3A] max-w-[560px] mb-6">
              One plan, built from every decision you moved across{" "}
              <b className="text-[#EA2C00]">{goalDefs.map((g) => g.label).join(", ")}</b>. Every dollar below rolls up
              from the same engine, counted once.
            </p>

            <div className="flex flex-wrap gap-6 mb-6">
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[2.5px] text-[#B4B4B4] mb-1">Prepared for</p>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="text-[15px] font-bold text-[#1A1A1A] bg-transparent border-b border-dashed border-[#D8CFC4] focus:border-[#EA2C00] outline-none"
                  data-testid="input-attain-org-name"
                />
              </div>
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[2.5px] text-[#B4B4B4] mb-1">Prepared by</p>
                <p className="text-[15px] text-[#3A3A3A]">Abridge Partner Success · {today}</p>
              </div>
              <div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[2.5px] text-[#B4B4B4] mb-1">Horizon</p>
                <p className="text-[15px] text-[#3A3A3A]">{state.totalMonths} months · {allCommitted.length} decisions committed</p>
              </div>
            </div>

            {/* ONE combined headline number, full stop. Only when a plan
                actually holds 2+ priorities do we break that number out — as
                a row of compact per-priority cards below it, never a second
                copy of the same figure sitting right next to the first. */}
            <div className="bg-[#1A1A1A] rounded-lg p-6 md:p-8 mb-4" data-testid="card-attain-plan-combined-hero">
              <p className="text-[9px] font-semibold uppercase tracking-[1.8px] text-white/55 mb-2">Combined contribution margin</p>
              <p className="font-abridge text-4xl md:text-5xl text-[#EA2C00]" data-testid="text-attain-plan-combined-value">
                {formatCompact(target.margin)}
              </p>
              <p className="text-xs text-white/50 mt-2">
                Across {goalDefs.length} {goalDefs.length === 1 ? "priority" : "priorities"} · {allCommitted.length} decision{allCommitted.length === 1 ? "" : "s"} committed
              </p>
            </div>

            {goalDefs.length > 1 && (
              <div className="flex flex-wrap gap-3 mb-4" data-testid="grid-attain-plan-priority-breakdown">
                {goalDefs.map((g) => {
                  const goalMargin = combined.byGoal[g.id]?.totalMargin ?? 0;
                  const share = target.margin > 0 ? Math.round((goalMargin / target.margin) * 100) : 0;
                  return <PriorityBreakdownCard key={g.id} goalDef={g} margin={goalMargin} share={share} />;
                })}
              </div>
            )}

            <p className="text-[11px] text-[#B4B4B4] leading-relaxed max-w-[600px] border-t border-[#E5E5E5] pt-3">
              A value attainment plan is a shared commitment, co-authored at kickoff and steered monthly. Figures are
              illustrative and valued at contribution margin, and every priority's freed-time lever is counted once,
              never split across two goals' totals.
            </p>
          </motion.section>

          {/* ============ SECTION 2 · THE PLAN (decisions -> priority -> who -> when -> worth) ============ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid="section-attain-checklist">
            <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">What Has To Happen</p>
            <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">The Plan</h2>
            <p className="text-[13px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">
              To attain <b className="text-[#1A1A1A]">{formatCompact(target.margin)}</b> across {goalDefs.length}{" "}
              {goalDefs.length === 1 ? "priority" : "priorities"}, here is what has to happen. Every row below is a
              decision you moved above your reality, with a real owner and a real month attached to it. This is the
              checklist to come back to, not the number that started it.
            </p>

            {allCommitted.length === 0 ? (
              <div className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4" data-testid="text-attain-plan-empty">
                <p className="text-xs text-[#3A3A3A] leading-relaxed">
                  No decisions are committed yet. Go back to Build the case and Commit to turn this into a real plan.
                </p>
              </div>
            ) : goalDefs.length === 1 ? (
              <>
                <DecisionsTable rows={allCommitted} testId="table-attain-plan-decisions" />
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#E7E0D6]">
                  <span className="text-[10.5px] font-bold text-[#1A1A1A]">Total, contribution margin</span>
                  <span className="font-abridge text-lg text-[#EA2C00]" data-testid="text-attain-plan-total-reconciled">{formatCompact(target.margin)}</span>
                </div>
              </>
            ) : (
              <>
                {goalDefs.map((g) => {
                  const rows = allCommitted.filter((c) => c.goal === g.id);
                  if (rows.length === 0) return null;
                  // Never sum marginalMargin across a chain; use the chain's totalMargin.
                  // Leave-one-out marginalMargin values overlap (retention/quality/ED-access)
                  // and do not sum to the chain's real total, so this must read the same
                  // byGoal[g.id].totalMargin the breakdown cards (~:872) and PDF already use.
                  const groupWorth = combined.byGoal[g.id]?.totalMargin ?? 0;
                  return (
                    <div key={g.id} className="mb-8" data-testid={`group-attain-plan-decisions-${g.id}`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="inline-block text-[8px] font-bold uppercase tracking-[1.2px] text-white px-2 py-0.5 rounded-full"
                            style={{ background: g.pillBg }}
                          >
                            {g.pill}
                          </span>
                          <span className="text-[11.5px] font-bold text-[#1A1A1A]">{g.label}</span>
                        </div>
                        <span className="text-[11px] font-bold text-[#EA2C00]">{formatCompact(groupWorth)}</span>
                      </div>
                      <DecisionsTable rows={rows} testId={`table-attain-plan-decisions-${g.id}`} />
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-3 border-t border-[#E7E0D6]">
                  <span className="text-[10.5px] font-bold text-[#1A1A1A]">Total, contribution margin, combined</span>
                  <span className="font-abridge text-lg text-[#EA2C00]" data-testid="text-attain-plan-total-reconciled">{formatCompact(target.margin)}</span>
                </div>
              </>
            )}
          </motion.section>

          {/* ============ SECTION 3 · CLOSING THE GAP (combined) ============ */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid="section-attain-curve">
            <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">The Trajectory</p>
            <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">Closing the Gap</h2>
            <p className="text-[13px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">
              Most deployments drift: time gets freed, but the fragile middle links never get steered, and realized
              value settles well below what the model promised. That is the dashed line below, combined across every
              priority in this plan. Your plan is the line above it. The distance between them is whether the middle of
              each chain gets steered, month by month, to a named owner.
            </p>

            <AttainmentCurve
              pct={attainment.pct}
              onPacePct={attainment.onPacePct}
              monthsElapsed={state.monthsElapsed}
              totalMonths={state.totalMonths}
              goalLabel={curveGoalLabel}
              usualLabel={curveUsualLabel}
            />

            <div className="flex items-center gap-3 mt-3 mb-6 max-w-[420px]">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-[#8C8C8C] whitespace-nowrap">
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
                <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">Attainment today</p>
                <p className="font-abridge text-2xl text-[#EA2C00] mt-2 mb-1">{attainment.pct}%</p>
                <p className="text-[9px] text-[#8C8C8C]">Of your built plan</p>
              </div>
              <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-stat-onpace">
                <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">On-pace target</p>
                <p className="font-abridge text-2xl text-[#1A1A1A] mt-2 mb-1">{attainment.onPacePct}%</p>
                <p className="text-[9px] text-[#8C8C8C]">Where the plan expected this month</p>
              </div>
              <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-stat-runway">
                <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">Runway to goal</p>
                <p className="font-abridge text-2xl text-[#1A1A1A] mt-2 mb-1">{remainingMonths} mo</p>
                <p className="text-[9px] text-[#8C8C8C]">~{formatCompact(remainingMargin)} margin remaining</p>
              </div>
            </div>
          </motion.section>

          {/* ============ PER-PRIORITY DEEP DIVES ============ */}
          {goals.map((goal, idx) => (
            <PriorityDeepDive
              key={goal}
              setting={setting}
              goal={goal}
              goalDef={GOAL_CATALOG[goal]}
              content={getContent(setting, goal)}
              index={idx}
              total={goals.length}
              values={valuesByGoal[goal] ?? defaultLeverValues(goal, setting)}
              result={combined.byGoal[goal]}
              commitments={commitments}
              goalOwner={goalOwnerByPriority[goal]}
              unitCount={state.scope.unitCount}
              unitLabel={unitLabel}
              hasFreedTimeConflict={hasFreedTimeConflict}
              freedTimeSplit={freedTimeSplit}
            />
          ))}
        </>
      )}
    </div>
  );
}

interface PriorityDeepDiveProps {
  setting: AttainSetting;
  goal: GoalId;
  goalDef: GoalDef;
  content: SettingGoalContent | undefined;
  index: number;
  total: number;
  values: LeverValues;
  result: { perLever: LeverContribution[]; totalMargin: number; totalCount: number } | undefined;
  commitments: Record<string, Commitment>;
  goalOwner: GoalOwner | undefined;
  unitCount: number;
  unitLabel: string;
  hasFreedTimeConflict: boolean;
  freedTimeSplit: number;
}

function PriorityDeepDive({
  setting,
  goal,
  goalDef,
  content,
  index,
  total,
  values,
  result,
  commitments,
  goalOwner,
  unitCount,
  unitLabel,
  hasFreedTimeConflict,
  freedTimeSplit,
}: PriorityDeepDiveProps) {
  if (!content) return null;

  const committedLevers = committedLeversFor(goal, setting, values, result?.perLever, commitments);
  const goalMargin = result?.totalMargin ?? 0;
  const goalCount = result?.totalCount ?? 0;
  const goalOwnerName = goalOwner?.name?.trim();
  const goalOwnerTitle = goalOwner?.title?.trim();

  // Only access/retention share the freed-time hour, and only when both are
  // in the plan. When that conflict is live, the "where is it going" bar
  // reflects the ACTUAL chosen split live, not the setting's illustrative
  // static default, so this section never contradicts the split control on
  // Build the case.
  const isFreedTimeGoal = hasFreedTimeConflict && (goal === "access" || goal === "retention");
  const liveBarAcc = goal === "access" ? freedTimeSplit : 100 - freedTimeSplit;
  const barAcc = isFreedTimeGoal ? liveBarAcc : content.barAcc;

  return (
    <div data-testid={`section-attain-plan-priority-${goal}`}>
      <div className="flex items-center gap-3 mb-6">
        <span
          className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
          style={{ background: goalDef.pillBg }}
        >
          {goalDef.pill}
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
          Priority {index + 1} of {total} · {goalDef.label}
        </p>
      </div>

      {/* ============ Your Starting Point ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid={`section-attain-starting-point-${goal}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">Where You Are Today</p>
        <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">Your Starting Point</h2>
        <p className="text-[13px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">{content.p1Lead}</p>

        <div className="flex flex-wrap gap-3 mb-5">
          {content.worldCards.map((card, i) => (
            <div key={card.k} className="flex-1 min-w-[150px] bg-[#F4F0EA] rounded-md p-4" data-testid={`card-attain-plan-world-${goal}-${i}`}>
              <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">{card.k}</p>
              <p className={`font-abridge text-2xl mt-2 mb-1 ${card.coral ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
                {card.n}
              </p>
              <p className="text-[9px] text-[#8C8C8C]">{card.f}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4 mb-5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1.5">The opportunity, in one line</p>
          <p className="text-xs text-[#3A3A3A] leading-relaxed">{content.opportunity}</p>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">{content.trappedLabel}</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {content.trappedSteps.map((step, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-[10px] px-3 py-2 rounded-md bg-[#F4F0EA] text-[#3A3A3A]">{step}</span>
                {i < content.trappedSteps.length - 1 && <span className="text-[#B4B4B4]">→</span>}
              </span>
            ))}
          </div>
          <p className="text-[10.5px] text-[#3A3A3A] leading-relaxed">{content.trappedCap}</p>
        </div>

        <p className="text-[15px] font-semibold text-[#1A1A1A] mb-3">{content.goodHead}</p>
        {/* Both figures below come straight from the engine (`result`), not
            from static content copy - this is the fix for the mismatch a
            prior pass flagged between a hardcoded "good" number and the
            actual built total. */}
        <div className="bg-[#1A1A1A] rounded-lg flex flex-wrap p-6 mb-2" data-testid={`card-attain-plan-goal-hero-${goal}`}>
          <div className="flex-1 min-w-[140px] px-3">
            <p className="font-abridge text-3xl text-white" data-testid={`text-attain-plan-goal-margin-${goal}`}>{formatCompact(goalMargin)}</p>
            <p className="text-[8px] font-semibold uppercase tracking-[1.8px] text-white/55 mt-2">Contribution margin, this priority</p>
          </div>
          <div className="flex-1 min-w-[140px] px-3">
            <p className="font-abridge text-3xl text-white" data-testid={`text-attain-plan-goal-count-${goal}`}>{goalCount.toLocaleString()}</p>
            <p className="text-[8px] font-semibold uppercase tracking-[1.8px] text-white/55 mt-2">Units of value built</p>
          </div>
        </div>
        <p className="text-[10px] text-[#8C8C8C]">
          Scoped to {unitCount.toLocaleString()} {unitLabel}, built from {committedLevers.length} committed
          decision{committedLevers.length === 1 ? "" : "s"} in this priority.
        </p>
        {(goalOwnerName || goalOwnerTitle) && (
          <p className="text-[10px] text-[#8C8C8C] mt-1" data-testid={`text-attain-plan-goal-owner-${goal}`}>
            Outcome owner: <b className="text-[#3A3A3A]">{[goalOwnerName, goalOwnerTitle].filter(Boolean).join(" · ")}</b>
          </p>
        )}
      </motion.section>

      {/* ============ The Value Chain ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid={`section-attain-chain-${goal}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full" style={{ background: goalDef.pillBg }}>
            {goalDef.pill}
          </span>
          <span className="text-xs text-[#8C8C8C]">{goalDef.domainSub}</span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1 mt-3">The Value Chain</p>
        <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">
          {goalDef.chainTitle} <span className="text-[#EA2C00]">{goalDef.chainArrow === "↑" ? "↗" : "↘"}</span>
        </h2>
        <p className="text-[11.5px] leading-relaxed text-[#3A3A3A] mb-4 max-w-[720px]">
          {goalDef.label} is the end of a chain of links that must all fire. Abridge reliably delivers the first two,
          and the last two are the readout. <b className="text-[#1A1A1A]">Value leaks in the fragile middle, and
          every link there is owned by you.</b> This is the map the decisions on this plan are steering.
        </p>

        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8C8C8C] mb-2">How value moves through the chain</p>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {goalDef.flow.map((f, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className={`text-[10px] px-3 py-1.5 rounded-md border whitespace-nowrap ${FLOW_CLASS[f.kind]}`}>{f.label}</span>
              {i < goalDef.flow.length - 1 && <span className="text-[#B4B4B4] text-xs">→</span>}
            </span>
          ))}
        </div>

        <hr className="border-t border-[#E7E0D6] mb-5" />

        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8C8C8C] mb-2">The seven links and who typically holds them</p>
        <div className="overflow-x-auto mb-5">
          <table className="w-full text-left border-collapse" data-testid={`table-attain-plan-chain-${goal}`}>
            <thead>
              <tr>
                <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Link</th>
                <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6] text-right">Typically owned by</th>
              </tr>
            </thead>
            <tbody>
              {goalDef.chain.map((link) => (
                <tr key={link.n} className={link.fragile ? "shadow-[inset_3px_0_0_#EA2C00]" : ""} data-testid={`row-attain-plan-chain-${goal}-${link.n}`}>
                  <td className="py-2 px-2 border-b border-[#F0ECE5] align-top">
                    <p className="text-[11px] font-bold text-[#1A1A1A]">{link.n} · {link.name}</p>
                    <p className="text-[9.5px] text-[#8C8C8C] mt-0.5">{link.signal}</p>
                  </td>
                  <td className="py-2 px-2 border-b border-[#F0ECE5] align-top text-[10px] text-[#3A3A3A] text-right">
                    {link.ownerRole}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1.5">The fragile middle</p>
          <p className="text-xs text-[#3A3A3A] leading-relaxed">{content.fragile}</p>
          <p className="text-[10px] text-[#8C8C8C] mt-2">
            {committedLevers.length} of {leversFor(goal, setting).length} available decisions committed to this priority today.
          </p>
        </div>
      </motion.section>

      {/* ============ The Hardest Link ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid={`section-attain-hardest-link-${goal}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">The Hardest Link</p>
        <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">
          {content.hardestTitle} <span className="text-[#EA2C00]">{content.hardestArrow === "↑" ? "↗" : "↘"}</span>
        </h2>
        <p className="text-[11.5px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">{content.hardestLead}</p>

        <div className="flex flex-col gap-3 mb-6">
          {goalDef.mechanisms.map((m, i) => (
            <div key={i} className="bg-[#F8F5F1] border border-[#E7E0D6] rounded-md p-4">
              <p className="text-[11px] font-bold text-[#1A1A1A] mb-1">
                <span className="font-abridge text-[#EA2C00] mr-2">{String(i + 1).padStart(2, "0")}</span>
                {m.heading}
              </p>
              <p className="text-[10.5px] leading-relaxed text-[#3A3A3A]">{m.body}</p>
            </div>
          ))}
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">{content.splitLabel}</p>
        <div className="flex flex-wrap gap-3 mb-3">
          <div className="flex-1 min-w-[220px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">{content.splitLeft[0]}</p>
            <p className="text-[10px] leading-relaxed text-[#3A3A3A] mt-1.5">{content.splitLeft[1]}</p>
          </div>
          <div className="flex-1 min-w-[220px] border border-[#F3C9BE] bg-[#FFF6F3] rounded-md p-4">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00]">{content.splitRight[0]}</p>
            <p className="text-[10px] leading-relaxed text-[#3A3A3A] mt-1.5">{content.splitRight[1]}</p>
          </div>
        </div>
        <p className="text-[10.5px] leading-relaxed text-[#3A3A3A] mb-6">{content.splitCloser}</p>

        <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">
          {isFreedTimeGoal ? "Where the freed hour is going, per your split" : content.barHead}
        </p>
        <div className="relative mb-2">
          <div className="flex h-8 rounded-md overflow-hidden">
            <div className="bg-[#EA2C00]" style={{ width: `${barAcc}%` }} />
            <div className="bg-[#E4DCD0]" style={{ width: `${100 - barAcc}%` }} />
          </div>
          {!isFreedTimeGoal && (
            <div className="absolute top-[-6px] bottom-[-6px] w-[2px] bg-[#1A1A1A]" style={{ left: `${content.barTarget}%` }}>
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7.5px] font-bold text-[#1A1A1A] whitespace-nowrap">
                Target · {content.barTarget}%
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-between text-[9.5px] text-[#8C8C8C] mt-3">
          <span><b className="text-[#1A1A1A]">{barAcc}%</b> {content.barAccLbl}</span>
          <span><b className="text-[#1A1A1A]">{100 - barAcc}%</b> {content.barRelLbl}</span>
        </div>
        {isFreedTimeGoal && (
          <p className="text-[10px] text-[#8C8C8C] mt-2" data-testid={`text-attain-plan-freed-time-live-${goal}`}>
            This reflects the live freed-time split from Build the case, {freedTimeSplit}% to access.
          </p>
        )}
      </motion.section>

      {/* ============ The Cadence ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid={`section-attain-cadence-${goal}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">How This Gets Steered</p>
        <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">The Cadence, {goalDef.label}</h2>
        <p className="text-[11.5px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">{content.bendsLead}</p>

        <div className="flex flex-col gap-3 mb-6">
          {content.bends.map((b, i) => (
            <div key={i} className="flex gap-3 items-baseline">
              <span className="font-abridge text-[#EA2C00] text-lg min-w-[24px]">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[11.5px] leading-relaxed text-[#3A3A3A]">{b}</span>
            </div>
          ))}
        </div>
        <p className="text-[10.5px] leading-relaxed text-[#3A3A3A] mb-6">{content.bendsCloser}</p>

        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">The monthly check</p>
          <p className="text-[11px] leading-relaxed text-[#3A3A3A] mb-3">
            Same five questions every month. Five minutes. This is what keeps a bleeding decision from becoming a
            lost quarter.
          </p>
          <div className="flex flex-col gap-3">
            {content.monthly.map((q, i) => (
              <div key={i} className="flex gap-3 items-baseline">
                <span className="font-abridge text-[#EA2C00] text-lg min-w-[24px]">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[11.5px] leading-relaxed text-[#3A3A3A]">{q}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">Who owns what</p>
          <div className="flex flex-wrap gap-3">
            {committedLevers.map(({ lever, owner, due }) => (
              <div key={lever.id} className="flex-1 min-w-[150px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-3" data-testid={`card-attain-owner-${goal}-${lever.id}`}>
                <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C]">{lever.label}</p>
                <p className="text-[11px] font-bold text-[#1A1A1A] mt-1">{owner}</p>
                <p className="text-[9px] text-[#8C8C8C]">{due}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1.5">At renewal</p>
          <p className="text-xs text-[#1A1A1A] leading-relaxed">{content.renewal}</p>
        </div>
      </motion.section>
    </div>
  );
}
