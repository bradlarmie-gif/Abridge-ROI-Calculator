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
    const gapSize = 100 - calculations.realizationScore;
    
    return {
      // Header messaging - set the strategic frame
      headerSubtitle: tier === 'benchmark' || tier === 'strong'
        ? "At your maturity level, the remaining opportunity lies in edge cases and compounding micro-efficiencies."
        : tier === 'moderate'
        ? "Your foundation is solid. The path forward requires identifying which specific levers are underperforming."
        : tier === 'developing'
        ? "This gap is common at your stage. Understanding what's driving it is the first step to closing it."
        : "A gap this size typically signals systemic issues — but also significant upside when addressed.",
      
      // Section header - tier-specific framing
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
      
      // Time card - practical education on documentation burden
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
      
      // Utilization card - educate on what drives adoption gaps
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
      
      // wRVU card - educate on revenue capture mechanics
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
      
      // Satisfaction card - educate on the burnout-retention link
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
      
      // Footer - tier-specific next step framing
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
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#EA2C00] to-[#F07B5F] transition-all duration-1000 ease-out rounded-full"
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
        <h2 className="text-xl font-bold text-[#111827] mb-2">{dynamicMessaging.sectionTitle}</h2>
        <p className="text-[#6B7280]">{dynamicMessaging.sectionSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {storyMetrics.efficiencyGapHours > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#EA2C00]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#EA2C00]/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#EA2C00]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827]">{dynamicMessaging.timeTitle}</h3>
                  <p className="text-sm text-[#6B7280]">{dynamicMessaging.timeSubtitle}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-[#EA2C00]">{storyMetrics.efficiencyGapHours.toLocaleString()}</span>
                    <span className="text-lg text-[#6B7280]">hours per year</span>
                  </div>
                  <p className="text-sm text-[#6B7280] mt-1">
                    That's <span className="font-semibold text-[#111827]">{storyMetrics.workWeeksLost} full work weeks</span> of provider time
                  </p>
                </div>
                
                <div className="p-3 bg-[#EA2C00]/5 rounded-lg border border-[#EA2C00]/20">
                  <p className="text-sm text-[#7f1d1d]">
                    {dynamicMessaging.timeContext}
                    {storyMetrics.hoursPerProviderPerWeek > 0 && (
                      <span className="block mt-2 font-medium">
                        For your {storyMetrics.providers} providers: ~{storyMetrics.hoursPerProviderPerWeek} hours/week each.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {storyMetrics.utilizationGapEncounters > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F07B5F]/15 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F07B5F]/15 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#EA2C00]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827]">{dynamicMessaging.utilizationTitle}</h3>
                  <p className="text-sm text-[#6B7280]">{dynamicMessaging.utilizationSubtitle}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-[#EA2C00]">{storyMetrics.utilizationGapEncounters.toLocaleString()}</span>
                    <span className="text-lg text-[#6B7280]">encounters per year</span>
                  </div>
                  <p className="text-sm text-[#6B7280] mt-1">
                    where there's <span className="font-semibold text-[#111827]">opportunity for AI assistance</span>
                  </p>
                </div>
                
                <div className="p-3 bg-[#F07B5F]/10 rounded-lg border border-[#F07B5F]/25">
                  <p className="text-sm text-[#7f1d1d]">
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
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#EA2C00]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#EA2C00]/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#EA2C00]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827]">{dynamicMessaging.wrvuTitle}</h3>
                  <p className="text-sm text-[#6B7280]">{dynamicMessaging.wrvuSubtitle}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-[#EA2C00]">+{inputs.wrvuLift || 0}%</span>
                    <span className="text-lg text-[#6B7280]">wRVU lift</span>
                  </div>
                  <p className="text-sm text-[#6B7280] mt-1">
                    vs. <span className="font-semibold text-[#111827]">+{ABRIDGE_BENCHMARKS.wrvuLift}%</span> for top performers
                  </p>
                </div>
                
                <div className="p-3 bg-[#EA2C00]/5 rounded-lg border border-[#EA2C00]/20">
                  <p className="text-sm text-[#7f1d1d]">
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
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F07B5F]/15 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F07B5F]/15 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-[#EA2C00]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827]">{dynamicMessaging.satisfactionTitle}</h3>
                  <p className="text-sm text-[#6B7280]">{dynamicMessaging.satisfactionSubtitle}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-[#EA2C00]">{inputs.satisfaction || 0}%</span>
                    <span className="text-lg text-[#6B7280]">satisfaction</span>
                  </div>
                  <p className="text-sm text-[#6B7280] mt-1">
                    vs. <span className="font-semibold text-[#111827]">{ABRIDGE_BENCHMARKS.satisfaction}%</span> at top-performing organizations
                  </p>
                </div>
                
                <div className="p-3 bg-[#F07B5F]/10 rounded-lg border border-[#F07B5F]/25">
                  <p className="text-sm text-[#7f1d1d]">
                    {dynamicMessaging.satisfactionContext}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {storyMetrics.afterHoursTotal > 0 && (
        <div className="bg-black rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Moon className="w-7 h-7 text-white/70" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">After-Hours Documentation</h3>
              <p className="text-white/80">
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
          <span className="font-semibold">{dynamicMessaging.footerPrimary}</span>
          <br className="hidden md:block" />
          <span className="text-[#6B7280]">{dynamicMessaging.footerSecondary}</span>
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
