import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { LEVERS, lineOptions, defaultLeverValues, type AttainBaseline, type Lever, type LeverValues } from "@/lib/attain/attainLevers";
import type { MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import AccessDecisionChain from "./AccessDecisionChain";

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

const TOGGLE_LABELS = ["None", "Partial", "Full"];

function isMoved(value: number | string[] | undefined, realityStart: number | string[]): boolean {
  if (Array.isArray(realityStart)) return Array.isArray(value) && value.length > 0;
  return typeof value === "number" && value !== realityStart;
}

function formatLeverValue(lever: Lever, value: number | string[] | undefined): string {
  if (lever.control === "lines") {
    const lines = Array.isArray(value) ? value : [];
    return lines.length === 0 ? "none yet" : `${lines.length} of ${lever.max}`;
  }
  if (lever.control === "toggleLevel") {
    const level = typeof value === "number" ? Math.min(2, Math.max(0, Math.round(value))) : 0;
    return TOGGLE_LABELS[level];
  }
  const n = typeof value === "number" ? value : 0;
  const decimals = lever.step < 1 ? 1 : 0;
  return `${n.toFixed(decimals)} ${lever.unit}`;
}

interface StepBuildCaseProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  goals: GoalId[];
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult | null;
  freedTimeSplit: number;
  onChangeFreedTimeSplit: (split: number) => void;
  onChangeLeverValue: (goal: GoalId, leverId: string, value: number | string[]) => void;
}

/**
 * "Build the case" — the strategy hub. The hero here is the STRATEGY (the
 * goal and the decisions that reach it), not a big dollar figure: Attain is
 * the plan to CAPTURE the prize Explore already sized, and a page that
 * leads with money is just a weaker Explore. Every decision card shows its
 * own live derivation directly underneath the control ("THE MATH", built
 * from the partner's own baseline, never invented), with a small, quiet
 * "adds ~$X" readout beneath that, never a headline. The one running total
 * lives quietly in the side panel's "Plan so far" line, not here.
 */
export default function StepBuildCase({
  setting,
  baseline,
  goals,
  valuesByGoal,
  combined,
  freedTimeSplit,
  onChangeFreedTimeSplit,
  onChangeLeverValue,
}: StepBuildCaseProps) {
  const hasFreedTimeConflict = goals.includes("access") && goals.includes("retention");
  const goalNames = goals.map((g) => GOAL_CATALOG[g].label).join(" + ");

  const totalLevers = goals.reduce((sum, g) => sum + LEVERS[g].length, 0);
  const movedCount = goals.reduce((sum, g) => {
    const values = valuesByGoal[g] ?? defaultLeverValues(g);
    return sum + LEVERS[g].filter((l) => isMoved(values[l.id], l.realityStart)).length;
  }, 0);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 4 · What are you actually going to do?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Build your strategy
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-step-teach">
          Every decision below starts at your reality, where it stands today. Doing nothing new adds nothing. Move a
          decision and its own derivation appears underneath it, built from the operation you entered on the last
          page.{" "}
          {goals.length > 1
            ? "Each priority you picked gets its own section below, and everything rolls up into one quiet total in the panel to the right."
            : "The dollar figure is proof of the decision, not the point of this page."}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1A1A1A] rounded-2xl p-6 mb-8"
        data-testid="panel-attain-buildcase-strategy"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[2.5px] text-white/50 mb-2">The strategy</p>
        <h2 className="font-abridge text-2xl text-white mb-1" data-testid="text-attain-buildcase-strategy-title">
          {goalNames}
        </h2>
        <p className="text-xs text-white/50" data-testid="text-attain-buildcase-strategy-progress">
          {movedCount} of {totalLevers} decisions moved. Move the ones your organization is actually ready to commit
          to, the rest can wait for a later plan.
        </p>
      </motion.div>

      {hasFreedTimeConflict && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-[#EA2C00] bg-[#FFF6F3] p-5 mb-8"
          data-testid="panel-attain-freed-time-split"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">
            One hour, one split
          </p>
          <p className="text-xs text-[#3A3A3A] leading-relaxed mb-4 max-w-[600px]">
            Access and Retention both price the same freed documentation hour. This is the one decision that keeps it
            from being counted twice: how much of that hour routes to opening access on the schedule, versus how
            much stays as protected relief. Every dollar below already reflects this split.
          </p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1A1A1A]" data-testid="text-attain-freed-time-split-access">
              {freedTimeSplit}% to opening access
            </span>
            <span className="text-xs font-semibold text-[#1A1A1A]" data-testid="text-attain-freed-time-split-retention">
              {100 - freedTimeSplit}% to protecting relief
            </span>
          </div>
          <Slider
            value={[freedTimeSplit]}
            onValueChange={(v) => onChangeFreedTimeSplit(v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-attain-freed-time-split"
          />
          <p className="text-[10px] text-[#8C8C8C] mt-2">
            How you split the freed hour: {freedTimeSplit}% to opening access, {100 - freedTimeSplit}% to protecting
            relief.
          </p>
        </motion.div>
      )}

      {goals.map((goal, goalIdx) => {
        const goalDef = GOAL_CATALOG[goal];
        const levers = LEVERS[goal];
        const values = valuesByGoal[goal] ?? defaultLeverValues(goal);
        const result = combined?.byGoal[goal];
        const contributionFor = (id: string) => result?.perLever.find((p) => p.id === id);

        return (
          <div key={goal} className="mb-10" data-testid={`section-attain-buildcase-goal-${goal}`}>
            <div className="flex items-center gap-3 mb-1">
              <span
                className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
                style={{ background: goalDef.pillBg }}
              >
                {goalDef.pill}
              </span>
              <h2 className="text-lg font-bold text-[#1A1A1A]" data-testid={`text-attain-buildcase-goal-title-${goal}`}>
                {goalDef.label}
              </h2>
            </div>
            {goals.length > 1 && (
              <p className="text-[11px] text-[#8C8C8C] mb-4">
                Priority {goalIdx + 1} of {goals.length} · {goalDef.domainSub}
              </p>
            )}

            {goal === "access" ? (
              <AccessDecisionChain
                setting={setting}
                baseline={baseline}
                values={values}
                onChangeValue={(leverId, value) => onChangeLeverValue("access", leverId, value)}
              />
            ) : (
            <div className="space-y-4">
              {levers.map((lever, i) => {
                const contribution = contributionFor(lever.id);
                const moved = isMoved(values[lever.id], lever.realityStart);
                const isSharedFreedTime = hasFreedTimeConflict && lever.id === "retentionFloor";
                return (
                  <motion.div
                    key={lever.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i }}
                    className={`rounded-xl border p-5 ${moved ? "border-[#EA2C00] bg-[#FFF6F3]" : "border-[#E5E5E5] bg-white"}`}
                    data-testid={`card-attain-lever-${goal}-${lever.id}`}
                  >
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-[#1A1A1A]" data-testid={`text-attain-lever-label-${goal}-${lever.id}`}>
                        {lever.label}
                      </h3>
                      <p className="text-xs text-[#8C8C8C] mt-1 leading-relaxed max-w-[520px]">{lever.help}</p>
                      {isSharedFreedTime && (
                        <p className="text-[10px] text-[#EA2C00] mt-1.5 font-medium">
                          Scaled by the freed-time split above.
                        </p>
                      )}
                    </div>

                    <LeverControl
                      setting={setting}
                      goal={goal}
                      lever={lever}
                      value={values[lever.id]}
                      onChange={(v) => onChangeLeverValue(goal, lever.id, v)}
                    />

                    {/* THE MATH — the live derivation, always visible so a
                        partner can see what moving this decision would
                        even mean before they move it. Mirrors the coral
                        left-border "THE MATH" treatment used on Explore. */}
                    <div
                      className="mt-4 bg-[#F8F5F1] border-l-[3px] border-[#EA2C00] rounded-r-md p-3"
                      data-testid={`box-attain-lever-formula-${goal}-${lever.id}`}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
                      <p className="text-[11px] text-[#3A3A3A] leading-relaxed" data-testid={`text-attain-lever-formula-${goal}-${lever.id}`}>
                        {contribution?.formula ?? "Move this decision above reality to see the math."}
                      </p>
                    </div>

                    {/* The dollar figure is quiet proof underneath the
                        decision, never the headline of the card. */}
                    <p className="text-[10.5px] text-[#8C8C8C] mt-2" data-testid={`text-attain-lever-contribution-${goal}-${lever.id}`}>
                      {moved ? (
                        <span className="font-semibold text-[#EA2C00]">adds ~{formatCompact(contribution?.marginalMargin ?? 0)}</span>
                      ) : (
                        "adds ~$0"
                      )}
                      {" · "}
                      {(contribution?.marginalCount ?? 0).toLocaleString()} units
                      {" · "}
                      {Math.round((contribution?.pctOfTotal ?? 0) * 100)}% of this priority
                    </p>
                  </motion.div>
                );
              })}
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface LeverControlProps {
  setting: AttainSetting;
  goal: GoalId;
  lever: Lever;
  value: number | string[] | undefined;
  onChange: (value: number | string[]) => void;
}

function LeverControl({ setting, goal, lever, value, onChange }: LeverControlProps) {
  if (lever.control === "lines") {
    const options = lineOptions(goal, setting);
    const selected = Array.isArray(value) ? value : [];
    if (options.length === 0) {
      return <p className="text-xs text-[#B4B4B4] italic">No line options configured for this combination yet.</p>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((line) => {
          const active = selected.includes(line);
          return (
            <button
              key={line}
              type="button"
              onClick={() => onChange(active ? selected.filter((l) => l !== line) : [...selected, line])}
              className={`px-3 py-2 rounded-md text-sm border transition-all ${
                active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
              }`}
              data-testid={`chip-attain-lever-${goal}-${lever.id}-${line.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {line}
            </button>
          );
        })}
      </div>
    );
  }

  if (lever.control === "toggleLevel") {
    const level = typeof value === "number" ? Math.min(2, Math.max(0, Math.round(value))) : 0;
    return (
      <div className="flex rounded-md border border-[#E5E5E5] overflow-hidden w-fit">
        {TOGGLE_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onChange(i)}
            className={`px-4 h-10 text-xs font-medium transition-colors ${
              level === i ? "bg-[#1A1A1A] text-white" : "bg-white text-[#8C8C8C] hover:bg-[#F5F0EB]"
            }`}
            data-testid={`button-attain-lever-${goal}-${lever.id}-${label.toLowerCase()}`}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  // percent | countPerUnit — a single-value slider with a live readout.
  const n = typeof value === "number" ? value : lever.realityStart as number;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#8C8C8C]">
          Reality today: {formatLeverValue(lever, lever.realityStart)}
        </span>
        <span className="text-sm font-semibold text-[#1A1A1A]" data-testid={`text-attain-lever-value-${goal}-${lever.id}`}>
          {formatLeverValue(lever, n)}
        </span>
      </div>
      <Slider
        value={[n]}
        onValueChange={(v) => onChange(v[0])}
        min={lever.min}
        max={lever.max}
        step={lever.step}
        accent="coral"
        className="w-full"
        data-testid={`slider-attain-lever-${goal}-${lever.id}`}
      />
    </div>
  );
}
