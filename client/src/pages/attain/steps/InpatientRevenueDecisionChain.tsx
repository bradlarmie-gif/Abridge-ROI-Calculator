import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { realizedValue, formulaWithRealization, type LeverValues } from "@/lib/attain/attainLevers";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeIpDrgChain,
  computeIpCdiChain,
  computeIpObsChain,
  ipDrgCountFormula,
  ipDrgPayoffFormula,
  ipCdiCountFormula,
  ipCdiPayoffFormula,
  ipObsCountFormula,
  ipObsPayoffFormula,
  selectedIpRevenuePaths,
  IP_REVENUE_PATH_LABELS,
  DEFAULT_IP_DRG_AT_RISK_RATE,
  DEFAULT_IP_DRG_WEIGHT_INCREASE,
  DEFAULT_IP_DRG_BASE_PAYMENT,
  DEFAULT_IP_CDI_QUERY_RATE,
  DEFAULT_IP_CDI_COST_PER_QUERY,
  DEFAULT_IP_OBS_DENIAL_RATE,
  DEFAULT_IP_OBS_REVENUE_DELTA,
  IP_REVENUE_PATH_IDS,
  type IpRevenuePathId,
} from "@/lib/attain/attainInpatientRevenue";

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
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

interface InpatientRevenueDecisionChainProps {
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  /** This priority's realization/attribution rate, 0-100, default 100 - see
   * AccessDecisionChain.tsx's matching prop for the full explanation. Passed
   * through to every path's own `PayoffCard` below AND to the outer
   * "all paths, combined" card, so no path's own dollar is missed. */
  realizationPct: number;
}

/** A card shell shared by every path's own D-steps - deliberately local,
 * same convention `RevenueDecisionChain.tsx` / `AccessDecisionChain.tsx`
 * use (these cards share nothing with the generic lever card, bypassed
 * entirely for inpatient revenue). */
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

/** Dark payoff card, one per path - the first (and only) place that path's
 * dollar appears, same discipline as outpatient revenue's / Access's D5. */
function PayoffCard({
  pill,
  value,
  caption,
  formula,
  testid,
  realizationPct,
}: {
  pill: string;
  value: number;
  caption: string;
  formula: string;
  testid: string;
  realizationPct: number;
}) {
  const displayValue = realizedValue(value, realizationPct);
  const displayFormula = value > 0 ? formulaWithRealization(formula, realizationPct, displayValue) : formula;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-[#1A1A1A] p-6 mb-8" data-testid={testid}>
      <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-1.5">{pill} · the payoff</p>
      <p className="font-abridge text-4xl text-[#EA2C00]" data-testid={`${testid}-value`}>
        {fmtMoneyCompact(displayValue)}
      </p>
      <p className="text-xs text-white/60 mt-2">{caption}</p>
      <div className="mt-4 bg-white/5 border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
        <p className="text-[11px] text-white/70 leading-relaxed" data-testid={`${testid}-formula`}>
          {displayFormula}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Build the case, INPATIENT REVENUE - a bespoke, THREE-PATH decision chain,
 * matching outpatient/ED revenue's path-chooser bar (`RevenueDecisionChain.tsx`)
 * but on a GENUINELY DIFFERENT mechanism: inpatient reimbursement is
 * DRG-weight / case-mix based (one bundled payment per admission), not
 * visit-level E/M coding, so there is no wRVU, no HCC panel, no conversion
 * factor here. The partner first picks which path(s) apply (Case Mix / DRG
 * Accuracy · CDI Query Efficiency · Observation / IP Status Defense, one or
 * more), then works each chosen path's own decisions in order; a dollar
 * only ever appears at that path's own payoff step, never before. Paths are
 * genuinely separate claims mechanisms (a captured DRG weight, an avoided
 * query, and a defended IP stay are three different claims), so their
 * dollars simply SUM into one combined total at the bottom. See
 * `attainInpatientRevenue.ts`'s module header for the full chain and its
 * reconciliation to Explore's `ipDrg`/`ipCdi`/`ipObsDefense` primitives.
 */
export default function InpatientRevenueDecisionChain({ baseline, values, onChangeValue, realizationPct }: InpatientRevenueDecisionChainProps) {
  const chosen = selectedIpRevenuePaths(values);
  const rawPaths = asLines(values.ipRevenuePaths);

  const togglePath = (id: IpRevenuePathId) => {
    const label = IP_REVENUE_PATH_LABELS[id];
    const next = rawPaths.includes(label) ? rawPaths.filter((l) => l !== label) : [...rawPaths, label];
    onChangeValue("ipRevenuePaths", next);
  };

  // Combined total across every chosen path, computed once here so the
  // footer summary and each path's own payoff card never disagree.
  let combinedValue = 0;
  if (chosen.includes("drg")) combinedValue += computeIpDrgChain(baseline, values).value;
  if (chosen.includes("cdi")) combinedValue += computeIpCdiChain(baseline, values).value;
  if (chosen.includes("obs")) combinedValue += computeIpObsChain(baseline, values).value;

  return (
    <div data-testid="section-attain-ip-revenue-chain">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[#E7E0D6] bg-white p-6 mb-5"
        data-testid="card-ip-revenue-path-chooser"
      >
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">Choose your path(s)</p>
        <h3 className="text-base font-bold text-[#1A1A1A] mb-1.5 font-abridge">How does this revenue get captured</h3>
        <p className="text-xs text-[#8C8C8C] leading-relaxed mb-4 max-w-[560px]">
          Pick one or more. Each is a genuinely different mechanism, a captured DRG weight, an avoided CDI query, and
          a defended inpatient stay are never the same claim, so they add rather than compete. Only the paths you
          pick get decisions below, and no dollar appears until that path's own chain is complete.
        </p>
        <div className="flex flex-wrap gap-2">
          {IP_REVENUE_PATH_IDS.map((id) => {
            const active = chosen.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePath(id)}
                className={`px-3 py-2 rounded-md text-sm border transition-all ${
                  active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
                }`}
                data-testid={`chip-ip-revenue-path-${id}`}
              >
                {IP_REVENUE_PATH_LABELS[id]}
              </button>
            );
          })}
        </div>
        {chosen.length === 0 && (
          <p className="text-xs text-[#B4B4B4] italic mt-4" data-testid="text-ip-revenue-no-path">
            Pick at least one path above to start building the case.
          </p>
        )}
      </motion.div>

      {chosen.includes("drg") && <DrgPathSection baseline={baseline} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />}
      {chosen.includes("cdi") && <CdiPathSection baseline={baseline} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />}
      {chosen.includes("obs") && <ObsPathSection baseline={baseline} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />}

      {chosen.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-[#1A1A1A] p-6"
          data-testid="card-ip-revenue-combined-payoff"
        >
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-1.5">All paths, combined</p>
          <p className="font-abridge text-4xl text-[#EA2C00]" data-testid="text-ip-revenue-combined-value">
            {fmtMoneyCompact(realizedValue(combinedValue, realizationPct))}
          </p>
          <p className="text-xs text-white/60 mt-2">
            {chosen.length} paths chosen, each its own mechanism, summed once, never double-counted.
            {realizationPct < 100 ? ` Attributed at ${Math.round(realizationPct)}% realization to this plan.` : ""}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH 1 — Case Mix / DRG Accuracy (CC/MCC capture)
// ────────────────────────────────────────────────────────────────────────

function DrgPathSection({
  baseline,
  values,
  onChangeValue,
  realizationPct,
}: {
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}) {
  const chain = computeIpDrgChain(baseline, values);

  return (
    <div data-testid="section-ip-revenue-path-drg" className="mb-8">
      <p className="text-xs font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3">Case Mix / DRG Accuracy</p>

      <DecisionCard
        step="D1"
        title="Your current at-risk DRG rate"
        help="A comorbidity or complication that is being managed but under-specified in the note risks grouping the admission at a lower DRG weight than it earned. This is today's rate, the fact the capture improvement below is measured against."
        testid="card-ip-revenue-drg-d1"
      >
        <div className="max-w-[200px]">
          <FieldLabel tip="Share of eligible admissions with documentation gaps large enough to risk a lower-weight DRG today.">
            At-risk DRG rate, today
          </FieldLabel>
          <div className="relative">
            <NumberField
              value={asNum(values.ipDrgAtRiskRate) > 0 ? asNum(values.ipDrgAtRiskRate) : DEFAULT_IP_DRG_AT_RISK_RATE}
              onValueChange={(v) => onChangeValue("ipDrgAtRiskRate", v)}
              min={0}
              max={60}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
              data-testid="input-ip-revenue-drg-at-risk-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
          </div>
        </div>
        <p className="text-[10px] text-[#8C8C8C] mt-2">
          Applied against {fmtInt(chain.eligibleEncounters)} eligible admissions/yr from your Starting-point baseline.
        </p>
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="Set the CC/MCC capture improvement"
        help="A comorbidity documented but never coded specifically enough is not a captured DRG. This is the improvement above today's capture rate this plan commits to, zero here captures nothing new."
        testid="card-ip-revenue-drg-d2"
      >
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8C8C8C] flex items-center gap-1.5">
              CC/MCC capture improvement above today
              <InfoTip
                text="How much higher than today's CC/MCC capture rate you are actually committing to reach. This is the gate, zero here captures nothing."
                testid="tooltip-ip-revenue-drg-capture"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-ip-revenue-drg-capture-value">
              +{fmtInt(asNum(values.ipDrgCapture))}pp
            </span>
          </div>
          <Slider
            value={[asNum(values.ipDrgCapture)]}
            onValueChange={(v) => onChangeValue("ipDrgCapture", v[0])}
            min={0}
            max={30}
            step={1}
            accent="coral"
            className="w-full"
            data-testid="slider-ip-revenue-drg-capture"
          />
        </div>
        <CountOutput label="Additional captured cases" value={fmtInt(chain.capturedCases)} unit="cases/yr" testid="text-ip-revenue-drg-d2-output" />
        <MathBox formula={ipDrgCountFormula(chain)} testid="text-ip-revenue-drg-d2-formula" />
      </DecisionCard>

      <DecisionCard
        step="D3"
        title="Price the DRG weight lift"
        help="The dollar every captured comorbidity or complication above is actually worth, once coded and accepted. Still no total, that comes next."
        testid="card-ip-revenue-drg-d3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel tip="The average DRG weight difference a captured comorbidity or complication actually adds.">
              Average DRG weight increase
            </FieldLabel>
            <NumberField
              value={asNum(values.ipDrgWeightIncrease) > 0 ? asNum(values.ipDrgWeightIncrease) : DEFAULT_IP_DRG_WEIGHT_INCREASE}
              onValueChange={(v) => onChangeValue("ipDrgWeightIncrease", v)}
              min={0}
              max={1}
              decimal={true}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              data-testid="input-ip-revenue-drg-weight-increase"
            />
            <p className="text-[10px] text-[#8C8C8C] mt-1">Defaults to {DEFAULT_IP_DRG_WEIGHT_INCREASE} until you set your own.</p>
          </div>
          <div>
            <FieldLabel tip="Base payment per case the weight lift is actually multiplied against, your own contracted rate.">
              Base DRG payment per case
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
              <NumberField
                value={asNum(values.ipDrgBasePayment) > 0 ? asNum(values.ipDrgBasePayment) : DEFAULT_IP_DRG_BASE_PAYMENT}
                onValueChange={(v) => onChangeValue("ipDrgBasePayment", v)}
                min={0}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
                data-testid="input-ip-revenue-drg-base-payment"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/case</span>
            </div>
            <p className="text-[10px] text-[#8C8C8C] mt-1">Defaults to ${fmtInt(DEFAULT_IP_DRG_BASE_PAYMENT)}/case until you set your own.</p>
          </div>
        </div>
      </DecisionCard>

      <PayoffCard
        pill="Case Mix / DRG Accuracy"
        value={chain.value}
        caption={`${fmtInt(chain.capturedCases)} captured cases x ${chain.weightIncrease} avg weight x ~$${fmtInt(chain.basePayment)}/case`}
        formula={ipDrgPayoffFormula(chain)}
        testid="text-ip-revenue-drg-payoff"
        realizationPct={realizationPct}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH 2 — CDI Query Efficiency
// ────────────────────────────────────────────────────────────────────────

function CdiPathSection({
  baseline,
  values,
  onChangeValue,
  realizationPct,
}: {
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}) {
  const chain = computeIpCdiChain(baseline, values);

  return (
    <div data-testid="section-ip-revenue-path-cdi" className="mb-8">
      <p className="text-xs font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3">CDI Query Efficiency</p>

      <DecisionCard
        step="D1"
        title="Your current CDI query rate"
        help="The share of eligible admissions that generate a physician query today, the rate the closure improvement below is measured against."
        testid="card-ip-revenue-cdi-d1"
      >
        <div className="max-w-[200px]">
          <FieldLabel tip="Share of eligible admissions that generate a physician query today.">CDI query rate, today</FieldLabel>
          <div className="relative">
            <NumberField
              value={asNum(values.ipCdiQueryRate) > 0 ? asNum(values.ipCdiQueryRate) : DEFAULT_IP_CDI_QUERY_RATE}
              onValueChange={(v) => onChangeValue("ipCdiQueryRate", v)}
              min={0}
              max={60}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
              data-testid="input-ip-revenue-cdi-query-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
          </div>
        </div>
        <p className="text-[10px] text-[#8C8C8C] mt-2">
          Applied against {fmtInt(chain.eligibleEncounters)} eligible admissions/yr from your Starting-point baseline.
        </p>
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="Set the query-closure improvement"
        help="A query that ages past discharge gets answered from memory or dropped. This is the share of today's queries this plan commits to closing before that happens, zero here closes nothing new."
        testid="card-ip-revenue-cdi-d2"
      >
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8C8C8C] flex items-center gap-1.5">
              Queries closed before discharge
              <InfoTip
                text="The share of today's CDI queries this plan commits to closing before discharge, instead of aging out. This is the gate, zero here closes nothing."
                testid="tooltip-ip-revenue-cdi-reduction"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-ip-revenue-cdi-reduction-value">
              {fmtInt(asNum(values.ipCdiReduction))}%
            </span>
          </div>
          <Slider
            value={[asNum(values.ipCdiReduction)]}
            onValueChange={(v) => onChangeValue("ipCdiReduction", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-ip-revenue-cdi-reduction"
          />
        </div>
        <CountOutput label="Queries closed" value={fmtInt(chain.closed)} unit="queries/yr" testid="text-ip-revenue-cdi-d2-output" />
        <MathBox formula={ipCdiCountFormula(chain)} testid="text-ip-revenue-cdi-d2-formula" />
      </DecisionCard>

      <DecisionCard
        step="D3"
        title="Price the avoided query cost"
        help="The dollar every avoided or resolved query above actually protects. Still no total, that comes next."
        testid="card-ip-revenue-cdi-d3"
      >
        <div className="max-w-[200px]">
          <FieldLabel tip="The dollar every avoided or resolved CDI query actually protects, your own number.">Avoided cost per query</FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
            <NumberField
              value={asNum(values.ipCdiCostPerQuery) > 0 ? asNum(values.ipCdiCostPerQuery) : DEFAULT_IP_CDI_COST_PER_QUERY}
              onValueChange={(v) => onChangeValue("ipCdiCostPerQuery", v)}
              min={0}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
              data-testid="input-ip-revenue-cdi-cost-per-query"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/query</span>
          </div>
          <p className="text-[10px] text-[#8C8C8C] mt-1">Defaults to ${fmtInt(DEFAULT_IP_CDI_COST_PER_QUERY)}/query until you set your own.</p>
        </div>
      </DecisionCard>

      <PayoffCard
        pill="CDI Query Efficiency"
        value={chain.value}
        caption={`${fmtInt(chain.closed)} queries closed x ~$${fmtInt(chain.costPerQuery)}/query`}
        formula={ipCdiPayoffFormula(chain)}
        testid="text-ip-revenue-cdi-payoff"
        realizationPct={realizationPct}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH 3 — Observation / IP Status Defense
// ────────────────────────────────────────────────────────────────────────

function ObsPathSection({
  baseline,
  values,
  onChangeValue,
  realizationPct,
}: {
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}) {
  const chain = computeIpObsChain(baseline, values);

  return (
    <div data-testid="section-ip-revenue-path-obs" className="mb-8">
      <p className="text-xs font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3">Observation / IP Status Defense</p>

      <DecisionCard
        step="D1"
        title="Your current observation downgrade rate"
        help="The share of eligible admissions downgraded from inpatient to observation status today, the rate the preventable share below is measured against. A downgrade is a genuinely separate claim from a DRG-weight gap: the whole admission moves status, not just the weight within it."
        testid="card-ip-revenue-obs-d1"
      >
        <div className="max-w-[200px]">
          <FieldLabel tip="Share of eligible admissions downgraded from inpatient to observation status today.">
            Downgrade rate, today
          </FieldLabel>
          <div className="relative">
            <NumberField
              value={asNum(values.ipObsDenialRate) > 0 ? asNum(values.ipObsDenialRate) : DEFAULT_IP_OBS_DENIAL_RATE}
              onValueChange={(v) => onChangeValue("ipObsDenialRate", v)}
              min={0}
              max={30}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
              data-testid="input-ip-revenue-obs-denial-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
          </div>
        </div>
        <p className="text-[10px] text-[#8C8C8C] mt-2">
          Applied against {fmtInt(chain.eligibleEncounters)} eligible admissions/yr from your Starting-point baseline.
        </p>
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="Set the preventable share"
        help="A downgrade driven by documentation that under-specified severity of illness is preventable. This is the share cleaner documentation actually prevents, above today's zero."
        testid="card-ip-revenue-obs-d2"
      >
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8C8C8C] flex items-center gap-1.5">
              Share preventable with cleaner documentation
              <InfoTip
                text="The share of today's observation downgrades this plan commits to preventing with cleaner severity-of-illness documentation. This is the gate, zero here defends nothing."
                testid="tooltip-ip-revenue-obs-preventable"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-ip-revenue-obs-preventable-value">
              {fmtInt(asNum(values.ipObsPreventable))}%
            </span>
          </div>
          <Slider
            value={[asNum(values.ipObsPreventable)]}
            onValueChange={(v) => onChangeValue("ipObsPreventable", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-ip-revenue-obs-preventable"
          />
        </div>
        <CountOutput label="Defended cases" value={fmtInt(chain.preventable)} unit="cases/yr" testid="text-ip-revenue-obs-d2-output" />
        <MathBox formula={ipObsCountFormula(chain)} testid="text-ip-revenue-obs-d2-formula" />
      </DecisionCard>

      <DecisionCard
        step="D3"
        title="Price the revenue delta"
        help="The dollar an inpatient status successfully defended is worth over an observation stay. Still no total, that comes next."
        testid="card-ip-revenue-obs-d3"
      >
        <div className="max-w-[200px]">
          <FieldLabel tip="The dollar an inpatient status successfully defended is worth over an observation stay, your own contracted rate.">
            Revenue delta per defended case
          </FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
            <NumberField
              value={asNum(values.ipObsRevenueDelta) > 0 ? asNum(values.ipObsRevenueDelta) : DEFAULT_IP_OBS_REVENUE_DELTA}
              onValueChange={(v) => onChangeValue("ipObsRevenueDelta", v)}
              min={0}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
              data-testid="input-ip-revenue-obs-revenue-delta"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/case</span>
          </div>
          <p className="text-[10px] text-[#8C8C8C] mt-1">Defaults to ${fmtInt(DEFAULT_IP_OBS_REVENUE_DELTA)}/case until you set your own.</p>
        </div>
      </DecisionCard>

      <PayoffCard
        pill="Observation / IP Status Defense"
        value={chain.value}
        caption={`${fmtInt(chain.preventable)} defended cases x ~$${fmtInt(chain.revenueDelta)}/case`}
        formula={ipObsPayoffFormula(chain)}
        testid="text-ip-revenue-obs-payoff"
        realizationPct={realizationPct}
      />
    </div>
  );
}
