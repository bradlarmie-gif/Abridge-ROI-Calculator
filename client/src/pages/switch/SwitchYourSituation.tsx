import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SwitchState } from "./SwitchFlow";

type ScaleRange = "<25" | "25-50" | "50-100" | "100-200" | "200+";
type UtilizationRange = "not-sure" | "30-40" | "45-55" | "60+";
type EfficiencyRange = "not-sure" | "1-2" | "2-3" | "3+";

interface Props {
  currentStep: number;
  switchState: SwitchState;
  onUpdate: (updates: Partial<SwitchState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const scaleOptions: Array<{ id: ScaleRange; label: string }> = [
  { id: "<25", label: "<25" },
  { id: "25-50", label: "25-50" },
  { id: "50-100", label: "50-100" },
  { id: "100-200", label: "100-200" },
  { id: "200+", label: "200+" },
];

const utilizationOptions: Array<{ id: UtilizationRange; label: string; description: string }> = [
  { id: "not-sure", label: "Not sure", description: "Use industry average" },
  { id: "30-40", label: "30-40%", description: '"Some providers use it, many don\'t"' },
  { id: "45-55", label: "45-55%", description: '"About half the time"' },
  { id: "60+", label: "60%+", description: '"Most encounters, most providers"' },
];

const efficiencyOptions: Array<{ id: EfficiencyRange; label: string; description: string }> = [
  { id: "not-sure", label: "Not sure", description: "Use competitor average" },
  { id: "1-2", label: "1-2 min", description: '"Helps, but providers still edit a lot"' },
  { id: "2-3", label: "2-3 min", description: '"Good time savings, reasonable quality"' },
  { id: "3+", label: "3+ min", description: '"Strong savings, minimal editing needed"' },
];

export default function SwitchYourSituation({
  currentStep,
  switchState,
  onUpdate,
  onNext,
  onBack,
}: Props) {
  const { situation } = switchState;

  const updateSituation = (key: keyof typeof situation, value: string) => {
    onUpdate({
      situation: {
        ...situation,
        [key]: value,
      },
    });
  };

  const canContinue = situation.scale && situation.utilization && situation.efficiency;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EA2C00] flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-slate-900 tracking-wide">SWITCH</span>
          </div>
          <div className="w-16" />
        </div>
        <div className="max-w-3xl mx-auto mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-colors ${
                step === currentStep
                  ? "bg-[#EA2C00]"
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
          <h1 className="text-2xl font-bold text-slate-900 mb-2 font-abridge uppercase tracking-tight">Your situation</h1>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">
              SCALE
            </h3>
            <p className="text-sm text-slate-700 mb-4">
              Approximately how many providers use your current solution?
            </p>
            <div className="flex flex-wrap gap-2">
              {scaleOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => updateSituation("scale", option.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    situation.scale === option.id
                      ? "bg-[#EA2C00] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  data-testid={`button-scale-${option.id}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">
              UTILIZATION
            </h3>
            <p className="text-sm text-slate-700 mb-4">
              Of all encounters that could use the tool, roughly what percentage actually do?
            </p>
            <div className="space-y-2">
              {utilizationOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => updateSituation("utilization", option.id)}
                  className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                    situation.utilization === option.id
                      ? "border-[#EA2C00] bg-white"
                      : "border-slate-200 bg-white"
                  }`}
                  data-testid={`button-utilization-${option.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        situation.utilization === option.id
                          ? "border-[#EA2C00]"
                          : "border-slate-300"
                      }`}
                    >
                      {situation.utilization === option.id && (
                        <div className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">{option.label}</span>
                      <span className="text-slate-500 ml-2">— {option.description}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#EA2C00]" />
              <span className="text-sm text-slate-600">
                Reference: Abridge customers average <strong>65%</strong> utilization.
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">
              EFFICIENCY
            </h3>
            <p className="text-sm text-slate-700 mb-4">
              How much documentation time does your current solution save per encounter?
            </p>
            <div className="space-y-2">
              {efficiencyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => updateSituation("efficiency", option.id)}
                  className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                    situation.efficiency === option.id
                      ? "border-[#EA2C00] bg-white"
                      : "border-slate-200 bg-white"
                  }`}
                  data-testid={`button-efficiency-${option.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        situation.efficiency === option.id
                          ? "border-[#EA2C00]"
                          : "border-slate-300"
                      }`}
                    >
                      {situation.efficiency === option.id && (
                        <div className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">{option.label}</span>
                      <span className="text-slate-500 ml-2">— {option.description}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#EA2C00]" />
              <span className="text-sm text-slate-600">
                Reference: Abridge customers average <strong>2–4 min</strong>/encounter.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            onClick={onNext}
            disabled={!canContinue}
            className={`px-8 py-3 rounded-lg font-medium flex items-center gap-2 ${
              canContinue
                ? "bg-[#EA2C00] text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
            data-testid="button-see-comparison"
          >
            See comparison
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
