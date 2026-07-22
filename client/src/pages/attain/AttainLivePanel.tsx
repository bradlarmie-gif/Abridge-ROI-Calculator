import { Target, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import AttainmentCurve, { USUAL_CEILING_PCT } from "@/components/attain/AttainmentCurve";
import { leversFor, defaultLeverValues, type LeverValues, type MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
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

/** A small, quiet info tooltip - same house `Tooltip` primitive every other
 * Attain info-tip builds on (`AccessDecisionChain.tsx`'s `InfoTip`, etc.). */
function InfoTip({ text, testid }: { text: string; testid: string }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="text-white/40 hover:text-white/70 transition-colors cursor-help inline-flex" data-testid={testid}>
          <HelpCircle className="w-3 h-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
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
  /** The goal whose Build-the-case page is currently on screen, null on
   * every other step - this is the priority the compact "Attributed to
   * this plan" control below applies to. Moved here from Build the case's
   * own column (see StepBuildCase.tsx's former `RealizationRateControl`)
   * so it sits quietly under this priority's own running total instead of
   * looming as its own card in the decision flow. */
  activeGoal?: GoalId | null;
  /** This priority's realization/attribution rate, 0-100, default 100 -
   * only meaningful while `activeGoal` is set. See attainLevers.ts's
   * `applyRealization`. */
  realizationPct?: number;
  onChangeRealization?: (pct: number) => void;
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
  activeGoal = null,
  realizationPct = 100,
  onChangeRealization,
  onNext,
  nextDisabled = false,
  nextLabel = "Continue",
}: AttainLivePanelProps) {
  const settingLabel = state.setting ? SETTING_LABELS[state.setting] : null;
  const isBuildCaseStep = step.startsWith("buildCase:");
  const showBuiltTarget = goals.length > 0 && combined && (isBuildCaseStep || step === "commit");

  // Every moved decision across every selected goal, prefixed so a partner
  // with two priorities can tell at a glance which one a given decision
  // belongs to.
  //
  // `showDollar` decides whether a per-decision dollar is honest to show. A
  // gated ladder (access, retention, quality) produces ONE number: the rungs
  // MULTIPLY, so no single rung is independently "worth $X" - the engine
  // attributes the whole total to the one binding decision and $0 to the
  // rest, which would read as real decisions being worthless. So a goal whose
  // moved decisions carry the total on a single row is listed as plain STEPS,
  // with only the running total (above) carrying the dollar. A goal with two
  // or more dollar-bearing decisions is genuinely additive (revenue's
  // parallel paths), where a per-path dollar stays honest, so those keep it.
  const movedDecisions = goals.flatMap((goal) => {
    const values = valuesByGoal[goal] ?? defaultLeverValues(goal, state.setting ?? undefined);
    const perLever = combined?.byGoal[goal]?.perLever;
    const rows = leversFor(goal, state.setting ?? undefined)
      .filter((l) => isLeverMoved(values[l.id], l.realityStart))
      .map((l) => ({
        key: `${goal}:${l.id}`,
        goal,
        label: l.label,
        marginalMargin: perLever?.find((p) => p.id === l.id)?.marginalMargin ?? 0,
      }));
    // Access and retention are single converged gated ladders, so they read as
    // plain STEPS with the running total above carrying the one dollar.
    // Outpatient access carries the whole total on its one binding rung; ED
    // access splits one converged prize across a visit leg and an admission leg
    // that are MIN-gated together (not independent), so a per-decision dollar
    // there would read as two separate additive wins when they are one. And
    // retention's rows overlap multiplicatively toward one composite impact.
    // Only revenue's genuinely parallel, independently additive paths (and
    // quality's per-event lines) keep an honest per-decision dollar.
    const dollarBearing = rows.filter((r) => r.marginalMargin !== 0).length;
    // Capacity (nursing overtime) is a single converged gated ladder like
    // access/retention: the whole realized dollar sits on its one binding rung
    // (the conversion decision) and $0 on the rest, so it reads as plain STEPS
    // with the running total above carrying the one dollar.
    const isGatedLadder = goal === "access" || goal === "retention" || goal === "capacity";
    const showDollar = !isGatedLadder && dollarBearing > 1;
    return rows.map((r) => ({ ...r, showDollar }));
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

        {/* "In scope" only ever shows the partner's REAL baseline once a
            decision has actually put it in scope on Build the case - never
            merely because a setting was picked and a Starting-point
            default was prefilled. Before that, it reads as a plain
            placeholder, never a number nobody chose. */}
        {settingLabel && goals.length > 0 && (
          <div className="flex justify-between items-center gap-2" data-testid="text-attain-panel-scope">
            <span className="text-sm text-white/50">In scope</span>
            <span className="text-sm font-semibold text-white" data-testid="text-attain-panel-scope-value">
              {movedDecisions.length > 0 && state.scope.unitCount > 0 ? state.scope.unitCount.toLocaleString() : "Not set yet"}
            </span>
          </div>
        )}

        {showBuiltTarget && combined && (
          <div className="pt-3 border-t border-white/10" data-testid="text-attain-panel-target">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              {goals.length > 1 ? "Plan so far, combined" : "Plan so far"}
            </p>
            {/* A dollar figure only ever appears once at least one decision
                has actually been moved - a genuine $0 (e.g. capacity set
                but demand not yet, for Access) still prints as $0, since
                that is honestly what the chain has realized so far; only
                the "nothing touched yet" state gets the placeholder. */}
            <p className="font-abridge text-2xl text-[#EA2C00]" data-testid="text-attain-panel-target-value">
              {movedDecisions.length > 0 ? formatCompact(combined.combinedMargin) : "Not set yet"}
            </p>
            <p className="text-xs text-white/50 mt-1">
              {movedDecisions.length === 0
                ? "Move a decision below to start building it"
                : combined.combinedMargin > 0
                  ? "Growing as you commit"
                  : "Every decision counts, keep going, the dollar appears once the chain is complete"}
            </p>

            {/* This priority's OWN share of the combined total above - only
                worth calling out separately once there is more than one
                priority to tell apart; with a single goal this number is
                already the one printed above. */}
            {activeGoal && goals.length > 1 && (
              <div className="flex justify-between items-center gap-2 mt-3" data-testid={`text-attain-panel-priority-worth-${activeGoal}`}>
                <span className="text-xs text-white/50">{GOAL_CATALOG[activeGoal].label}, this priority</span>
                <span className="text-sm font-semibold text-white" data-testid={`text-attain-panel-priority-worth-value-${activeGoal}`}>
                  {movedDecisions.some((d) => d.goal === activeGoal)
                    ? formatCompact(combined.byGoal[activeGoal]?.totalMargin ?? 0)
                    : "Not set yet"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Realization / attribution - the share of this priority's outcome
            credited to this plan, only ever dialed DOWN from full credit.
            Homed here (moved off Build the case's own column, see
            StepBuildCase.tsx) so it sits quietly right under this
            priority's own running total rather than looming as its own
            card in the decision flow. */}
        {isBuildCaseStep && activeGoal && combined && onChangeRealization && (
          <div className="pt-3 border-t border-white/10" data-testid={`panel-attain-realization-${activeGoal}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                Attributed to this plan
                <InfoTip
                  text="The share of this outcome you attribute to this plan. Lower it when other efforts also move the number - it never adds credit, only removes it."
                  testid={`tooltip-attain-realization-${activeGoal}`}
                />
              </span>
              <span className="text-xs font-semibold text-white" data-testid={`text-attain-realization-value-${activeGoal}`}>
                {realizationPct}%
              </span>
            </div>
            <Slider
              value={[realizationPct]}
              onValueChange={(v) => onChangeRealization(v[0])}
              min={0}
              max={100}
              step={5}
              accent="coral"
              className="w-full"
              data-testid={`slider-attain-realization-${activeGoal}`}
            />
            <p className="text-[11px] text-white/40 mt-2" data-testid={`text-attain-realization-worth-${activeGoal}`}>
              Dial down when other efforts also move this number.
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
                {/* A per-decision dollar only where it is honest (see
                    `showDollar` above). For a single-number ladder the rungs
                    read as plain steps; the running total above carries the
                    one dollar. */}
                {d.showDollar && (
                  <span className="text-white font-semibold flex-shrink-0">{formatCompact(d.marginalMargin)}</span>
                )}
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
