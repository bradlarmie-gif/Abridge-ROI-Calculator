import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { leversFor, lineOptions, type AttainBaseline, type Lever, type LeverValues } from "@/lib/attain/attainLevers";
import type { MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import AccessDecisionChain from "./AccessDecisionChain";
import EdAccessDecisionChain from "./EdAccessDecisionChain";
import RevenueDecisionChain from "./RevenueDecisionChain";
import RevenueLadderChain from "./RevenueLadderChain";
import InpatientRevenueDecisionChain from "./InpatientRevenueDecisionChain";
import WorkforceDecisionChain from "./WorkforceDecisionChain";
import WorkforceLadderChain from "./WorkforceLadderChain";
import QualityLadderChain from "./QualityLadderChain";
import CapacityLadderChain from "./CapacityLadderChain";

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
  if (lever.control === "toggle") {
    return typeof value === "number" && value === 1 ? "Committed" : "Not yet";
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
  /** This priority's realization/attribution rate, 0-100, default 100 - the
   * share of this outcome attributed to this plan. The control that sets it
   * now lives in the side panel (`AttainLivePanel.tsx`'s "Attributed to
   * this plan"); this page only reads the value to scale each decision
   * chain's own live derivation. See attainLevers.ts's `applyRealization`. */
  realizationPct: number;
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
 * every priority (including ones on pages already passed), and the
 * Realization/attribution control that scales THIS priority's own total,
 * both live quietly in the side panel (`AttainLivePanel.tsx`), not here —
 * see that file's "Attributed to this plan" control.
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
  realizationPct,
  onChangeLeverValue,
  stepNumber,
  totalSteps,
}: StepBuildCaseProps) {
  // Outpatient access's D3 mechanically divides freed hours by a visit
  // length to create schedule capacity, and ED access's own D3 does the
  // same thing with its own hours-per-recovery constant
  // (attainEdAccess.ts) - both are the exact same hour retention's D2
  // protects, hence the split control applying at both settings - see
  // attainLevers.ts's computeMultiGoalContributions for the matching
  // engine-side gate.
  const hasFreedTimeConflict = (setting === "outpatient" || setting === "ed") && goals.includes("access") && goals.includes("retention");
  const showFreedTimeSplit = hasFreedTimeConflict && (goal === "access" || goal === "retention");
  // The SAME split, computed the SAME way `computeMultiGoalContributions`
  // computes it (attainLevers.ts), passed straight into this goal's own
  // bespoke decision chain below so the D5/payoff live preview reads the
  // exact split-adjusted dollar every other surface on this page already
  // does (the side panel's "this priority's worth," Commit, the PDF) - see
  // C1 in the premium audit: previously only those other surfaces applied
  // the split, so Access's/Retention's own D5 hero showed the full,
  // UNSPLIT dollar when both goals were selected together.
  const accessShare = Math.min(1, Math.max(0, freedTimeSplit / 100));
  const retentionShare = 1 - accessShare;
  const crossGoalShareMultiplier = !hasFreedTimeConflict ? 1 : goal === "access" ? accessShare : goal === "retention" ? retentionShare : 1;
  // ED's mechanism is throughput, not a schedule - the split copy should
  // name the actual mechanism each setting's access chain uses.
  const accessSplitLabel = setting === "ed" ? "faster throughput" : "opening access on the schedule";
  const goalDef = GOAL_CATALOG[goal];
  const levers = leversFor(goal, setting);
  // Outpatient revenue is the ladder exemplar (converging multi-path, see
  // RevenueLadderChain); ED revenue keeps its current three-path screen.
  const isRevenueLadder = goal === "revenue" && setting === "outpatient";
  const isRevenueChain = goal === "revenue" && setting === "ed";
  const isIpRevenueChain = goal === "revenue" && setting === "inpatient";
  const result = combined?.byGoal[goal];
  const contributionFor = (id: string) => result?.perLever.find((p) => p.id === id);

  const movedCount = levers.filter((l) => isMoved(values[l.id], l.realityStart)).length;

  // Outpatient access is the ladder exemplar: it assembles the exact
  // step-down story Planning reads back (see AccessDecisionChain +
  // accessLadder.ts), so it drops the generic "N of M decisions moved"
  // framing for a single crisp teaching line about the ladder.
  const isAccessLadder = goal === "access" && setting === "outpatient";
  // ED access is the fourth ladder: it assembles the same step-down story
  // (first domino -> scope -> worth -> the diagnosis gate -> the prize) that
  // Planning reads back, via the shared ED access ladder (see
  // EdAccessDecisionChain + accessLadder.ts's deriveEdAccessLadder /
  // EdAccessDiagnosisGate). So it drops the generic "N of M decisions moved"
  // drag framing for the one crisp ladder teaching line, exactly like
  // outpatient access.
  const isEdAccessLadder = goal === "access" && setting === "ed";
  // Outpatient retention is the second ladder: it assembles the same step-down
  // story (freed time -> protected relief -> burnout down -> the burnout-pool
  // gate -> departures avoided -> the prize) that Planning reads back, via the
  // shared retention ladder (see WorkforceLadderChain + accessLadder.ts's
  // deriveRetentionLadder). Other settings' retention keeps the D1-D5 chain.
  const isRetentionLadder = goal === "retention" && setting === "outpatient";
  // Nursing quality is the fifth ladder: it assembles the same step-down
  // story (first domino -> shared scope -> the event selector -> per-event
  // ground / diagnosis gate / bundle -> the converged prize) that Planning
  // reads back, via the shared converging quality ladder (see
  // QualityLadderChain + attainQuality.ts's deriveQualityLadder /
  // accessLadder.ts's QualityEventGate). Same multi-path SHAPE as revenue.
  const isQualityLadder = goal === "quality" && setting === "nursing";
  // Nursing capacity is the sixth ladder: it assembles the same step-down
  // story (first domino -> the overtime run now -> the documentation-
  // attributable gate -> overtime hours avoided -> the prize) that Planning
  // reads back, via the shared nursing capacity ladder (see CapacityLadderChain
  // + accessLadder.tsx's deriveNursingCapacityLadder / NursingCapacityGate). A
  // single gated ladder like access, reconciled to Explore's own
  // `nursingOvertime` driver.
  const isCapacityLadder = goal === "capacity" && setting === "nursing";
  const isLadder = isAccessLadder || isEdAccessLadder || isRetentionLadder || isRevenueLadder || isQualityLadder || isCapacityLadder;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} of {totalSteps} · What are you actually going to do?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Build your strategy
        </h1>
        <p className="text-[15px] text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-step-teach">
          {isAccessLadder
            ? "Assemble the ladder from the top down. One number starts it, each rung multiplies, and demand decides how much converts."
            : isEdAccessLadder
              ? "Assemble the ladder from the top down. One number starts it, freed time becomes throughput, and the diagnosis decides how much of the leak is yours to recover."
              : isRetentionLadder
                ? "You want lower voluntary turnover and a better clinician experience. Work backward: one number starts it, each rung multiplies, and burnout decides how much you can avoid."
                : isRevenueLadder
                  ? "One lever starts it, complete documentation at the point of care, and it feeds several revenue paths. For each path you pick, the documentation decides how much you can actually capture. The paths add into one prize."
                  : isQualityLadder
                    ? "One lever starts it, earlier and more complete risk documentation. It feeds several harm events. For each event you pick, only a defensible share is preventable, and the bundle you commit to earns it. The events add into one prize."
                    : isCapacityLadder
                      ? "One number starts it, minutes saved per note, so nurses chart in the moment. Work down: your overtime now, the share charting actually causes, and the hours you take out of it."
                      : "These decisions start from where you are today, move the ones you're ready to commit to."}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1A1A1A] rounded-2xl p-7 mb-8"
        data-testid="panel-attain-buildcase-strategy"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[2.5px] text-white/50 mb-2" data-testid="text-attain-buildcase-priority-index">
          {totalGoals > 1 ? `Priority ${goalIndex + 1} of ${totalGoals}` : "The strategy"}
        </p>
        <div className="flex items-center gap-3 mb-1">
          {/* A clean domain tag, not a floating word - a light outline keeps
              it legible as its own pill even for the one domain (Capacity)
              whose pillBg is the exact same #1A1A1A as this card, which
              otherwise makes the pill's own background disappear into the
              card behind it. */}
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full border border-white/15"
            style={{ background: goalDef.pillBg }}
            data-testid="text-attain-buildcase-strategy-pill"
          >
            {goalDef.pill}
          </span>
          <h2 className="font-abridge text-3xl text-white" data-testid="text-attain-buildcase-strategy-title">
            {goalDef.label}
          </h2>
        </div>
        <p className="text-[13px] text-white/50 mt-2" data-testid="text-attain-buildcase-strategy-progress">
          {isAccessLadder
            ? "This is the full step-down, top to bottom. Every rung is part of the plan; set each one to your real numbers."
            : isEdAccessLadder
              ? "This is the full step-down, top to bottom. Every rung is part of the plan; set each one to your real numbers."
              : isRetentionLadder
                ? "Lower voluntary turnover and a better clinician experience. This is the full step-down, top to bottom; set each rung to your real numbers."
                : isRevenueLadder
                  ? "One lever, several paths, one converged prize. Pick the paths you are chasing and set each one to your real numbers."
                  : isQualityLadder
                    ? "One lever, several harm events, one converged prize. Pick the events you are preventing and commit each one's bundle to your real numbers."
                    : isCapacityLadder
                      ? "This is the full step-down, top to bottom. Set each rung to your real overtime, and only the overtime charting causes counts."
                      : `${movedCount} of ${levers.length} decisions moved. Move the ones your organization is actually ready to commit to, the rest can wait for a later plan.`}
        </p>
      </motion.div>

      {showFreedTimeSplit && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-[#EA2C00] bg-[#FFF6F3] p-6 mb-8"
          data-testid="panel-attain-freed-time-split"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">
            One hour, one split
          </p>
          <p className="text-[15px] text-[#3A3A3A] leading-relaxed mb-5 max-w-[620px]">
            Access and Retention both price the same freed documentation hour. This is the one decision that keeps it
            from being counted twice: how much of that hour routes to {accessSplitLabel}, versus how much stays as
            protected relief. Every dollar on both of those priorities' pages already reflects this split.
          </p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1A1A1A]" data-testid="text-attain-freed-time-split-access">
              {freedTimeSplit}% to {accessSplitLabel}
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
          <p className="text-[11px] text-[#8C8C8C] mt-2">
            How you split the freed hour: {freedTimeSplit}% to {accessSplitLabel}, {100 - freedTimeSplit}% to
            protecting relief.
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
            realizationPct={realizationPct}
            crossGoalShareMultiplier={crossGoalShareMultiplier}
          />
        ) : goal === "access" ? (
          <AccessDecisionChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("access", leverId, value)}
            realizationPct={realizationPct}
            crossGoalShareMultiplier={crossGoalShareMultiplier}
          />
        ) : isRevenueLadder ? (
          <RevenueLadderChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("revenue", leverId, value)}
            realizationPct={realizationPct}
          />
        ) : isRevenueChain ? (
          <RevenueDecisionChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("revenue", leverId, value)}
            realizationPct={realizationPct}
          />
        ) : isIpRevenueChain ? (
          <InpatientRevenueDecisionChain
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("revenue", leverId, value)}
            realizationPct={realizationPct}
          />
        ) : isRetentionLadder ? (
          <WorkforceLadderChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("retention", leverId, value)}
            realizationPct={realizationPct}
            crossGoalShareMultiplier={crossGoalShareMultiplier}
          />
        ) : goal === "retention" ? (
          <WorkforceDecisionChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("retention", leverId, value)}
            realizationPct={realizationPct}
            crossGoalShareMultiplier={crossGoalShareMultiplier}
          />
        ) : goal === "quality" ? (
          <QualityLadderChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("quality", leverId, value)}
            realizationPct={realizationPct}
          />
        ) : goal === "capacity" ? (
          <CapacityLadderChain
            setting={setting}
            baseline={baseline}
            values={values}
            onChangeValue={(leverId, value) => onChangeLeverValue("capacity", leverId, value)}
            realizationPct={realizationPct}
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
                    <p className="text-[15px] text-[#8C8C8C] mt-1 leading-relaxed max-w-[620px]">{lever.help}</p>
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
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
                    <p className="text-[12.5px] text-[#3A3A3A] leading-relaxed" data-testid={`text-attain-lever-formula-${goal}-${lever.id}`}>
                      {contribution?.formula ?? "Move this decision above reality to see the math."}
                    </p>
                  </div>

                  {/* The dollar figure is quiet proof underneath the
                      decision, never the headline of the card. */}
                  <p className="text-[11.5px] text-[#8C8C8C] mt-2" data-testid={`text-attain-lever-contribution-${goal}-${lever.id}`}>
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
      return <p className="text-[14px] text-[#B4B4B4] italic">No line options configured for this combination yet.</p>;
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

  if (lever.control === "toggle") {
    const committed = typeof value === "number" && value === 1;
    return (
      <button
        type="button"
        onClick={() => onChange(committed ? 0 : 1)}
        className={`px-4 h-10 rounded-md text-xs font-medium border transition-colors ${
          committed ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#8C8C8C] border-[#E5E5E5] hover:bg-[#F5F0EB]"
        }`}
        data-testid={`button-attain-lever-${goal}-${lever.id}-toggle`}
      >
        {committed ? "Committed" : "Not yet"}
      </button>
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
