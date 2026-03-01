import { Target, BarChart3, Clock, DollarSign, Heart, ClipboardCheck, Moon, CheckCircle2 } from "lucide-react";
import { type SwitchInputs, type SwitchCalculations, ABRIDGE_BENCHMARKS } from "@/lib/switchGapCalculator";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";

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
  typicalLabel: string;
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

  const isInRange = invertedScale
    ? currentValue <= benchmarkMax
    : currentValue >= benchmarkMin && currentValue <= benchmarkMax;
  const isBelowRange = invertedScale ? currentValue > benchmarkMax : currentValue < benchmarkMin;
  const gapToRange = invertedScale
    ? Math.max(0, currentValue - benchmarkMax)
    : Math.max(0, benchmarkMin - currentValue);

  const gapSuffix = invertedScale ? "above typical range" : "gap to reach benchmark range";

  return (
    <div
      className="bg-white rounded-xl p-5 min-h-[180px] flex flex-col"
      data-testid={`card-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <h3 className="font-semibold text-[#1A1A1A] text-sm">{label}</h3>
        </div>

        <div className="text-right">
          <span className="text-3xl md:text-4xl font-bold text-[#1A1A1A] leading-none">
            {prefix}{currentValue}{unit}
          </span>
          <p className="text-[12px] text-[#999999] uppercase tracking-wider mt-1">Current</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="relative h-2 rounded-lg" style={{
          background: `linear-gradient(to right, ${isInRange ? '#2E7D32' : '#EA2C00'} 0%, ${isInRange ? '#2E7D32' : '#EA2C00'} ${currentPercent}%, #E0E0E0 ${currentPercent}%, #E0E0E0 100%)`,
        }}>
          <div
            className="absolute h-full rounded-lg"
            style={{
              left: `${benchmarkMinPercent}%`,
              width: `${benchmarkMaxPercent - benchmarkMinPercent}%`,
              background: 'rgba(0,0,0,0.08)',
            }}
          />
          <div
            className="absolute top-1/2 w-0.5 h-4 bg-[#999999] pointer-events-none"
            style={{ left: `${benchmarkMinPercent}%`, transform: 'translateY(-50%)' }}
          />
          <div
            className="absolute top-1/2 w-0.5 h-4 bg-[#999999] pointer-events-none"
            style={{ left: `${benchmarkMaxPercent}%`, transform: 'translateY(-50%)' }}
          />
          <div
            className="absolute top-1/2 pointer-events-none"
            style={{
              left: `${currentPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className={`w-4 h-4 rounded-full border-2 border-white shadow-md ${isInRange ? 'bg-[#2E7D32]' : 'bg-[#EA2C00]'}`} />
          </div>
        </div>
      </div>

      <div className="text-xs text-[#999999] bg-[#F5F0EB] px-3 py-1.5 rounded-md inline-block mb-3">
        {typicalLabel}
      </div>

      <div className="mt-auto">
        {isBelowRange ? (
          <p className="text-xs" data-testid={`gap-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <span className="font-semibold text-[#C54B2A]">{Math.round(gapToRange)}{unit}</span>
            <span className="text-[#999999]"> {gapSuffix}</span>
          </p>
        ) : (
          <div className="inline-flex items-center gap-1.5 bg-[#E8F5E9] text-[#2E7D32] px-3 py-1.5 rounded-md" data-testid={`gap-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">In Range</span>
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
  const currentNetImpact = Math.max(0, (inputs.timeSavedPerEncounter || 0) - (inputs.editTimePerEncounter || 0));

  const dimensions = [
    {
      icon: <BarChart3 className="w-5 h-5 text-[#EA2C00]" />,
      label: "Utilization",
      currentValue: inputs.utilization || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.utilizationMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.utilizationMax,
      unit: "%",
      maxScale: 100,
      typicalLabel: "Typical: 70\u201380%",
    },
    {
      icon: <Clock className="w-5 h-5 text-[#EA2C00]" />,
      label: "Net Time Impact",
      currentValue: currentNetImpact,
      benchmarkMin: 2,
      benchmarkMax: 3,
      unit: " min",
      prefix: "+",
      maxScale: 6,
      typicalLabel: "Typical: 2\u20133 min net",
    },
    {
      icon: <ClipboardCheck className="w-5 h-5 text-[#EA2C00]" />,
      label: "Note Acceptance",
      currentValue: inputs.docCompleteness || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.docCompletenessMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.docCompletenessMax,
      unit: "%",
      maxScale: 100,
      typicalLabel: "Typical: 75\u201385%",
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
      typicalLabel: "Typical: +4\u20137%",
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
      typicalLabel: "Typical: 1\u20133 hrs/wk",
    },
    {
      icon: <Heart className="w-5 h-5 text-[#EA2C00]" />,
      label: "Provider Satisfaction",
      currentValue: inputs.satisfaction || 0,
      benchmarkMin: ABRIDGE_BENCHMARKS.satisfactionMin,
      benchmarkMax: ABRIDGE_BENCHMARKS.satisfactionMax,
      unit: "%",
      maxScale: 100,
      typicalLabel: "Typical: 80\u201395%",
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
    <div className={`space-y-10 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          What Good Looks Like
        </h1>
        <p className="text-base text-[#888888] leading-relaxed">
          These benchmarks come from mature implementations. They're achievable with the right approach and support.
        </p>
      </div>

      <section className="bg-[#F5F0EB] rounded-2xl p-8 border border-[#E8E0D8]" data-testid="your-position-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wider mb-0.5">
                Your Position
              </p>
              <p className="text-xs text-[#999999]">
                See where you stand against top performers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-[#E8F5E9] rounded-lg border border-[#C8E6C9]">
              <span className="text-xl font-bold text-[#2E7D32]">{inRangeCount}</span>
              <p className="text-[12px] text-[#2E7D32] uppercase tracking-wider">In Range</p>
            </div>
            {belowRangeCount > 0 && (
              <div className="text-center px-4 py-2 bg-white rounded-lg border border-[#E5E7EB]">
                <span className="text-xl font-bold text-[#C54B2A]">{belowRangeCount}</span>
                <p className="text-[12px] text-[#C54B2A] uppercase tracking-wider">Opportunities</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F0EB] rounded-2xl p-6 md:p-8 border border-[#E8E0D8]" data-testid="dimensions-section">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimensions.map((dimension) => (
            <BenchmarkCard key={dimension.label} {...dimension} />
          ))}
        </div>
      </section>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="See the Math" />
    </div>
  );
}
