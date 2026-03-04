import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useAssessment } from "@/lib/assessment";
import { computePillars } from "@/lib/pillars/computePillars";
import type { PillarId } from "@/lib/pillars/computePillars";

interface StepEnterpriseCaptureScoreProps {
  onNext: () => void;
  onBack: () => void;
}

const PILLAR_ORDER: PillarId[] = ["capacity", "yield", "workforce", "risk"];

const PILLAR_WEIGHTS: Record<PillarId, number> = {
  capacity: 0.30,
  yield: 0.30,
  workforce: 0.20,
  risk: 0.20,
};

const INDUSTRY_AVG = 34;
const TOP_QUARTILE = 71;

export default function StepEnterpriseCaptureScore({
  onNext,
  onBack,
}: StepEnterpriseCaptureScoreProps) {
  const { state } = useAssessment();
  const pillarResult = useMemo(() => computePillars(state), [state]);
  const { pillars } = pillarResult;

  const enterpriseScore = Math.round(
    PILLAR_ORDER.reduce(
      (acc, id) => acc + pillars[id].score0to100 * PILLAR_WEIGHTS[id],
      0,
    ),
  );

  const verdictLine = useMemo(() => {
    if (enterpriseScore <= INDUSTRY_AVG + 5) {
      return "You are performing at the industry average. In our assessment, the gap to top quartile is not incremental — it is structural.";
    }
    if (enterpriseScore < TOP_QUARTILE) {
      return `You are performing above average but below top quartile. ${TOP_QUARTILE - enterpriseScore} points of structural improvement remain.`;
    }
    return "You are performing at top-quartile levels. Focus shifts from closing gaps to sustaining advantage.";
  }, [enterpriseScore]);

  return (
    <div className="max-w-2xl mx-auto py-16 md:py-24 px-4 text-center">
      <div className="mb-20">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1A1A1A] font-abridge uppercase tracking-tight mb-1"
          data-testid="text-page-title"
        >
          Enterprise Documentation
        </h1>
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1A1A1A] font-abridge uppercase tracking-tight"
          data-testid="text-page-title-2"
        >
          Capture Score
        </h1>
      </div>

      <div className="mb-16">
        <p
          className="text-7xl md:text-8xl font-bold text-[#1A1A1A] tabular-nums leading-none"
          data-testid="value-enterprise-score"
        >
          {enterpriseScore}
        </p>
        <p className="text-2xl text-[#999] font-medium mt-2">/ 100</p>
      </div>

      <div className="max-w-md mx-auto mb-16">
        <div className="relative h-2 bg-[#EDEAE5] rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-[#EA2C00] rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, enterpriseScore)}%` }}
            data-testid="bar-score"
          />
        </div>
      </div>

      <p
        className="text-base text-[#666] leading-relaxed max-w-lg mx-auto mb-16"
        data-testid="text-score-explanation"
      >
        This score reflects how much of the enterprise value flowing through your documentation infrastructure you are currently capturing.
      </p>

      <hr className="border-[#E8E0D8] max-w-sm mx-auto mb-12" />

      <div className="space-y-4 mb-12">
        <p className="text-sm text-[#1A1A1A]" data-testid="text-benchmark-avg">
          Industry average — organizations using ambient documentation today:{" "}
          <span className="font-bold tabular-nums">{INDUSTRY_AVG} / 100</span>
        </p>
        <p className="text-sm text-[#1A1A1A]" data-testid="text-benchmark-top">
          Top quartile organizations:{" "}
          <span className="font-bold tabular-nums">{TOP_QUARTILE} / 100</span>
        </p>
        <p className="text-xs text-[#999] mt-2" data-testid="text-benchmark-source">
          Based on aggregated deployment experience and published industry benchmarks.
        </p>
      </div>

      <p
        className="text-base text-[#1A1A1A] leading-relaxed max-w-lg mx-auto mb-16"
        data-testid="text-verdict"
      >
        {verdictLine}
      </p>

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
          data-testid="button-see-cost"
        >
          See What This Is Costing You
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
