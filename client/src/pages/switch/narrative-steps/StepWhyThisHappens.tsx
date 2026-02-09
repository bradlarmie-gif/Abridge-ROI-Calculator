import { useState } from "react";
import { ArrowRight, ArrowLeft, Users, Settings, Zap, TrendingUp, CheckCircle, ChevronRight, Clock, RefreshCw, Shield, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  formatCurrency,
  IMPLEMENTATION_TIMELINE,
  type SwitchInputs,
  type SwitchCalculations
} from "@/lib/switchGapCalculator";

interface StepWhyThisHappensProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
}

interface InsightCardData {
  id: string;
  icon: React.ElementType;
  number: string;
  challenge: {
    title: string;
    subtitle: string;
    description: string;
  };
  solution: {
    title: string;
    traits: string[];
  };
}

const INSIGHT_CARDS: InsightCardData[] = [
  {
    id: "adoption",
    icon: Users,
    number: "01",
    challenge: {
      title: "The Adoption Challenge",
      subtitle: "Why technology alone fails",
      description: "Without intentional change management, providers revert to old habits within weeks. Technology alone doesn't change behavior."
    },
    solution: {
      title: "What We've Seen Work",
      traits: ["Dedicated success partners", "Provider champions program", "Behavioral design expertise"]
    }
  },
  {
    id: "optimization",
    icon: Settings,
    number: "02",
    challenge: {
      title: "The Set-It-and-Forget-It Trap",
      subtitle: "Why value erodes over time",
      description: "AI implementations that aren't actively managed see declining utilization over 6-12 months. Initial enthusiasm fades."
    },
    solution: {
      title: "What We've Seen Work",
      traits: ["Continuous optimization cycles", "Quarterly business reviews", "Real-time utilization alerts"]
    }
  },
  {
    id: "specialty",
    icon: Zap,
    number: "03",
    challenge: {
      title: "The One-Size-Fits-All Problem",
      subtitle: "Why generic solutions fail",
      description: "Primary care, cardiology, and surgery have completely different documentation needs. Generic AI misses nuances."
    },
    solution: {
      title: "What We've Seen Work",
      traits: ["Specialty-specific templates", "Workflow customization", "EHR-specific integrations"]
    }
  },
  {
    id: "leadership",
    icon: TrendingUp,
    number: "04",
    challenge: {
      title: "The Missing Executive Sponsor",
      subtitle: "Why initiatives lose momentum",
      description: "Without visible leadership support, AI initiatives become \"another IT project\" and lose organizational priority."
    },
    solution: {
      title: "What We've Seen Work",
      traits: ["Executive alignment playbook", "ROI dashboards for leadership", "Peer network connections"]
    }
  }
];

interface ObjectionCardData {
  id: string;
  icon: React.ElementType;
  title: string;
  content: React.ReactNode;
}

function InsightCard({ 
  card, 
  isExpanded, 
  onToggle 
}: { 
  card: InsightCardData; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const Icon = card.icon;
  
  return (
    <div 
      className={`bg-white rounded-xl border overflow-hidden transition-all cursor-pointer ${
        isExpanded ? 'border-[#EA2C00]/30' : 'border-[#E5E7EB]'
      }`}
      onClick={onToggle}
      data-testid={`insight-card-${card.id}`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#EA2C00]" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-1">
                  Pattern {card.number}
                </p>
                <h3 className="font-semibold text-[#1A1A1A]">{card.challenge.title}</h3>
                <p className="text-xs text-[#999999] mt-1">{card.challenge.subtitle}</p>
              </div>
              <ChevronRight className={`w-5 h-5 text-[#999999] transition-transform flex-shrink-0 ${
                isExpanded ? 'rotate-90' : ''
              }`} />
            </div>
          </div>
        </div>
        
        <div className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[400px] opacity-100 mt-5' : 'max-h-0 opacity-0'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#F5F5F5] rounded-lg">
              <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-2">
                The Challenge
              </p>
              <p className="text-sm text-[#666666] leading-relaxed">
                {card.challenge.description}
              </p>
            </div>
            
            <div className="p-4 bg-[#FFEBE6] rounded-lg">
              <p className="text-xs font-medium text-[#EA2C00] uppercase tracking-[1.5px] mb-2">
                {card.solution.title}
              </p>
              <div className="space-y-2">
                {card.solution.traits.map((trait, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#EA2C00] flex-shrink-0" />
                    <span className="text-sm text-[#333333]">{trait}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StepWhyThisHappens({
  inputs,
  calculations,
  onNext,
  onBack,
}: StepWhyThisHappensProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const expandedCount = expandedCards.size;
  const allExpanded = expandedCount === INSIGHT_CARDS.length;

  const roiGap = formatCurrency(calculations.annualGap);
  const monthlyDelay = formatCurrency(Math.round(calculations.annualGap / 12));

  const objectionCards: ObjectionCardData[] = [
    {
      id: "just-implemented",
      icon: Clock,
      title: '"We just implemented"',
      content: (
        <>
          <p className="text-sm text-[#333333]">
            It's natural to want to give a new investment time. At the same time, if the gap is significant, the math may favor acting sooner rather than later.
          </p>
          <p className="text-sm text-[#333333] mt-3">
            Your current gap: <span className="font-bold text-[#EA2C00]" data-testid="text-objection-roi-gap">~{roiGap}/year</span>.
          </p>
        </>
      ),
    },
    {
      id: "change-fatigue",
      icon: RefreshCw,
      title: '"Change fatigue is real"',
      content: (
        <p className="text-sm text-[#333333]">
          Interestingly, providers with prior AI experience often adopt faster. They know what to look for and what's possible.
        </p>
      ),
    },
    {
      id: "good-enough",
      icon: Shield,
      title: '"It\'s good enough for now"',
      content: (
        <>
          <p className="text-sm text-[#333333]">
            "Good enough" has a cost. At your current realization score of {calculations.realizationScore}%, approximately {formatCurrency(calculations.monthlyGap)} in potential value goes unrealized each month.
          </p>
          <p className="text-sm text-[#333333] mt-2">
            The question isn't whether the tool works — it's whether you're getting what you're paying for.
          </p>
        </>
      ),
    },
    {
      id: "switching-costs",
      icon: ArrowRightLeft,
      title: '"The switching costs are too high"',
      content: (
        <p className="text-sm text-[#333333]">
          We've supported transitions from every major ambient AI vendor. The typical full deployment takes {IMPLEMENTATION_TIMELINE.implementationWeeks} weeks, with most providers productive within {IMPLEMENTATION_TIMELINE.rampMonths} months. Providers with prior AI experience typically ramp faster, not slower.
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
          What It Takes
        </h1>
        <p className="text-base text-[#666666]">
          Patterns we've observed across hundreds of implementations.
          <span className="block mt-1">Tap to explore each one.</span>
        </p>
      </div>

      <section className="bg-[#F5F0EB] rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border-l-4 border-[#EA2C00] pl-3">
            <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A]">150+</p>
            <p className="text-[10px] text-[#666666] uppercase tracking-[1.5px] mt-1">Health Systems</p>
          </div>
          <div className="border-l-4 border-[#EA2C00] pl-3">
            <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A]">95%</p>
            <p className="text-[10px] text-[#666666] uppercase tracking-[1.5px] mt-1">Retention Rate</p>
          </div>
          <div className="border-l-4 border-[#EA2C00] pl-3">
            <p className="text-3xl md:text-4xl font-bold text-[#EA2C00]">4</p>
            <p className="text-[10px] text-[#666666] uppercase tracking-[1.5px] mt-1">Key Patterns</p>
          </div>
          <div className="border-l-4 border-[#EA2C00] pl-3">
            <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A]">90</p>
            <p className="text-[10px] text-[#666666] uppercase tracking-[1.5px] mt-1">Day Onboarding</p>
          </div>
        </div>
      </section>

      <div>
        <p className="text-sm text-[#666666] mb-4">
          The implementations that succeed share four patterns. The ones that struggle are missing at least one.
        </p>
        <div className="space-y-3">
          {INSIGHT_CARDS.map((card) => (
            <InsightCard
              key={card.id}
              card={card}
              isExpanded={expandedCards.has(card.id)}
              onToggle={() => toggleCard(card.id)}
            />
          ))}
        </div>
      </div>

      {expandedCount > 0 && !allExpanded && (
        <div className="text-center">
          <p className="text-sm text-[#999999]">
            {expandedCount} of {INSIGHT_CARDS.length} patterns explored
          </p>
        </div>
      )}

      {allExpanded && (
        <section className="bg-[#F5F0EB] rounded-xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-[#EA2C00]" />
            </div>
            <div>
              <p className="font-semibold text-[#1A1A1A]">All patterns explored</p>
              <p className="text-sm text-[#666666]">
                The pattern is consistent: implementation quality determines ROI more than the technology itself. The best outcomes come from partners who invest in both.
              </p>
            </div>
          </div>
        </section>
      )}

      {!allExpanded && (
        <section className="bg-[#F5F0EB] rounded-xl p-5">
          <p className="text-sm text-[#666666]">
            <span className="font-semibold text-[#1A1A1A]">The bottom line:</span> Technology matters, but so does implementation, support, and ongoing optimization. They're equally important.
          </p>
        </section>
      )}

      <div className="h-px bg-[#E5E7EB]" />

      <section className="space-y-6" data-testid="switching-question-section">
        <div>
          <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-3">The Switching Question</p>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">
            "We already have a solution. Isn't switching too disruptive?"
          </h2>
          <p className="text-sm text-[#666666]">
            It's worth weighing the cost of switching against the cost of staying.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {objectionCards.map((card) => {
            const Icon = card.icon;
            return (
              <div 
                key={card.id} 
                className="bg-white rounded-xl border border-[#E0E0E0] p-5"
                data-testid={`objection-card-${card.id}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#EA2C00]" />
                  </div>
                  <h3 className="font-bold text-[#1A1A1A] text-sm">{card.title}</h3>
                </div>
                {card.content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 md:p-6">
        <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-4">Typical Timeline</p>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#E5E7EB]" />
          {[
            { week: "Weeks 1-2", title: "Planning & Configuration", desc: "EHR integration, workflow design, champion identification" },
            { week: "Weeks 3-4", title: "Pilot Launch", desc: "Select departments go live with dedicated support" },
            { week: `Week ${IMPLEMENTATION_TIMELINE.implementationWeeks}`, title: "Full Deployment", desc: "Organization-wide rollout with training" },
            { week: `Month ${IMPLEMENTATION_TIMELINE.rampMonths}`, title: "Optimization", desc: "Utilization tracking, workflow refinement, QBR cadence" },
            { week: `Month ${IMPLEMENTATION_TIMELINE.fullValueMonth}+`, title: "Full Value Realization", desc: "Benchmarks achieved, continuous improvement" },
          ].map((item, i) => (
            <div key={i} className="relative flex items-start gap-4 pb-6 last:pb-0">
              <div className="relative z-10 w-8 h-8 rounded-full bg-[#FFF5F2] border-2 border-[#EA2C00] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-[#EA2C00]">{i + 1}</span>
              </div>
              <div className="pt-1">
                <p className="text-[10px] font-medium text-[#EA2C00] uppercase tracking-[1.5px]">{item.week}</p>
                <p className="text-sm font-semibold text-[#1A1A1A]">{item.title}</p>
                <p className="text-xs text-[#666666] mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <Button
          onClick={onNext}
          className="bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white gap-2 rounded-full px-6 h-11"
          data-testid="button-next"
        >
          The Opportunity
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
