import { useState, useCallback, useMemo, useEffect } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import StepSetting from "./steps/StepSetting";
import StepVision from "./steps/StepVision";
import StepScope from "./steps/StepScope";
import StepAmbition from "./steps/StepAmbition";
import StepPath from "./steps/StepPath";
import StepBaseline from "./steps/StepBaseline";
import StepPlan from "./steps/StepPlan";
import AttainLivePanel from "./AttainLivePanel";
import {
  DEFAULT_ATTAIN_STATE,
  DEFAULT_ATTAIN_SCOPE,
  type AttainState,
  type AttainSetting,
  type AttainScope,
  type GoalId,
  type AmbitionKey,
} from "@/lib/attain/attainTypes";
import { GOAL_CATALOG, getContent } from "@/lib/attain/attainGoals";
import { computeGoalTarget, computeAttainment } from "@/lib/attain/attainCalc";

export type AttainStepId = "setting" | "vision" | "scope" | "ambition" | "path" | "baseline" | "plan";

export type LinkStatus = "onTrack" | "needsAction";
export interface ChainLinkEdit {
  owner: string;
  horizon: string;
  status: LinkStatus;
}

const STEP_ORDER: AttainStepId[] = ["setting", "vision", "scope", "ambition", "path", "baseline", "plan"];
const STEP_LABELS: Record<AttainStepId, string> = {
  setting: "Setting",
  vision: "Vision",
  scope: "Scope",
  ambition: "Ambition",
  path: "The Path",
  baseline: "Baseline",
  plan: "Your Plan",
};

const DEFAULT_TOTAL_MONTHS = 9;

function parseTotalMonths(goodHead: string | undefined): number {
  if (!goodHead) return DEFAULT_TOTAL_MONTHS;
  const match = goodHead.match(/(\d+)\s+months/);
  return match ? parseInt(match[1], 10) : DEFAULT_TOTAL_MONTHS;
}

interface AttainFlowProps {
  onBackToJourney?: () => void;
}

export default function AttainFlow({ onBackToJourney }: AttainFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<AttainState>(DEFAULT_ATTAIN_STATE);
  const [chainEdits, setChainEdits] = useState<Record<number, ChainLinkEdit>>({});
  const [baselineOverrides, setBaselineOverrides] = useState<Record<number, string>>({});

  const step = STEP_ORDER[stepIndex];

  const updateState = useCallback((updates: Partial<AttainState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const goal = state.goal ? GOAL_CATALOG[state.goal] : null;
  const content = state.setting && state.goal ? getContent(state.setting, state.goal) : undefined;

  const handleSelectSetting = useCallback((setting: AttainSetting) => {
    setChainEdits({});
    setBaselineOverrides({});
    setState((prev) => ({
      ...prev,
      setting,
      goal: null,
      scope: { ...DEFAULT_ATTAIN_SCOPE },
      ambitionKey: null,
      monthsElapsed: 0,
      totalMonths: DEFAULT_TOTAL_MONTHS,
      progressRatio: 1,
    }));
  }, []);

  const handleSelectGoal = useCallback((goalId: GoalId) => {
    setChainEdits({});
    setBaselineOverrides({});
    setState((prev) => ({
      ...prev,
      goal: goalId,
      ambitionKey: null,
      monthsElapsed: 0,
      totalMonths: DEFAULT_TOTAL_MONTHS,
      progressRatio: 1,
    }));
  }, []);

  const handleChangeScope = useCallback((scope: AttainScope) => {
    updateState({ scope });
  }, [updateState]);

  const handleSelectAmbition = useCallback((key: AmbitionKey) => {
    const c = state.setting && state.goal ? getContent(state.setting, state.goal) : undefined;
    const totalMonths = parseTotalMonths(c?.goodHead);
    updateState({ ambitionKey: key, totalMonths, monthsElapsed: Math.round(totalMonths * 0.6) });
  }, [state.setting, state.goal, updateState]);

  const handleChangeChainEdit = useCallback((n: number, edit: Partial<ChainLinkEdit>) => {
    setChainEdits((prev) => {
      const link = goal?.chain.find((l) => l.n === n);
      const base: ChainLinkEdit = prev[n] ?? {
        owner: link?.ownerRole ?? "",
        horizon: "Month 1-2",
        status: "needsAction",
      };
      return { ...prev, [n]: { ...base, ...edit } };
    });
  }, [goal]);

  const handleChangeBaselineOverride = useCallback((index: number, value: string) => {
    setBaselineOverrides((prev) => ({ ...prev, [index]: value }));
  }, []);

  const handleMonthsElapsedChange = useCallback((months: number) => {
    updateState({ monthsElapsed: months });
  }, [updateState]);

  // Progress ratio is driven by how many of the goal's fragile-middle links
  // the partner has marked "on track" on the Path step (Task 6). 0 fragile
  // links on track drifts the curve toward "what usually happens"; all of
  // them on track keeps it on the plan's own pace.
  useEffect(() => {
    if (!goal) return;
    const fragileLinks = goal.chain.filter((l) => l.fragile);
    if (fragileLinks.length === 0) return;
    const onTrack = fragileLinks.filter((l) => (chainEdits[l.n]?.status ?? "needsAction") === "onTrack").length;
    const ratio = 0.35 + (0.65 * onTrack) / fragileLinks.length;
    if (Math.abs(ratio - state.progressRatio) > 0.001) {
      updateState({ progressRatio: ratio });
    }
  }, [goal, chainEdits, state.progressRatio, updateState]);

  const target = useMemo(() => {
    if (!state.goal || !state.setting || !state.ambitionKey) return null;
    return computeGoalTarget(state.goal, state.setting, state.scope, state.ambitionKey);
  }, [state.goal, state.setting, state.scope, state.ambitionKey]);

  const attainment = useMemo(() => computeAttainment(state), [state]);

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
              <StepScope setting={state.setting} scope={state.scope} onChange={handleChangeScope} onNext={goNext} />
            )}

            {step === "ambition" && state.setting && state.goal && (
              <StepAmbition
                setting={state.setting}
                goal={state.goal}
                scope={state.scope}
                ambitionKey={state.ambitionKey}
                onSelect={handleSelectAmbition}
                onNext={goNext}
              />
            )}

            {step === "path" && goal && (
              <StepPath goal={goal} edits={chainEdits} onChangeEdit={handleChangeChainEdit} onNext={goNext} />
            )}

            {step === "baseline" && (
              <StepBaseline
                content={content}
                overrides={baselineOverrides}
                onChangeOverride={handleChangeBaselineOverride}
                onNext={goNext}
              />
            )}

            {step === "plan" && (
              goal && content && target ? (
                <StepPlan
                  state={state}
                  goal={goal}
                  content={content}
                  target={target}
                  attainment={attainment}
                  chainEdits={chainEdits}
                  baselineOverrides={baselineOverrides}
                  onMonthsElapsedChange={handleMonthsElapsedChange}
                />
              ) : (
                <div>
                  <p className="text-sm text-[#888888] italic mb-4">
                    Something upstream is missing. Go back and finish setting, goal, and ambition first.
                  </p>
                </div>
              )
            )}
          </div>

          {step !== "plan" && (
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24">
                <AttainLivePanel state={state} goal={goal} content={content} target={target} attainment={attainment} step={step} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
