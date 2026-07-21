import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEVERS, defaultLeverValues, type LeverValues } from "@/lib/attain/attainLevers";
import type { MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
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

const ROLE_OPTIONS = [
  "Service-line chief",
  "Department leadership",
  "Unit leadership",
  "Ambulatory operations",
  "Access / referral ops",
  "Ops / staffing",
  "Revenue cycle / coding",
  "CDI + providers",
  "Billing",
  "Charge nurses / unit leads",
  "Rapid response / unit",
  "Department chiefs",
];

function isMoved(value: number | string[] | undefined, realityStart: number | string[]): boolean {
  if (Array.isArray(realityStart)) return Array.isArray(value) && value.length > 0;
  return typeof value === "number" && value !== realityStart;
}

export interface Commitment {
  owner: string;
  due: string;
}

interface StepCommitProps {
  goals: GoalId[];
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult | null;
  commitments: Record<string, Commitment>;
  onChangeCommitment: (goal: GoalId, leverId: string, patch: Partial<Commitment>) => void;
  /** The real step number in the current (dynamic) sequence - one build-case
   * page per selected goal means Commit's position shifts with goal count. */
  stepNumber: number;
}

export default function StepCommit({ goals, valuesByGoal, combined, commitments, onChangeCommitment, stepNumber }: StepCommitProps) {
  const groups = goals.map((goal) => {
    const values = valuesByGoal[goal] ?? defaultLeverValues(goal);
    const movedLevers = LEVERS[goal].filter((l) => isMoved(values[l.id], l.realityStart));
    const result = combined?.byGoal[goal];
    return { goal, movedLevers, result };
  });
  const totalMoved = groups.reduce((sum, g) => sum + g.movedLevers.length, 0);

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
          grouped by priority. Give each one a real owner and a real month, so the plan you're building is a set of
          commitments, not just a number.
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

          return (
            <div key={goal} className="mb-8" data-testid={`section-attain-commit-goal-${goal}`}>
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

              <div className="space-y-3">
                {movedLevers.map((lever, i) => {
                  const contribution = contributionFor(lever.id);
                  const commitment = commitments[`${goal}:${lever.id}`];
                  const owner = commitment?.owner ?? lever.ownerRole;
                  const due = commitment?.due ?? lever.defaultDue;
                  const roleOptions = Array.from(new Set([lever.ownerRole, ...ROLE_OPTIONS]));
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
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#1A1A1A]">{lever.label}</span>
                          </div>
                          <p className="text-xs text-[#8C8C8C] mt-1">
                            Worth{" "}
                            <span className="font-semibold text-[#EA2C00]">{formatCompact(contribution?.marginalMargin ?? 0)}</span>
                            {" · "}
                            {Math.round((contribution?.pctOfTotal ?? 0) * 100)}% of this priority
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                          <Select value={owner} onValueChange={(v) => onChangeCommitment(goal, lever.id, { owner: v })}>
                            <SelectTrigger className="h-9 w-[210px] text-xs bg-white" data-testid={`select-attain-commit-owner-${goal}-${lever.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select value={due} onValueChange={(v) => onChangeCommitment(goal, lever.id, { due: v })}>
                            <SelectTrigger className="h-9 w-[120px] text-xs bg-white" data-testid={`select-attain-commit-due-${goal}-${lever.id}`}>
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
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <div className="bg-[#F5F0EB] border-l-[3px] border-[#EA2C00] rounded-r-md p-4 mb-8 max-w-[620px]">
        <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">Why this matters</p>
        <p className="text-xs text-[#3A3A3A] leading-relaxed">
          The month you pick here is what the attainment curve on the final page steers against. A decision due in
          Month 2 is expected to be showing up by Month 2, not sitting untouched at the goal-owner review in Month 9.
        </p>
      </div>
    </div>
  );
}
