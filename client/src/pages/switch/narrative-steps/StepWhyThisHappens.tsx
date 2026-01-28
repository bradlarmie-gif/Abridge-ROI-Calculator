import { useState } from "react";
import { ArrowRight, ArrowLeft, RotateCcw, Brain, Users, TrendingDown, Puzzle, Sparkles } from "lucide-react";
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
    id: "ai-quality",
    icon: Brain,
    challenge: {
      title: "Your AI wasn't built for this",
      description: "Most ambient tools are general-purpose AI with a clinical skin. They weren't trained on real doctor-patient conversations. They guess. That's why you're still editing."
    },
    solution: {
      title: "Built from clinical conversations",
      description: "Our AI was trained on millions of real clinical encounters. It understands medicine because it learned medicine.",
      traits: ["Trained on real clinical audio", "Specialty-aware from day one", "Lives inside your EHR"]
    },
    frontBg: "bg-slate-700",
    frontText: "text-white",
    backBg: "bg-slate-50",
    accentColor: "text-slate-700"
  },
  {
    id: "vendor-gone",
    icon: Users,
    challenge: {
      title: "Your vendor disappeared",
      description: "You signed. They launched. Then they moved on to the next deal. Now you're stuck figuring it out alone, and nobody picks up the phone."
    },
    solution: {
      title: "We stay",
      description: "Named success partners who know your org, your workflows, your goals. Not a ticket number. A relationship.",
      traits: ["Dedicated partners, not call centers", "Executives who stay accountable", "We're in it with you"]
    },
    frontBg: "bg-slate-600",
    frontText: "text-white",
    backBg: "bg-slate-50",
    accentColor: "text-slate-600"
  },
  {
    id: "plateau",
    icon: TrendingDown,
    challenge: {
      title: "You peaked at launch",
      description: "The first few weeks felt great. Then usage flatlined. Value eroded. Now it's just another tool nobody's optimizing."
    },
    solution: {
      title: "We keep climbing",
      description: "Ongoing optimization, not set-and-forget. We monitor, we refine, we push. Launch is the starting line, not the finish.",
      traits: ["Continuous improvement cycles", "Proactive performance monitoring", "Quarterly business reviews"]
    },
    frontBg: "bg-slate-500",
    frontText: "text-white",
    backBg: "bg-slate-50",
    accentColor: "text-slate-600"
  },
  {
    id: "generic",
    icon: Puzzle,
    challenge: {
      title: "Templates failed you",
      description: "Cardiology isn't ortho. Your urgent care isn't like theirs. But your tool treats everyone the same. No wonder half your providers gave up."
    },
    solution: {
      title: "We configure for real",
      description: "Not templates. Real specialty-by-specialty configuration. Your workflows, your preferences, your organization.",
      traits: ["Built for how you actually work", "Specialty-specific adaptation", "Evolves with your feedback"]
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
                Sound familiar?
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
                How we're different
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
          From hundreds of implementations, we've seen the same patterns.
          <br className="hidden md:block" />
          <span className="text-[#374151]">Here's what actually matters.</span>
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
              This is why the gap exists.
            </p>
            <p className="text-slate-400 text-sm">
              And this is what it takes to close it. Not just better software — 
              the right partner who's been here before and knows how to get you there.
            </p>
          </div>
        </div>
      )}

      {!allFlipped && (
        <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 text-center">
          <p className="text-[#374151] text-sm">
            Tap each card to see what we do differently.
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
          See Your Summary
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
