import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Users, TrendingUp, Calendar, Coffee, Moon } from "lucide-react";
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
  
  // Dynamic messaging based on realization score
  const getPerformanceTier = (score: number) => {
    if (score >= 95) return { tier: 'benchmark', label: 'Benchmark Level', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
    if (score >= 85) return { tier: 'strong', label: 'Strong Performance', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
    if (score >= 70) return { tier: 'moderate', label: 'Opportunity Ahead', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    if (score >= 55) return { tier: 'developing', label: 'Untapped Potential', color: 'text-amber-400', bgColor: 'bg-amber-500/20' };
    if (score >= 40) return { tier: 'emerging', label: 'Value Left Behind', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
    return { tier: 'explore', label: 'Explore Your Options', color: 'text-red-400', bgColor: 'bg-red-500/20' };
  };
  
  const performanceInfo = getPerformanceTier(calculations.realizationScore);
  const performanceTier = performanceInfo.tier;
  
  const dynamicMessaging = useMemo(() => {
    const tier = performanceTier;
    const score = calculations.realizationScore;
    
    return {
      // Header messaging - strategic framing
      headerSubtitle: tier === 'benchmark' || tier === 'strong'
        ? "Your implementation is mature. This analysis identifies where marginal gains compound."
        : tier === 'moderate'
        ? "You've established a baseline. The question now: what's preventing the next jump?"
        : tier === 'developing'
        ? "This score reveals structural gaps — addressable, but requiring intentional focus."
        : "At this stage, every percentage point recovered represents significant unrealized value.",
      
      // Time card - insight-driven
      timeTitle: tier === 'strong' || tier === 'benchmark' 
        ? "Efficiency Refinement" 
        : tier === 'moderate' 
        ? "Hidden Time Drain" 
        : "Documentation Overhead",
      timeSubtitle: tier === 'strong' || tier === 'benchmark'
        ? "Micro-optimizations that compound"
        : tier === 'moderate'
        ? "Time that's bleeding out unnoticed"
        : "Where your providers' hours actually go",
      
      // Utilization card - strategic framing
      utilizationTitle: tier === 'strong' || tier === 'benchmark'
        ? "Coverage Gaps"
        : tier === 'moderate'
        ? "Adoption Inconsistency"
        : "Utilization Gap",
      utilizationSubtitle: tier === 'strong' || tier === 'benchmark'
        ? "Edge cases without AI support"
        : tier === 'moderate'
        ? "Uneven adoption across your organization"
        : "Encounters without AI documentation",
      utilizationContext: tier === 'strong' || tier === 'benchmark'
        ? "Even at high utilization, every unassisted encounter represents documentation variance and provider burden."
        : tier === 'moderate'
        ? "Inconsistent utilization often signals workflow friction or specialty-specific barriers worth investigating."
        : "Low utilization typically points to adoption blockers — training gaps, workflow misalignment, or tool limitations.",
      
      // wRVU card - ROI focused
      wrvuTitle: tier === 'strong' || tier === 'benchmark'
        ? "Capture Precision"
        : tier === 'moderate'
        ? "Revenue Left on the Table"
        : "Coding Leakage",
      wrvuSubtitle: tier === 'strong' || tier === 'benchmark'
        ? "Specialty-level optimization"
        : tier === 'moderate'
        ? "Documentation completeness gap"
        : "Services rendered but not captured",
      wrvuContext: tier === 'strong' || tier === 'benchmark'
        ? "At your level, the remaining lift often requires specialty-specific prompt tuning and workflow integration."
        : tier === 'moderate'
        ? "This gap often indicates incomplete capture of complexity, procedures, or time-based codes."
        : "Each percentage point in wRVU lift represents care you've already delivered but aren't being credited for.",
      
      // Satisfaction card - retention/burnout framing
      satisfactionTitle: tier === 'strong' || tier === 'benchmark'
        ? "Team Sentiment"
        : tier === 'moderate'
        ? "Provider Friction"
        : "Burnout Risk Indicator",
      satisfactionSubtitle: tier === 'strong' || tier === 'benchmark'
        ? "Adoption sustainability"
        : tier === 'moderate'
        ? "Friction points in daily workflow"
        : "Leading indicator of retention risk",
      satisfactionContext: tier === 'strong' || tier === 'benchmark'
        ? "High satisfaction correlates with sustained adoption. Monitor for regression as workflows evolve."
        : tier === 'moderate'
        ? "Mid-range satisfaction often masks specific pain points — worth drilling into by specialty or site."
        : "Documentation burden is a top-3 driver of physician burnout. This metric predicts turnover intent.",
    };
  }, [performanceTier, calculations.realizationScore]);
  
  const storyMetrics = useMemo(() => {
    const providers = inputs.providers || 1;
    const encounters = inputs.annualEncounters || 0;
    
    const utilizationGapEncounters = Math.round(
      (ABRIDGE_BENCHMARKS.utilization - (inputs.utilization || 0)) / 100 * encounters
    );
    
    const efficiencyGapMinutes = (ABRIDGE_BENCHMARKS.timeSavedAvg - (inputs.timeSavedPerEncounter || 0)) * encounters;
    const efficiencyGapHours = Math.round(efficiencyGapMinutes / 60);
    const workWeeksLost = Math.round(efficiencyGapHours / 40);
    
    const hoursPerProviderPerWeek = providers > 0 ? Math.round((efficiencyGapHours / 52) / providers * 10) / 10 : 0;
    
    const wrvuGapPercent = ABRIDGE_BENCHMARKS.wrvuLift - (inputs.wrvuLift || 0);
    
    const satisfactionGap = ABRIDGE_BENCHMARKS.satisfaction - (inputs.satisfaction || 0);
    
    const afterHoursTotal = (inputs.afterHoursPerWeek || 0) * 52;
    
    return {
      utilizationGapEncounters,
      efficiencyGapHours,
      workWeeksLost,
      hoursPerProviderPerWeek,
      wrvuGapPercent,
      satisfactionGap,
      afterHoursTotal,
      providers,
    };
  }, [inputs, calculations]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          The Gap
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          {dynamicMessaging.headerSubtitle}
        </p>
      </div>

      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden">
        {/* Main content */}
        <div className="px-8 py-12 md:px-16 md:py-16">
          <div className="text-center">
            {/* Maturity badge - subtle, top */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${performanceInfo.bgColor} mb-8`}>
              <div className={`w-1.5 h-1.5 rounded-full ${performanceInfo.color.replace('text-', 'bg-')}`} />
              <span className={`text-xs font-medium uppercase tracking-wider ${performanceInfo.color}`}>
                {performanceInfo.label}
              </span>
            </div>
            
            {/* The score - dominant */}
            <div className="mb-6">
              <span className="text-[120px] md:text-[160px] font-bold text-white leading-none tracking-tight" data-testid="text-realization-score">
                {calculations.realizationScore}
              </span>
              <span className="text-4xl md:text-5xl font-light text-slate-500 ml-1">%</span>
            </div>
            
            {/* Context line */}
            <p className="text-slate-400 text-lg md:text-xl max-w-md mx-auto">
              of the value top-performing organizations capture
            </p>
          </div>
        </div>
        
        {/* Bottom bar with progress */}
        <div className="bg-slate-800/50 px-8 py-5 md:px-16">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#EA2C00] to-[#F07B5F] transition-all duration-1000 ease-out rounded-full"
                    style={{ width: `${calculations.realizationScore}%` }}
                  />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-amber-400 text-sm font-medium">{gapPercentage}%</span>
                <span className="text-slate-500 text-sm ml-1">uncaptured</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-[#111827] mb-2">What this opportunity looks like in practice</h2>
        <p className="text-[#6B7280]">These aren't abstract numbers — they're real hours, real encounters, real experiences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {storyMetrics.efficiencyGapHours > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827]">{dynamicMessaging.timeTitle}</h3>
                  <p className="text-sm text-[#6B7280]">{dynamicMessaging.timeSubtitle}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-purple-600">{storyMetrics.efficiencyGapHours.toLocaleString()}</span>
                    <span className="text-lg text-[#6B7280]">hours per year</span>
                  </div>
                  <p className="text-sm text-[#6B7280] mt-1">
                    That's <span className="font-semibold text-[#111827]">{storyMetrics.workWeeksLost} full work weeks</span> of provider time
                  </p>
                </div>
                
                {storyMetrics.hoursPerProviderPerWeek > 0 && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-sm text-purple-800">
                      For each of your <span className="font-semibold">{storyMetrics.providers} providers</span>, that's roughly 
                      <span className="font-semibold"> {storyMetrics.hoursPerProviderPerWeek} extra hours per week</span> still 
                      spent on documentation instead of patients — or life.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {storyMetrics.utilizationGapEncounters > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827]">{dynamicMessaging.utilizationTitle}</h3>
                  <p className="text-sm text-[#6B7280]">{dynamicMessaging.utilizationSubtitle}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-blue-600">{storyMetrics.utilizationGapEncounters.toLocaleString()}</span>
                    <span className="text-lg text-[#6B7280]">encounters per year</span>
                  </div>
                  <p className="text-sm text-[#6B7280] mt-1">
                    where there's <span className="font-semibold text-[#111827]">opportunity for AI assistance</span>
                  </p>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-800">
                    You're at <span className="font-semibold">{inputs.utilization}% utilization</span>. 
                    Top performers reach <span className="font-semibold">{ABRIDGE_BENCHMARKS.utilization}%</span>.
                    {' '}{dynamicMessaging.utilizationContext}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {storyMetrics.wrvuGapPercent > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827]">{dynamicMessaging.wrvuTitle}</h3>
                  <p className="text-sm text-[#6B7280]">{dynamicMessaging.wrvuSubtitle}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-emerald-600">+{inputs.wrvuLift || 0}%</span>
                    <span className="text-lg text-[#6B7280]">wRVU lift</span>
                  </div>
                  <p className="text-sm text-[#6B7280] mt-1">
                    vs. <span className="font-semibold text-[#111827]">+{ABRIDGE_BENCHMARKS.wrvuLift}%</span> for top performers
                  </p>
                </div>
                
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-sm text-emerald-800">
                    {dynamicMessaging.wrvuContext}
                    {' '}The <span className="font-semibold">{storyMetrics.wrvuGapPercent} percentage point gap</span> represents 
                    services rendered but not fully captured.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {storyMetrics.satisfactionGap > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827]">{dynamicMessaging.satisfactionTitle}</h3>
                  <p className="text-sm text-[#6B7280]">{dynamicMessaging.satisfactionSubtitle}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-amber-600">{inputs.satisfaction || 0}%</span>
                    <span className="text-lg text-[#6B7280]">satisfaction</span>
                  </div>
                  <p className="text-sm text-[#6B7280] mt-1">
                    vs. <span className="font-semibold text-[#111827]">{ABRIDGE_BENCHMARKS.satisfaction}%</span> at top-performing organizations
                  </p>
                </div>
                
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-sm text-amber-800">
                    {dynamicMessaging.satisfactionContext}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {storyMetrics.afterHoursTotal > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Moon className="w-7 h-7 text-indigo-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">After-Hours Documentation</h3>
              <p className="text-indigo-200">
                Your providers are currently spending <span className="font-semibold text-white">{inputs.afterHoursPerWeek} hours per week</span> charting 
                after hours. That's <span className="font-semibold text-white">{storyMetrics.afterHoursTotal} hours per year</span> of 
                documentation time that could be reduced — time that could be returned to your providers.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <p className="text-[#374151]">
          <span className="font-semibold">These patterns are common across the industry.</span>
          <br className="hidden md:block" />
          <span className="text-[#6B7280]">Most organizations experience similar challenges. Let's explore what's driving these outcomes.</span>
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
