import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { lineOptions, realizedValue, formulaWithRealization, type LeverValues } from "@/lib/attain/attainLevers";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeWorkforceChain,
  WORKFORCE_TURNOVER_DEFAULT_PCT,
  WORKFORCE_REPLACEMENT_COST_DEFAULT,
  WORKFORCE_BURNOUT_SHARE_PCT,
  WORKFORCE_IMPACT_CEILING_PP,
  SURVEY_CADENCE_LABELS,
  BACKFILL_LEVEL_LABELS,
} from "@/lib/attain/attainWorkforce";
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
function fmtPp(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

interface WorkforceDecisionChainProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  /** This priority's realization/attribution rate, 0-100, default 100 - see
   * AccessDecisionChain.tsx's matching prop for the full explanation. */
  realizationPct: number;
  /** The access/retention shared-freed-hour split (0-1), 1 when Access is
   * not also selected - see AccessDecisionChain.tsx's matching prop and
   * StepBuildCase.tsx's `crossGoalShareMultiplier` for the full explanation
   * (C1 in the premium audit: this D5 payoff preview must read the exact
   * same split-adjusted dollar every other surface on this page already
   * does). */
  crossGoalShareMultiplier: number;
}

/** A card shell shared by every D1-D5 step - same local convention
 * AccessDecisionChain.tsx / RevenueDecisionChain.tsx use, deliberately not
 * shared with the generic lever card (bypassed entirely for retention). */
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

/** A quiet, count-only output row - % of burnout departures avoided, or
 * providers, NEVER a dollar figure. D1-D5 all use this; THE PAYOFF is the
 * one place a dollar appears. */
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

function LevelToggle({
  labels,
  level,
  onChange,
  testidPrefix,
}: {
  labels: string[];
  level: number;
  onChange: (level: number) => void;
  testidPrefix: string;
}) {
  return (
    <div className="flex rounded-md border border-[#E5E5E5] overflow-hidden w-fit">
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(i)}
          className={`px-4 h-10 text-xs font-medium transition-colors ${
            level === i ? "bg-[#1A1A1A] text-white" : "bg-white text-[#8C8C8C] hover:bg-[#F5F0EB]"
          }`}
          data-testid={`${testidPrefix}-${i}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Build the case, WORKFORCE (Provider Retention) - a bespoke ordered
 * decision chain, matching Access's and Revenue's chain bar rather than the
 * generic flat lever renderer. Workforce is about VOLUNTARY TURNOVER: the
 * value is departures avoided x replacement cost. D1-D5 below show pp of
 * turnover impact, providers, or departments, never a dollar; THE PAYOFF at
 * the bottom is the one place a dollar first appears, derived from all five
 * decisions above, never invented.
 */
export default function WorkforceDecisionChain({ setting, baseline, values, onChangeValue, realizationPct, crossGoalShareMultiplier }: WorkforceDecisionChainProps) {
  const presetLines = lineOptions("retention", setting);
  const selectedLines = asLines(values.retentionLines);
  const totalUnits = Math.max(0, Math.round((setting === "nursing" ? baseline.nursingFtes : baseline.providers) ?? 0));
  const requestedProviders = asNum(values.retentionProviders);
  const unitNoun = setting === "nursing" ? "nurses" : "providers";

  const chain = computeWorkforceChain(baseline, setting, values, crossGoalShareMultiplier);
  const { scope, protect, survey, backfill, sustain, payoff, formulas } = chain;
  const realizedPayoffValue = realizedValue(payoff.value, realizationPct);
  const payoffFormulaDisplay = payoff.value > 0
    ? formulaWithRealization(formulas.payoff, realizationPct, realizedPayoffValue)
    : formulas.payoff;

  const toggleLine = (line: string) => {
    const next = selectedLines.includes(line) ? selectedLines.filter((l) => l !== line) : [...selectedLines, line];
    onChangeValue("retentionLines", next);
  };

  const ceiling = WORKFORCE_IMPACT_CEILING_PP[setting];

  return (
    <div data-testid="section-attain-workforce-chain">
      <DecisionCard
        step="D1"
        title="Who is in scope, and what departures cost you"
        help="Committing a cohort, a real provider count, your turnover rate, and your replacement cost puts the plan on real numbers. No dollar figure yet, there is no protected relief decided."
        testid="card-workforce-d1"
      >
        {presetLines.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {presetLines.map((line) => {
              const active = selectedLines.includes(line);
              return (
                <button
                  key={line}
                  type="button"
                  onClick={() => toggleLine(line)}
                  className={`px-3 py-2 rounded-md text-sm border transition-all ${
                    active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
                  }`}
                  data-testid={`chip-workforce-line-${line.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {line}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <FieldLabel tip={`How many ${unitNoun} are covered by this plan, capped to your Starting-point baseline.`}>
              How many {unitNoun} are in scope
            </FieldLabel>
            <NumberField
              value={requestedProviders}
              onValueChange={(v) => onChangeValue("retentionProviders", v)}
              min={0}
              max={totalUnits || undefined}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              placeholder={totalUnits > 0 ? `e.g., up to ${totalUnits}` : "e.g., 40"}
              data-testid="input-workforce-providers"
            />
            <p className="text-[11px] text-[#8C8C8C] mt-1">
              Capped at your Starting-point count{totalUnits > 0 ? ` of ${totalUnits.toLocaleString()}` : ""}.
            </p>
          </div>

          <div>
            <FieldLabel tip="The rate departures avoided is measured against, your own number, not an assumed benchmark.">
              Current voluntary turnover
            </FieldLabel>
            <div className="relative">
              <NumberField
                value={asNum(values.retentionTurnoverRate) > 0 ? asNum(values.retentionTurnoverRate) : WORKFORCE_TURNOVER_DEFAULT_PCT[setting]}
                onValueChange={(v) => onChangeValue("retentionTurnoverRate", v)}
                min={0}
                max={40}
                decimal={true}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
                data-testid="input-workforce-turnover-rate"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
            </div>
            <p className="text-[11px] text-[#8C8C8C] mt-1">Defaults to {WORKFORCE_TURNOVER_DEFAULT_PCT[setting]}% until you set your own.</p>
          </div>

          <div>
            <FieldLabel tip="The dollar every avoided departure is actually worth, your own number. Benchmarked but never assumed.">
              Replacement cost per departure
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
              <NumberField
                value={asNum(values.retentionReplacementCost) > 0 ? asNum(values.retentionReplacementCost) : WORKFORCE_REPLACEMENT_COST_DEFAULT[setting]}
                onValueChange={(v) => onChangeValue("retentionReplacementCost", v)}
                min={0}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
                data-testid="input-workforce-replacement-cost"
              />
            </div>
            <p className="text-[11px] text-[#8C8C8C] mt-1">
              Defaults to ${fmtInt(WORKFORCE_REPLACEMENT_COST_DEFAULT[setting])}. {setting === "nursing" ? "Nurses run lower than physicians." : "Physicians typically run $250K-$500K."}
            </p>
          </div>
        </div>

        <CountOutput label="In scope for the retention plan" value={fmtInt(scope.providersInScope)} unit={unitNoun} testid="text-workforce-d1-output" />
        <div className="mt-3 flex items-center gap-1.5" data-testid="text-workforce-d1-burnout-share">
          <span className="text-[11px] text-[#8C8C8C]">
            {fmtPp(scope.burnoutSharePct)}% of that turnover is attributed to burnout, a fixed benchmark this plan
            builds on, not a decision below.
          </span>
          <InfoTip
            text="A fixed share of voluntary turnover this setting attributes to burnout (not editable here), matching the engine's own benchmark. It directly scales the payoff at the bottom, so it is surfaced here up front rather than only in the final caption."
            testid="tooltip-workforce-burnout-share"
          />
        </div>
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="Protect the recovered relief"
        help="The core lever. The share of freed documentation time held down and not refilled by a bigger panel or a covering shift. This is what moves likelihood-to-stay, and it is the one decision that shares the same freed hour with Access when both are in your plan."
        testid="card-workforce-d2"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Share of freed time protected as relief (not refilled)
              <InfoTip
                text="The portion of the time Abridge frees up that stays as protected relief, instead of being absorbed by a bigger panel or a covering shift. This is the primary driver of the retention impact."
                testid="tooltip-workforce-protect"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-workforce-protect-value">
              {fmtPp(protect.requestedSharePct)}%
            </span>
          </div>
          <Slider
            value={[protect.requestedSharePct]}
            onValueChange={(v) => onChangeValue("retentionProtect", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-workforce-protect"
          />
        </div>

        <CountOutput label="Retention impact building" value={fmtPp(protect.impactPp)} unit="% of burnout departures avoided" testid="text-workforce-d2-output" />
        <MathBox formula={formulas.protect} testid="text-workforce-d2-formula" />
      </DecisionCard>

      <DecisionCard
        step="D3"
        title="Run a likelihood-to-stay and burnout pulse"
        help="A short pulse, not the annual engagement survey, is both the intervention that catches erosion early and the signal this plan watches later. A faster cadence realizes more of what D2 already protects."
        testid="card-workforce-d3"
      >
        <LevelToggle
          labels={SURVEY_CADENCE_LABELS}
          level={Math.min(2, Math.max(0, Math.round(asNum(values.retentionSurveyCadence))))}
          onChange={(level) => onChangeValue("retentionSurveyCadence", level)}
          testidPrefix="button-workforce-survey"
        />

        <div className="mt-4">
          <CountOutput label="Impact after the pulse" value={fmtPp(survey.impactPpAfterSurvey)} unit="% of burnout departures avoided" testid="text-workforce-d3-output" />
          <MathBox formula={formulas.survey} testid="text-workforce-d3-formula" />
        </div>
      </DecisionCard>

      <DecisionCard
        step="D4"
        title="Backfill coverage gaps"
        help="A separate mechanism from D2: backfilling an open shift or panel before the remaining staff absorb it keeps the burden from quietly returning. This adds on its own, even if D2 is still at zero."
        testid="card-workforce-d4"
      >
        <LevelToggle
          labels={BACKFILL_LEVEL_LABELS}
          level={backfill.level}
          onChange={(level) => onChangeValue("retentionBackfill", level)}
          testidPrefix="button-workforce-backfill"
        />

        <div className="mt-4">
          <CountOutput label="Impact after backfill" value={fmtPp(backfill.impactPpAfterBackfill)} unit="% of burnout departures avoided" testid="text-workforce-d4-output" />
          <MathBox formula={formulas.backfill} testid="text-workforce-d4-formula" />
        </div>
      </DecisionCard>

      <DecisionCard
        step="D5"
        title="Sustain it"
        help="Relief that holds for more months compounds into a larger share of the departures this plan is working to avoid. Zero months held is zero departures avoided, no matter how strong the decisions above are."
        testid="card-workforce-d5"
      >
        <div className="max-w-[240px] mb-4">
          <FieldLabel tip="How many of the next 12 months the protected relief actually holds.">Months sustained</FieldLabel>
          <NumberField
            value={sustain.months}
            onValueChange={(v) => onChangeValue("retentionSustain", v)}
            min={0}
            max={12}
            decimal={false}
            className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
            data-testid="input-workforce-sustain"
          />
        </div>

        <CountOutput
          label="Realized retention impact"
          value={fmtPp(sustain.compositeImpactPct)}
          unit={`% of burnout departures avoided (of a ${ceiling}% ceiling)`}
          testid="text-workforce-d5-output"
        />
        <MathBox formula={formulas.sustain} testid="text-workforce-d5-formula" />
      </DecisionCard>

      {/* This used to be a full-bleed dark hero card - the exact dollar the
          side panel's "Plan so far" already shows, stranded at the bottom
          of the page. It's now a quiet inline line, same card shell as
          D1-D5 above, so the panel stays the one place that total actually
          lives. */}
      <DecisionCard
        step="The payoff"
        title="Departures avoided x replacement cost"
        help="Providers x turnover x burnout share x the impact the five decisions above produce. Already counted in the running total in the panel to the right."
        testid="card-workforce-payoff"
      >
        <p className="text-[15px] text-[#1A1A1A]" data-testid="text-workforce-payoff-caption">
          <span className="font-abridge text-2xl text-[#EA2C00] font-bold" data-testid="text-workforce-payoff-value">
            {fmtMoneyCompact(realizedPayoffValue)}
          </span>{" "}
          from {payoff.departuresAvoided.toFixed(1)} departures avoided/yr x ~${fmtInt(scope.replacementCost)}/departure, about{" "}
          {fmtPp(payoff.turnoverPointsReduced)} pts off your {fmtPp(scope.turnoverRatePct)}% turnover rate. Burnout
          attributed to {fmtPp(WORKFORCE_BURNOUT_SHARE_PCT[setting])}% of that turnover.
        </p>
        <MathBox formula={payoffFormulaDisplay} testid="text-workforce-payoff-formula" />
      </DecisionCard>
    </div>
  );
}
