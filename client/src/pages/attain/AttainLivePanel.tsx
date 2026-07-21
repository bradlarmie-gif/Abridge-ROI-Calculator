import { Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AttainmentCurve, { USUAL_CEILING_PCT } from "@/components/attain/AttainmentCurve";
import { LEVERS, defaultLeverValues, type LeverValues, type MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainState, GoalId, SettingGoalContent } from "@/lib/attain/attainTypes";
import type { GoalTargetResult, AttainmentResult } from "@/lib/attain/attainCalc";
import type { AttainStepId } from "./AttainFlow";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function isLeverMoved(value: number | string[] | undefined, realityStart: number | string[]): boolean {
  if (Array.isArray(realityStart)) return Array.isArray(value) && value.length > 0;
  return typeof value === "number" && value !== realityStart;
}

const SETTING_LABELS: Record<string, string> = { outpatient: "Outpatient", ed: "Emergency", inpatient: "Inpatient", nursing: "Nursing" };

interface AttainLivePanelProps {
  state: AttainState;
  goals: GoalId[];
  content: SettingGoalContent | undefined;
  target: GoalTargetResult | null;
  attainment: AttainmentResult;
  step: AttainStepId;
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult | null;
  /** The primary action for this step lives at the foot of this panel,
   * bottom-right, in Abridge coral, rather than a black pill at the bottom
   * of the page — one consistent home for "Continue" across the whole
   * flow. */
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}

export default function AttainLivePanel({
  state,
  goals,
  content,
  target,
  attainment,
  step,
  valuesByGoal,
  combined,
  onNext,
  nextDisabled = false,
  nextLabel = "Continue",
}: AttainLivePanelProps) {
  const settingLabel = state.setting ? SETTING_LABELS[state.setting] : null;
  const showBuiltTarget = goals.length > 0 && combined && (step === "buildCase" || step === "commit");

  // Every moved decision across every selected goal, prefixed so a partner
  // with two priorities can tell at a glance which one a given decision
  // belongs to.
  const movedDecisions = goals.flatMap((goal) => {
    const values = valuesByGoal[goal] ?? defaultLeverValues(goal);
    const perLever = combined?.byGoal[goal]?.perLever;
    return LEVERS[goal]
      .filter((l) => isLeverMoved(values[l.id], l.realityStart))
      .map((l) => ({
        key: `${goal}:${l.id}`,
        goal,
        label: l.label,
        marginalMargin: perLever?.find((p) => p.id === l.id)?.marginalMargin ?? 0,
      }));
  });

  return (
    <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden" data-testid="panel-attain-live">
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-[#EA2C00]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Your plan, forming</h3>
            <p className="text-xs text-white/50">Updates as you go</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {!settingLabel && (
          <p className="text-sm text-white/50" data-testid="text-attain-panel-empty">
            Pick a care setting to start building the plan.
          </p>
        )}

        {settingLabel && (
          <div className="flex justify-between items-center gap-2" data-testid="text-attain-panel-setting">
            <span className="text-sm text-white/50">Setting</span>
            <span className="text-sm font-semibold text-white">{settingLabel}</span>
          </div>
        )}

        {goals.length > 0 && (
          <div className="flex justify-between items-start gap-2" data-testid="text-attain-panel-goal">
            <span className="text-sm text-white/50 flex-shrink-0">{goals.length === 1 ? "Goal" : "Goals"}</span>
            <span className="flex flex-wrap justify-end gap-1.5">
              {goals.map((g) => {
                const goalDef = GOAL_CATALOG[g];
                return (
                  <span key={g} className="text-sm font-semibold text-white flex items-center gap-1.5" data-testid={`text-attain-panel-goal-${g}`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: goalDef.pillBg }} />
                    {goalDef.label}
                  </span>
                );
              })}
            </span>
          </div>
        )}

        {state.scope.unitCount > 0 && (
          <div className="flex justify-between items-center gap-2" data-testid="text-attain-panel-scope">
            <span className="text-sm text-white/50">In scope</span>
            <span className="text-sm font-semibold text-white">{state.scope.unitCount.toLocaleString()}</span>
          </div>
        )}

        {showBuiltTarget && combined && (
          <div className="pt-3 border-t border-white/10" data-testid="text-attain-panel-target">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              {goals.length > 1 ? "Plan so far, combined" : "Plan so far"}
            </p>
            <p className="font-abridge text-2xl text-[#EA2C00]">{formatCompact(combined.combinedMargin)}</p>
            <p className="text-xs text-white/50 mt-1">
              {combined.combinedMargin > 0 ? "Growing as you commit" : "Move a decision below to start building it"}
            </p>
          </div>
        )}

        {showBuiltTarget && movedDecisions.length > 0 && (
          <div className="pt-3 border-t border-white/10 space-y-2" data-testid="list-attain-panel-decisions">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Decisions so far</p>
            {movedDecisions.map((d) => (
              <div key={d.key} className="flex justify-between items-center gap-2 text-xs" data-testid={`row-attain-panel-decision-${d.key}`}>
                <span className="text-white/70 truncate">
                  {goals.length > 1 && <span className="text-white/40">{GOAL_CATALOG[d.goal].pill} · </span>}
                  {d.label}
                </span>
                <span className="text-white font-semibold flex-shrink-0">{formatCompact(d.marginalMargin)}</span>
              </div>
            ))}
          </div>
        )}

        {(step === "commit" || step === "plan") && target && target.margin > 0 && (
          <div className="pt-3 border-t border-white/10" data-testid="text-attain-panel-curve">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Closing the gap</p>
            <div className="bg-white rounded-lg p-2">
              <AttainmentCurve
                pct={attainment.pct}
                onPacePct={attainment.onPacePct}
                monthsElapsed={state.monthsElapsed}
                totalMonths={state.totalMonths}
                goalLabel={formatCompact(target.margin)}
                usualLabel={`~${formatCompact(target.margin * (USUAL_CEILING_PCT / 100))}`}
              />
            </div>
          </div>
        )}

        {content && (
          <div className="pt-3 border-t border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5">Why this plan works</p>
            <p className="text-[11px] text-white/60 leading-relaxed">{content.thesis1} {content.thesis2}</p>
          </div>
        )}
      </div>

      {/* Primary action lives at the foot of this panel, bottom-right, in
          Abridge coral — the one consistent home for "Continue" across
          every step of the flow. */}
      <div className="px-6 py-5 border-t border-white/10 flex justify-end">
        <Button
          onClick={onNext}
          disabled={nextDisabled}
          className={`h-11 px-6 rounded-full font-semibold text-sm transition-all ${
            nextDisabled
              ? "bg-white/10 text-white/30 cursor-not-allowed"
              : "bg-[#EA2C00] hover:bg-[#D42600] text-white"
          }`}
          data-testid="button-attain-continue"
        >
          {nextLabel}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
