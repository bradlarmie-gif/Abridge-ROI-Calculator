import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;
type RetentionScenario = 'conservative' | 'typical' | 'optimistic';

export default function NursingRetentionCalc({ state, updateTimeDriverInputs }: Props) {
  const { timeDriverInputs } = state;

  const nursingRetentionImpactRates: Record<RetentionScenario, number> = {
    conservative: 10,
    typical: 15,
    optimistic: 25,
  };

  const calc = useMemo(() => {
    const nurses = state.numberOfProviders;
    const leavingPerYear = nurses * (timeDriverInputs.nursingTurnoverRate / 100);
    const burnoutDepartures = leavingPerYear * 0.40;
    const impactRate = nursingRetentionImpactRates[timeDriverInputs.retentionImpactScenario] / 100;
    const retained = burnoutDepartures * impactRate;
    const value = Math.round(retained * timeDriverInputs.nursingReplacementCost);
    return { leavingPerYear, burnoutDepartures, retained, value };
  }, [
    state.numberOfProviders,
    timeDriverInputs.nursingTurnoverRate,
    timeDriverInputs.nursingReplacementCost,
    timeDriverInputs.retentionImpactScenario,
  ]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();

  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Logic</p>
      <p className="text-sm text-black mb-3">
        Documentation burden is a leading contributor to nurse burnout and turnover.
        Of nurses who leave, roughly 40% cite burnout-related reasons. Reducing charting time directly addresses this driver.
      </p>
      <p className="text-sm text-[#666666] mb-6">
        Reclaimed documentation time reduces end-of-shift pressure — the primary mechanism behind burnout reduction.
        Less charting burden means less burnout-driven turnover.
      </p>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Organization</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">Annual turnover rate</label>
          <div className="relative">
            <FormattedNumberInput
              value={timeDriverInputs.nursingTurnoverRate}
              onChange={(v: number) => updateTimeDriverInputs({ nursingTurnoverRate: v })}
              className="h-12 bg-white pr-8"
              data-testid="input-nursing-turnover-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#888888]">National average: 18-22%</p>
        </div>
        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">Replacement cost per nurse</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={timeDriverInputs.nursingReplacementCost}
              onChange={(v: number) => updateTimeDriverInputs({ nursingReplacementCost: v })}
              className="h-12 bg-white pl-7"
              data-testid="input-nursing-replacement-cost"
            />
          </div>
          <p className="text-xs text-[#888888]">Includes recruiting, training, onboarding</p>
        </div>
      </div>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Abridge Impact on Retention</p>
      <p className="text-sm text-[#888888] mb-3">How much could reducing documentation burden impact burnout-driven departures?</p>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {([
          { label: 'Conservative', value: 'conservative' as RetentionScenario, pct: 10 },
          { label: 'Typical', value: 'typical' as RetentionScenario, pct: 15 },
          { label: 'Optimistic', value: 'optimistic' as RetentionScenario, pct: 25 },
        ]).map((preset) => (
          <button
            key={preset.value}
            onClick={() => updateTimeDriverInputs({ retentionImpactScenario: preset.value })}
            className={`py-3 px-2 rounded-lg border-2 text-center transition-all ${
              timeDriverInputs.retentionImpactScenario === preset.value
                ? 'border-[#EA2C00] bg-[#F5F0EB]'
                : 'border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]'
            }`}
            data-testid={`button-nursing-retention-${preset.value}`}
          >
            <span className="block text-xs font-semibold text-black">{preset.label}</span>
            <span className="block text-xs text-[#888888]">{preset.pct}% impact</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-[#888888] mb-6">
        Applied to the 40% of departures that are burnout-related.
      </p>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666] min-w-0">{state.numberOfProviders} nurses × {timeDriverInputs.nursingTurnoverRate}% turnover</span>
            <span className="font-semibold text-black">{calc.leavingPerYear.toFixed(1)} leaving/year</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666] min-w-0">× 40% burnout-related</span>
            <span className="font-semibold text-black">{calc.burnoutDepartures.toFixed(1)} burnout departures</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666] min-w-0">× {nursingRetentionImpactRates[timeDriverInputs.retentionImpactScenario]}% Abridge impact</span>
            <span className="font-semibold text-black">{calc.retained.toFixed(2)} nurses retained</span>
          </div>
          <div className="h-px bg-[#E5E5E5] my-2" />
          <div className="flex justify-between gap-2">
            <span className="text-[#666666] min-w-0">× Replacement cost</span>
            <span className="font-semibold text-black">{formatCurrency(timeDriverInputs.nursingReplacementCost)}</span>
          </div>
          <div className="h-px bg-[#E5E5E5] my-2" />
          <div className="flex justify-between gap-2">
            <span className="text-[#666666] font-medium">Annual Retention Savings</span>
            <span className="font-bold text-[#EA2C00] flex-shrink-0" data-testid="text-nursing-retention-value">{formatCurrency(calc.value)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
