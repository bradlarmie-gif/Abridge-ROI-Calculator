import { ArrowRight, ArrowLeft, Target, Award, CheckCircle, BarChart3, Clock, DollarSign, Smile, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type SwitchInputs, type SwitchCalculations } from "@/lib/switchGapCalculator";

interface StepWhatGoodLooksLikeProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
}

interface DimensionMeterProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  currentValue: number;
  rangeMin: number;
  rangeMax: number;
  unit: string;
  prefix?: string;
  maxScale: number;
  context: string;
  caveat?: string;
}

function DimensionMeter({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  currentValue,
  rangeMin,
  rangeMax,
  unit,
  prefix = "",
  maxScale,
  context,
  caveat,
}: DimensionMeterProps) {
  const currentPercent = Math.min(100, Math.max(0, (currentValue / maxScale) * 100));
  const rangeMinPercent = (rangeMin / maxScale) * 100;
  const rangeMaxPercent = Math.min(100, (rangeMax / maxScale) * 100);
  
  const isInRange = currentValue >= rangeMin && currentValue <= rangeMax;
  const isBelowRange = currentValue < rangeMin;
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 flex items-center gap-2">
          <h3 className="font-bold text-[#111827]">{label}</h3>
          {caveat && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm">
                {caveat}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="relative mb-8">
        <div className="h-3 bg-slate-100 rounded-full">
          <div 
            className="absolute h-full rounded-full"
            style={{ 
              background: 'linear-gradient(to right, #F07B5F, #EA2C00)',
              left: `${rangeMinPercent}%`, 
              width: `${rangeMaxPercent - rangeMinPercent}%` 
            }}
          />
          
          <div 
            className={`absolute top-1/2 w-5 h-5 rounded-full border-[3px] border-white shadow-lg transition-all z-10 ${
              isBelowRange ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ left: `${currentPercent}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        
        <div 
          className={`absolute -bottom-6 text-sm font-bold whitespace-nowrap ${
            isBelowRange ? 'text-amber-600' : 'text-emerald-600'
          }`}
          style={{ 
            left: `${currentPercent}%`, 
            transform: 'translateX(-50%)' 
          }}
        >
          {prefix}{currentValue}{unit}
        </div>
        
        <div 
          className="absolute -top-6 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded whitespace-nowrap"
          style={{ 
            left: `${(rangeMinPercent + rangeMaxPercent) / 2}%`, 
            transform: 'translateX(-50%)' 
          }}
        >
          {prefix}{rangeMin}–{rangeMax}{unit}
        </div>
      </div>

      <div className="mt-4">
        {isBelowRange && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">The opportunity:</span> {context}
            </p>
          </div>
        )}
        
        {isInRange && (
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-sm text-emerald-800">
              <span className="font-semibold">You're in the zone.</span> This dimension is performing well.
            </p>
          </div>
        )}
        
        {!isBelowRange && !isInRange && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Above benchmark.</span> You're exceeding typical performance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StepWhatGoodLooksLike({
  inputs,
  calculations,
  onNext,
  onBack,
}: StepWhatGoodLooksLikeProps) {
  const dimensions = [
    {
      icon: BarChart3,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      label: "Utilization",
      currentValue: inputs.utilization || 0,
      rangeMin: 70,
      rangeMax: 84,
      unit: "%",
      maxScale: 100,
      context: "Moving to 70%+ means thousands more documented encounters per year."
    },
    {
      icon: Clock,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      label: "Time Saved",
      currentValue: inputs.timeSavedPerEncounter || 0,
      rangeMin: 2.7,
      rangeMax: 4.1,
      unit: " min",
      maxScale: 6,
      context: "Each additional minute saved compounds across your entire organization."
    },
    {
      icon: DollarSign,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      label: "wRVU Lift",
      currentValue: inputs.wrvuLift || 0,
      rangeMin: 4.5,
      rangeMax: 8,
      unit: "%",
      prefix: "+",
      maxScale: 12,
      context: "Better documentation captures the complexity of care you're already providing.",
      caveat: "wRVU lift depends on baseline documentation quality. Higher lift often indicates room for improvement in prior documentation. Lower lift with already-strong documentation is equally healthy."
    },
    {
      icon: Smile,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      label: "Provider Satisfaction",
      currentValue: inputs.satisfaction || 0,
      rangeMin: 79,
      rangeMax: 92,
      unit: "%",
      maxScale: 100,
      context: "When providers love the tool, adoption follows. Satisfaction drives utilization."
    },
  ];

  const belowRangeCount = dimensions.filter(d => d.currentValue < d.rangeMin).length;
  const inRangeCount = dimensions.filter(d => d.currentValue >= d.rangeMin).length;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          What Good Looks Like
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          These aren't aspirational targets. They're achievable ranges 
          <br className="hidden md:block" />
          based on mature implementations.
        </p>
      </div>

      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden">
        {/* Top section - Stats */}
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Your Position vs. Top Performers</h3>
              <p className="text-slate-400 text-sm">See where you stand — and what's within reach</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <p className="text-slate-400 text-sm mb-2">Dimensions in range</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-emerald-400">{inRangeCount}</span>
                <span className="text-slate-400">of 4</span>
              </div>
            </div>
            
            {belowRangeCount > 0 && (
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <p className="text-slate-400 text-sm mb-2">Opportunity areas</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-amber-400">{belowRangeCount}</span>
                  <span className="text-slate-400">dimension{belowRangeCount > 1 ? 's' : ''} below benchmark</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom section - Context */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 px-6 md:px-8 py-4 border-t border-white/10">
          <p className="text-emerald-300 text-sm">
            <span className="font-medium">The highlighted zones</span> show where mature implementations land. These aren't aspirational — they're achievable.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dimensions.map((dimension) => (
          <DimensionMeter
            key={dimension.label}
            {...dimension}
          />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#111827] mb-2">What makes the difference</h3>
            <p className="text-[#6B7280] mb-4">
              Organizations in these ranges share common traits: dedicated implementation support, 
              specialty-specific customization, continuous optimization, and technology purpose-built 
              for clinical workflows.
            </p>
            <div className="flex flex-wrap gap-2">
              {["90-day guided onboarding", "Specialty customization", "Ongoing success support", "Real-time analytics"].map((trait) => (
                <span 
                  key={trait}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-full"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>
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
          See the Math
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
