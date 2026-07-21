import { useState } from "react";
import { Download, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import AttainmentCurve, { USUAL_CEILING_PCT } from "@/components/attain/AttainmentCurve";
import { LEVERS, defaultLeverValues, type Lever, type LeverValues, type LeverContribution, type MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { GOAL_CATALOG, getContent } from "@/lib/attain/attainGoals";
import type { AttainState, AttainSetting, GoalId, GoalDef, SettingGoalContent } from "@/lib/attain/attainTypes";
import type { GoalTargetResult, AttainmentResult } from "@/lib/attain/attainCalc";
import type { Commitment } from "./StepCommit";

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
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
  values: LeverValues,
  perLever: LeverContribution[] | undefined,
  commitments: Record<string, Commitment>,
): CommittedLever[] {
  return LEVERS[goal]
    .filter((l) => isMoved(values[l.id], l.realityStart))
    .map((l) => ({
      lever: l,
      contribution: perLever?.find((p) => p.id === l.id),
      owner: commitments[`${goal}:${l.id}`]?.owner ?? l.ownerRole,
      due: commitments[`${goal}:${l.id}`]?.due ?? l.defaultDue,
    }))
    .sort((a, b) => (b.contribution?.marginalMargin ?? 0) - (a.contribution?.marginalMargin ?? 0));
}

interface StepPlanProps {
  state: AttainState;
  setting: AttainSetting;
  goals: GoalId[];
  target: GoalTargetResult;
  attainment: AttainmentResult;
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult;
  commitments: Record<string, Commitment>;
  freedTimeSplit: number;
  onMonthsElapsedChange: (months: number) => void;
  /** The real step number in the current (dynamic) sequence - one build-case
   * page per selected goal means Your Plan's position shifts with goal
   * count. */
  stepNumber: number;
}

export default function StepPlan({
  state,
  setting,
  goals,
  target,
  attainment,
  valuesByGoal,
  combined,
  commitments,
  freedTimeSplit,
  onMonthsElapsedChange,
  stepNumber,
}: StepPlanProps) {
  const [orgName, setOrgName] = useState("");
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const hasFreedTimeConflict = goals.includes("access") && goals.includes("retention");
  const usualMargin = target.margin * (USUAL_CEILING_PCT / 100);
  const curveGoalLabel = `${formatCompact(target.margin)} · ${target.label}`;
  const curveUsualLabel = `~${formatCompact(usualMargin)}`;
  const remainingMonths = Math.max(0, state.totalMonths - state.monthsElapsed);
  const remainingMargin = Math.max(0, target.margin - attainment.marginToDate);
  const unitLabel = UNIT_LABEL[setting] ?? "units";

  // Every committed decision, per goal, sourced live from the same combined
  // engine result that built the total above — nothing here is invented.
  const allCommitted = goals.flatMap((goal) => {
    const values = valuesByGoal[goal] ?? defaultLeverValues(goal);
    const result = combined.byGoal[goal];
    return committedLeversFor(goal, values, result?.perLever, commitments).map((c) => ({ ...c, goal }));
  }).sort((a, b) => (b.contribution?.marginalMargin ?? 0) - (a.contribution?.marginalMargin ?? 0));

  const goalDefs = goals.map((g) => GOAL_CATALOG[g]);
  const planTitle = goalDefs.length === 1 ? goalDefs[0].label : goalDefs.map((g) => g.label).join(" + ");

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-1" data-testid="text-step-eyebrow">
            Step {stepNumber} · Your plan
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-black font-abridge uppercase tracking-tight" data-testid="text-step-title">
            The Value Attainment Plan
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" className="h-10 gap-2" data-testid="button-attain-save" onClick={() => { /* Save/share ships in a later task */ }}>
            <Save className="w-4 h-4" />
            Save
          </Button>
          <Button className="h-10 gap-2 bg-black hover:bg-black/90 text-white" data-testid="button-attain-download-pdf" onClick={() => { /* PDF export ships in a later task */ }}>
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* ============ SECTION 1 · COVER SUMMARY (combined) ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid="section-attain-cover">
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#8C8C8C] mb-2">Value Attainment Plan</p>
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

        <div className="flex flex-wrap gap-6 mb-4">
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[2.5px] text-[#B4B4B4] mb-1">Prepared for</p>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization"
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

        <div className="bg-[#1A1A1A] rounded-lg flex flex-wrap p-6 mb-4" data-testid="card-attain-plan-combined-hero">
          <div className="flex-1 min-w-[140px] px-3">
            <p className="font-abridge text-3xl text-[#EA2C00]">{formatCompact(target.margin)}</p>
            <p className="text-[8px] font-semibold uppercase tracking-[1.8px] text-white/55 mt-2">Combined contribution margin</p>
          </div>
          {goalDefs.map((g) => {
            const goalMargin = combined.byGoal[g.id]?.totalMargin ?? 0;
            return (
              <div key={g.id} className="flex-1 min-w-[140px] px-3">
                <p className="font-abridge text-3xl text-white">{formatCompact(goalMargin)}</p>
                <p className="text-[8px] font-semibold uppercase tracking-[1.8px] text-white/55 mt-2">{g.label}</p>
              </div>
            );
          })}
        </div>

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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="table-attain-plan-decisions">
              <thead>
                <tr>
                  {goalDefs.length > 1 && (
                    <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Priority</th>
                  )}
                  <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Decision</th>
                  <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Owner</th>
                  <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">By when</th>
                  <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6] text-right">Worth</th>
                </tr>
              </thead>
              <tbody>
                {allCommitted.map(({ goal, lever, contribution, owner, due }) => (
                  <tr key={`${goal}:${lever.id}`} data-testid={`row-attain-plan-decision-${goal}-${lever.id}`}>
                    {goalDefs.length > 1 && (
                      <td className="py-3 px-2 border-b border-[#F0ECE5] align-top">
                        <span
                          className="inline-block text-[8px] font-bold uppercase tracking-[1.2px] text-white px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: GOAL_CATALOG[goal].pillBg }}
                        >
                          {GOAL_CATALOG[goal].pill}
                        </span>
                      </td>
                    )}
                    <td className="py-3 px-2 border-b border-[#F0ECE5] align-top max-w-[280px]">
                      <p className="text-[11px] font-bold text-[#1A1A1A]">{lever.label}</p>
                      <p className="text-[9.5px] text-[#8C8C8C] mt-0.5 leading-relaxed">{lever.help}</p>
                    </td>
                    <td className="py-3 px-2 border-b border-[#F0ECE5] align-top text-[10.5px] text-[#3A3A3A]">{owner}</td>
                    <td className="py-3 px-2 border-b border-[#F0ECE5] align-top text-[10.5px] text-[#3A3A3A] whitespace-nowrap">{due}</td>
                    <td className="py-3 px-2 border-b border-[#F0ECE5] align-top text-right whitespace-nowrap">
                      <p className="text-[11px] font-bold text-[#EA2C00]">{formatCompact(contribution?.marginalMargin ?? 0)}</p>
                      <p className="text-[9px] text-[#8C8C8C]">{Math.round((contribution?.pctOfTotal ?? 0) * 100)}% of its priority</p>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="py-3 px-2 text-[10.5px] font-bold text-[#1A1A1A]" colSpan={goalDefs.length > 1 ? 4 : 3}>Total, contribution margin</td>
                  <td className="py-3 px-2 text-right">
                    <p className="font-abridge text-lg text-[#EA2C00]" data-testid="text-attain-plan-total-reconciled">{formatCompact(target.margin)}</p>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
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
          values={valuesByGoal[goal] ?? defaultLeverValues(goal)}
          result={combined.byGoal[goal]}
          commitments={commitments}
          unitCount={state.scope.unitCount}
          unitLabel={unitLabel}
          hasFreedTimeConflict={hasFreedTimeConflict}
          freedTimeSplit={freedTimeSplit}
        />
      ))}
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
  unitCount,
  unitLabel,
  hasFreedTimeConflict,
  freedTimeSplit,
}: PriorityDeepDiveProps) {
  if (!content) return null;

  const committedLevers = committedLeversFor(goal, values, result?.perLever, commitments);
  const goalMargin = result?.totalMargin ?? 0;
  const goalCount = result?.totalCount ?? 0;

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
            {committedLevers.length} of {LEVERS[goal].length} available decisions committed to this priority today.
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
