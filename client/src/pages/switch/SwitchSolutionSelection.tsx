import { ArrowLeft, ArrowRight, Mic, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SwitchState } from "./SwitchFlow";

type SolutionType = "ambient-ai" | "human-scribes";
type CareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

interface Props {
  currentStep: number;
  switchState: SwitchState;
  onUpdate: (updates: Partial<SwitchState>) => void;
  onNext: () => void;
  onBack: () => void;
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
    available: false,
    comingSoon: true,
  },
];

const settings: Array<{
  id: CareSetting;
  name: string;
  available: boolean;
  comingSoon?: string;
}> = [
  { id: "outpatient", name: "Outpatient", available: true },
  { id: "ed", name: "ED", available: false, comingSoon: "Q2 2025" },
  { id: "inpatient", name: "Inpatient", available: false, comingSoon: "Q2 2025" },
  { id: "nursing", name: "Nursing", available: false, comingSoon: "Q3 2025" },
];

export default function SwitchSolutionSelection({
  currentStep,
  switchState,
  onUpdate,
  onNext,
  onBack,
}: Props) {
  const { solution, careSetting } = switchState;
  const canContinue = solution && careSetting;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E85D3F] flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-semibold text-slate-900 tracking-wide">SWITCH</span>
            </div>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
        <div className="max-w-3xl mx-auto mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-colors ${
                step === currentStep
                  ? "bg-[#E85D3F]"
                  : step < currentStep
                  ? "bg-slate-400"
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
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
                  ? "border-[#E85D3F] bg-white shadow-sm"
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
                      ? "bg-[#E85D3F]/10 text-[#E85D3F]"
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
                  <div className="w-6 h-6 rounded-full bg-[#E85D3F] flex items-center justify-center">
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

        {solution && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <p className="text-sm font-medium text-slate-600 mb-3">Select a care setting:</p>
            <div className="flex flex-wrap gap-2">
              {settings.map((setting) => (
                <button
                  key={setting.id}
                  onClick={() => setting.available && onUpdate({ careSetting: setting.id })}
                  disabled={!setting.available}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                    careSetting === setting.id
                      ? "bg-[#E85D3F] text-white"
                      : setting.available
                      ? "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
                      : "bg-slate-100 border border-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                  data-testid={`button-setting-${setting.id}`}
                >
                  {setting.name}
                  {setting.comingSoon && (
                    <span className="ml-2 text-xs opacity-70">{setting.comingSoon}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <Button
            onClick={onNext}
            disabled={!canContinue}
            className={`px-8 py-3 rounded-lg font-medium flex items-center gap-2 ${
              canContinue
                ? "bg-[#E85D3F] text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
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
