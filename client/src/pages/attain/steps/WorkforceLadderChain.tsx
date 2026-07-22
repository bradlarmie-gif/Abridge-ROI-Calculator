import { motion } from "framer-motion";
import { HelpCircle, ArrowDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { lineOptions, realizedValue, formulaWithRealization, type LeverValues } from "@/lib/attain/attainLevers";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import { DEFAULT_MINUTES_SAVED_PER_NOTE } from "@/lib/attain/attainAccess";
import {
  computeWorkforceChain,
  WORKFORCE_TURNOVER_DEFAULT_PCT,
  WORKFORCE_REPLACEMENT_COST_DEFAULT,
  WORKFORCE_IMPACT_CEILING_PP,
  SURVEY_CADENCE_LABELS,
  BACKFILL_LEVEL_LABELS,
} from "@/lib/attain/attainWorkforce";
import type { AttainSetting } from "@/lib/attain/attainTypes";
import { fmtInt, fmtMoneyCompact, fmtHoursShort, fmtDepartures, deriveRetentionLadder, BurnoutPoolGate } from "./accessLadder";

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}
function fmtPp(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

interface WorkforceLadderChainProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
  crossGoalShareMultiplier: number;
}

/** A ladder rung shell, identical in shape to AccessDecisionChain's, so the
 * two goals' Build-the-case pages open on the same visual language. */
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
  children: React.ReactNode;
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

/** A quiet, count-only output row, never a dollar figure. The multiplying
 * rungs use this; the prize is the one place a dollar appears. */
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

/** A "The math" box that prints one or more derivation lines, so a multi-step
 * rung (protect the relief, then make it hold) still shows every step. */
function MathBox({ lines, testid }: { lines: string[]; testid: string }) {
  const shown = lines.filter((l) => l && l.length > 0);
  if (shown.length === 0) return null;
  return (
    <div className="mt-3 bg-[#F8F5F1] border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
      <div className="space-y-1" data-testid={testid}>
        {shown.map((l, i) => (
          <p key={i} className="text-[12.5px] text-[#3A3A3A] leading-relaxed">{l}</p>
        ))}
      </div>
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
 * Build the case, RETENTION (Workforce) for OUTPATIENT, rebuilt as the same
 * step-down ladder Planning reads back on the hook (see accessLadder.tsx's
 * `deriveRetentionLadder` and `BurnoutPoolGate`, the one source of the order,
 * the first domino, the gate, and the numbers). The outcome leads: lower
 * voluntary turnover AND a better clinician experience. From that outcome we
 * work backward. The first domino is the same as access, minutes saved per
 * note, but read the other way: the freed time you do not hand to the schedule
 * stays with the clinician and comes off their after-hours charting. Less work
 * outside of work lowers burnout, which raises likelihood-to-stay, which avoids
 * departures, whose replacement cost is the dollar. Money is departures avoided
 * x replacement cost, and departures avoided is a slice of the burnout pool, so
 * no dollar can exist until every rung above the gate is real. The running
 * total lives in the side panel, building as each rung is set.
 */
export default function WorkforceLadderChain({ setting, baseline, values, onChangeValue, realizationPct, crossGoalShareMultiplier }: WorkforceLadderChainProps) {
  const presetLines = lineOptions("retention", setting);
  const selectedLines = asLines(values.retentionLines);
  const totalUnits = Math.max(0, Math.round((setting === "nursing" ? baseline.nursingFtes : baseline.providers) ?? 0));
  const requestedProviders = asNum(values.retentionProviders);
  const unitNoun = setting === "nursing" ? "nurses" : "providers";
  const ceiling = WORKFORCE_IMPACT_CEILING_PP[setting];
  const minutes = asNum(values.retentionMinutesSaved) > 0 ? asNum(values.retentionMinutesSaved) : DEFAULT_MINUTES_SAVED_PER_NOTE;

  const chain = computeWorkforceChain(baseline, setting, values, crossGoalShareMultiplier);
  const { scope, protect, survey, backfill, sustain, payoff, formulas } = chain;
  const realizedPayoffValue = realizedValue(payoff.value, realizationPct);
  const payoffFormulaDisplay = payoff.value > 0
    ? formulaWithRealization(formulas.payoff, realizationPct, realizedPayoffValue)
    : formulas.payoff;

  // The same shared ladder derivation Planning consumes, so the gate and the
  // prize read the identical numbers on both pages.
  const ladder = deriveRetentionLadder(chain, setting, baseline, {
    minutes,
    departuresAvoided: payoff.departuresAvoided,
    prize: realizedPayoffValue,
  });

  const toggleLine = (line: string) => {
    const next = selectedLines.includes(line) ? selectedLines.filter((l) => l !== line) : [...selectedLines, line];
    onChangeValue("retentionLines", next);
  };

  return (
    <div data-testid="section-attain-workforce-chain">
      {/* THE FIRST DOMINO. The same minutes saved per note access proves, read
          the retention way: the freed time you keep gives the clinician their
          evening back and comes off after-hours charting. Same anchor
          treatment Planning's read-only spine opens on. */}
      <LadderRung
        anchor
        eyebrow="The first domino"
        title="Minutes saved per note"
        help="This is the one number we prove first. Ambient documentation gives each provider back a few minutes on every note. The share you do not route to the schedule stays with the clinician and comes straight off their after-hours charting, the work outside of work that drives burnout."
        testid="card-workforce-d1-domino"
      >
        <div className="max-w-[220px]">
          <FieldLabel
            tip="A planning assumption for this priority, not yet a measured result. Benchmark: ambient typically saves ~2 to 4 minutes per note. Start conservative and raise it once you have your own results."
            testid="tooltip-workforce-minutes-saved"
          >
            Target: minutes saved per note
          </FieldLabel>
          <div className="relative">
            <NumberField
              value={minutes}
              onValueChange={(v) => onChangeValue("retentionMinutesSaved", v)}
              min={0}
              max={60}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-16 text-sm"
              data-testid="input-workforce-minutes-saved"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">min / note</span>
          </div>
        </div>
      </LadderRung>

      <Connector />

      {/* Rung 1: scope, turnover, and what a departure costs. No dollar yet. */}
      <LadderRung
        eyebrow="Rung 1 · Scope"
        title="Who is in scope, and what a departure costs"
        help="Pick the departments, the number of providers in scope, your own voluntary turnover rate, and your replacement cost per departure. This is the cohort every rung below is built from. Still no dollar figure; the impact and the pool come next."
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
              Defaults to ${fmtInt(WORKFORCE_REPLACEMENT_COST_DEFAULT[setting])}. {setting === "nursing" ? "Nurses run lower than physicians." : "Physicians typically run $250K to $500K."}
            </p>
          </div>
        </div>

        <CountOutput label="In scope for the retention plan" value={fmtInt(scope.providersInScope)} unit={unitNoun} testid="text-workforce-d1-output" />
        <div className="mt-3 flex items-center gap-1.5" data-testid="text-workforce-d1-burnout-share">
          <span className="text-[11px] text-[#8C8C8C]">
            {fmtPp(scope.burnoutSharePct)}% of that turnover is attributed to burnout, a fixed benchmark this plan builds on, not a decision below.
          </span>
          <InfoTip
            text="A fixed share of voluntary turnover this setting attributes to burnout (not editable here), matching the engine's own benchmark. It sets the size of the departure pool at the gate below."
            testid="tooltip-workforce-burnout-share"
          />
        </div>
      </LadderRung>

      <Connector />

      {/* Rung 2: protect the relief. The freed time from the first domino
          becomes retention only where it STAYS with the clinician, off their
          after-hours charting, instead of being handed to the schedule. */}
      <LadderRung
        eyebrow="Rung 2 · Protected relief"
        title="Give the freed hour back to the clinician"
        help="The freed time from the first domino lowers burnout only where it stays as protected relief, coming off after-hours charting, instead of being refilled by a bigger panel or a covering shift. This is the core decision, and it is the same freed hour access spends on the schedule when both are in your plan."
        testid="card-workforce-d2"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Share of freed time protected as relief (not refilled)
              <InfoTip
                text="The portion of the time Abridge frees up that stays with the clinician as protected relief, reducing after-hours charting, instead of being absorbed by a bigger panel or a covering shift."
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CountOutput
            label="Freed time from the first domino"
            value={fmtHoursShort(ladder.freedHrsPerProviderWk)}
            unit="hrs / provider / wk"
            testid="text-workforce-freed-output"
          />
          <CountOutput
            label="Protected relief, off after-hours charting"
            value={fmtHoursShort(ladder.protectedHrsPerProviderWk)}
            unit="hrs / provider / wk"
            testid="text-workforce-d2-output"
          />
        </div>
        <MathBox lines={[formulas.protect]} testid="text-workforce-d2-formula" />
      </LadderRung>

      <Connector />

      {/* Rung 3: make the relief hold, and turn it into a durable burnout
          reduction. The pulse catches erosion, backfill keeps the burden from
          returning, and sustaining is what actually realizes the impact. */}
      <LadderRung
        eyebrow="Rung 3 · Burnout comes down"
        title="Make the relief hold"
        help="Protected relief only lowers burnout for as long as it holds. A likelihood-to-stay and burnout pulse catches erosion early, backfilling open coverage keeps the burden from quietly returning, and the months you sustain it decide how much of the reachable impact you actually realize."
        testid="card-workforce-d3"
      >
        <div className="space-y-5">
          <div>
            <FieldLabel tip="A short pulse, not the annual engagement survey. It is both the intervention that catches erosion early and a signal the plan watches. A faster cadence realizes more of what Rung 2 protects.">
              Run a likelihood-to-stay and burnout pulse
            </FieldLabel>
            <LevelToggle
              labels={SURVEY_CADENCE_LABELS}
              level={Math.min(2, Math.max(0, Math.round(asNum(values.retentionSurveyCadence))))}
              onChange={(level) => onChangeValue("retentionSurveyCadence", level)}
              testidPrefix="button-workforce-survey"
            />
          </div>

          <div>
            <FieldLabel tip="Backfilling an open shift or panel before the remaining staff absorb it is a separate mechanism from protecting relief. It adds on its own, even if Rung 2 is still at zero.">
              Backfill coverage gaps
            </FieldLabel>
            <LevelToggle
              labels={BACKFILL_LEVEL_LABELS}
              level={backfill.level}
              onChange={(level) => onChangeValue("retentionBackfill", level)}
              testidPrefix="button-workforce-backfill"
            />
          </div>

          <div className="max-w-[240px]">
            <FieldLabel tip="How many of the next 12 months the protected relief actually holds. Zero months held is zero departures avoided.">
              Months sustained
            </FieldLabel>
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
        </div>

        <div className="mt-4">
          <CountOutput
            label="Burnout comes down, of a reachable ceiling"
            value={fmtHoursShort(sustain.compositeImpactPct)}
            unit={`% of burnout-related departures avoided (ceiling ${ceiling}%)`}
            testid="text-workforce-d3-output"
          />
          <MathBox lines={[formulas.survey, formulas.backfill, formulas.sustain]} testid="text-workforce-d3-formula" />
        </div>
      </LadderRung>

      <Connector />

      {/* THE GATE. Burnout sets the ceiling: you can only avoid the departures
          burnout actually causes. The pool is providers x turnover x burnout
          share, and the composite impact above captures a slice of it. Same
          gate framing and triad Planning shows read-only. */}
      <LadderRung
        eyebrow="The gate"
        title="Burnout sets the ceiling on what you can avoid"
        help="Protecting relief only avoids the departures burnout actually causes. That pool, your providers times turnover times the burnout share, is the ceiling. The impact you built above captures a slice of it. Output is in departures, still no dollars."
        testid="card-workforce-gate"
      >
        <BurnoutPoolGate
          showHeader={false}
          burnoutPool={ladder.burnoutPool}
          compositeImpactPct={ladder.compositeImpactPct}
          departuresAvoided={ladder.departuresAvoided}
          turnoverRatePct={ladder.turnoverRatePct}
          burnoutSharePct={ladder.burnoutSharePct}
          bothSet={ladder.burnoutPool > 0 && ladder.compositeImpactPct > 0}
          emptyHint={
            ladder.burnoutPool <= 0
              ? "Set your scope, turnover, and burnout share in Rung 1 to size the departure pool, then protect some relief."
              : "Protect some relief and make it hold above to capture a slice of this pool."
          }
        />
      </LadderRung>

      <Connector />

      {/* THE PRIZE. The one place a dollar appears, derived from the rungs
          above (departures avoided x replacement cost). The live running total
          lives in the side panel; here it is a quiet line plus transparent
          math, never a big stranded hero figure. */}
      <LadderRung
        eyebrow="The prize"
        title="What it is worth"
        help="Departures avoided times your replacement cost per departure, the first and only dollar in this ladder, derived from the rungs above. It is already counted in your plan, forming, on the right."
        testid="card-workforce-prize"
      >
        {payoff.value > 0 ? (
          <p className="text-[15px] text-[#1A1A1A]" data-testid="text-workforce-prize-caption">
            <span className="font-semibold text-[#EA2C00]" data-testid="text-workforce-prize-value">{fmtMoneyCompact(realizedPayoffValue)}</span>
            {" / yr, from "}
            {fmtDepartures(payoff.departuresAvoided)} departures avoided x ~${fmtInt(scope.replacementCost)}/departure, about{" "}
            {fmtPp(payoff.turnoverPointsReduced)} pts off your {fmtPp(scope.turnoverRatePct)}% turnover rate.
            {" Tracked live in your plan on the right."}
          </p>
        ) : (
          <p className="text-[13.5px] text-[#8C8C8C]" data-testid="text-workforce-prize-empty">
            Finish the rungs above and the prize appears here and in your plan on the right.
          </p>
        )}
        <MathBox lines={[payoffFormulaDisplay]} testid="text-workforce-prize-formula" />
      </LadderRung>
    </div>
  );
}
