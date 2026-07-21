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
import { GOAL_CATALOG, getContent } from "@/lib/attain/attainGoals";
import { LEVERS, defaultLeverValues, computeLeverContributions, type LeverValues } from "@/lib/attain/attainLevers";
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

/** Presentation-only unit label for the built target's count figure — the
 * number itself always comes from `computeLeverContributions`, this just
 * names its unit for the given goal/setting. */
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

interface AttainFlowProps {
  onBackToJourney?: () => void;
}

export default function AttainFlow({ onBackToJourney }: AttainFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<AttainState>(DEFAULT_ATTAIN_STATE);
  const [leverValues, setLeverValues] = useState<LeverValues>({});
  const [commitments, setCommitments] = useState<Record<string, Commitment>>({});
  const [baselineOverrides, setBaselineOverrides] = useState<Record<number, string>>({});

  const step = STEP_ORDER[stepIndex];

  const updateState = useCallback((updates: Partial<AttainState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const goal = state.goal ? GOAL_CATALOG[state.goal] : null;
  const content = state.setting && state.goal ? getContent(state.setting, state.goal) : undefined;

  const handleSelectSetting = useCallback((setting: AttainSetting) => {
    setLeverValues({});
    setCommitments({});
    setBaselineOverrides({});
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

  const handleSelectGoal = useCallback((goalId: GoalId) => {
    setLeverValues(defaultLeverValues(goalId));
    setCommitments({});
    setBaselineOverrides({});
    setState((prev) => {
      const c = prev.setting ? getContent(prev.setting, goalId) : undefined;
      const totalMonths = parseTotalMonths(c?.goodHead);
      return {
        ...prev,
        goal: goalId,
        totalMonths,
        monthsElapsed: Math.round(totalMonths * 0.6),
        progressRatio: 1,
      };
    });
  }, []);

  const handleChangeScope = useCallback((scope: AttainScope) => {
    updateState({ scope });
  }, [updateState]);

  const handleChangeBaselineOverride = useCallback((index: number, value: string) => {
    setBaselineOverrides((prev) => ({ ...prev, [index]: value }));
  }, []);

  const handleChangeLeverValue = useCallback((leverId: string, value: number | string[]) => {
    setLeverValues((prev) => ({ ...prev, [leverId]: value }));
  }, []);

  const handleChangeCommitment = useCallback((leverId: string, patch: Partial<Commitment>) => {
    setCommitments((prev) => {
      const lever = state.goal ? LEVERS[state.goal].find((l) => l.id === leverId) : undefined;
      const base: Commitment = prev[leverId] ?? {
        owner: lever?.ownerRole ?? "",
        due: lever?.defaultDue ?? "Month 1",
      };
      return { ...prev, [leverId]: { ...base, ...patch } };
    });
  }, [state.goal]);

  const handleMonthsElapsedChange = useCallback((months: number) => {
    updateState({ monthsElapsed: months });
  }, [updateState]);

  // Every dollar figure downstream comes from this one computation: the sum
  // of each lever's delta off its own realityStart. See attainLevers.ts for
  // the contribution model.
  const contributions = useMemo(() => {
    if (!state.goal || !state.setting) return null;
    return computeLeverContributions(state.goal, state.setting, state.scope, leverValues);
  }, [state.goal, state.setting, state.scope, leverValues]);

  const builtTarget: GoalTargetResult | null = useMemo(() => {
    if (!state.goal || !state.setting || !contributions) return null;
    return {
      margin: contributions.totalMargin,
      count: contributions.totalCount,
      label: `${contributions.totalCount.toLocaleString()} ${countLabel(state.goal, state.setting)}`,
    };
  }, [state.goal, state.setting, contributions]);

  const movedLeverIds = useMemo(() => {
    if (!state.goal) return [] as string[];
    return LEVERS[state.goal].filter((l) => isLeverMoved(leverValues[l.id], l.realityStart)).map((l) => l.id);
  }, [state.goal, leverValues]);

  // Progress ratio (Task 4-7 replacement): instead of "fragile chain links
  // marked on track," the curve now steers against how much of the built
  // target has a commitment (owner + month) whose month has actually
  // arrived. A plan with nothing committed yet, or nothing due yet, drifts
  // toward "what usually happens"; as committed decisions come due, the
  // curve climbs back toward the plan's own line.
  useEffect(() => {
    if (!state.goal || !contributions) return;
    if (movedLeverIds.length === 0) {
      if (state.progressRatio !== 1) updateState({ progressRatio: 1 });
      return;
    }
    const levers = LEVERS[state.goal];
    const realizedWeight = contributions.perLever
      .filter((p) => movedLeverIds.includes(p.id))
      .reduce((sum, p) => {
        const lever = levers.find((l) => l.id === p.id);
        const due = commitments[p.id]?.due ?? lever?.defaultDue ?? "Month 1";
        return dueMonthNumber(due) <= state.monthsElapsed ? sum + p.pctOfTotal : sum;
      }, 0);
    const ratio = 0.4 + 0.6 * Math.min(1, Math.max(0, realizedWeight));
    if (Math.abs(ratio - state.progressRatio) > 0.001) {
      updateState({ progressRatio: ratio });
    }
  }, [state.goal, state.monthsElapsed, state.progressRatio, contributions, movedLeverIds, commitments, updateState]);

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
              <StepSetting selected={state.setting} onSelect={handleSelectSetting} onNext={goNext} />
            )}

            {step === "vision" && state.setting && (
              <StepVision setting={state.setting} selectedGoal={state.goal} onSelect={handleSelectGoal} onNext={goNext} />
            )}

            {step === "scope" && state.setting && (
              <StepScope
                setting={state.setting}
                scope={state.scope}
                onChange={handleChangeScope}
                content={content}
                overrides={baselineOverrides}
                onChangeOverride={handleChangeBaselineOverride}
                onNext={goNext}
              />
            )}

            {step === "buildCase" && state.setting && state.goal && (
              <StepBuildCase
                setting={state.setting}
                goal={state.goal}
                values={leverValues}
                contributions={contributions}
                onChange={handleChangeLeverValue}
                onNext={goNext}
              />
            )}

            {step === "commit" && state.goal && (
              <StepCommit
                goal={state.goal}
                values={leverValues}
                contributions={contributions}
                commitments={commitments}
                onChangeCommitment={handleChangeCommitment}
                onNext={goNext}
              />
            )}

            {step === "plan" && (
              goal && content && state.setting && builtTarget ? (
                <StepPlan
                  state={state}
                  goal={goal}
                  content={content}
                  target={builtTarget}
                  attainment={attainment}
                  leverValues={leverValues}
                  commitments={commitments}
                  baselineOverrides={baselineOverrides}
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
                  goal={goal}
                  content={content}
                  target={builtTarget}
                  attainment={attainment}
                  step={step}
                  leverValues={leverValues}
                  contributions={contributions}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
