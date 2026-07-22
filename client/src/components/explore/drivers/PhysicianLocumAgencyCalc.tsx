import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;
type RetentionScenario = 'conservative' | 'typical' | 'optimistic' | 'custom';

export default function PhysicianLocumAgencyCalc({ state, updateTimeDriverInputs }: Props) {
  const { timeDriverInputs } = state;

  const retentionScenarios: Record<RetentionScenario, number> = {
    conservative: 20,
    typical: 30,
    optimistic: 40,
    custom: timeDriverInputs.retentionCustomPercent ?? 10,
  };

  const calc = useMemo(() => {
    const providers = state.numberOfProviders;
    const turnover = (timeDriverInputs.annualTurnoverRate || 0) / 100;
    const burnout = (timeDriverInputs.burnoutRelatedTurnover || 0) / 100;
    const impact = retentionScenarios[timeDriverInputs.retentionImpactScenario] / 100;
    const retained = providers * turnover * burnout * impact;
    const weeks = timeDriverInputs.physicianAgencyWeeksPerVacancy || 16;
    const weeklyPremium = timeDriverInputs.physicianAgencyWeeklyPremium || 5000;
    const value = Math.round(retained * weeks * weeklyPremium);
    return { retained, weeks, weeklyPremium, value };
  }, [
    state.numberOfProviders,
    timeDriverInputs.annualTurnoverRate,
    timeDriverInputs.burnoutRelatedTurnover,
    timeDriverInputs.retentionImpactScenario,
    timeDriverInputs.retentionCustomPercent,
    timeDriverInputs.physicianAgencyWeeksPerVacancy,
    timeDriverInputs.physicianAgencyWeeklyPremium,
  ]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();

  const wellbeingOff = !timeDriverInputs.wellbeingEnabled;
  const retentionOff = !timeDriverInputs.calculateRetentionValue;
  const blocked = wellbeingOff || retentionOff;

  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Logic</p>
      <p className="text-sm text-[#666666] leading-relaxed mb-6">
        When a physician leaves, the vacancy is typically filled with locum or agency coverage at a premium commonly running $3,000–$8,000/week above the cost of an employed physician. Every week of vacancy incurs that cost. Reducing documentation-driven departures can significantly reduce this contracted-coverage spend — in many cases the locum line item exceeds the one-time replacement cost in total burn.
      </p>

      {blocked ? (
        <div className="bg-[#FFF8F6] border border-[#FFDDD6] rounded-lg p-4 mb-2 flex items-start gap-3" data-testid="warning-physician-agency-blocked">
          <AlertTriangle className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#EA2C00] font-medium mb-1">
              {wellbeingOff ? 'Enable Provider Wellbeing first' : 'Turn on "Calculate retention value" first'}
            </p>
            <p className="text-xs text-[#888888]">
              Locum &amp; Agency savings are derived from the number of providers retained, so we need the retention
              calculation enabled above.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Organization</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="space-y-2.5">
              <label className="text-sm text-[#888888]">Weeks of locum coverage per vacancy</label>
              <FormattedNumberInput
                value={timeDriverInputs.physicianAgencyWeeksPerVacancy}
                onChange={(v: number) => updateTimeDriverInputs({ physicianAgencyWeeksPerVacancy: v })}
                className="h-12 bg-white"
                data-testid="input-physician-agency-weeks"
              />
              <p className="text-xs text-[#888888]">Average time to backfill a physician departure with permanent staff.</p>
            </div>
            <div className="space-y-2.5">
              <label className="text-sm text-[#888888]">Weekly premium above base salary</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                <FormattedNumberInput
                  value={timeDriverInputs.physicianAgencyWeeklyPremium}
                  onChange={(v: number) => updateTimeDriverInputs({ physicianAgencyWeeklyPremium: v })}
                  className="h-12 bg-white pl-7"
                  data-testid="input-physician-agency-premium"
                />
              </div>
              <p className="text-xs text-[#888888]">Weekly cost differential between locum/agency and a permanent physician.</p>
            </div>
          </div>

          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>
          <div className="bg-[#F5F0EB] rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">Physicians retained (from Wellbeing)</span>
                <span className="font-semibold text-black">{calc.retained.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">× Weeks of locum coverage avoided</span>
                <span className="font-semibold text-black">{calc.weeks} weeks</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">× Weekly premium</span>
                <span className="font-semibold text-black">{formatCurrency(calc.weeklyPremium)}</span>
              </div>
              <div className="h-px bg-[#333333] my-2" />
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-black">Locum/Agency Avoidance</span>
                <span className="font-bold text-[#EA2C00] flex-shrink-0" data-testid="text-physician-agency-value">{formatCurrency(calc.value)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#F5F0EB]/60 rounded-lg p-3 mt-4">
            <p className="text-xs text-[#888888]">
              This is separate from Retention Value. Retention captures replacement cost (recruiting, onboarding, ramp).
              Locum/Agency captures the premium labor cost incurred during the vacancy period.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
