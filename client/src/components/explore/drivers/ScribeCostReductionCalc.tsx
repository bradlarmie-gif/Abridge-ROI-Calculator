import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;

export default function ScribeCostReductionCalc({ state, updateTimeDriverInputs }: Props) {
  const { timeDriverInputs: t } = state;
  const mode = t.scribeBillingMode ?? 'position';

  const calc = useMemo(() => {
    if (mode === 'hourly') {
      const costPerVisit = (t.scribeHourlyRate || 0) * ((t.scribeMinutesPerNote || 0) / 60);
      const scribedVisits = (t.scribeAnnualVisitVolume || 0) * ((t.scribeCoveragePercent || 0) / 100);
      const annualSavings = Math.round(costPerVisit * scribedVisits * ((t.scribeVisitPercentEliminated || 0) / 100));
      return { mode: 'hourly' as const, costPerVisit, scribedVisits, annualSavings };
    }
    const headcount = t.scribeHeadcount || 0;
    const costPerPosition = t.scribeCostPerPosition || 0;
    const eliminated = Math.min(t.scribePositionsEliminated || 0, headcount);
    const annualSavings = Math.round(eliminated * costPerPosition);
    const remainingSpend = (headcount - eliminated) * costPerPosition;
    return { mode: 'position' as const, headcount, costPerPosition, eliminated, annualSavings, remainingSpend };
  }, [mode, t.scribeHeadcount, t.scribeCostPerPosition, t.scribePositionsEliminated,
      t.scribeHourlyRate, t.scribeMinutesPerNote, t.scribeAnnualVisitVolume,
      t.scribeCoveragePercent, t.scribeVisitPercentEliminated]);

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const fmtDec = (n: number) => '$' + n.toFixed(2);

  return (
    <div>
      <p className="text-sm text-[#666666] leading-relaxed mb-5">
        If your organization currently uses in-person or virtual scribes, Abridge directly replaces that function. This is a direct P&amp;L line item — not a modeled projection.
      </p>

      {/* Billing mode toggle */}
      <div className="mb-6">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">How are scribes billed?</p>
        <div className="flex items-center gap-1 bg-[#F5F0EB] rounded-full p-0.5 w-fit">
          {([
            { value: 'position', label: 'Per position (FTE)' },
            { value: 'hourly', label: 'Hourly service' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateTimeDriverInputs({ scribeBillingMode: value })}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mode === value
                  ? 'bg-white text-[#1A1A1A] shadow-sm'
                  : 'text-[#8C7E6E] hover:text-[#1A1A1A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'position' ? (
        <>
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Organization</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="space-y-2.5">
              <label className="text-sm text-[#888888]">Current scribe headcount</label>
              <FormattedNumberInput
                value={t.scribeHeadcount}
                placeholder="e.g., 4"
                onChange={(v: number) => updateTimeDriverInputs({ scribeHeadcount: v })}
                className="h-12 bg-white"
                data-testid="input-scribe-headcount"
              />
              <p className="text-xs text-[#888888]">Total in-person or virtual scribe positions currently in use.</p>
            </div>
            <div className="space-y-2.5">
              <label className="text-sm text-[#888888]">Annual cost per position</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                <FormattedNumberInput
                  value={t.scribeCostPerPosition}
                  placeholder="e.g., 38,000"
                  onChange={(v: number) => updateTimeDriverInputs({ scribeCostPerPosition: v })}
                  className="h-12 bg-white pl-7"
                  data-testid="input-scribe-cost-per-position"
                />
              </div>
              <p className="text-xs text-[#888888]">All-in: salary + benefits for in-person, or full contract value for virtual. Typical range: $30K–$45K/yr.</p>
            </div>
          </div>

          <div className="space-y-2.5 mb-6">
            <label className="text-sm text-[#888888]">Positions being eliminated with Abridge</label>
            <FormattedNumberInput
              value={t.scribePositionsEliminated}
              placeholder="e.g., 3"
              onChange={(v: number) => updateTimeDriverInputs({
                scribePositionsEliminated: calc.mode === 'position' && calc.headcount > 0
                  ? Math.min(v, calc.headcount) : v,
              })}
              className="h-12 bg-white"
              data-testid="input-scribe-positions-eliminated"
            />
            {calc.mode === 'position' && calc.headcount > 0 && (
              <p className="text-xs text-[#888888]">
                Out of {calc.headcount} current position{calc.headcount !== 1 ? 's' : ''}. Enter fewer than the total if you plan to retain scribes in certain specialties or roles.
              </p>
            )}
          </div>

          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>
          <div className="bg-[#F5F0EB] rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">Positions eliminated</span>
                <span className="font-semibold text-black flex-shrink-0">{calc.mode === 'position' ? calc.eliminated : 0}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">× Annual cost per position</span>
                <span className="font-semibold text-black flex-shrink-0">{calc.mode === 'position' ? fmt(calc.costPerPosition) : '$0'}</span>
              </div>
              <div className="h-px bg-[#333333] my-2" />
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-black">Annual Scribe Savings</span>
                <span className="font-bold text-[#EA2C00] flex-shrink-0" data-testid="text-scribe-savings">{fmt(calc.annualSavings)}</span>
              </div>
            </div>
          </div>

          {calc.mode === 'position' && calc.headcount > calc.eliminated && calc.eliminated > 0 && (
            <div className="bg-[#F5F0EB]/60 rounded-lg p-3 mt-4">
              <p className="text-xs text-[#888888]">
                Retaining {calc.headcount - calc.eliminated} position{calc.headcount - calc.eliminated !== 1 ? 's' : ''} — remaining scribe spend: {fmt(calc.remainingSpend)}/yr.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Contract</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="space-y-2.5">
              <label className="text-sm text-[#888888]">Hourly billing rate</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                <FormattedNumberInput
                  value={t.scribeHourlyRate}
                  placeholder="e.g., 25"
                  onChange={(v: number) => updateTimeDriverInputs({ scribeHourlyRate: v })}
                  className="h-12 bg-white pl-7"
                  data-testid="input-scribe-hourly-rate"
                />
              </div>
              <p className="text-xs text-[#888888]">What the vendor charges per hour of scribing time.</p>
            </div>
            <div className="space-y-2.5">
              <label className="text-sm text-[#888888]">Avg minutes per note</label>
              <FormattedNumberInput
                value={t.scribeMinutesPerNote}
                placeholder="e.g., 20"
                onChange={(v: number) => updateTimeDriverInputs({ scribeMinutesPerNote: v })}
                className="h-12 bg-white"
                data-testid="input-scribe-minutes-per-note"
              />
              <p className="text-xs text-[#888888]">Time a scribe spends on each visit. Virtual scribes are typically 15–25 min.</p>
            </div>
          </div>

          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Visit Volume</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div className="space-y-2.5">
              <label className="text-sm text-[#888888]">Annual E/M visit volume</label>
              <FormattedNumberInput
                value={t.scribeAnnualVisitVolume}
                placeholder="e.g., 50,000"
                onChange={(v: number) => updateTimeDriverInputs({ scribeAnnualVisitVolume: v })}
                className="h-12 bg-white"
                data-testid="input-scribe-annual-visits"
              />
              <p className="text-xs text-[#888888]">Total E/M visits per year across the covered population.</p>
            </div>
            <div className="space-y-2.5">
              <label className="text-sm text-[#888888]">% of visits currently scribed</label>
              <div className="relative">
                <FormattedNumberInput
                  value={t.scribeCoveragePercent}
                  placeholder="e.g., 50"
                  onChange={(v: number) => updateTimeDriverInputs({ scribeCoveragePercent: Math.min(v, 100) })}
                  className="h-12 bg-white pr-8"
                  data-testid="input-scribe-coverage-pct"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
              </div>
              <p className="text-xs text-[#888888]">Share of visits where a scribe is currently used.</p>
            </div>
          </div>

          <div className="space-y-2.5 mb-6">
            <label className="text-sm text-[#888888]">% of scribed visits being replaced by Abridge</label>
            <div className="relative">
              <FormattedNumberInput
                value={t.scribeVisitPercentEliminated}
                placeholder="e.g., 100"
                onChange={(v: number) => updateTimeDriverInputs({ scribeVisitPercentEliminated: Math.min(v, 100) })}
                className="h-12 bg-white pr-8"
                data-testid="input-scribe-visit-pct-eliminated"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
            </div>
            <p className="text-xs text-[#888888]">Enter less than 100% if you plan to retain scribes in certain specialties or visit types.</p>
          </div>

          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>
          <div className="bg-[#F5F0EB] rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">Cost per scribed visit</span>
                <span className="font-semibold text-black flex-shrink-0">
                  {calc.mode === 'hourly' ? fmtDec(calc.costPerVisit) : '$0.00'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#666666]">× Scribes visits replaced</span>
                <span className="font-semibold text-black flex-shrink-0">
                  {calc.mode === 'hourly' ? Math.round(calc.scribedVisits * ((t.scribeVisitPercentEliminated || 0) / 100)).toLocaleString() : '0'}
                </span>
              </div>
              <div className="h-px bg-[#333333] my-2" />
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-black">Annual Scribe Savings</span>
                <span className="font-bold text-[#EA2C00] flex-shrink-0" data-testid="text-scribe-savings">{fmt(calc.annualSavings)}</span>
              </div>
            </div>
          </div>

          {calc.mode === 'hourly' && calc.costPerVisit > 0 && (
            <div className="bg-[#F5F0EB]/60 rounded-lg p-3 mt-4">
              <p className="text-xs text-[#888888]">
                Scribe cost: <span className="font-medium text-[#444444]">{fmtDec(calc.costPerVisit)}/visit</span> — use this to benchmark against Abridge's per-visit pricing for a direct apples-to-apples comparison.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
