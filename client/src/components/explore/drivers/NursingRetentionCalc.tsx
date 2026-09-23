import { useState, useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { nursingRetentionRates, NURSING_RETENTION_SCENARIOS } from "@/lib/retentionScenarios";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";
import { driverScaleReadiness } from "@/lib/exploreScaleGate";

type Props = ExploreCalcComponentProps;
type RetentionScenario = 'conservative' | 'typical' | 'optimistic' | 'custom';

export default function NursingRetentionCalc({ state, updateTimeDriverInputs, totalHoursSaved }: Props) {
  const { timeDriverInputs } = state;
  const [customMode, setCustomMode] = useState(timeDriverInputs.retentionImpactScenario === 'custom');
  const [customDisplay, setCustomDisplay] = useState(String(timeDriverInputs.retentionCustomPercent ?? 10));

  const value = computeAllDriverValues(state, totalHoursSaved)[engineKeyForDriver("nursingRetention", state.careSetting ?? "")] ?? 0;
  const { ready, need } = driverScaleReadiness("nursingRetention", state, totalHoursSaved);

  const nursingRetentionImpactRates: Record<RetentionScenario, number> = nursingRetentionRates(timeDriverInputs.retentionCustomPercent ?? 10);

  const calc = useMemo(() => {
    const nurses = state.numberOfProviders;
    const leavingPerYear = nurses * (timeDriverInputs.nursingTurnoverRate / 100);
    const burnoutDepartures = leavingPerYear * 0.40;
    const impactRate = nursingRetentionImpactRates[timeDriverInputs.retentionImpactScenario] / 100;
    const retained = burnoutDepartures * impactRate;
    return { leavingPerYear, burnoutDepartures, retained };
  }, [
    state.numberOfProviders,
    timeDriverInputs.nursingTurnoverRate,
    timeDriverInputs.nursingReplacementCost,
    timeDriverInputs.retentionImpactScenario,
    timeDriverInputs.retentionCustomPercent,
  ]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();

  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Logic</p>
      <p className="text-sm text-[#666666] leading-relaxed mb-6">
        The specific experience that drives nursing turnover decisions: the shift ends at 7pm and the nurse can't leave until charting is done: 8pm, 8:30, sometimes later. It's unpaid or straight-time work for something that should have happened in the flow of care, and it means never fully decompressing from the shift. Moving documentation into the patient interaction can help nurses complete charting when the encounter ends rather than after.
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
      <div className="flex gap-2 mb-2">
        {([
          { label: 'Conservative', value: 'conservative' as RetentionScenario, pct: NURSING_RETENTION_SCENARIOS.conservative },
          { label: 'Typical', value: 'typical' as RetentionScenario, pct: NURSING_RETENTION_SCENARIOS.typical },
          { label: 'Optimistic', value: 'optimistic' as RetentionScenario, pct: NURSING_RETENTION_SCENARIOS.optimistic },
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
            data-testid={`button-nursing-retention-${preset.value}`}
          >
            <span className="font-medium">{preset.label}</span>
            <span className="block text-[10px] mt-0.5 opacity-80">{preset.pct}% impact</span>
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
          data-testid="button-nursing-retention-custom"
        >
          <span className="font-medium">Custom</span>
        </button>
      </div>

      {customMode && (
        <div className="flex items-center gap-3 mb-2">
          <label className="text-sm text-[#666666] flex-shrink-0">Retention impact</label>
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="decimal"
              value={customDisplay}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                setCustomDisplay(raw);
                const n = parseFloat(raw);
                if (!isNaN(n) && n >= 1 && n <= 100) {
                  updateTimeDriverInputs({ retentionCustomPercent: n, retentionImpactScenario: 'custom' });
                }
              }}
              onBlur={() => {
                const n = parseFloat(customDisplay);
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
              data-testid="input-nursing-retention-custom"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
          </div>
        </div>
      )}

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
            {ready ? <span className="font-bold text-[#EA2C00] flex-shrink-0" data-testid="text-nursing-retention-value">{formatCurrency(value)}</span> : <span className="text-sm font-medium text-[#8C7E6E]" data-testid="text-nursing-retention-value">Enter {need}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
