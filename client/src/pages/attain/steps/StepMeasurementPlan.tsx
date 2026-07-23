import { motion } from "framer-motion";
import { ArrowDown, Check, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeAccessChain } from "@/lib/attain/attainAccess";
import { deriveAccessLadder } from "./accessLadder";
import {
  deriveAccessMeasurementPlan,
  type MeasurementLink,
  type MeasurementMetricOption,
} from "@/lib/attain/attainMeasurement";
import {
  measurementChosen,
  measurementTarget,
  measurementOwner,
  measurementByWhen,
  type AttainPlanning,
  type MeasurementMetricEntry,
} from "@/lib/attain/attainPlanning";
import type { AttainBaseline, LeverValues, MultiGoalContributionsResult } from "@/lib/attain/attainLevers";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import { CADENCE_OPTIONS, CADENCE_LABEL, type GoalOwner, type SignalCadence } from "./StepCommit";
import { PlanningRiskCard, riskPlaceholderFor } from "./StepPlanning";

/**
 * StepMeasurementPlan — the rebuilt Plan step for OUTPATIENT ACCESS.
 *
 * After Align settles WHERE the partner is going and derives the number, this
 * is where they build WHAT THEY WILL MEASURE to get there. It reads as their
 * scorecard, not a form: the promise on the hook, the causal measurement chain
 * generated from their own Align choices, a menu of real metrics per link with
 * THEIR baselines shown and blank owners/dates for them to fill, the one
 * make-or-break commitment, and an honest monthly check that walks the chain.
 *
 * Every derived number tracks the Align state live (a different Align builds a
 * different chain); every baseline is their number or a labeled benchmark;
 * every owner and date is blank until the partner sets it. What the partner
 * picks and types persists on `planning.measurement` so the Attainment step can
 * track exactly these metrics later.
 */

function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">{children}</p>;
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

interface StepMeasurementPlanProps {
  baseline: AttainBaseline;
  values: LeverValues;
  combined: MultiGoalContributionsResult | null;
  goalOwner: GoalOwner;
  onChangeGoalOwner: (patch: Partial<GoalOwner>) => void;
  planning: AttainPlanning;
  onSetChosenMetrics: (linkId: string, metricIds: string[]) => void;
  onChangeMetricField: (metricId: string, patch: Partial<MeasurementMetricEntry>) => void;
  onChangePromiseByWhen: (value: string) => void;
  onChangeCommitment: (patch: { commitmentOwner?: string; commitmentByWhen?: string }) => void;
  onChangePartnerRisk: (text: string) => void;
  planCadence: SignalCadence;
  onChangePlanCadence: (cadence: SignalCadence) => void;
  stepNumber: number;
}

export default function StepMeasurementPlan({
  baseline,
  values,
  combined,
  goalOwner,
  onChangeGoalOwner,
  planning,
  onSetChosenMetrics,
  onChangeMetricField,
  onChangePromiseByWhen,
  onChangeCommitment,
  onChangePartnerRisk,
  planCadence,
  onChangePlanCadence,
  stepNumber,
}: StepMeasurementPlanProps) {
  const goalDef = GOAL_CATALOG.access;

  // The same realization/attribution-applied figures every access surface uses,
  // so link 4's targets and the promise prize reconcile with Align exactly.
  const chain = computeAccessChain(baseline, values, 1);
  const accessResult = combined?.byGoal.access;
  const ladder = deriveAccessLadder(chain, {
    realizedVisits: accessResult?.totalCount ?? chain.payoff.realizedVisits,
    prize: accessResult?.totalMargin ?? 0,
  });

  const model = deriveAccessMeasurementPlan(baseline, values, 1, {
    realizedVisits: ladder.realizedVisits,
    prize: ladder.prize,
  });

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
  // scorecard the monthly check walks. Blocked links contribute nothing.
  const trackedRows = model.links.flatMap((link) =>
    link.blocked
      ? []
      : measurementChosen(planning, link.id, link.defaultChosen)
          .map((id) => link.metrics.find((m) => m.id === id))
          .filter((m): m is MeasurementMetricOption => Boolean(m))
          .map((m) => ({ link, metric: m })),
  );

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step {stepNumber} · Build your measurement plan
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Measurement plan
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-measure-teach">
          You aligned on where you are going and the number fell out of it. This is where you decide what you will
          measure to get there, and how you will know you are getting closer. Whatever you pick here becomes your
          scorecard.
        </p>
      </motion.div>

      {/* 1 — THE PROMISE, on the hook. Goal, exec owner, prize, and the date the
          partner sets. No invented month. */}
      <div className="rounded-2xl border border-[#E7E0D6] bg-[#F4F0EA] p-6 mb-10" data-testid="card-measure-promise">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full"
            style={{ background: goalDef.pillBg }}
          >
            {goalDef.pill}
          </span>
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">The promise</p>
        </div>
        <p className="text-lg md:text-[22px] leading-snug text-[#1A1A1A] font-semibold" data-testid="text-measure-promise-line">
          {goalDef.label}
          <span className="text-[#B4B4B4] font-normal"> · </span>
          Owned by {ownerName ? <span>{ownerName}</span> : <span className="text-[#EA2C00]">name the exec below</span>}
          <span className="text-[#B4B4B4] font-normal"> · </span>
          {prize > 0 ? (
            <span className="text-[#EA2C00]" data-testid="text-measure-promise-prize">{fmtMoneyCompact(prize)}</span>
          ) : (
            <span className="text-[#8C8C8C]">value pending</span>
          )}{" "}
          by {promiseByWhen ? <span data-testid="text-measure-promise-date">{promiseByWhen}</span> : <span className="text-[#EA2C00]">the date you set below</span>}
        </p>

        <div className="mt-4 pt-4 border-t border-[#E0D9CE] grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <FieldLabel>Exec owner</FieldLabel>
            <input
              value={goalOwner.name}
              onChange={(e) => onChangeGoalOwner({ name: e.target.value })}
              placeholder="Name, e.g. Dr. A. Rivera"
              className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
              data-testid="input-measure-owner-name"
            />
          </div>
          <div>
            <FieldLabel>Title / role</FieldLabel>
            <input
              value={goalOwner.title}
              onChange={(e) => onChangeGoalOwner({ title: e.target.value })}
              placeholder="e.g. VP Ambulatory Ops"
              className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
              data-testid="input-measure-owner-title"
            />
          </div>
          <div>
            <FieldLabel>By when</FieldLabel>
            <input
              type="date"
              value={promiseByWhen}
              onChange={(e) => onChangePromiseByWhen(e.target.value)}
              className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
              data-testid="input-measure-promise-date"
            />
          </div>
        </div>
      </div>

      {/* 2 — THE MEASUREMENT CHAIN, built from the Align choices. */}
      <div className="mb-10">
        <h2 className="text-sm font-bold text-[#1A1A1A] mb-1">The measurement chain</h2>
        <p className="text-[12px] text-[#8C8C8C] mb-5 max-w-[600px] leading-relaxed">
          Read it top to bottom. This is the causal order access moves in, built from what you aligned on. For each
          link, pick the metric or metrics you will own. You see your baseline, you set the target, you name the owner
          and a rough date.
        </p>

        {!model.ready ? (
          <div className="rounded-xl border border-[#E7E0D6] bg-white p-5" data-testid="card-measure-empty">
            <p className="text-[13px] text-[#8C8C8C] leading-relaxed">{model.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="section-measure-chain">
            {model.links.map((link, i) => (
              <div key={link.id}>
                {i > 0 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="w-4 h-4 text-[#B4B4B4]" />
                  </div>
                )}
                <LinkCard
                  link={link}
                  chosen={measurementChosen(planning, link.id, link.defaultChosen)}
                  planning={planning}
                  ownerName={ownerName}
                  onToggle={(metricId) => toggleMetric(link, metricId)}
                  onChangeMetricField={onChangeMetricField}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3 — THE COMMITMENT the partner owns. The make-or-break for access. */}
      <div className="rounded-2xl border-2 border-[#EA2C00] bg-[#FFF6F3] p-6 mb-10" data-testid="card-measure-commitment">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block text-[8px] font-bold uppercase tracking-wide text-white bg-[#EA2C00] px-2 py-0.5 rounded-full">
            The commitment
          </span>
          <p className="text-[12px] font-semibold text-[#1A1A1A]">The one thing this plan lives or dies on</p>
        </div>
        <p className="text-[13.5px] text-[#3A3A3A] leading-relaxed mb-4 max-w-[600px]">
          Freed documentation time only opens access if it is directed to the schedule as bookable slots. If it quietly
          refills with other work, the minutes are real but the visits never land. Someone has to own protecting that
          freed time and pointing it at the schedule.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Who owns directing the freed time</FieldLabel>
            <input
              value={commitmentOwner}
              onChange={(e) => onChangeCommitment({ commitmentOwner: e.target.value })}
              placeholder="Name the owner"
              className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
              data-testid="input-measure-commitment-owner"
            />
          </div>
          <div>
            <FieldLabel>In place by</FieldLabel>
            <input
              type="date"
              value={commitmentByWhen}
              onChange={(e) => onChangeCommitment({ commitmentByWhen: e.target.value })}
              className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
              data-testid="input-measure-commitment-date"
            />
          </div>
        </div>
      </div>

      {/* 4 — THE MONTHLY CHECK. Walk the chain, honestly. No fabricated 100%. */}
      <div className="rounded-2xl border border-[#E7E0D6] bg-[#F4F0EA] p-6 mb-10" data-testid="card-measure-monthly-check">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-bold text-[#1A1A1A]">The monthly check</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="select-measure-cadence" className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">
              Reviewed
            </label>
            <Select value={planCadence} onValueChange={(v) => onChangePlanCadence(v as SignalCadence)}>
              <SelectTrigger id="select-measure-cadence" className="h-8 w-[122px] text-xs bg-white" data-testid="select-measure-cadence">
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
        <p className="text-[12px] text-[#8C8C8C] mb-4 leading-relaxed max-w-[600px]">
          Checked {CADENCE_LABEL[planCadence]}. Walk the chain in order. The minutes move first, the visits move last,
          so early links should turn before the later ones. Attainment is not a number you assert. It is whether each
          metric moved toward its target on the schedule you set.
        </p>

        {trackedRows.length === 0 ? (
          <p className="text-[12px] text-[#8C8C8C] leading-relaxed">
            Pick at least one metric above and it shows up here as the scorecard you walk each review.
          </p>
        ) : (
          <div className="rounded-xl border border-[#E7E0D6] bg-white overflow-hidden" data-testid="section-measure-scorecard">
            {trackedRows.map(({ link, metric }, idx) => {
              const target = measurementTarget(planning, metric.id, metric.defaultTarget);
              const owner = measurementOwner(planning, metric.id);
              return (
                <div
                  key={`${link.id}-${metric.id}`}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${idx > 0 ? "border-t border-[#EFEAE1]" : ""}`}
                  data-testid={`row-measure-scorecard-${metric.id}`}
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[#1A1A1A] text-[9px] font-bold text-white font-abridge">
                    {link.n}
                  </span>
                  <span className="text-[13px] font-semibold text-[#1A1A1A] min-w-[160px] flex-1">{metric.label}</span>
                  <span className="text-[12px] text-[#8C8C8C]">
                    {metric.baseline}
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

      {/* 5 — Optional partner-disclosed risk. */}
      <PlanningRiskCard
        partnerRisk={planning.partnerRisk ?? ""}
        onChangePartnerRisk={onChangePartnerRisk}
        placeholder={riskPlaceholderFor("access", "outpatient")}
      />
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
}: {
  link: MeasurementLink;
  chosen: string[];
  planning: AttainPlanning;
  ownerName: string;
  onToggle: (metricId: string) => void;
  onChangeMetricField: (metricId: string, patch: Partial<MeasurementMetricEntry>) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-5 ${link.blocked ? "border-[#E7E0D6] bg-[#FBFAF7]" : "border-[#E7E0D6] bg-white"}`}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {link.metrics.map((metric) => (
              <MetricOptionCard
                key={metric.id}
                metric={metric}
                linkId={link.id}
                selected={chosen.includes(metric.id)}
                onClick={() => onToggle(metric.id)}
              />
            ))}
          </div>

          {/* The expanded editable row for every chosen metric. */}
          {link.metrics
            .filter((m) => chosen.includes(m.id))
            .map((metric) => (
              <MetricDetail
                key={`${metric.id}-detail`}
                metric={metric}
                linkId={link.id}
                planning={planning}
                ownerName={ownerName}
                onChangeMetricField={onChangeMetricField}
              />
            ))}
        </>
      )}
    </motion.div>
  );
}

/** A selectable metric card, ChooseQuestion-style: coral when picked, its
 * baseline and a "from what you told us" note when it came from Align proof. */
function MetricOptionCard({
  metric,
  linkId,
  selected,
  onClick,
}: {
  metric: MeasurementMetricOption;
  linkId: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group text-left rounded-xl border-2 p-3.5 transition-all duration-200 ${
        selected
          ? "border-[#EA2C00] bg-[#FFF6F3]"
          : "border-[#E7E0D6] bg-white hover:border-[#C4B8A8] hover:bg-[#FBFAF7]"
      }`}
      data-testid={`option-measure-metric-${linkId}-${metric.id}`}
      data-selected={selected}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className={`text-[13.5px] font-semibold leading-snug ${selected ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
            {metric.label}
          </p>
          <p className="text-[11.5px] text-[#8C8C8C] leading-relaxed mt-0.5">{metric.helper}</p>
          {metric.fromProof && (
            <p className="text-[10px] font-semibold text-[#8C8C8C] mt-1.5">From what you told us on Align</p>
          )}
        </div>
        <span
          className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all ${
            selected ? "bg-[#EA2C00]" : "border-2 border-[#D8CFC4] group-hover:border-[#B4A896]"
          }`}
          aria-hidden
        >
          {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </span>
      </div>
    </button>
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
}: {
  metric: MeasurementMetricOption;
  linkId: string;
  planning: AttainPlanning;
  ownerName: string;
  onChangeMetricField: (metricId: string, patch: Partial<MeasurementMetricEntry>) => void;
}) {
  const target = measurementTarget(planning, metric.id, metric.defaultTarget);
  const owner = measurementOwner(planning, metric.id);
  const byWhen = measurementByWhen(planning, metric.id);
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-3 rounded-lg border border-[#F3C9BE] bg-[#FFF6F3] p-4"
      data-testid={`detail-measure-metric-${linkId}-${metric.id}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-semibold text-[#1A1A1A]">{metric.label}</span>
        <span className="text-[11px] text-[#8C8C8C]">measured in {metric.unit}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <FieldLabel>Your baseline</FieldLabel>
            <BaselineTag tag={metric.baselineTag} />
          </div>
          <p className="h-9 flex items-center text-[13px] font-semibold text-[#1A1A1A]" data-testid={`text-measure-baseline-${metric.id}`}>
            {metric.baseline}
          </p>
        </div>
        <div>
          <FieldLabel>Target</FieldLabel>
          <input
            value={target}
            onChange={(e) => onChangeMetricField(metric.id, { target: e.target.value })}
            placeholder={metric.defaultTarget}
            className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
            data-testid={`input-measure-target-${metric.id}`}
          />
        </div>
        <div>
          <FieldLabel>Owner</FieldLabel>
          <input
            value={owner}
            onChange={(e) => onChangeMetricField(metric.id, { owner: e.target.value })}
            placeholder={ownerName || "Name the owner"}
            className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
            data-testid={`input-measure-owner-${metric.id}`}
          />
        </div>
        <div>
          <FieldLabel>By when</FieldLabel>
          <input
            type="date"
            value={byWhen}
            onChange={(e) => onChangeMetricField(metric.id, { byWhen: e.target.value })}
            className="h-9 w-full rounded-md border border-[#D8CFC4] bg-white px-2.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
            data-testid={`input-measure-bywhen-${metric.id}`}
          />
        </div>
      </div>
    </motion.div>
  );
}
