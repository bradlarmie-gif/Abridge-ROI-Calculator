import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leversFor, defaultLeverValues, type Lever, type LeverValues } from "@/lib/attain/attainLevers";
import type { MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

const DUE_OPTIONS = ["Month 1", "Month 2", "Month 3", "Month 4", "Month 6", "Month 9", "Month 12"];

/** Every cadence a single signal can be checked on. Cadence now lives per
 * SIGNAL (Change 3), never as one global control for the whole plan — a
 * decision can watch one signal weekly and another quarterly at the same
 * time, which a single "these get checked monthly" control could never
 * express. */
export type SignalCadence = "weekly" | "biweekly" | "monthly" | "quarterly";

export const CADENCE_OPTIONS: { value: SignalCadence; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const CADENCE_LABEL: Record<SignalCadence, string> = {
  weekly: "weekly",
  biweekly: "biweekly",
  monthly: "monthly",
  quarterly: "quarterly",
};

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

/** One signal a decision's owner watches to know if it is actually moving.
 * `label` is plain and specific (pre-filled from the lever's own signal, or
 * a fragile-link signal off the goal's value chain — see
 * `defaultSignalsForLever` below), never invented from nothing. `baseline`
 * is captured as free text ("18 days", "62%") rather than a NumberField, so
 * a partner can write the value AND its unit in one natural pass; `unit` is
 * kept as its own field only so every other screen (the Progress tab) can
 * print "62%" instead of "62 " with a dangling space. `cadence` is this
 * signal's own check frequency — there is no plan-wide cadence anymore. */
export interface CommitmentSignal {
  id: string;
  label: string;
  baseline: string;
  unit: string;
  cadence: SignalCadence;
}

/** One committed decision's owner, date, and the signal(s) that tell its
 * owner whether it is actually moving. `owner` is intentionally allowed to
 * be "" (no name typed yet, `lever.ownerRole` is only ever shown as a
 * placeholder hint) — every OTHER screen that reads a commitment falls back
 * to `lever.ownerRole` for display, so a blank name never renders as blank
 * there. */
export interface Commitment {
  owner: string;
  due: string;
  signals: CommitmentSignal[];
}

/** Deterministic ids for a decision's PRE-FILLED default signals, so the
 * fallback shown before any real state exists never regenerates fresh ids
 * on every render (which would thrash React's reconciliation and drop
 * focus mid-keystroke). Signals added later via "+ Add a signal" get a
 * genuinely unique id instead — see AttainFlow's `handleAddSignal`, which
 * only runs once per click, not once per render. */
function defaultSignalId(goal: GoalId, leverId: string, index: number): string {
  return `${goal}:${leverId}:s${index}`;
}

/** 1-2 signals to pre-fill a freshly-committed decision with: the lever's
 * own specific signal (always), plus one signal off the goal's value chain
 * — the links the partner's own operations hold (everything past the two
 * Abridge-delivered links, see attainTypes.ts's `isAbridge`) are the
 * natural second thing to watch. Cycles through those partner-owned links
 * one per decision (round-robin by the lever's position in its goal's
 * list) so decisions in the same goal watch a variety of chain signals
 * rather than all repeating the same one. Never invents text — every
 * string here is read straight off `LEVERS` / `GOAL_CATALOG`. `setting` is
 * optional and only ever matters for revenue (inpatient's catalog differs
 * from outpatient/ED's, see `leversFor`) - every other goal's index lookup
 * is unaffected by it. */
export function defaultSignalsForLever(goal: GoalId, lever: Lever, setting?: AttainSetting): CommitmentSignal[] {
  const primary: CommitmentSignal = {
    id: defaultSignalId(goal, lever.id, 0),
    label: lever.signal,
    baseline: "",
    unit: lever.unit,
    cadence: "monthly",
  };

  const levers = leversFor(goal, setting);
  const leverIndex = Math.max(0, levers.findIndex((l) => l.id === lever.id));
  const partnerLinks = GOAL_CATALOG[goal].chain.filter((l) => !l.isAbridge);
  const pick = partnerLinks.length > 0 ? partnerLinks[leverIndex % partnerLinks.length] : undefined;

  if (!pick || pick.signal === primary.label) return [primary];

  const secondary: CommitmentSignal = {
    id: defaultSignalId(goal, lever.id, 1),
    label: pick.signal,
    baseline: "",
    unit: "",
    cadence: "monthly",
  };
  return [primary, secondary];
}

/** The full default commitment for a decision that has never been edited —
 * shared by AttainFlow (so every "materialize on first edit" handler starts
 * from the same shape) and this component's render fallback. */
export function defaultCommitmentFor(goal: GoalId, lever: Lever, setting?: AttainSetting): Commitment {
  return { owner: "", due: lever.defaultDue, signals: defaultSignalsForLever(goal, lever, setting) };
}

/** The plain-language "story" sentence a decision's card ends on:
 * "[Owner] owns this, due [month]. We watch [signal 1] (today: X, checked
 * monthly) and [signal 2] (today: Y, checked quarterly)." Every value
 * comes straight off the decision's own state — nothing here is invented. */
export function buildDecisionStory(ownerDisplay: string, due: string, signals: CommitmentSignal[]): string {
  const phrases = signals.map((sig) => {
    const label = sig.label.trim() || "a signal";
    const value = sig.baseline.trim();
    const unit = sig.unit.trim();
    const today = value ? `${value}${unit ? ` ${unit}` : ""}` : "not captured yet";
    return `${label} (today: ${today}, checked ${CADENCE_LABEL[sig.cadence]})`;
  });
  const joined =
    phrases.length === 0
      ? "nothing yet"
      : phrases.length === 1
        ? phrases[0]
        : `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
  return `${ownerDisplay} owns this, due ${due}. We watch ${joined}.`;
}

interface StepCommitProps {
  goals: GoalId[];
  /** Needed only because revenue's catalog differs by setting (outpatient/ED
   * three-path chain vs inpatient's own DRG/CDI model) - see `leversFor`. */
  setting: AttainSetting;
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult | null;
  commitments: Record<string, Commitment>;
  onChangeCommitment: (goal: GoalId, leverId: string, patch: Partial<Pick<Commitment, "owner" | "due">>) => void;
  onAddSignal: (goal: GoalId, leverId: string) => void;
  onRemoveSignal: (goal: GoalId, leverId: string, signalId: string) => void;
  onChangeSignal: (goal: GoalId, leverId: string, signalId: string, patch: Partial<CommitmentSignal>) => void;
  goalOwnerByPriority: Partial<Record<GoalId, GoalOwner>>;
  onChangeGoalOwner: (goal: GoalId, patch: Partial<GoalOwner>) => void;
  /** The real step number in the current (dynamic) sequence - one build-case
   * page per selected goal means Commit's position shifts with goal count. */
  stepNumber: number;
}

/** Small uppercase-label field wrapper, shared by every control in a
 * decision row so every field reads as one consistent mini-form rather
 * than differently-styled controls. */
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">{label}</p>
      {children}
    </div>
  );
}

export default function StepCommit({
  goals,
  setting,
  valuesByGoal,
  combined,
  commitments,
  onChangeCommitment,
  onAddSignal,
  onRemoveSignal,
  onChangeSignal,
  goalOwnerByPriority,
  onChangeGoalOwner,
  stepNumber,
}: StepCommitProps) {
  const groups = goals.map((goal) => {
    const values = valuesByGoal[goal] ?? defaultLeverValues(goal, setting);
    const movedLevers = leversFor(goal, setting).filter((l) => isMoved(values[l.id], l.realityStart));
    const result = combined?.byGoal[goal];
    return { goal, movedLevers, result };
  });
  const totalMoved = groups.reduce((sum, g) => sum + g.movedLevers.length, 0);

  const commitmentFor = (goal: GoalId, lever: Lever): Commitment =>
    commitments[`${goal}:${lever.id}`] ?? defaultCommitmentFor(goal, lever, setting);

  // Every distinct owner across every committed decision, falling back to
  // the lever's suggested role whenever no real name has been typed yet -
  // the seal always names someone, even before the partner has personalized
  // every row.
  const ownerLabels = Array.from(
    new Set(
      groups.flatMap(({ goal, movedLevers }) =>
        movedLevers.map((lever) => commitmentFor(goal, lever).owner.trim() || lever.ownerRole),
      ),
    ),
  );
  const ownerNames =
    ownerLabels.length === 0
      ? "a named owner"
      : ownerLabels.length <= 3
        ? ownerLabels.join(", ")
        : `${ownerLabels.slice(0, 3).join(", ")}, & ${ownerLabels.length - 3} more`;

  // Total signals being watched across every committed decision - stands in
  // for the old single global cadence in the seal's closing sentence, since
  // cadence is no longer one plan-wide number.
  const totalSignals = groups.reduce(
    (sum, { goal, movedLevers }) => sum + movedLevers.reduce((s, lever) => s + commitmentFor(goal, lever).signals.length, 0),
    0,
  );

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
          grouped by priority. Give each one a real owner, a real month, and the signal (or two) that tells that
          owner whether it is actually moving, along with where each signal stands today and how often it gets
          checked, so the plan you're building is a set of commitments, not just a number.
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

              <div className="space-y-4">
                {movedLevers.map((lever, i) => {
                  const contribution = contributionFor(lever.id);
                  const commitment = commitmentFor(goal, lever);
                  const ownerName = commitment.owner;
                  const due = commitment.due;
                  const signals = commitment.signals;
                  const dueOptions = Array.from(new Set([lever.defaultDue, ...DUE_OPTIONS]));
                  const ownerDisplay = ownerName.trim() || lever.ownerRole;
                  const story = buildDecisionStory(ownerDisplay, due, signals);

                  return (
                    <motion.div
                      key={lever.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * i }}
                      className="rounded-lg border border-[#EA2C00] bg-[#FFF6F3] p-5"
                      data-testid={`row-attain-commit-${goal}-${lever.id}`}
                    >
                      <div className="mb-4">
                        <span className="text-sm font-bold text-[#1A1A1A]">{lever.label}</span>
                        <p className="text-xs text-[#8C8C8C] mt-1">
                          Worth{" "}
                          <span className="font-semibold text-[#EA2C00]">{formatCompact(contribution?.marginalMargin ?? 0)}</span>
                          {" · "}
                          {Math.round((contribution?.pctOfTotal ?? 0) * 100)}% of this priority
                        </p>
                      </div>

                      {/* 1. Owner + by-when. */}
                      <div className="grid grid-cols-2 sm:grid-cols-[1fr_150px] gap-3 mb-4">
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
                      </div>

                      {/* 2 & 3. Signals to watch - a LIST, each with its own
                          baseline today and check cadence. */}
                      <div className="border-t border-[#F3C9BE] pt-3">
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">Signals to watch</p>
                          <button
                            type="button"
                            onClick={() => onAddSignal(goal, lever.id)}
                            className="text-[10px] font-semibold text-[#EA2C00] hover:underline"
                            data-testid={`button-attain-commit-add-signal-${goal}-${lever.id}`}
                          >
                            + Add a signal
                          </button>
                        </div>

                        <div className="space-y-2">
                          {signals.map((sig) => (
                            <div
                              key={sig.id}
                              className="grid grid-cols-2 sm:grid-cols-[1.5fr_0.85fr_0.65fr_0.85fr_24px] gap-2 items-end bg-white rounded-md border border-[#E7E0D6] p-2.5"
                              data-testid={`row-attain-commit-signal-${goal}-${lever.id}-${sig.id}`}
                            >
                              <Field label="Signal">
                                <input
                                  value={sig.label}
                                  onChange={(e) => onChangeSignal(goal, lever.id, sig.id, { label: e.target.value })}
                                  placeholder="What tells you it's moving"
                                  className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2 text-[11px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                                  data-testid={`input-attain-commit-signal-label-${goal}-${lever.id}-${sig.id}`}
                                />
                              </Field>

                              <Field label="Baseline today">
                                <input
                                  value={sig.baseline}
                                  onChange={(e) => onChangeSignal(goal, lever.id, sig.id, { baseline: e.target.value })}
                                  placeholder="e.g., 18"
                                  className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2 text-[11px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                                  data-testid={`input-attain-commit-signal-baseline-${goal}-${lever.id}-${sig.id}`}
                                />
                              </Field>

                              <Field label="Unit">
                                <input
                                  value={sig.unit}
                                  onChange={(e) => onChangeSignal(goal, lever.id, sig.id, { unit: e.target.value })}
                                  placeholder="e.g., days"
                                  className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2 text-[11px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                                  data-testid={`input-attain-commit-signal-unit-${goal}-${lever.id}-${sig.id}`}
                                />
                              </Field>

                              <Field label="Checked">
                                <Select
                                  value={sig.cadence}
                                  onValueChange={(v) => onChangeSignal(goal, lever.id, sig.id, { cadence: v as SignalCadence })}
                                >
                                  <SelectTrigger
                                    className="h-9 w-full text-[11px] bg-white"
                                    data-testid={`select-attain-commit-signal-cadence-${goal}-${lever.id}-${sig.id}`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CADENCE_OPTIONS.map((c) => (
                                      <SelectItem key={c.value} value={c.value} className="text-xs">
                                        {c.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>

                              <button
                                type="button"
                                onClick={() => onRemoveSignal(goal, lever.id, sig.id)}
                                disabled={signals.length <= 1}
                                title={signals.length <= 1 ? "Every decision needs at least one signal" : "Remove this signal"}
                                className="h-9 w-6 flex items-center justify-center text-[#B4B4B4] hover:text-[#EA2C00] disabled:opacity-30 disabled:cursor-not-allowed"
                                data-testid={`button-attain-commit-remove-signal-${goal}-${lever.id}-${sig.id}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* The story - the whole row read back as one plain
                          sentence, the "premium, story-like" payoff of the
                          structured fields above. */}
                      <p
                        className="text-[11px] text-[#3A3A3A] leading-relaxed mt-4 pt-3 border-t border-[#F3C9BE]"
                        data-testid={`text-attain-commit-story-${goal}-${lever.id}`}
                      >
                        {story}
                      </p>
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
          <div className="bg-[#F5F0EB] border-l-[3px] border-[#EA2C00] rounded-r-md p-4 mb-6 max-w-[620px]">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">Why this matters</p>
            <p className="text-xs text-[#3A3A3A] leading-relaxed">
              The month you pick here is what the attainment curve on the next page steers against. A decision due in
              Month 2 is expected to be showing up by Month 2, not sitting untouched at the goal-owner review in
              Month 9. Each signal's own cadence is when its owner actually looks, not when the whole plan gets
              reviewed.
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
              <b className="text-white">{ownerNames}</b>, watched across{" "}
              <b className="text-white">{totalSignals} signal{totalSignals === 1 ? "" : "s"}</b>, under{" "}
              <b className="text-white">{goalOwnerNames}</b>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
