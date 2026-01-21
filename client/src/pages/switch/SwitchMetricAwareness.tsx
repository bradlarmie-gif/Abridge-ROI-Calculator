import { ArrowLeft, ArrowRight, Activity, Clock, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SwitchState } from "./SwitchFlow";

type MetricKnowledge = "know" | "rough" | "dont-track";

interface Props {
  currentStep: number;
  switchState: SwitchState;
  onUpdate: (updates: Partial<SwitchState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const metrics: Array<{
  id: "utilization" | "efficiency" | "quality";
  name: string;
  question: string;
  icon: React.ReactNode;
}> = [
  {
    id: "utilization",
    name: "Utilization",
    question: "What % of encounters actually use the tool?",
    icon: <Activity className="w-5 h-5" />,
  },
  {
    id: "efficiency",
    name: "Efficiency",
    question: "How much time does it save per encounter?",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    id: "quality",
    name: "Documentation Quality",
    question: "Has coding accuracy or chart closure improved?",
    icon: <FileCheck className="w-5 h-5" />,
  },
];

const options: Array<{ id: MetricKnowledge; label: string }> = [
  { id: "know", label: "I know this number" },
  { id: "rough", label: "I have a rough sense" },
  { id: "dont-track", label: "I don't track this" },
];

export default function SwitchMetricAwareness({
  currentStep,
  switchState,
  onUpdate,
  onNext,
  onBack,
}: Props) {
  const { metricAwareness } = switchState;

  const updateMetric = (metric: "utilization" | "efficiency" | "quality", value: MetricKnowledge) => {
    onUpdate({
      metricAwareness: {
        ...metricAwareness,
        [metric]: value,
      },
    });
  };

  const allAnswered =
    metricAwareness.utilization && metricAwareness.efficiency && metricAwareness.quality;

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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Most organizations don't measure ambient ROI.
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            Ambient AI is still new. Most teams bought it, deployed it, and moved on.
            The metrics that actually matter often go untracked.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-6">
            THE METRICS THAT MATTER
          </h3>

          <div className="space-y-6">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className="p-5 rounded-lg border border-slate-200 bg-slate-50/50"
                data-testid={`metric-card-${metric.id}`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    {metric.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{metric.name}</h4>
                    <p className="text-sm text-slate-500">{metric.question}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {options.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        metricAwareness[metric.id] === option.id
                          ? "bg-white border-2 border-[#EA2C00]"
                          : "bg-white border border-slate-200"
                      }`}
                      data-testid={`option-${metric.id}-${option.id}`}
                    >
                      <input
                        type="radio"
                        name={metric.id}
                        checked={metricAwareness[metric.id] === option.id}
                        onChange={() => updateMetric(metric.id, option.id)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          metricAwareness[metric.id] === option.id
                            ? "border-[#EA2C00]"
                            : "border-slate-300"
                        }`}
                      >
                        {metricAwareness[metric.id] === option.id && (
                          <div className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-500 text-center mb-8">
          Based on your answers, we'll either use your data or industry benchmarks to estimate where you might be.
        </p>

        <div className="flex justify-center">
          <Button
            onClick={onNext}
            disabled={!allAnswered}
            className={`px-8 py-3 rounded-lg font-medium flex items-center gap-2 ${
              allAnswered
                ? "bg-[#EA2C00] text-white"
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
