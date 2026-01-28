import { useState } from "react";
import { ArrowRight, ArrowLeft, RotateCcw, Users, Settings, Zap, TrendingUp, Sparkles } from "lucide-react";
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

interface FlipCardData {
  id: string;
  icon: React.ElementType;
  challenge: {
    title: string;
    description: string;
  };
  solution: {
    title: string;
    description: string;
    traits: string[];
  };
  frontBg: string;
  frontText: string;
  backBg: string;
  accentColor: string;
}

const FLIP_CARDS: FlipCardData[] = [
  {
    id: "adoption",
    icon: Users,
    challenge: {
      title: "The Adoption Challenge",
      description: "Technology alone doesn't change behavior. Without intentional change management, providers revert to old habits within weeks."
    },
    solution: {
      title: "Strategic Change Partners",
      description: "Implementation that treats adoption as a human challenge, not a technical one.",
      traits: ["Dedicated success partners", "Provider champions program", "Behavioral design expertise"]
    },
    frontBg: "bg-slate-700",
    frontText: "text-white",
    backBg: "bg-slate-50",
    accentColor: "text-slate-700"
  },
  {
    id: "optimization",
    icon: Settings,
    challenge: {
      title: "The Set-It-and-Forget-It Trap",
      description: "Most implementations peak at launch and plateau. Without continuous optimization, value erodes over time."
    },
    solution: {
      title: "Continuous Optimization",
      description: "Ongoing refinement that treats implementation as a journey, not a destination.",
      traits: ["Quarterly business reviews", "Real-time analytics", "Proactive performance monitoring"]
    },
    frontBg: "bg-slate-600",
    frontText: "text-white",
    backBg: "bg-slate-50",
    accentColor: "text-slate-600"
  },
  {
    id: "specialty",
    icon: Zap,
    challenge: {
      title: "The One-Size-Fits-All Problem",
      description: "Generic solutions miss the nuances of different specialties, workflows, and organizational cultures."
    },
    solution: {
      title: "Deep Customization",
      description: "Configuration that respects the complexity of healthcare, specialty by specialty.",
      traits: ["Specialty-specific templates", "Workflow integration", "EHR-native experience"]
    },
    frontBg: "bg-slate-500",
    frontText: "text-white",
    backBg: "bg-slate-50",
    accentColor: "text-slate-600"
  },
  {
    id: "leadership",
    icon: TrendingUp,
    challenge: {
      title: "The Missing Executive Sponsor",
      description: "Without visible leadership support, initiatives lose momentum. Providers sense when something isn't a priority."
    },
    solution: {
      title: "Strategic Partnership",
      description: "Engagement models designed to maintain executive visibility and organizational momentum.",
      traits: ["Executive briefings", "ROI dashboards", "Stakeholder alignment"]
    },
    frontBg: "bg-slate-400",
    frontText: "text-white",
    backBg: "bg-slate-50",
    accentColor: "text-slate-600"
  }
];

function FlipCard({ card, isFlipped, onFlip }: { 
  card: FlipCardData; 
  isFlipped: boolean; 
  onFlip: () => void;
}) {
  const Icon = card.icon;
  
  return (
    <div 
      className="relative h-[260px] cursor-pointer group"
      onClick={onFlip}
      data-testid={`flip-card-${card.id}`}
    >
      <div 
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        <div 
          className="absolute w-full h-full rounded-xl overflow-hidden shadow-sm"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className={`w-full h-full ${card.frontBg} p-5 flex flex-col ${card.frontText}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 text-white/50 text-xs font-medium">
                <RotateCcw className="w-3 h-3" />
                <span>Tap to flip</span>
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">{card.challenge.title}</h3>
            <p className="text-white/80 text-sm leading-relaxed flex-1">
              {card.challenge.description}
            </p>
            <div className="mt-3 pt-3 border-t border-white/15">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                The pattern we see
              </p>
            </div>
          </div>
        </div>

        <div 
          className="absolute w-full h-full rounded-xl overflow-hidden"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className={`w-full h-full ${card.backBg} p-5 flex flex-col border border-slate-200`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                <Sparkles className={`w-5 h-5 ${card.accentColor}`} />
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 text-xs font-medium">
                <RotateCcw className="w-3 h-3" />
                <span>Tap to flip</span>
              </div>
            </div>
            <h3 className={`text-lg font-bold mb-2 ${card.accentColor}`}>{card.solution.title}</h3>
            <p className="text-slate-500 text-sm mb-3">
              {card.solution.description}
            </p>
            <div className="space-y-1.5 flex-1">
              {card.solution.traits.map((trait, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-slate-400" />
                  <span className="text-sm text-slate-600">{trait}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                What success requires
              </p>
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
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const toggleCard = (cardId: string) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const flippedCount = flippedCards.size;
  const allFlipped = flippedCount === FLIP_CARDS.length;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          What It Takes
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          Here's what we've learned from hundreds of implementations.
          <br className="hidden md:block" />
          <span className="text-[#374151]">Tap each card to see what makes the difference.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FLIP_CARDS.map((card) => (
          <FlipCard
            key={card.id}
            card={card}
            isFlipped={flippedCards.has(card.id)}
            onFlip={() => toggleCard(card.id)}
          />
        ))}
      </div>

      {flippedCount > 0 && !allFlipped && (
        <div className="text-center">
          <p className="text-sm text-[#9CA3AF]">
            {flippedCount} of {FLIP_CARDS.length} explored
          </p>
        </div>
      )}

      {allFlipped && (
        <div className="bg-slate-800 rounded-xl p-6 text-white text-center">
          <div className="max-w-xl mx-auto">
            <p className="text-base md:text-lg font-medium mb-2">
              This is why implementation matters more than the tool itself.
            </p>
            <p className="text-slate-400 text-sm">
              The organizations that capture full value aren't just buying technology — 
              they're partnering with teams who understand these challenges deeply.
            </p>
          </div>
        </div>
      )}

      {!allFlipped && (
        <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 text-center">
          <p className="text-[#374151] text-sm">
            <span className="font-medium">The bottom line:</span> capturing the value you saw in The Math 
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
          className="bg-[#EA2C00] hover:bg-[#d12700] text-white gap-2"
          data-testid="button-next"
        >
          Your Next Steps
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
