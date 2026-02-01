import { useState } from "react";
import { ArrowRight, ArrowLeft, Users, Settings, Zap, TrendingUp, CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
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
      title: "Strategic Change Partners",
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
      description: "Most implementations peak at launch and plateau. Without continuous optimization, value erodes over time."
    },
    solution: {
      title: "Continuous Optimization",
      traits: ["Quarterly business reviews", "Real-time analytics", "Proactive performance monitoring"]
    }
  },
  {
    id: "specialty",
    icon: Zap,
    number: "03",
    challenge: {
      title: "The One-Size-Fits-All Problem",
      subtitle: "Why generic solutions fail",
      description: "Generic solutions miss the nuances of different specialties, workflows, and organizational cultures."
    },
    solution: {
      title: "Deep Customization",
      traits: ["Specialty-specific templates", "Workflow integration", "EHR-native experience"]
    }
  },
  {
    id: "leadership",
    icon: TrendingUp,
    number: "04",
    challenge: {
      title: "The Missing Executive Sponsor",
      subtitle: "Why initiatives lose momentum",
      description: "Without visible leadership support, initiatives lose momentum. Providers sense when something isn't a priority."
    },
    solution: {
      title: "Strategic Partnership",
      traits: ["Executive briefings", "ROI dashboards", "Stakeholder alignment"]
    }
  }
];

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
        isExpanded ? 'border-[#EA2C00]/30 shadow-sm' : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={onToggle}
      data-testid={`insight-card-${card.id}`}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
              <Icon className="w-6 h-6 text-[#EA2C00]" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-1">
                  Pattern {card.number}
                </p>
                <h3 className="font-bold text-black text-lg">{card.challenge.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{card.challenge.subtitle}</p>
              </div>
              <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${
                isExpanded ? 'rotate-90' : ''
              }`} />
            </div>
          </div>
        </div>
        
        <div className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[400px] opacity-100 mt-6' : 'max-h-0 opacity-0'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                The Challenge
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {card.challenge.description}
              </p>
            </div>
            
            <div className="p-4 bg-[#FFF5F2] rounded-lg border border-[#EA2C00]/10">
              <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-2">
                {card.solution.title}
              </p>
              <div className="space-y-2">
                {card.solution.traits.map((trait, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#EA2C00] flex-shrink-0" />
                    <span className="text-sm text-slate-700">{trait}</span>
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

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm font-semibold text-[#EA2C00] uppercase tracking-widest mb-2">Implementation Insights</p>
        <h1 className="font-abridge uppercase text-3xl md:text-4xl font-bold text-black mb-3" data-testid="text-page-title">
          What It Takes
        </h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
          Here's what we've learned from hundreds of implementations.
          <span className="block text-slate-500 mt-1">Tap each pattern to see what makes the difference.</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-4xl font-bold text-black">150+</p>
              <p className="text-sm text-slate-500 mt-1">Health systems</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-black">95%</p>
              <p className="text-sm text-slate-500 mt-1">Retention rate</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-[#EA2C00]">4</p>
              <p className="text-sm text-slate-500 mt-1">Key patterns</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-black">90</p>
              <p className="text-sm text-slate-500 mt-1">Day onboarding</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-[#FFF5F2]">
          <p className="text-sm text-center text-slate-700">
            <span className="font-semibold text-[#EA2C00]">Why these patterns matter:</span> The organizations that capture full value aren't just buying technology — they're partnering with teams who understand these challenges deeply.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {INSIGHT_CARDS.map((card) => (
          <InsightCard
            key={card.id}
            card={card}
            isExpanded={expandedCards.has(card.id)}
            onToggle={() => toggleCard(card.id)}
          />
        ))}
      </div>

      {expandedCount > 0 && !allExpanded && (
        <div className="text-center">
          <p className="text-sm text-slate-400">
            {expandedCount} of {INSIGHT_CARDS.length} patterns explored
          </p>
        </div>
      )}

      {allExpanded && (
        <div className="bg-black rounded-xl p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-1">All Patterns Explored</p>
              <p className="text-white text-lg font-medium">
                Implementation matters more than the tool itself.
              </p>
              <p className="text-white/70 text-sm mt-1">
                You now understand why partnership quality determines ROI.
              </p>
            </div>
          </div>
        </div>
      )}

      {!allExpanded && (
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-center">
          <p className="text-slate-700 text-sm">
            <span className="font-semibold text-black">The bottom line:</span> capturing the value you saw in The Math 
            requires more than good technology. It requires the right partnership.
          </p>
        </div>
      )}

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
          className="bg-black hover:bg-black/90 text-white gap-2 rounded-full px-6"
          data-testid="button-next"
        >
          Your Next Steps
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
