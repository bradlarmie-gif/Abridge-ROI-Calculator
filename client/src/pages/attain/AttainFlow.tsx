import { useState, useCallback, useMemo, useEffect } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import StepSetting from "./steps/StepSetting";
import StepVision from "./steps/StepVision";
import StepScope from "./steps/StepScope";
import StepBuildCase from "./steps/StepBuildCase";
import StepCommit, { type Commitment } from "./steps/StepCommit";
import StepPlan from "./steps/StepPlan";
import AttainLivePanel from "./AttainLivePanel";
import {
  DEFAULT_ATTAIN_STATE,
  DEFAULT_ATTAIN_SCOPE,
  type AttainState,
  type AttainSetting,
  type AttainScope,
  type GoalId,
} from "@/lib/attain/attainTypes";
import { getContent } from "@/lib/attain/attainGoals";
import {
  LEVERS,
  defaultLeverValues,
  defaultBaseline,
  computeMultiGoalContributions,
  type AttainBaseline,
  type LeverValues,
  type MultiGoalContributionsResult,
} from "@/lib/attain/attainLevers";
import type { GoalTargetResult, AttainmentResult } from "@/lib/attain/attainCalc";

export type AttainStepId = "setting" | "vision" | "scope" | "buildCase" | "commit" | "plan";

const STEP_ORDER: AttainStepId[] = ["setting", "vision", "scope", "buildCase", "commit", "plan"];
const STEP_LABELS: Record<AttainStepId, string> = {
  setting: "Setting",
  vision: "Vision",
  scope: "Starting point",
  buildCase: "Build the case",
  commit: "Commit",
  plan: "Your Plan",
};

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
  // The partner's real operational baseline (providers/encounters/
  // utilization, or beds/FTEs/census/adoption for nursing) — collected once
  // on the Scope step and threaded into every lever's engine call from
  // here down. This is local state, not part of `AttainState`
  // (attainTypes.ts intentionally untouched), because it is purely an
  // engine input, not part of the plan's identity/progress bookkeeping.
  const [baseline, setBaseline] = useState<AttainBaseline>(defaultBaseline("outpatient"));
  // Only meaningful when both access and retention are selected — the % of
  // the one shared freed documentation hour routed to opening access
  // (schedule); the rest routes to protecting relief. See attainLevers.ts
  // computeMultiGoalContributions for why this prevents double-counting.
  const [freedTimeSplit, setFreedTimeSplit] = useState<number>(DEFAULT_FREED_TIME_SPLIT);

  const step = STEP_ORDER[stepIndex];

  const updateState = useCallback((updates: Partial<AttainState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // `state.goal` (singular, from attainTypes.ts, left unmodified) tracks the
  // FIRST selected goal only, kept in sync below purely so the existing
  // single-goal-shaped pieces of state (Setting/Scope content preview) keep
  // working unchanged. `goals` (plural, local to this component) is the
  // real source of truth for everything downstream of Vision.
  const primaryGoal = goals[0] ?? null;
  const content = state.setting && primaryGoal ? getContent(state.setting, primaryGoal) : undefined;

  const handleSelectSetting = useCallback((setting: AttainSetting) => {
    setGoals([]);
    setValuesByGoal({});
    setCommitments({});
    setBaseline(defaultBaseline(setting));
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

  const handleChangeCommitment = useCallback((goal: GoalId, leverId: string, patch: Partial<Commitment>) => {
    setCommitments((prev) => {
      const key = commitmentKey(goal, leverId);
      const lever = LEVERS[goal].find((l) => l.id === leverId);
      const base: Commitment = prev[key] ?? {
        owner: lever?.ownerRole ?? "",
        due: lever?.defaultDue ?? "Month 1",
      };
      return { ...prev, [key]: { ...base, ...patch } };
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
  // StepPlan's per-priority "scoped to N providers" line) in sync with the
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
    setStepIndex((i) => Math.min(STEP_ORDER.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
  // per-step button, so its placement never drifts step to step.
  const panelNext = useMemo((): { disabled: boolean; label: string } => {
    switch (step) {
      case "setting":
        return { disabled: !state.setting, label: "Continue" };
      case "vision":
        return { disabled: goals.length === 0, label: "Continue" };
      case "scope":
        return { disabled: !isBaselineValid, label: "Continue" };
      case "buildCase":
        return { disabled: false, label: "Continue to commit" };
      case "commit":
        return { disabled: false, label: "Continue to your plan" };
      default:
        return { disabled: false, label: "Continue" };
    }
  }, [step, state.setting, goals.length, isBaselineValid]);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="attain"
        currentStep={stepIndex + 1}
        totalSteps={STEP_ORDER.length}
        stepName={STEP_LABELS[step]}
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

            {step === "buildCase" && state.setting && goals.length > 0 && (
              <StepBuildCase
                setting={state.setting}
                baseline={baseline}
                goals={goals}
                valuesByGoal={valuesByGoal}
                combined={combined}
                freedTimeSplit={freedTimeSplit}
                onChangeFreedTimeSplit={handleFreedTimeSplitChange}
                onChangeLeverValue={handleChangeLeverValue}
              />
            )}

            {step === "commit" && goals.length > 0 && (
              <StepCommit
                goals={goals}
                valuesByGoal={valuesByGoal}
                combined={combined}
                commitments={commitments}
                onChangeCommitment={handleChangeCommitment}
              />
            )}

            {step === "plan" && (
              goals.length > 0 && state.setting && builtTarget && combined ? (
                <StepPlan
                  state={state}
                  setting={state.setting}
                  goals={goals}
                  target={builtTarget}
                  attainment={attainment}
                  valuesByGoal={valuesByGoal}
                  combined={combined}
                  commitments={commitments}
                  freedTimeSplit={freedTimeSplit}
                  onMonthsElapsedChange={handleMonthsElapsedChange}
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
