import { ArrowRight, ArrowLeft, Target, CheckCircle, BarChart3, Clock, DollarSign, Heart } from "lucide-react";
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
}: BenchmarkCardProps) {
  const currentPercent = Math.min(100, Math.max(0, (currentValue / maxScale) * 100));
  const benchmarkMinPercent = (benchmarkMin / maxScale) * 100;
  const benchmarkMaxPercent = Math.min(100, (benchmarkMax / maxScale) * 100);
  
  const isInRange = currentValue >= benchmarkMin;
  const isBelowRange = currentValue < benchmarkMin;
  
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <h3 className="font-semibold text-black text-sm">{label}</h3>
        </div>
        
        <div className={`text-right border-l-4 pl-3 ${isBelowRange ? 'border-[#E85A2C]' : 'border-green-500'}`}>
          <span className={`text-2xl font-bold ${isBelowRange ? 'text-[#E85A2C]' : 'text-green-600'}`}>
            {prefix}{currentValue}{unit}
          </span>
          <p className="text-xs text-[#888888] uppercase tracking-wider">Current</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-3">
        <div className="h-2 bg-[#F5F0EB] rounded-full overflow-hidden">
          {/* Benchmark zone */}
          <div 
            className="absolute h-full bg-green-200 rounded-full"
            style={{ 
              left: `${benchmarkMinPercent}%`, 
              width: `${benchmarkMaxPercent - benchmarkMinPercent}%` 
            }}
          />
          
          {/* Current position marker */}
          <div 
            className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md transition-all z-10 bg-black"
            style={{ left: `${currentPercent}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-[#888888]">
        <span>0{unit}</span>
        <span className="px-2 py-1 bg-[#F5F0EB] text-[#6B7280] font-medium rounded">
          Benchmark: {prefix}{benchmarkMin}–{benchmarkMax}{unit}
        </span>
        <span>{maxScale}{unit}</span>
      </div>

      {isBelowRange && (
        <div className="mt-3 p-3 bg-[#FFF5F2] rounded-lg border border-[#E85A2C]/10">
          <p className="text-xs text-[#6B7280]">
            <span className="font-semibold text-[#E85A2C]">{Math.round(benchmarkMin - currentValue)}{unit} gap</span> to reach benchmark range
          </p>
        </div>
      )}
      
      {isInRange && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
          <p className="text-xs text-green-700 font-medium">
            In benchmark range
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
      icon: <BarChart3 className="w-5 h-5 text-[#E85A2C]" />,
      label: "Utilization",
      currentValue: inputs.utilization || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.utilization - 10,
      benchmarkMax: ABRIDGE_BENCHMARKS.utilization,
      unit: "%",
      maxScale: 100,
    },
    {
      icon: <Clock className="w-5 h-5 text-[#E85A2C]" />,
      label: "Time Saved",
      currentValue: inputs.timeSavedPerEncounter || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.timeSavedAvg - 1,
      benchmarkMax: ABRIDGE_BENCHMARKS.timeSavedAvg + 1,
      unit: " min",
      maxScale: 6,
    },
    {
      icon: <DollarSign className="w-5 h-5 text-[#E85A2C]" />,
      label: "wRVU Lift",
      currentValue: inputs.wrvuLift || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.wrvuLift - 2,
      benchmarkMax: ABRIDGE_BENCHMARKS.wrvuLift + 2,
      unit: "%",
      prefix: "+",
      maxScale: 12,
    },
    {
      icon: <Heart className="w-5 h-5 text-[#E85A2C]" />,
      label: "Provider Satisfaction",
      currentValue: inputs.satisfaction || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.satisfaction - 10,
      benchmarkMax: ABRIDGE_BENCHMARKS.satisfaction,
      unit: "%",
      maxScale: 100,
    },
  ];

  const inRangeCount = dimensions.filter(d => d.currentValue >= d.benchmarkMin).length;
  const belowRangeCount = dimensions.filter(d => d.currentValue < d.benchmarkMin).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2" data-testid="text-page-title">
          What Good Looks Like
        </h1>
        <p className="text-base text-[#6B7280]">
          These aren't aspirational targets. They're achievable ranges based on mature implementations.
        </p>
      </div>

      {/* Summary Section */}
      <section className="bg-[#F5F0EB] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-[#E85A2C]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
                YOUR POSITION
              </p>
              <p className="text-sm text-[#6B7280]">
                See where you stand against top performers
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-white rounded-lg border border-[#E5E7EB]">
              <span className="text-2xl font-bold text-green-600">{inRangeCount}</span>
              <p className="text-xs text-[#888888]">In Range</p>
            </div>
            <div className={`text-center px-4 py-2 rounded-lg border ${belowRangeCount > 0 ? 'bg-[#FFF5F2] border-[#E85A2C]/20' : 'bg-white border-[#E5E7EB]'}`}>
              <span className={`text-2xl font-bold ${belowRangeCount > 0 ? 'text-[#E85A2C]' : 'text-black'}`}>{belowRangeCount}</span>
              <p className="text-xs text-[#888888]">Opportunities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benchmark Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dimensions.map((dimension) => (
          <BenchmarkCard
            key={dimension.label}
            {...dimension}
          />
        ))}
      </div>

      {/* What Makes the Difference */}
      <section className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
          WHAT MAKES THE DIFFERENCE
        </p>
        <p className="text-sm text-[#6B7280] mb-5">
          Top-performing organizations share something in common — technology built specifically for clinical 
          workflows, backed by dedicated implementation support.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            "90-day guided onboarding",
            "Specialty customization",
            "Ongoing optimization",
            "Real-time analytics"
          ].map((trait) => (
            <div 
              key={trait}
              className="flex items-center gap-3 p-3 rounded-lg bg-[#F5F0EB]"
            >
              <CheckCircle className="w-4 h-4 text-[#E85A2C] flex-shrink-0" />
              <span className="text-sm text-black font-medium">{trait}</span>
            </div>
          ))}
        </div>
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
          className="bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white gap-2 rounded-full px-6 h-11"
          data-testid="button-next"
        >
          See the Math
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
