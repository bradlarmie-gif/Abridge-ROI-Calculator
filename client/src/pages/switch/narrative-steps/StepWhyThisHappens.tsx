import { ArrowRight, ArrowLeft, Users, Settings, Zap, TrendingUp, Clock, RefreshCw, Shield, ArrowRightLeft } from "lucide-react";
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

interface ObjectionCardData {
  id: string;
  icon: React.ElementType;
  title: string;
  content: React.ReactNode;
}

export default function StepWhyThisHappens({
  inputs,
  calculations,
  onNext,
  onBack,
}: StepWhyThisHappensProps) {
  const roiGap = formatCurrency(calculations.annualGap);

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

  const performancePatterns = [
    {
      id: "adoption",
      icon: Users,
      title: "Adoption Is a Human Challenge",
      body: "Change management isn't a phase \u2014 it's ongoing. Dedicated onboarding, feedback loops, and continuous improvement resources matter.",
    },
    {
      id: "optimization",
      icon: Settings,
      title: "Continuous Optimization",
      body: "Set-it-and-forget-it doesn't work. Mature implementations review performance regularly and adjust.",
    },
    {
      id: "customization",
      icon: Zap,
      title: "Deep Customization",
      body: "Generic configurations miss specialty nuances. Specialty-specific workflows drive meaningfully higher adoption and satisfaction.",
    },
    {
      id: "leadership",
      icon: TrendingUp,
      title: "Executive Visibility",
      body: "When leadership tracks ambient AI as strategic \u2014 not just an IT project \u2014 resources follow.",
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
        </p>
      </div>

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

      <div className="h-px bg-[#E5E7EB]" />

      <section className="space-y-6" data-testid="performance-patterns-section">
        <div>
          <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-3">What Drives Performance</p>
          <p className="text-sm text-[#666666]">
            Across hundreds of implementations, four patterns consistently separate high performers from the rest.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {performancePatterns.map((pattern) => {
            const Icon = pattern.icon;
            return (
              <div 
                key={pattern.id} 
                className="bg-white rounded-xl border border-[#E5E7EB] p-5"
                data-testid={`pattern-card-${pattern.id}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#EA2C00]" />
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] text-sm">{pattern.title}</h3>
                </div>
                <p className="text-sm text-[#666666]">{pattern.body}</p>
              </div>
            );
          })}
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
