import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import type { LeverValues } from "@/lib/attain/attainLevers";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeEdAccessChain,
  revenuePerVisitFor,
  admissionMarginFor,
  edAccessCeilingPlainPhrase,
  DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE,
  DEFAULT_ED_ACCESS_LWBS_RATE,
} from "@/lib/attain/attainEdAccess";
import type { AttainSetting } from "@/lib/attain/attainTypes";

function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
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
      className="rounded-xl border border-[#E7E0D6] bg-white p-6 mb-5"
      data-testid={testid}
    >
      <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">{step}</p>
      <h3 className="text-base font-bold text-[#1A1A1A] mb-1.5 font-abridge">{title}</h3>
      <p className="text-xs text-[#8C8C8C] leading-relaxed mb-4 max-w-[560px]">{help}</p>
      {children}
    </motion.div>
  );
}

/** A quiet, count-only output row - visits, providers, or patients, NEVER a
 * dollar figure. D1-D4 all use this; D5 is the one place a dollar appears. */
function CountOutput({ label, value, unit, testid }: { label: string; value: string; unit: string; testid: string }) {
  return (
    <div className="bg-[#F8F5F1] rounded-lg px-4 py-3 flex items-baseline justify-between gap-3" data-testid={testid}>
      <span className="text-xs text-[#8C8C8C]">{label}</span>
      <span className="text-lg font-bold text-[#1A1A1A] font-abridge">
        {value} <span className="text-xs font-normal text-[#8C8C8C]">{unit}</span>
      </span>
    </div>
  );
}

/** One stat in the D4 plain-language result block - pool, target, or
 * realized, side by side. Never a dollar figure (D1-D4 rule); `emphasize`
 * marks the realized figure, the actual answer to "how many patients do we
 * get back." Mirrors AccessDecisionChain.tsx's `ResultStat`. */
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
      <p className="text-[10px] text-[#8C8C8C] mb-1 leading-snug">{label}</p>
      <p className={`text-lg font-bold font-abridge ${emphasize ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`} data-testid={testid}>
        {value} <span className="text-xs font-normal text-[#8C8C8C]">{unit}</span>
      </p>
      {hint && <p className="text-[9.5px] text-[#B4B4B4] mt-0.5">{hint}</p>}
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
    <label className="text-xs font-medium text-[#3A3A3A] mb-1.5 flex items-center gap-1.5">
      {children}
      {tip && testid && <InfoTip text={tip} testid={testid} />}
    </label>
  );
}

function MathBox({ formula, testid }: { formula: string; testid: string }) {
  return (
    <div className="mt-3 bg-[#F8F5F1] border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
      <p className="text-[11px] text-[#3A3A3A] leading-relaxed" data-testid={testid}>
        {formula}
      </p>
    </div>
  );
}

/**
 * Build the case, ED ACCESS - a bespoke ordered decision chain, matching
 * outpatient access's chain bar (`AccessDecisionChain.tsx`) rather than the
 * generic flat lever renderer, but a GENUINELY DIFFERENT mechanism: ED
 * access is about recovering patients who left without being seen (LWBS)
 * and capturing the downstream admissions some of them become, not opening
 * new schedule capacity. Money is realized recovered visits x revenue/visit
 * plus captured admissions x admission margin, and realized recovery is
 * capped to the recoverable LWBS pool (the ceiling), so no dollar figure
 * can exist until scope (D1), worth (D2), AND the pool/reduction target
 * (D3/D4) are all real - D1-D4 below show providers, visits, or patients,
 * never a dollar. D5 is the one place a dollar first appears, derived from
 * the other three, never invented. See `attainEdAccess.ts`'s module header
 * for the full chain and its reconciliation to Explore's
 * `edLwbs`/`admissionCapture` primitives.
 */
export default function EdAccessDecisionChain({ setting, baseline, values, onChangeValue }: EdAccessDecisionChainProps) {
  const totalProviders = Math.max(0, Math.round(baseline.providers ?? 0));
  const requestedProviders = asNum(values.edAccessProviders);

  const chain = computeEdAccessChain(baseline, values);
  const { scope, pool, recovery, payoff, formulas } = chain;

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
          <p className="text-[10px] text-[#8C8C8C] mt-1">
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
        help="Two different dollars: the visit itself, and whatever a recovered patient becomes if they are admitted. Priced separately because they are not the same claim. Still no dollar total, there is no recovery decided yet."
        testid="card-ed-access-d2"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel
              tip="Revenue booked per recovered ED visit. Benchmarked, but your own number, not an assumed one."
              testid="tooltip-ed-access-revenue-per-visit"
            >
              Revenue per recovered visit
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
              <NumberField
                value={revenuePerVisitFor(values)}
                onValueChange={(v) => onChangeValue("edAccessRevenuePerVisit", v)}
                min={0}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
                data-testid="input-ed-access-revenue-per-visit"
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
        help="Minutes saved on the note buys a faster door-to-provider time, which is what actually keeps a patient from leaving before being seen. Set your current LWBS rate and the reduction this plan targets. Output is in recovered patients, still no dollars."
        testid="card-ed-access-d3"
      >
        <div className="flex flex-wrap gap-6 mb-4">
          <div className="w-[160px]">
            <FieldLabel
              tip="How many minutes of documentation Abridge saves on the average note. Context for the door-to-provider story, not itself a multiplier in the payoff below."
              testid="tooltip-ed-access-minutes-saved"
            >
              Minutes saved per note
            </FieldLabel>
            <NumberField
              value={asNum(values.edAccessMinutesSaved) > 0 ? asNum(values.edAccessMinutesSaved) : DEFAULT_ED_ACCESS_MINUTES_SAVED_PER_NOTE}
              onValueChange={(v) => onChangeValue("edAccessMinutesSaved", v)}
              min={0}
              max={60}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              data-testid="input-ed-access-minutes-saved"
            />
          </div>
          <div className="w-[200px]">
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
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8C8C8C] flex items-center gap-1.5">
              LWBS reduction this plan targets
              <InfoTip
                text="The share of the recoverable pool this plan commits to bringing back, driven by how much faster door-to-provider time the freed minutes above buy. This is the one decision that turns freed time into recovered patients."
                testid="tooltip-ed-access-reduction"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-ed-access-reduction-value">
              {Math.round(recovery.reductionPct)}%
            </span>
          </div>
          <Slider
            value={[recovery.reductionPct]}
            onValueChange={(v) => onChangeValue("edAccessLwbsReduction", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-ed-access-reduction"
          />
        </div>

        <CountOutput label="Targeted recovered patients" value={fmtInt(recovery.targetedRecovered)} unit="patients/yr" testid="text-ed-access-d3-output" />
        <p className="text-[10px] text-[#8C8C8C] mt-2">
          ~{fmtInt(recovery.freedHoursTotal)} freed provider-hours/yr behind that door-to-provider story, at {recovery.minutesSavedPerNote} min saved/note.
        </p>
      </DecisionCard>

      <DecisionCard
        step="D4"
        title="The recoverable pool, the ceiling"
        help="Your current LWBS rate times ED volume in scope is the pool of patients who actually left without being seen. Realistic recovery can never exceed it. A share of what is recovered becomes a downstream admission."
        testid="card-ed-access-d4"
      >
        <div className="rounded-lg bg-[#F8F5F1] p-4 mb-4" data-testid="panel-ed-access-d4-result">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-3">The result</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <ResultStat label="The recoverable pool" hint="Current rate × visits in scope" value={fmtInt(pool.poolVisits)} unit="patients/yr" testid="text-ed-access-d4-pool" />
            <ResultStat label="Targeted recovery" hint="From D3" value={fmtInt(recovery.targetedRecovered)} unit="patients/yr" testid="text-ed-access-d4-target" />
            <ResultStat
              label="Realized recovered visits"
              hint="Never above the pool"
              value={fmtInt(recovery.realizedRecovered)}
              unit="visits/yr"
              emphasize
              testid="text-ed-access-d4-realized"
            />
          </div>
          <p className="text-[12px] text-[#1A1A1A] font-semibold flex items-center gap-1.5" data-testid="text-ed-access-d4-ceiling-phrase">
            {edAccessCeilingPlainPhrase(pool.poolVisits, recovery.targetedRecovered, recovery.realizedRecovered)}
            <InfoTip
              text="Realized recovery can never be more than the pool. A reduction target beyond 100% of the pool is not possible, and the pool itself is the hard ceiling on every patient this plan can bring back."
              testid="tooltip-ed-access-d4-ceiling"
            />
          </p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8C8C8C] flex items-center gap-1.5">
              Share of recovered patients who become admissions
              <InfoTip text="Not every recovered patient is admitted. This is the share of realized recovery, not of the pool, that converts to a downstream admission." testid="tooltip-ed-access-admission-rate" />
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

        <CountOutput label="Captured admissions" value={fmtInt(recovery.capturedAdmissions)} unit="admissions/yr" testid="text-ed-access-d4-admissions" />
        <MathBox formula={formulas.recovery} testid="text-ed-access-d4-formula" />
      </DecisionCard>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-[#1A1A1A] p-6"
        data-testid="card-ed-access-d5"
      >
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-1.5">D5</p>
        <h3 className="text-base font-bold text-white mb-1.5 font-abridge">The payoff</h3>
        <p className="text-xs text-white/50 leading-relaxed mb-4 max-w-[560px]">
          Realized recovered visits x revenue per visit, plus captured admissions x margin per admission. This is the
          first dollar figure in this chain, derived from the three decisions above, never invented.
        </p>
        <p className="font-abridge text-4xl text-[#EA2C00]" data-testid="text-ed-access-d5-value">
          {fmtMoneyCompact(payoff.value)}
        </p>
        <p className="text-xs text-white/60 mt-2">
          {fmtInt(recovery.realizedRecovered)} recovered visits × ~${fmtInt(payoff.revenuePerVisit)}/visit + {fmtInt(recovery.capturedAdmissions)} admissions × ~${fmtInt(payoff.admissionMargin)}/admission
        </p>
        <div className="mt-4 bg-white/5 border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
          <p className="text-[11px] text-white/70 leading-relaxed" data-testid="text-ed-access-d5-formula">
            {formulas.payoff}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
