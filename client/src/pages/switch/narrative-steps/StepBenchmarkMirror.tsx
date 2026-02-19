import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useAssessment } from "@/lib/assessment";
import { computePillars } from "@/lib/pillars/computePillars";
import { formatCurrency } from "@/lib/switchGapCalculator";

interface StepBenchmarkMirrorProps {
  onNext: () => void;
  onBack: () => void;
}

const TIERS = [
  {
    id: "aware",
    label: "Tier 1",
    title: "Documentation-Aware",
    description:
      "Time savings measured. Physicians satisfied. The documentation problem feels solved.",
    tag: "Where most organizations are today",
    active: true,
  },
  {
    id: "activated",
    label: "Tier 2",
    title: "Documentation-Activated",
    description:
      "Economic value captured across capacity, revenue, workforce, and risk. Documentation drives measurable enterprise performance.",
    tag: null,
    active: false,
  },
  {
    id: "intelligent",
    label: "Tier 3",
    title: "Documentation-Intelligent",
    description:
      "Documentation is a strategic infrastructure asset. It feeds automation, quality systems, and competitive advantage.",
    tag: null,
    active: false,
  },
];

export default function StepBenchmarkMirror({
  onNext,
  onBack,
}: StepBenchmarkMirrorProps) {
  const { state } = useAssessment();
  const pillarResult = useMemo(() => computePillars(state), [state]);
  const totalAnnual = pillarResult.totalAnnual;

  const gapLow = useMemo(() => Math.round(totalAnnual * 0.55), [totalAnnual]);
  const gapHigh = useMemo(() => Math.round(totalAnnual * 0.85), [totalAnnual]);

  const hasData = state.inputs.providers > 0 && state.inputs.annualEncounters > 0;

  return (
    <div className="max-w-3xl mx-auto py-8 md:py-16 px-4">
      <div className="text-center mb-16">
        <p
          className="text-[11px] font-medium text-[#999] uppercase tracking-widest mb-4"
          data-testid="text-section-label"
        >
          Where does your organization stand?
        </p>
        <p
          className="text-base text-[#888] leading-relaxed max-w-lg mx-auto"
          data-testid="text-section-subtext"
        >
          Most health systems believe they have solved their documentation problem. Here's what the data shows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-20">
        {TIERS.map((tier, idx) => (
          <div
            key={tier.id}
            data-testid={`card-tier-${tier.id}`}
            className={`relative p-6 md:p-7 border border-[#E8E0D8] ${
              idx === 0
                ? "md:rounded-l-2xl rounded-t-2xl md:rounded-tr-none"
                : idx === 2
                  ? "md:rounded-r-2xl rounded-b-2xl md:rounded-bl-none"
                  : ""
            } ${
              tier.active
                ? "bg-[#F5F0EB] border-2 border-[#1A1A1A]"
                : "bg-white"
            }`}
          >
            {tier.active && (
              <div className="absolute -top-2 left-6 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EA2C00] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EA2C00]" />
                </span>
              </div>
            )}

            <p className="text-[10px] font-medium text-[#999] uppercase tracking-widest mb-2">
              {tier.label}
            </p>
            <h3 className="text-base font-bold text-[#1A1A1A] mb-3">
              {tier.title}
            </h3>
            <p className="text-sm text-[#666] leading-relaxed">
              {tier.description}
            </p>

            {tier.tag && (
              <p
                className="text-[11px] text-[#EA2C00] font-medium mt-4 uppercase tracking-wider"
                data-testid="text-tier-tag"
              >
                {tier.tag}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
        <p
          className="text-[11px] text-[#999] italic mb-6"
          data-testid="text-tier-explanation"
        >
          Based on your inputs, this is where organizations with your profile typically operate after initial ambient deployment.
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-20 space-y-6">
        <p
          className="text-lg md:text-xl text-[#1A1A1A] leading-relaxed"
          data-testid="text-gut-punch"
        >
          The gap between Tier 1 and Tier 2 is not a technology gap.
        </p>
        <p className="text-lg md:text-xl text-[#1A1A1A] leading-relaxed">
          It is a framing gap.
        </p>
        <p className="text-base text-[#666] leading-relaxed">
          Organizations at Tier 1 have ambient documentation.
        </p>
        <p className="text-base text-[#666] leading-relaxed">
          Organizations at Tier 2 have documentation infrastructure.
        </p>

        {hasData && (
          <p
            className="text-lg md:text-xl font-semibold text-[#1A1A1A] pt-4"
            data-testid="text-gap-value"
          >
            For an organization your size, that difference is worth an estimated{" "}
            <span className="tabular-nums">
              {formatCurrency(gapLow)}–{formatCurrency(gapHigh)}
            </span>{" "}
            annually.
          </p>
        )}
      </div>

      <div className="text-center mb-12">
        <p className="text-sm text-[#999] mb-8">
          This assessment will show you exactly where that gap lives in your organization.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-[#999999] hover:text-[#666666] transition-colors"
          data-testid="button-back"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#333333] transition-colors"
          data-testid="button-show-gap"
        >
          Show Me My Gap
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
