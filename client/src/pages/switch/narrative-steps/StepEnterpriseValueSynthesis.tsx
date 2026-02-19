import { useMemo } from "react";
import { Zap, DollarSign, Users, ShieldCheck, TrendingUp, AlertTriangle, Download } from "lucide-react";
import { useAssessment } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { computePillars } from "@/lib/pillars/computePillars";
import type { PillarId } from "@/lib/pillars/computePillars";

interface StepEnterpriseValueSynthesisProps {
  onNext: () => void;
  onBack: () => void;
}

const PILLAR_CONFIG: Record<PillarId, {
  label: string;
  icon: typeof Zap;
  color: string;
  blockerLabels: Record<string, string>;
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
  },
  risk: {
    label: "Enterprise Risk",
    icon: ShieldCheck,
    color: "#D97706",
    blockerLabels: {
      docDefensibility: "Documentation not audit-ready",
      qualityReportingFriction: "Quality reporting requires heavy effort",
      structuredDataUsability: "Unstructured data limits automation",
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

interface LeakageDriver {
  name: string;
  atStake: number;
  action: string;
  linkedPillar: PillarId;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

function computeLeakageDrivers(
  pillars: Record<PillarId, { valueAnnual: number; score0to100: number; topBlockerKey: string }>,
  inputs: { utilization: number; editTimePerEncounter: number; timeSavedPerEncounter: number; satisfaction: number; docCompleteness: number },
  enterpriseScore: number,
): LeakageDriver[] {
  const candidates: (LeakageDriver & { friction: number })[] = [];

  const utilizationGap = Math.max(0, 76 - inputs.utilization);
  candidates.push({
    name: "Coverage & Adoption Gap",
    atStake: pillars.capacity.valueAnnual,
    action: "Deploy provider-champion network to close adoption gaps",
    linkedPillar: "capacity",
    friction: utilizationGap * 1.3 + (100 - pillars.capacity.score0to100) * 0.4,
  });

  const editRatio = inputs.timeSavedPerEncounter > 0
    ? (inputs.editTimePerEncounter / inputs.timeSavedPerEncounter) * 100
    : 50;
  candidates.push({
    name: "Edit Burden & Friction Tax",
    atStake: pillars.capacity.valueAnnual,
    action: "Audit top edit patterns and build targeted prompt refinements",
    linkedPillar: "capacity",
    friction: editRatio * 0.8 + (100 - pillars.capacity.score0to100) * 0.3,
  });

  const satGap = Math.max(0, 85 - inputs.satisfaction);
  candidates.push({
    name: "Provider Trust Deficit",
    atStake: pillars.workforce.valueAnnual,
    action: "Share accuracy metrics transparently and create feedback loops",
    linkedPillar: "workforce",
    friction: satGap * 1.0 + (100 - pillars.workforce.score0to100) * 0.5,
  });

  const docGap = Math.max(0, 80 - inputs.docCompleteness);
  candidates.push({
    name: "Specialty Tailoring Gap",
    atStake: pillars.yield.valueAnnual + pillars.risk.valueAnnual,
    action: "Conduct specialty-by-specialty documentation audits",
    linkedPillar: pillars.yield.score0to100 < pillars.risk.score0to100 ? "yield" : "risk",
    friction: docGap * 1.0 + (100 - pillars.yield.score0to100) * 0.4 + (100 - pillars.risk.score0to100) * 0.2,
  });

  const govGap = Math.max(0, 60 - enterpriseScore);
  const lowestPillar = PILLAR_ORDER.reduce(
    (min, p) => pillars[p].score0to100 < pillars[min].score0to100 ? p : min,
    "capacity" as PillarId,
  );
  candidates.push({
    name: "Executive Ownership & Governance",
    atStake: pillars[lowestPillar].valueAnnual,
    action: "Establish quarterly executive review with pillar-level tracking",
    linkedPillar: lowestPillar,
    friction: govGap * 1.2 + (100 - enterpriseScore) * 0.5,
  });

  return candidates
    .sort((a, b) => b.friction - a.friction)
    .slice(0, 3)
    .map(({ friction: _f, ...rest }) => rest);
}

function generateInsights(
  pillars: Record<PillarId, { valueAnnual: number; score0to100: number; topBlockerKey: string }>,
): string[] {
  const sorted = [...PILLAR_ORDER].sort(
    (a, b) => pillars[a].score0to100 - pillars[b].score0to100,
  );
  const insights: string[] = [];

  const lowest = sorted[0];
  const lowestConfig = PILLAR_CONFIG[lowest];
  insights.push(
    `${lowestConfig.label} is your largest opportunity area at ${pillars[lowest].score0to100}/100 — focused action here yields the highest marginal return.`,
  );

  const secondLowest = sorted[1];
  const secondConfig = PILLAR_CONFIG[secondLowest];
  if (pillars[secondLowest].valueAnnual > 0) {
    insights.push(
      `${secondConfig.label} represents ${formatCurrency(pillars[secondLowest].valueAnnual)}/yr in recoverable value with targeted intervention.`,
    );
  }

  const topPillar = sorted[sorted.length - 1];
  const topConfig = PILLAR_CONFIG[topPillar];
  insights.push(
    `${topConfig.label} scores ${pillars[topPillar].score0to100}/100 — protect this foundation while investing in lower-scoring areas.`,
  );

  return insights.slice(0, 3);
}

export default function StepEnterpriseValueSynthesis({
  onNext,
  onBack,
}: StepEnterpriseValueSynthesisProps) {
  const { state } = useAssessment();

  const result = useMemo(() => computePillars(state), [state]);
  const { pillars, totalAnnual } = result;

  const enterpriseScore = Math.round(
    PILLAR_ORDER.reduce(
      (acc, id) => acc + pillars[id].score0to100 * PILLAR_WEIGHTS[id],
      0,
    ),
  );

  const roomToUnlock = 100 - enterpriseScore;

  const leakageDrivers = useMemo(
    () => computeLeakageDrivers(pillars, state.inputs, enterpriseScore),
    [pillars, state.inputs, enterpriseScore],
  );

  const insights = useMemo(
    () => generateInsights(pillars),
    [pillars],
  );

  const hasData = state.inputs.providers > 0 && state.inputs.annualEncounters > 0;

  return (
    <div className={`space-y-8 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-center">
        <p className="text-[11px] text-[#999999] uppercase tracking-widest mb-2">
          Enterprise Value Synthesis
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Unrealized Enterprise Value
        </h1>
        {hasData && (
          <p
            className="text-5xl md:text-6xl font-bold text-[#1A1A1A] mt-4 mb-2 tabular-nums"
            data-testid="value-total-opportunity"
          >
            {formatCurrency(Math.round(totalAnnual))}
          </p>
        )}
        <p className="text-base text-[#1A1A1A] mt-4 leading-relaxed max-w-lg mx-auto">
          This is not a projection. It is a measurement of what your documentation infrastructure is already failing to capture.
        </p>
        <p className="text-sm text-[#999999] mt-2">
          Conservative, haircut-adjusted across four enterprise value pillars.
        </p>
      </div>

      {hasData && (
        <>
          <section data-testid="pillar-cards">
            <p className="text-[10px] text-[#999999] uppercase tracking-widest mb-3 font-medium">
              Pillar Breakdown
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PILLAR_ORDER.map((id) => {
                const pillar = pillars[id];
                const config = PILLAR_CONFIG[id];
                const Icon = config.icon;
                const blocker =
                  config.blockerLabels[pillar.topBlockerKey] || "Review inputs";

                return (
                  <div
                    key={id}
                    className="bg-[#F5F0EB] rounded-xl border border-[#E8E0D8] p-4 flex flex-col gap-2.5"
                    data-testid={`card-pillar-${id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${config.color}15` }}
                        >
                          <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                        </div>
                        <span className="text-sm font-semibold text-[#1A1A1A]">
                          {config.label}
                        </span>
                      </div>
                      <span
                        className="text-lg font-bold text-[#1A1A1A] tabular-nums"
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
                          className="text-xs font-semibold text-[#1A1A1A] tabular-nums"
                          data-testid={`score-pillar-${id}`}
                        >
                          {pillar.score0to100}/100
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
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

                    <div className="flex items-start gap-1.5 mt-auto">
                      <AlertTriangle className="w-3 h-3 text-[#CC2200] mt-0.5 flex-shrink-0" />
                      <span
                        className="text-[11px] text-[#666666] leading-snug"
                        data-testid={`blocker-pillar-${id}`}
                      >
                        {blocker}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section data-testid="leakage-section">
            <p className="text-[10px] text-[#999999] uppercase tracking-widest mb-3 font-medium">
              Where Value Leaks — Top 3
            </p>
            <div className="space-y-2">
              {leakageDrivers.map((driver, idx) => {
                const pillarColor = PILLAR_CONFIG[driver.linkedPillar].color;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-start gap-3"
                    data-testid={`leakage-driver-${idx}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        idx === 0 ? "bg-[#EA2C00]" : "bg-[#CCCCCC]"
                      }`}
                    >
                      <span className="text-[10px] font-bold text-white">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-[#1A1A1A]">
                          {driver.name}
                        </h3>
                        {driver.atStake > 0 && (
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{ color: pillarColor }}
                            data-testid={`leakage-atstake-${idx}`}
                          >
                            {formatCurrency(driver.atStake)} at stake
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#888888] mt-1 leading-relaxed">
                        {driver.action}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]"
            data-testid="capture-score-section"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] text-[#999999] uppercase tracking-wider font-medium mb-0.5">
                  Enterprise Capture Score
                </p>
                <p className="text-[10px] text-[#999999]">
                  Weighted average across all pillars
                </p>
              </div>
              <span
                className="text-3xl font-bold text-[#1A1A1A] tabular-nums"
                data-testid="value-enterprise-score"
              >
                {enterpriseScore}
              </span>
            </div>
            <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-[#E8E0D8]">
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
            <div className="flex justify-between mt-2">
              <div className="flex justify-between text-[9px] text-[#BBBBBB] w-full">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
            <p
              className="text-xs text-[#888888] mt-2 text-center"
              data-testid="text-room-to-unlock"
            >
              Room to unlock: <span className="font-semibold text-[#EA2C00]">{roomToUnlock}%</span>
            </p>
          </section>

          <section data-testid="what-this-means">
            <p className="text-[10px] text-[#999999] uppercase tracking-widest mb-3 font-medium">
              What This Means
            </p>
            <div className="space-y-2.5">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2.5">
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
          </section>

          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-[#999] hover:text-[#EA2C00] transition-colors"
              data-testid="button-download-brief"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Executive Brief</span>
            </button>
          </div>
        </>
      )}

      {!hasData && (
        <div className="text-center py-12 text-[#999999]">
          <TrendingUp className="w-8 h-8 mx-auto mb-3 text-[#CCCCCC]" />
          <p className="text-sm">Enter provider and encounter data to see your enterprise value synthesis.</p>
        </div>
      )}

      <StepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel="See the Cost of Inaction"
        nextTestId="button-build-action-plan"
      />
    </div>
  );
}
