import { motion } from "framer-motion";
import { HelpCircle, ArrowDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { realizedValue, formulaWithRealization, type LeverValues, type AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeHccChain,
  computeEmChain,
  computeDenialsChain,
  deriveRevenueLadder,
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
  DEFAULT_CONVERSION_FACTOR,
  DEFAULT_DENIAL_RATE,
  DEFAULT_AVG_CLAIM_VALUE,
  DEFAULT_EM_EMPLOYED_SHARE,
  DEFAULT_EM_VISIT_SHARE,
  DEFAULT_EM_DOC_CAUSED_SHARE,
  DEFAULT_EM_WRVU_GAIN,
  REVENUE_PATH_LABELS,
  type RevenuePathId,
} from "@/lib/attain/attainRevenue";
import type { AttainSetting } from "@/lib/attain/attainTypes";
import { fmtInt, fmtMoneyCompact, fmtRevenueCount, RevenuePathGate } from "./accessLadder";

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}

interface RevenueLadderChainProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}

// ── Shared rung shells, matched to WorkforceLadderChain's visual language ──

function LadderRung({
  eyebrow,
  title,
  help,
  testid,
  anchor,
  children,
}: {
  eyebrow: string;
  title: string;
  help: string;
  testid: string;
  anchor?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-7 ${anchor ? "bg-[#FFF6F3] border-[#EA2C00]" : "bg-white border-[#E7E0D6]"}`}
      data-testid={testid}
    >
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">{eyebrow}</p>
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 font-abridge">{title}</h3>
      <p className="text-[15px] text-[#8C8C8C] leading-relaxed mb-5 max-w-[620px]">{help}</p>
      {children}
    </motion.div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-1.5">
      <ArrowDown className="w-4 h-4 text-[#B4B4B4]" />
    </div>
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

function MathBox({ formula, testid }: { formula: string; testid: string }) {
  return (
    <div className="mt-3 bg-[#F8F5F1] border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
      <p className="text-[12.5px] text-[#3A3A3A] leading-relaxed" data-testid={testid}>{formula}</p>
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

/** The quiet per-path prize line, the first and only place that path's dollar
 * appears. The running total lives in the side panel. */
function PrizeLine({ value, caption, formula, testid }: { value: number; caption: string; formula: string; testid: string }) {
  return (
    <div className="rounded-xl border border-[#E7E0D6] bg-[#F8F5F1] p-5" data-testid={testid}>
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">The prize</p>
      {value > 0 ? (
        <p className="text-[15px] text-[#1A1A1A]">
          <span className="font-abridge text-2xl text-[#EA2C00] font-bold" data-testid={`${testid}-value`}>{fmtMoneyCompact(value)}</span>{" "}
          / yr, from {caption}. Already counted in your plan on the right.
        </p>
      ) : (
        <p className="text-[13.5px] text-[#8C8C8C]" data-testid={`${testid}-empty`}>Commit to a share of the gap above and the prize appears here and in your plan on the right.</p>
      )}
      <MathBox formula={formula} testid={`${testid}-formula`} />
    </div>
  );
}

/**
 * Build the case, OUTPATIENT REVENUE, rebuilt as the converging multi-path
 * ladder Planning reads back on the hook (see accessLadder.tsx's
 * `RevenuePathGate` and attainRevenue.ts's `deriveRevenueLadder`, the one
 * source of the order, the shared first domino, each path's diagnosis gate,
 * and the numbers). Revenue has a different SHAPE from access/retention: one
 * lever (complete, specific documentation at the point of care) feeding
 * several parallel payoffs that converge into one captured-revenue prize.
 *
 * The partner picks which revenue they are chasing, then each chosen path
 * runs the same four-beat conversation: GROUND the reality, DIAGNOSE the
 * documentation-caused leak Abridge can actually move (the load-bearing
 * rung), name WHO ACTS, and the number falls out. A dollar never appears
 * before that path's own gate is real, and the chosen paths simply sum,
 * because a captured HCC, a corrected claim, and a prevented denial are
 * never the same dollar.
 */
export default function RevenueLadderChain({ setting, baseline, values, onChangeValue, realizationPct }: RevenueLadderChainProps) {
  const available = pathsAvailableFor(setting);
  const chosen = selectedPaths(values).filter((p) => available.includes(p));
  const rawPaths = asLines(values.revenuePaths);
  const ladder = deriveRevenueLadder(baseline, setting, values, realizationPct);
  const converged = ladder.convergedPrize;

  const togglePath = (id: RevenuePathId) => {
    const label = REVENUE_PATH_LABELS[id];
    const next = rawPaths.includes(label) ? rawPaths.filter((l) => l !== label) : [...rawPaths, label];
    onChangeValue("revenuePaths", next);
  };

  return (
    <div data-testid="section-attain-revenue-ladder">
      {/* THE FIRST DOMINO, shared by every path where they converge: the one
          Abridge lever. Same anchor treatment access/retention open on. */}
      <LadderRung
        anchor
        eyebrow="The first domino"
        title="Complete, specific documentation at the point of care"
        help="This is the one thing Abridge moves, and it is where every revenue path below converges. When the note carries the full picture of the visit, the claim can reflect the care that was actually delivered. Nothing below happens without it, and everything below is built on top of it."
        testid="card-revenue-domino"
      />

      <Connector />

      <LadderRung
        eyebrow="Choose your paths"
        title="What revenue are you trying to capture?"
        help="Pick one or more. Each is a genuinely different claim: a captured condition, a corrected level, and a prevented denial are never the same dollar, so they add rather than compete. Only the paths you pick open their own questions below."
        testid="card-revenue-path-chooser"
      >
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
      </LadderRung>

      {chosen.includes("em") && (
        <>
          <Connector />
          <EmPath baseline={baseline} setting={setting} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />
        </>
      )}

      {chosen.includes("hcc") && setting === "outpatient" && (
        <>
          <Connector />
          <HccPath baseline={baseline} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />
        </>
      )}

      {chosen.includes("denials") && (
        <>
          <Connector />
          <DenialsPath baseline={baseline} setting={setting} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />
        </>
      )}

      {chosen.length > 1 && (
        <>
          <Connector />
          <div className="rounded-xl bg-[#1A1A1A] p-6" data-testid="card-revenue-converged">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/40 mb-1">Where the paths converge</p>
            {converged > 0 ? (
              <p className="font-abridge text-3xl md:text-4xl text-[#EA2C00] font-bold" data-testid="text-revenue-converged-value">
                {fmtMoneyCompact(converged)} <span className="text-sm font-normal text-white/50">captured / yr</span>
              </p>
            ) : (
              <p className="text-sm text-white/60" data-testid="text-revenue-converged-empty">Finish a path above and the converged prize appears here.</p>
            )}
            <p className="text-[11px] text-white/50 mt-2 leading-relaxed">
              {chosen.length} paths, each its own claim pool, summed once and never double-counted.
              {realizationPct < 100 ? ` Attributed at ${Math.round(realizationPct)}% to this plan.` : ""}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH — E/M level accuracy (the walkthrough exemplar)
// ────────────────────────────────────────────────────────────────────────

function EmPath({
  baseline,
  setting,
  values,
  onChangeValue,
  realizationPct,
}: {
  baseline: AttainBaseline;
  setting: AttainSetting;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}) {
  const chain = computeEmChain(baseline, setting, values);
  const realized = Math.round(realizedValue(chain.value, realizationPct));
  const prizeFormula = realized > 0 ? formulaWithRealization(emFormula(chain), realizationPct, realized) : emFormula(chain);

  return (
    <div data-testid="section-revenue-path-em">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3 mt-2">E/M Level Accuracy</p>

      {/* BEAT 1 — ground the reality */}
      <LadderRung
        eyebrow="Ground it"
        title="Whose visits, and how many are E&M visits"
        help="wRVU gains only accrue where providers are on productivity pay, so employed share sizes the path. And only office / E&M visits carry an E/M level, so that share scopes the volume this path is measured against."
        testid="card-revenue-em-ground"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <FieldLabel tip="Share of your providers who are employed or on productivity / wRVU pay. Where they are not, a captured wRVU does not turn into revenue for you.">
              Providers employed / on productivity pay
            </FieldLabel>
            <div className="relative">
              <NumberField
                value={asNum(values.revenueEmEmployedShare) > 0 ? asNum(values.revenueEmEmployedShare) : DEFAULT_EM_EMPLOYED_SHARE}
                onValueChange={(v) => onChangeValue("revenueEmEmployedShare", v)}
                min={0}
                max={100}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
                data-testid="input-revenue-em-employed-share"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
            </div>
          </div>
          <div>
            <FieldLabel tip="Share of your visits that are office / E&M visits, the ones that carry an E/M level. Procedures and other visit types are out of scope for this path.">
              Visits that are office / E&M visits
            </FieldLabel>
            <div className="relative">
              <NumberField
                value={asNum(values.revenueEmVisitShare) > 0 ? asNum(values.revenueEmVisitShare) : DEFAULT_EM_VISIT_SHARE}
                onValueChange={(v) => onChangeValue("revenueEmVisitShare", v)}
                min={0}
                max={100}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
                data-testid="input-revenue-em-visit-share"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
            </div>
          </div>
        </div>
        <CountOutput label="Office / E&M visits in scope" value={fmtInt(chain.eligibleEncounters)} unit="visits / yr" testid="text-revenue-em-ground-output" />
      </LadderRung>

      <Connector />

      {/* BEAT 2 — diagnose the leak (the gate) */}
      <LadderRung
        eyebrow="The gate · diagnose the leak"
        title="How often the claim goes out below the care delivered"
        help="On those visits, how often does the claim go out at a lower level than the care you actually delivered, because the note did not capture the full picture? That documentation-caused share is the ceiling Abridge can move. Then commit to the share of it you will actually close."
        testid="card-revenue-em-gate"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <FieldLabel tip="Share of your E/M visits where the claim goes out below the care delivered because the note fell short. This is today's leak, the ceiling on what better documentation can move.">
              Claims going out below the care delivered
            </FieldLabel>
            <div className="relative">
              <NumberField
                value={asNum(values.revenueEmDocCausedShare) > 0 ? asNum(values.revenueEmDocCausedShare) : DEFAULT_EM_DOC_CAUSED_SHARE}
                onValueChange={(v) => onChangeValue("revenueEmDocCausedShare", v)}
                min={0}
                max={100}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
                data-testid="input-revenue-em-doc-caused-share"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
            </div>
          </div>
          <div>
            <FieldLabel tip="Average wRVU recovered when one of those claims is corrected up to the level you actually supported.">
              wRVU recovered per corrected claim
            </FieldLabel>
            <NumberField
              value={asNum(values.revenueEmWrvuGain) > 0 ? asNum(values.revenueEmWrvuGain) : DEFAULT_EM_WRVU_GAIN}
              onValueChange={(v) => onChangeValue("revenueEmWrvuGain", v)}
              min={0}
              max={3}
              decimal={true}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              data-testid="input-revenue-em-wrvu-gain"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Share of that documentation gap you commit to close
              <InfoTip text="How much of the documentation-caused pool you actually close. This is the gate, zero here captures nothing, no matter how large the pool." testid="tooltip-revenue-em-capture" />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-revenue-em-capture-value">
              {fmtInt(asNum(values.revenueEmLift))}%
            </span>
          </div>
          <Slider
            value={[asNum(values.revenueEmLift)]}
            onValueChange={(v) => onChangeValue("revenueEmLift", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-revenue-em-capture"
          />
        </div>

        <RevenuePathGate
          showHeader={false}
          ceilingLabel="Claims going out low, the documentation leak"
          ceilingCount={chain.docCausedVisits}
          ceilingUnit="claims / yr"
          capturedLabel="Claims corrected to the supported level"
          capturedCount={chain.correctedVisits}
          capturedUnit="claims / yr"
          whoActs="Providers and the coding team"
          bothSet={chain.docCausedVisits > 0 && chain.capturePct > 0}
          emptyHint={
            chain.docCausedVisits <= 0
              ? "Set the office / E&M visits in scope above and today's documentation leak to size the pool, then commit to a share of it."
              : "Commit to a share of the documentation gap to see how many claims get corrected."
          }
        />
        <MathBox formula={emCountFormula(chain)} testid="text-revenue-em-gate-formula" />
      </LadderRung>

      <Connector />

      {/* BEAT 4 — the number */}
      <div className="max-w-[240px] mb-5">
        <FieldLabel tip="Your own negotiated dollars-per-wRVU conversion factor, not a benchmark.">Conversion factor ($/wRVU)</FieldLabel>
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
      </div>
      <PrizeLine
        value={realized}
        caption={`${fmtRevenueCount(chain.correctedVisits)} corrected claims x ${chain.wrvuGain} wRVU x ~$${fmtInt(chain.conversionFactor)}/wRVU`}
        formula={prizeFormula}
        testid="text-revenue-em-prize"
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH — Risk Adjustment (HCC)
// ────────────────────────────────────────────────────────────────────────

function HccPath({
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
  const gapConditions = recapture.gapPatients * recapture.avgHccs;
  const capturedConditions = recapture.recapturedHccs + netNew.netNewHccs;
  const realized = Math.round(realizedValue(payoff.value, realizationPct));

  return (
    <div data-testid="section-revenue-path-hcc">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3 mt-2">Risk Adjustment</p>

      {/* BEAT 1 — ground */}
      <LadderRung
        eyebrow="Ground it"
        title="Which risk-based populations, and how many patients"
        help="Value only accrues where reimbursement is risk-adjusted, so this path is sized on your risk-based patients. Pick the plans and set the panel size per provider; that puts real patient volume in scope before any dollar."
        testid="card-revenue-hcc-ground"
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
                <FieldLabel tip="Patients on this plan per provider in scope, from your own panel, not a benchmark.">{name} panel size</FieldLabel>
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

        <CountOutput label="Risk-based patients in scope" value={fmtInt(scope.totalPatients)} unit="patients" testid="text-revenue-hcc-ground-output" />
      </LadderRung>

      <Connector />

      {/* BEAT 2 — diagnose */}
      <LadderRung
        eyebrow="The gate · diagnose the leak"
        title="Conditions your patients have that never reach the claim"
        help="Of the conditions your patients actually have, how many never make it onto the claim because they were not documented specifically enough? That undocumented pool is the ceiling. It is never conditions your patients do not have. Then commit to how much you recapture, and to the first-time conditions ambient surfaces."
        testid="card-revenue-hcc-gate"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <FieldLabel tip="Share of this population that carries a documented condition needing recapture each year.">Documentation gap rate, today</FieldLabel>
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
            <FieldLabel tip="Share of the gap you already recapture today, before any Abridge-driven uplift.">Recapture rate, today</FieldLabel>
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
            <FieldLabel tip="Average HCC conditions carried per gap patient, once recaptured.">Avg conditions per gap patient</FieldLabel>
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

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Recapture uplift you commit to
              <InfoTip text="How much higher than today's recapture rate you commit to reach. This is the gate for recapture, zero here recaptures nothing." testid="tooltip-revenue-hcc-recapture" />
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

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              First-time conditions ambient surfaces
              <InfoTip text="Share of the panel where ambient documentation surfaces a condition never coded before. A first-time discovery, not a recapture." testid="tooltip-revenue-hcc-netnew" />
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

        <RevenuePathGate
          showHeader={false}
          ceilingLabel="Conditions that never reach the claim"
          ceilingCount={gapConditions}
          ceilingUnit="conditions / yr"
          capturedLabel="Conditions captured back onto the claim"
          capturedCount={capturedConditions}
          capturedUnit="conditions / yr"
          whoActs="Risk adjustment / coding team"
          bothSet={gapConditions > 0 && capturedConditions > 0}
          emptyHint={
            gapConditions <= 0
              ? "Pick a population and set your documentation gap above to size the pool, then commit to a recapture uplift."
              : "Commit to a recapture uplift or a discovery rate to capture a share of the pool."
          }
        />
        <MathBox formula={formulas.recapture} testid="text-revenue-hcc-gate-formula" />
      </LadderRung>

      <Connector />

      {/* BEAT 4 — the number */}
      <div className="max-w-[240px] mb-5">
        <FieldLabel tip="RAF impact times annual capitated payment, collapsed into one figure per condition.">$ per captured condition</FieldLabel>
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
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/condition</span>
        </div>
        <p className="text-[11px] text-[#8C8C8C] mt-1">Defaults to ${fmtInt(DEFAULT_VALUE_PER_HCC)} until you set your own.</p>
      </div>
      <PrizeLine
        value={realized}
        caption={`${fmtRevenueCount(capturedConditions)} conditions captured x ~$${fmtInt(payoff.valuePerHcc)}/condition`}
        formula={realized > 0 ? formulaWithRealization(formulas.payoff, realizationPct, realized) : formulas.payoff}
        testid="text-revenue-hcc-prize"
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH — Medical Necessity Denials
// ────────────────────────────────────────────────────────────────────────

function DenialsPath({
  baseline,
  setting,
  values,
  onChangeValue,
  realizationPct,
}: {
  baseline: AttainBaseline;
  setting: AttainSetting;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}) {
  const chain = computeDenialsChain(baseline, setting, values);
  const realized = Math.round(realizedValue(chain.value, realizationPct));

  return (
    <div data-testid="section-revenue-path-denials">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3 mt-2">Medical Necessity Denials</p>

      {/* BEAT 1 — ground */}
      <LadderRung
        eyebrow="Ground it"
        title="Your denial volume and what a claim is worth"
        help="Set today's medical-necessity denial rate against your eligible encounters, and the average value of a claim you protect by preventing its denial. That sizes the pool this path is measured against, before any dollar."
        testid="card-revenue-denials-ground"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
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
          <div>
            <FieldLabel tip="Average dollar value of a medical-necessity claim you protect by preventing its denial. Priced at claim value, not margin: the care was already delivered before the denial, so there is no new variable cost to subtract.">
              Average claim value
            </FieldLabel>
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
          </div>
        </div>
        <CountOutput label="Medical-necessity denials a year" value={fmtInt(chain.deniedEncounters)} unit="denials / yr" testid="text-revenue-denials-ground-output" />
      </LadderRung>

      <Connector />

      {/* BEAT 2 — diagnose */}
      <LadderRung
        eyebrow="The gate · diagnose the leak"
        title="Which denials the note can actually prevent"
        help="Of your denials, how many are because the note did not establish why the care was needed, versus payer rules and authorization you cannot document your way out of? Only the documentation-related share is Abridge's to move. That share is the ceiling, and it is what you commit to prevent."
        testid="card-revenue-denials-gate"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Share of denials the note can prevent
              <InfoTip text="The documentation-related share of your denials: the ones caused by the note not establishing medical necessity, not payer rules or authorization. This is the gate, zero here prevents nothing." testid="tooltip-revenue-denials-preventable" />
            </span>
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

        <RevenuePathGate
          showHeader={false}
          ceilingLabel="Medical-necessity denials a year"
          ceilingCount={chain.deniedEncounters}
          ceilingUnit="denials / yr"
          capturedLabel="Denials prevented with complete documentation"
          capturedCount={chain.prevented}
          capturedUnit="denials / yr"
          whoActs="Denial prevention / billing team"
          bothSet={chain.deniedEncounters > 0 && chain.preventablePct > 0}
          emptyHint={
            chain.deniedEncounters <= 0
              ? "Set your denial rate above to size the pool, then commit to the documentation-related share you can prevent."
              : "Commit to the documentation-related share to see how many denials get prevented."
          }
        />
        <MathBox formula={denialsCountFormula(chain)} testid="text-revenue-denials-gate-formula" />
      </LadderRung>

      <Connector />

      <PrizeLine
        value={realized}
        caption={`${fmtRevenueCount(chain.prevented)} denials prevented x ~$${fmtInt(chain.avgClaimValue)}/claim`}
        formula={realized > 0 ? formulaWithRealization(denialsFormula(chain), realizationPct, realized) : denialsFormula(chain)}
        testid="text-revenue-denials-prize"
      />
    </div>
  );
}
