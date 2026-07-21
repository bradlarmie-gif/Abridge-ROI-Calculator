import { Target } from "lucide-react";
import AttainmentCurve, { USUAL_CEILING_PCT } from "@/components/attain/AttainmentCurve";
import { LEVERS, type LeverValues, type LeverContributionsResult } from "@/lib/attain/attainLevers";
import type { AttainState, GoalDef, SettingGoalContent } from "@/lib/attain/attainTypes";
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
  goal: GoalDef | null;
  content: SettingGoalContent | undefined;
  target: GoalTargetResult | null;
  attainment: AttainmentResult;
  step: AttainStepId;
  leverValues: LeverValues;
  contributions: LeverContributionsResult | null;
}

export default function AttainLivePanel({ state, goal, content, target, attainment, step, leverValues, contributions }: AttainLivePanelProps) {
  const settingLabel = state.setting ? SETTING_LABELS[state.setting] : null;
  const showBuiltTarget = goal && contributions && (step === "buildCase" || step === "commit");
  const movedLevers = goal ? LEVERS[goal.id].filter((l) => isLeverMoved(leverValues[l.id], l.realityStart)) : [];

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

        {goal && (
          <div className="flex justify-between items-center gap-2" data-testid="text-attain-panel-goal">
            <span className="text-sm text-white/50">Goal</span>
            <span className="text-sm font-semibold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: goal.pillBg }} />
              {goal.label}
            </span>
          </div>
        )}

        {state.scope.unitCount > 0 && (
          <div className="flex justify-between items-center gap-2" data-testid="text-attain-panel-scope">
            <span className="text-sm text-white/50">In scope</span>
            <span className="text-sm font-semibold text-white">{state.scope.unitCount.toLocaleString()}</span>
          </div>
        )}

        {showBuiltTarget && (
          <div className="pt-3 border-t border-white/10" data-testid="text-attain-panel-target">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Built from your decisions</p>
            <p className="font-abridge text-3xl text-[#EA2C00]">{formatCompact(contributions.totalMargin)}</p>
            <p className="text-xs text-white/50 mt-1">
              {contributions.totalMargin > 0 ? "Growing as you commit" : "Move a decision below to start building it"}
            </p>
          </div>
        )}

        {showBuiltTarget && movedLevers.length > 0 && (
          <div className="pt-3 border-t border-white/10 space-y-2" data-testid="list-attain-panel-decisions">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Decisions so far</p>
            {movedLevers.map((l) => {
              const pl = contributions?.perLever.find((p) => p.id === l.id);
              return (
                <div key={l.id} className="flex justify-between items-center gap-2 text-xs" data-testid={`row-attain-panel-decision-${l.id}`}>
                  <span className="text-white/70 truncate">{l.label}</span>
                  <span className="text-white font-semibold flex-shrink-0">{formatCompact(pl?.marginalMargin ?? 0)}</span>
                </div>
              );
            })}
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
    </div>
  );
}
