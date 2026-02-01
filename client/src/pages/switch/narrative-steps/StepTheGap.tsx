import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Users, TrendingUp, Coffee, Moon } from "lucide-react";
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
  
  const getPerformanceTier = (score: number) => {
    if (score >= 95) return { tier: 'benchmark', label: 'Benchmark Level' };
    if (score >= 85) return { tier: 'strong', label: 'Strong Performance' };
    if (score >= 70) return { tier: 'moderate', label: 'Opportunity Ahead' };
    if (score >= 55) return { tier: 'developing', label: 'Untapped Potential' };
    if (score >= 40) return { tier: 'emerging', label: 'Value Left Behind' };
    return { tier: 'explore', label: 'Explore Your Options' };
  };
  
  const performanceInfo = getPerformanceTier(calculations.realizationScore);
  const performanceTier = performanceInfo.tier;
  
  const dynamicMessaging = useMemo(() => {
    const tier = performanceTier;
    
    return {
      headerSubtitle: tier === 'benchmark' || tier === 'strong'
        ? "At your maturity level, the remaining opportunity lies in edge cases and compounding micro-efficiencies."
        : tier === 'moderate'
        ? "Your foundation is solid. The path forward requires identifying which specific levers are underperforming."
        : tier === 'developing'
        ? "This gap is common at your stage. Understanding what's driving it is the first step to closing it."
        : "A gap this size typically signals systemic issues — but also significant upside when addressed.",
      
      sectionTitle: tier === 'benchmark' || tier === 'strong'
        ? "Where the remaining opportunity lives"
        : tier === 'moderate'
        ? "Breaking down your performance gap"
        : "What this opportunity looks like in practice",
      sectionSubtitle: tier === 'benchmark' || tier === 'strong'
        ? "Small percentages, but meaningful when multiplied across your organization."
        : tier === 'moderate'
        ? "Four dimensions worth examining more closely."
        : "These aren't abstract numbers — they translate directly to hours, encounters, and revenue.",
      
      timeTitle: tier === 'strong' || tier === 'benchmark' 
        ? "Residual Time Cost" 
        : tier === 'moderate' 
        ? "Time Leakage" 
        : "Documentation Burden",
      timeSubtitle: tier === 'strong' || tier === 'benchmark'
        ? "Hours that could still be recovered"
        : tier === 'moderate'
        ? "Time slipping through workflow gaps"
        : "The hidden cost of incomplete automation",
      timeContext: tier === 'strong' || tier === 'benchmark'
        ? "Even optimized workflows have friction points. Common culprits: pre-charting, order entry, and result follow-up."
        : tier === 'moderate'
        ? "Mid-range efficiency often means AI handles the note, but ancillary tasks still eat time. Look at what happens before and after the visit."
        : "Documentation burden compounds. Every extra minute per visit becomes hours per week, weeks per year. This is where burnout starts.",
      
      utilizationTitle: tier === 'strong' || tier === 'benchmark'
        ? "Coverage Edge Cases"
        : tier === 'moderate'
        ? "Adoption Variability"
        : "Utilization Gap",
      utilizationSubtitle: tier === 'strong' || tier === 'benchmark'
        ? "Encounters still falling through"
        : tier === 'moderate'
        ? "Why some providers use it more than others"
        : "Where AI isn't being used",
      utilizationContext: tier === 'strong' || tier === 'benchmark'
        ? "High performers still see gaps in specific scenarios: same-day add-ons, procedures, or cross-coverage. Worth auditing."
        : tier === 'moderate'
        ? "Variability usually clusters by specialty, site, or tenure. Newer providers and procedural specialties often lag. Targeted support helps."
        : "Low utilization rarely means the tool doesn't work — it usually means workflow friction, training gaps, or specialty-specific barriers.",
      
      wrvuTitle: tier === 'strong' || tier === 'benchmark'
        ? "Capture Precision"
        : tier === 'moderate'
        ? "Revenue Gap"
        : "Coding Leakage",
      wrvuSubtitle: tier === 'strong' || tier === 'benchmark'
        ? "Fine-tuning documentation accuracy"
        : tier === 'moderate'
        ? "Value not making it to the claim"
        : "Work done but not captured",
      wrvuContext: tier === 'strong' || tier === 'benchmark'
        ? "At high lift levels, remaining gains come from E&M leveling accuracy and capturing time-based billing. Specialty-specific tuning pays off here."
        : tier === 'moderate'
        ? "Common patterns: under-documented complexity, missed chronic conditions, incomplete procedure details. Review denials for clues."
        : "Every 1% wRVU lift gap means you're providing care that isn't being credited. This isn't about upcoding — it's about documentation completeness.",
      
      satisfactionTitle: tier === 'strong' || tier === 'benchmark'
        ? "Provider Sentiment"
        : tier === 'moderate'
        ? "Experience Friction"
        : "Burnout Signal",
      satisfactionSubtitle: tier === 'strong' || tier === 'benchmark'
        ? "Sustaining long-term adoption"
        : tier === 'moderate'
        ? "What's creating resistance"
        : "A leading indicator worth watching",
      satisfactionContext: tier === 'strong' || tier === 'benchmark'
        ? "Satisfaction above 80% typically sustains itself. Below that, regression risk increases — especially during workflow changes or new EHR updates."
        : tier === 'moderate'
        ? "60-79% satisfaction usually means the tool works, but something's off. Common issues: note formatting preferences, specialty fit, or trust in accuracy."
        : "Satisfaction below 60% correlates with higher turnover intent. Documentation burden is consistently a top-3 driver of physician burnout.",
      
      footerPrimary: tier === 'benchmark' || tier === 'strong'
        ? "Even at high performance, understanding root causes helps protect against regression."
        : tier === 'moderate'
        ? "The question isn't whether there's opportunity — it's which levers will move the needle most."
        : "These patterns don't happen by accident. Understanding the drivers is the first step to closing the gap.",
      footerSecondary: tier === 'benchmark' || tier === 'strong'
        ? "Let's look at what's behind your current performance."
        : tier === 'moderate'
        ? "Let's examine what's behind these numbers."
        : "Let's explore what's creating these outcomes.",
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
  }, [inputs]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm font-semibold text-[#EA2C00] uppercase tracking-widest mb-2">Performance Analysis</p>
        <h1 className="font-abridge uppercase text-3xl md:text-4xl font-bold text-black mb-3" data-testid="text-page-title">
          The Gap
        </h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
          {dynamicMessaging.headerSubtitle}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="text-center md:text-right md:pr-8 md:border-r md:border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Value Realization</p>
              <div className="text-8xl md:text-9xl font-bold text-black leading-none" data-testid="text-realization-score">
                {calculations.realizationScore}%
              </div>
            </div>
            
            <div className="text-center md:text-left md:pl-8">
              <div className="inline-block px-4 py-2 rounded-lg bg-[#FFF5F2] border border-[#EA2C00]/20 mb-4">
                <span className="text-sm font-bold text-[#EA2C00] uppercase tracking-wider">
                  {performanceInfo.label}
                </span>
              </div>
              <p className="text-slate-600 text-lg leading-relaxed">
                of what top-performing<br className="hidden md:block" /> organizations achieve
              </p>
            </div>
          </div>
          
          <div className="max-w-2xl mx-auto mt-10">
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-[#EA2C00] transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${calculations.realizationScore}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-slate-500">Current</span>
              <span className="text-slate-500">{gapPercentage}% <span className="text-[#EA2C00] font-semibold">opportunity</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-black mb-2">{dynamicMessaging.sectionTitle}</h2>
        <p className="text-slate-600">{dynamicMessaging.sectionSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time/Efficiency Card */}
        {storyMetrics.efficiencyGapHours > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <h3 className="font-bold text-black text-sm">{dynamicMessaging.timeTitle}</h3>
                <p className="text-xs text-slate-500">{dynamicMessaging.timeSubtitle}</p>
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-[#EA2C00] tracking-tight">{storyMetrics.efficiencyGapHours.toLocaleString()}</span>
                <span className="text-base text-slate-500">hours/year</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                That's <span className="font-semibold text-black">{storyMetrics.workWeeksLost} full work weeks</span> of provider time
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed">
                {dynamicMessaging.timeContext}
              </p>
              {storyMetrics.hoursPerProviderPerWeek > 0 && (
                <p className="text-sm font-semibold text-[#EA2C00] mt-3">
                  For your {storyMetrics.providers} providers: ~{storyMetrics.hoursPerProviderPerWeek} hours/week each.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-black rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Time Efficiency</h3>
                <p className="text-xs text-white/60">At benchmark performance</p>
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">{inputs.timeSavedPerEncounter}</span>
                <span className="text-base text-white/60">min saved/encounter</span>
              </div>
              <p className="text-sm text-white/70 mt-2">
                At or above benchmark of {ABRIDGE_BENCHMARKS.timeSavedAvg} min
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-white/10">
              <p className="text-sm text-white/70 leading-relaxed">
                <span className="font-semibold text-white">Strong performance.</span> Your time efficiency is competitive with top performers.
              </p>
            </div>
          </div>
        )}

        {/* Utilization Card */}
        {storyMetrics.utilizationGapEncounters > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <h3 className="font-bold text-black text-sm">{dynamicMessaging.utilizationTitle}</h3>
                <p className="text-xs text-slate-500">{dynamicMessaging.utilizationSubtitle}</p>
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-[#EA2C00] tracking-tight">{storyMetrics.utilizationGapEncounters.toLocaleString()}</span>
                <span className="text-base text-slate-500">encounters/year</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                where there's <span className="font-semibold text-black">opportunity for AI assistance</span>
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-[#EA2C00] bg-[#FFF5F2] px-2 py-1 rounded">{inputs.utilization}% current</span>
                <span className="text-xs text-slate-400">vs.</span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">{ABRIDGE_BENCHMARKS.utilization}% benchmark</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {dynamicMessaging.utilizationContext}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-black rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Utilization</h3>
                <p className="text-xs text-white/60">At benchmark performance</p>
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">{inputs.utilization}%</span>
                <span className="text-base text-white/60">utilization</span>
              </div>
              <p className="text-sm text-white/70 mt-2">
                At or above benchmark of {ABRIDGE_BENCHMARKS.utilization}%
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-white/10">
              <p className="text-sm text-white/70 leading-relaxed">
                <span className="font-semibold text-white">Excellent adoption.</span> Your utilization matches or exceeds top performers.
              </p>
            </div>
          </div>
        )}

        {/* wRVU/Quality Card */}
        {storyMetrics.wrvuGapPercent > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <h3 className="font-bold text-black text-sm">{dynamicMessaging.wrvuTitle}</h3>
                <p className="text-xs text-slate-500">{dynamicMessaging.wrvuSubtitle}</p>
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-[#EA2C00] tracking-tight">+{inputs.wrvuLift || 0}%</span>
                <span className="text-base text-slate-500">wRVU lift</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500">vs.</span>
                <span className="text-sm font-semibold text-black">+{ABRIDGE_BENCHMARKS.wrvuLift}%</span>
                <span className="text-xs text-slate-500">for top performers</span>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed">
                {dynamicMessaging.wrvuContext}
              </p>
              <p className="text-sm font-semibold text-[#EA2C00] mt-3">
                The {storyMetrics.wrvuGapPercent} percentage point gap represents services rendered but not fully captured.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-black rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Revenue Capture</h3>
                <p className="text-xs text-white/60">At benchmark performance</p>
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">+{inputs.wrvuLift || 0}%</span>
                <span className="text-base text-white/60">wRVU lift</span>
              </div>
              <p className="text-sm text-white/70 mt-2">
                At or above benchmark of +{ABRIDGE_BENCHMARKS.wrvuLift}%
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-white/10">
              <p className="text-sm text-white/70 leading-relaxed">
                <span className="font-semibold text-white">Strong revenue capture.</span> Your documentation is driving wRVU lift at or above benchmark levels.
              </p>
            </div>
          </div>
        )}

        {/* Satisfaction Card */}
        {storyMetrics.satisfactionGap > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                <Coffee className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <h3 className="font-bold text-black text-sm">{dynamicMessaging.satisfactionTitle}</h3>
                <p className="text-xs text-slate-500">{dynamicMessaging.satisfactionSubtitle}</p>
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-[#EA2C00] tracking-tight">{inputs.satisfaction || 0}%</span>
                <span className="text-base text-slate-500">satisfaction</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500">vs.</span>
                <span className="text-sm font-semibold text-black">{ABRIDGE_BENCHMARKS.satisfaction}%</span>
                <span className="text-xs text-slate-500">at top-performing organizations</span>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed">
                {dynamicMessaging.satisfactionContext}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-black rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Coffee className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Provider Satisfaction</h3>
                <p className="text-xs text-white/60">At benchmark performance</p>
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-white tracking-tight">{inputs.satisfaction || 0}%</span>
                <span className="text-base text-white/60">satisfaction</span>
              </div>
              <p className="text-sm text-white/70 mt-2">
                At or above benchmark of {ABRIDGE_BENCHMARKS.satisfaction}%
              </p>
            </div>
            <div className="mt-auto pt-4 border-t border-white/10">
              <p className="text-sm text-white/70 leading-relaxed">
                <span className="font-semibold text-white">Providers are happy.</span> High satisfaction drives sustained adoption and protects against turnover.
              </p>
            </div>
          </div>
        )}
      </div>

      {storyMetrics.afterHoursTotal > 0 && (
        <div className="bg-slate-100 rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
              <Moon className="w-7 h-7 text-[#EA2C00]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">After-Hours Documentation</p>
              <p className="text-slate-700 text-lg">
                <span className="font-bold text-[#EA2C00]">{inputs.afterHoursPerWeek} hours/week</span> charting after hours
                <span className="text-slate-500"> — that's </span>
                <span className="font-bold text-[#EA2C00]">{storyMetrics.afterHoursTotal.toLocaleString()} hours/year</span>
                <span className="text-slate-500"> that could be reduced.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <p className="text-slate-700">
          <span className="font-semibold text-black">{dynamicMessaging.footerPrimary}</span>
          <br className="hidden md:block" />
          <span className="text-slate-600">{dynamicMessaging.footerSecondary}</span>
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
          className="bg-black hover:bg-black/90 text-white gap-2 rounded-full px-6"
          data-testid="button-next"
        >
          Why This Happens
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
