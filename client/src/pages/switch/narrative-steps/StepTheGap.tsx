import { useState, useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Users, TrendingUp, Heart, Moon, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  ABRIDGE_BENCHMARKS,
  formatCurrency,
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
  const [showCalcDetails, setShowCalcDetails] = useState(false);
  const gapPercentage = Math.max(0, 100 - calculations.realizationScore);
  
  const storyMetrics = useMemo(() => {
    const providers = inputs.providers || 1;
    const encounters = inputs.annualEncounters || 0;
    
    const utilizationGapPP = Math.max(0, ABRIDGE_BENCHMARKS.utilization - (inputs.utilization || 0));
    const encountersWithoutAI = Math.round(encounters * (utilizationGapPP / 100));
    const encountersWithAI = Math.round(encounters * ((inputs.utilization || 0) / 100));
    
    const wrvuGapPercent = Math.max(0, ABRIDGE_BENCHMARKS.wrvuLift - (inputs.wrvuLift || 0));
    
    const afterHoursAnnual = (inputs.afterHoursPerWeek || 0) * providers * 52;
    const afterHoursBenchmark = ABRIDGE_BENCHMARKS.afterHoursPerWeek * providers * 52;
    const afterHoursGap = Math.max(0, afterHoursAnnual - afterHoursBenchmark);

    const currentNetImpact = (inputs.timeSavedPerEncounter || 0) - (inputs.editTimePerEncounter || 0);
    const benchmarkNetImpact = ABRIDGE_BENCHMARKS.timeSavedAvg - ABRIDGE_BENCHMARKS.editTime;
    const netImpactGap = benchmarkNetImpact - currentNetImpact;
    const annualNetImpactGapHours = Math.round((netImpactGap * encountersWithAI) / 60);
    const annualAddedBurden = currentNetImpact < 0 ? Math.round(Math.abs(currentNetImpact * encountersWithAI / 60)) : 0;
    
    return {
      encountersWithoutAI,
      encountersWithAI,
      wrvuGapPercent,
      afterHoursAnnual,
      afterHoursBenchmark,
      afterHoursGap,
      providers,
      currentNetImpact,
      benchmarkNetImpact,
      netImpactGap,
      annualNetImpactGapHours,
      annualAddedBurden,
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
          Here's what your data tells us — and where the opportunity lives.
        </p>
      </div>

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

        <div className="mt-4 border-t border-[#E0E0E0] pt-4">
          <button 
            onClick={() => setShowCalcDetails(!showCalcDetails)}
            className="flex items-center gap-2 text-sm text-[#666666] hover:text-[#1A1A1A] transition-colors"
            data-testid="button-calc-details"
          >
            {showCalcDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            How we calculate this
          </button>
          
          {showCalcDetails && (
            <div className="mt-3 bg-white rounded-lg border border-[#E5E7EB] p-4">
              <p className="text-xs text-[#666666] mb-3">We compare your metrics against Abridge benchmarks:</p>
              <div className="space-y-2 text-sm font-mono text-[#333333]">
                <div className="flex justify-between items-center">
                  <span>Utilization</span>
                  <span>{inputs.utilization}% / {ABRIDGE_BENCHMARKS.utilization}% = <span className="font-bold">{calculations.utilizationScore}%</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Time Saved</span>
                  <span>{inputs.timeSavedPerEncounter} / {ABRIDGE_BENCHMARKS.timeSavedAvg} min = <span className="font-bold">{calculations.efficiencyScore}%</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span>wRVU Lift</span>
                  <span>{inputs.wrvuLift}% / {ABRIDGE_BENCHMARKS.wrvuLift}% = <span className="font-bold">{calculations.qualityScore}%</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Satisfaction</span>
                  <span>{inputs.satisfaction}% / {ABRIDGE_BENCHMARKS.satisfaction}% = <span className="font-bold">{calculations.satisfactionScore}%</span></span>
                </div>
                <div className="border-t border-[#E5E7EB] pt-2 flex justify-between items-center font-bold">
                  <span>Value Realization Score</span>
                  <span className="text-[#EA2C00]">{calculations.realizationScore}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="text-left">
        <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-2">
          Performance Breakdown
        </p>
        <h2 className="text-xl font-bold text-[#1A1A1A]">Where the value lives</h2>
        <p className="text-sm text-[#666666] mt-1">
          Each dimension below represents a specific, addressable gap.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 md:col-span-2" data-testid="card-net-time-impact">
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

          <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-3">Your Current Reality</p>
          <div className="bg-[#F5F5F5] rounded-lg p-4 mb-4">
            <div className="space-y-2 text-sm text-[#333333]">
              <div className="flex justify-between">
                <span>Time saved per encounter</span>
                <span className="font-medium">{inputs.timeSavedPerEncounter} min</span>
              </div>
              <div className="flex justify-between">
                <span>- Edit time per encounter</span>
                <span className="font-medium">{inputs.editTimePerEncounter || 0} min</span>
              </div>
              <div className="h-px bg-[#E0E0E0] my-1" />
              <div className="flex justify-between">
                <span className="font-medium">= Net impact per encounter</span>
                <span className={`font-bold text-lg ${storyMetrics.currentNetImpact < 0 ? 'text-[#EA2C00]' : 'text-[#1A1A1A]'}`}>
                  {formatNetImpact(storyMetrics.currentNetImpact)}
                </span>
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

          <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-3">At Abridge Benchmark</p>
          <div className="bg-[#F5F5F5] rounded-lg p-4 mb-4">
            <div className="space-y-2 text-sm text-[#333333]">
              <div className="flex justify-between">
                <span>Time saved per encounter</span>
                <span className="font-medium">{ABRIDGE_BENCHMARKS.timeSavedAvg} min</span>
              </div>
              <div className="flex justify-between">
                <span>- Edit time per encounter</span>
                <span className="font-medium">{ABRIDGE_BENCHMARKS.editTime} min</span>
              </div>
              <div className="h-px bg-[#E0E0E0] my-1" />
              <div className="flex justify-between">
                <span className="font-medium">= Net impact per encounter</span>
                <span className="font-bold text-lg text-[#1A1A1A]">{formatNetImpact(storyMetrics.benchmarkNetImpact)}</span>
              </div>
            </div>
          </div>

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
                That's {Math.max(0, storyMetrics.annualNetImpactGapHours).toLocaleString()} hours/year {storyMetrics.currentNetImpact < 0 ? "across your AI-documented encounters" : "you could reclaim"}.
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

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1A1A1A] text-sm">Utilization Gap</h3>
              <p className="text-xs text-[#999999]">Where AI isn't being used</p>
            </div>
          </div>
          
          {storyMetrics.encountersWithoutAI > 0 ? (
            <>
              <div className="border-l-4 border-[#EA2C00] pl-4 mb-4">
                <span className="text-3xl md:text-4xl font-bold text-[#EA2C00]">{storyMetrics.encountersWithoutAI.toLocaleString()}</span>
                <span className="text-sm text-[#999999] ml-2">encounters/year</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold text-[#EA2C00] bg-[#FFEBE6] px-2 py-1 rounded">{inputs.utilization}% current</span>
                <span className="text-xs text-[#999999]">vs.</span>
                <span className="text-xs font-semibold text-[#333333] bg-[#E8E8E8] px-2 py-1 rounded">{ABRIDGE_BENCHMARKS.utilization}% benchmark</span>
              </div>
              <p className="text-xs text-[#666666]">Utilization is the single strongest predictor of ROI. Low utilization usually signals workflow friction, not technology failure.</p>
            </>
          ) : (
            <div className="border-l-4 border-[#E8E8E8] pl-4">
              <span className="text-2xl font-bold text-[#333333]">At benchmark</span>
              <p className="text-sm text-[#666666] mt-1">Your utilization is at or above benchmark.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1A1A1A] text-sm">Coding Leakage</h3>
              <p className="text-xs text-[#999999]">Revenue you're earning but not capturing</p>
            </div>
          </div>
          
          {storyMetrics.wrvuGapPercent > 0 ? (
            <>
              <div className="border-l-4 border-[#EA2C00] pl-4 mb-4">
                <span className="text-3xl md:text-4xl font-bold text-[#EA2C00]">+{inputs.wrvuLift || 0}%</span>
                <span className="text-sm text-[#999999] ml-2">wRVU lift</span>
              </div>
              <p className="text-xs text-[#999999] mb-2">vs. +{ABRIDGE_BENCHMARKS.wrvuLift}% for top performers</p>
              <div className="h-px bg-[#E5E7EB] my-3" />
              <p className="text-xs text-[#666666]">
                The correlation between documentation completeness and accurate coding is strongest above 70% utilization.
              </p>
              {calculations.wrvuGapValue > 0 && (
                <p className="text-xs text-[#EA2C00] font-medium mt-2">Gap value: ~{formatCurrency(calculations.wrvuGapValue)}/year</p>
              )}
            </>
          ) : (
            <div className="border-l-4 border-[#E8E8E8] pl-4">
              <span className="text-2xl font-bold text-[#333333]">At benchmark</span>
              <p className="text-sm text-[#666666] mt-1">Your wRVU lift is performing well.</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1A1A1A] text-sm">Burnout Signal</h3>
              <p className="text-xs text-[#999999]">The leading indicator most organizations miss</p>
            </div>
          </div>
          
          {(inputs.satisfaction || 0) < ABRIDGE_BENCHMARKS.satisfaction ? (
            <>
              <div className="border-l-4 border-[#EA2C00] pl-4 mb-4">
                <span className="text-3xl md:text-4xl font-bold text-[#EA2C00]">{inputs.satisfaction || 0}%</span>
                <span className="text-sm text-[#999999] ml-2">satisfaction</span>
              </div>
              <p className="text-xs text-[#999999] mb-2">vs. {ABRIDGE_BENCHMARKS.satisfaction}% at top performers</p>
              <div className="h-px bg-[#E5E7EB] my-3" />
              <p className="text-xs text-[#666666]">
                {(inputs.satisfaction || 0) < 65 
                  ? "Satisfaction below 65% is a strong signal of declining utilization ahead. Providers who wouldn't recommend the tool often stop using it within 6 months."
                  : "Below benchmark, but above the critical 65% threshold. Worth monitoring — this is often the first metric to decline before utilization drops."
                }
              </p>
            </>
          ) : (
            <div className="border-l-4 border-[#E8E8E8] pl-4">
              <span className="text-2xl font-bold text-[#333333]">At benchmark</span>
              <p className="text-sm text-[#666666] mt-1">Provider satisfaction is strong.</p>
            </div>
          )}
        </div>
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
