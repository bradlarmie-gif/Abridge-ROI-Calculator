import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditorialOptionList, EditorialOptionRow } from "./EditorialOption";
import { computeAccessChain, DEFAULT_MINUTES_SAVED_PER_NOTE } from "@/lib/attain/attainAccess";
import { computeWorkforceChain } from "@/lib/attain/attainWorkforce";
import { deriveAccessLadder } from "./accessLadder";
import {
  deriveAccessMeasurementPlan,
  deriveEdAccessMeasurementPlan,
  deriveRetentionMeasurementPlan,
  deriveRevenueMeasurementPlan,
  deriveQualityMeasurementPlan,
  deriveCapacityMeasurementPlan,
  type MeasurementPlanModel,
  type MeasurementLink,
  type MeasurementMetricOption,
} from "@/lib/attain/attainMeasurement";
import { computeEdAccessChain } from "@/lib/attain/attainEdAccess";
import { computeRevenueChain } from "@/lib/attain/attainRevenue";
import { computeIpRevenueChain } from "@/lib/attain/attainInpatientRevenue";
import { computeCapacityChain } from "@/lib/attain/attainCapacity";
import { deriveQualityLadder } from "@/lib/attain/attainQuality";
import { qualityAlignToLeverValues } from "@/lib/attain/qualityAlign";
import { defaultRealizationPct } from "@/lib/attain/attainLevers";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import {
  measurementChosen,
  measurementBaseline,
  measurementCustom,
  measurementTarget,
  measurementOwner,
  measurementByWhen,
  type AttainPlanning,
  type MeasurementMetricEntry,
  type MeasurementCustomMetric,
} from "@/lib/attain/attainPlanning";
import type { AttainBaseline, LeverValues, MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import { CADENCE_OPTIONS, CADENCE_LABEL, type GoalOwner, type SignalCadence } from "./StepCommit";

/**
 * MeasurementPlanSurface — the per-goal MEASUREMENT PLAN body, shared by the
 * single-goal Plan page (StepMeasurementPlan) and the stacked multi-goal Plan
 * page (StepMultiMeasurementPlan), exactly the way `AlignSurface` is shared
 * across single- and multi-goal Align. Neither caller duplicates any of the
 * scorecard rendering: this one component derives the chain from the SAME Align
 * state the number came from and renders the promise, the causal measurement
 * chain (metric menus + THEIR baselines + blank owners/dates), the one
 * make-or-break commitment, and the honest monthly check.
 *
 * Everything is DYNAMIC to the Align choices and every derived figure tracks
 * the Align state live. `crossGoalShareMultiplier` threads the one freed
 * documentation hour's split into the access/retention chains (1 for every
 * single-goal plan and every other pairing), so a stacked access + retention
 * plan reconciles the two blocks to the same combined prize the engine books,
 * never double-counting the hour. The partner's picks/targets/owners/dates
 * persist on whatever `planning.measurement` slice the caller hands in (the
 * top-level layer for single-goal, the per-goal layer for multi-goal), so the
 * Attainment step tracks exactly these metrics later.
 *
 * The step eyebrow/title/teach and the optional partner-risk line live in the
 * caller (they are once-per-page, not per-goal), matching how AlignSurface
 * leaves the combined header to StepMultiBuildCase.
 */

function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** The editorial form language shared across the Plan (ported from the Starting
 * Point step): small-caps labels and borderless underline fields that turn coral
 * on focus. Replaces the boxed `attain-input` skin everywhere on this surface so
 * the Plan reads as calm as the rest of the flow. */
const EDITORIAL_LABEL = "text-[10px] font-semibold uppercase tracking-[1.6px] text-[#8C8C8C] mb-2";
const EDITORIAL_FIELD =
  "w-full bg-transparent border-0 border-b border-[#E0D9CE] rounded-none px-0 pb-1 text-[15px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:text-[#C4BCB0]";
/** An inline fill-in-the-blank field for the promise sentence: an underline
 * blank that sits in the running text and turns coral on focus. */
const PROMISE_BLANK =
  "inline-block bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 outline-none text-[#1A1A1A] font-semibold placeholder:text-[#C4BCB0] placeholder:font-normal focus:border-[#EA2C00] transition-colors align-baseline";

/** A partner-added custom metric rendered as a metric option (its baseline is
 * blank/their-own, it carries no engine default target). Used so the scorecard
 * and the tracked set can treat it exactly like a built-in metric. */
function customToOption(c: MeasurementCustomMetric): MeasurementMetricOption {
  return {
    id: c.id,
    label: c.label.trim() || "Custom metric",
    unit: "",
    helper: "",
    baseline: "",
    baselineTag: "data",
    defaultTarget: "",
    fromProof: false,
  };
}

/** The small tag that keeps a baseline honest: their own figure, a fact carried
 * from Starting Point, or a labeled benchmark. Neutral grays only, no color
 * coding, so a benchmark is never mistaken for a partner number. */
function BaselineTag({ tag }: { tag: MeasurementMetricOption["baselineTag"] }) {
  const label = tag === "benchmark" ? "Benchmark" : tag === "inherited" ? "From your start" : "Your number";
  return (
    <span className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] bg-[#EFEAE1] px-1.5 py-0.5 rounded">
      {label}
    </span>
  );
}

/**
 * Derives one goal's measurement-plan model from the SAME Align state its
 * number came from, feeding in the same realization/split-applied figures every
 * other surface for this goal uses (off the combined engine result), so the
 * outcome targets and the promise prize reconcile with Align exactly. Only the
 * derivation differs by goal; the scorecard UI below is shared.
 *
 * `crossGoalShareMultiplier` is the access/retention freed-hour split (1 for
 * every single-goal plan and every other pairing). It feeds the RAW chain so
 * the intermediate baselines (freed hours, capacity, departures avoided) reflect
 * the same split the combined prize/count already carry.
 */
export function deriveMeasurementModelFor(
  goal: Extract<GoalId, "access" | "retention" | "revenue" | "quality" | "capacity">,
  setting: AttainSetting,
  baseline: AttainBaseline,
  values: LeverValues,
  combined: MultiGoalContributionsResult | null,
  crossGoalShareMultiplier: number,
): MeasurementPlanModel {
  if (goal === "revenue") {
    // Revenue is multi-path: one lever (complete documentation) feeding several
    // parallel paths that converge into one prize. The per-path dollars are
    // scaled by the realization implied by the combined engine result
    // (revenueRealized / revenueRaw), so the outcome targets and the promise
    // prize match Align exactly.
    const isIp = setting === "inpatient";
    const revenueRaw = isIp
      ? computeIpRevenueChain(baseline, values).totalValue
      : computeRevenueChain(baseline, setting, values).totalValue;
    const revenueRealized = combined?.byGoal.revenue?.totalMargin ?? revenueRaw;
    const realizationPct = revenueRaw > 0 ? (revenueRealized / revenueRaw) * 100 : 100;
    return deriveRevenueMeasurementPlan(baseline, setting, values, { realizationPct });
  }
  if (goal === "quality") {
    // Quality is the safety-first, multi-event exception. Reconcile the SOFT
    // dollar to the combined engine result the way revenue does; the counts are
    // attribution-independent.
    const qualityMerged: LeverValues = {
      ...values,
      ...qualityAlignToLeverValues(values, { baseline, setting, realizationPct: 100, crossGoalShareMultiplier: 1 }),
    };
    const qualityRaw = deriveQualityLadder(baseline, qualityMerged, 100).convergedPrize;
    const qualityRealized = combined?.byGoal.quality?.totalMargin ?? qualityRaw * (defaultRealizationPct("quality") / 100);
    const realizationPct = qualityRaw > 0 ? (qualityRealized / qualityRaw) * 100 : defaultRealizationPct("quality");
    return deriveQualityMeasurementPlan(baseline, values, { realizationPct });
  }
  if (goal === "retention") {
    const rawMinutes = typeof values.retentionMinutesSaved === "number" ? values.retentionMinutesSaved : 0;
    const minutes = rawMinutes > 0 ? rawMinutes : DEFAULT_MINUTES_SAVED_PER_NOTE;
    // The COUNT reads off the chain (at this goal's freed-hour share, so a
    // stacked access + retention plan splits the one hour), the PRIZE reads off
    // the combined result to pick up this priority's realization + split.
    const workforceChain = computeWorkforceChain(baseline, setting, values, crossGoalShareMultiplier);
    const retentionResult = combined?.byGoal.retention;
    return deriveRetentionMeasurementPlan(baseline, setting, values, crossGoalShareMultiplier, {
      minutes,
      departuresAvoided: workforceChain.payoff.departuresAvoided,
      prize: retentionResult?.totalMargin ?? workforceChain.payoff.value,
    });
  }
  if (goal === "capacity") {
    // Capacity (nursing overtime) is a single-gated ladder. The realized OT
    // hours avoided read off the chain, the PRIZE off the combined result to
    // pick up this priority's realization.
    const chain = computeCapacityChain(baseline, values);
    const capacityResult = combined?.byGoal.capacity;
    return deriveCapacityMeasurementPlan(baseline, values, {
      realizedOtHoursAvoided: capacityResult?.totalCount ?? chain.realizedOtHoursAvoided,
      prize: capacityResult?.totalMargin ?? chain.prize,
    });
  }
  // access — ED access is a different mechanism (recover LWBS + capture
  // admissions) on its own chain; outpatient/inpatient/nursing access is the
  // schedule-capacity chain. Both derive from the SAME Align state their number
  // came from and reconcile to the combined engine result.
  if (setting === "ed") {
    const edChain = computeEdAccessChain(baseline, values, crossGoalShareMultiplier);
    const edResult = combined?.byGoal.access;
    return deriveEdAccessMeasurementPlan(baseline, values, crossGoalShareMultiplier, {
      realizedRecovered: edChain.recovery.realizedRecovered,
      capturedAdmissions: edChain.recovery.capturedAdmissions,
      prize: edResult?.totalMargin ?? edChain.payoff.value,
    });
  }
  const chain = computeAccessChain(baseline, values, crossGoalShareMultiplier);
  const accessResult = combined?.byGoal.access;
  const ladder = deriveAccessLadder(chain, {
    realizedVisits: accessResult?.totalCount ?? chain.payoff.realizedVisits,
    prize: accessResult?.totalMargin ?? 0,
  });
  return deriveAccessMeasurementPlan(baseline, values, crossGoalShareMultiplier, {
    realizedVisits: ladder.realizedVisits,
    prize: ladder.prize,
  });
}

interface MeasurementPlanSurfaceProps {
  /** Which goal's measurement plan this is. Access is the exemplar; retention,
   * revenue, and quality reuse this same surface via their own
   * `deriveXMeasurementPlan`. Only the derivation differs; the scorecard UI is
   * shared. Revenue is multi-path and quality is multi-event, so both STACK per
   * path/event under grouped section headers. Quality is the safety-first
   * exception: its promise leads with a COUNT, not a dollar. Capacity (nursing
   * overtime) is a single-gated ladder like access. */
  goal: Extract<GoalId, "access" | "retention" | "revenue" | "quality" | "capacity">;
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  combined: MultiGoalContributionsResult | null;
  /** The freed-documentation-hour split for this goal (1 for single-goal plans
   * and every pairing except access + retention at outpatient/ED). */
  crossGoalShareMultiplier: number;
  goalOwner: GoalOwner;
  onChangeGoalOwner: (patch: Partial<GoalOwner>) => void;
  /** The `AttainPlanning` whose `.measurement` is THIS goal's editable slice
   * (see `measurementPlanningFor`): the top-level layer for a single-goal plan,
   * the per-goal layer for a multi-goal plan. */
  planning: AttainPlanning;
  onSetChosenMetrics: (linkId: string, metricIds: string[]) => void;
  onChangeMetricField: (metricId: string, patch: Partial<MeasurementMetricEntry>) => void;
  /** Custom-metric edits (a tracked signal the partner adds to a link, never
   * priced). Optional so a caller that has not wired them yet still compiles. */
  onAddCustomMetric?: (linkId: string) => void;
  onRemoveCustomMetric?: (linkId: string, id: string) => void;
  onChangeCustomMetricLabel?: (linkId: string, id: string, label: string) => void;
  onChangePromiseByWhen: (value: string) => void;
  onChangeCommitment: (patch: { commitmentOwner?: string; commitmentByWhen?: string }) => void;
  planCadence: SignalCadence;
  onChangePlanCadence: (cadence: SignalCadence) => void;
  /** Hides the promise header's "The promise" eyebrow when a multi-goal caller
   * already carries one combined promise header above the blocks. Defaults to
   * showing it (single-goal). */
  showPromiseEyebrow?: boolean;
}

export default function MeasurementPlanSurface({
  goal,
  setting,
  baseline,
  values,
  combined,
  crossGoalShareMultiplier,
  goalOwner,
  onChangeGoalOwner,
  planning,
  onSetChosenMetrics,
  onChangeMetricField,
  onAddCustomMetric,
  onRemoveCustomMetric,
  onChangeCustomMetricLabel,
  onChangePromiseByWhen,
  onChangeCommitment,
  planCadence,
  onChangePlanCadence,
  showPromiseEyebrow = true,
}: MeasurementPlanSurfaceProps) {
  const goalDef = GOAL_CATALOG[goal];
  const model = deriveMeasurementModelFor(goal, setting, baseline, values, combined, crossGoalShareMultiplier);

  const prize = model.prize;
  const ownerName = goalOwner.name.trim();
  const promiseByWhen = planning.measurement?.promiseByWhen ?? "";
  const commitmentOwner = planning.measurement?.commitmentOwner ?? "";
  const commitmentByWhen = planning.measurement?.commitmentByWhen ?? "";

  const toggleMetric = (link: MeasurementLink, metricId: string) => {
    const current = measurementChosen(planning, link.id, link.defaultChosen);
    const next = current.includes(metricId) ? current.filter((id) => id !== metricId) : [...current, metricId];
    onSetChosenMetrics(link.id, next);
  };

  // Every metric the partner is actually tracking, in chain order, for the
  // scorecard the monthly check walks. Blocked links contribute nothing. Custom
  // metrics (partner-added signals) ride here too, as synthetic options.
  const trackedRows = model.links.flatMap((link) =>
    link.blocked
      ? []
      : [
          ...measurementChosen(planning, link.id, link.defaultChosen)
            .map((id) => link.metrics.find((m) => m.id === id))
            .filter((m): m is MeasurementMetricOption => Boolean(m))
            .map((m) => ({ link, metric: m })),
          ...measurementCustom(planning, link.id).map((c) => ({ link, metric: customToOption(c) })),
        ],
  );

  return (
    <div>
      {/* 1 — THE PROMISE, on the hook. Goal, exec owner, prize, and the date the
          partner sets. No invented month. Editorial (no filled card) so it
          reads as calm as the Starting Point. */}
      <div className="mb-10" data-testid={`card-measure-promise-${goal}`}>
        <div className="flex items-center gap-3 mb-3">
          <span
            className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
            style={{ background: goalDef.pillBg }}
          >
            {goalDef.pill}
          </span>
          {showPromiseEyebrow && <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">The promise</p>}
        </div>
        {/* The promise as a fill-in-the-blank sentence: the owner name and the
            date are inline blanks the partner completes, so it reads as one
            clean line instead of pointing them to fields below. */}
        <p className="text-lg md:text-[22px] leading-[1.9] text-[#1A1A1A] font-semibold" data-testid={`text-measure-promise-line-${goal}`}>
          {goalDef.label}
          <span className="text-[#B4B4B4] font-normal"> · owned by </span>
          <input
            value={goalOwner.name}
            onChange={(e) => onChangeGoalOwner({ name: e.target.value })}
            placeholder="add a name"
            className={`${PROMISE_BLANK} min-w-[150px]`}
            data-testid={`input-measure-owner-name-${goal}`}
          />
          <span className="text-[#B4B4B4] font-normal"> · </span>
          {model.safetyHeadline ? (
            /* SAFETY-FIRST (quality): the hero is a COUNT of harm events
               prevented, never a coral dollar. The dollar drops to the soft
               footnote below. */
            <span className="text-[#EA2C00]" data-testid={`text-measure-promise-count-${goal}`}>{model.safetyHeadline.heroValue}</span>
          ) : prize > 0 ? (
            <span className="text-[#EA2C00]" data-testid={`text-measure-promise-prize-${goal}`}>{fmtMoneyCompact(prize)}</span>
          ) : (
            <span className="text-[#8C8C8C] font-normal">value builds as you go</span>
          )}
          <span className="text-[#B4B4B4] font-normal"> by </span>
          <input
            type="date"
            value={promiseByWhen}
            onChange={(e) => onChangePromiseByWhen(e.target.value)}
            className={`${PROMISE_BLANK} min-w-[150px]`}
            data-testid={`input-measure-promise-date-${goal}`}
          />
        </p>
        {model.safetyHeadline && (
          <p className="mt-2 text-[11px] text-[#8C8C8C] leading-relaxed max-w-[600px]" data-testid={`text-measure-soft-dollar-${goal}`}>
            {model.safetyHeadline.softDollarNote}
          </p>
        )}

        <div className="mt-5 max-w-[320px]">
          <p className={EDITORIAL_LABEL}>Owner's title or role (optional)</p>
          <input
            value={goalOwner.title}
            onChange={(e) => onChangeGoalOwner({ title: e.target.value })}
            placeholder="e.g. VP Ambulatory Ops"
            className={EDITORIAL_FIELD}
            data-testid={`input-measure-owner-title-${goal}`}
          />
        </div>
      </div>

      {/* 2 — THE MEASUREMENT CHAIN, built from the Align choices. */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-[#1A1A1A] mb-1">What you'll measure to get there</h2>
        <p className="text-[12px] text-[#8C8C8C] mb-5 max-w-[600px] leading-relaxed">
          Read it top to bottom. Each step is what has to happen for the value to show up, in the order it happens.
          {goal === "revenue" ? " It starts with the one thing every path depends on, then adds the steps for each revenue path you picked." : ""} For each
          one, pick what you'll measure, set the target, and name who owns it.
        </p>

        {!model.ready ? (
          <div className="rounded-xl border border-[#E7E0D6] bg-white p-5" data-testid={`card-measure-empty-${goal}`}>
            <p className="text-[13px] text-[#8C8C8C] leading-relaxed">{model.emptyHint}</p>
          </div>
        ) : (
          <div data-testid={`section-measure-chain-${goal}`}>
            {model.links.map((link, i) => {
              const prevGroup = i > 0 ? model.links[i - 1].groupLabel : undefined;
              const startsGroup = Boolean(link.groupLabel) && link.groupLabel !== prevGroup;
              // Links are separated by a single hairline, never a boxed card or a
              // dangling down-arrow. A group start draws its own coral heading
              // rule instead.
              const sep = i === 0 ? "" : startsGroup ? "" : "mt-8 pt-8 border-t border-[#EFEAE1]";
              return (
              <div key={link.id} className={sep}>
                {startsGroup && (
                  <div className="flex items-center gap-2 pt-8 pb-3 mt-4 first:mt-0 first:pt-0" data-testid={`heading-measure-group-${goal}-${link.groupLabel}`}>
                    <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#EA2C00]">{link.groupLabel}</span>
                    <span className="flex-1 h-px bg-[#E7E0D6]" />
                  </div>
                )}
                <LinkCard
                  link={link}
                  chosen={measurementChosen(planning, link.id, link.defaultChosen)}
                  planning={planning}
                  ownerName={ownerName}
                  onToggle={(metricId) => toggleMetric(link, metricId)}
                  onChangeMetricField={onChangeMetricField}
                  onAddCustom={onAddCustomMetric}
                  onRemoveCustom={onRemoveCustomMetric}
                  onChangeCustomLabel={onChangeCustomMetricLabel}
                />
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3 — THE COMMITMENT the partner owns. The make-or-break. A quiet
          coral-tick block (the selected-row language), never a heavy filled box. */}
      <div className="mb-10 pl-5 border-l-2 border-[#EA2C00]" data-testid={`card-measure-commitment-${goal}`}>
        <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#EA2C00] mb-1.5">
          The commitment · {model.commitment.title}
        </p>
        <p className="text-[13.5px] text-[#3A3A3A] leading-relaxed mb-4 max-w-[600px]" data-testid={`text-measure-commitment-teach-${goal}`}>
          {model.commitment.teach}
        </p>
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <div className="min-w-[200px] flex-1">
            <p className={EDITORIAL_LABEL}>{model.commitment.ownerLabel}</p>
            <input
              value={commitmentOwner}
              onChange={(e) => onChangeCommitment({ commitmentOwner: e.target.value })}
              placeholder="Name the owner"
              className={EDITORIAL_FIELD}
              data-testid={`input-measure-commitment-owner-${goal}`}
            />
          </div>
          <div className="min-w-[150px]">
            <p className={EDITORIAL_LABEL}>In place by</p>
            <input
              type="date"
              value={commitmentByWhen}
              onChange={(e) => onChangeCommitment({ commitmentByWhen: e.target.value })}
              className={EDITORIAL_FIELD}
              data-testid={`input-measure-commitment-date-${goal}`}
            />
          </div>
        </div>
      </div>

      {/* 4 — THE MONTHLY CHECK. The takeaway of the whole plan: the scorecard the
          partner walks every review. Framed and weighted as the deliverable, not
          a footnote. Walk the chain, honestly. No fabricated 100%. */}
      <div className="rounded-2xl border-2 border-[#1A1A1A] bg-[#F4F0EA] p-6 md:p-8" data-testid={`card-measure-monthly-check-${goal}`}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-2">The takeaway</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl md:text-2xl font-bold text-[#1A1A1A] font-abridge uppercase tracking-tight" data-testid={`text-measure-monthly-title-${goal}`}>
                The scorecard you walk each review
              </h2>
              {trackedRows.length > 0 && (
                <span
                  className="inline-flex items-center text-[11px] font-bold uppercase tracking-wide text-[#1A1A1A] bg-white border border-[#E7E0D6] px-2.5 py-1 rounded-full"
                  data-testid={`text-measure-scorecard-count-${goal}`}
                >
                  {trackedRows.length} {trackedRows.length === 1 ? "metric" : "metrics"}
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#3A3A3A] mt-2 leading-relaxed max-w-[560px]">
              Everything you picked above gathers here. This is the one page you carry into every review.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <label htmlFor={`select-measure-cadence-${goal}`} className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">
              Reviewed
            </label>
            <Select value={planCadence} onValueChange={(v) => onChangePlanCadence(v as SignalCadence)}>
              <SelectTrigger id={`select-measure-cadence-${goal}`} className="h-8 w-[122px] text-xs bg-white" data-testid={`select-measure-cadence-${goal}`}>
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
        <p className="text-[12px] text-[#8C8C8C] mb-4 leading-relaxed max-w-[600px]" data-testid={`text-measure-monthly-teach-${goal}`}>
          Checked {CADENCE_LABEL[planCadence]}. {model.monthlyCheckTeach}
        </p>

        {trackedRows.length === 0 ? (
          <p className="text-[12px] text-[#8C8C8C] leading-relaxed">
            Pick at least one metric above and it shows up here as the scorecard you walk each review.
          </p>
        ) : (
          <div className="rounded-xl border border-[#E7E0D6] bg-white overflow-hidden" data-testid={`section-measure-scorecard-${goal}`}>
            {trackedRows.map(({ link, metric }, idx) => {
              const target = measurementTarget(planning, metric.id, metric.defaultTarget);
              const baseline = measurementBaseline(planning, metric.id, metric.baseline);
              const owner = measurementOwner(planning, metric.id);
              return (
                <div
                  key={`${link.id}-${metric.id}`}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${idx > 0 ? "border-t border-[#EFEAE1]" : ""}`}
                  data-testid={`row-measure-scorecard-${goal}-${metric.id}`}
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[#1A1A1A] text-[9px] font-bold text-white font-abridge">
                    {link.n}
                  </span>
                  <span className="text-[13px] font-semibold text-[#1A1A1A] min-w-[160px] flex-1">{metric.label}</span>
                  <span className="text-[12px] text-[#8C8C8C]">
                    {baseline}
                    <span className="text-[#B4B4B4]"> to </span>
                    <span className="text-[#EA2C00] font-semibold">{target}</span>
                  </span>
                  <span className="text-[11px] text-[#8C8C8C] min-w-[120px] text-right">
                    {owner ? owner : <span className="text-[#B4B4B4] italic">owner unset</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** One chain link: its number, title, teaching line, the metric menu, and an
 * expanded row per chosen metric (baseline read-only, target/owner/date the
 * partner sets). A blocked link teaches the honest limit instead of a menu. */
function LinkCard({
  link,
  chosen,
  planning,
  ownerName,
  onToggle,
  onChangeMetricField,
  onAddCustom,
  onRemoveCustom,
  onChangeCustomLabel,
}: {
  link: MeasurementLink;
  chosen: string[];
  planning: AttainPlanning;
  ownerName: string;
  onToggle: (metricId: string) => void;
  onChangeMetricField: (metricId: string, patch: Partial<MeasurementMetricEntry>) => void;
  onAddCustom?: (linkId: string) => void;
  onRemoveCustom?: (linkId: string, id: string) => void;
  onChangeCustomLabel?: (linkId: string, id: string, label: string) => void;
}) {
  const chosenMetrics = link.metrics.filter((m) => chosen.includes(m.id));
  const customs = measurementCustom(planning, link.id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className=""
      data-testid={`card-measure-link-${link.id}`}
    >
      <div className="flex items-start gap-2.5 mb-3">
        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#1A1A1A] text-[10px] font-bold text-white font-abridge">
          {link.n}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#1A1A1A]">{link.title}</p>
          <p className="text-[12px] text-[#8C8C8C] leading-relaxed mt-0.5 max-w-[560px]">{link.teach}</p>
        </div>
      </div>

      {link.blocked ? (
        <div className="flex items-start gap-2 rounded-lg bg-[#EFEAE1] px-4 py-3" data-testid={`callout-measure-blocked-${link.id}`}>
          <Lock className="w-3.5 h-3.5 text-[#8C8C8C] mt-0.5 flex-shrink-0" />
          <p className="text-[12px] text-[#3A3A3A] leading-relaxed">{link.blockedReason}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C]">
              What will you measure here
            </span>
            <span className="text-[10px] text-[#B4B4B4]">pick any that apply</span>
          </div>
          <EditorialOptionList>
            {link.metrics.map((metric) => (
              <EditorialOptionRow
                key={metric.id}
                title={metric.label}
                description={metric.helper}
                selected={chosen.includes(metric.id)}
                multi
                onClick={() => onToggle(metric.id)}
                note={
                  metric.fromProof ? (
                    <p className="text-[10px] font-semibold text-[#8C8C8C] mt-1.5">
                      From what you told us on Align
                    </p>
                  ) : undefined
                }
                testId={`option-measure-metric-${link.id}-${metric.id}`}
              />
            ))}
          </EditorialOptionList>

          {/* The expanded editable row for every chosen metric, each headed by
              its metric name so several open at once stay unambiguous. The first
              sits under the option list's own bottom hairline (no border of its
              own); later ones draw a single separating hairline. */}
          {chosenMetrics.map((metric, idx) => (
            <MetricDetail
              key={`${metric.id}-detail`}
              metric={metric}
              linkId={link.id}
              planning={planning}
              ownerName={ownerName}
              onChangeMetricField={onChangeMetricField}
              first={idx === 0}
            />
          ))}

          {/* Partner-added custom metrics: a tracked signal, not priced. */}
          {customs.map((c, cidx) => (
            <CustomMetricRow
              key={`${c.id}-custom`}
              custom={c}
              planning={planning}
              onChangeMetricField={onChangeMetricField}
              onChangeLabel={(label) => onChangeCustomLabel?.(link.id, c.id, label)}
              onRemove={() => onRemoveCustom?.(link.id, c.id)}
              first={chosenMetrics.length === 0 && cidx === 0}
            />
          ))}

          {onAddCustom && (
            <button
              type="button"
              onClick={() => onAddCustom(link.id)}
              className="mt-4 text-[12.5px] font-semibold text-[#EA2C00] hover:underline"
              data-testid={`button-measure-add-custom-${link.id}`}
            >
              + Add your own metric
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}

/** The editable row under a chosen metric: their baseline (read-only, tagged),
 * the target (editable, defaulting to the derived/benchmark value), the owner
 * (blank), and a rough by-when (blank). */
function MetricDetail({
  metric,
  linkId,
  planning,
  ownerName,
  onChangeMetricField,
  first,
}: {
  metric: MeasurementMetricOption;
  linkId: string;
  planning: AttainPlanning;
  ownerName: string;
  onChangeMetricField: (metricId: string, patch: Partial<MeasurementMetricEntry>) => void;
  /** The first detail under a link sits on the option list's own bottom
   * hairline, so it draws no border of its own (avoids the double line). */
  first?: boolean;
}) {
  const target = measurementTarget(planning, metric.id, metric.defaultTarget);
  const owner = measurementOwner(planning, metric.id);
  const byWhen = measurementByWhen(planning, metric.id);
  // The partner's own baseline where they typed one (blank -> show the derived
  // baseline as the placeholder, tagged for what it is).
  const baselineInput = measurementBaseline(planning, metric.id, "");
  const baselineOwn = baselineInput.trim().length > 0;
  // The editorial language ported from the Starting Point step: small-caps
  // labels, borderless underline fields that turn coral on focus, coral only on
  // the target value. No coral-tinted panel, no boxed inputs.
  const LBL = "text-[10px] font-semibold uppercase tracking-[1.6px] text-[#8C8C8C]";
  const field =
    "w-full bg-transparent border-0 border-b border-[#E0D9CE] rounded-none px-0 pb-1 text-[15px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:text-[#C4BCB0]";
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="overflow-hidden"
      data-testid={`detail-measure-metric-${linkId}-${metric.id}`}
    >
      <div className={`pt-5 pb-2 pl-5 ${first ? "" : "mt-1 border-t border-[#EFEAE1]"}`}>
        {/* Head each detail with its metric name, so several open at once never
            leave the partner unsure which set of fields belongs to which. */}
        <p className="text-[12.5px] font-semibold text-[#1A1A1A] mb-4">
          {metric.label}
          {metric.unit ? <span className="text-[11px] font-normal text-[#8C8C8C]"> · measured in {metric.unit}</span> : null}
        </p>
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <div className="min-w-[130px]">
            <div className="flex items-center gap-1.5 mb-2">
              <span className={LBL}>Your baseline</span>
              {/* Honest by construction: "Your number" only once the partner types
                  one, otherwise the derived tag (a Starting-Point fact, an Align
                  number, or a plainly-labeled Benchmark). Never calls a benchmark
                  their number. */}
              <BaselineTag tag={baselineOwn ? "data" : metric.baselineTag} />
            </div>
            <input
              value={baselineInput}
              onChange={(e) => onChangeMetricField(metric.id, { baseline: e.target.value })}
              placeholder={metric.baseline}
              className={field}
              data-testid={`input-measure-baseline-${metric.id}`}
            />
          </div>
          <div className="min-w-[130px]">
            <p className={`${LBL} mb-2`}>Target</p>
            <input
              value={target}
              onChange={(e) => onChangeMetricField(metric.id, { target: e.target.value })}
              placeholder={metric.defaultTarget}
              className={`${field} text-[#EA2C00] font-semibold placeholder:text-[#EFB9AC] placeholder:font-normal`}
              data-testid={`input-measure-target-${metric.id}`}
            />
          </div>
          <div className="min-w-[150px] flex-1">
            <p className={`${LBL} mb-2`}>Owner</p>
            <input
              value={owner}
              onChange={(e) => onChangeMetricField(metric.id, { owner: e.target.value })}
              placeholder={ownerName || "Name the owner"}
              className={field}
              data-testid={`input-measure-owner-${metric.id}`}
            />
          </div>
          <div className="min-w-[140px]">
            <p className={`${LBL} mb-2`}>By when</p>
            <input
              type="date"
              value={byWhen}
              onChange={(e) => onChangeMetricField(metric.id, { byWhen: e.target.value })}
              className={field}
              data-testid={`input-measure-bywhen-${metric.id}`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** A partner-added custom metric: an editable name (tracked, not priced) plus
 * the same baseline/target/owner/date fields as a built-in metric, in the
 * editorial language. Removable. */
function CustomMetricRow({
  custom,
  planning,
  onChangeMetricField,
  onChangeLabel,
  onRemove,
  first,
}: {
  custom: MeasurementCustomMetric;
  planning: AttainPlanning;
  onChangeMetricField: (metricId: string, patch: Partial<MeasurementMetricEntry>) => void;
  onChangeLabel: (label: string) => void;
  onRemove: () => void;
  first?: boolean;
}) {
  const baselineInput = measurementBaseline(planning, custom.id, "");
  const target = measurementTarget(planning, custom.id, "");
  const owner = measurementOwner(planning, custom.id);
  const byWhen = measurementByWhen(planning, custom.id);
  const LBL = "text-[10px] font-semibold uppercase tracking-[1.6px] text-[#8C8C8C]";
  const field =
    "w-full bg-transparent border-0 border-b border-[#E0D9CE] rounded-none px-0 pb-1 text-[15px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:text-[#C4BCB0]";
  return (
    <div
      className={`pt-5 pb-2 pl-5 ${first ? "" : "mt-1 border-t border-[#EFEAE1]"}`}
      data-testid={`detail-measure-custom-${custom.id}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <p className={`${LBL} mb-1.5`}>
            Your metric <span className="text-[#B4B4B4] normal-case tracking-normal font-normal">· tracked, not priced</span>
          </p>
          <input
            value={custom.label}
            onChange={(e) => onChangeLabel(e.target.value)}
            placeholder="Name the metric you want to watch"
            className={`${field} text-[15px] font-semibold`}
            data-testid={`input-measure-custom-label-${custom.id}`}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] font-semibold text-[#8C8C8C] hover:text-[#EA2C00] flex-shrink-0 self-end pb-1"
          data-testid={`button-measure-remove-custom-${custom.id}`}
        >
          Remove
        </button>
      </div>
      <div className="flex flex-wrap gap-x-10 gap-y-5">
        <div className="min-w-[130px]">
          <p className={`${LBL} mb-2`}>Your baseline</p>
          <input
            value={baselineInput}
            onChange={(e) => onChangeMetricField(custom.id, { baseline: e.target.value })}
            placeholder="e.g., 12 today"
            className={field}
            data-testid={`input-measure-baseline-${custom.id}`}
          />
        </div>
        <div className="min-w-[130px]">
          <p className={`${LBL} mb-2`}>Target</p>
          <input
            value={target}
            onChange={(e) => onChangeMetricField(custom.id, { target: e.target.value })}
            placeholder="e.g., under 8"
            className={`${field} text-[#EA2C00] font-semibold placeholder:text-[#EFB9AC] placeholder:font-normal`}
            data-testid={`input-measure-target-${custom.id}`}
          />
        </div>
        <div className="min-w-[150px] flex-1">
          <p className={`${LBL} mb-2`}>Owner</p>
          <input
            value={owner}
            onChange={(e) => onChangeMetricField(custom.id, { owner: e.target.value })}
            placeholder="Name the owner"
            className={field}
            data-testid={`input-measure-owner-${custom.id}`}
          />
        </div>
        <div className="min-w-[140px]">
          <p className={`${LBL} mb-2`}>By when</p>
          <input
            type="date"
            value={byWhen}
            onChange={(e) => onChangeMetricField(custom.id, { byWhen: e.target.value })}
            className={field}
            data-testid={`input-measure-bywhen-${custom.id}`}
          />
        </div>
      </div>
    </div>
  );
}
