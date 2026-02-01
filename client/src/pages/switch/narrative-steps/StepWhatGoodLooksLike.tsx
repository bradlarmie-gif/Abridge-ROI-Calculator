import { ArrowRight, ArrowLeft, Target, CheckCircle, BarChart3, Clock, DollarSign, Smile, Info } from "lucide-react";
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
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[#EA2C00]" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-black">{label}</h3>
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
        
        <div className="text-right">
          <span className={`text-3xl font-bold ${isBelowRange ? 'text-[#EA2C00]' : 'text-black'}`}>
            {prefix}{currentValue}{unit}
          </span>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Your Value</p>
        </div>
      </div>

      <div className="relative mb-3">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="absolute h-full bg-[#EA2C00] rounded-full"
            style={{ 
              left: `${rangeMinPercent}%`, 
              width: `${rangeMaxPercent - rangeMinPercent}%` 
            }}
          />
          
          <div 
            className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all z-10 bg-black"
            style={{ left: `${currentPercent}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-slate-500 mb-4">
        <span>0{unit}</span>
        <span className="px-2 py-1 bg-[#FFF5F2] text-[#EA2C00] font-semibold rounded">
          Benchmark: {prefix}{rangeMin}–{rangeMax}{unit}
        </span>
        <span>{maxScale}{unit}</span>
      </div>

      {isBelowRange && (
        <div className="p-3 bg-[#FFF5F2] rounded-lg border border-[#EA2C00]/10">
          <p className="text-sm text-[#111827]">
            <span className="font-semibold text-[#EA2C00]">Opportunity:</span> {context}
          </p>
        </div>
      )}
      
      {isInRange && (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-black">In range.</span> This dimension is performing well.
          </p>
        </div>
      )}
      
      {!isBelowRange && !isInRange && (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-black">Above benchmark.</span> Exceeding typical performance.
          </p>
        </div>
      )}
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
        <p className="text-sm font-semibold text-[#EA2C00] uppercase tracking-widest mb-2">Performance Benchmarks</p>
        <h1 className="font-abridge uppercase text-3xl md:text-4xl font-bold text-black mb-3" data-testid="text-page-title">
          What Good Looks Like
        </h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
          These aren't aspirational targets. They're achievable ranges based on mature implementations.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                  <Target className="w-6 h-6 text-[#EA2C00]" />
                </div>
                <h3 className="font-bold text-black text-xl">Your Position</h3>
              </div>
              <p className="text-slate-600">
                See where you stand against top performers — and what's within reach.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-5 text-center border border-slate-100">
                <span className={`text-5xl font-bold block ${inRangeCount > 0 ? 'text-black' : 'text-[#EA2C00]'}`}>
                  {inRangeCount}
                </span>
                <p className="text-sm text-slate-600 mt-2 font-medium">In Range</p>
                <p className="text-xs text-slate-400">of 4 dimensions</p>
              </div>
              
              <div className={`rounded-xl p-5 text-center border ${
                belowRangeCount > 0 
                  ? 'bg-[#FFF5F2] border-[#EA2C00]/20' 
                  : 'bg-slate-50 border-slate-100'
              }`}>
                <span className={`text-5xl font-bold block ${
                  belowRangeCount > 0 ? 'text-[#EA2C00]' : 'text-black'
                }`}>
                  {belowRangeCount}
                </span>
                <p className={`text-sm mt-2 font-medium ${
                  belowRangeCount > 0 ? 'text-[#EA2C00]' : 'text-slate-600'
                }`}>
                  {belowRangeCount > 0 ? 'Opportunities' : 'Below Range'}
                </p>
                <p className="text-xs text-slate-400">to improve</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-[#FFF5F2] px-6 md:px-8 py-4 border-t border-[#EA2C00]/10">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-[#EA2C00]">The highlighted zones</span> show where mature implementations land. These aren't aspirational — they're achievable.
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

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0">
              <img 
                src="/attached_assets/abridge-logo-symbol-red_1769928015851.png" 
                alt="Abridge" 
                className="w-10 h-10"
              />
            </div>
            
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-1">Why It Matters</p>
              <h3 className="font-bold text-black text-xl mb-3">The Abridge Difference</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Top-performing organizations share something in common — technology built specifically for clinical 
                workflows, backed by dedicated implementation support and continuous optimization.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { trait: "90-day guided onboarding", desc: "Dedicated success team" },
                  { trait: "Specialty customization", desc: "Tailored to your workflows" },
                  { trait: "Ongoing optimization", desc: "Continuous improvement" },
                  { trait: "Real-time analytics", desc: "Measure what matters" }
                ].map(({ trait, desc }) => (
                  <div 
                    key={trait}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-[#EA2C00]" />
                    </div>
                    <div>
                      <p className="font-medium text-black text-sm">{trait}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
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
          className="bg-black hover:bg-black/90 text-white gap-2 rounded-full px-6"
          data-testid="button-next"
        >
          See the Math
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
