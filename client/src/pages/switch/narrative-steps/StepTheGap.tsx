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
    
    return {
      // Header messaging
      headerSubtitle: tier === 'strong' 
        ? "You're already performing well — let's see where to fine-tune."
        : tier === 'moderate'
        ? "You've built a solid foundation. Here's where to level up."
        : tier === 'developing'
        ? "There's meaningful opportunity here. Let's break it down."
        : "Based on what you shared, here's what we see.",
      
      // Time card
      timeTitle: tier === 'strong' ? "Time You Could Reclaim" : tier === 'moderate' ? "Time Still on the Table" : "Time That Disappears",
      timeSubtitle: tier === 'strong' ? "Room for further optimization" : tier === 'moderate' ? "Hours that could go back to your team" : "Hours your team isn't getting back",
      
      // Utilization card  
      utilizationTitle: tier === 'strong' ? "Utilization Fine-Tuning" : tier === 'moderate' ? "Utilization Opportunity" : "Encounters Left Behind",
      utilizationSubtitle: tier === 'strong' ? "Nearly there — small gains available" : tier === 'moderate' ? "Visits that could benefit from AI" : "Patient visits without AI assistance",
      utilizationContext: tier === 'strong'
        ? "You're close to benchmark. A small push could close this gap entirely."
        : tier === 'moderate'
        ? "Solid utilization, but there's room to extend coverage to more encounters."
        : "Moving to higher utilization means more consistent documentation across all visits.",
      
      // wRVU card
      wrvuTitle: tier === 'strong' ? "Capture Optimization" : tier === 'moderate' ? "Documentation Quality" : "Documentation Quality",
      wrvuSubtitle: tier === 'strong' ? "Fine-tuning capture accuracy" : "The gap in capture accuracy",
      wrvuContext: tier === 'strong'
        ? "You're seeing solid lift. Specialty-specific tuning could unlock the last bit of value."
        : tier === 'moderate'
        ? "Good capture, but refinement could mean more complete documentation of the care you're already providing."
        : "Better documentation means more complete capture of the care you're already providing.",
      
      // Satisfaction card
      satisfactionTitle: tier === 'strong' ? "Provider Experience" : tier === 'moderate' ? "The Provider Experience" : "The Provider Experience",
      satisfactionSubtitle: tier === 'strong' ? "Keeping your team engaged" : "How your team feels about documentation",
      satisfactionContext: tier === 'strong'
        ? "Strong satisfaction drives sustained adoption. Keep building on this momentum."
        : tier === 'moderate'
        ? "Satisfaction is growing. Continued optimization will help cement adoption."
        : "Satisfaction isn't just a feeling — it's a leading indicator of retention, burnout risk, and willingness to embrace new workflows.",
    };
  }, [performanceTier]);
  
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

      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 md:p-12 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Score */}
            <div className="text-center md:text-right md:pr-8 md:border-r md:border-white/10">
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">Value Realization</p>
              <div className="text-8xl md:text-9xl font-bold text-white leading-none" data-testid="text-realization-score">
                {calculations.realizationScore}%
              </div>
            </div>
            
            {/* Right: Label & Context */}
            <div className="text-center md:text-left md:pl-8">
              <div className={`inline-block px-3 py-1.5 rounded-md ${performanceInfo.bgColor} mb-3`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${performanceInfo.color}`}>
                  {performanceInfo.label}
                </span>
              </div>
              <p className="text-slate-300 text-lg leading-relaxed">
                of what top-performing<br className="hidden md:block" /> organizations achieve
              </p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="max-w-2xl mx-auto mt-10">
            <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${calculations.realizationScore}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-500">
              <span>Current</span>
              <span className="text-amber-400/80">{gapPercentage}% opportunity</span>
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
