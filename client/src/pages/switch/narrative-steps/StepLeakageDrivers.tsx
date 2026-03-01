import { useState, useMemo } from "react";
import { ChevronDown, Target, Pencil, UserCheck, Layers, Building2 } from "lucide-react";
import { useAssessment } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { computePillars } from "@/lib/pillars/computePillars";
import type { PillarId } from "@/lib/pillars/computePillars";

interface StepLeakageDriversProps {
  onNext: () => void;
  onBack: () => void;
}

type BlockerId = "coverage" | "editBurden" | "providerTrust" | "specialtyTailoring" | "executiveOwnership";

interface BlockerContent {
  id: BlockerId;
  icon: typeof Target;
  title: string;
  subtitle: string;
  whatWeSee: string;
  whyItMatters: string;
  whatWorks: [string, string, string];
  thirtyDayMove: string;
}

interface RankedBlocker extends BlockerContent {
  frictionScore: number;
  linkedPillar: PillarId;
  atStakeValue: number;
}

const BLOCKER_CONTENT: BlockerContent[] = [
  {
    id: "coverage",
    icon: Target,
    title: "Coverage & Adoption Gap",
    subtitle: "Unrealized encounter volume limits every pillar",
    whatWeSee:
      "A significant share of encounters never flow through the AI documentation system. Providers who haven't adopted — or who adopted and lapsed — represent value that's been approved but never captured.",
    whyItMatters:
      "Each un-covered encounter represents a potential missed opportunity across all four value pillars: time recovery, coding uplift, burnout relief, and documentation defensibility. Coverage is typically the single highest-leverage multiplier in enterprise value capture.",
    whatWorks: [
      "Deploy a provider-champion network — peer influence outperforms top-down mandates 3:1 in sustained adoption",
      "Implement specialty-wave onboarding (4-6 week cohorts) instead of organization-wide launches that dilute support resources",
      "Create real-time adoption dashboards visible to department leads with weekly cadence reviews",
    ],
    thirtyDayMove:
      "Identify the 10 highest-volume non-adopters, assign a champion to each, and schedule a 15-minute workflow walkthrough within two weeks.",
  },
  {
    id: "editBurden",
    icon: Pencil,
    title: "Edit Burden & Friction Tax",
    subtitle: "Post-generation editing erodes net time recovery",
    whatWeSee:
      "Providers are spending meaningful time editing AI-generated notes before signing. The gross time saved per encounter is being partially consumed by correction, restructuring, or supplementation — reducing net capacity recovery.",
    whyItMatters:
      "Edit friction directly reduces the Capacity pillar — every minute spent editing is a minute not returned to patient care or schedule capacity. It also signals note quality issues that ripple into Yield (incomplete coding) and Risk (documentation gaps).",
    whatWorks: [
      "Audit the top 5 edit patterns by specialty and build targeted prompt refinements — most friction comes from a small number of repeating issues",
      "Enable note-template customization so AI output matches each provider's documentation style, not a generic format",
      "Track edit-time-per-encounter as a KPI with monthly trending — what gets measured improves",
    ],
    thirtyDayMove:
      "Pull a 2-week sample of edited notes from the top 3 specialties, categorize the edit types, and deliver a findings brief to the clinical informatics team.",
  },
  {
    id: "providerTrust",
    icon: UserCheck,
    title: "Provider Trust Deficit",
    subtitle: "Low confidence limits engagement and sustained use",
    whatWeSee:
      "Provider satisfaction and note acceptance rates suggest the clinical team doesn't fully trust the AI output. When providers don't trust the notes, they either over-edit, under-use, or abandon the tool entirely — all of which suppress value capture.",
    whyItMatters:
      "Trust is the foundation of Workforce Stability. Providers who don't believe the tool helps them won't sustain usage, and dissatisfaction accelerates burnout and turnover risk. It also limits Yield — providers who don't trust notes won't rely on AI-captured complexity for coding.",
    whatWorks: [
      "Share accuracy metrics transparently with providers — data builds trust faster than assertions alone",
      "Create a provider feedback loop with visible response times (show providers their input drives improvement)",
      "Highlight early-adopter success stories within the same specialty — peer credibility outweighs vendor claims",
    ],
    thirtyDayMove:
      "Survey the 20 most active users on their top frustration and top value moment, then share a one-page summary with all providers and the leadership team.",
  },
  {
    id: "specialtyTailoring",
    icon: Layers,
    title: "Specialty Tailoring Gap",
    subtitle: "Generic configurations miss specialty-specific value",
    whatWeSee:
      "Documentation completeness and note acceptance vary significantly across specialties. The AI is likely configured with general-purpose templates that don't account for the distinct documentation patterns, terminology, and compliance requirements of each clinical domain.",
    whyItMatters:
      "Specialty gaps directly suppress Yield — when notes miss procedure-specific details, coding accuracy drops. They also drag down Risk by creating documentation that's technically complete but clinically imprecise, which auditors flag and quality teams must manually remediate.",
    whatWorks: [
      "Conduct specialty-by-specialty documentation audits comparing AI output against coding requirements and compliance standards",
      "Build specialty-specific note configurations with input from clinical champions in each department",
      "Create specialty performance benchmarks so each department can track its own trajectory rather than being averaged with others",
    ],
    thirtyDayMove:
      "Select the two specialties with the widest gap between adoption and note acceptance, schedule a 30-minute workflow review with their clinical lead, and document the top 3 template adjustments needed.",
  },
  {
    id: "executiveOwnership",
    icon: Building2,
    title: "Executive Ownership & Governance",
    subtitle: "Without visible sponsorship, value capture stalls",
    whatWeSee:
      "The enterprise value capture score suggests the organization hasn't established a formal governance structure for ambient AI. Without executive ownership, optimization efforts are ad hoc, cross-departmental coordination is limited, and value tracking lacks rigor.",
    whyItMatters:
      "Executive governance determines whether ambient AI is treated as a strategic platform investment or a departmental experiment. Organizations with formal C-suite sponsorship realize 2-3x more value because they align incentives, fund optimization, and hold teams accountable to value targets across all four pillars.",
    whatWorks: [
      "Establish a quarterly executive review with pillar-level value tracking — make the ROI visible at the board level",
      "Appoint a cross-functional AI governance committee with clinical, operational, and financial representation",
      "Tie ambient AI performance metrics to existing operational KPIs (throughput, quality scores, provider retention) so it's not a separate initiative",
    ],
    thirtyDayMove:
      "Schedule a 45-minute executive briefing using the Enterprise Value Map data, propose a quarterly review cadence, and name an executive sponsor before the next leadership meeting.",
  },
];

function scoreBlocker(
  id: BlockerId,
  pillars: Record<PillarId, { score0to100: number; valueAnnual: number; topBlockerKey: string }>,
  inputs: {
    utilization: number;
    editTimePerEncounter: number;
    timeSavedPerEncounter: number;
    satisfaction: number;
    docCompleteness: number;
  },
  enterpriseScore: number,
): { frictionScore: number; linkedPillar: PillarId; atStakeValue: number } {
  switch (id) {
    case "coverage": {
      const utilizationGap = Math.max(0, 76 - inputs.utilization);
      const frictionScore = utilizationGap * 1.3 + (100 - pillars.capacity.score0to100) * 0.4;
      return { frictionScore, linkedPillar: "capacity", atStakeValue: pillars.capacity.valueAnnual };
    }
    case "editBurden": {
      const editRatio = inputs.timeSavedPerEncounter > 0
        ? (inputs.editTimePerEncounter / inputs.timeSavedPerEncounter) * 100
        : 50;
      const frictionScore = editRatio * 0.8 + (100 - pillars.capacity.score0to100) * 0.3;
      return { frictionScore, linkedPillar: "capacity", atStakeValue: pillars.capacity.valueAnnual };
    }
    case "providerTrust": {
      const satGap = Math.max(0, 85 - inputs.satisfaction);
      const frictionScore = satGap * 1.0 + (100 - pillars.workforce.score0to100) * 0.5;
      return { frictionScore, linkedPillar: "workforce", atStakeValue: pillars.workforce.valueAnnual };
    }
    case "specialtyTailoring": {
      const docGap = Math.max(0, 80 - inputs.docCompleteness);
      const frictionScore = docGap * 1.0 + (100 - pillars.yield.score0to100) * 0.4 + (100 - pillars.risk.score0to100) * 0.2;
      return {
        frictionScore,
        linkedPillar: pillars.yield.score0to100 < pillars.risk.score0to100 ? "yield" : "risk",
        atStakeValue: pillars.yield.valueAnnual + pillars.risk.valueAnnual,
      };
    }
    case "executiveOwnership": {
      const govGap = Math.max(0, 60 - enterpriseScore);
      const lowestPillar = (["capacity", "yield", "workforce", "risk"] as PillarId[]).reduce(
        (min, p) => pillars[p].score0to100 < pillars[min].score0to100 ? p : min,
        "capacity" as PillarId,
      );
      const frictionScore = govGap * 1.2 + (100 - enterpriseScore) * 0.5;
      return {
        frictionScore,
        linkedPillar: lowestPillar,
        atStakeValue: pillars[lowestPillar].valueAnnual,
      };
    }
  }
}

const PILLAR_WEIGHTS: Record<PillarId, number> = {
  capacity: 0.30,
  yield: 0.30,
  workforce: 0.20,
  risk: 0.20,
};

const PILLAR_LABELS: Record<PillarId, string> = {
  capacity: "Capacity",
  yield: "Revenue & Yield",
  workforce: "Workforce Stability",
  risk: "Enterprise Risk",
};

const PILLAR_COLORS: Record<PillarId, string> = {
  capacity: "#EA2C00",
  yield: "#0D9488",
  workforce: "#7C3AED",
  risk: "#D97706",
};

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

export default function StepLeakageDrivers({
  onNext,
  onBack,
}: StepLeakageDriversProps) {
  const { state } = useAssessment();
  const [openBlocker, setOpenBlocker] = useState<BlockerId | null>(null);

  const result = useMemo(() => computePillars(state), [state]);
  const { pillars } = result;

  const enterpriseScore = Math.round(
    (["capacity", "yield", "workforce", "risk"] as PillarId[]).reduce(
      (acc, id) => acc + pillars[id].score0to100 * PILLAR_WEIGHTS[id],
      0,
    ),
  );

  const rankedBlockers: RankedBlocker[] = useMemo(() => {
    const scored = BLOCKER_CONTENT.map((b) => {
      const { frictionScore, linkedPillar, atStakeValue } = scoreBlocker(
        b.id,
        pillars,
        state.inputs,
        enterpriseScore,
      );
      return { ...b, frictionScore, linkedPillar, atStakeValue };
    });
    return scored.sort((a, b) => b.frictionScore - a.frictionScore);
  }, [pillars, state.inputs, enterpriseScore]);

  return (
    <div className={`space-y-10 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <p className="text-xs text-[#999999] uppercase tracking-widest mb-2">
          Value Capture Diagnostics
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Where Value Leaks
        </h1>
        <p className="text-base text-[#888888] leading-relaxed">
          Ranked by which friction points are costing you the most enterprise value — and what to do about each one.
        </p>
      </div>

      <div className="space-y-3" data-testid="leakage-drivers-list">
        {rankedBlockers.map((blocker, idx) => {
          const Icon = blocker.icon;
          const isOpen = openBlocker === blocker.id;
          const pillarColor = PILLAR_COLORS[blocker.linkedPillar];
          const isTopBlocker = idx === 0;

          return (
            <div
              key={blocker.id}
              className={`rounded-xl border bg-white overflow-visible transition-all ${
                isTopBlocker
                  ? "border-[#EA2C00]/30"
                  : "border-[#E5E7EB]"
              }`}
              data-testid={`blocker-card-${blocker.id}`}
            >
              <button
                onClick={() => setOpenBlocker(isOpen ? null : blocker.id)}
                className="w-full flex items-center gap-4 p-5 text-left"
                data-testid={`button-blocker-${blocker.id}`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 relative ${
                    isTopBlocker ? "bg-[#FFF5F2]" : "bg-[#F5F0EB]"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isTopBlocker ? "text-[#EA2C00]" : "text-[#666666]"}`} />
                  <div
                    className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold text-white ${
                      isTopBlocker ? "bg-[#EA2C00]" : "bg-[#999999]"
                    }`}
                    data-testid={`rank-badge-${blocker.id}`}
                  >
                    {idx + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1A1A1A] text-[15px]">{blocker.title}</h3>
                  <p className="text-xs text-[#999999] mt-0.5">{blocker.subtitle}</p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {blocker.atStakeValue > 0 && (
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] text-[#999999] uppercase tracking-wider">At Stake</p>
                      <p className="text-sm font-bold" style={{ color: pillarColor }}>
                        {formatCurrency(blocker.atStakeValue)}
                      </p>
                    </div>
                  )}
                  <ChevronDown
                    className={`w-5 h-5 text-[#999999] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-0 space-y-4" data-testid={`blocker-detail-${blocker.id}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: pillarColor }}
                    />
                    <span className="text-[12px] font-medium uppercase tracking-wider" style={{ color: pillarColor }}>
                      Linked to {PILLAR_LABELS[blocker.linkedPillar]}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[12px] font-bold text-[#999999] uppercase tracking-wider mb-2">
                        What We See
                      </p>
                      <p
                        className="text-sm text-[#333333] leading-relaxed"
                        data-testid={`what-we-see-${blocker.id}`}
                      >
                        {blocker.whatWeSee}
                      </p>
                    </div>
                    <div className="bg-[#FFF5F2] rounded-lg p-4">
                      <p className="text-[12px] font-bold text-[#EA2C00] uppercase tracking-wider mb-2">
                        Why It Matters Economically
                      </p>
                      <p
                        className="text-sm text-[#333333] leading-relaxed"
                        data-testid={`why-it-matters-${blocker.id}`}
                      >
                        {blocker.whyItMatters}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
                    <p className="text-[12px] font-bold text-[#059669] uppercase tracking-wider mb-3">
                      What Works
                    </p>
                    <ul className="space-y-2.5" data-testid={`what-works-${blocker.id}`}>
                      {blocker.whatWorks.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-[#333333] leading-relaxed">
                          <div className="w-5 h-5 rounded-full bg-[#ECFDF5] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[12px] font-bold text-[#059669]">{i + 1}</span>
                          </div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[#1A1A1A] rounded-lg p-4">
                    <p className="text-[12px] font-bold text-[#EA2C00] uppercase tracking-wider mb-2">
                      30-Day Move
                    </p>
                    <p
                      className="text-sm text-white leading-relaxed"
                      data-testid={`thirty-day-move-${blocker.id}`}
                    >
                      {blocker.thirtyDayMove}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <StepFooter onBack={onBack} onNext={onNext} nextTestId="button-next-leakage" />
    </div>
  );
}
