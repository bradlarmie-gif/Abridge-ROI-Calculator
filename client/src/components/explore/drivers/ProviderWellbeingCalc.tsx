import { useState, useMemo } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;
type RetentionScenario = 'conservative' | 'typical' | 'optimistic' | 'custom';

export default function ProviderWellbeingCalc({ state, updateTimeDriverInputs, totalHoursSaved }: Props) {
  const { timeDriverInputs } = state;
  const [customMode, setCustomMode] = useState(timeDriverInputs.retentionImpactScenario === 'custom');
  const [customDisplay, setCustomDisplay] = useState(String(timeDriverInputs.retentionCustomPercent ?? 10));

  const retentionScenarios: Record<RetentionScenario, number> = {
    conservative: 5,
    typical: 10,
    optimistic: 15,
    custom: timeDriverInputs.retentionCustomPercent ?? 10,
  };

  const hoursPerProviderPerWeek = state.numberOfProviders > 0
    ? (totalHoursSaved / state.numberOfProviders / 48).toFixed(1)
    : '0';

  const retentionCalcs = useMemo(() => {
    const providers = state.numberOfProviders;
    const turnoverRate = timeDriverInputs.annualTurnoverRate / 100;
    const burnoutRate = timeDriverInputs.burnoutRelatedTurnover / 100;
    const impactRate = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
    const replacementCost = timeDriverInputs.replacementCost;

    const providersLeavingPerYear = providers * turnoverRate;
    const burnoutRelatedDepartures = providersLeavingPerYear * burnoutRate;
    const providersRetained = burnoutRelatedDepartures * impactRate;
    const retentionValue = providersRetained * replacementCost;

    return {
      providersLeavingPerYear,
      burnoutRelatedDepartures,
      providersRetained,
      retentionValue: Math.round(retentionValue),
    };
  }, [
    state.numberOfProviders,
    timeDriverInputs.annualTurnoverRate,
    timeDriverInputs.burnoutRelatedTurnover,
    timeDriverInputs.retentionImpactScenario,
    timeDriverInputs.replacementCost,
    timeDriverInputs.retentionCustomPercent,
  ]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-sm text-[#888888] mb-3">Your providers would get back:</p>

      <div className="text-center mb-4">
        <p className="text-3xl font-bold text-[#EA2C00]" data-testid="text-wellbeing-hours-per-week">{hoursPerProviderPerWeek} hours per week</p>
        <p className="text-sm text-[#888888]">per provider</p>
      </div>

      <div className="h-px bg-[#E5E5E5] my-4" />

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
        The Retention Case
      </p>

      <p className="text-sm text-[#666666] leading-relaxed mb-4">
        The problem isn't that documentation is hard — it's when it happens. In EHR-heavy environments, charting gets pushed after the patient leaves, reconstructed from memory at the end of a shift or at home late at night. Physicians call it "pajama time." It's not just a workload problem, it's a boundary problem — the work never ends because the chart is always waiting. That's the specific mechanism that makes documentation burden a burnout driver, not just a nuisance.
      </p>

      <div className="h-px bg-[#E5E5E5] my-4" />

      <button
        onClick={() => updateTimeDriverInputs({ calculateRetentionValue: !timeDriverInputs.calculateRetentionValue })}
        className="flex items-center gap-3 text-sm text-black hover:text-[#EA2C00] transition-colors mb-4"
        data-testid="checkbox-calculate-retention"
      >
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          timeDriverInputs.calculateRetentionValue
            ? 'bg-[#EA2C00] border-[#EA2C00]'
            : 'border-[#D1D5DB] bg-white'
        }`}>
          {timeDriverInputs.calculateRetentionValue && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
        Calculate retention value
      </button>

      {timeDriverInputs.calculateRetentionValue && (
        <div>
          <div className="h-px bg-[#E5E5E5] mb-6" />

          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Your Organization
          </p>

          <div className="mb-4">
            <label className="text-sm text-black mb-1.5 block">Annual provider turnover rate</label>
            <div className="relative">
              <FormattedNumberInput
                value={timeDriverInputs.annualTurnoverRate}
                onChange={(v: number) => updateTimeDriverInputs({ annualTurnoverRate: v })}
                className="h-12 bg-white pr-8"
                data-testid="input-turnover-rate"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
            </div>
            <p className="text-xs text-[#888888] italic mt-1">Industry average: 6-7%</p>
          </div>

          <div className="mb-4">
            <label className="text-sm text-black mb-1.5 block">Turnover related to burnout</label>
            <div className="relative">
              <FormattedNumberInput
                value={timeDriverInputs.burnoutRelatedTurnover}
                onChange={(v: number) => updateTimeDriverInputs({ burnoutRelatedTurnover: v })}
                className="h-12 bg-white pr-8"
                data-testid="input-burnout-turnover"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
            </div>
            <p className="text-xs text-[#888888] italic mt-1">Research suggests 30-50% of physician turnover is burnout-related</p>
          </div>

          <div className="mb-4">
            <label className="text-sm text-black mb-1.5 block">Cost to replace one provider</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={timeDriverInputs.replacementCost}
                onChange={(v: number) => updateTimeDriverInputs({ replacementCost: v })}
                className="h-12 bg-white pl-7"
                data-testid="input-replacement-cost"
              />
            </div>
            <p className="text-xs text-[#888888] italic mt-1">Estimated cost to replace a departing provider. Industry estimates range from $300K–$1M depending on specialty. Default is $400K (conservative midpoint).</p>
          </div>

          <div className="h-px bg-[#E5E5E5] my-4" />

          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
            Abridge Impact
          </p>

          <p className="text-sm text-black mb-3">
            What percentage of burnout-related turnover could Abridge help prevent?
          </p>

          <div className="flex gap-2 mb-4">
            {([
              { label: 'Conservative', value: 'conservative' as const, pct: 5 },
              { label: 'Typical', value: 'typical' as const, pct: 10 },
              { label: 'Optimistic', value: 'optimistic' as const, pct: 15 },
            ]).map((preset) => (
              <button
                key={preset.value}
                onClick={() => {
                  setCustomMode(false);
                  updateTimeDriverInputs({ retentionImpactScenario: preset.value });
                }}
                className={`flex-1 py-2 px-2 rounded-lg text-xs transition-all ${
                  !customMode && timeDriverInputs.retentionImpactScenario === preset.value
                    ? 'bg-[#EA2C00] text-white'
                    : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
                }`}
                data-testid={`button-scenario-${preset.value}`}
              >
                <span className="font-medium">{preset.label}</span>
                <span className="block text-[10px] mt-0.5 opacity-80">{preset.pct}%</span>
              </button>
            ))}
            <button
              onClick={() => {
                setCustomMode(true);
                updateTimeDriverInputs({ retentionImpactScenario: 'custom' });
              }}
              className={`flex-1 py-2 px-2 rounded-lg text-xs transition-all ${
                customMode ? 'bg-[#EA2C00] text-white' : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
              }`}
              data-testid="button-scenario-custom"
            >
              <span className="font-medium">Custom</span>
            </button>
          </div>

          {customMode && (
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-[#666666] flex-shrink-0">Retention impact</label>
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={customDisplay}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setCustomDisplay(raw);
                    const n = parseInt(raw);
                    if (!isNaN(n) && n >= 1 && n <= 100) {
                      updateTimeDriverInputs({ retentionCustomPercent: n, retentionImpactScenario: 'custom' });
                    }
                  }}
                  onBlur={() => {
                    const n = parseInt(customDisplay);
                    if (isNaN(n) || n < 1) {
                      updateTimeDriverInputs({ retentionCustomPercent: 10, retentionImpactScenario: 'custom' });
                      setCustomDisplay('10');
                    } else {
                      const clamped = Math.min(100, n);
                      updateTimeDriverInputs({ retentionCustomPercent: clamped, retentionImpactScenario: 'custom' });
                      setCustomDisplay(String(clamped));
                    }
                  }}
                  className="w-full h-10 bg-white border border-[#E5E5E5] rounded-lg px-3 pr-8 text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                  autoFocus
                  data-testid="input-retention-custom"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
              </div>
            </div>
          )}

          <div className="text-[13px] text-[#666666] leading-relaxed space-y-2 mt-4">
            <p><strong>Conservative (5%):</strong> Documentation burden is one of several burnout factors. Modest impact on departure decisions.</p>
            <p><strong>Typical (10%):</strong> Documentation relief is a meaningful contributor in an org with high admin burden and strong Abridge adoption.</p>
            <p><strong>Optimistic (15%):</strong> High documentation burden is a primary stated reason for departures. Validate with exit interview data.</p>
            <p className="text-xs text-[#AAAAAA] mt-2 italic">These rates represent Abridge{"'"}s estimated contribution to burnout-related departure prevention {"—"} not total retention program impact.</p>
          </div>

          <div className="h-px bg-[#E5E5E5] my-4" />

          <div className="bg-[#F5F0EB] rounded-lg p-4">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
              Calculation
            </p>

            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">Providers</span>
                <span className="text-black">{formatNumber(state.numberOfProviders)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">× Annual turnover rate</span>
                <span className="text-black">{timeDriverInputs.annualTurnoverRate}%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">= Providers leaving per year</span>
                <span className="text-black">{retentionCalcs.providersLeavingPerYear.toFixed(1)}</span>
              </div>
              <div className="h-px bg-[#E5E5E5] my-2" />
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">× Burnout-related turnover</span>
                <span className="text-black">{timeDriverInputs.burnoutRelatedTurnover}%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">= Burnout-related departures</span>
                <span className="text-black">{retentionCalcs.burnoutRelatedDepartures.toFixed(2)}</span>
              </div>
              <div className="h-px bg-[#E5E5E5] my-2" />
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">× Abridge retention impact</span>
                <span className="text-black">{retentionScenarios[timeDriverInputs.retentionImpactScenario]}%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">= Providers retained</span>
                <span className="text-black">{retentionCalcs.providersRetained.toFixed(2)}</span>
              </div>
              <div className="h-px bg-[#E5E5E5] my-2" />
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">× Replacement cost</span>
                <span className="text-black">{formatCurrency(timeDriverInputs.replacementCost)}</span>
              </div>
              <div className="h-px bg-[#888888] my-2" />
              <div className="flex justify-between gap-2 font-semibold">
                <span className="text-black">= Retention value</span>
                <span className="text-[#EA2C00] flex-shrink-0" data-testid="text-wellbeing-retention-value">{formatCurrency(retentionCalcs.retentionValue)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 mt-4 text-xs text-[#888888] italic">
              <AlertTriangle className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-0.5" />
              <span>This assumes Abridge meaningfully reduces documentation burden for providers at risk of leaving due to burnout.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
