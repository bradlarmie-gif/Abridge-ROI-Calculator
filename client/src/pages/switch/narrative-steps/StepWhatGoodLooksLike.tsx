import { ArrowRight, ArrowLeft, Target, BarChart3, Clock, DollarSign, Heart, ClipboardCheck, Moon, Check, ArrowUp } from "lucide-react";
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
  typicalLabel?: string;
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
  typicalLabel,
}: BenchmarkCardProps) {
  const currentPercent = Math.min(100, Math.max(0, (currentValue / maxScale) * 100));
  const benchmarkMinPercent = (benchmarkMin / maxScale) * 100;
  const benchmarkMaxPercent = Math.min(100, (benchmarkMax / maxScale) * 100);

  const isBelowRange = invertedScale ? currentValue > benchmarkMax : currentValue < benchmarkMin;
  const isAboveRange = invertedScale ? currentValue < benchmarkMin : currentValue > benchmarkMax;
  const gapToRange = invertedScale
    ? Math.max(0, currentValue - benchmarkMax)
    : Math.max(0, benchmarkMin - currentValue);

  const gapLabel = invertedScale ? "above typical range" : "below typical range";

  return (
    <div
      className="bg-white rounded-xl border border-[#E8E4DF] p-7"
      data-testid={`card-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <h3 className="font-bold text-[#1A1A1A] text-base">{label}</h3>
        </div>

        <div className="text-right">
          <span className="text-[28px] font-bold text-[#1A1A1A] leading-none">
            {prefix}{currentValue}{unit}
          </span>
          <p className="text-[10px] text-[#8A8478] uppercase tracking-wider mt-1">Current</p>
        </div>
      </div>

      <div className="relative mb-3">
        <div className="h-2 bg-[#F0EDE8] rounded-full relative">
          <div
            className="absolute h-full bg-[#D4CFC8] rounded-full"
            style={{
              left: `${benchmarkMinPercent}%`,
              width: `${benchmarkMaxPercent - benchmarkMinPercent}%`,
            }}
          />
          <div
            className="absolute top-1/2 w-3 h-3 rounded-full bg-[#C54B2A] z-10"
            style={{ left: `${currentPercent}%`, transform: "translate(-50%, -50%)" }}
          />
        </div>

        <div className="flex justify-end mt-1.5">
          <span className="text-xs text-[#8A8478]">
            {typicalLabel || `Typical: ${prefix}${benchmarkMin}–${benchmarkMax}${unit}`}
          </span>
        </div>
      </div>

      <div className="mt-4">
        {isBelowRange ? (
          <p className="text-sm" data-testid={`gap-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <span className="font-bold text-[#C54B2A]">{Math.round(gapToRange)}{unit}</span>
            <span className="text-[#8A8478]"> {gapLabel}</span>
          </p>
        ) : isAboveRange ? (
          <p className="text-sm text-[#6B8A6B] flex items-center gap-1.5" data-testid={`gap-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Above typical range</span>
          </p>
        ) : (
          <p className="text-sm text-[#6B8A6B] flex items-center gap-1.5" data-testid={`gap-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <Check className="w-3.5 h-3.5" />
            <span>In Range</span>
          </p>
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
      typicalLabel: "Typical: 3\u20134 min net",
    },
    {
      icon: <ClipboardCheck className="w-5 h-5 text-[#EA2C00]" />,
      label: "Note Acceptance",
      currentValue: inputs.docCompleteness || 0,
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

  const inRangeCount = dimensions.filter((d) => {
    if (d.invertedScale) return d.currentValue <= d.benchmarkMax;
    return d.currentValue >= d.benchmarkMin;
  }).length;
  const belowRangeCount = dimensions.filter((d) => {
    if (d.invertedScale) return d.currentValue > d.benchmarkMax;
    return d.currentValue < d.benchmarkMin;
  }).length;

  return (
    <div className="space-y-10">
      <div className="text-left">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          What Good Looks Like
        </h1>
        <p className="text-base text-[#666666]">
          Here's how you compare across each dimension — and where the opportunities are.
        </p>
      </div>

      <section className="bg-[#F5F0EB] rounded-xl p-8" data-testid="your-position-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-[#EA2C00]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A] uppercase tracking-[1.5px] mb-1">
                Your Position
              </p>
              <p className="text-sm text-[#666666]">
                Based on patterns across 150+ health systems.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-white rounded-lg">
              <span className="text-2xl font-bold text-[#1A1A1A]">{inRangeCount}</span>
              <p className="text-[10px] text-[#8A8478] uppercase tracking-wider">In Range</p>
            </div>
            {belowRangeCount > 0 && (
              <div className="text-center px-4 py-2 bg-white rounded-lg">
                <span className="text-2xl font-bold text-[#C54B2A]">{belowRangeCount}</span>
                <p className="text-[10px] text-[#C54B2A] uppercase tracking-wider">Opportunities</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section data-testid="dimensions-section">
        <div className="mb-6">
          <p className="text-xs font-medium text-[#8A8478] uppercase tracking-[2px] mb-3">
            Your Dimensions
          </p>
          <div className="h-px bg-[#E0DCD7]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {dimensions.map((dimension) => (
            <BenchmarkCard key={dimension.label} {...dimension} />
          ))}
        </div>
      </section>

      <div className="flex justify-between items-center pt-4">
        <Button variant="ghost" onClick={onBack} className="gap-2" data-testid="button-back">
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
