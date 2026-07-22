import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { realizedValue, formulaWithRealization, type LeverValues } from "@/lib/attain/attainLevers";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeEdAccessChain,
  marginPerVisitFor,
  admissionMarginFor,
  admissionRealizationFor,
  edAccessBindingPlainPhrase,
  DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE,
  DEFAULT_ED_ACCESS_LWBS_RATE,
  DEFAULT_ED_ACCESS_HOURS_PER_RECOVERY,
} from "@/lib/attain/attainEdAccess";
import type { AttainSetting } from "@/lib/attain/attainTypes";

function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}

/** Unlike `asNum` (which collapses "unset" and "explicitly 0" to the same
 * displayed 0), minutes-saved needs to distinguish the two so a partner who
 * deliberately types 0 sees 0, not a silent snap back to the benchmark -
 * see attainEdAccess.ts's `computeEdAccessChain` for the matching engine
 * fix (the counterfactual this preserves). */
function numOrDefault(raw: number | string[] | undefined, fallback: number): number {
  return typeof raw === "number" ? raw : fallback;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

interface EdAccessDecisionChainProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  /** This priority's realization/attribution rate, 0-100, default 100 - see
   * AccessDecisionChain.tsx's matching prop for the full explanation. */
  realizationPct: number;
  /** The access/retention shared-freed-hour split (0-1), 1 when Retention is
   * not also selected - see AccessDecisionChain.tsx's matching prop and
   * StepBuildCase.tsx's `crossGoalShareMultiplier` for the full explanation. */
  crossGoalShareMultiplier: number;
}

/** A card shell shared by every D-step - same local convention every other
 * bespoke chain (Access/Revenue/Workforce/Quality) uses, deliberately not
 * shared with the generic lever card (bypassed entirely for ED access). */
function DecisionCard({
  step,
  title,
  help,
  testid,
  children,
}: {
  step: string;
  title: string;
  help: string;
  testid: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#E7E0D6] bg-white p-7 mb-6"
      data-testid={testid}
    >
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">{step}</p>
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 font-abridge">{title}</h3>
      <p className="text-[15px] text-[#8C8C8C] leading-relaxed mb-5 max-w-[620px]">{help}</p>
      {children}
    </motion.div>
  );
}

/** A quiet, count-only output row - visits, providers, or patients, NEVER a
 * dollar figure. D1-D4 all use this; D5 is the one place a dollar appears. */
function CountOutput({ label, value, unit, testid }: { label: string; value: string; unit: string; testid: string }) {
  return (
    <div className="bg-[#F8F5F1] rounded-lg px-4 py-3 flex items-baseline justify-between gap-3" data-testid={testid}>
      <span className="text-sm text-[#8C8C8C]">{label}</span>
      <span className="text-xl font-bold text-[#1A1A1A] font-abridge">
        {value} <span className="text-xs font-normal text-[#8C8C8C]">{unit}</span>
      </span>
    </div>
  );
}

/** One stat in the D4 plain-language result block - the pool, the freed-time
 * capacity, or realized, side by side. Never a dollar figure (D1-D4 rule);
 * `emphasize` marks the realized figure, the actual answer to "how many
 * patients do we get back." Mirrors AccessDecisionChain.tsx's `ResultStat`. */
function ResultStat({
  label,
  hint,
  value,
  unit,
  testid,
  emphasize,
}: {
  label: string;
  hint?: string;
  value: string;
  unit: string;
  testid: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-[#8C8C8C] mb-1 leading-snug">{label}</p>
      <p className={`text-xl font-bold font-abridge ${emphasize ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`} data-testid={testid}>
        {value} <span className="text-xs font-normal text-[#8C8C8C]">{unit}</span>
      </p>
      {hint && <p className="text-[10.5px] text-[#B4B4B4] mt-0.5">{hint}</p>}
    </div>
  );
}

function InfoTip({ text, testid }: { text: string; testid: string }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="text-[#B4B4B4] hover:text-[#8C8C8C] transition-colors cursor-help inline-flex" data-testid={testid}>
          <HelpCircle className="w-3.5 h-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function FieldLabel({ children, tip, testid }: { children: React.ReactNode; tip?: string; testid?: string }) {
  return (
    <label className="text-sm font-medium text-[#3A3A3A] mb-2 flex items-center gap-1.5">
      {children}
      {tip && testid && <InfoTip text={tip} testid={testid} />}
    </label>
  );
}

function MathBox({ formula, testid }: { formula: string; testid: string }) {
  return (
    <div className="mt-3 bg-[#F8F5F1] border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
      <p className="text-[12.5px] text-[#3A3A3A] leading-relaxed" data-testid={testid}>
        {formula}
      </p>
    </div>
  );
}

/**
 * Build the case, ED ACCESS - a bespoke ordered decision chain, matching
 * outpatient access's chain bar (`AccessDecisionChain.tsx`) in SHAPE (a
 * mechanically derived capacity vs. an independently sourced ceiling, MIN'd
 * together) but priced on a genuinely different mechanism: ED access is
 * about recovering patients who left without being seen (LWBS) and
 * capturing the downstream admissions some of them become, not opening new
 * schedule capacity. D3 mechanically converts freed charting time into a
 * throughput commitment (never a free-typed outcome); D4 pits that
 * mechanical number against the recoverable LWBS pool - a genuinely
 * independent ceiling, MIN'd the same way outpatient MINs capacity against
 * demand - then applies the admission share and its own bed/payer
 * realization cap. D1-D4 below show providers, hours, or patients, never a
 * dollar. D5 is the one place a dollar first appears, derived from the
 * other three, never invented. See `attainEdAccess.ts`'s module header for
 * the full chain, its CHANGELOG, and its reconciliation to Explore's
 * `edLwbs`/`admissionCapture` primitives.
 */
export default function EdAccessDecisionChain({ setting, baseline, values, onChangeValue, realizationPct, crossGoalShareMultiplier }: EdAccessDecisionChainProps) {
  const totalProviders = Math.max(0, Math.round(baseline.providers ?? 0));
  const requestedProviders = asNum(values.edAccessProviders);

  const chain = computeEdAccessChain(baseline, values, crossGoalShareMultiplier);
  const { scope, mechanism, pool, recovery, payoff, formulas } = chain;
  const realizedPayoffValue = realizedValue(payoff.value, realizationPct);
  const payoffFormulaDisplay = payoff.value > 0
    ? formulaWithRealization(formulas.payoff, realizationPct, realizedPayoffValue)
    : formulas.payoff;

  return (
    <div data-testid="section-attain-ed-access-chain">
      <DecisionCard
        step="D1"
        title="Who you point at ED access"
        help="Providers actually committed to converting freed charting time into faster throughput are the scope every decision below is built from. No dollar figure yet, there is no worth or recovery decided."
        testid="card-ed-access-d1"
      >
        <div className="mb-4 max-w-[280px]">
          <FieldLabel>How many ED providers are in scope</FieldLabel>
          <NumberField
            value={requestedProviders}
            onValueChange={(v) => onChangeValue("edAccessProviders", v)}
            min={0}
            max={totalProviders || undefined}
            decimal={false}
            className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
            placeholder={totalProviders > 0 ? `e.g., up to ${totalProviders}` : "e.g., 55"}
            data-testid="input-ed-access-providers"
          />
          <p className="text-[11px] text-[#8C8C8C] mt-1">
            Capped at your Starting-point count{totalProviders > 0 ? ` of ${totalProviders.toLocaleString()}` : ""}.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CountOutput label="In scope for ED access" value={fmtInt(scope.providersInScope)} unit="providers" testid="text-ed-access-d1-providers" />
          <CountOutput label="Annual ED visits in scope" value={fmtInt(scope.visitsInScope)} unit="visits/yr" testid="text-ed-access-d1-visits" />
        </div>
        <MathBox formula={formulas.scope} testid="text-ed-access-d1-formula" />
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="What an ED visit, and a downstream admission, are worth"
        help="Contribution margin, not charges - what a recovered visit is actually worth on an already-staffed shift, and separately, whatever a recovered patient becomes if they are admitted. Priced separately because they are not the same claim. Still no dollar total, there is no recovery decided yet."
        testid="card-ed-access-d2"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel
              tip="Contribution margin booked per recovered ED visit - revenue minus the variable cost of delivering it, not gross charges. Benchmarked, but your own number."
              testid="tooltip-ed-access-margin-per-visit"
            >
              Contribution margin per recovered visit
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
              <NumberField
                value={marginPerVisitFor(values)}
                onValueChange={(v) => onChangeValue("edAccessMarginPerVisit", v)}
                min={0}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
                data-testid="input-ed-access-margin-per-visit"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/visit</span>
            </div>
          </div>
          <div>
            <FieldLabel
              tip="Margin booked per downstream admission. A recovered visit and the admission it sometimes becomes are not the same claim."
              testid="tooltip-ed-access-admission-margin"
            >
              Margin per downstream admission
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
              <NumberField
                value={admissionMarginFor(values)}
                onValueChange={(v) => onChangeValue("edAccessAdmissionMargin", v)}
                min={0}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
                data-testid="input-ed-access-admission-margin"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/admission</span>
            </div>
          </div>
        </div>
      </DecisionCard>

      <DecisionCard
        step="D3"
        title="Convert freed time to faster throughput"
        help="Freed documentation time is the only thing that mechanically buys a faster door-to-provider time here. A share of it is committed to throughput; the rest stays protected relief. Output is in patients, still no dollars."
        testid="card-ed-access-d3"
      >
        <div className="flex flex-wrap gap-6 mb-4">
          <div className="w-[160px]">
            <FieldLabel
              tip="How many minutes of documentation Abridge saves on the average ED note. A real, editable input - zero here mechanically zeroes recovery below, at any throughput share."
              testid="tooltip-ed-access-minutes-saved"
            >
              Minutes saved per note
            </FieldLabel>
            <NumberField
              value={numOrDefault(values.edAccessMinutesSaved, DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE)}
              onValueChange={(v) => onChangeValue("edAccessMinutesSaved", v)}
              min={0}
              max={60}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              data-testid="input-ed-access-minutes-saved"
            />
          </div>
          <div className="w-[220px]">
            <FieldLabel
              tip="How many provider-hours of committed, expedited attention it typically takes to bring back one patient who would otherwise have left. A real, editable assumption - shorten it and the same freed hours convert to more recovered patients."
              testid="tooltip-ed-access-hours-per-recovery"
            >
              Hours of throughput time / recovered patient
            </FieldLabel>
            <NumberField
              value={asNum(values.edAccessHoursPerRecovery) > 0 ? asNum(values.edAccessHoursPerRecovery) : DEFAULT_ED_ACCESS_HOURS_PER_RECOVERY}
              onValueChange={(v) => onChangeValue("edAccessHoursPerRecovery", v)}
              min={0.25}
              max={8}
              decimal={true}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              data-testid="input-ed-access-hours-per-recovery"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Share of freed time committed to throughput (vs relief)
              <InfoTip
                text="The portion of the time Abridge frees up that gets committed to faster door-to-provider throughput, instead of staying as protected relief for the provider. This is the one decision that mechanically turns freed time into recovered patients - not a target typed directly."
                testid="tooltip-ed-access-throughput-share"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-ed-access-throughput-share-value">
              {Math.round(asNum(values.edAccessThroughputShare))}%
            </span>
          </div>
          <Slider
            value={[asNum(values.edAccessThroughputShare)]}
            onValueChange={(v) => onChangeValue("edAccessThroughputShare", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-ed-access-throughput-share"
          />
        </div>

        <CountOutput label="Mechanically enabled recovery" value={fmtInt(mechanism.mechanicallyEnabledRecovered)} unit="patients/yr" testid="text-ed-access-d3-output" />
        <MathBox formula={formulas.mechanism} testid="text-ed-access-d3-formula" />
        <p className="text-[11px] text-[#8C8C8C] mt-2">
          ~{fmtInt(mechanism.freedHoursTotal)} freed provider-hours/yr at {mechanism.minutesSavedPerNote} min saved/note, {Math.round(mechanism.throughputSharePct)}% committed to throughput.
        </p>
      </DecisionCard>

      <DecisionCard
        step="D4"
        title="The recoverable pool, the ceiling"
        help="Your current LWBS rate times ED volume in scope is the pool of patients who actually left without being seen - a measured fact, completely independent of D3's freed-time math. Realized recovery is the smaller of the pool and what freed time mechanically affords. A share of what is recovered becomes a downstream admission, capped again for bed and payer availability."
        testid="card-ed-access-d4"
      >
        <div className="mb-4 max-w-[220px]">
          <FieldLabel
            tip="The rate the recoverable pool is measured against. Your own number, not a benchmark you never checked."
            testid="tooltip-ed-access-lwbs-rate"
          >
            Your current LWBS rate
          </FieldLabel>
          <div className="relative">
            <NumberField
              value={asNum(values.edAccessLwbsRate) > 0 ? asNum(values.edAccessLwbsRate) : DEFAULT_ED_ACCESS_LWBS_RATE}
              onValueChange={(v) => onChangeValue("edAccessLwbsRate", v)}
              min={0}
              max={50}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
              data-testid="input-ed-access-lwbs-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
          </div>
        </div>

        <div className="rounded-lg bg-[#F8F5F1] p-4 mb-4" data-testid="panel-ed-access-d4-result">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-3">The result</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <ResultStat label="The recoverable pool" hint="Current rate × visits in scope" value={fmtInt(pool.poolVisits)} unit="patients/yr" testid="text-ed-access-d4-pool" />
            <ResultStat label="Freed-time capacity" hint="From D3" value={fmtInt(mechanism.mechanicallyEnabledRecovered)} unit="patients/yr" testid="text-ed-access-d4-mechanical" />
            <ResultStat
              label="Realized recovered visits"
              hint="The smaller of the two"
              value={fmtInt(recovery.realizedRecovered)}
              unit="visits/yr"
              emphasize
              testid="text-ed-access-d4-realized"
            />
          </div>
          <p className="text-[13.5px] text-[#1A1A1A] font-semibold flex items-center gap-1.5" data-testid="text-ed-access-d4-binding">
            {edAccessBindingPlainPhrase(recovery.binding)}
            <InfoTip
              text="Realized recovery can never be more than either side. The pool is a measured fact, independent of the freed-time math above - whichever number is smaller sets the real ceiling, the same MIN discipline outpatient access uses for capacity vs. demand."
              testid="tooltip-ed-access-d4-binding"
            />
          </p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Share of recovered patients who attempt an admission
              <InfoTip text="Not every recovered patient is admitted. This is the share of realized recovery, not of the pool, that attempts a downstream admission." testid="tooltip-ed-access-admission-rate" />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-ed-access-admission-rate-value">
              {Math.round(recovery.admissionRatePct)}%
            </span>
          </div>
          <Slider
            value={[recovery.admissionRatePct]}
            onValueChange={(v) => onChangeValue("edAccessAdmissionRate", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-ed-access-admission-rate"
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Admission realization (bed / payer availability)
              <InfoTip
                text="Not every admission attempt finds an empty bed or a payer-accepted stay. This is the honest cap on the admission leg - bed availability, payer mix - benchmarked but editable to your own number."
                testid="tooltip-ed-access-admission-realization"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-ed-access-admission-realization-value">
              {Math.round(admissionRealizationFor(values))}%
            </span>
          </div>
          <Slider
            value={[admissionRealizationFor(values)]}
            onValueChange={(v) => onChangeValue("edAccessAdmissionRealization", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-ed-access-admission-realization"
          />
        </div>

        <CountOutput label="Captured admissions" value={fmtInt(recovery.capturedAdmissions)} unit="admissions/yr" testid="text-ed-access-d4-admissions" />
        <MathBox formula={formulas.recovery} testid="text-ed-access-d4-formula" />
      </DecisionCard>

      {/* D5 used to be a full-bleed dark hero card - the exact dollar the
          side panel's "Plan so far" already shows, stranded at the bottom
          of the page. It's now a quiet inline line, same card shell as
          D1-D4, so the panel stays the one place that total actually
          lives. */}
      <DecisionCard
        step="D5"
        title="The payoff"
        help="Realized recovered visits x contribution margin per visit, plus realized captured admissions x margin per admission. Both legs are contribution margin, an honest total, not a mix of gross revenue and margin. Already counted in the running total in the panel to the right."
        testid="card-ed-access-d5"
      >
        <p className="text-[15px] text-[#1A1A1A]" data-testid="text-ed-access-d5-caption">
          <span className="font-abridge text-2xl text-[#EA2C00] font-bold" data-testid="text-ed-access-d5-value">
            {fmtMoneyCompact(realizedPayoffValue)}
          </span>{" "}
          from {fmtInt(recovery.realizedRecovered)} recovered visits x ~${fmtInt(payoff.marginPerVisit)}/visit margin + {fmtInt(recovery.capturedAdmissions)} admissions x ~${fmtInt(payoff.admissionMargin)}/admission margin
        </p>
        <MathBox formula={payoffFormulaDisplay} testid="text-ed-access-d5-formula" />
      </DecisionCard>
    </div>
  );
}
