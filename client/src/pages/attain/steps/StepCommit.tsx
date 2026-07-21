import { useState } from "react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberField } from "@/components/NumberField";
import { LEVERS, defaultLeverValues, type LeverValues } from "@/lib/attain/attainLevers";
import type { MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { leverNumericValue } from "@/lib/attain/attainProgress";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { GoalId } from "@/lib/attain/attainTypes";

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

const DUE_OPTIONS = ["Month 1", "Month 2", "Month 3", "Month 4", "Month 6", "Month 9", "Month 12"];

const CADENCE_OPTIONS = ["Weekly", "Biweekly", "Monthly"];

function isMoved(value: number | string[] | undefined, realityStart: number | string[]): boolean {
  if (Array.isArray(realityStart)) return Array.isArray(value) && value.length > 0;
  return typeof value === "number" && value !== realityStart;
}

/** The exec sponsor who owns a priority's outcome — sits above the decision
 * owners because they answer to this person for whether the outcome lands. */
export interface GoalOwner {
  name: string;
  title: string;
}

/** One committed decision's owner, date, signal, and starting point. `owner`
 * is intentionally allowed to be "" (no name typed yet, `lever.ownerRole` is
 * only ever shown as a placeholder hint) — every OTHER screen that reads a
 * commitment falls back to `lever.ownerRole` for display, so a blank name
 * never renders as blank there. */
export interface Commitment {
  owner: string;
  due: string;
  signal: string;
  baseline: number;
}

interface StepCommitProps {
  goals: GoalId[];
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult | null;
  commitments: Record<string, Commitment>;
  onChangeCommitment: (goal: GoalId, leverId: string, patch: Partial<Commitment>) => void;
  goalOwnerByPriority: Partial<Record<GoalId, GoalOwner>>;
  onChangeGoalOwner: (goal: GoalId, patch: Partial<GoalOwner>) => void;
  /** The real step number in the current (dynamic) sequence - one build-case
   * page per selected goal means Commit's position shifts with goal count. */
  stepNumber: number;
}

/** Small uppercase-label field wrapper, shared by every control in a
 * decision row so the four fields (owner, when, signal, baseline) read as
 * one consistent mini-form rather than four differently-styled controls. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">{label}</p>
      {children}
    </div>
  );
}

export default function StepCommit({
  goals,
  valuesByGoal,
  combined,
  commitments,
  onChangeCommitment,
  goalOwnerByPriority,
  onChangeGoalOwner,
  stepNumber,
}: StepCommitProps) {
  const [cadence, setCadence] = useState("Monthly");

  const groups = goals.map((goal) => {
    const values = valuesByGoal[goal] ?? defaultLeverValues(goal);
    const movedLevers = LEVERS[goal].filter((l) => isMoved(values[l.id], l.realityStart));
    const result = combined?.byGoal[goal];
    return { goal, movedLevers, result };
  });
  const totalMoved = groups.reduce((sum, g) => sum + g.movedLevers.length, 0);

  // Every distinct owner across every committed decision, falling back to
  // the lever's suggested role whenever no real name has been typed yet -
  // the seal always names someone, even before the partner has personalized
  // every row.
  const ownerLabels = Array.from(
    new Set(
      groups.flatMap(({ goal, movedLevers }) =>
        movedLevers.map((lever) => {
          const commitment = commitments[`${goal}:${lever.id}`];
          return commitment?.owner?.trim() || lever.ownerRole;
        }),
      ),
    ),
  );
  const ownerNames =
    ownerLabels.length === 0
      ? "a named owner"
      : ownerLabels.length <= 3
        ? ownerLabels.join(", ")
        : `${ownerLabels.slice(0, 3).join(", ")}, & ${ownerLabels.length - 3} more`;

  const activeGoals = groups.filter((g) => g.movedLevers.length > 0).map((g) => g.goal);
  const goalOwnerLabels = activeGoals.map((goal) => {
    const owner = goalOwnerByPriority[goal];
    const name = owner?.name?.trim();
    const title = owner?.title?.trim();
    if (name && title) return `${name} (${title})`;
    if (name) return name;
    if (title) return title;
    return `the ${GOAL_CATALOG[goal].label} owner`;
  });
  const goalOwnerNames = goalOwnerLabels.length > 0 ? goalOwnerLabels.join(" and ") : "the goal-owner";

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} · Who holds each decision?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Commit
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-step-teach">
          A decision without a name and a date is a hope. Every decision you moved on the last page shows up below,
          grouped by priority. Give each one a real owner, a real month, a signal to watch, and where that signal
          stands today, so the plan you're building is a set of commitments, not just a number.
        </p>
      </motion.div>

      {totalMoved === 0 ? (
        <div className="bg-[#F5F0EB] rounded-xl p-6 mb-8 max-w-[560px]" data-testid="text-attain-commit-empty">
          <p className="text-sm text-[#3A3A3A] leading-relaxed">
            You haven't moved any decisions yet, so there's nothing to commit to. Go back to Build the case and turn
            up one or two levers, then come back here to give them an owner and a date.
          </p>
        </div>
      ) : (
        groups.map(({ goal, movedLevers, result }) => {
          if (movedLevers.length === 0) return null;
          const goalDef = GOAL_CATALOG[goal];
          const contributionFor = (id: string) => result?.perLever.find((p) => p.id === id);
          const owner = goalOwnerByPriority[goal] ?? { name: "", title: "" };

          return (
            <div key={goal} className="mb-10" data-testid={`section-attain-commit-goal-${goal}`}>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
                  style={{ background: goalDef.pillBg }}
                >
                  {goalDef.pill}
                </span>
                <h2 className="text-sm font-bold text-[#1A1A1A]" data-testid={`text-attain-commit-goal-title-${goal}`}>
                  {goalDef.label}
                </h2>
              </div>

              {/* Goal-owner - the exec sponsor for this outcome. Sits above
                  the decisions because every decision-owner below answers
                  to this person for whether the outcome lands. */}
              <div
                className="rounded-lg border border-[#E7E0D6] bg-white p-4 mb-4"
                data-testid={`card-attain-goal-owner-${goal}`}
              >
                <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">
                  Who owns this outcome
                </p>
                <p className="text-[10.5px] text-[#8C8C8C] mb-3 leading-relaxed max-w-[520px]">
                  The decision-owners below answer to this person for whether {goalDef.label} actually lands.
                </p>
                <div className="flex flex-wrap gap-3">
                  <input
                    value={owner.name}
                    onChange={(e) => onChangeGoalOwner(goal, { name: e.target.value })}
                    placeholder="Name, e.g. Dr. A. Rivera"
                    className="h-9 min-w-[200px] flex-1 rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                    data-testid={`input-attain-goal-owner-name-${goal}`}
                  />
                  <input
                    value={owner.title}
                    onChange={(e) => onChangeGoalOwner(goal, { title: e.target.value })}
                    placeholder="Title / role, e.g. VP Revenue Cycle"
                    className="h-9 min-w-[200px] flex-1 rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                    data-testid={`input-attain-goal-owner-title-${goal}`}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {movedLevers.map((lever, i) => {
                  const contribution = contributionFor(lever.id);
                  const commitment = commitments[`${goal}:${lever.id}`];
                  const ownerName = commitment?.owner ?? "";
                  const due = commitment?.due ?? lever.defaultDue;
                  const signal = commitment?.signal ?? lever.signal;
                  const baseline = commitment?.baseline ?? leverNumericValue(lever.realityStart);
                  const dueOptions = Array.from(new Set([lever.defaultDue, ...DUE_OPTIONS]));

                  return (
                    <motion.div
                      key={lever.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * i }}
                      className="rounded-lg border border-[#EA2C00] bg-[#FFF6F3] p-4"
                      data-testid={`row-attain-commit-${goal}-${lever.id}`}
                    >
                      <div className="mb-3">
                        <span className="text-sm font-bold text-[#1A1A1A]">{lever.label}</span>
                        <p className="text-xs text-[#8C8C8C] mt-1">
                          Worth{" "}
                          <span className="font-semibold text-[#EA2C00]">{formatCompact(contribution?.marginalMargin ?? 0)}</span>
                          {" · "}
                          {Math.round((contribution?.pctOfTotal ?? 0) * 100)}% of this priority
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-[1fr_112px_1.6fr_150px] gap-3">
                        <Field label="Owner">
                          <input
                            value={ownerName}
                            onChange={(e) => onChangeCommitment(goal, lever.id, { owner: e.target.value })}
                            placeholder={lever.ownerRole}
                            className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                            data-testid={`input-attain-commit-owner-${goal}-${lever.id}`}
                          />
                        </Field>

                        <Field label="By when">
                          <Select value={due} onValueChange={(v) => onChangeCommitment(goal, lever.id, { due: v })}>
                            <SelectTrigger className="h-9 w-full text-xs bg-white" data-testid={`select-attain-commit-due-${goal}-${lever.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {dueOptions.map((d) => (
                                <SelectItem key={d} value={d} className="text-xs">
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field label="Signal to watch">
                          <input
                            value={signal}
                            onChange={(e) => onChangeCommitment(goal, lever.id, { signal: e.target.value })}
                            className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                            data-testid={`input-attain-commit-signal-${goal}-${lever.id}`}
                          />
                        </Field>

                        <Field label="Baseline today">
                          <div className="flex items-center gap-1.5">
                            <NumberField
                              value={baseline}
                              onValueChange={(v) => onChangeCommitment(goal, lever.id, { baseline: v })}
                              min={0}
                              className="h-9 w-full min-w-0 rounded-md border border-[#D8CFC4] bg-white px-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                              data-testid={`input-attain-commit-baseline-${goal}-${lever.id}`}
                            />
                            <span className="text-[9.5px] text-[#8C8C8C] whitespace-nowrap">{lever.unit}</span>
                          </div>
                        </Field>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {totalMoved > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6" data-testid="text-attain-commit-cadence">
            <p className="text-sm text-[#3A3A3A]">
              These get checked <b className="text-[#1A1A1A]">{cadence.toLowerCase()}</b>.
            </p>
            <Select value={cadence} onValueChange={setCadence}>
              <SelectTrigger className="h-8 w-[130px] text-xs bg-white" data-testid="select-attain-commit-cadence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCE_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-[#F5F0EB] border-l-[3px] border-[#EA2C00] rounded-r-md p-4 mb-6 max-w-[620px]">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">Why this matters</p>
            <p className="text-xs text-[#3A3A3A] leading-relaxed">
              The month you pick here is what the attainment curve on the next page steers against. A decision due in
              Month 2 is expected to be showing up by Month 2, not sitting untouched at the goal-owner review in
              Month 9.
            </p>
          </div>

          {/* The seal - a co-signing moment, not a form submission. Every
              figure in it is read straight off the state above: nothing
              here is invented. */}
          <div className="bg-[#1A1A1A] rounded-xl p-5 mb-4" data-testid="card-attain-commit-seal">
            <p className="text-[9px] font-bold uppercase tracking-wide text-white/40 mb-2">The commitment</p>
            <p className="text-[15px] text-white leading-relaxed" data-testid="text-attain-commit-seal">
              You're committing to <b className="text-[#EA2C00]">{totalMoved} decision{totalMoved === 1 ? "" : "s"}</b>,
              worth about <b className="text-[#EA2C00]">{formatCompact(combined?.combinedMargin ?? 0)}</b>, owned by{" "}
              <b className="text-white">{ownerNames}</b>, reviewed <b className="text-white">{cadence.toLowerCase()}</b>,
              under <b className="text-white">{goalOwnerNames}</b>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
