import { ArrowRight, ArrowLeft, Mic, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { SolutionType } from "@/lib/switchGapCalculator";

interface SwitchCurrentSetupProps {
  solution: SolutionType;
  setSolution: (s: SolutionType) => void;
  providers: number | null;
  setProviders: (n: number | null) => void;
  annualEncounters: number | null;
  setAnnualEncounters: (n: number | null) => void;
  currentCostPerProvider: number | null;
  setCurrentCostPerProvider: (n: number | null) => void;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function SwitchCurrentSetup({
  solution,
  setSolution,
  providers,
  setProviders,
  annualEncounters,
  setAnnualEncounters,
  currentCostPerProvider,
  setCurrentCostPerProvider,
  onNext,
  onBack,
  onBackToJourney,
}: SwitchCurrentSetupProps) {
  const encountersPerProvider = providers && annualEncounters && providers > 0 
    ? Math.round(annualEncounters / providers) 
    : null;

  const canProceed = solution && providers && providers > 0 && annualEncounters && annualEncounters > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <GlobalHeader 
        pageName="Your Current Setup" 
        currentStep={1} 
        totalSteps={3} 
        onLogoClick={onBackToJourney} 
      />

      <main className="max-w-3xl mx-auto px-6 pt-[96px] pb-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-500 flex items-center gap-1 mb-8 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Let's understand your current situation
          </h1>
          <p className="text-[#6B7280]">
            We'll show you how your results compare to what's possible with ambient AI
          </p>
        </div>

        <div className="space-y-10">
          <section>
            <h3 className="text-lg font-semibold text-[#111827] mb-4">
              What are you using today?
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSolution("ambient-ai")}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  solution === "ambient-ai"
                    ? "border-[#EA2C00] bg-[#EA2C00]/5"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                data-testid="button-solution-ambient"
              >
                <Mic className={`w-8 h-8 mb-3 ${solution === "ambient-ai" ? "text-[#EA2C00]" : "text-slate-400"}`} />
                <div className="font-semibold text-[#111827]">Ambient AI</div>
                <div className="text-sm text-[#6B7280] mt-1">
                  DAX, Ambience, Suki, or similar
                </div>
              </button>

              <button
                onClick={() => setSolution("human-scribes")}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  solution === "human-scribes"
                    ? "border-[#EA2C00] bg-[#EA2C00]/5"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                data-testid="button-solution-scribes"
              >
                <Users className={`w-8 h-8 mb-3 ${solution === "human-scribes" ? "text-[#EA2C00]" : "text-slate-400"}`} />
                <div className="font-semibold text-[#111827]">Human Scribes</div>
                <div className="text-sm text-[#6B7280] mt-1">
                  In-person or virtual scribes
                </div>
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-[#111827] mb-4">
              Your deployment scale
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Providers using this solution
                </label>
                <FormattedNumberInput
                  value={providers}
                  onChange={setProviders}
                  placeholder="75"
                  className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
                  data-testid="input-providers"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Annual encounters for these providers
                </label>
                <FormattedNumberInput
                  value={annualEncounters}
                  onChange={setAnnualEncounters}
                  placeholder="150,000"
                  className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
                  data-testid="input-encounters"
                />
                {encountersPerProvider && (
                  <p className="text-xs text-[#6B7280] mt-2">
                    ~{encountersPerProvider.toLocaleString()}/provider is typical for primary care
                  </p>
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-[#111827] mb-4">
              Your current investment
            </h3>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-[#374151] mb-2">
                What do you pay per provider per month?
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]">$</span>
                <FormattedNumberInput
                  value={currentCostPerProvider}
                  onChange={setCurrentCostPerProvider}
                  placeholder="200"
                  className="w-full h-11 pl-8 pr-4 border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
                  data-testid="input-current-cost"
                />
              </div>
              <p className="text-xs text-[#6B7280] mt-2">
                Or your best estimate if bundled
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 flex justify-end">
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="bg-[#EA2C00] hover:bg-[#d12700] text-white px-8 h-11"
            data-testid="button-continue"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}
