import { useMemo } from "react";
import { TrendingUp, Zap, DollarSign, Users, ShieldCheck } from "lucide-react";
import { useAssessment } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { computePillars } from "@/lib/pillars/computePillars";
import type { PillarId } from "@/lib/pillars/computePillars";

interface StepEnterpriseValueMapProps {
  onNext: () => void;
  onBack: () => void;
}

const PILLAR_CONFIG: Record<PillarId, {
  label: string;
  icon: typeof TrendingUp;
  color: string;
  blockerLabels: Record<string, string>;
  actions: Record<string, string>;
}> = {
  capacity: {
    label: "Capacity",
    icon: Zap,
    color: "#EA2C00",
    blockerLabels: {
      coveragePercent: "Low AI documentation coverage",
      frictionMinutes: "High edit friction per encounter",
      deployIntent: "Unclear deployment strategy",
    },
    actions: {
      coveragePercent: "Increase AI adoption across provider base",
      frictionMinutes: "Reduce per-encounter edit time with training",
      deployIntent: "Align on capacity deployment strategy",
    },
  },
  yield: {
    label: "Revenue & Yield",
    icon: DollarSign,
    color: "#0D9488",
    blockerLabels: {
      yieldUpliftPercent: "Low yield uplift expectation",
      ffsSharePercent: "FFS/VBC mix limits upside",
      wrvuLift: "wRVU improvement not yet realized",
    },
    actions: {
      yieldUpliftPercent: "Set realistic yield improvement targets",
      ffsSharePercent: "Model value-based revenue capture",
      wrvuLift: "Track wRVU lift post-deployment",
    },
  },
  workforce: {
    label: "Workforce Stability",
    icon: Users,
    color: "#7C3AED",
    blockerLabels: {
      afterHoursCharting: "Significant after-hours charting remains",
      turnoverRisk: "Elevated provider turnover risk",
      overtimeSensitivity: "Overtime/agency cost pressure",
    },
    actions: {
      afterHoursCharting: "Reduce after-hours burden with ambient docs",
      turnoverRisk: "Address burnout-driven retention risk",
      overtimeSensitivity: "Quantify overtime reduction opportunity",
    },
  },
  risk: {
    label: "Enterprise Risk",
    icon: ShieldCheck,
    color: "#D97706",
    blockerLabels: {
      docDefensibility: "Documentation not audit-ready",
      qualityReportingFriction: "Quality reporting requires heavy manual effort",
      structuredDataUsability: "Unstructured data limits downstream automation",
    },
    actions: {
      docDefensibility: "Strengthen documentation defensibility posture",
      qualityReportingFriction: "Automate quality reporting workflows",
      structuredDataUsability: "Enable structured data capture for analytics",
    },
  },
};

const PILLAR_WEIGHTS: Record<PillarId, number> = {
  capacity: 0.30,
  yield: 0.30,
  workforce: 0.20,
  risk: 0.20,
};

const PILLAR_ORDER: PillarId[] = ["capacity", "yield", "workforce", "risk"];

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

function generateInsights(
  pillars: Record<PillarId, { valueAnnual: number; score0to100: number; topBlockerKey: string }>,
  totalAnnual: number,
): string[] {
  const sorted = [...PILLAR_ORDER].sort(
    (a, b) => pillars[a].score0to100 - pillars[b].score0to100,
  );

  const insights: string[] = [];

  const lowest = sorted[0];
  const lowestConfig = PILLAR_CONFIG[lowest];
  const lowestScore = pillars[lowest].score0to100;
  insights.push(
    `${lowestConfig.label} is your largest opportunity area at ${lowestScore}/100 — addressing ${lowestConfig.blockerLabels[pillars[lowest].topBlockerKey] || "key constraints"} could unlock significant value.`,
  );

  const secondLowest = sorted[1];
  const secondConfig = PILLAR_CONFIG[secondLowest];
  const secondValue = pillars[secondLowest].valueAnnual;
  if (secondValue > 0) {
    insights.push(
      `${secondConfig.label} represents ${formatCurrency(secondValue)}/yr in recoverable value — ${secondConfig.actions[pillars[secondLowest].topBlockerKey] || "focused action here accelerates returns"}.`,
    );
  }

  if (totalAnnual > 0) {
    const topPillar = sorted[sorted.length - 1];
    const topConfig = PILLAR_CONFIG[topPillar];
    const topScore = pillars[topPillar].score0to100;
    insights.push(
      `${topConfig.label} scores ${topScore}/100 — your strongest pillar. Protect this foundation while investing in lower-scoring areas.`,
    );
  }

  return insights.slice(0, 3);
}

export default function StepEnterpriseValueMap({
  onNext,
  onBack,
}: StepEnterpriseValueMapProps) {
  const { state } = useAssessment();

  const result = useMemo(() => computePillars(state), [state]);
  const { pillars, totalAnnual } = result;

  const enterpriseScore = Math.round(
    PILLAR_ORDER.reduce(
      (acc, id) => acc + pillars[id].score0to100 * PILLAR_WEIGHTS[id],
      0,
    ),
  );

  const insights = useMemo(
    () => generateInsights(pillars, totalAnnual),
    [pillars, totalAnnual],
  );

  const hasData = state.inputs.providers > 0 && state.inputs.annualEncounters > 0;

  return (
    <div className={`space-y-10 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-center">
        <p className="text-[11px] text-[#999999] uppercase tracking-widest mb-2">
          Enterprise Value Map
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Total Annual Enterprise Opportunity
        </h1>
        {hasData && (
          <p
            className="text-4xl md:text-5xl font-bold text-[#EA2C00] mt-3"
            data-testid="value-total-opportunity"
          >
            {formatCurrency(Math.round(totalAnnual))}
          </p>
        )}
        <p className="text-sm text-[#999999] mt-2">
          Conservative, haircut-adjusted across four pillars
        </p>
      </div>

      {hasData && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="pillar-cards">
            {PILLAR_ORDER.map((id) => {
              const pillar = pillars[id];
              const config = PILLAR_CONFIG[id];
              const Icon = config.icon;
              const blocker =
                config.blockerLabels[pillar.topBlockerKey] || "Review inputs";
              const action =
                config.actions[pillar.topBlockerKey] || "Refine assumptions";

              return (
                <div
                  key={id}
                  className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex flex-col gap-3"
                  data-testid={`card-pillar-${id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}12` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <span className="text-sm font-semibold text-[#1A1A1A]">
                        {config.label}
                      </span>
                    </div>
                    <span
                      className="text-lg font-bold text-[#1A1A1A]"
                      data-testid={`value-pillar-${id}`}
                    >
                      {formatCurrency(Math.round(pillar.valueAnnual))}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#999999] uppercase tracking-wider">
                        Score
                      </span>
                      <span
                        className="text-xs font-semibold text-[#1A1A1A]"
                        data-testid={`score-pillar-${id}`}
                      >
                        {pillar.score0to100}/100
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pillar.score0to100}%`,
                          backgroundColor: config.color,
                        }}
                        data-testid={`bar-pillar-${id}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-auto">
                    <div className="flex items-start gap-1.5">
                      <span className="text-[10px] text-[#CC2200] font-medium mt-px flex-shrink-0">
                        BLOCKER
                      </span>
                      <span
                        className="text-xs text-[#666666] leading-tight"
                        data-testid={`blocker-pillar-${id}`}
                      >
                        {blocker}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[10px] text-[#0D9488] font-medium mt-px flex-shrink-0">
                        ACTION
                      </span>
                      <span
                        className="text-xs text-[#666666] leading-tight"
                        data-testid={`action-pillar-${id}`}
                      >
                        {action}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-0.5">
                  Enterprise Value Capture Score
                </p>
                <p className="text-[10px] text-[#999999]">
                  Weighted average across all pillars
                </p>
              </div>
              <span
                className="text-3xl font-bold text-[#1A1A1A]"
                data-testid="value-enterprise-score"
              >
                {enterpriseScore}
              </span>
            </div>
            <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-[#E5E7EB]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${enterpriseScore}%`,
                  backgroundColor:
                    enterpriseScore >= 70
                      ? "#22C55E"
                      : enterpriseScore >= 40
                        ? "#F59E0B"
                        : "#EF4444",
                }}
                data-testid="bar-enterprise-score"
              />
            </div>
            <div className="flex justify-between text-[9px] text-[#BBBBBB] mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">
              What This Means
            </h2>
            <div className="space-y-3" data-testid="insights-list">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F5F0EB] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-[#EA2C00]">{i + 1}</span>
                  </div>
                  <p
                    className="text-sm text-[#666666] leading-relaxed"
                    data-testid={`insight-${i}`}
                  >
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!hasData && (
        <div className="text-center py-12 text-[#999999]">
          <TrendingUp className="w-8 h-8 mx-auto mb-3 text-[#CCCCCC]" />
          <p className="text-sm">Enter provider and encounter data to see your enterprise value map.</p>
        </div>
      )}

      <StepFooter onBack={onBack} onNext={onNext} nextTestId="button-next-valuemap" />
    </div>
  );
}
