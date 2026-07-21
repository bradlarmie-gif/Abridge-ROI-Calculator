import { useState } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "@/components/NumberField";
import { lineOptions, type LeverValues } from "@/lib/attain/attainLevers";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeAccessChain,
  marginPerVisitFor,
  blendedMarginPerVisit,
  DEFAULT_MINUTES_SAVED_PER_NOTE,
  ACCESS_VISIT_LENGTH_MIN,
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

interface AccessDecisionChainProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
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

/** A quiet, count-only output row - visits or providers, NEVER a dollar
 * figure. D1-D4 all use this; D5 is the one place a dollar appears. */
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
 * Build the case, ACCESS - a bespoke ordered decision chain, not the
 * generic flat lever renderer every other goal still uses. Money is
 * volume x margin, and volume itself is MIN(capacity, demand), so no
 * dollar figure can exist until scope (D1), margin (D2), capacity (D3),
 * AND demand (D4) are all real - D1-D4 below show visits and providers,
 * never a dollar. D5 is the one place a dollar first appears, derived from
 * the other four, never invented.
 */
export default function AccessDecisionChain({ setting, baseline, values, onChangeValue }: AccessDecisionChainProps) {
  const [customLineDraft, setCustomLineDraft] = useState("");

  const presetLines = lineOptions("access", setting);
  const selectedLines = asLines(values.accessLines);
  const enterprise = asNum(values.accessEnterprise) === 1;
  const totalProviders = Math.max(0, Math.round(baseline.providers ?? 0));
  const requestedProviders = asNum(values.accessProviders);

  const chain = computeAccessChain(baseline, values);
  const { scope, capacity, demand, payoff, formulas } = chain;

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

  const bindingLabel =
    payoff.binding === "capacity"
      ? "Capacity-limited: your schedule can offer more than your demand sources can fill."
      : payoff.binding === "demand"
        ? "Demand-limited: demand outstrips the capacity you have converted so far."
        : "Set both capacity and demand to see which one is the ceiling.";

  return (
    <div data-testid="section-attain-access-chain">
      <DecisionCard
        step="D1"
        title="Who you point at access"
        help="Committing a line and a provider count puts real capacity in scope. No dollar figure yet, there is no margin or volume decided."
        testid="card-access-d1"
      >
        <div className="flex flex-wrap gap-2 mb-3">
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

          <div className="flex-1" />

          <label className="flex items-center gap-2 text-xs font-medium text-[#3A3A3A] cursor-pointer">
            <Switch
              checked={enterprise}
              onCheckedChange={(checked) => onChangeValue("accessEnterprise", checked ? 1 : 0)}
              className="data-[state=checked]:bg-[#EA2C00]"
              data-testid="switch-access-enterprise"
            />
            Enterprise (all, non-specific)
          </label>
        </div>

        <div className="mb-4 max-w-[280px]">
          <label className="text-xs font-medium text-[#3A3A3A] mb-1.5 block" htmlFor="access-providers">
            How many providers focus on access
          </label>
          {enterprise ? (
            <div className="h-11 rounded-md border border-[#E5E5E5] bg-[#F5F0EB] px-3 flex items-center text-sm text-[#8C8C8C]">
              All {totalProviders.toLocaleString()} providers (Enterprise)
            </div>
          ) : (
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
          )}
          <p className="text-[10px] text-[#8C8C8C] mt-1">
            Capped at your Starting-point count{totalProviders > 0 ? ` of ${totalProviders.toLocaleString()}` : ""}.
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
        help="Contribution margin, not charges. Cardiology and primary care are not worth the same visit, so price each line you selected on its own. Still no dollar total, there is no volume yet."
        testid="card-access-d2"
      >
        {activeLines.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeLines.map((line) => (
              <div key={line}>
                <label className="text-xs font-medium text-[#3A3A3A] mb-1.5 block">{line}</label>
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
            <label className="text-xs font-medium text-[#3A3A3A] mb-1.5 block">Blended margin per visit</label>
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
            <p className="text-[10px] text-[#8C8C8C] mt-1">
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
        <div className="flex flex-wrap gap-6 mb-4">
          <div className="w-[160px]">
            <label className="text-xs font-medium text-[#3A3A3A] mb-1.5 block">Minutes saved per note</label>
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
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8C8C8C]">Share of freed time directed to access (vs relief)</span>
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

        <CountOutput
          label="New visit capacity"
          value={fmtInt(capacity.capacityVisits)}
          unit="visits/yr"
          testid="text-access-d3-output"
        />
        <MathBox formula={formulas.capacity} testid="text-access-d3-formula" />
        <p className="text-[10px] text-[#8C8C8C] mt-2">
          Visits priced at a ~{ACCESS_VISIT_LENGTH_MIN} minute visit length. There is no second capacity mechanism,
          freed time is the only source.
        </p>
      </DecisionCard>

      <DecisionCard
        step="D4"
        title="Where the demand comes from"
        help="Demand is a ceiling, not a percent. An open slot with nobody to fill it is worth nothing, so every source below is a real, countable patient, not a rate applied to capacity."
        testid="card-access-d4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-[#3A3A3A] mb-1.5 block">Referral backlog (patients waiting)</label>
            <NumberField
              value={asNum(values.accessDemandBacklog)}
              onValueChange={(v) => onChangeValue("accessDemandBacklog", v)}
              min={0}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              data-testid="input-access-demand-backlog"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#3A3A3A] mb-1.5 block">New referrals per month</label>
            <NumberField
              value={asNum(values.accessDemandNewReferrals)}
              onValueChange={(v) => onChangeValue("accessDemandNewReferrals", v)}
              min={0}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              data-testid="input-access-demand-new-referrals"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#3A3A3A] mb-1.5 block">Same-day / urgent demand</label>
            <div className="relative">
              <NumberField
                value={asNum(values.accessDemandSameDayPct)}
                onValueChange={(v) => onChangeValue("accessDemandSameDayPct", v)}
                min={0}
                max={100}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
                data-testid="input-access-demand-sameday"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#3A3A3A] mb-1.5 block">No-show recovery</label>
            <div className="relative">
              <NumberField
                value={asNum(values.accessDemandNoShowPct)}
                onValueChange={(v) => onChangeValue("accessDemandNoShowPct", v)}
                min={0}
                max={100}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
                data-testid="input-access-demand-noshow"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
            </div>
          </div>
        </div>

        <CountOutput
          label="Demand ceiling"
          value={fmtInt(demand.demandCeiling)}
          unit="visits/yr"
          testid="text-access-d4-demand-output"
        />
        <div className="mt-3">
          <CountOutput
            label="Realized new visits = MIN(capacity, demand)"
            value={fmtInt(payoff.realizedVisits)}
            unit="visits/yr"
            testid="text-access-d4-realized-output"
          />
        </div>
        <p className="text-[11px] text-[#3A3A3A] mt-2 font-medium" data-testid="text-access-d4-binding">
          {bindingLabel}
        </p>
        <MathBox formula={formulas.demand} testid="text-access-d4-formula" />
      </DecisionCard>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-[#1A1A1A] p-6"
        data-testid="card-access-d5"
      >
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-1.5">D5</p>
        <h3 className="text-base font-bold text-white mb-1.5 font-abridge">The payoff</h3>
        <p className="text-xs text-white/50 leading-relaxed mb-4 max-w-[560px]">
          Realized visits x margin per visit. This is the first dollar figure in this chain, derived from the four
          decisions above, never invented.
        </p>
        <p className="font-abridge text-4xl text-[#EA2C00]" data-testid="text-access-d5-value">
          {fmtMoneyCompact(payoff.value)}
        </p>
        <p className="text-xs text-white/60 mt-2">
          {fmtInt(payoff.realizedVisits)} realized visits x ~${fmtInt(payoff.blendedMarginUsed)}/visit
        </p>
        <div className="mt-4 bg-white/5 border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
          <p className="text-[11px] text-white/70 leading-relaxed" data-testid="text-access-d5-formula">
            {formulas.payoff}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
