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
    label: "TIER 1",
    title: "Documentation-Aware",
    body: "Time savings measured.\nPhysicians satisfied.\nThe problem feels solved.",
    bg: "#F7F6F4",
    hasDot: true,
  },
  {
    id: "activated",
    label: "TIER 2",
    title: "Documentation-Activated",
    body: "Economic value captured across\ncapacity, revenue, workforce,\nand risk.",
    bg: "#FFFFFF",
    hasDot: false,
  },
  {
    id: "intelligent",
    label: "TIER 3",
    title: "Documentation-Intelligent",
    body: "Documentation is strategic\ninfrastructure \u2014 feeding\nautomation, quality systems,\nand competitive advantage.",
    bg: "#FFFFFF",
    hasDot: false,
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

  const [showInsight, setShowInsight] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    const insightTimer = setTimeout(() => setShowInsight(true), 600);
    const ctaTimer = setTimeout(() => setShowCTA(true), 2200);
    return () => {
      clearTimeout(insightTimer);
      clearTimeout(ctaTimer);
    };
  }, []);

  const hasData = state.inputs.providers > 0 && state.inputs.annualEncounters > 0;

  return (
    <div className="max-w-[680px] mx-auto py-20 md:py-20" style={{ fontFamily: "Manrope, sans-serif" }}>
      <div className="text-center mb-5">
        <p
          className="text-[17px] text-[#9B9B9B] leading-[1.75] mb-5"
          data-testid="text-mirror-subtext"
        >
          Most organizations believe they have solved
          <br className="hidden sm:block" />
          their documentation problem.
        </p>
        <h1
          className="text-[36px] md:text-[48px] font-bold text-[#1A1A1A] leading-[1.15]"
          data-testid="text-mirror-headline"
        >
          Here is what the data shows.
        </h1>
      </div>

      <div className="h-16" />

      <div className="relative">
        <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-[#E8E8E8] -translate-y-1/2 z-0" />
        <div className="md:hidden absolute left-1/2 top-0 bottom-0 w-px bg-[#E8E8E8] -translate-x-1/2 z-0" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <div key={tier.id} className="flex flex-col" data-testid={`card-tier-${tier.id}`}>
              <div
                className="border border-[#E8E8E8] rounded-xl p-7"
                style={{ backgroundColor: tier.bg }}
              >
                <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-2">
                  {tier.label}
                </p>
                <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-3">
                  {tier.title}
                </h3>
                <p className="text-[15px] text-[#4B4B4B] leading-[1.7] whitespace-pre-line">
                  {tier.body}
                </p>
              </div>
              {tier.hasDot && (
                <div className="flex items-center gap-2.5 mt-4 pl-1">
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#EA2C00] animate-[pulse_3s_ease-in-out_infinite]" style={{ animationTimingFunction: "ease-in-out" }} />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EA2C00]" />
                  </span>
                  <p className="text-[13px] text-[#EA2C00]" data-testid="text-tier-indicator">
                    Most organizations at your profile are here.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="h-16" />

      <div
        className={`max-w-[560px] mx-auto text-center transition-all duration-500 ${
          showInsight ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <p className="text-[20px] text-[#1A1A1A] leading-[2.0] mb-6" data-testid="text-insight-1">
          The gap between Tier 1 and Tier 2
          <br />
          is not a technology gap.
        </p>
        <p className="text-[20px] text-[#1A1A1A] leading-[2.0] mb-6" data-testid="text-insight-2">
          It is a framing gap.
        </p>
        <p className="text-[20px] text-[#1A1A1A] leading-[2.0]">
          Organizations at Tier 1 have ambient documentation.
        </p>
        <p className="text-[20px] text-[#1A1A1A] leading-[2.0] mb-6">
          Organizations at Tier 2 have documentation infrastructure.
        </p>

        {hasData && (
          <>
            <p className="text-[20px] text-[#1A1A1A] leading-[2.0]" data-testid="text-gap-intro">
              For an organization your size, that difference
              <br />
              is worth an estimated
            </p>
            <p
              className="text-[36px] font-bold text-[#EA2C00] tabular-nums mt-4 mb-10"
              data-testid="text-gap-value"
            >
              {formatCurrency(rangeLow)} \u2013 {formatCurrency(rangeHigh)} annually
            </p>
          </>
        )}

        <p className="text-[15px] text-[#9B9B9B] leading-[1.75]" data-testid="text-assessment-promise">
          This assessment maps exactly where that gap
          <br className="hidden sm:block" />
          lives in your organization.
        </p>
      </div>

      <div className="h-10" />

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-[14px] text-[#4B4B4B] underline underline-offset-2 hover:text-[#1A1A1A] transition-colors"
          data-testid="button-back"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className={`inline-flex items-center gap-1.5 px-8 py-3.5 bg-[#EA2C00] text-white text-[15px] font-semibold rounded-[10px] hover:bg-[#C72300] transition-all duration-300 ${
            showCTA ? "opacity-100" : "opacity-0"
          }`}
          data-testid="button-show-gap"
        >
          Show Me My Gap
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </button>
      </div>
    </div>
  );
}
