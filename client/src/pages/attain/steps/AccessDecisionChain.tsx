import { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { lineOptions, realizedValue, formulaWithRealization, type LeverValues } from "@/lib/attain/attainLevers";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeAccessChain,
  marginPerVisitFor,
  blendedMarginPerVisit,
  bindingPlainPhrase,
  DEFAULT_MINUTES_SAVED_PER_NOTE,
  DEFAULT_VISIT_LENGTH_MIN,
  DEFAULT_NO_SHOW_RATE_PCT,
} from "@/lib/attain/attainAccess";
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

/** D4's four demand sources, in the order they're shown - each an optional,
 * addable source of real, countable patients per year (backlog is a
 * one-time count; the rest are annual). Kept as plain data so the
 * add/remove row renderer below is one small loop, not four near-identical
 * hand-written blocks. */
type DemandSourceKey = "backlog" | "referrals" | "sameDay" | "noShow";

interface DemandSourceSpec {
  key: DemandSourceKey;
  valueKey: string;
  label: string;
  unitLabel: string;
  tip: string;
  testid: string;
}

const DEMAND_SOURCES: DemandSourceSpec[] = [
  {
    key: "backlog",
    valueKey: "accessDemandBacklog",
    label: "Referral backlog",
    unitLabel: "patients waiting now, one-time",
    tip: "The total number of patients already referred and waiting to be scheduled, right now - a one-time count, not a rate.",
    testid: "backlog",
  },
  {
    key: "referrals",
    valueKey: "accessDemandNewReferrals",
    label: "New referrals",
    unitLabel: "patients/mo",
    tip: "New referrals arriving each month, not a one-time count. THE MATH below annualizes this figure (x 12) into the demand ceiling.",
    testid: "new-referrals",
  },
  {
    key: "sameDay",
    valueKey: "accessDemandSameDayCount",
    label: "Same-day / urgent demand",
    unitLabel: "patients/yr",
    tip: "Patients per year who would book same-day or urgent care if an open slot existed for them today - a real count of patients, never a percent of your schedule.",
    testid: "sameday",
  },
  {
    key: "noShow",
    valueKey: "accessDemandNoShowCount",
    label: "No-shows you can recover",
    unitLabel: "patients/yr",
    tip: "Patients per year you can recover by filling a no-show slot with someone waiting, instead of losing it outright - a real count. Don't know your count offhand? Use the rate helper below.",
    testid: "noshow",
  },
];

interface AccessDecisionChainProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  /** This priority's realization/attribution rate, 0-100, default 100 - set
   * on Build the case's own "Realization rate" control (StepBuildCase.tsx).
   * Scales only the D5 payoff shown below, via the same `realizedValue`/
   * `formulaWithRealization` helpers attainLevers.ts's `applyRealization`
   * uses, so this live preview can never disagree with the real figure. */
  realizationPct: number;
  /** The access/retention shared-freed-hour split (0-1), 1 when Retention is
   * not also selected - see StepBuildCase.tsx's `crossGoalShareMultiplier`
   * and attainLevers.ts's `computeMultiGoalContributions`. MUST be passed
   * into `computeAccessChain` below so this D5 live preview reads the exact
   * same split-adjusted dollar as "This priority's worth," the side panel,
   * Commit, and the PDF - the split previously only applied to those other
   * surfaces, so this page could show two different dollars for one
   * priority when Access and Retention were both selected. */
  crossGoalShareMultiplier: number;
}

/** A card shell shared by every D1-D5 step: eyebrow + title, a light rule,
 * then whatever the step needs. Kept local since these five cards share
 * nothing with the generic lever card (that renderer is bypassed for
 * access entirely - see StepBuildCase.tsx). */
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

/** A quiet, count-only output row - visits or providers, NEVER a dollar
 * figure. D1-D4 all use this; D5 is the one place a dollar appears. */
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

/** One stat in the D4 plain-language result block - capacity, demand, or
 * realized, side by side so an exec reads all three at a glance instead of
 * two separately-labeled count rows. Never a dollar figure (D1-D4 rule);
 * `emphasize` marks the realized figure, the actual answer to "how many
 * visits do we get." */
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
      <p
        className={`text-xl font-bold font-abridge ${emphasize ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}
        data-testid={testid}
      >
        {value} <span className="text-xs font-normal text-[#8C8C8C]">{unit}</span>
      </p>
      {hint && <p className="text-[10.5px] text-[#B4B4B4] mt-0.5">{hint}</p>}
    </div>
  );
}

/** A small, quiet info tooltip for a term next to a label - hover/tap only,
 * never inline clutter. Reuses the house `Tooltip` primitive (the same one
 * `TermTooltip` and BaselineSetup's field labels build on) rather than a
 * bespoke popover. */
function InfoTip({ text, testid }: { text: string; testid: string }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          className="text-[#B4B4B4] hover:text-[#8C8C8C] transition-colors cursor-help inline-flex"
          data-testid={testid}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** A field label with an optional info tooltip, so every D-step label stays
 * the same shape whether or not it carries a definition. */
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
 * Build the case, ACCESS - a bespoke ordered decision chain, not the
 * generic flat lever renderer every other goal still uses. Money is
 * volume x margin, and volume itself is MIN(capacity, demand), so no
 * dollar figure can exist until scope (D1), margin (D2), capacity (D3),
 * AND demand (D4) are all real - D1-D4 below show visits and providers,
 * never a dollar. D5 is the one place a dollar first appears, derived from
 * the other four, never invented.
 */
export default function AccessDecisionChain({ setting, baseline, values, onChangeValue, realizationPct, crossGoalShareMultiplier }: AccessDecisionChainProps) {
  const [customLineDraft, setCustomLineDraft] = useState("");

  // D4's pick-what-applies state: which demand sources are currently
  // expanded for editing. Seeded once from whatever already has a nonzero
  // count (so a resumed plan reopens exactly what the partner already
  // filled in), plus backlog always starts open - patients already waiting
  // is the single most universal source, so it's prompted rather than
  // hidden behind an extra click. Nothing else opens itself; a partner has
  // to actively add same-day, no-show, or new-referral demand, so it's
  // never ambiguous whether zero of them, one of them, or all of them is
  // the expected amount to fill in.
  const [addedSources, setAddedSources] = useState<Set<DemandSourceKey>>(() => {
    const initial = new Set<DemandSourceKey>(["backlog"]);
    for (const source of DEMAND_SOURCES) {
      if (asNum(values[source.valueKey]) > 0) initial.add(source.key);
    }
    return initial;
  });

  const toggleDemandSource = (source: DemandSourceSpec) => {
    setAddedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source.key)) {
        next.delete(source.key);
        // Removing a source clears its count too - a collapsed source
        // must actually stop counting toward the demand ceiling, not just
        // hide while still contributing a stale number underneath.
        onChangeValue(source.valueKey, 0);
      } else {
        next.add(source.key);
      }
      return next;
    });
  };

  const presetLines = lineOptions("access", setting);
  const selectedLines = asLines(values.accessLines);
  const enterprise = asNum(values.accessEnterprise) === 1;
  const totalProviders = Math.max(0, Math.round(baseline.providers ?? 0));
  // Under Enterprise, default the requested count to every Starting-point
  // provider as a convenience - NOT a lock. Enterprise means "not broken out
  // by a specific service line," not "every single provider is in scope";
  // a partner running access enterprise-wide across a subset of providers
  // is a real, valid case this field has to allow.
  const requestedProviders = enterprise && asNum(values.accessProviders) <= 0
    ? totalProviders
    : asNum(values.accessProviders);

  const chain = computeAccessChain(baseline, values, crossGoalShareMultiplier);
  const { scope, capacity, demand, payoff, formulas } = chain;
  const realizedPayoffValue = realizedValue(payoff.value, realizationPct);
  const payoffFormulaDisplay = payoff.value > 0
    ? formulaWithRealization(formulas.payoff, realizationPct, realizedPayoffValue)
    : formulas.payoff;

  const activeLines = !enterprise && selectedLines.length > 0 ? selectedLines : [];

  const toggleLine = (line: string) => {
    const next = selectedLines.includes(line) ? selectedLines.filter((l) => l !== line) : [...selectedLines, line];
    onChangeValue("accessLines", next);
  };

  const addCustomLine = () => {
    const trimmed = customLineDraft.trim();
    if (!trimmed || selectedLines.includes(trimmed)) return;
    onChangeValue("accessLines", [...selectedLines, trimmed]);
    setCustomLineDraft("");
  };

  const removeLine = (line: string) => onChangeValue("accessLines", selectedLines.filter((l) => l !== line));

  return (
    <div data-testid="section-attain-access-chain">
      <DecisionCard
        step="D1"
        title="Who you point at access"
        help="Committing a line and a provider count puts real capacity in scope. There's no dollar figure yet, margin and volume come next."
        testid="card-access-d1"
      >
        {/* Enterprise sits right in the line-selection row, as the
            not-broken-out-by-line alternative to picking specific lines -
            not floating off beside the Add button, where it read as an
            unrelated setting. */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {presetLines.map((line) => {
            const active = selectedLines.includes(line);
            return (
              <button
                key={line}
                type="button"
                disabled={enterprise}
                onClick={() => toggleLine(line)}
                className={`px-3 py-2 rounded-md text-sm border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
                }`}
                data-testid={`chip-access-line-${line.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {line}
              </button>
            );
          })}
          {selectedLines.filter((l) => !presetLines.includes(l)).map((line) => (
            <button
              key={line}
              type="button"
              disabled={enterprise}
              onClick={() => removeLine(line)}
              className="px-3 py-2 rounded-md text-sm border border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium disabled:opacity-40"
              data-testid={`chip-access-line-custom-${line.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {line} ×
            </button>
          ))}
          <span className="text-xs text-[#B4B4B4] px-1">or,</span>
          <label
            className={`flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-md text-sm border transition-all cursor-pointer ${
              enterprise ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
            }`}
          >
            <Switch
              checked={enterprise}
              onCheckedChange={(checked) => onChangeValue("accessEnterprise", checked ? 1 : 0)}
              className="data-[state=checked]:bg-[#EA2C00]"
              data-testid="switch-access-enterprise"
            />
            enterprise-wide (all providers)
          </label>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            value={customLineDraft}
            onChange={(e) => setCustomLineDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomLine()}
            disabled={enterprise}
            placeholder="Add a custom line"
            className="h-9 px-3 rounded-md border border-[#E5E5E5] text-sm w-[200px] disabled:opacity-40 disabled:bg-[#F5F0EB]"
            data-testid="input-access-custom-line"
          />
          <button
            type="button"
            onClick={addCustomLine}
            disabled={enterprise || !customLineDraft.trim()}
            className="h-9 px-3 rounded-md text-xs font-semibold text-white bg-[#1A1A1A] disabled:opacity-30"
            data-testid="button-access-add-custom-line"
          >
            Add
          </button>
        </div>

        <div className="mb-4 max-w-[280px]">
          <label className="text-sm font-medium text-[#3A3A3A] mb-2 block" htmlFor="access-providers">
            How many providers focus on access
          </label>
          <NumberField
            id="access-providers"
            value={requestedProviders}
            onValueChange={(v) => onChangeValue("accessProviders", v)}
            min={0}
            max={totalProviders || undefined}
            decimal={false}
            className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
            placeholder={totalProviders > 0 ? `e.g., up to ${totalProviders}` : "e.g., 20"}
            data-testid="input-access-providers"
          />
          <p className="text-[11px] text-[#8C8C8C] mt-1">
            {enterprise
              ? `Defaults to all ${totalProviders.toLocaleString()} providers under Enterprise, but you can lower this to a subset, capped at your Starting-point count. Enterprise means not broken out by a specific service line, not every provider.`
              : `Capped at your Starting-point count${totalProviders > 0 ? ` of ${totalProviders.toLocaleString()}` : ""}.`}
          </p>
        </div>

        <CountOutput
          label="In scope for access"
          value={fmtInt(scope.providersInScope)}
          unit="providers"
          testid="text-access-d1-output"
        />
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="What a visit is worth"
        help="Contribution margin, not charges. Cardiology and primary care are not worth the same visit, so price each line you selected on its own. Still no dollar total, volume comes next."
        testid="card-access-d2"
      >
        {activeLines.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeLines.map((line) => (
              <div key={line}>
                <label className="text-sm font-medium text-[#3A3A3A] mb-2 block">{line}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
                  <NumberField
                    value={marginPerVisitFor(line, values)}
                    onValueChange={(v) => onChangeValue(`accessMarginLine__${line}`, v)}
                    min={0}
                    decimal={false}
                    className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
                    data-testid={`input-access-margin-${line.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/visit</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-[240px]">
            <FieldLabel
              tip="Revenue minus the variable cost of delivering the visit, not gross charges. This is what one extra visit is actually worth to the bottom line."
              testid="tooltip-access-margin-blended"
            >
              Blended margin per visit
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
              <NumberField
                value={blendedMarginPerVisit(values)}
                onValueChange={(v) => onChangeValue("accessMargin", v)}
                min={0}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
                data-testid="input-access-margin-blended"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/visit</span>
            </div>
            <p className="text-[11px] text-[#8C8C8C] mt-1">
              {enterprise ? "Enterprise uses one blended rate across every line." : "Pick a line above in D1 to price it individually."}
            </p>
          </div>
        )}
      </DecisionCard>

      <DecisionCard
        step="D3"
        title="Convert freed time to capacity"
        help="Freed documentation time is the only thing that creates new capacity here. A share of it is committed to the schedule; the rest stays protected relief. Output is in visits, still no dollars."
        testid="card-access-d3"
      >
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-10 mb-4">
          <div className="flex gap-4 shrink-0">
            <div className="w-[150px]">
              <FieldLabel
                tip="A planning assumption for this priority, not yet a measured result. Benchmark: ambient typically saves ~2 to 4 minutes per note - start conservative and raise it once you have your own results."
                testid="tooltip-access-minutes-saved"
              >
                Target: minutes saved per note
              </FieldLabel>
              <NumberField
                value={asNum(values.accessMinutesSaved) > 0 ? asNum(values.accessMinutesSaved) : DEFAULT_MINUTES_SAVED_PER_NOTE}
                onValueChange={(v) => onChangeValue("accessMinutesSaved", v)}
                min={0}
                max={60}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
                data-testid="input-access-minutes-saved"
              />
            </div>
            <div className="w-[170px]">
              <FieldLabel
                tip="The average length of one visit, in minutes. A shorter visit converts the same freed hours into more visits, so this directly sets how the freed time turns into capacity."
                testid="tooltip-access-visit-length"
              >
                Average visit length (minutes)
              </FieldLabel>
              <NumberField
                value={asNum(values.accessVisitLength) > 0 ? asNum(values.accessVisitLength) : DEFAULT_VISIT_LENGTH_MIN}
                onValueChange={(v) => onChangeValue("accessVisitLength", v)}
                min={1}
                max={180}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
                data-testid="input-access-visit-length"
              />
            </div>
          </div>

          {/* The slider that actually converts freed time into capacity gets
              the rest of the row - previously it sat in its own full-width
              block below the two compact inputs, leaving a wide dead gap to
              their right. Giving it flex-1 here uses that same width instead
              of stacking everything hard-left. */}
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
                Share of freed time directed to access (vs relief)
                <InfoTip
                  text="The portion of the time Abridge frees up that gets committed to opening new appointment slots, instead of staying as protected relief for the provider. This is the one decision that turns freed time into capacity."
                  testid="tooltip-access-freed-share"
                />
              </span>
              <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-access-freed-share-value">
                {Math.round(asNum(values.accessFreedShare))}%
              </span>
            </div>
            <Slider
              value={[asNum(values.accessFreedShare)]}
              onValueChange={(v) => onChangeValue("accessFreedShare", v[0])}
              min={0}
              max={100}
              step={5}
              accent="coral"
              className="w-full"
              data-testid="slider-access-freed-share"
            />
          </div>
        </div>

        <CountOutput
          label="New visit capacity"
          value={fmtInt(capacity.capacityVisits)}
          unit="visits/yr"
          testid="text-access-d3-output"
        />
        <MathBox formula={formulas.capacity} testid="text-access-d3-formula" />
        <p className="text-[11px] text-[#8C8C8C] mt-2">
          Visits priced at a ~{capacity.visitLengthMinutes} minute visit length. There is no second capacity
          mechanism, freed time is the only source.
        </p>
      </DecisionCard>

      <DecisionCard
        step="D4"
        title="Where the demand comes from"
        help="Demand is a ceiling, not a percent. Every source below is a real, countable number of patients per year (backlog counts once, the rest are annual). Add only the ones you actually have - filling in all four, one, or none is equally valid."
        testid="card-access-d4"
      >
        <div className="rounded-lg border border-[#E7E0D6] divide-y divide-[#E7E0D6] overflow-hidden mb-5">
          {DEMAND_SOURCES.map((source) => {
            const added = addedSources.has(source.key);
            return (
              <div key={source.key} className="p-4" data-testid={`row-access-demand-${source.testid}`}>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <Switch
                      checked={added}
                      onCheckedChange={() => toggleDemandSource(source)}
                      className="data-[state=checked]:bg-[#EA2C00]"
                      data-testid={`switch-access-demand-${source.testid}`}
                    />
                    <span className="text-sm font-medium text-[#1A1A1A]">{source.label}</span>
                    <InfoTip text={source.tip} testid={`tooltip-access-demand-${source.testid}`} />
                  </label>
                  {!added && <span className="text-xs text-[#B4B4B4]">Not used</span>}
                </div>

                {added && source.key !== "noShow" && (
                  <div className="mt-3 pl-[42px] flex items-center gap-3">
                    <NumberField
                      value={asNum(values[source.valueKey])}
                      onValueChange={(v) => onChangeValue(source.valueKey, v)}
                      min={0}
                      decimal={false}
                      placeholder="0"
                      className="h-10 w-[150px] rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
                      data-testid={`input-access-demand-${source.testid}`}
                    />
                    <span className="text-xs text-[#8C8C8C]">{source.unitLabel}</span>
                  </div>
                )}

                {added && source.key === "noShow" && (
                  <div className="mt-3 pl-[42px]">
                    <div className="flex items-center gap-3 mb-2">
                      <NumberField
                        value={asNum(values.accessDemandNoShowCount)}
                        onValueChange={(v) => onChangeValue("accessDemandNoShowCount", v)}
                        min={0}
                        decimal={false}
                        placeholder="0"
                        className="h-10 w-[150px] rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
                        data-testid="input-access-demand-noshow"
                      />
                      <span className="text-xs text-[#8C8C8C]">{source.unitLabel}</span>
                    </div>
                    <details className="group max-w-[440px]">
                      <summary className="text-xs text-[#8C8C8C] cursor-pointer hover:text-[#3A3A3A] select-none list-none flex items-center gap-1">
                        <span className="inline-block transition-transform group-open:rotate-90">›</span>
                        Estimate from your no-show rate instead
                      </summary>
                      <div className="mt-2 flex flex-wrap items-end gap-3 bg-[#F8F5F1] rounded-md border border-[#E7E0D6] p-3">
                        <div className="w-[110px]">
                          <label className="text-[11px] text-[#8C8C8C] block mb-1">Typical no-show rate</label>
                          <div className="relative">
                            <NumberField
                              value={asNum(values.accessDemandNoShowRate) > 0 ? asNum(values.accessDemandNoShowRate) : DEFAULT_NO_SHOW_RATE_PCT}
                              onValueChange={(v) => onChangeValue("accessDemandNoShowRate", v)}
                              min={0}
                              max={100}
                              decimal={false}
                              className="h-9 w-full rounded-md border border-[#E5E5E5] bg-white px-2 pr-6 text-sm"
                              data-testid="input-access-demand-noshow-rate"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">%</span>
                          </div>
                        </div>
                        <div className="w-[110px]">
                          <label className="text-[11px] text-[#8C8C8C] block mb-1">Recoverable share</label>
                          <div className="relative">
                            <NumberField
                              value={asNum(values.accessDemandNoShowPct)}
                              onValueChange={(v) => onChangeValue("accessDemandNoShowPct", v)}
                              min={0}
                              max={100}
                              decimal={false}
                              className="h-9 w-full rounded-md border border-[#E5E5E5] bg-white px-2 pr-6 text-sm"
                              data-testid="input-access-demand-noshow-recovery"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">%</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onChangeValue("accessDemandNoShowCount", demand.noShowHelperEstimate)}
                          disabled={demand.noShowHelperEstimate <= 0}
                          className="h-9 px-3 rounded-md text-xs font-semibold text-white bg-[#1A1A1A] disabled:opacity-30 whitespace-nowrap"
                          data-testid="button-access-demand-noshow-use-estimate"
                        >
                          Use estimate: {fmtInt(demand.noShowHelperEstimate)}/yr
                        </button>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-lg bg-[#F8F5F1] p-4" data-testid="panel-access-d4-result">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-3">The result</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <ResultStat
              label="Capacity you created"
              hint="From D3"
              value={fmtInt(capacity.capacityVisits)}
              unit="visits/yr"
              testid="text-access-d4-capacity"
            />
            <ResultStat
              label="Demand available to fill it"
              hint="Backlog counted once, the rest per year"
              value={fmtInt(demand.demandCeiling)}
              unit="visits"
              testid="text-access-d4-demand-output"
            />
            <ResultStat
              label="Realized visits"
              hint="The smaller of the two"
              value={fmtInt(payoff.realizedVisits)}
              unit="visits/yr"
              emphasize
              testid="text-access-d4-realized-output"
            />
          </div>
          <p className="text-[13.5px] text-[#1A1A1A] font-semibold flex items-center gap-1.5" data-testid="text-access-d4-binding">
            {bindingPlainPhrase(payoff.binding)}
            <InfoTip
              text="Realized visits can never be more than either side. An open slot with nobody to fill it is worth nothing, and demand your schedule cannot yet absorb doesn't turn into a visit either - whichever number above is smaller sets the ceiling."
              testid="tooltip-access-d4-binding"
            />
          </p>
        </div>
        <MathBox formula={formulas.demand} testid="text-access-d4-formula" />
      </DecisionCard>

      {/* D5 used to be a full-bleed dark hero card - the exact dollar the
          side panel's "Plan so far" already shows, stranded at the bottom
          of the page. It's now a quiet inline line, same card shell as
          D1-D4, so the panel stays the one place that total actually
          lives. */}
      <DecisionCard
        step="D5"
        title="The payoff"
        help="Realized visits x margin per visit, the first dollar figure in this chain, derived from the four decisions above. Already counted in the running total in the panel to the right."
        testid="card-access-d5"
      >
        <p className="text-[15px] text-[#1A1A1A]" data-testid="text-access-d5-caption">
          <span className="font-abridge text-2xl text-[#EA2C00] font-bold" data-testid="text-access-d5-value">
            {fmtMoneyCompact(realizedPayoffValue)}
          </span>{" "}
          from {fmtInt(payoff.realizedVisits)} realized visits x ~${fmtInt(payoff.blendedMarginUsed)}/visit
        </p>
        <MathBox formula={payoffFormulaDisplay} testid="text-access-d5-formula" />
      </DecisionCard>
    </div>
  );
}
