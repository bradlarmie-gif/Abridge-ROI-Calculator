import { useState, useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { NumberField } from "@/components/NumberField";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;

export default function PatientAccessCalc({ state, updateTimeDriverInputs, totalHoursSaved }: Props) {
  const { timeDriverInputs } = state;
  const [customReinvestMode, setCustomReinvestMode] = useState(false);
  const [customReinvestDisplay, setCustomReinvestDisplay] = useState(String(timeDriverInputs.capacityRealizationPercent));

  const effectiveAccessProviders = Math.min(timeDriverInputs.accessProviders || state.numberOfProviders, state.numberOfProviders);

  const derivedVisitsPerWeek = useMemo(() => {
    if (state.numberOfProviders <= 0 || totalHoursSaved <= 0) return 0;
    const hrsPerProvPerWeek = totalHoursSaved / state.numberOfProviders / 48;
    const reinvestmentRate = (timeDriverInputs.capacityRealizationPercent ?? 25) / 100;
    const visitDurationHrs = (timeDriverInputs.visitDuration ?? 30) / 60;
    if (visitDurationHrs <= 0) return 0;
    return Math.round((hrsPerProvPerWeek * reinvestmentRate / visitDurationHrs) * 10) / 10;
  }, [totalHoursSaved, state.numberOfProviders, timeDriverInputs.capacityRealizationPercent, timeDriverInputs.visitDuration]);

  const potentialVisits = Math.round(derivedVisitsPerWeek * effectiveAccessProviders * 48);
  const potentialRevenue = Math.round(potentialVisits * timeDriverInputs.revenuePerVisit);

  const hoursPerProviderPerWeek = state.numberOfProviders > 0
    ? (totalHoursSaved / state.numberOfProviders / 48).toFixed(1)
    : '0';

  const formatCurrency = (n: number) => '$' + n.toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-sm text-[#666666] leading-relaxed mb-4">
        Hours returned from documentation become available capacity in the physician's schedule. Not all of it gets converted to visits — providers use recovered time in different ways — but the portion reinvested in patient care can translate into additional appointments, reduced wait times, and incremental revenue. The question is how much of that time your providers would realistically reinvest.
      </p>

      <div className="space-y-3 mb-6">
        <label className="text-sm text-[#888888]">Time reinvestment rate</label>
        <div className="flex gap-2 mb-3">
          {[
            { label: 'Conservative', value: 15 },
            { label: 'Moderate', value: 25 },
            { label: 'Optimistic', value: 35 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setCustomReinvestMode(false);
                updateTimeDriverInputs({ capacityRealizationPercent: preset.value });
              }}
              className={`flex-1 py-2 px-2 rounded-lg text-xs transition-all ${
                !customReinvestMode && timeDriverInputs.capacityRealizationPercent === preset.value
                  ? 'bg-[#EA2C00] text-white'
                  : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
              }`}
              data-testid={`button-reinvestment-preset-${preset.label.toLowerCase()}`}
            >
              <span className="font-medium">{preset.label}</span>
              <span className="block text-[10px] mt-0.5 opacity-80">{preset.value}%</span>
            </button>
          ))}
          <button
            onClick={() => setCustomReinvestMode(true)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs transition-all ${
              customReinvestMode ? 'bg-[#EA2C00] text-white' : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
            }`}
            data-testid="button-reinvestment-preset-custom"
          >
            <span className="font-medium">Custom</span>
          </button>
        </div>

        {customReinvestMode && (
          <div className="flex items-center gap-3 mb-3">
            <label className="text-sm text-[#666666] flex-shrink-0">Reinvestment rate</label>
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={customReinvestDisplay}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setCustomReinvestDisplay(raw);
                  const n = parseFloat(raw);
                  if (!isNaN(n) && n >= 1 && n <= 100) {
                    updateTimeDriverInputs({ capacityRealizationPercent: n });
                  }
                }}
                onBlur={() => {
                  const n = parseFloat(customReinvestDisplay);
                  if (isNaN(n) || n < 1) {
                    updateTimeDriverInputs({ capacityRealizationPercent: 25 });
                    setCustomReinvestDisplay('25');
                  } else {
                    const clamped = Math.min(100, n);
                    updateTimeDriverInputs({ capacityRealizationPercent: clamped });
                    setCustomReinvestDisplay(String(clamped));
                  }
                }}
                className="w-full h-10 bg-white border border-[#E5E5E5] rounded-lg px-3 pr-8 text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                autoFocus
                data-testid="input-reinvestment-custom"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
            </div>
          </div>
        )}

        <div className="bg-[#F5F0EB] rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-[#666666]">Derived visits per provider per week</span>
          <span className="text-2xl font-bold text-black">{derivedVisitsPerWeek}</span>
        </div>

        <p className="text-xs text-[#888888]">
          Most recovered documentation time is absorbed into quality of life, inbox, and longer patient conversations — not additional visits. Only a fraction converts to schedulable capacity.
        </p>
      </div>

      <div className="mb-6">
        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">Providers with scheduling capacity</label>
          <NumberField
            min={1}
            max={state.numberOfProviders}
            decimal={false}
            value={effectiveAccessProviders}
            onValueChange={(v) => updateTimeDriverInputs({ accessProviders: v })}
            className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 text-black font-semibold text-base"
            data-testid="input-access-providers"
          />
          <p className="text-xs text-[#888888]">
            How many of your {state.numberOfProviders} providers have the scheduling flexibility to see additional patients?
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">Average visit duration</label>
          <div className="relative">
            <FormattedNumberInput
              value={timeDriverInputs.visitDuration}
              onChange={(v: number) => updateTimeDriverInputs({ visitDuration: v })}
              className="h-12 bg-white pr-12"
              data-testid="input-visit-duration"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">min</span>
          </div>
        </div>
        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">Revenue per visit</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={timeDriverInputs.revenuePerVisit}
              onChange={(v: number) => updateTimeDriverInputs({ revenuePerVisit: v })}
              className="h-12 bg-white pl-7"
              data-testid="input-revenue-per-visit"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">How we got here</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">Time saved per provider</span>
            <span className="font-semibold text-black flex-shrink-0">{hoursPerProviderPerWeek} hrs/wk</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">× {timeDriverInputs.capacityRealizationPercent}% reinvested ÷ {timeDriverInputs.visitDuration} min/visit</span>
            <span className="font-semibold text-black flex-shrink-0">= {derivedVisitsPerWeek} visits/wk</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">{derivedVisitsPerWeek} visits/wk × {effectiveAccessProviders} providers × 48 wks</span>
            <span className="font-semibold text-black flex-shrink-0">= {formatNumber(potentialVisits)} visits/yr</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">× {formatCurrency(timeDriverInputs.revenuePerVisit)} per visit</span>
            <span className="font-bold text-[#EA2C00] flex-shrink-0">= {formatCurrency(potentialRevenue)}/yr</span>
          </div>
        </div>
      </div>
    </div>
  );
}
