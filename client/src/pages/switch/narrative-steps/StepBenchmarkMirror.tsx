import { useState, useEffect, useMemo } from "react";
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
    description: "Time savings measured. Physicians satisfied. The documentation problem feels solved.",
    borderColor: "#D0D0D0",
  },
  {
    id: "activated",
    label: "Tier 2",
    title: "Documentation-Activated",
    description: "Economic value captured across capacity, revenue, workforce, and risk. Documentation drives measurable performance.",
    borderColor: "#999999",
  },
  {
    id: "intelligent",
    label: "Tier 3",
    title: "Documentation-Intelligent",
    description: "Documentation is strategic infrastructure \u2014 feeding automation, quality systems, and competitive advantage.",
    borderColor: "#1A1A1A",
  },
];

export default function StepBenchmarkMirror({
  onNext,
  onBack,
}: StepBenchmarkMirrorProps) {
  const { state } = useAssessment();
  const pillarResult = useMemo(() => computePillars(state), [state]);
  const displayedTotal = pillarResult.totalAnnual;

  const rangeLow = useMemo(
    () => Math.round((displayedTotal * 0.75) / 1000) * 1000,
    [displayedTotal],
  );
  const rangeHigh = useMemo(
    () => Math.round((displayedTotal * 1.25) / 1000) * 1000,
    [displayedTotal],
  );

  const hasData = state.inputs.providers > 0 && state.inputs.annualEncounters > 0;

  const [showCTA, setShowCTA] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowCTA(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-[720px] mx-auto py-20 md:py-24 px-4" style={{ fontFamily: "Manrope, sans-serif" }}>
      <div className="text-center mb-12">
        <p
          className="text-[16px] text-[#4B4B4B] leading-[1.7] mb-4"
          data-testid="text-mirror-subtext"
        >
          Most organizations believe they have solved
          <br className="hidden sm:block" />
          their documentation problem.
        </p>
        <h1
          className="text-[36px] md:text-[44px] font-bold text-[#1A1A1A] leading-[1.15]"
          data-testid="text-mirror-headline"
        >
          Here is what the data shows.
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-0 mb-8">
        {TIERS.map((tier, idx) => (
          <div
            key={tier.id}
            data-testid={`card-tier-${tier.id}`}
            className={`relative bg-[#F7F6F4] p-6 md:p-7 ${
              idx === 0
                ? "md:rounded-l-lg rounded-t-lg md:rounded-tr-none"
                : idx === 2
                  ? "md:rounded-r-lg rounded-b-lg md:rounded-bl-none"
                  : ""
            }`}
            style={{ borderLeft: `3px solid ${tier.borderColor}` }}
          >
            <p className="text-[11px] font-medium text-[#9B9B9B] uppercase tracking-[2px] mb-2">
              {tier.label}
            </p>
            <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-3 uppercase tracking-wide">
              {tier.title}
            </h3>
            <p className="text-[15px] text-[#4B4B4B] leading-[1.6]">
              {tier.description}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-16 md:mb-20 pl-1">
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EA2C00] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EA2C00]" />
        </span>
        <p
          className="text-[14px] text-[#4B4B4B]"
          data-testid="text-tier-indicator"
        >
          Most organizations at your utilization profile are here.
        </p>
      </div>

      <div className="max-w-[600px] mx-auto mb-16 md:mb-20 space-y-6">
        <p
          className="text-[20px] text-[#1A1A1A] leading-[2.0]"
          data-testid="text-insight-1"
        >
          The gap between Tier 1 and Tier 2
          <br />
          is not a technology gap.
        </p>
        <p
          className="text-[20px] text-[#1A1A1A] leading-[2.0]"
          data-testid="text-insight-2"
        >
          It is a framing gap.
        </p>
        <p className="text-[17px] text-[#4B4B4B] leading-[1.7]">
          Organizations at Tier 1 have ambient documentation.
        </p>
        <p className="text-[17px] text-[#4B4B4B] leading-[1.7]">
          Organizations at Tier 2 have documentation infrastructure.
        </p>

        {hasData && (
          <div className="pt-6">
            <p
              className="text-[20px] text-[#1A1A1A] leading-[2.0]"
              data-testid="text-gap-intro"
            >
              For an organization your size, that difference
              <br />
              is worth an estimated
            </p>
            <p
              className="text-[28px] md:text-[32px] font-bold text-[#1A1A1A] tabular-nums mt-3"
              data-testid="text-gap-value"
            >
              {formatCurrency(rangeLow)} &ndash; {formatCurrency(rangeHigh)} annually.
            </p>
          </div>
        )}
      </div>

      <div className="text-center mb-12">
        <p className="text-[15px] text-[#9B9B9B]" data-testid="text-assessment-promise">
          This assessment will show you exactly where
          <br className="hidden sm:block" />
          that gap lives in your organization.
        </p>
      </div>

      <div
        className={`flex items-center justify-between transition-all duration-500 ${
          showCTA ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <button
          onClick={onBack}
          className="text-[14px] text-[#9B9B9B] hover:text-[#4B4B4B] transition-colors"
          data-testid="button-back"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#EA2C00] text-white text-[15px] font-semibold rounded-lg hover:bg-[#D42800] transition-colors"
          data-testid="button-show-gap"
        >
          Show Me My Gap
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
