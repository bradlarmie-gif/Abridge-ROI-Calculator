import { useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

type Props = ExploreCalcComponentProps;

export default function ScribeCostReductionCalc({ state, updateTimeDriverInputs }: Props) {
  const { timeDriverInputs } = state;

  const calc = useMemo(() => {
    const headcount = timeDriverInputs.scribeHeadcount || 0;
    const costPerPosition = timeDriverInputs.scribeCostPerPosition || 0;
    const eliminated = Math.min(timeDriverInputs.scribePositionsEliminated || 0, headcount);
    const annualSavings = eliminated * costPerPosition;
    const remainingSpend = (headcount - eliminated) * costPerPosition;
    return { headcount, costPerPosition, eliminated, annualSavings, remainingSpend };
  }, [
    timeDriverInputs.scribeHeadcount,
    timeDriverInputs.scribeCostPerPosition,
    timeDriverInputs.scribePositionsEliminated,
  ]);

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();

  return (
    <div>
      <p className="text-sm text-[#666666] leading-relaxed mb-6">
        If your organization currently uses in-person or virtual scribes, Abridge directly replaces that function. This is a direct P&amp;L line item — not a modeled projection. Enter what you currently spend and how many positions are being eliminated.
      </p>

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Organization</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="space-y-2.5">
          <label className="text-sm text-[#888888]">Current scribe headcount</label>
          <FormattedNumberInput
            value={timeDriverInputs.scribeHeadcount}
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
              value={timeDriverInputs.scribeCostPerPosition}
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
          value={timeDriverInputs.scribePositionsEliminated}
          placeholder="e.g., 3"
          onChange={(v: number) => updateTimeDriverInputs({
            scribePositionsEliminated: calc.headcount > 0 ? Math.min(v, calc.headcount) : v,
          })}
          className="h-12 bg-white"
          data-testid="input-scribe-positions-eliminated"
        />
        {calc.headcount > 0 && (
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
            <span className="font-semibold text-black flex-shrink-0">{calc.eliminated}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666666]">× Annual cost per position</span>
            <span className="font-semibold text-black flex-shrink-0">{fmt(calc.costPerPosition)}</span>
          </div>
          <div className="h-px bg-[#333333] my-2" />
          <div className="flex justify-between gap-2">
            <span className="font-semibold text-black">Annual Scribe Savings</span>
            <span className="font-bold text-[#EA2C00] flex-shrink-0" data-testid="text-scribe-savings">{fmt(calc.annualSavings)}</span>
          </div>
        </div>
      </div>

      {calc.headcount > calc.eliminated && calc.eliminated > 0 && (
        <div className="bg-[#F5F0EB]/60 rounded-lg p-3 mt-4">
          <p className="text-xs text-[#888888]">
            Retaining {calc.headcount - calc.eliminated} position{calc.headcount - calc.eliminated !== 1 ? 's' : ''} — remaining scribe spend: {fmt(calc.remainingSpend)}/yr.
          </p>
        </div>
      )}
    </div>
  );
}
