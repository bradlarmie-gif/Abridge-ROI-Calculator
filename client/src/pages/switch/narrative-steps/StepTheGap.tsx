import { useMemo } from "react";
import { ArrowRight, ArrowLeft, TrendingDown, DollarSign, Clock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  formatCurrency,
  ABRIDGE_BENCHMARKS,
  type SwitchInputs,
  type SwitchCalculations
} from "@/lib/switchGapCalculator";

interface StepTheGapProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
}

export default function StepTheGap({
  inputs,
  calculations,
  onNext,
  onBack,
}: StepTheGapProps) {
  const gapPercentage = Math.max(0, 100 - calculations.realizationScore);
  
  const humanImpact = useMemo(() => {
    const providers = inputs.providers || 0;
    const additionalHoursPerYear = calculations.hoursGap;
    const workWeeksLost = Math.round(additionalHoursPerYear / 40);
    const hoursPerProviderPerYear = providers > 0 ? Math.round(additionalHoursPerYear / providers) : 0;
    
    return {
      additionalHoursPerYear,
      workWeeksLost,
      hoursPerProviderPerYear,
    };
  }, [inputs, calculations]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          The Gap
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          You're paying for 100% of this technology.
          <br />
          Here's how much you're actually getting.
        </p>
      </div>

      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-10 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-500/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm mb-6">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span>Value Left on the Table</span>
          </div>
          
          <div className="text-5xl md:text-7xl font-bold mb-3 text-emerald-400" data-testid="text-annual-gap">
            {formatCurrency(calculations.annualGap)}
          </div>
          <p className="text-lg md:text-xl text-slate-300 mb-6">
            per year — that you're already paying for
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white">
                {calculations.realizationScore}%
              </div>
              <p className="text-sm text-slate-400">Value Captured</p>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-red-400">
                {gapPercentage}%
              </div>
              <p className="text-sm text-slate-400">Value Lost</p>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-white">
                {humanImpact.workWeeksLost}
              </div>
              <p className="text-sm text-slate-400">Work Weeks Lost/Year</p>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-amber-400">
                {formatCurrency(calculations.threeYearGap)}
              </div>
              <p className="text-sm text-slate-400">3-Year Impact</p>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-6 md:p-8">
        <h2 className="text-lg font-bold text-[#111827] mb-6">Where the Value is Leaking</h2>
        
        <div className="space-y-4">
          {calculations.utilizationGapValue > 0 && (
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-[#111827]">Utilization Gap</h3>
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(calculations.utilizationGapValue)}</span>
                </div>
                <p className="text-sm text-[#6B7280]">
                  You're at {inputs.utilization}% utilization. Top performers hit {ABRIDGE_BENCHMARKS.utilization}%.
                  That's {Math.round((ABRIDGE_BENCHMARKS.utilization - inputs.utilization) / 100 * inputs.annualEncounters).toLocaleString()} encounters 
                  that could be documented but aren't.
                </p>
              </div>
            </div>
          )}

          {calculations.efficiencyGapValue > 0 && (
            <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-[#111827]">Efficiency Gap</h3>
                  <span className="text-lg font-bold text-purple-600">{formatCurrency(calculations.efficiencyGapValue)}</span>
                </div>
                <p className="text-sm text-[#6B7280]">
                  You're saving {inputs.timeSavedPerEncounter} min/encounter. Top performers save {ABRIDGE_BENCHMARKS.timeSavedAvg} min.
                  That's {calculations.efficiencyGapHours.toLocaleString()} hours per year your team isn't getting back.
                </p>
              </div>
            </div>
          )}

          {calculations.wrvuGapValue > 0 && (
            <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-[#111827]">Quality Gap</h3>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(calculations.wrvuGapValue)}</span>
                </div>
                <p className="text-sm text-[#6B7280]">
                  You're seeing +{inputs.wrvuLift}% wRVU lift. Top performers see +{ABRIDGE_BENCHMARKS.wrvuLift}%.
                  Better documentation means better capture — and better revenue.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <p className="text-amber-800 text-center">
          <span className="font-semibold">The question isn't whether you made the right decision to invest in ambient AI.</span>
          <br className="hidden md:block" />
          It's whether you're getting what you paid for.
        </p>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <Button
          onClick={onNext}
          className="bg-[#EA2C00] hover:bg-[#d12700] text-white gap-2"
          data-testid="button-next"
        >
          Why This Happens
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
