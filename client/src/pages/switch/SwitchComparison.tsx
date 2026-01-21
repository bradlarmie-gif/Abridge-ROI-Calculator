import { ArrowLeft, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SwitchState } from "./SwitchFlow";

interface Props {
  currentStep: number;
  switchState: SwitchState;
  onNext: () => void;
  onBack: () => void;
}

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US");
};

export default function SwitchComparison({
  currentStep,
  switchState,
  onNext,
  onBack,
}: Props) {
  const { situation } = switchState;

  const getProviderCount = (): number => {
    switch (situation.scale) {
      case "<25": return 20;
      case "25-50": return 37;
      case "50-100": return 75;
      case "100-200": return 150;
      case "200+": return 250;
      default: return 75;
    }
  };

  const getUtilization = (): number => {
    switch (situation.utilization) {
      case "not-sure": return 45;
      case "30-40": return 35;
      case "45-55": return 50;
      case "60+": return 65;
      default: return 45;
    }
  };

  const getTimeSavings = (): number => {
    switch (situation.efficiency) {
      case "not-sure": return 1.5;
      case "1-2": return 1.5;
      case "2-3": return 2.5;
      case "3+": return 3.5;
      default: return 1.5;
    }
  };

  const providers = getProviderCount();
  const currentUtilization = getUtilization();
  const currentTimeSavings = getTimeSavings();

  const abridgeUtilization = 65;
  const abridgeTimeSavings = 3;

  const encountersPerProvider = 2000;
  const totalEncounters = providers * encountersPerProvider;

  const currentDocumented = Math.round(totalEncounters * (currentUtilization / 100));
  const abridgeDocumented = Math.round(totalEncounters * (abridgeUtilization / 100));

  const currentHoursReturned = Math.round((currentTimeSavings * currentDocumented) / 60);
  const abridgeHoursReturned = Math.round((abridgeTimeSavings * abridgeDocumented) / 60);

  const utilizationGapPP = abridgeUtilization - currentUtilization;
  const encountersDifference = Math.max(0, abridgeDocumented - currentDocumented);
  const encountersPercentMore = currentDocumented > 0 
    ? Math.round((encountersDifference / currentDocumented) * 100)
    : 0;

  const efficiencyGapMin = Math.max(0, abridgeTimeSavings - currentTimeSavings);
  const hoursDifference = Math.max(0, abridgeHoursReturned - currentHoursReturned);

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
          <h1 className="text-2xl font-bold text-slate-900 mb-2">The comparison</h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            Based on what you've shared, here's how your current state compares
            to what organizations typically achieve with Abridge.
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">
              UTILIZATION
            </h3>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">YOUR ESTIMATE</p>
                <p className="text-3xl font-bold text-slate-400">~{currentUtilization}%</p>
              </div>
              <div className="flex-1 mx-6 flex items-center">
                <div className="flex-1 h-0.5 bg-slate-200" />
                <div className="px-3 py-1 bg-emerald-100 rounded-full mx-2">
                  <span className="text-sm font-semibold text-emerald-700">+{utilizationGapPP}pp</span>
                </div>
                <div className="flex-1 h-0.5 bg-slate-200" />
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">ABRIDGE BENCHMARK</p>
                <p className="text-3xl font-bold text-slate-900">{abridgeUtilization}%</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              A {utilizationGapPP} percentage point difference in utilization means
              approximately <strong>{encountersPercentMore}% more encounters</strong> being documented.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">
              EFFICIENCY
            </h3>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">YOUR ESTIMATE</p>
                <p className="text-3xl font-bold text-slate-400">~{currentTimeSavings} min</p>
              </div>
              <div className="flex-1 mx-6 flex items-center">
                <div className="flex-1 h-0.5 bg-slate-200" />
                <div className="px-3 py-1 bg-emerald-100 rounded-full mx-2">
                  <span className="text-sm font-semibold text-emerald-700">+{efficiencyGapMin.toFixed(1)} min</span>
                </div>
                <div className="flex-1 h-0.5 bg-slate-200" />
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">ABRIDGE BENCHMARK</p>
                <p className="text-3xl font-bold text-slate-900">{abridgeTimeSavings} min</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              An additional {efficiencyGapMin.toFixed(1)} minutes per encounter, at scale,
              translates to significant hours returned.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">
              COMBINED EFFECT
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              These gaps compound. Higher utilization × more time savings = multiplicative difference in total value realized.
            </p>
            <div className="bg-slate-50 rounded-lg p-5">
              <p className="text-sm text-slate-600 mb-3">
                For a <strong>{providers}-provider</strong> organization with <strong>{formatNumber(totalEncounters)}</strong> encounters:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Current state:</p>
                  <p className="text-lg font-semibold text-slate-700">~{formatNumber(currentDocumented)} encounters</p>
                  <p className="text-sm text-slate-500">documented</p>
                  <p className="text-lg font-semibold text-slate-700 mt-2">~{formatNumber(currentHoursReturned)} hours</p>
                  <p className="text-sm text-slate-500">returned</p>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <p className="text-xs text-slate-500 mb-1">Abridge benchmark:</p>
                  <p className="text-lg font-semibold text-emerald-600">~{formatNumber(abridgeDocumented)} encounters</p>
                  <p className="text-sm text-slate-500">documented</p>
                  <p className="text-lg font-semibold text-emerald-600 mt-2">~{formatNumber(abridgeHoursReturned)} hours</p>
                  <p className="text-sm text-slate-500">returned</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={onNext}
            className="px-8 py-3 rounded-lg font-medium bg-[#E85D3F] text-white flex items-center gap-2"
            data-testid="button-what-this-means"
          >
            What this means
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
