import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Users, TrendingUp, Heart, Moon } from "lucide-react";
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
        ? "Mid-range efficiency often means AI handles the note, but ancillary tasks still eat time."
        : "Documentation burden compounds. Every extra minute per visit becomes hours per week.",
      
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
        ? "High performers still see gaps in specific scenarios: same-day add-ons, procedures, or cross-coverage."
        : tier === 'moderate'
        ? "Variability usually clusters by specialty, site, or tenure. Targeted support helps."
        : "Low utilization rarely means the tool doesn't work — it usually means workflow friction.",
      
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
        ? "Remaining gains come from E&M leveling accuracy and time-based billing."
        : tier === 'moderate'
        ? "Common patterns: under-documented complexity, missed chronic conditions."
        : "Every 1% wRVU lift gap means you're providing care that isn't being credited.",
      
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
        ? "Satisfaction above 80% typically sustains itself. Below that, regression risk increases."
        : tier === 'moderate'
        ? "60-79% satisfaction usually means the tool works, but something's off."
        : "Satisfaction below 60% correlates with higher turnover intent.",
      
      footerPrimary: tier === 'benchmark' || tier === 'strong'
        ? "Even at high performance, understanding root causes helps protect against regression."
        : tier === 'moderate'
        ? "The question isn't whether there's opportunity — it's which levers will move the needle most."
        : "These patterns don't happen by accident. Understanding the drivers is the first step to closing the gap.",
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
      {/* Header */}
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2" data-testid="text-page-title">
          The Gap
        </h1>
        <p className="text-base text-[#6B7280]">
          {dynamicMessaging.headerSubtitle}
        </p>
      </div>

      {/* Value Realization Hero */}
      <section className="bg-[#F5F0EB] rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="border-l-4 border-[#EA2C00] pl-5">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              VALUE REALIZATION
            </p>
            <div className="text-5xl md:text-6xl font-bold text-black leading-none" data-testid="text-realization-score">
              {calculations.realizationScore}%
            </div>
            <p className="text-sm text-[#6B7280] mt-2">
              of what top-performing organizations achieve
            </p>
          </div>
          
          <div className="text-left md:text-right">
            <span className="inline-block px-4 py-2 rounded-lg bg-white border border-[#E5E7EB] text-sm font-semibold text-black">
              {performanceInfo.label}
            </span>
            <p className="text-sm text-[#EA2C00] font-semibold mt-3">
              {gapPercentage}% opportunity remaining
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="relative h-2 bg-white rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-[#EA2C00] transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${calculations.realizationScore}%` }}
            />
          </div>
        </div>
      </section>

      {/* Section Title */}
      <div className="text-left">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
          PERFORMANCE BREAKDOWN
        </p>
        <h2 className="text-xl font-bold text-black">{dynamicMessaging.sectionTitle}</h2>
        <p className="text-sm text-[#6B7280] mt-1">{dynamicMessaging.sectionSubtitle}</p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Time/Efficiency Card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <div>
              <h3 className="font-semibold text-black text-sm">{dynamicMessaging.timeTitle}</h3>
              <p className="text-xs text-[#888888]">{dynamicMessaging.timeSubtitle}</p>
            </div>
          </div>
          
          {storyMetrics.efficiencyGapHours > 0 ? (
            <>
              <div className="border-l-4 border-[#EA2C00] pl-4 mb-4">
                <span className="text-3xl md:text-4xl font-bold text-[#EA2C00]">{storyMetrics.efficiencyGapHours.toLocaleString()}</span>
                <span className="text-sm text-[#888888] ml-2">hours/year</span>
              </div>
              <p className="text-sm text-[#6B7280]">
                That's <span className="font-semibold text-black">{storyMetrics.workWeeksLost} full work weeks</span> of provider time
              </p>
              <p className="text-xs text-[#888888] mt-2">{dynamicMessaging.timeContext}</p>
            </>
          ) : (
            <div className="border-l-4 border-green-500 pl-4">
              <span className="text-2xl font-bold text-green-600">At benchmark</span>
              <p className="text-sm text-[#6B7280] mt-1">Your time efficiency is performing well.</p>
            </div>
          )}
        </div>

        {/* Utilization Card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <div>
              <h3 className="font-semibold text-black text-sm">{dynamicMessaging.utilizationTitle}</h3>
              <p className="text-xs text-[#888888]">{dynamicMessaging.utilizationSubtitle}</p>
            </div>
          </div>
          
          {storyMetrics.utilizationGapEncounters > 0 ? (
            <>
              <div className="border-l-4 border-[#EA2C00] pl-4 mb-4">
                <span className="text-3xl md:text-4xl font-bold text-[#EA2C00]">{storyMetrics.utilizationGapEncounters.toLocaleString()}</span>
                <span className="text-sm text-[#888888] ml-2">encounters/year</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-[#EA2C00] bg-[#FFF5F2] px-2 py-1 rounded">{inputs.utilization}% current</span>
                <span className="text-xs text-[#888888]">vs.</span>
                <span className="text-xs font-semibold text-black bg-[#F5F0EB] px-2 py-1 rounded">{ABRIDGE_BENCHMARKS.utilization}% benchmark</span>
              </div>
              <p className="text-xs text-[#888888] mt-2">{dynamicMessaging.utilizationContext}</p>
            </>
          ) : (
            <div className="border-l-4 border-green-500 pl-4">
              <span className="text-2xl font-bold text-green-600">At benchmark</span>
              <p className="text-sm text-[#6B7280] mt-1">Your utilization is at or above benchmark.</p>
            </div>
          )}
        </div>

        {/* wRVU/Quality Card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <div>
              <h3 className="font-semibold text-black text-sm">{dynamicMessaging.wrvuTitle}</h3>
              <p className="text-xs text-[#888888]">{dynamicMessaging.wrvuSubtitle}</p>
            </div>
          </div>
          
          {storyMetrics.wrvuGapPercent > 0 ? (
            <>
              <div className="border-l-4 border-[#EA2C00] pl-4 mb-4">
                <span className="text-3xl md:text-4xl font-bold text-[#EA2C00]">+{inputs.wrvuLift || 0}%</span>
                <span className="text-sm text-[#888888] ml-2">wRVU lift</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[#888888]">vs.</span>
                <span className="text-sm font-semibold text-black">+{ABRIDGE_BENCHMARKS.wrvuLift}%</span>
                <span className="text-xs text-[#888888]">for top performers</span>
              </div>
              <p className="text-xs text-[#888888] mt-2">{dynamicMessaging.wrvuContext}</p>
            </>
          ) : (
            <div className="border-l-4 border-green-500 pl-4">
              <span className="text-2xl font-bold text-green-600">At benchmark</span>
              <p className="text-sm text-[#6B7280] mt-1">Your wRVU lift is performing well.</p>
            </div>
          )}
        </div>

        {/* Satisfaction Card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <div>
              <h3 className="font-semibold text-black text-sm">{dynamicMessaging.satisfactionTitle}</h3>
              <p className="text-xs text-[#888888]">{dynamicMessaging.satisfactionSubtitle}</p>
            </div>
          </div>
          
          {storyMetrics.satisfactionGap > 0 ? (
            <>
              <div className="border-l-4 border-[#EA2C00] pl-4 mb-4">
                <span className="text-3xl md:text-4xl font-bold text-[#EA2C00]">{inputs.satisfaction || 0}%</span>
                <span className="text-sm text-[#888888] ml-2">satisfaction</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[#888888]">vs.</span>
                <span className="text-sm font-semibold text-black">{ABRIDGE_BENCHMARKS.satisfaction}%</span>
                <span className="text-xs text-[#888888]">at top performers</span>
              </div>
              <p className="text-xs text-[#888888] mt-2">{dynamicMessaging.satisfactionContext}</p>
            </>
          ) : (
            <div className="border-l-4 border-green-500 pl-4">
              <span className="text-2xl font-bold text-green-600">At benchmark</span>
              <p className="text-sm text-[#6B7280] mt-1">Provider satisfaction is strong.</p>
            </div>
          )}
        </div>
      </div>

      {/* After-Hours Section */}
      {storyMetrics.afterHoursTotal > 0 && (
        <section className="bg-[#F5F0EB] rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <Moon className="w-6 h-6 text-[#888888]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
                PAJAMA TIME
              </p>
              <p className="text-base text-black">
                <span className="font-bold text-[#EA2C00]">{storyMetrics.afterHoursTotal.toLocaleString()} hours/year</span> spent charting at home
              </p>
              <p className="text-sm text-[#6B7280] mt-1">
                {inputs.afterHoursPerWeek} hours/week × {storyMetrics.providers} providers × 52 weeks
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Footer Insight */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <p className="text-sm text-[#6B7280]">
          <span className="font-semibold text-black">The bottom line:</span> {dynamicMessaging.footerPrimary}
        </p>
      </section>

      {/* Navigation */}
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
          See the Benchmarks
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
