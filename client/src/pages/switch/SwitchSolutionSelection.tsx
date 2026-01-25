import { ArrowRight, Mic, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import type { SwitchState } from "./SwitchFlow";

type SolutionType = "ambient-ai" | "human-scribes";

interface Props {
  currentStep: number;
  switchState: SwitchState;
  onUpdate: (updates: Partial<SwitchState>) => void;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

const solutions: Array<{
  id: SolutionType;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  comingSoon?: boolean;
}> = [
  {
    id: "ambient-ai",
    name: "Ambient AI",
    description: "Currently using DAX, Ambience, Suki, or similar",
    icon: <Mic className="w-6 h-6" />,
    available: true,
  },
  {
    id: "human-scribes",
    name: "Human Scribes",
    description: "In-person or virtual scribes",
    icon: <Users className="w-6 h-6" />,
    available: true,
  },
];

export default function SwitchSolutionSelection({
  currentStep,
  switchState,
  onUpdate,
  onNext,
  onBack,
  onBackToJourney,
}: Props) {
  const { solution } = switchState;
  const canContinue = !!solution;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader 
        pathType="switch"
        currentStep={1}
        totalSteps={2}
        stepName="Select Solution"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-2xl mx-auto px-6 py-6 md:py-8 pb-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            What solution are you using today?
          </h1>
          <p className="text-slate-500">
            We'll show you what you might be leaving on the table.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {solutions.map((sol) => (
            <button
              key={sol.id}
              onClick={() => sol.available && onUpdate({ solution: sol.id })}
              disabled={!sol.available}
              className={`w-full p-5 rounded-xl border-2 transition-all text-left relative ${
                solution === sol.id
                  ? "border-slate-800 bg-white shadow-sm"
                  : sol.available
                  ? "border-slate-200 bg-white hover:border-slate-300"
                  : "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
              }`}
              data-testid={`button-solution-${sol.id}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    solution === sol.id
                      ? "bg-slate-800/10 text-slate-800"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {sol.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{sol.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{sol.description}</p>
                </div>
                {solution === sol.id && (
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                {sol.comingSoon && (
                  <span className="absolute top-4 right-4 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            size="lg"
            onClick={onNext}
            disabled={!canContinue}
            className={canContinue ? "bg-[#EA2C00] text-white" : ""}
            data-testid="button-continue"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
