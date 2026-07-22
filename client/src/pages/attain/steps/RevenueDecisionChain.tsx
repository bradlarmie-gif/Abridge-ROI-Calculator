import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { realizedValue, formulaWithRealization, type LeverValues } from "@/lib/attain/attainLevers";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeHccChain,
  computeEmChain,
  computeDenialsChain,
  emCountFormula,
  emFormula,
  denialsCountFormula,
  denialsFormula,
  selectedPaths,
  selectedPopulations,
  pathsAvailableFor,
  hccPanelSizeFor,
  hccValuePerHcc,
  HCC_POPULATIONS,
  DEFAULT_GAP_RATE,
  DEFAULT_CURRENT_RECAPTURE_RATE,
  DEFAULT_AVG_HCCS,
  DEFAULT_AVG_NET_NEW_CONDITIONS,
  DEFAULT_VALUE_PER_HCC,
  DEFAULT_CURRENT_WRVU,
  DEFAULT_CONVERSION_FACTOR,
  DEFAULT_DENIAL_RATE,
  DEFAULT_AVG_CLAIM_VALUE,
  REVENUE_PATH_LABELS,
  type RevenuePathId,
} from "@/lib/attain/attainRevenue";
import type { AttainSetting } from "@/lib/attain/attainTypes";

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

interface RevenueDecisionChainProps {
  setting: AttainSetting;
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
 * same convention `AccessDecisionChain.tsx` uses (these cards share nothing
 * with the generic lever card, bypassed entirely for revenue). */
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

function ResultStat({ label, value, unit, testid }: { label: string; value: string; unit: string; testid: string }) {
  return (
    <div>
      <p className="text-[11px] text-[#8C8C8C] mb-1 leading-snug">{label}</p>
      <p className="text-lg font-bold font-abridge text-[#EA2C00]" data-testid={testid}>
        {value} <span className="text-xs font-normal text-[#8C8C8C]">{unit}</span>
      </p>
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

/** Quiet payoff line, one per path - the first (and only) place that path's
 * dollar appears, same discipline as Access's D5. No longer a full-bleed
 * dark hero card - that dollar is already counted in the side panel's
 * "Plan so far," so this stays a minimal line in the same card shell as
 * every decision above it. */
function PayoffCard({
  pill,
  value,
  caption,
  formula,
  testid,
  realizationPct,
  children,
}: {
  pill: string;
  value: number;
  caption: string;
  formula: string;
  testid: string;
  realizationPct: number;
  children?: React.ReactNode;
}) {
  const displayValue = realizedValue(value, realizationPct);
  const displayFormula = value > 0 ? formulaWithRealization(formula, realizationPct, displayValue) : formula;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-[#E7E0D6] bg-[#F8F5F1] p-5 mb-8" data-testid={testid}>
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">{pill} · the payoff</p>
      <p className="text-[15px] text-[#1A1A1A]">
        <span className="font-abridge text-2xl text-[#EA2C00] font-bold" data-testid={`${testid}-value`}>
          {fmtMoneyCompact(displayValue)}
        </span>{" "}
        from {caption}. Already counted in the running total in the panel to the right.
      </p>
      {children}
      <div className="mt-4 bg-white border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
        <p className="text-[12.5px] text-[#3A3A3A] leading-relaxed" data-testid={`${testid}-formula`}>
          {displayFormula}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Build the case, REVENUE - a bespoke, THREE-PATH decision chain, matching
 * Access's ordered-chain bar rather than the generic flat lever renderer.
 * The partner first picks which path(s) apply (Risk Adjustment / E/M Level
 * Accuracy / Medical Necessity Denials, one or more), then works each
 * chosen path's own decisions in order; a dollar only ever appears at that
 * path's own payoff step, never before. Paths are genuinely separate claims
 * mechanisms (see `attainRevenue.ts`'s header), so their dollars simply SUM
 * into one combined total at the bottom.
 */
export default function RevenueDecisionChain({ setting, baseline, values, onChangeValue, realizationPct }: RevenueDecisionChainProps) {
  const available = pathsAvailableFor(setting);
  const chosen = selectedPaths(values).filter((p) => available.includes(p));
  const rawPaths = asLines(values.revenuePaths);

  const togglePath = (id: RevenuePathId) => {
    const label = REVENUE_PATH_LABELS[id];
    const next = rawPaths.includes(label) ? rawPaths.filter((l) => l !== label) : [...rawPaths, label];
    onChangeValue("revenuePaths", next);
  };

  // Combined total across every chosen path, computed once here so the
  // footer summary and each path's own payoff card never disagree.
  let combinedValue = 0;
  if (chosen.includes("hcc") && setting === "outpatient") combinedValue += computeHccChain(baseline, values).payoff.value;
  if (chosen.includes("em")) combinedValue += computeEmChain(baseline, setting, values).value;
  if (chosen.includes("denials")) combinedValue += computeDenialsChain(baseline, setting, values).value;

  return (
    <div data-testid="section-attain-revenue-chain">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[#E7E0D6] bg-white p-7 mb-6"
        data-testid="card-revenue-path-chooser"
      >
        <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">Choose your path(s)</p>
        <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 font-abridge">How does this revenue get captured</h3>
        <p className="text-[15px] text-[#8C8C8C] leading-relaxed mb-5 max-w-[620px]">
          Pick one or more. Each is a genuinely different mechanism, a captured HCC, a coded level, and a prevented
          denial are never the same dollar, so they add rather than compete. Only the paths you pick get decisions
          below, and no dollar appears until that path's own chain is complete.
        </p>
        <div className="flex flex-wrap gap-2">
          {available.map((id) => {
            const active = chosen.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePath(id)}
                className={`px-3 py-2 rounded-md text-sm border transition-all ${
                  active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
                }`}
                data-testid={`chip-revenue-path-${id}`}
              >
                {REVENUE_PATH_LABELS[id]}
              </button>
            );
          })}
        </div>
        {chosen.length === 0 && (
          <p className="text-[14px] text-[#B4B4B4] italic mt-4" data-testid="text-revenue-no-path">
            Pick at least one path above to start building the case.
          </p>
        )}
      </motion.div>

      {chosen.includes("hcc") && setting === "outpatient" && (
        <HccPathSection baseline={baseline} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />
      )}
      {chosen.includes("em") && (
        <EmPathSection setting={setting} baseline={baseline} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />
      )}
      {chosen.includes("denials") && (
        <DenialsPathSection setting={setting} baseline={baseline} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />
      )}

      {chosen.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#E7E0D6] bg-[#F8F5F1] p-5"
          data-testid="card-revenue-combined-payoff"
        >
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">All paths, combined</p>
          <p className="text-[15px] text-[#1A1A1A]">
            <span className="font-abridge text-2xl text-[#EA2C00] font-bold" data-testid="text-revenue-combined-value">
              {fmtMoneyCompact(realizedValue(combinedValue, realizationPct))}
            </span>{" "}
            from {chosen.length} paths chosen, each its own mechanism, summed once, never double-counted.
            {realizationPct < 100 ? ` Attributed at ${Math.round(realizationPct)}% realization to this plan.` : ""} Already
            counted in the running total in the panel to the right.
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH 1 — Risk Adjustment (HCC capture)
// ────────────────────────────────────────────────────────────────────────

function HccPathSection({
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
  const selected = selectedPopulations(values);
  const togglePopulation = (name: string) => {
    const next = selected.includes(name) ? selected.filter((p) => p !== name) : [...selected, name];
    onChangeValue("revenueHccPopulations", next);
  };

  const chain = computeHccChain(baseline, values);
  const { scope, recapture, netNew, payoff, formulas } = chain;

  return (
    <div data-testid="section-revenue-path-hcc" className="mb-8">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3">Risk Adjustment</p>

      <DecisionCard
        step="D1"
        title="Which populations, and how many patients"
        help="Committing a population and its panel size puts real patient volume in scope. No dollar figure yet, there is no recapture or discovery decided."
        testid="card-revenue-hcc-d1"
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {HCC_POPULATIONS.map((pop) => {
            const active = selected.includes(pop.name);
            return (
              <button
                key={pop.name}
                type="button"
                onClick={() => togglePopulation(pop.name)}
                className={`px-3 py-2 rounded-md text-sm border transition-all ${
                  active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
                }`}
                data-testid={`chip-revenue-hcc-population-${pop.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                {pop.name}
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {selected.map((name) => (
              <div key={name}>
                <FieldLabel tip="Patients on this plan per provider in scope, from your own panel, not a benchmark.">
                  {name} panel size
                </FieldLabel>
                <div className="relative">
                  <NumberField
                    value={hccPanelSizeFor(name, values)}
                    onValueChange={(v) => onChangeValue(`revenueHccPanel__${name}`, v)}
                    min={0}
                    decimal={false}
                    className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
                    data-testid={`input-revenue-hcc-panel-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/provider</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <CountOutput label="Patients in scope for risk adjustment" value={fmtInt(scope.totalPatients)} unit="patients" testid="text-revenue-hcc-d1-output" />
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="Recapture dropped HCCs"
        help="A condition documented before that quietly dropped off recapture is not revenue. Set today's gap rate and recapture rate, then commit to the uplift above it."
        testid="card-revenue-hcc-d2"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <FieldLabel tip="Share of this population with a known condition that needs recoding every year.">Gap rate, today</FieldLabel>
            <div className="relative">
              <NumberField
                value={asNum(values.revenueHccGapRate) > 0 ? asNum(values.revenueHccGapRate) : DEFAULT_GAP_RATE}
                onValueChange={(v) => onChangeValue("revenueHccGapRate", v)}
                min={0}
                max={100}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
                data-testid="input-revenue-hcc-gap-rate"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
            </div>
          </div>
          <div>
            <FieldLabel tip="Share of the gap you currently recapture, before any Abridge-driven uplift.">Recapture rate, today</FieldLabel>
            <div className="relative">
              <NumberField
                value={asNum(values.revenueHccCurrentRecapture) > 0 ? asNum(values.revenueHccCurrentRecapture) : DEFAULT_CURRENT_RECAPTURE_RATE}
                onValueChange={(v) => onChangeValue("revenueHccCurrentRecapture", v)}
                min={0}
                max={100}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
                data-testid="input-revenue-hcc-current-recapture"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
            </div>
          </div>
          <div>
            <FieldLabel tip="Average HCC conditions carried per gap patient, once recaptured.">Avg HCCs per gap patient</FieldLabel>
            <NumberField
              value={asNum(values.revenueHccAvgHccs) > 0 ? asNum(values.revenueHccAvgHccs) : DEFAULT_AVG_HCCS}
              onValueChange={(v) => onChangeValue("revenueHccAvgHccs", v)}
              min={0}
              max={5}
              decimal={true}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              data-testid="input-revenue-hcc-avg-hccs"
            />
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Recapture uplift you are committing to
              <InfoTip text="How much higher than today's recapture rate you are actually committing to reach. This is the gate, zero here recaptures nothing." testid="tooltip-revenue-hcc-recapture" />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-revenue-hcc-recapture-value">
              +{fmtInt(asNum(values.revenueHccRecapture))}pp
            </span>
          </div>
          <Slider
            value={[asNum(values.revenueHccRecapture)]}
            onValueChange={(v) => onChangeValue("revenueHccRecapture", v[0])}
            min={0}
            max={15}
            step={1}
            accent="coral"
            className="w-full"
            data-testid="slider-revenue-hcc-recapture"
          />
        </div>

        <CountOutput label="Recaptured HCCs" value={fmtInt(recapture.recapturedHccs)} unit="HCCs/yr" testid="text-revenue-hcc-d2-output" />
        <MathBox formula={formulas.recapture} testid="text-revenue-hcc-d2-formula" />
      </DecisionCard>

      <DecisionCard
        step="D3"
        title="Surface suspected and net-new HCCs"
        help="A condition never coded before is not a recapture, it is a first-time discovery. This is the share of the panel where ambient surfaces one, above today's zero."
        testid="card-revenue-hcc-d3"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Suspected-HCC discovery rate
              <InfoTip text="Share of the panel where ambient documentation surfaces a condition never coded before. This is the gate, zero here discovers nothing new." testid="tooltip-revenue-hcc-discovery" />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-revenue-hcc-netnew-value">
              {fmtInt(asNum(values.revenueHccNetNew))}%
            </span>
          </div>
          <Slider
            value={[asNum(values.revenueHccNetNew)]}
            onValueChange={(v) => onChangeValue("revenueHccNetNew", v[0])}
            min={0}
            max={20}
            step={1}
            accent="coral"
            className="w-full"
            data-testid="slider-revenue-hcc-netnew"
          />
        </div>
        <div className="max-w-[260px] mb-4">
          <FieldLabel tip="Average new HCC conditions found per newly discovered patient.">Avg conditions per discovered patient</FieldLabel>
          <NumberField
            value={asNum(values.revenueHccAvgNetNewConditions) > 0 ? asNum(values.revenueHccAvgNetNewConditions) : DEFAULT_AVG_NET_NEW_CONDITIONS}
            onValueChange={(v) => onChangeValue("revenueHccAvgNetNewConditions", v)}
            min={0}
            max={5}
            decimal={true}
            className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
            data-testid="input-revenue-hcc-avg-netnew-conditions"
          />
        </div>

        <CountOutput label="Net-new HCCs" value={fmtInt(netNew.netNewHccs)} unit="HCCs/yr" testid="text-revenue-hcc-d3-output" />
        <MathBox formula={formulas.netNew} testid="text-revenue-hcc-d3-formula" />
      </DecisionCard>

      <DecisionCard
        step="D4"
        title="Set the value per HCC"
        help="The dollar every recaptured or net-new condition above is actually worth, once coded and accepted. Still no total, there is no combined count yet."
        testid="card-revenue-hcc-d4"
      >
        <div className="max-w-[240px]">
          <FieldLabel tip="RAF impact times annual capitated payment, collapsed into one figure per condition.">$ per captured HCC</FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
            <NumberField
              value={hccValuePerHcc(values)}
              onValueChange={(v) => onChangeValue("revenueHccValuePerHcc", v)}
              min={0}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
              data-testid="input-revenue-hcc-value-per-hcc"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/HCC</span>
          </div>
          <p className="text-[11px] text-[#8C8C8C] mt-1">Defaults to ${fmtInt(DEFAULT_VALUE_PER_HCC)}/HCC until you set your own.</p>
        </div>
      </DecisionCard>

      <PayoffCard
        pill="Risk Adjustment"
        value={payoff.value}
        caption={`${fmtInt(recapture.recapturedHccs + netNew.netNewHccs)} HCCs captured x ~$${fmtInt(payoff.valuePerHcc)}/HCC`}
        formula={formulas.payoff}
        testid="text-revenue-hcc-payoff"
        realizationPct={realizationPct}
      >
        <div className="grid grid-cols-2 gap-3 mt-3">
          <ResultStat label="From recapture" value={fmtMoneyCompact(realizedValue(payoff.recaptureValue, realizationPct))} unit="" testid="text-revenue-hcc-payoff-recapture" />
          <ResultStat label="From net-new discovery" value={fmtMoneyCompact(realizedValue(payoff.netNewValue, realizationPct))} unit="" testid="text-revenue-hcc-payoff-netnew" />
        </div>
      </PayoffCard>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH 2 — E/M Level Accuracy (wRVU)
// ────────────────────────────────────────────────────────────────────────

function EmPathSection({
  setting,
  baseline,
  values,
  onChangeValue,
  realizationPct,
}: {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}) {
  const chain = computeEmChain(baseline, setting, values);

  return (
    <div data-testid="section-revenue-path-em" className="mb-8">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3">E/M Level Accuracy</p>

      <DecisionCard
        step="D1"
        title="Your current coding level"
        help="Today's average wRVU per visit, the level the lift below is measured against."
        testid="card-revenue-em-d1"
      >
        <div className="max-w-[200px]">
          <FieldLabel tip="Average wRVU your providers currently code per visit, before any lift.">Current average wRVU/visit</FieldLabel>
          <NumberField
            value={asNum(values.revenueEmCurrentWrvu) > 0 ? asNum(values.revenueEmCurrentWrvu) : DEFAULT_CURRENT_WRVU}
            onValueChange={(v) => onChangeValue("revenueEmCurrentWrvu", v)}
            min={0}
            max={10}
            decimal={true}
            className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
            data-testid="input-revenue-em-current-wrvu"
          />
        </div>
        <p className="text-[11px] text-[#8C8C8C] mt-2">
          Priced against {fmtInt(chain.eligibleEncounters)} eligible encounters/yr from your Starting-point baseline.
        </p>
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="Set the lift"
        help="Documented complexity that never reaches the coded level is not revenue. This is the wRVU lift you are committing to, above today's average, zero here captures nothing."
        testid="card-revenue-em-d2"
      >
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C]">wRVU lift above today's average</span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-revenue-em-lift-value">
              +{fmtInt(asNum(values.revenueEmLift))}%
            </span>
          </div>
          <Slider
            value={[asNum(values.revenueEmLift)]}
            onValueChange={(v) => onChangeValue("revenueEmLift", v[0])}
            min={0}
            max={15}
            step={1}
            accent="coral"
            className="w-full"
            data-testid="slider-revenue-em-lift"
          />
        </div>
        <CountOutput label="Extra wRVUs captured" value={fmtInt(chain.wrvusCaptured)} unit="wRVUs/yr" testid="text-revenue-em-d2-output" />
        <MathBox formula={emCountFormula(chain)} testid="text-revenue-em-d2-formula" />
      </DecisionCard>

      <DecisionCard
        step="D3"
        title="Enter your conversion factor"
        help="The dollar every extra wRVU is actually worth once billed, your own negotiated rate, not a benchmark. Still no total, that comes next."
        testid="card-revenue-em-d3"
      >
        <div className="max-w-[200px]">
          <FieldLabel tip="Your own negotiated dollars-per-wRVU conversion factor.">Conversion factor</FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
            <NumberField
              value={asNum(values.revenueEmConversionFactor) > 0 ? asNum(values.revenueEmConversionFactor) : DEFAULT_CONVERSION_FACTOR}
              onValueChange={(v) => onChangeValue("revenueEmConversionFactor", v)}
              min={0}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
              data-testid="input-revenue-em-conversion-factor"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/wRVU</span>
          </div>
          <p className="text-[11px] text-[#8C8C8C] mt-1">Defaults to ${fmtInt(DEFAULT_CONVERSION_FACTOR)}/wRVU until you set your own.</p>
        </div>
      </DecisionCard>

      <PayoffCard
        pill="E/M Level Accuracy"
        value={chain.value}
        caption={`${fmtInt(chain.wrvusCaptured)} extra wRVUs x ~$${fmtInt(chain.conversionFactor)}/wRVU`}
        formula={emFormula(chain)}
        testid="text-revenue-em-payoff"
        realizationPct={realizationPct}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH 3 — Medical Necessity Denials
// ────────────────────────────────────────────────────────────────────────

function DenialsPathSection({
  setting,
  baseline,
  values,
  onChangeValue,
  realizationPct,
}: {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}) {
  const chain = computeDenialsChain(baseline, setting, values);

  return (
    <div data-testid="section-revenue-path-denials" className="mb-8">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3">Medical Necessity Denials</p>

      <DecisionCard
        step="D1"
        title="Your medical-necessity denial rate"
        help="Today's share of eligible encounters that come back denied for medical necessity, the rate the prevention below is measured against."
        testid="card-revenue-denials-d1"
      >
        <div className="max-w-[200px]">
          <FieldLabel tip="Share of eligible encounters that come back denied for medical necessity today.">Denial rate, today</FieldLabel>
          <div className="relative">
            <NumberField
              value={asNum(values.revenueDenialsRate) > 0 ? asNum(values.revenueDenialsRate) : DEFAULT_DENIAL_RATE}
              onValueChange={(v) => onChangeValue("revenueDenialsRate", v)}
              min={0}
              max={100}
              decimal={true}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
              data-testid="input-revenue-denials-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
          </div>
        </div>
        <p className="text-[11px] text-[#8C8C8C] mt-2">
          Applied against {fmtInt(chain.eligibleEncounters)} eligible encounters/yr from your Starting-point baseline.
        </p>
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="Set how much is preventable"
        help="A denial that never should have happened still costs the claim. This is the share cleaner documentation actually prevents, above today's zero."
        testid="card-revenue-denials-d2"
      >
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C]">Share preventable with cleaner documentation</span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-revenue-denials-preventable-value">
              {fmtInt(asNum(values.revenueDenialsPreventable))}%
            </span>
          </div>
          <Slider
            value={[asNum(values.revenueDenialsPreventable)]}
            onValueChange={(v) => onChangeValue("revenueDenialsPreventable", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-revenue-denials-preventable"
          />
        </div>
        <CountOutput label="Denials prevented" value={fmtInt(chain.prevented)} unit="claims/yr" testid="text-revenue-denials-d2-output" />
        <MathBox formula={denialsCountFormula(chain)} testid="text-revenue-denials-d2-formula" />
      </DecisionCard>

      <DecisionCard
        step="D3"
        title="Set the average claim value"
        help="The dollar every prevented medical-necessity denial actually protects. Still no total, that comes next."
        testid="card-revenue-denials-d3"
      >
        <div className="max-w-[200px]">
          <FieldLabel tip="Average dollar value of a medical-necessity claim you protect by preventing its denial. Priced at claim value, not contribution margin: the care was already delivered before the denial, so there is no new variable cost to subtract, unlike a brand-new visit.">Average claim value</FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
            <NumberField
              value={asNum(values.revenueDenialsAvgClaimValue) > 0 ? asNum(values.revenueDenialsAvgClaimValue) : DEFAULT_AVG_CLAIM_VALUE}
              onValueChange={(v) => onChangeValue("revenueDenialsAvgClaimValue", v)}
              min={0}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
              data-testid="input-revenue-denials-avg-claim-value"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/claim</span>
          </div>
          <p className="text-[11px] text-[#8C8C8C] mt-1">Defaults to ${fmtInt(DEFAULT_AVG_CLAIM_VALUE)}/claim until you set your own.</p>
        </div>
      </DecisionCard>

      <PayoffCard
        pill="Medical Necessity Denials"
        value={chain.value}
        caption={`${fmtInt(chain.prevented)} denials prevented x ~$${fmtInt(chain.avgClaimValue)}/claim`}
        formula={denialsFormula(chain)}
        testid="text-revenue-denials-payoff"
        realizationPct={realizationPct}
      />
    </div>
  );
}
