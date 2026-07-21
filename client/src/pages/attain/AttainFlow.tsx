import { useState, useCallback, useMemo, useEffect } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import StepSetting from "./steps/StepSetting";
import StepVision from "./steps/StepVision";
import StepScope from "./steps/StepScope";
import StepBuildCase from "./steps/StepBuildCase";
import StepCommit, {
  defaultCommitmentFor,
  type Commitment,
  type CommitmentSignal,
  type GoalOwner,
} from "./steps/StepCommit";
import StepAttainment from "./steps/StepAttainment";
import AttainLivePanel from "./AttainLivePanel";
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
  LEVERS,
  defaultLeverValues,
  computeMultiGoalContributions,
  type AttainBaseline,
  type LeverValues,
  type MultiGoalContributionsResult,
} from "@/lib/attain/attainLevers";
import { parseSignalBaseline, todayISODate, type ProgressEntry } from "@/lib/attain/attainProgress";
import type { GoalTargetResult, AttainmentResult } from "@/lib/attain/attainCalc";

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
    case "commit": return "Commit";
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
      return setting === "inpatient" ? "cases/queries addressed/year" : "wRVUs captured/year";
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
}

export default function AttainFlow({ onBackToJourney }: AttainFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<AttainState>(DEFAULT_ATTAIN_STATE);
  // One or more goals can be in play at once (the whole point of this
  // task). `valuesByGoal` and `commitments` are keyed per goal so two
  // goals' decisions never collide, even when (as with access/retention)
  // they share a lever id naming convention.
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [valuesByGoal, setValuesByGoal] = useState<Partial<Record<GoalId, LeverValues>>>({});
  const [commitments, setCommitments] = useState<Record<string, Commitment>>({});
  // The executive sponsor for EACH selected priority's outcome - collected
  // once per priority on Commit, above that priority's decisions, since
  // every decision-owner answers to this person for whether the outcome
  // lands. Local state, same reasoning as `commitments` below: this is
  // plan-authoring bookkeeping, not part of the locked `attainTypes.ts`
  // engine shapes.
  const [goalOwnerByPriority, setGoalOwnerByPriority] = useState<Partial<Record<GoalId, GoalOwner>>>({});
  // Attainment hub "Progress" tab state: a dated log per committed SIGNAL
  // (key = `${goal}:${leverId}:${signalId}`) — one seed entry carrying the
  // baseline, dated the day the decision was first committed, then one more
  // appended every time the partner "logs an update" (see
  // `handleLogProgressUpdate`). `current` for any signal is always the
  // latest entry's value (see attainProgress.ts's `currentValueFromEntries`)
  // — there is no separately-edited "current" field anymore.
  //
  // This is intentionally LOCAL/SESSION state only - reloading the page or
  // returning tomorrow resets every log back to empty (which reseeds from
  // the baseline again, see the effect below). True cross-session
  // persistence (so a dated entry logged today is still there next month,
  // for the EBR) needs the save/backend layer, which is out of scope for
  // this task; when that lands, this is the state to lift into it.
  const [progressEntries, setProgressEntries] = useState<Record<string, ProgressEntry[]>>({});
  // The partner's real operational baseline (providers/encounters/
  // utilization, or beds/FTEs/census/adoption for nursing) — collected once
  // on the Scope step and threaded into every lever's engine call from
  // here down. This is local state, not part of `AttainState`
  // (attainTypes.ts intentionally untouched), because it is purely an
  // engine input, not part of the plan's identity/progress bookkeeping.
  //
  // Starts genuinely EMPTY (`{}`), never a prefilled benchmark — the Scope
  // step's fields show only a placeholder example ("e.g., 40") until the
  // partner types their own number. Every lever below already treats a
  // missing field as 0 (see attainLevers.ts / attainAccess.ts's per-function
  // fallbacks), so capacity and dollars simply stay at $0 until the real
  // numbers land here; nothing downstream can NaN or crash on a blank field.
  const [baseline, setBaseline] = useState<AttainBaseline>({});
  // Only meaningful when both access and retention are selected — the % of
  // the one shared freed documentation hour routed to opening access
  // (schedule); the rest routes to protecting relief. See attainLevers.ts
  // computeMultiGoalContributions for why this prevents double-counting.
  const [freedTimeSplit, setFreedTimeSplit] = useState<number>(DEFAULT_FREED_TIME_SPLIT);

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
    setValuesByGoal((prev) => (prev[goalId] ? prev : { ...prev, [goalId]: defaultLeverValues(goalId) }));
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
  }, [goals]);

  const handleChangeBaseline = useCallback((patch: Partial<AttainBaseline>) => {
    setBaseline((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleChangeLeverValue = useCallback((goal: GoalId, leverId: string, value: number | string[]) => {
    setValuesByGoal((prev) => ({
      ...prev,
      [goal]: { ...(prev[goal] ?? defaultLeverValues(goal)), [leverId]: value },
    }));
  }, []);

  // `owner`/`due` deliberately default to "" / the lever's own `defaultDue`
  // via `defaultCommitmentFor` (not a placeholder-looking real value) - the
  // owner ROLE is only ever a placeholder hint on Commit's owner input,
  // never a value that reads as if a real name were already typed. Every
  // handler below materializes a decision's full commitment (owner, due,
  // AND its pre-filled signals) the first time it is touched, from that one
  // shared default builder, so every screen that reads `commitments[key]`
  // sees the same shape whether or not the partner has edited it yet.
  const fallbackCommitment = useCallback((goal: GoalId, leverId: string): Commitment => {
    const lever = LEVERS[goal].find((l) => l.id === leverId);
    return lever ? defaultCommitmentFor(goal, lever) : { owner: "", due: "Month 1", signals: [] };
  }, []);

  const handleChangeCommitment = useCallback((goal: GoalId, leverId: string, patch: Partial<Pick<Commitment, "owner" | "due">>) => {
    setCommitments((prev) => {
      const key = commitmentKey(goal, leverId);
      const base = prev[key] ?? fallbackCommitment(goal, leverId);
      return { ...prev, [key]: { ...base, ...patch } };
    });
  }, [fallbackCommitment]);

  const handleAddSignal = useCallback((goal: GoalId, leverId: string) => {
    setCommitments((prev) => {
      const key = commitmentKey(goal, leverId);
      const base = prev[key] ?? fallbackCommitment(goal, leverId);
      const lever = LEVERS[goal].find((l) => l.id === leverId);
      // A genuinely unique id, safe here because this only runs once per
      // click (an imperative event handler), never once per render - see
      // `defaultSignalsForLever`'s comment on why ITS ids must stay
      // deterministic instead.
      const newSignal: CommitmentSignal = {
        id: `${key}:added-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: "",
        baseline: "",
        unit: lever?.unit ?? "",
        cadence: "monthly",
      };
      return { ...prev, [key]: { ...base, signals: [...base.signals, newSignal] } };
    });
  }, [fallbackCommitment]);

  const handleRemoveSignal = useCallback((goal: GoalId, leverId: string, signalId: string) => {
    setCommitments((prev) => {
      const key = commitmentKey(goal, leverId);
      const base = prev[key] ?? fallbackCommitment(goal, leverId);
      // Never let a decision drop to zero signals - the row above already
      // disables the remove button at 1, this is the state-layer backstop.
      if (base.signals.length <= 1) return prev;
      return { ...prev, [key]: { ...base, signals: base.signals.filter((s) => s.id !== signalId) } };
    });
  }, [fallbackCommitment]);

  const handleChangeSignal = useCallback((goal: GoalId, leverId: string, signalId: string, patch: Partial<CommitmentSignal>) => {
    setCommitments((prev) => {
      const key = commitmentKey(goal, leverId);
      const base = prev[key] ?? fallbackCommitment(goal, leverId);
      return {
        ...prev,
        [key]: { ...base, signals: base.signals.map((s) => (s.id === signalId ? { ...s, ...patch } : s)) },
      };
    });
  }, [fallbackCommitment]);

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
      const values = valuesByGoal[g] ?? defaultLeverValues(g);
      for (const lever of LEVERS[g]) {
        if (!isLeverMoved(values[lever.id], lever.realityStart)) continue;
        const declKey = commitmentKey(g, lever.id);
        const commitment = commitments[declKey] ?? fallbackCommitment(g, lever.id);
        const signals = commitment.signals.length > 0 ? commitment.signals : fallbackCommitment(g, lever.id).signals;
        for (const sig of signals) {
          out.push({ key: `${declKey}:${sig.id}`, baseline: parseSignalBaseline(sig.baseline) });
        }
      }
    }
    return out;
  }, [goals, valuesByGoal, commitments, fallbackCommitment]);

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

  // Every dollar figure downstream comes from this one computation: each
  // goal's own delta off its own realityStart, combined once with the
  // freed-time hour split (not double-counted) when access+retention are
  // both in play. See attainLevers.ts computeMultiGoalContributions.
  const combined: MultiGoalContributionsResult | null = useMemo(() => {
    if (goals.length === 0 || !state.setting) return null;
    return computeMultiGoalContributions(goals, state.setting, baseline, valuesByGoal, freedTimeSplit);
  }, [goals, state.setting, baseline, valuesByGoal, freedTimeSplit]);

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
      const values = valuesByGoal[g] ?? defaultLeverValues(g);
      for (const lever of LEVERS[g]) {
        if (isLeverMoved(values[lever.id], lever.realityStart)) out.push(commitmentKey(g, lever.id));
      }
    }
    return out;
  }, [goals, valuesByGoal]);

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
      for (const lever of LEVERS[g]) {
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
  }, [goals, state.monthsElapsed, state.progressRatio, combined, movedLeverKeys, commitments, updateState]);

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
        label: nextGoal ? `Continue to ${GOAL_CATALOG[nextGoal].label}` : "Continue to commit",
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
        <div className="flex flex-col lg:flex-row gap-10">
          <div className={`flex-1 min-w-0 ${step === "plan" ? "max-w-[820px]" : "max-w-[700px]"}`}>
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
                values={valuesByGoal[activeBuildCaseGoal] ?? defaultLeverValues(activeBuildCaseGoal)}
                combined={combined}
                freedTimeSplit={freedTimeSplit}
                onChangeFreedTimeSplit={handleFreedTimeSplitChange}
                onChangeLeverValue={handleChangeLeverValue}
                stepNumber={stepIndex + 1}
                totalSteps={stepOrder.length}
              />
            )}

            {step === "commit" && goals.length > 0 && (
              <StepCommit
                goals={goals}
                valuesByGoal={valuesByGoal}
                combined={combined}
                commitments={commitments}
                onChangeCommitment={handleChangeCommitment}
                onAddSignal={handleAddSignal}
                onRemoveSignal={handleRemoveSignal}
                onChangeSignal={handleChangeSignal}
                goalOwnerByPriority={goalOwnerByPriority}
                onChangeGoalOwner={handleChangeGoalOwner}
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
                  progressEntries={progressEntries}
                  onLogProgressUpdate={handleLogProgressUpdate}
                  onMonthsElapsedChange={handleMonthsElapsedChange}
                  stepNumber={stepIndex + 1}
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
