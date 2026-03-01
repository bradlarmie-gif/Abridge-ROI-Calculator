import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Moon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
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
  
  const storyMetrics = useMemo(() => {
    const providers = inputs.providers || 1;
    const encounters = inputs.annualEncounters || 0;
    
    const encountersWithAI = Math.round(encounters * ((inputs.utilization || 0) / 100));
    
    const currentNetImpact = (inputs.timeSavedPerEncounter || 0) - (inputs.editTimePerEncounter || 0);
    const benchmarkNetImpact = ABRIDGE_BENCHMARKS.timeSavedAvg - ABRIDGE_BENCHMARKS.editTime;
    const netImpactGap = benchmarkNetImpact - currentNetImpact;
    const annualNetImpactGapHours = Math.round((netImpactGap * encountersWithAI) / 60);
    const annualAddedBurden = currentNetImpact < 0 ? Math.round(Math.abs(currentNetImpact * encountersWithAI / 60)) : 0;
    
    const afterHoursAnnual = (inputs.afterHoursPerWeek || 0) * providers * 52;
    const afterHoursBenchmark = ABRIDGE_BENCHMARKS.afterHoursPerWeek * providers * 52;
    const afterHoursGap = Math.max(0, afterHoursAnnual - afterHoursBenchmark);
    
    return {
      encountersWithAI,
      providers,
      currentNetImpact,
      benchmarkNetImpact,
      netImpactGap,
      annualNetImpactGapHours,
      annualAddedBurden,
      afterHoursAnnual,
      afterHoursBenchmark,
      afterHoursGap,
    };
  }, [inputs]);

  const formatNetImpact = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)} min`;
  };

  const extraSecondsPerEncounter = storyMetrics.currentNetImpact < 0 
    ? Math.round(Math.abs(storyMetrics.currentNetImpact) * 60) 
    : 0;

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
          The Gap
        </h1>
        <p className="text-base text-[#666666]">
          Gaps like these are common — and usually addressable. Here's what the data suggests.
        </p>
      </div>

      <section className="bg-[#1A1A1A] rounded-xl p-6 md:p-8">
        <p className="text-xs font-medium text-[#999999] uppercase tracking-[1.5px] mb-4">
          Ambient AI Maturity Model
        </p>
        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-3xl md:text-4xl font-bold text-white">{calculations.maturityLevel}</span>
          <span className="text-sm text-[#999999]">Stage {calculations.maturityStage} of 4</span>
        </div>
        
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((stage) => (
            <div key={stage} className="flex-1">
              <div className={`h-2 rounded-full ${stage <= calculations.maturityStage ? 'bg-[#EA2C00]' : 'bg-[#333333]'}`} />
              <p className={`text-[12px] mt-2 ${stage <= calculations.maturityStage ? 'text-white' : 'text-[#666666]'}`}>
                {stage === 1 ? 'Deployed' : stage === 2 ? 'Adopted' : stage === 3 ? 'Optimized' : 'Transformed'}
              </p>
            </div>
          ))}
        </div>
        
        <div className="bg-[#333333] rounded-lg p-4">
          <p className="text-sm text-[#CCCCCC]">
            {calculations.maturityStage === 1 && "You've deployed ambient AI, but adoption and optimization haven't followed. This is the most common — and most addressable — gap."}
            {calculations.maturityStage === 2 && "Your team is using the tool, but not yet seeing the full returns. The gap between adoption and optimization is where most value is lost."}
            {calculations.maturityStage === 3 && "You're extracting real value. The remaining opportunity is in the fine-tuning — deeper utilization, better workflows, and specialty-specific optimization."}
            {calculations.maturityStage === 4 && "You're among the top performers. The question now is: how do you maintain this and scale it across the organization?"}
          </p>
        </div>
      </section>

      <section className="bg-[#F5F0EB] rounded-xl p-6 md:p-8">
        <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-4">
          Value Realization
        </p>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="text-6xl md:text-7xl font-bold text-[#1A1A1A] leading-none" data-testid="text-realization-score">
              {calculations.realizationScore}%
            </div>
            <p className="text-sm text-[#666666] mt-2">
              of what top-performing organizations achieve
            </p>
          </div>
          
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
            <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-1">
              Untapped Potential
            </p>
            <p className="text-2xl font-bold text-[#EA2C00]">
              {gapPercentage}% opportunity
            </p>
            <p className="text-xs text-[#999999]">remaining</p>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="relative h-3 bg-[#E0E0E0] rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-[#EA2C00] transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${calculations.realizationScore}%` }}
            />
          </div>
        </div>
      </section>

      <div className="bg-[#F5F0EB] rounded-xl p-5" data-testid="card-net-time-impact">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-[#EA2C00]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A] text-sm">Net Time Impact</h3>
            <p className="text-xs text-[#999999]">The real math on your AI investment</p>
          </div>
        </div>
        
        <div className="h-px bg-[#E5E7EB] mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-3">Your Current</p>
            <div className="bg-[#F5F5F5] rounded-lg p-4">
              <div className="space-y-2 text-sm text-[#333333]">
                <div className="flex justify-between">
                  <span>Time saved per encounter</span>
                  <span className="font-medium">{inputs.timeSavedPerEncounter} min</span>
                </div>
                <div className="flex justify-between">
                  <span>{"\u2212"} Edit time per encounter</span>
                  <span className="font-medium">{inputs.editTimePerEncounter || 0} min</span>
                </div>
                <div className="h-px bg-[#E0E0E0] my-1" />
                <div className="flex justify-between">
                  <span className="font-medium">= Net impact</span>
                  <span className={`font-bold text-lg ${storyMetrics.currentNetImpact < 0 ? 'text-[#EA2C00]' : 'text-[#1A1A1A]'}`}>
                    {formatNetImpact(storyMetrics.currentNetImpact)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-3">Optimized</p>
            <div className="bg-[#F5F5F5] rounded-lg p-4">
              <div className="space-y-2 text-sm text-[#333333]">
                <div className="flex justify-between">
                  <span>Time saved per encounter</span>
                  <span className="font-medium">{ABRIDGE_BENCHMARKS.timeSavedAvg} min</span>
                </div>
                <div className="flex justify-between">
                  <span>{"\u2212"} Edit time per encounter</span>
                  <span className="font-medium">{ABRIDGE_BENCHMARKS.editTime} min</span>
                </div>
                <div className="h-px bg-[#E0E0E0] my-1" />
                <div className="flex justify-between">
                  <span className="font-medium">= Net impact</span>
                  <span className="font-bold text-lg text-[#1A1A1A]">{formatNetImpact(storyMetrics.benchmarkNetImpact)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {storyMetrics.currentNetImpact < 0 && (
          <div className="bg-[#FFEBE6] rounded-lg p-4 mb-4 flex items-start gap-3" data-testid="net-impact-negative-warning">
            <AlertTriangle className="w-5 h-5 text-[#EA2C00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#EA2C00]">Your current net time impact is negative.</p>
              <p className="text-sm text-[#EA2C00] mt-1">
                This is worth discussing — whether with your current vendor or in exploring alternatives. Providers are spending an extra {extraSecondsPerEncounter >= 60 ? `${(extraSecondsPerEncounter / 60).toFixed(1)} minutes` : `${extraSecondsPerEncounter} seconds`} per encounter on documentation.
              </p>
              <p className="text-sm text-[#EA2C00] mt-2">
                Across {storyMetrics.encountersWithAI.toLocaleString()} AI-documented encounters:
                {" "}That's <span className="font-bold">{storyMetrics.annualAddedBurden.toLocaleString()} hours/year</span> of added time.
              </p>
            </div>
          </div>
        )}

        {storyMetrics.currentNetImpact >= 0 && storyMetrics.currentNetImpact < storyMetrics.benchmarkNetImpact && (
          <p className="text-sm text-[#666666] mb-4">
            You're saving time, but significant value is being lost to edits.
          </p>
        )}

        <div className="h-px bg-[#E5E7EB] mb-4" />

        <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-2">The Gap</p>
        {storyMetrics.netImpactGap > 0 ? (
          <>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl md:text-5xl font-bold text-[#EA2C00]" data-testid="text-net-impact-gap">
                {storyMetrics.netImpactGap.toFixed(1)} min
              </span>
              <span className="text-sm text-[#999999]">per encounter</span>
            </div>
            <p className="text-sm text-[#666666]">
              That's {Math.max(0, storyMetrics.annualNetImpactGapHours).toLocaleString()} hours/year you could reclaim.
            </p>
          </>
        ) : (
          <div data-testid="text-net-impact-gap">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl md:text-5xl font-bold text-[#333333]">At benchmark</span>
            </div>
            <p className="text-sm text-[#666666]">
              Your net time impact meets or exceeds the Abridge benchmark. No gap here.
            </p>
          </div>
        )}
      </div>

      {storyMetrics.afterHoursAnnual > 0 && (
        <section className="bg-[#1A1A1A] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[#333333] flex items-center justify-center">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-[#999999] uppercase tracking-[1.5px]">
              Pajama Time
            </p>
          </div>
          <p className="text-xl font-bold text-white mb-1">
            {storyMetrics.afterHoursAnnual.toLocaleString()} hours/year spent charting at home — time that could be spent on what matters most
          </p>
          <p className="text-xs text-[#999999] mb-4">
            {inputs.afterHoursPerWeek} hours/week x {storyMetrics.providers} providers x 52 weeks
          </p>
          <div className="h-px bg-[#333333]" />
          <div className="mt-4 space-y-1">
            <p className="text-xs text-[#999999]">
              At Abridge benchmark ({ABRIDGE_BENCHMARKS.afterHoursPerWeek} hrs/week): {storyMetrics.afterHoursBenchmark.toLocaleString()} hours/year
            </p>
            <p className="text-xs text-[#999999]">
              Your gap: <span className="text-white font-medium">{storyMetrics.afterHoursGap.toLocaleString()} hours</span> of provider life reclaimed
            </p>
            <p className="text-xs text-[#999999] mt-1">
              Before ambient AI, the industry average was 5-8 hrs/week (AMA, 2023).
            </p>
          </div>
        </section>
      )}

      <section className="bg-[#F5F0EB] rounded-xl p-5">
        <p className="text-sm text-[#666666]">
          <span className="font-semibold text-[#1A1A1A]">The bottom line:</span> These gaps are common and usually addressable. The question is whether they're being addressed — and how quickly.
        </p>
      </section>

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
          className="bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white gap-2 rounded-full px-6 h-11"
          data-testid="button-next"
        >
          What Good Looks Like
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
