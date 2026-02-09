import { ArrowRight, ArrowLeft, Target, BarChart3, Clock, DollarSign, Heart, ClipboardList, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type SwitchInputs, type SwitchCalculations, ABRIDGE_BENCHMARKS } from "@/lib/switchGapCalculator";

interface StepWhatGoodLooksLikeProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
}

interface BenchmarkCardProps {
  icon: React.ReactNode;
  label: string;
  currentValue: number;
  benchmarkMin: number;
  benchmarkMax: number;
  unit: string;
  prefix?: string;
  maxScale: number;
  invertedScale?: boolean;
  rangeLabel?: string;
}

function BenchmarkCard({
  icon,
  label,
  currentValue,
  benchmarkMin,
  benchmarkMax,
  unit,
  prefix = "",
  maxScale,
  invertedScale = false,
  rangeLabel,
}: BenchmarkCardProps) {
  const currentPercent = Math.min(100, Math.max(0, (currentValue / maxScale) * 100));
  const benchmarkMinPercent = (benchmarkMin / maxScale) * 100;
  const benchmarkMaxPercent = Math.min(100, (benchmarkMax / maxScale) * 100);
  
  const isBelowRange = invertedScale ? currentValue > benchmarkMax : currentValue < benchmarkMin;
  const gapToRange = invertedScale ? Math.max(0, currentValue - benchmarkMax) : Math.max(0, benchmarkMin - currentValue);
  
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <h3 className="font-semibold text-[#1A1A1A] text-sm">{label}</h3>
        </div>
        
        <div className="text-right">
          <span className="text-2xl font-bold text-[#1A1A1A]">
            {prefix}{currentValue}{unit}
          </span>
          <p className="text-[10px] text-[#999999] uppercase tracking-wider">Current</p>
        </div>
      </div>

      <div className="relative mb-4">
        <div className="h-2 bg-[#F5F5F5] rounded-full relative">
          <div 
            className="absolute h-full bg-[#E0E0E0] rounded-full"
            style={{ 
              left: `${benchmarkMinPercent}%`, 
              width: `${benchmarkMaxPercent - benchmarkMinPercent}%` 
            }}
          />
          
          <div 
            className="absolute top-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md transition-all z-10 bg-[#EA2C00]"
            style={{ left: `${currentPercent}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
        
        <div className="flex justify-between items-center text-[10px] text-[#999999] mt-1.5">
          <span>0{unit}</span>
          <span>{maxScale}{unit}</span>
        </div>
        
        <div 
          className="absolute text-[10px] text-[#666666]"
          style={{ 
            left: `${(benchmarkMinPercent + benchmarkMaxPercent) / 2}%`, 
            transform: 'translateX(-50%)',
            top: '18px'
          }}
        >
          <span className="bg-[#E8E8E8] px-2 py-0.5 rounded text-[#333333] font-medium whitespace-nowrap">
            {rangeLabel || `Abridge Range: ${prefix}${benchmarkMin}–${benchmarkMax}${unit}`}
          </span>
        </div>
      </div>

      <div className="mt-8">
        {isBelowRange ? (
          <div className="p-3 bg-[#FFEBE6] rounded-lg">
            <p className="text-xs text-[#EA2C00] font-semibold">
              {Math.round(gapToRange)}{unit} gap to reach benchmark range
            </p>
          </div>
        ) : (
          <div className="p-3 bg-[#E8E8E8] rounded-lg">
            <p className="text-xs text-[#333333] font-medium">
              In Range
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
  const currentNetImpact = (inputs.timeSavedPerEncounter || 0) - (inputs.editTimePerEncounter || 0);

  const dimensions = [
    {
      icon: <BarChart3 className="w-5 h-5 text-[#EA2C00]" />,
      label: "Utilization",
      currentValue: inputs.utilization || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.utilizationMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.utilizationMax,
      unit: "%",
      maxScale: 100,
    },
    {
      icon: <Clock className="w-5 h-5 text-[#EA2C00]" />,
      label: "Net Time Impact",
      currentValue: Math.max(0, currentNetImpact),
      benchmarkMin: 3,
      benchmarkMax: 4,
      unit: " min",
      prefix: "+",
      maxScale: 6,
      rangeLabel: "Abridge Range: 3–4 min net",
    },
    {
      icon: <ClipboardList className="w-5 h-5 text-[#EA2C00]" />,
      label: "Documentation Completeness",
      currentValue: inputs.docCompleteness || 65,
      benchmarkMin: ABRIDGE_BENCHMARKS.docCompletenessMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.docCompletenessMax,
      unit: "%",
      maxScale: 100,
    },
    {
      icon: <DollarSign className="w-5 h-5 text-[#EA2C00]" />,
      label: "Coding Impact",
      currentValue: inputs.wrvuLift || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.wrvuLiftMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.wrvuLiftMax,
      unit: "%",
      prefix: "+",
      maxScale: 12,
    },
    {
      icon: <Moon className="w-5 h-5 text-[#EA2C00]" />,
      label: "After-Hours Work",
      currentValue: inputs.afterHoursPerWeek || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.afterHoursMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.afterHoursMax,
      unit: " hrs/wk",
      maxScale: 10,
      invertedScale: true,
    },
    {
      icon: <Heart className="w-5 h-5 text-[#EA2C00]" />,
      label: "Provider Satisfaction",
      currentValue: inputs.satisfaction || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.satisfactionMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.satisfactionMax,
      unit: "%",
      maxScale: 100,
    },
  ];

  const inRangeCount = dimensions.filter(d => {
    if (d.invertedScale) return d.currentValue <= d.benchmarkMax;
    return d.currentValue >= d.benchmarkMin;
  }).length;
  const belowRangeCount = dimensions.filter(d => {
    if (d.invertedScale) return d.currentValue > d.benchmarkMax;
    return d.currentValue < d.benchmarkMin;
  }).length;

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
          What Good Looks Like
        </h1>
        <p className="text-base text-[#666666]">
          Here's what the best implementations achieve — and where you stand.
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
              <p className={`text-[10px] mt-2 ${stage <= calculations.maturityStage ? 'text-white' : 'text-[#666666]'}`}>
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

      <section className="bg-[#F5F0EB] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-[#EA2C00]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-1">
                Your Position
              </p>
              <p className="text-sm text-[#666666]">
                Based on Abridge deployment data across 150+ health systems.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-[#E8E8E8] rounded-lg">
              <span className="text-2xl font-bold text-[#333333]">{inRangeCount}</span>
              <p className="text-[10px] text-[#666666] uppercase tracking-wider">In Range</p>
            </div>
            {belowRangeCount > 0 && (
              <div className="text-center px-4 py-2 bg-[#FFEBE6] rounded-lg">
                <span className="text-2xl font-bold text-[#EA2C00]">{belowRangeCount}</span>
                <p className="text-[10px] text-[#EA2C00] uppercase tracking-wider">Opportunities</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dimensions.map((dimension) => (
          <BenchmarkCard
            key={dimension.label}
            {...dimension}
          />
        ))}
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
          className="bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white gap-2 rounded-full px-6 h-11"
          data-testid="button-next"
        >
          See the Math
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
