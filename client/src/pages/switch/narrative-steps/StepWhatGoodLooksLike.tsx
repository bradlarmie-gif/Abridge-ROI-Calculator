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

  const gapLabel = invertedScale ? "above typical range" : "gap to reach benchmark range";

  return (
    <div
      className="bg-white rounded-xl p-8"
      data-testid={`card-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#C54B2A] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <h3 className="font-bold text-[#1A1A1A] text-[15px]">{label}</h3>
        </div>

        <div className="text-right">
          <span className="text-[32px] font-bold text-[#1A1A1A] leading-none">
            {prefix}{currentValue}{unit}
          </span>
          <p className="text-[10px] text-[#9B9590] uppercase tracking-wider mt-1">Current</p>
        </div>
      </div>

      <div className="relative mb-3">
        <div className="h-1.5 bg-[#ECEAE6] rounded-full relative">
          <div
            className="absolute h-full bg-[#D1CEC9] rounded-full"
            style={{
              left: `${benchmarkMinPercent}%`,
              width: `${benchmarkMaxPercent - benchmarkMinPercent}%`,
            }}
          />
          <div
            className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-[#C54B2A] z-10"
            style={{ left: `${currentPercent}%`, transform: "translate(-50%, -50%)" }}
          />
        </div>

        <div className="flex justify-end mt-2">
          <span className="text-xs text-[#9B9590]">
            {typicalLabel || `Typical: ${prefix}${benchmarkMin}\u2013${benchmarkMax}${unit}`}
          </span>
        </div>
      </div>

      <div className="mt-6">
        {isBelowRange ? (
          <p className="text-sm" data-testid={`gap-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <span className="font-bold text-[#C54B2A]">{Math.round(gapToRange)}{unit}</span>
            <span className="text-[#9B9590]"> {gapLabel}</span>
          </p>
        ) : isAboveRange ? (
          <p className="text-sm text-[#5B8C5A] flex items-center gap-1.5" data-testid={`gap-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Above benchmark range</span>
          </p>
        ) : (
          <p className="text-sm text-[#5B8C5A] flex items-center gap-1.5" data-testid={`gap-${label.toLowerCase().replace(/\s+/g, "-")}`}>
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
  const currentNetImpact = Math.max(0, (inputs.timeSavedPerEncounter || 0) - (inputs.editTimePerEncounter || 0));

  const dimensions = [
    {
      icon: <BarChart3 className="w-4 h-4 text-white" />,
      label: "Utilization",
      currentValue: inputs.utilization || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.utilizationMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.utilizationMax,
      unit: "%",
      maxScale: 100,
    },
    {
      icon: <Clock className="w-4 h-4 text-white" />,
      label: "Net Time Impact",
      currentValue: currentNetImpact,
      benchmarkMin: 3,
      benchmarkMax: 4,
      unit: " min",
      prefix: "+",
      maxScale: 6,
      typicalLabel: "Typical: 3\u20134 min net",
    },
    {
      icon: <ClipboardCheck className="w-4 h-4 text-white" />,
      label: "Note Acceptance",
      currentValue: inputs.docCompleteness || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.docCompletenessMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.docCompletenessMax,
      unit: "%",
      maxScale: 100,
    },
    {
      icon: <DollarSign className="w-4 h-4 text-white" />,
      label: "Coding Impact",
      currentValue: inputs.wrvuLift || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.wrvuLiftMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.wrvuLiftMax,
      unit: "%",
      prefix: "+",
      maxScale: 12,
      typicalLabel: "Typical: +4\u20137%",
    },
    {
      icon: <Moon className="w-4 h-4 text-white" />,
      label: "After-Hours Work",
      currentValue: inputs.afterHoursPerWeek || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.afterHoursMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.afterHoursMax,
      unit: " hrs/wk",
      maxScale: 10,
      invertedScale: true,
    },
    {
      icon: <Heart className="w-4 h-4 text-white" />,
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
          className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          What Good Looks Like
        </h1>
        <p className="text-base text-[#666666] max-w-2xl">
          These benchmarks come from mature implementations. They're achievable with the right approach and support.
        </p>
      </div>

      <section className="bg-[#F5F0EB] rounded-xl p-8" data-testid="your-position-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-[#C54B2A] flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A] uppercase tracking-[1.5px] mb-1">
                Your Position
              </p>
              <p className="text-sm text-[#9B9590]">
                See where you stand against top performers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center px-5 py-2.5 bg-white rounded-lg border border-[#E8E4DF]">
              <span className="text-2xl font-bold text-[#1A1A1A]">{inRangeCount}</span>
              <p className="text-[10px] text-[#9B9590] uppercase tracking-wider mt-0.5">In Range</p>
            </div>
            {belowRangeCount > 0 && (
              <div className="text-center px-5 py-2.5 bg-white rounded-lg border border-[#E8E4DF]">
                <span className="text-2xl font-bold text-[#C54B2A]">{belowRangeCount}</span>
                <p className="text-[10px] text-[#C54B2A] uppercase tracking-wider mt-0.5">Opportunities</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F0EB] rounded-xl p-8 md:p-10" data-testid="dimensions-section">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dimensions.map((dimension) => (
            <BenchmarkCard key={dimension.label} {...dimension} />
          ))}
        </div>
      </section>

      <div className="flex justify-between items-center pt-2">
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
