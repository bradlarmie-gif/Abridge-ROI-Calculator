import { ArrowLeft, ArrowRight, Users, Clock, FileCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SwitchState } from "./SwitchFlow";

interface Props {
  currentStep: number;
  switchState: SwitchState;
  onNext: () => void;
  onBack: () => void;
}

export default function SwitchFramework({
  currentStep,
  onNext,
  onBack,
}: Props) {
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
            <div className="w-8 h-8 rounded-lg bg-[#E85D3F] flex items-center justify-center">
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
            How to think about ambient ROI
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            Value from ambient documentation comes from three places.
            Understanding this helps you know what to measure.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-8 mb-8">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-blue-50 flex items-center justify-center mb-3 mx-auto">
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-slate-800">UTILIZATION</p>
              <p className="text-xs text-slate-500 mt-1">% of encounters<br/>using the tool</p>
            </div>

            <div className="text-2xl text-slate-300 font-light">
              <X className="w-5 h-5" />
            </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-amber-50 flex items-center justify-center mb-3 mx-auto">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-slate-800">EFFICIENCY</p>
              <p className="text-xs text-slate-500 mt-1">Minutes saved<br/>per encounter</p>
            </div>

            <div className="text-2xl text-slate-300 font-light">
              <X className="w-5 h-5" />
            </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 mx-auto">
                <FileCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-slate-800">QUALITY</p>
              <p className="text-xs text-slate-500 mt-1">Documentation<br/>quality lift</p>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-lg font-semibold text-slate-800">= TOTAL VALUE</p>
          </div>

          <div className="h-px bg-slate-200 my-6" />

          <div className="bg-slate-50 rounded-lg p-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>Most conversations focus only on time savings.</strong>
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mt-3">
              But <strong>utilization</strong> is often the biggest gap — if half your providers aren't using the tool, 
              you're realizing half the value.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mt-3">
              And <strong>quality improvements</strong> (better coding, faster closure) often drive more ROI than time savings alone.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={onNext}
            className="px-8 py-3 rounded-lg font-medium bg-[#E85D3F] text-white flex items-center gap-2"
            data-testid="button-lets-estimate"
          >
            Let's estimate
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
