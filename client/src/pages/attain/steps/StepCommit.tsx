import { useState } from "react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leversFor, defaultLeverValues, requiredSignalLabel, type Lever, type LeverValues } from "@/lib/attain/attainLevers";
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

/** How often the WHOLE plan gets reviewed — one control for every committed
 * decision, not a per-signal setting. The room's feedback on the old Commit
 * was that a per-signal cadence control (multiplied across every signal on
 * every decision) was itself part of the wall of near-identical fields;
 * a single plan-level cadence is what Progress's "next check due" is
 * actually derived from now (see AttainFlow's `planCadence`). */
export type SignalCadence = "weekly" | "biweekly" | "monthly" | "quarterly";

export const CADENCE_OPTIONS: { value: SignalCadence; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

export const DEFAULT_PLAN_CADENCE: SignalCadence = "monthly";

export const CADENCE_LABEL: Record<SignalCadence, string> = {
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
 * `label` is plain and specific — for the REQUIRED signal it is pinned to
 * the decision's own designated proof-signal (`requiredSignalLabel`, see
 * attainLevers.ts); for an OPTIONAL signal it is picked from the same
 * lever's curated `signalOptions`, or typed via Custom. `baseline` is
 * captured as free text ("18 days", "62%") rather than a NumberField, so a
 * partner can write the value AND its unit in one natural pass; `unit` is
 * kept as its own field only so every other screen (the Progress tab) can
 * print "62%" instead of "62 " with a dangling space. There is no per-signal
 * cadence anymore — see `SignalCadence`'s doc: cadence is one plan-level
 * control now. */
export interface CommitmentSignal {
  id: string;
  label: string;
  baseline: string;
  unit: string;
}

/** One committed decision's owner, date, its ONE required signal (the
 * single best proof this decision is working, always present, with its own
 * baseline-today), and any OPTIONAL signals a partner has chosen to add on
 * top (empty by default — see Commit's "+ Add a signal (optional)"). `owner`
 * is intentionally allowed to be "" (no name typed yet, `lever.ownerRole` is
 * only ever shown as a placeholder hint) — every OTHER screen that reads a
 * commitment falls back to `lever.ownerRole` for display, so a blank name
 * never renders as blank there. */
export interface Commitment {
  owner: string;
  due: string;
  requiredSignal: CommitmentSignal;
  optionalSignals: CommitmentSignal[];
}

/** Deterministic id for a decision's pre-filled required signal, so the
 * fallback shown before any real state exists never regenerates a fresh id
 * on every render (which would thrash React's reconciliation and drop focus
 * mid-keystroke). Optional signals added later via "+ Add a signal" get a
 * genuinely unique id instead — see AttainFlow's `handleAddOptionalSignal`,
 * which only runs once per click, not once per render. */
function requiredSignalId(goal: GoalId, leverId: string): string {
  return `${goal}:${leverId}:required`;
}

/** The pre-filled required signal for a freshly-committed decision — always
 * this decision's own designated proof-signal (`requiredSignalLabel`), never
 * invented text. */
function defaultRequiredSignalFor(goal: GoalId, lever: Lever): CommitmentSignal {
  return {
    id: requiredSignalId(goal, lever.id),
    label: requiredSignalLabel(lever),
    baseline: "",
    unit: lever.unit,
  };
}

/** The full default commitment for a decision that has never been edited —
 * shared by AttainFlow (so every "materialize on first edit" handler starts
 * from the same shape) and this component's render fallback. Starts with
 * exactly one (required) signal; optional signals start empty, never
 * pre-populated, so a fresh decision reads as ONE thing to track, not a
 * pre-filled list. */
export function defaultCommitmentFor(goal: GoalId, lever: Lever, _setting?: AttainSetting): Commitment {
  return { owner: "", due: lever.defaultDue, requiredSignal: defaultRequiredSignalFor(goal, lever), optionalSignals: [] };
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
  /** Edits the ONE required signal's baseline/unit - its label is fixed to
   * this decision's designated proof-signal, never re-picked from a Select
   * (see `requiredSignalLabel`), so this can only ever touch baseline/unit. */
  onChangeRequiredSignal: (goal: GoalId, leverId: string, patch: Partial<Pick<CommitmentSignal, "baseline" | "unit">>) => void;
  onAddOptionalSignal: (goal: GoalId, leverId: string) => void;
  onRemoveOptionalSignal: (goal: GoalId, leverId: string, signalId: string) => void;
  onChangeOptionalSignal: (goal: GoalId, leverId: string, signalId: string, patch: Partial<CommitmentSignal>) => void;
  goalOwnerByPriority: Partial<Record<GoalId, GoalOwner>>;
  onChangeGoalOwner: (goal: GoalId, patch: Partial<GoalOwner>) => void;
  /** ONE plan-wide review cadence — replaces the old per-signal cadence
   * control. Editable once here; Progress's "next check due" is derived
   * straight off this value (see attainProgress.ts's `nextCheckDueDate`). */
  planCadence: SignalCadence;
  onChangePlanCadence: (cadence: SignalCadence) => void;
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

/** Sentinel Select value for "Custom..." - never a real owner-role or signal
 * string, so it can't collide with a curated option or with free text a
 * partner actually types. */
const CUSTOM_VALUE = "__custom__";

/** We suggest, they confirm or override - the shared control behind both
 * Change 2 (Owner) and Change 3 (Signal). Shows a Select pre-loaded with
 * this decision's own curated options (always headed by its default, so the
 * pre-selected value matches what used to be a placeholder hint), plus a
 * "Custom..." item that reveals a free-text input below for a specific
 * person, title, or signal the curated list doesn't cover. `value` stays a
 * plain string the whole time (the stored shape never changes) - "custom
 * mode" is purely local UI state, re-derived correctly on mount from
 * whether `value` already matches one of `options` (so a saved plan with a
 * custom owner/signal reopens straight into the right mode). Switching back
 * to a curated option from custom mode hides the text input again and
 * writes that option's text straight into `value`. */
function CuratedSelectField({
  value,
  options,
  onChange,
  customPlaceholder,
  triggerClassName,
  triggerTestId,
  customOptionTestId,
  customInputTestId,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  customPlaceholder: string;
  triggerClassName?: string;
  triggerTestId: string;
  customOptionTestId: string;
  customInputTestId: string;
}) {
  const trimmed = value.trim();
  const [custom, setCustom] = useState(() => trimmed !== "" && !options.includes(trimmed));
  const selectValue = custom ? CUSTOM_VALUE : trimmed || options[0];

  return (
    <div className="min-w-0">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === CUSTOM_VALUE) {
            setCustom(true);
            return;
          }
          setCustom(false);
          onChange(v);
        }}
      >
        <SelectTrigger className={triggerClassName ?? "h-9 w-full text-xs bg-white"} data-testid={triggerTestId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs whitespace-normal break-words max-w-[360px]">
              {opt}
            </SelectItem>
          ))}
          <SelectItem
            value={CUSTOM_VALUE}
            className="text-xs font-semibold text-[#EA2C00]"
            data-testid={customOptionTestId}
          >
            Custom...
          </SelectItem>
        </SelectContent>
      </Select>
      {custom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={customPlaceholder}
          className="mt-2 h-9 w-full min-w-0 rounded-md border border-[#D8CFC4] bg-white px-2.5 text-xs text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
          data-testid={customInputTestId}
        />
      )}
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
  onChangeRequiredSignal,
  onAddOptionalSignal,
  onRemoveOptionalSignal,
  onChangeOptionalSignal,
  goalOwnerByPriority,
  onChangeGoalOwner,
  planCadence,
  onChangePlanCadence,
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

  // Every decision, in the exact order a rep should ask about it, numbered
  // once across the WHOLE page (not restarted per priority) — this is what
  // lets Commit read as a script: "ask about these, in this order," not a
  // wall of interchangeable boxes with no read order.
  const orderedKeys = groups.flatMap(({ goal, movedLevers }) => movedLevers.map((lever) => `${goal}:${lever.id}`));
  const decisionNumber = new Map(orderedKeys.map((key, i) => [key, i + 1]));

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

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} · Who holds each decision?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Planning
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-step-teach">
          A decision without a name and a date is a hope. Every decision you moved on the last page shows up below,
          numbered in the order to ask about it. Give each one a real owner, a real month, and the ONE signal that
          tells its owner whether it is actually moving, along with where that signal stands today. Everything else
          is optional.
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
                  to this person for whether the outcome lands. How often
                  the whole plan gets reviewed is THIS person's call, so
                  the plan-wide cadence control sits right next to their
                  name here rather than in a separate card lower on the
                  page - "who owns this outcome, and how often we check
                  on it" reads as one decision. The cadence itself is
                  still a single plan-wide value (see AttainFlow's
                  `planCadence`); this is the same control, just relocated,
                  and repeated per priority only so it reads next to
                  whichever owner is on screen. */}
              <div
                className="rounded-lg border border-[#E7E0D6] bg-white p-4 mb-4"
                data-testid={`card-attain-goal-owner-${goal}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">
                    Who owns this outcome
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0" data-testid={`card-attain-commit-plan-cadence-${goal}`}>
                    <label
                      htmlFor={`select-attain-commit-plan-cadence-${goal}`}
                      className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C] whitespace-nowrap"
                    >
                      Reviewed
                    </label>
                    <Select value={planCadence} onValueChange={(v) => onChangePlanCadence(v as SignalCadence)}>
                      <SelectTrigger
                        id={`select-attain-commit-plan-cadence-${goal}`}
                        className="h-8 w-[122px] text-xs bg-white"
                        data-testid={`select-attain-commit-plan-cadence-${goal}`}
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
                  </div>
                </div>
                <p className="text-[10.5px] text-[#8C8C8C] mb-3 leading-relaxed max-w-[520px]">
                  The decision-owners below answer to this person for whether {goalDef.label} actually lands, on the
                  cadence this owner sets.
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
                  const required = commitment.requiredSignal;
                  const optional = commitment.optionalSignals;
                  const dueOptions = Array.from(new Set([lever.defaultDue, ...DUE_OPTIONS]));
                  const number = decisionNumber.get(`${goal}:${lever.id}`) ?? i + 1;
                  // The other curated candidates, minus whichever one is
                  // already the required signal — that one is fixed above,
                  // never re-offered as an "optional" choice for the same
                  // decision.
                  const optionalOptions = lever.signalOptions.filter((opt) => opt !== required.label);

                  return (
                    <motion.div
                      key={lever.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * i }}
                      className="rounded-lg border border-[#E7E0D6] bg-white p-5"
                      data-testid={`row-attain-commit-${goal}-${lever.id}`}
                    >
                      {/* What it is — numbered so the whole page reads as an
                          ordered script, plus the light "how to think about
                          this" cue already written for every lever. */}
                      <div className="flex items-start gap-3 mb-4">
                        <span
                          className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#F0ECE5] text-[10px] font-bold text-[#3A3A3A] font-abridge mt-0.5"
                          data-testid={`text-attain-commit-number-${goal}-${lever.id}`}
                        >
                          {String(number).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-[#1A1A1A]">{lever.label}</span>
                          <p className="text-[11px] text-[#8C8C8C] mt-1 leading-relaxed">{lever.help}</p>
                          <p className="text-[10.5px] text-[#3A3A3A] mt-1.5 font-semibold">
                            Worth {formatCompact(contribution?.marginalMargin ?? 0)}
                            <span className="text-[#8C8C8C] font-normal"> · {Math.round((contribution?.pctOfTotal ?? 0) * 100)}% of this priority</span>
                          </p>
                        </div>
                      </div>

                      {/* Owner -> by when. Owner is a curated Select of
                          plausible roles for THIS decision (we suggest, the
                          partner confirms or overrides with Custom...), not
                          a raw free-text field - see `CuratedSelectField`. */}
                      <div className="grid grid-cols-2 sm:grid-cols-[1fr_150px] gap-3 items-start mb-4 pl-9">
                        <Field label="Owner">
                          <CuratedSelectField
                            value={ownerName}
                            options={lever.ownerRoleOptions}
                            onChange={(v) => onChangeCommitment(goal, lever.id, { owner: v })}
                            customPlaceholder="Name or specific title, e.g. Dr. A. Rivera"
                            triggerTestId={`select-attain-commit-owner-${goal}-${lever.id}`}
                            customOptionTestId={`option-attain-commit-owner-custom-${goal}-${lever.id}`}
                            customInputTestId={`input-attain-commit-owner-custom-${goal}-${lever.id}`}
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

                      {/* The ONE required signal — the single best proof
                          this decision is working, always shown, always
                          named (never a Select here; the identity is
                          designated by the catalog, see
                          `requiredSignalLabel`). Only baseline + unit are
                          the partner's to fill in. This is the ONLY coral
                          in this card, on purpose. */}
                      <div className="pl-9">
                        <div className="rounded-md bg-[#FFF6F3] border border-[#F3C9BE] p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="inline-block text-[8px] font-bold uppercase tracking-wide text-white bg-[#EA2C00] px-2 py-0.5 rounded-full"
                              data-testid={`badge-attain-commit-required-${goal}-${lever.id}`}
                            >
                              Track this
                            </span>
                            <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">Required signal</p>
                          </div>
                          <p
                            className="text-[12.5px] font-semibold text-[#1A1A1A] mb-2.5 leading-snug"
                            data-testid={`text-attain-commit-required-signal-${goal}-${lever.id}`}
                          >
                            {required.label}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Baseline today">
                              <input
                                value={required.baseline}
                                onChange={(e) => onChangeRequiredSignal(goal, lever.id, { baseline: e.target.value })}
                                placeholder="e.g., 18"
                                className="h-9 w-full min-w-0 rounded-md border border-[#D8CFC4] bg-white px-2 text-[11px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                                data-testid={`input-attain-commit-required-baseline-${goal}-${lever.id}`}
                              />
                            </Field>
                            <Field label="Unit">
                              <input
                                value={required.unit}
                                onChange={(e) => onChangeRequiredSignal(goal, lever.id, { unit: e.target.value })}
                                placeholder="e.g., days"
                                className="h-9 w-full min-w-0 rounded-md border border-[#D8CFC4] bg-white px-2 text-[11px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                                data-testid={`input-attain-commit-required-unit-${goal}-${lever.id}`}
                              />
                            </Field>
                          </div>
                        </div>

                        {/* Optional signals — hidden behind this affordance
                            by default (Commit's headline fix: nothing else
                            is required to see a decision through). Neutral
                            styling on purpose; only the required signal
                            above gets the coral marker. */}
                        {optional.length > 0 && (
                          <div className="space-y-2 mt-2.5">
                            {optional.map((sig) => (
                              <div
                                key={sig.id}
                                className="bg-[#F8F5F1] rounded-md border border-[#E7E0D6] p-3"
                                data-testid={`row-attain-commit-optional-${goal}-${lever.id}-${sig.id}`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C]">Optional signal</p>
                                  <button
                                    type="button"
                                    onClick={() => onRemoveOptionalSignal(goal, lever.id, sig.id)}
                                    className="text-[10px] text-[#B4B4B4] hover:text-[#3A3A3A]"
                                    data-testid={`button-attain-commit-remove-optional-${goal}-${lever.id}-${sig.id}`}
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="flex items-start gap-2 mb-2">
                                  <Field label="Signal" className="flex-1 min-w-0">
                                    <CuratedSelectField
                                      value={sig.label}
                                      options={optionalOptions}
                                      onChange={(v) => onChangeOptionalSignal(goal, lever.id, sig.id, { label: v })}
                                      customPlaceholder="What tells you it's moving"
                                      triggerTestId={`select-attain-commit-optional-signal-${goal}-${lever.id}-${sig.id}`}
                                      customOptionTestId={`option-attain-commit-optional-signal-custom-${goal}-${lever.id}-${sig.id}`}
                                      customInputTestId={`input-attain-commit-optional-signal-custom-${goal}-${lever.id}-${sig.id}`}
                                    />
                                  </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <Field label="Baseline today">
                                    <input
                                      value={sig.baseline}
                                      onChange={(e) => onChangeOptionalSignal(goal, lever.id, sig.id, { baseline: e.target.value })}
                                      placeholder="e.g., 18"
                                      className="h-9 w-full min-w-0 rounded-md border border-[#D8CFC4] bg-white px-2 text-[11px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                                      data-testid={`input-attain-commit-optional-baseline-${goal}-${lever.id}-${sig.id}`}
                                    />
                                  </Field>
                                  <Field label="Unit">
                                    <input
                                      value={sig.unit}
                                      onChange={(e) => onChangeOptionalSignal(goal, lever.id, sig.id, { unit: e.target.value })}
                                      placeholder="e.g., days"
                                      className="h-9 w-full min-w-0 rounded-md border border-[#D8CFC4] bg-white px-2 text-[11px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
                                      data-testid={`input-attain-commit-optional-unit-${goal}-${lever.id}-${sig.id}`}
                                    />
                                  </Field>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => onAddOptionalSignal(goal, lever.id)}
                          className="mt-2.5 text-[10.5px] font-semibold text-[#3A3A3A] hover:text-[#1A1A1A] border border-dashed border-[#D8CFC4] rounded-md px-3 py-1.5 hover:border-[#B4B4B4]"
                          data-testid={`button-attain-commit-add-optional-${goal}-${lever.id}`}
                        >
                          + Add a signal (optional)
                        </button>
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
          <div className="bg-[#F5F0EB] border-l-[3px] border-[#EA2C00] rounded-r-md p-4 mb-6 max-w-[620px]">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">Why this matters</p>
            <p className="text-xs text-[#3A3A3A] leading-relaxed">
              The month you pick here is what the attainment curve on the next page steers against. A decision due in
              Month 2 is expected to be showing up by Month 2, not sitting untouched at the goal-owner review in
              Month 9. Every signal is checked on the cadence its goal-owner set above, not on its own schedule.
            </p>
          </div>

          {/* The seal - a slim co-signing moment, not a form submission.
              Every figure in it is read straight off the state above:
              nothing here is invented. */}
          <div className="bg-[#1A1A1A] rounded-xl p-5 mb-4" data-testid="card-attain-commit-seal">
            <p className="text-[9px] font-bold uppercase tracking-wide text-white/40 mb-2">The commitment</p>
            <p className="text-[15px] text-white leading-relaxed" data-testid="text-attain-commit-seal">
              You're committing to <b className="text-[#EA2C00]">{totalMoved} decision{totalMoved === 1 ? "" : "s"}</b>,
              worth about <b className="text-[#EA2C00]">{formatCompact(combined?.combinedMargin ?? 0)}</b>, owned by{" "}
              <b className="text-white">{ownerNames}</b>, reviewed <b className="text-white">{CADENCE_LABEL[planCadence]}</b>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
