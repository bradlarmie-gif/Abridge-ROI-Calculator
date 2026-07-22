import { useState, useCallback, useMemo, useEffect } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import StepSetting from "./steps/StepSetting";
import StepVision from "./steps/StepVision";
import StepScope from "./steps/StepScope";
import StepBuildCase from "./steps/StepBuildCase";
import StepCommit, {
  defaultCommitmentFor,
  DEFAULT_PLAN_CADENCE,
  type Commitment,
  type CommitmentSignal,
  type GoalOwner,
  type SignalCadence,
} from "./steps/StepCommit";
import StepPlanning from "./steps/StepPlanning";
import StepAttainment from "./steps/StepAttainment";
import AttainLivePanel from "./AttainLivePanel";
import {
  DEFAULT_ATTAIN_PLANNING,
  type AttainPlanning,
  type PlanPhaseId,
} from "@/lib/attain/attainPlanning";
import {
  DEFAULT_ATTAIN_STATE,
  DEFAULT_ATTAIN_SCOPE,
  type AttainState,
  type AttainSetting,
  type AttainScope,
  type GoalId,
} from "@/lib/attain/attainTypes";
import { getContent, GOAL_CATALOG } from "@/lib/attain/attainGoals";
import {
  leversFor,
  defaultLeverValues,
  computeMultiGoalContributions,
  type AttainBaseline,
  type LeverValues,
  type MultiGoalContributionsResult,
  type RealizationByGoal,
} from "@/lib/attain/attainLevers";
import { parseSignalBaseline, todayISODate, type ProgressEntry } from "@/lib/attain/attainProgress";
import type { GoalTargetResult, AttainmentResult } from "@/lib/attain/attainCalc";
import {
  ATTAIN_SAVE_VERSION,
  encodeAttain,
  readAttainDraft,
  writeAttainDraft,
  type AttainSaveState,
} from "@/lib/attain/attainUrlState";
import { copyToClipboard } from "@/lib/clipboard";
import AttainResumePrompt from "./AttainResumePrompt";

/**
 * Every selected goal gets its own "Build the case" page (`buildCase:<goal>`)
 * rather than one page that stacks every goal's section — see
 * `stepOrderFor` below. The step sequence is therefore dynamic: picking two
 * goals on Vision inserts two build-case pages between Starting point and
 * Commit, picking three inserts three, and so on.
 */
export type AttainStepId = "setting" | "vision" | "scope" | "commit" | "plan" | `buildCase:${GoalId}`;

const BUILD_CASE_PREFIX = "buildCase:";

function buildCaseStepId(goal: GoalId): AttainStepId {
  return `${BUILD_CASE_PREFIX}${goal}` as AttainStepId;
}

/** The goal a build-case step page belongs to, or null for every other step. */
function goalOfStep(step: AttainStepId): GoalId | null {
  return step.startsWith(BUILD_CASE_PREFIX) ? (step.slice(BUILD_CASE_PREFIX.length) as GoalId) : null;
}

/** The real step sequence for this plan: fixed setting/vision/scope, one
 * build-case page per selected goal in the order the partner picked them,
 * then fixed commit/plan. Recomputed whenever `goals` changes (only
 * possible from the Vision step, before any build-case page is reached). */
function stepOrderFor(goals: GoalId[]): AttainStepId[] {
  return ["setting", "vision", "scope", ...goals.map(buildCaseStepId), "commit", "plan"];
}

/** Header "step name" for the current step, including which priority a
 * build-case page belongs to when there is more than one. */
function stepLabelFor(step: AttainStepId, goals: GoalId[]): string {
  const goal = goalOfStep(step);
  if (goal) {
    const label = GOAL_CATALOG[goal].label;
    return goals.length > 1 ? `Build the case · ${label}` : "Build the case";
  }
  switch (step) {
    case "setting": return "Setting";
    case "vision": return "Vision";
    case "scope": return "Starting point";
    case "commit": return "Planning";
    case "plan": return "Attainment";
    default: return "";
  }
}

const DEFAULT_TOTAL_MONTHS = 9;
export const DEFAULT_FREED_TIME_SPLIT = 50;

function parseTotalMonths(goodHead: string | undefined): number {
  if (!goodHead) return DEFAULT_TOTAL_MONTHS;
  const match = goodHead.match(/(\d+)\s+months/);
  return match ? parseInt(match[1], 10) : DEFAULT_TOTAL_MONTHS;
}

/** A decision counts as "moved" once it differs from its realityStart — a
 * lines lever with at least one line picked, or a numeric lever dialed away
 * from where the partner already stands today. */
function isLeverMoved(value: number | string[] | undefined, realityStart: number | string[]): boolean {
  if (Array.isArray(realityStart)) return Array.isArray(value) && value.length > 0;
  return typeof value === "number" && value !== realityStart;
}

/** Presentation-only unit label for a single goal's built count figure — the
 * number itself always comes from the engine, this just names its unit. */
function countLabel(goal: GoalId, setting: AttainSetting): string {
  switch (goal) {
    case "access":
      return setting === "ed" ? "recovered visits/year" : "net-new visits/year";
    case "retention":
      return "departures avoided/year";
    case "revenue":
      // Outpatient/ED revenue is a THREE-PATH chain (HCCs, wRVUs, and
      // prevented denials are different units), so this label stays
      // deliberately generic rather than naming just one path's unit.
      return setting === "inpatient" ? "cases/queries addressed/year" : "capture actions/year";
    case "quality":
      return "events prevented/year";
    default:
      return "";
  }
}

function dueMonthNumber(due: string): number {
  const m = due.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

/** Stable key for a commitment that spans multiple goals — a lever id alone
 * is not unique once two goals are both in play. */
export function commitmentKey(goal: GoalId, leverId: string): string {
  return `${goal}:${leverId}`;
}

interface AttainFlowProps {
  onBackToJourney?: () => void;
  /** A fully decoded plan from a `?attain=` deep link (see App.tsx's
   * `getInitialDeepLink` and attainUrlState.ts's `decodeAttain`). When
   * present, every piece of local state below hydrates from it instead of
   * its usual empty default, and the flow opens straight at the
   * Attainment hub (the last step) rather than Setting — this is the
   * "open a saved link" half of save-and-return. `undefined` (a fresh
   * Attain entry) is the normal case and behaves exactly as before. */
  initialSaveState?: AttainSaveState;
}

export default function AttainFlow({ onBackToJourney, initialSaveState }: AttainFlowProps) {
  const [stepIndex, setStepIndex] = useState(() =>
    initialSaveState ? stepOrderFor(initialSaveState.goals).length - 1 : 0,
  );
  const [state, setState] = useState<AttainState>(() => initialSaveState?.state ?? DEFAULT_ATTAIN_STATE);
  // One or more goals can be in play at once (the whole point of this
  // task). `valuesByGoal` and `commitments` are keyed per goal so two
  // goals' decisions never collide, even when (as with access/retention)
  // they share a lever id naming convention.
  const [goals, setGoals] = useState<GoalId[]>(() => initialSaveState?.goals ?? []);
  const [valuesByGoal, setValuesByGoal] = useState<Partial<Record<GoalId, LeverValues>>>(
    () => initialSaveState?.valuesByGoal ?? {},
  );
  const [commitments, setCommitments] = useState<Record<string, Commitment>>(() => initialSaveState?.commitments ?? {});
  // The executive sponsor for EACH selected priority's outcome - collected
  // once per priority on Commit, above that priority's decisions, since
  // every decision-owner answers to this person for whether the outcome
  // lands. Local state, same reasoning as `commitments` below: this is
  // plan-authoring bookkeeping, not part of the locked `attainTypes.ts`
  // engine shapes.
  const [goalOwnerByPriority, setGoalOwnerByPriority] = useState<Partial<Record<GoalId, GoalOwner>>>(
    () => initialSaveState?.goalOwnerByPriority ?? {},
  );
  // Attainment hub "Progress" tab state: a dated log per committed SIGNAL
  // (key = `${goal}:${leverId}:${signalId}`) — one seed entry carrying the
  // baseline, dated the day the decision was first committed, then one more
  // appended every time the partner "logs an update" (see
  // `handleLogProgressUpdate`). `current` for any signal is always the
  // latest entry's value (see attainProgress.ts's `currentValueFromEntries`)
  // — there is no separately-edited "current" field anymore.
  //
  // Clicking Save (see `handleSave` below) snapshots this whole log into a
  // shareable link and a local draft (attainUrlState.ts), so a returned
  // plan shows its real dated history, not a reseeded blank one. What is
  // still missing is a real backend: an account tied to this organization
  // that any device can sync to without the link itself. That is a future
  // layer; this state is exactly what would lift into it.
  const [progressEntries, setProgressEntries] = useState<Record<string, ProgressEntry[]>>(
    () => initialSaveState?.progressEntries ?? {},
  );
  // ONE plan-wide review cadence (Commit redesign) — replaces what used to
  // be a cadence picked per SIGNAL. Every committed signal's "next check
  // due" (Progress tab, PDF) is derived off this single value now, never a
  // per-row setting. Defaults to monthly, editable once on Commit.
  const [planCadence, setPlanCadence] = useState<SignalCadence>(
    () => initialSaveState?.planCadence ?? DEFAULT_PLAN_CADENCE,
  );
  // The rebuilt "Planning" step's own editable layer — per-phase owner
  // overrides, per-phase leading-signal targets, and one optional partner-
  // disclosed risk. Only meaningful for the outpatient Access plan (the one
  // combo Planning is rebuilt for, see `isOutpatientAccessPlan` below); every
  // other combo still renders the original StepCommit and never touches this.
  // Additive local state, exactly like `commitments`/`goalOwnerByPriority`:
  // it is plan-authoring bookkeeping, not part of the locked engine shapes.
  const [planning, setPlanning] = useState<AttainPlanning>(
    () => initialSaveState?.planning ?? DEFAULT_ATTAIN_PLANNING,
  );
  // The partner's real operational baseline (providers/encounters/
  // utilization, or beds/FTEs/census/adoption for nursing) — collected once
  // on the Scope step and threaded into every lever's engine call from
  // here down. This is local state, not part of `AttainState`
  // (attainTypes.ts intentionally untouched), because it is purely an
  // engine input, not part of the plan's identity/progress bookkeeping.
  //
  // Starts genuinely EMPTY (`{}`) on a fresh entry, never a prefilled
  // benchmark — the Scope step's fields show only a placeholder example
  // ("e.g., 40") until the partner types their own number. Every lever
  // below already treats a missing field as 0 (see attainLevers.ts /
  // attainAccess.ts's per-function fallbacks), so capacity and dollars
  // simply stay at $0 until the real numbers land here; nothing downstream
  // can NaN or crash on a blank field. A restored save (`initialSaveState`)
  // is the one exception — it already carries the partner's real numbers.
  const [baseline, setBaseline] = useState<AttainBaseline>(() => initialSaveState?.baseline ?? {});
  // Only meaningful when both access and retention are selected — the % of
  // the one shared freed documentation hour routed to opening access
  // (schedule); the rest routes to protecting relief. See attainLevers.ts
  // computeMultiGoalContributions for why this prevents double-counting.
  const [freedTimeSplit, setFreedTimeSplit] = useState<number>(
    () => initialSaveState?.freedTimeSplit ?? DEFAULT_FREED_TIME_SPLIT,
  );
  // Per-priority attribution — the share of THIS priority's outcome, 0-100,
  // that belongs to this plan rather than some other effort a partner may
  // be running against the same number. Default 100 (full credit) whenever
  // a key is missing, so a goal never needs to be eagerly seeded here the
  // moment it's picked — see every read site below's `?? 100` fallback.
  // Threaded into `computeMultiGoalContributions` (attainLevers.ts), the
  // ONE place the actual scaling happens; see that function's comment.
  const [realizationByGoal, setRealizationByGoal] = useState<RealizationByGoal>(
    () => initialSaveState?.realizationByGoal ?? {},
  );

  // Save-and-return's other half: the offer to pick a plan back up when
  // returning to Attain WITHOUT a link (see App.tsx's deep-link handling
  // for the WITH-a-link case). Only ever checked once, on first mount, and
  // only when this visit did not already arrive with a decoded save state
  // — a partner who just opened a shared link does not also need to be
  // asked about a stale local draft. Non-destructive: dismissing just hides
  // the prompt, it never deletes the draft out from under a later visit.
  const [resumeDraft, setResumeDraft] = useState<AttainSaveState | null>(() =>
    initialSaveState ? null : readAttainDraft(),
  );

  // The real step sequence, recomputed whenever the selected goals change —
  // one build-case page per goal, in pick order. See `stepOrderFor` above.
  const stepOrder = useMemo(() => stepOrderFor(goals), [goals]);
  // Defensive clamp: goals can only change from the Vision step (index 1),
  // where every stepOrder shares the same first three entries regardless of
  // goal count, so this never fires in normal use — it just guarantees
  // stepIndex can never point past the end of a shorter sequence.
  useEffect(() => {
    if (stepIndex > stepOrder.length - 1) setStepIndex(stepOrder.length - 1);
  }, [stepOrder, stepIndex]);
  const step = stepOrder[stepIndex] ?? "setting";
  const activeBuildCaseGoal = goalOfStep(step);

  // The rebuilt, phased "Planning" view is scoped to the OUTPATIENT PATIENT
  // ACCESS plan only (a single selected access goal in the outpatient
  // setting). Every other setting/goal combo — and any multi-goal plan that
  // also happens to include access — still renders the original StepCommit
  // content. This is the one branch the task asks for; the underlying step id
  // stays "commit" so nav, progress dots, and the save shape are untouched.
  const isOutpatientAccessPlan = state.setting === "outpatient" && goals.length === 1 && goals[0] === "access";

  const updateState = useCallback((updates: Partial<AttainState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // `state.goal` (singular, from attainTypes.ts, left unmodified) tracks the
  // FIRST selected goal only, kept in sync below purely so the existing
  // single-goal-shaped pieces of state (Setting/Scope content preview) keep
  // working unchanged. `goals` (plural, local to this component) is the
  // real source of truth for everything downstream of Vision.
  const primaryGoal = goals[0] ?? null;
  // The panel's "Why this plan works" thesis follows whichever goal is
  // actually on screen on a build-case page, so it never contradicts the
  // domain the partner is looking at; everywhere else it falls back to the
  // first selected goal.
  const panelContentGoal = activeBuildCaseGoal ?? primaryGoal;
  const content = state.setting && panelContentGoal ? getContent(state.setting, panelContentGoal) : undefined;

  const handleSelectSetting = useCallback((setting: AttainSetting) => {
    setGoals([]);
    setValuesByGoal({});
    setCommitments({});
    setGoalOwnerByPriority({});
    setProgressEntries({});
    setBaseline({});
    setFreedTimeSplit(DEFAULT_FREED_TIME_SPLIT);
    setRealizationByGoal({});
    setPlanCadence(DEFAULT_PLAN_CADENCE);
    setPlanning(DEFAULT_ATTAIN_PLANNING);
    setState((prev) => ({
      ...prev,
      setting,
      goal: null,
      scope: { ...DEFAULT_ATTAIN_SCOPE },
      monthsElapsed: 0,
      totalMonths: DEFAULT_TOTAL_MONTHS,
      progressRatio: 1,
    }));
  }, []);

  const handleToggleGoal = useCallback((goalId: GoalId) => {
    const next = goals.includes(goalId) ? goals.filter((g) => g !== goalId) : [...goals, goalId];
    setGoals(next);
    setValuesByGoal((prev) => (prev[goalId] ? prev : { ...prev, [goalId]: defaultLeverValues(goalId, state.setting ?? undefined) }));
    setState((prev) => {
      const contents = next.map((g) => (prev.setting ? getContent(prev.setting, g) : undefined));
      const totalMonths = contents.length > 0
        ? Math.max(...contents.map((c) => parseTotalMonths(c?.goodHead)))
        : DEFAULT_TOTAL_MONTHS;
      return {
        ...prev,
        goal: next[0] ?? null,
        totalMonths,
        monthsElapsed: Math.round(totalMonths * 0.6),
        progressRatio: 1,
      };
    });
  }, [goals, state.setting]);

  const handleChangeBaseline = useCallback((patch: Partial<AttainBaseline>) => {
    setBaseline((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleChangeLeverValue = useCallback((goal: GoalId, leverId: string, value: number | string[]) => {
    setValuesByGoal((prev) => ({
      ...prev,
      [goal]: { ...(prev[goal] ?? defaultLeverValues(goal, state.setting ?? undefined)), [leverId]: value },
    }));
  }, [state.setting]);

  // `owner`/`due` deliberately default to "" / the lever's own `defaultDue`
  // via `defaultCommitmentFor` (not a placeholder-looking real value) - the
  // owner ROLE is only ever a placeholder hint on Commit's owner input,
  // never a value that reads as if a real name were already typed. Every
  // handler below materializes a decision's full commitment (owner, due,
  // AND its pre-filled signals) the first time it is touched, from that one
  // shared default builder, so every screen that reads `commitments[key]`
  // sees the same shape whether or not the partner has edited it yet.
  const fallbackCommitment = useCallback((goal: GoalId, leverId: string): Commitment => {
    const lever = leversFor(goal, state.setting ?? undefined).find((l) => l.id === leverId);
    return lever
      ? defaultCommitmentFor(goal, lever, state.setting ?? undefined)
      : { owner: "", due: "Month 1", requiredSignal: { id: "fallback", label: "", baseline: "", unit: "" }, optionalSignals: [] };
  }, [state.setting]);

  const handleChangeCommitment = useCallback((goal: GoalId, leverId: string, patch: Partial<Pick<Commitment, "owner" | "due">>) => {
    setCommitments((prev) => {
      const key = commitmentKey(goal, leverId);
      const base = prev[key] ?? fallbackCommitment(goal, leverId);
      return { ...prev, [key]: { ...base, ...patch } };
    });
  }, [fallbackCommitment]);

  // Edits the ONE required signal's baseline/unit only — its label is
  // pinned to the decision's designated proof-signal (never re-picked from
  // a Select here, see StepCommit's `requiredSignalLabel` usage), so this
  // never needs to accept a `label` patch.
  const handleChangeRequiredSignal = useCallback((goal: GoalId, leverId: string, patch: Partial<Pick<CommitmentSignal, "baseline" | "unit">>) => {
    setCommitments((prev) => {
      const key = commitmentKey(goal, leverId);
      const base = prev[key] ?? fallbackCommitment(goal, leverId);
      return { ...prev, [key]: { ...base, requiredSignal: { ...base.requiredSignal, ...patch } } };
    });
  }, [fallbackCommitment]);

  const handleAddOptionalSignal = useCallback((goal: GoalId, leverId: string) => {
    setCommitments((prev) => {
      const key = commitmentKey(goal, leverId);
      const base = prev[key] ?? fallbackCommitment(goal, leverId);
      const lever = leversFor(goal, state.setting ?? undefined).find((l) => l.id === leverId);
      // A genuinely unique id, safe here because this only runs once per
      // click (an imperative event handler), never once per render - see
      // `defaultCommitmentFor`'s comment on why the required signal's id
      // must stay deterministic instead.
      const newSignal: CommitmentSignal = {
        id: `${key}:optional-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: "",
        baseline: "",
        unit: lever?.unit ?? "",
      };
      return { ...prev, [key]: { ...base, optionalSignals: [...base.optionalSignals, newSignal] } };
    });
  }, [fallbackCommitment, state.setting]);

  const handleRemoveOptionalSignal = useCallback((goal: GoalId, leverId: string, signalId: string) => {
    setCommitments((prev) => {
      const key = commitmentKey(goal, leverId);
      const base = prev[key] ?? fallbackCommitment(goal, leverId);
      return { ...prev, [key]: { ...base, optionalSignals: base.optionalSignals.filter((s) => s.id !== signalId) } };
    });
  }, [fallbackCommitment]);

  const handleChangeOptionalSignal = useCallback((goal: GoalId, leverId: string, signalId: string, patch: Partial<CommitmentSignal>) => {
    setCommitments((prev) => {
      const key = commitmentKey(goal, leverId);
      const base = prev[key] ?? fallbackCommitment(goal, leverId);
      return {
        ...prev,
        [key]: { ...base, optionalSignals: base.optionalSignals.map((s) => (s.id === signalId ? { ...s, ...patch } : s)) },
      };
    });
  }, [fallbackCommitment]);

  const handleChangePlanCadence = useCallback((cadence: SignalCadence) => {
    setPlanCadence(cadence);
  }, []);

  // Planning step (outpatient Access) edits — a per-phase owner override, a
  // per-phase leading-signal target, and the one optional partner-disclosed
  // risk. Each merges shallowly so an unset phase simply falls back to its
  // derived default downstream (see attainPlanning.ts's resolver helpers).
  const handleChangePhaseOwner = useCallback((phase: PlanPhaseId, name: string) => {
    setPlanning((prev) => ({ ...prev, phaseOwners: { ...prev.phaseOwners, [phase]: name } }));
  }, []);

  const handleChangePhaseSignalTarget = useCallback((phase: PlanPhaseId, target: string) => {
    setPlanning((prev) => ({ ...prev, phaseSignalTargets: { ...prev.phaseSignalTargets, [phase]: target } }));
  }, []);

  const handleChangePartnerRisk = useCallback((text: string) => {
    setPlanning((prev) => ({ ...prev, partnerRisk: text }));
  }, []);

  const handleChangeGoalOwner = useCallback((goal: GoalId, patch: Partial<GoalOwner>) => {
    setGoalOwnerByPriority((prev) => ({
      ...prev,
      [goal]: { ...(prev[goal] ?? { name: "", title: "" }), ...patch },
    }));
  }, []);

  // Every committed SIGNAL's key + its baseline, so the effect below can
  // seed a dated log for each one the first time it shows up as committed —
  // mirrors `movedLeverKeys` above but at signal (not decision) granularity,
  // since the entries log lives per signal.
  const committedSignalSeeds = useMemo(() => {
    const out: { key: string; baseline: number }[] = [];
    for (const g of goals) {
      const values = valuesByGoal[g] ?? defaultLeverValues(g, state.setting ?? undefined);
      for (const lever of leversFor(g, state.setting ?? undefined)) {
        if (!isLeverMoved(values[lever.id], lever.realityStart)) continue;
        const declKey = commitmentKey(g, lever.id);
        const commitment = commitments[declKey] ?? fallbackCommitment(g, lever.id);
        // Falls back to this decision's own default signal if a corrupt/
        // legacy save link produced a commitment missing (or malformed)
        // `requiredSignal` — see attainUrlState.ts's `isWellFormedCommitment`,
        // which is the real gate, but this stays defensive too.
        const fallbackSignal = fallbackCommitment(g, lever.id).requiredSignal;
        const optionalSignals = Array.isArray(commitment.optionalSignals) ? commitment.optionalSignals : [];
        const signals = [commitment.requiredSignal ?? fallbackSignal, ...optionalSignals];
        for (const sig of signals) {
          const safeSig = sig ?? fallbackSignal;
          out.push({ key: `${declKey}:${safeSig.id}`, baseline: parseSignalBaseline(safeSig.baseline) });
        }
      }
    }
    return out;
  }, [goals, valuesByGoal, commitments, fallbackCommitment, state.setting]);

  // Seeds a signal's dated log the first time it appears as committed: one
  // entry carrying its baseline, dated today. Today is the best honest
  // stand-in for "the day this decision was committed" available without a
  // real commit-timestamp field (this session's visit to Progress IS the
  // first time this signal's log can exist) — see the persistence note on
  // `progressEntries` above. Never re-seeds or overwrites a log that
  // already has entries, so a real logged update is never clobbered.
  useEffect(() => {
    if (committedSignalSeeds.length === 0) return;
    setProgressEntries((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const { key, baseline } of committedSignalSeeds) {
        if (!next[key] || next[key].length === 0) {
          next[key] = [{ date: todayISODate(), value: baseline }];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [committedSignalSeeds]);

  // "Log an update" — the one write path for Progress: appends a dated
  // entry (today, the new value, an optional one-line note) to a signal's
  // log. Never mutates or removes a past entry, so the history this builds
  // is an honest, append-only record for the EBR.
  const handleLogProgressUpdate = useCallback((signalKey: string, value: number, note?: string) => {
    setProgressEntries((prev) => {
      const existing = prev[signalKey] ?? [];
      const entry: ProgressEntry = { date: todayISODate(), value, note: note?.trim() ? note.trim() : undefined };
      return { ...prev, [signalKey]: [...existing, entry] };
    });
  }, []);

  const handleMonthsElapsedChange = useCallback((months: number) => {
    updateState({ monthsElapsed: months });
  }, [updateState]);

  const handleFreedTimeSplitChange = useCallback((split: number) => {
    setFreedTimeSplit(Math.min(100, Math.max(0, split)));
  }, []);

  // Build the case's "Realization rate" control - the one place a priority's
  // attribution percent changes. Clamped here (not just at the engine layer)
  // so the slider/number input can never even display an out-of-range value.
  const handleChangeRealization = useCallback((goal: GoalId, pct: number) => {
    setRealizationByGoal((prev) => ({ ...prev, [goal]: Math.min(100, Math.max(0, pct)) }));
  }, []);

  // Resume prompt's "Resume this plan" action — rehydrates every piece of
  // state from a stored save (the local draft here; a `?attain=` link goes
  // through the same shape via `initialSaveState` at mount instead) and
  // jumps straight to the Attainment hub, mirroring where a deep-linked
  // plan opens. Overwrites whatever is currently on screen, which is safe
  // here because this only ever runs from the fresh, still-blank Setting
  // step this prompt is scoped to.
  const applySaveState = useCallback((saved: AttainSaveState) => {
    setState(saved.state);
    setGoals(saved.goals);
    setValuesByGoal(saved.valuesByGoal);
    setCommitments(saved.commitments);
    setGoalOwnerByPriority(saved.goalOwnerByPriority);
    setProgressEntries(saved.progressEntries);
    setBaseline(saved.baseline);
    setFreedTimeSplit(saved.freedTimeSplit);
    setRealizationByGoal(saved.realizationByGoal);
    setPlanCadence(saved.planCadence);
    setPlanning(saved.planning ?? DEFAULT_ATTAIN_PLANNING);
    setStepIndex(stepOrderFor(saved.goals).length - 1);
    setResumeDraft(null);
  }, []);

  const handleResumeDraft = useCallback(() => {
    if (resumeDraft) applySaveState(resumeDraft);
  }, [resumeDraft, applySaveState]);

  // Dismissing never deletes the draft — a partner who says "not now" can
  // still get prompted again on their next fresh visit. The draft itself
  // is only ever replaced (by the next Save) or left alone.
  const handleDismissResumeDraft = useCallback(() => {
    setResumeDraft(null);
  }, []);

  // The Save button's one job: snapshot everything this plan holds right
  // now into a versioned save state, write it to the local draft (so a
  // fresh visit to Attain can offer to resume it, see `resumeDraft` above),
  // copy a shareable `?attain=` link to the clipboard, and hand that link
  // back so the caller can show its own confirmation. Returns `null` (and
  // saves nothing) before a setting/goal has even been picked — there is
  // nothing yet worth a link.
  //
  // This is the shareable-link + local-draft half of "save and return".
  // True multi-user, cross-session persistence tied to a real account
  // (so a plan is reachable without the link, from any device, and never
  // expires) needs a backend + accounts layer — a future task, not this
  // one.
  const handleSave = useCallback(async (): Promise<string | null> => {
    if (!state.setting || goals.length === 0) return null;
    const saveState: AttainSaveState = {
      version: ATTAIN_SAVE_VERSION,
      savedAt: new Date().toISOString(),
      state,
      goals,
      valuesByGoal,
      commitments,
      goalOwnerByPriority,
      progressEntries,
      baseline,
      freedTimeSplit,
      realizationByGoal,
      planCadence,
      planning,
    };
    writeAttainDraft(saveState);
    const encoded = encodeAttain(saveState);
    const url = `${window.location.origin}${window.location.pathname}?attain=${encoded}`;
    await copyToClipboard(url);
    return url;
  }, [state, goals, valuesByGoal, commitments, goalOwnerByPriority, progressEntries, baseline, freedTimeSplit, realizationByGoal, planCadence, planning]);

  // Every dollar figure downstream comes from this one computation: each
  // goal's own delta off its own realityStart, combined once with the
  // freed-time hour split (not double-counted) when access+retention are
  // both in play. See attainLevers.ts computeMultiGoalContributions.
  const combined: MultiGoalContributionsResult | null = useMemo(() => {
    if (goals.length === 0 || !state.setting) return null;
    return computeMultiGoalContributions(goals, state.setting, baseline, valuesByGoal, freedTimeSplit, realizationByGoal);
  }, [goals, state.setting, baseline, valuesByGoal, freedTimeSplit, realizationByGoal]);

  // Whether every field the Scope step asks for has a real value, so the
  // panel's Continue button on that step can only advance once the
  // baseline every downstream lever depends on is actually filled in.
  const isBaselineValid = useMemo(() => {
    if (!state.setting) return false;
    if (state.setting === "nursing") {
      return (
        (baseline.staffedBeds ?? 0) > 0 &&
        (baseline.nursingFtes ?? 0) > 0 &&
        (baseline.dailyCensus ?? 0) > 0 &&
        (baseline.adoptionPct ?? 0) > 0
      );
    }
    return (baseline.providers ?? 0) > 0 && (baseline.annualEncounters ?? 0) > 0 && (baseline.utilizationPct ?? 0) > 0;
  }, [state.setting, baseline]);

  // Keeps the legacy `AttainState.scope.unitCount` field (still read by
  // StepAttainment's per-priority "scoped to N providers" line) in sync with the
  // real baseline, without threading a second unit-count input anywhere -
  // providers for physician settings, staffed beds for nursing.
  useEffect(() => {
    if (!state.setting) return;
    const unitCount = state.setting === "nursing" ? (baseline.staffedBeds ?? 0) : (baseline.providers ?? 0);
    if (state.scope.unitCount !== unitCount) {
      updateState({ scope: { ...state.scope, unitCount } });
    }
  }, [state.setting, state.scope, baseline, updateState]);

  const builtTarget: GoalTargetResult | null = useMemo(() => {
    if (goals.length === 0 || !state.setting || !combined) return null;
    const label = goals.length === 1
      ? `${combined.combinedCount.toLocaleString()} ${countLabel(goals[0], state.setting)}`
      : `${combined.combinedCount.toLocaleString()} units of value across ${goals.length} priorities`;
    return { margin: combined.combinedMargin, count: combined.combinedCount, label };
  }, [goals, state.setting, combined]);

  const movedLeverKeys = useMemo(() => {
    const out: string[] = [];
    for (const g of goals) {
      const values = valuesByGoal[g] ?? defaultLeverValues(g, state.setting ?? undefined);
      for (const lever of leversFor(g, state.setting ?? undefined)) {
        if (isLeverMoved(values[lever.id], lever.realityStart)) out.push(commitmentKey(g, lever.id));
      }
    }
    return out;
  }, [goals, valuesByGoal, state.setting]);

  // Progress ratio: the curve steers against how much of the COMBINED built
  // target has a commitment (owner + month) whose month has actually
  // arrived, weighted per-lever against the combined total (not each
  // goal's own total), so a plan with two priorities does not overstate
  // progress just because one priority's decisions are all committed.
  useEffect(() => {
    if (goals.length === 0 || !combined) return;
    if (movedLeverKeys.length === 0) {
      if (state.progressRatio !== 1) updateState({ progressRatio: 1 });
      return;
    }
    let realizedWeight = 0;
    for (const g of goals) {
      const res = combined.byGoal[g];
      if (!res) continue;
      for (const lever of leversFor(g, state.setting ?? undefined)) {
        const key = commitmentKey(g, lever.id);
        if (!movedLeverKeys.includes(key)) continue;
        const contribution = res.perLever.find((p) => p.id === lever.id);
        if (!contribution) continue;
        const due = commitments[key]?.due ?? lever.defaultDue;
        const weight = combined.combinedMargin > 0 ? Math.max(0, contribution.marginalMargin) / combined.combinedMargin : 0;
        if (dueMonthNumber(due) <= state.monthsElapsed) realizedWeight += weight;
      }
    }
    const ratio = 0.4 + 0.6 * Math.min(1, Math.max(0, realizedWeight));
    if (Math.abs(ratio - state.progressRatio) > 0.001) {
      updateState({ progressRatio: ratio });
    }
  }, [goals, state.monthsElapsed, state.progressRatio, state.setting, combined, movedLeverKeys, commitments, updateState]);

  const attainment: AttainmentResult = useMemo(() => {
    if (!builtTarget || builtTarget.margin <= 0) return { pct: 0, onPacePct: 0, marginToDate: 0 };
    const totalMonths = Math.max(1, state.totalMonths);
    const t = Math.min(1, Math.max(0, state.monthsElapsed / totalMonths));
    const onPacePct = Math.round(100 * Math.pow(t, 0.85));
    const ratio = Math.min(1, Math.max(0, state.progressRatio));
    const pct = Math.round(onPacePct * ratio);
    const marginToDate = Math.round(builtTarget.margin * (pct / 100));
    return { pct, onPacePct, marginToDate };
  }, [builtTarget, state.totalMonths, state.monthsElapsed, state.progressRatio]);

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(stepOrder.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepOrder.length]);

  const goBack = useCallback(() => {
    if (stepIndex === 0) {
      onBackToJourney?.();
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stepIndex, onBackToJourney]);

  // The one Continue action for the current step, always rendered at the
  // foot of the side panel (see AttainLivePanel) rather than as a
  // per-step button, so its placement never drifts step to step. On a
  // build-case page the label names whichever priority comes next — the
  // next build-case page's goal, or Commit once every priority has had its
  // own page.
  const panelNext = useMemo((): { disabled: boolean; label: string } => {
    if (activeBuildCaseGoal) {
      const nextStep = stepOrder[stepIndex + 1];
      const nextGoal = nextStep ? goalOfStep(nextStep) : null;
      return {
        disabled: false,
        label: nextGoal ? `Continue to ${GOAL_CATALOG[nextGoal].label}` : "Continue to planning",
      };
    }
    switch (step) {
      case "setting":
        return { disabled: !state.setting, label: "Continue" };
      case "vision":
        return { disabled: goals.length === 0, label: "Continue" };
      case "scope":
        return { disabled: !isBaselineValid, label: "Continue" };
      case "commit":
        return { disabled: false, label: "Continue to attainment" };
      default:
        return { disabled: false, label: "Continue" };
    }
  }, [step, activeBuildCaseGoal, stepOrder, stepIndex, state.setting, goals.length, isBaselineValid]);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="attain"
        currentStep={stepIndex + 1}
        totalSteps={stepOrder.length}
        stepName={stepLabelFor(step, goals)}
        onBack={goBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {resumeDraft && (
          <AttainResumePrompt draft={resumeDraft} onResume={handleResumeDraft} onDismiss={handleDismissResumeDraft} />
        )}
        {/*
          The Attainment hub ("plan" step) never gets a live side panel — see
          the `step !== "plan"` guard below — so its content column must not
          inherit the OTHER steps' `flex-1` left-pinned-in-a-flex-row shape.
          Left pinned inside the max-w-[1200px] frame, with nothing on its
          right, that shape reads as a narrow form stuck to the left edge of
          a wide, half-empty canvas — the exact readability complaint this
          pass fixes. Centering it instead at a generous 1040px (`mx-auto`
          on a flex item centers it along the row's main axis, a standard
          flexbox technique, since it does not also carry `flex-1`) lets it
          read as a document with balanced margins on a wide desktop, while
          `max-w-[1040px]` still comfortably fits the 1280px laptop floor
          this flow has to support (1200px frame - 48px padding = 1152px of
          room to center within).
        */}
        <div className={`flex flex-col lg:flex-row gap-10 ${step === "plan" ? "justify-center" : ""}`}>
          <div
            className={
              step === "plan" ? "w-full max-w-[1040px] mx-auto" : "flex-1 min-w-0 max-w-[700px]"
            }
          >
            {step === "setting" && (
              <StepSetting selected={state.setting} onSelect={handleSelectSetting} />
            )}

            {step === "vision" && state.setting && (
              <StepVision setting={state.setting} selectedGoals={goals} onToggle={handleToggleGoal} />
            )}

            {step === "scope" && state.setting && (
              <StepScope
                setting={state.setting}
                baseline={baseline}
                onChangeBaseline={handleChangeBaseline}
              />
            )}

            {activeBuildCaseGoal && state.setting && (
              <StepBuildCase
                setting={state.setting}
                baseline={baseline}
                goal={activeBuildCaseGoal}
                goalIndex={goals.indexOf(activeBuildCaseGoal)}
                totalGoals={goals.length}
                goals={goals}
                values={valuesByGoal[activeBuildCaseGoal] ?? defaultLeverValues(activeBuildCaseGoal, state.setting ?? undefined)}
                combined={combined}
                freedTimeSplit={freedTimeSplit}
                onChangeFreedTimeSplit={handleFreedTimeSplitChange}
                realizationPct={realizationByGoal[activeBuildCaseGoal] ?? 100}
                onChangeLeverValue={handleChangeLeverValue}
                stepNumber={stepIndex + 1}
                totalSteps={stepOrder.length}
              />
            )}

            {step === "commit" && isOutpatientAccessPlan && (
              <StepPlanning
                setting="outpatient"
                baseline={baseline}
                values={valuesByGoal.access ?? defaultLeverValues("access", "outpatient")}
                combined={combined}
                goalOwner={goalOwnerByPriority.access ?? { name: "", title: "" }}
                onChangeGoalOwner={(patch) => handleChangeGoalOwner("access", patch)}
                planning={planning}
                onChangePhaseOwner={handleChangePhaseOwner}
                onChangePhaseSignalTarget={handleChangePhaseSignalTarget}
                onChangePartnerRisk={handleChangePartnerRisk}
                planCadence={planCadence}
                onChangePlanCadence={handleChangePlanCadence}
                totalMonths={state.totalMonths}
                stepNumber={stepIndex + 1}
              />
            )}

            {step === "commit" && !isOutpatientAccessPlan && goals.length > 0 && (
              <StepCommit
                goals={goals}
                setting={state.setting ?? "outpatient"}
                valuesByGoal={valuesByGoal}
                combined={combined}
                commitments={commitments}
                onChangeCommitment={handleChangeCommitment}
                onChangeRequiredSignal={handleChangeRequiredSignal}
                onAddOptionalSignal={handleAddOptionalSignal}
                onRemoveOptionalSignal={handleRemoveOptionalSignal}
                onChangeOptionalSignal={handleChangeOptionalSignal}
                goalOwnerByPriority={goalOwnerByPriority}
                onChangeGoalOwner={handleChangeGoalOwner}
                planCadence={planCadence}
                onChangePlanCadence={handleChangePlanCadence}
                stepNumber={stepIndex + 1}
              />
            )}

            {step === "plan" && (
              goals.length > 0 && state.setting && builtTarget && combined ? (
                <StepAttainment
                  state={state}
                  setting={state.setting}
                  goals={goals}
                  target={builtTarget}
                  attainment={attainment}
                  valuesByGoal={valuesByGoal}
                  combined={combined}
                  commitments={commitments}
                  goalOwnerByPriority={goalOwnerByPriority}
                  freedTimeSplit={freedTimeSplit}
                  realizationByGoal={realizationByGoal}
                  progressEntries={progressEntries}
                  planCadence={planCadence}
                  onLogProgressUpdate={handleLogProgressUpdate}
                  onMonthsElapsedChange={handleMonthsElapsedChange}
                  stepNumber={stepIndex + 1}
                  onSave={handleSave}
                />
              ) : (
                <div>
                  <p className="text-sm text-[#888888] italic mb-4">
                    Something upstream is missing. Go back and finish setting, goal, and scope first.
                  </p>
                </div>
              )
            )}
          </div>

          {step !== "plan" && (
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24">
                <AttainLivePanel
                  state={state}
                  goals={goals}
                  content={content}
                  target={builtTarget}
                  attainment={attainment}
                  step={step}
                  valuesByGoal={valuesByGoal}
                  combined={combined}
                  activeGoal={activeBuildCaseGoal}
                  realizationPct={activeBuildCaseGoal ? (realizationByGoal[activeBuildCaseGoal] ?? 100) : 100}
                  onChangeRealization={(pct) => {
                    if (activeBuildCaseGoal) handleChangeRealization(activeBuildCaseGoal, pct);
                  }}
                  onNext={goNext}
                  nextDisabled={panelNext.disabled}
                  nextLabel={panelNext.label}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
