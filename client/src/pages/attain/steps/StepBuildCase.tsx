import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { leversFor, lineOptions, type AttainBaseline, type Lever, type LeverValues } from "@/lib/attain/attainLevers";
import type { MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import AccessDecisionChain from "./AccessDecisionChain";
import EdAccessDecisionChain from "./EdAccessDecisionChain";
import RevenueDecisionChain from "./RevenueDecisionChain";
import InpatientRevenueDecisionChain from "./InpatientRevenueDecisionChain";
import WorkforceDecisionChain from "./WorkforceDecisionChain";
import QualityDecisionChain from "./QualityDecisionChain";

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
  /** The ONE goal this page builds the case for. Each selected goal gets
   * its own "Build the case" page in sequence (see AttainFlow's dynamic
   * stepOrder) rather than every goal stacked on one page. */
  goal: GoalId;
  goalIndex: number;
  totalGoals: number;
  /** The full selected-goals list, needed only to detect the access +
   * retention freed-time conflict and decide whether the split control
   * belongs on THIS page - never used to render another goal's decisions. */
  goals: GoalId[];
  values: LeverValues;
  combined: MultiGoalContributionsResult | null;
  freedTimeSplit: number;
  onChangeFreedTimeSplit: (split: number) => void;
  onChangeLeverValue: (goal: GoalId, leverId: string, value: number | string[]) => void;
  stepNumber: number;
  totalSteps: number;
}

/**
 * "Build the case" — the strategy hub, one page per selected priority. The
 * hero here is the STRATEGY (the goal and the decisions that reach it), not
 * a big dollar figure: Attain is the plan to CAPTURE the prize Explore
 * already sized, and a page that leads with money is just a weaker
 * Explore. Every decision card shows its own live derivation directly
 * underneath the control ("THE MATH", built from the partner's own
 * baseline, never invented), with a small, quiet "adds ~$X" readout
 * beneath that, never a headline. The one running total, COMBINED across
 * every priority (including ones on pages already passed), lives quietly
 * in the side panel's "Plan so far" line, not here.
 *
 * When both Access and Retention are selected, they share one freed
 * documentation hour (see attainLevers.ts computeMultiGoalContributions),
 * so the split control that prevents double-counting it is surfaced on
 * BOTH goals' own pages — whichever one the partner lands on first, they
 * see and can set it, and it stays in sync (shared state) on the other's
 * page too.
 */
export default function StepBuildCase({
  setting,
  baseline,
  goal,
  goalIndex,
  totalGoals,
  goals,
  values,
  combined,
  freedTimeSplit,
  onChangeFreedTimeSplit,
  onChangeLeverValue,
  stepNumber,
  totalSteps,
}: StepBuildCaseProps) {
  // Outpatient access's D3 mechanically divides freed hours by a visit
  // length to create schedule capacity, which is the exact same hour
  // retention's D2 protects - hence the split control. ED access's dollar
  // math (attainEdAccess.ts) never does that division, so it never
  // contends for the hour and this split does not apply at setting "ed" -
  // see attainLevers.ts's computeMultiGoalContributions for the matching
  // engine-side gate.
  const hasFreedTimeConflict = setting === "outpatient" && goals.includes("access") && goals.includes("retention");
  const showFreedTimeSplit = hasFreedTimeConflict && (goal === "access" || goal === "retention");
  const goalDef = GOAL_CATALOG[goal];
  const levers = leversFor(goal, setting);
  const isRevenueChain = goal === "revenue" && setting !== "inpatient";
  const isIpRevenueChain = goal === "revenue" && setting === "inpatient";
  const result = combined?.byGoal[goal];
  const contributionFor = (id: string) => result?.perLever.find((p) => p.id === id);

  const movedCount = levers.filter((l) => isMoved(values[l.id], l.realityStart)).length;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} of {totalSteps} · What are you actually going to do?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Build your strategy
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-step-teach">
          Every decision below starts at your reality, where it stands today. Doing nothing new adds nothing. Move a
          decision and its own derivation appears underneath it, built from the operation you entered on the last
          page.{" "}
          {totalGoals > 1
            ? `This is priority ${goalIndex + 1} of ${totalGoals}. Each priority you picked gets its own page like this one, and everything rolls up into one quiet total in the panel to the right.`
            : "The dollar figure is proof of the decision, not the point of this page."}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1A1A1A] rounded-2xl p-6 mb-8"
        data-testid="panel-attain-buildcase-strategy"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[2.5px] text-white/50 mb-2" data-testid="text-attain-buildcase-priority-index">
          {totalGoals > 1 ? `Priority ${goalIndex + 1} of ${totalGoals}` : "The strategy"}
        </p>
        <div className="flex items-center gap-3 mb-1">
          <span
            className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
            style={{ background: goalDef.pillBg }}
          >
            {goalDef.pill}
          </span>
          <h2 className="font-abridge text-2xl text-white" data-testid="text-attain-buildcase-strategy-title">
            {goalDef.label}
          </h2>
        </div>
        <p className="text-xs text-white/50 mt-2" data-testid="text-attain-buildcase-strategy-progress">
          {movedCount} of {levers.length} decisions moved. Move the ones your organization is actually ready to
          commit to, the rest can wait for a later plan.
        </p>
      </motion.div>

      {showFreedTimeSplit && (
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
            much stays as protected relief. Every dollar on both of those priorities' pages already reflects this
            split.
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

      <div data-testid={`section-attain-buildcase-goal-${goal}`}>
        {goal === "access" && setting === "ed" ? (
          <EdAccessDecisionChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("access", leverId, value)}
          />
        ) : goal === "access" ? (
          <AccessDecisionChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("access", leverId, value)}
          />
        ) : isRevenueChain ? (
          <RevenueDecisionChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("revenue", leverId, value)}
          />
        ) : isIpRevenueChain ? (
          <InpatientRevenueDecisionChain
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("revenue", leverId, value)}
          />
        ) : goal === "retention" ? (
          <WorkforceDecisionChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("retention", leverId, value)}
          />
        ) : goal === "quality" ? (
          <QualityDecisionChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("quality", leverId, value)}
          />
        ) : (
          // No goal reaches this generic renderer anymore - access, revenue
          // (outpatient/ED), retention, and quality are all bespoke decision
          // chains handled above. Kept only so the generic lever/catalog
          // plumbing (Commit, the Attainment hub) has a fallback shape if a
          // future goal is added before it gets its own bespoke chain.
          <div className="space-y-4">
            {levers.map((lever, i) => {
              const contribution = contributionFor(lever.id);
              const moved = isMoved(values[lever.id], lever.realityStart);
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
