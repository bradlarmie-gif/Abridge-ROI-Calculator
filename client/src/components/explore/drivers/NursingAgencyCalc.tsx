import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;
type RetentionScenario = 'conservative' | 'typical' | 'optimistic';

export default function NursingAgencyCalc({ state, updateTimeDriverInputs }: Props) {
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
    const weeks = timeDriverInputs.nursingAgencyWeeksPerVacancy || 12;
    const weeklyPremium = timeDriverInputs.nursingAgencyWeeklyPremium || 2500;
    const value = Math.round(retained * weeks * weeklyPremium);
    return { retained, weeks, weeklyPremium, value };
  }, [
    state.numberOfProviders,
    timeDriverInputs.nursingTurnoverRate,
    timeDriverInputs.retentionImpactScenario,
    timeDriverInputs.nursingAgencyWeeksPerVacancy,
    timeDriverInputs.nursingAgencyWeeklyPremium,
  ]);

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();

  const retentionOff = !timeDriverInputs.nursingRetentionEnabled;

  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Logic</p>
      <p className="text-sm text-black mb-6">
        When nurses leave, hospitals fill gaps with agency or travel nurses at 2-3x the cost.
        Better retention directly reduces this premium labor spend.
      </p>

      {retentionOff ? (
        <div className="bg-[#FFF8F6] border border-[#FFDDD6] rounded-lg p-4 mb-2 flex items-start gap-3" data-testid="warning-nursing-agency-blocked">
          <AlertTriangle className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#EA2C00] font-medium mb-1">Enable RN Retention first</p>
            <p className="text-xs text-[#888888]">
              Travel &amp; Agency savings are derived from the number of nurses retained.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Organization</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="space-y-2.5">
              <label className="text-sm text-[#888888]">Weeks of agency coverage per vacancy</label>
              <FormattedNumberInput
                value={timeDriverInputs.nursingAgencyWeeksPerVacancy}
                onChange={(v: number) => updateTimeDriverInputs({ nursingAgencyWeeksPerVacancy: v })}
                className="h-12 bg-white"
                data-testid="input-agency-weeks"
              />
              <p className="text-xs text-[#888888]">Average time to fill a nursing vacancy.</p>
            </div>
            <div className="space-y-2.5">
              <label className="text-sm text-[#888888]">Weekly agency premium (above base cost)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                <FormattedNumberInput
                  value={timeDriverInputs.nursingAgencyWeeklyPremium}
                  onChange={(v: number) => updateTimeDriverInputs({ nursingAgencyWeeklyPremium: v })}
                  className="h-12 bg-white pl-7"
                  data-testid="input-agency-premium"
                />
              </div>
              <p className="text-xs text-[#888888]">Additional cost per week for agency vs. permanent staff.</p>
            </div>
          </div>

          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>
          <div className="bg-[#F5F0EB] rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">Nurses retained (from Retention)</span>
                <span className="font-semibold text-black">{calc.retained.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">× Weeks of agency coverage avoided</span>
                <span className="font-semibold text-black">{calc.weeks} weeks</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">× Weekly agency premium</span>
                <span className="font-semibold text-black">{formatCurrency(calc.weeklyPremium)}</span>
              </div>
              <div className="h-px bg-[#E5E5E5] my-2" />
              <div className="flex justify-between gap-2">
                <span className="text-[#666666] font-medium">Annual Agency Savings</span>
                <span className="font-bold text-[#EA2C00]" data-testid="text-nursing-agency-value">{formatCurrency(calc.value)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#F5F0EB]/60 rounded-lg p-3 mt-4">
            <p className="text-xs text-[#888888]">
              This is separate from Retention Value. Retention captures replacement cost. Agency captures the premium
              labor cost during the vacancy period.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
