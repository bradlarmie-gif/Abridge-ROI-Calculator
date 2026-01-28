import { useState } from "react";
import { ArrowRight, ArrowLeft, RotateCcw, Brain, Users, RefreshCw, Layers, Sparkles } from "lucide-react";
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
    id: "technology",
    icon: Brain,
    challenge: {
      title: "The Technology Ceiling",
      description: "Not all AI is created equal. Some tools hit accuracy limits, require excessive editing, or can't keep pace with clinical complexity."
    },
    solution: {
      title: "Clinical-Grade AI",
      description: "Technology built for healthcare from the ground up — not retrofitted from consumer applications.",
      traits: ["Clinician-level accuracy", "Specialty-aware understanding", "Seamless EHR integration"]
    },
    frontBg: "bg-slate-700",
    frontText: "text-white",
    backBg: "bg-slate-50",
    accentColor: "text-slate-700"
  },
  {
    id: "partnership",
    icon: Users,
    challenge: {
      title: "The Implementation Gap",
      description: "Software vendors ship and disappear. Without dedicated partnership, organizations are left to figure it out alone."
    },
    solution: {
      title: "Dedicated Partnership",
      description: "Teams who stay with you — understanding your workflows, your challenges, your goals.",
      traits: ["Named success partners", "Healthcare-fluent support", "Executive alignment"]
    },
    frontBg: "bg-slate-600",
    frontText: "text-white",
    backBg: "bg-slate-50",
    accentColor: "text-slate-600"
  },
  {
    id: "optimization",
    icon: RefreshCw,
    challenge: {
      title: "The Plateau Effect",
      description: "Most implementations peak at launch and flatline. Without ongoing refinement, early gains slowly erode."
    },
    solution: {
      title: "Continuous Improvement",
      description: "Regular optimization cycles that treat implementation as a journey, not a one-time event.",
      traits: ["Quarterly performance reviews", "Proactive monitoring", "Feedback-driven updates"]
    },
    frontBg: "bg-slate-500",
    frontText: "text-white",
    backBg: "bg-slate-50",
    accentColor: "text-slate-600"
  },
  {
    id: "specialty",
    icon: Layers,
    challenge: {
      title: "The Generic Approach",
      description: "One-size-fits-all rarely fits anyone well. Different specialties have different needs, different workflows, different language."
    },
    solution: {
      title: "Specialty-Native Design",
      description: "Configuration that respects the complexity of each specialty — not templates, but true adaptation.",
      traits: ["Specialty-specific templates", "Workflow customization", "Organizational culture fit"]
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
                The challenge
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
                What makes the difference
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
          The gap between potential and reality isn't random.
          <br className="hidden md:block" />
          <span className="text-[#374151]">These four things explain most of it.</span>
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
        <p className="text-[#374151] text-sm md:text-base">
          <span className="font-medium">From hundreds of implementations,</span> we've learned what separates
          <br className="hidden md:block" />
          organizations that capture full value from those that plateau.
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
              This is the pattern.
            </p>
            <p className="text-slate-400 text-sm">
              The organizations that capture full value don't just have better technology — 
              they have partners who understand these challenges and know how to solve them.
            </p>
          </div>
        </div>
      )}

      {!allFlipped && (
        <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 text-center">
          <p className="text-[#374151] text-sm">
            <span className="font-medium">The takeaway:</span> closing the gap you saw in The Math 
            isn't about working harder. It's about these four things.
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
