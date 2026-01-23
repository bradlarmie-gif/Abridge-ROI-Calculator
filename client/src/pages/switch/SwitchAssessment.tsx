import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Mic, Users, FileText, BarChart3, Clock, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { 
  calculateSwitchGap, 
  formatCurrency,
  ABRIDGE_BENCHMARKS, 
  VALUE_ASSUMPTIONS,
  type SwitchInputs, 
  type SolutionType 
} from "@/lib/switchGapCalculator";

interface SwitchAssessmentProps {
  inputs: SwitchInputs;
  setInputs: (inputs: SwitchInputs) => void;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function SwitchAssessment({
  inputs,
  setInputs,
  onNext,
  onBack,
  onBackToJourney,
}: SwitchAssessmentProps) {
  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    setInputs({ ...inputs, [key]: value });
  };

  const calculations = useMemo(() => {
    return calculateSwitchGap({
      ...inputs,
      providers: inputs.providers || 75,
      annualEncounters: inputs.annualEncounters || 150000,
      currentCostPerProvider: inputs.currentCostPerProvider || 200,
    });
  }, [inputs]);

  const canProceed = 
    inputs.solution && 
    inputs.providers && inputs.providers > 0 && 
    inputs.annualEncounters && inputs.annualEncounters > 0 &&
    inputs.utilization > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <GlobalHeader 
        pageName="Value Assessment" 
        currentStep={1} 
        totalSteps={2} 
        onLogoClick={onBackToJourney} 
      />

      <main className="max-w-4xl mx-auto px-6 pt-[96px] pb-16">
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

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
            Ambient AI Value Assessment
          </h1>
          <p className="text-lg text-[#6B7280]">
            See how your current results compare to Abridge benchmarks.
          </p>
        </div>

        <div className="space-y-10">
          <section className="bg-white rounded-xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-[#111827] mb-6">Your Current Situation</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-3">
                  What solution are you using today?
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => updateInput("solution", "ambient-ai")}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      inputs.solution === "ambient-ai"
                        ? "border-[#EA2C00] bg-[#EA2C00]/5"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    data-testid="button-solution-ambient"
                  >
                    <Mic className={`w-6 h-6 mb-2 ${inputs.solution === "ambient-ai" ? "text-[#EA2C00]" : "text-slate-400"}`} />
                    <div className="font-semibold text-[#111827] text-sm">Ambient AI</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">DAX, Ambience, Suki, etc.</div>
                  </button>

                  <button
                    onClick={() => updateInput("solution", "human-scribes")}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      inputs.solution === "human-scribes"
                        ? "border-[#EA2C00] bg-[#EA2C00]/5"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    data-testid="button-solution-scribes"
                  >
                    <Users className={`w-6 h-6 mb-2 ${inputs.solution === "human-scribes" ? "text-[#EA2C00]" : "text-slate-400"}`} />
                    <div className="font-semibold text-[#111827] text-sm">Scribes</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">In-person or virtual</div>
                  </button>

                  <button
                    className="p-4 rounded-lg border-2 border-slate-200 bg-white transition-all text-left opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <FileText className="w-6 h-6 mb-2 text-slate-400" />
                    <div className="font-semibold text-[#111827] text-sm">Self-documentation</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">No assistance</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    How many providers use this solution?
                  </label>
                  <FormattedNumberInput
                    value={inputs.providers}
                    onChange={(v) => updateInput("providers", v || 0)}
                    placeholder="75"
                    className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
                    data-testid="input-providers"
                  />
                  <span className="text-xs text-[#6B7280] mt-1">providers</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Total annual encounters for these providers?
                  </label>
                  <FormattedNumberInput
                    value={inputs.annualEncounters}
                    onChange={(v) => updateInput("annualEncounters", v || 0)}
                    placeholder="150,000"
                    className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
                    data-testid="input-encounters"
                  />
                  <span className="text-xs text-[#6B7280] mt-1">~2,000/provider is typical for primary care</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-[#111827] mb-2">Your Results</h2>
            <p className="text-[#6B7280] mb-8">
              How do your current metrics compare to Abridge averages?
            </p>

            <div className="space-y-8">
              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#111827]">Utilization</h3>
                    <p className="text-sm text-[#6B7280]">What % of encounters are documented with your solution?</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="relative h-10 bg-slate-200 rounded-lg overflow-hidden mb-2">
                    <div 
                      className="absolute top-0 left-0 h-full bg-[#EA2C00]/20 border-r-2 border-[#EA2C00]"
                      style={{ width: "100%" }}
                    >
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#EA2C00]">
                        ABRIDGE AVG: {ABRIDGE_BENCHMARKS.utilization}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-10 bg-slate-200 rounded-lg overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-slate-500 transition-all"
                      style={{ width: `${Math.min(100, (inputs.utilization / ABRIDGE_BENCHMARKS.utilization) * 100)}%` }}
                    >
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white">
                        YOU: {inputs.utilization}%
                      </span>
                    </div>
                    {inputs.utilization < ABRIDGE_BENCHMARKS.utilization && (
                      <div 
                        className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
                        style={{ 
                          left: `${(inputs.utilization / ABRIDGE_BENCHMARKS.utilization) * 100}%`,
                          width: `${100 - (inputs.utilization / ABRIDGE_BENCHMARKS.utilization) * 100}%`
                        }}
                      >
                        <span className="text-xs font-semibold text-slate-600">GAP</span>
                      </div>
                    )}
                  </div>
                </div>

                <input
                  type="range"
                  min="10"
                  max="90"
                  value={inputs.utilization}
                  onChange={(e) => updateInput("utilization", parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                  data-testid="slider-utilization"
                />
                <div className="flex justify-between text-xs text-[#6B7280] mt-1">
                  <span>10%</span>
                  <span>90%</span>
                </div>

                {inputs.utilization < ABRIDGE_BENCHMARKS.utilization ? (
                  <div className="flex items-start gap-3 mt-4 p-3 bg-slate-100 rounded-lg border border-slate-200">
                    <AlertTriangle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-700 text-sm">
                        You're at {calculations.utilizationCapture}% vs. Abridge average
                      </div>
                      <div className="text-xs text-slate-500">
                        {ABRIDGE_BENCHMARKS.utilization - inputs.utilization}pp gap = {calculations.encounterGap.toLocaleString()} encounters/year
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700 text-sm">You're at or above Abridge average</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#111827]">Efficiency</h3>
                    <p className="text-sm text-[#6B7280]">How much time does your solution save per encounter?</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="relative h-10 bg-slate-200 rounded-lg overflow-hidden mb-2">
                    <div 
                      className="absolute top-0 left-0 h-full bg-[#EA2C00]/20 border-r-2 border-[#EA2C00]"
                      style={{ width: "100%" }}
                    >
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#EA2C00]">
                        ABRIDGE AVG: {ABRIDGE_BENCHMARKS.timeSavedAvg} min
                      </span>
                    </div>
                  </div>
                  <div className="relative h-10 bg-slate-200 rounded-lg overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-slate-500 transition-all"
                      style={{ width: `${Math.min(100, (inputs.timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100)}%` }}
                    >
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white">
                        YOU: {inputs.timeSavedPerEncounter} min
                      </span>
                    </div>
                    {inputs.timeSavedPerEncounter < ABRIDGE_BENCHMARKS.timeSavedAvg && (
                      <div 
                        className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
                        style={{ 
                          left: `${(inputs.timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100}%`,
                          width: `${100 - (inputs.timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100}%`
                        }}
                      >
                        <span className="text-xs font-semibold text-slate-600">GAP</span>
                      </div>
                    )}
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={inputs.timeSavedPerEncounter}
                  onChange={(e) => updateInput("timeSavedPerEncounter", parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                  data-testid="slider-efficiency"
                />
                <div className="flex justify-between text-xs text-[#6B7280] mt-1">
                  <span>0 min</span>
                  <span>5 min</span>
                </div>

                {inputs.timeSavedPerEncounter < ABRIDGE_BENCHMARKS.timeSavedAvg ? (
                  <div className="flex items-start gap-3 mt-4 p-3 bg-slate-100 rounded-lg border border-slate-200">
                    <AlertTriangle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-700 text-sm">
                        You're at {calculations.efficiencyCapture}% vs. Abridge average
                      </div>
                      <div className="text-xs text-slate-500">
                        {(ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter).toFixed(1)} min gap
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700 text-sm">You're at or above Abridge average</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#111827]">Revenue Capture</h3>
                    <p className="text-sm text-[#6B7280]">What wRVU lift are you seeing vs. before your solution?</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="relative h-10 bg-slate-200 rounded-lg overflow-hidden mb-2">
                    <div 
                      className="absolute top-0 left-0 h-full bg-[#EA2C00]/20 border-r-2 border-[#EA2C00]"
                      style={{ width: "100%" }}
                    >
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#EA2C00]">
                        ABRIDGE AVG: +{ABRIDGE_BENCHMARKS.wrvuLift}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-10 bg-slate-200 rounded-lg overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-slate-500 transition-all"
                      style={{ width: `${Math.min(100, (inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100)}%` }}
                    >
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white">
                        YOU: +{inputs.wrvuLift}%
                      </span>
                    </div>
                    {inputs.wrvuLift < ABRIDGE_BENCHMARKS.wrvuLift && (
                      <div 
                        className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
                        style={{ 
                          left: `${(inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100}%`,
                          width: `${100 - (inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100}%`
                        }}
                      >
                        <span className="text-xs font-semibold text-slate-600">GAP</span>
                      </div>
                    )}
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="8"
                  step="0.5"
                  value={inputs.wrvuLift}
                  onChange={(e) => updateInput("wrvuLift", parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                  data-testid="slider-wrvu"
                />
                <div className="flex justify-between text-xs text-[#6B7280] mt-1">
                  <span>0%</span>
                  <span>8%</span>
                </div>

                {inputs.wrvuLift < ABRIDGE_BENCHMARKS.wrvuLift ? (
                  <div className="flex items-start gap-3 mt-4 p-3 bg-slate-100 rounded-lg border border-slate-200">
                    <AlertTriangle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-700 text-sm">
                        {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% below Abridge average
                      </div>
                      <div className="text-xs text-slate-500">
                        = {formatCurrency(calculations.wrvuGapValue)}/year in revenue gap
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700 text-sm">You're at or above Abridge average</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 text-white">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span> Why Small Gaps Compound
            </h3>
            <p className="text-slate-300 mb-6">
              Ambient AI value is <strong className="text-white">multiplicative</strong>. 
              Small differences in each dimension compound:
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{calculations.utilizationCapture}%</div>
                <div className="text-xs text-slate-400">utilization</div>
              </div>
              <div className="text-xl text-slate-400">×</div>
              <div className="text-center">
                <div className="text-2xl font-bold">{calculations.efficiencyCapture}%</div>
                <div className="text-xs text-slate-400">efficiency</div>
              </div>
              <div className="text-xl text-slate-400">×</div>
              <div className="text-center">
                <div className="text-2xl font-bold">{calculations.wrvuCapture}%</div>
                <div className="text-xs text-slate-400">revenue</div>
              </div>
              <div className="text-xl text-slate-400">=</div>
              <div className="text-center bg-[#EA2C00] rounded-lg px-4 py-2">
                <div className="text-2xl font-bold">{calculations.combinedCapture}%</div>
                <div className="text-xs text-white/80">captured</div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border-2 border-slate-200 p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#111827]">Your Annual Gap</h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700">LIVE</span>
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-[#111827]" data-testid="text-annual-gap">
                {formatCurrency(calculations.annualGap)}
                <span className="text-xl text-[#6B7280] font-normal">/year</span>
              </div>
              <div className="flex items-center justify-center gap-3 mt-3 text-sm text-[#6B7280]">
                <span>{formatCurrency(calculations.monthlyGap)}/month</span>
                <span className="text-slate-300">·</span>
                <span>{formatCurrency(Math.round(calculations.annualGap / 365))}/day</span>
                <span className="text-slate-300">·</span>
                <span>{formatCurrency(Math.round(calculations.annualGap / 8760))}/hour</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {calculations.utilizationGapValue > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-[#111827] text-sm">Utilization Gap</div>
                      <div className="text-xs text-[#6B7280]">+{calculations.encounterGap.toLocaleString()} encounters</div>
                    </div>
                  </div>
                  <div className="font-semibold text-[#111827]">{formatCurrency(calculations.utilizationGapValue)}</div>
                </div>
              )}
              {calculations.efficiencyGapValue > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-[#111827] text-sm">Efficiency Gap</div>
                      <div className="text-xs text-[#6B7280]">+{(ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter).toFixed(1)} min/encounter</div>
                    </div>
                  </div>
                  <div className="font-semibold text-[#111827]">{formatCurrency(calculations.efficiencyGapValue)}</div>
                </div>
              )}
              {calculations.wrvuGapValue > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-medium text-[#111827] text-sm">Revenue Capture Gap</div>
                      <div className="text-xs text-[#6B7280]">+{(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% wRVU</div>
                    </div>
                  </div>
                  <div className="font-semibold text-[#111827]">{formatCurrency(calculations.wrvuGapValue)}</div>
                </div>
              )}
            </div>

            <Button
              onClick={onNext}
              disabled={!canProceed}
              className="w-full bg-[#EA2C00] hover:bg-[#d12700] text-white h-12 text-base"
              data-testid="button-see-analysis"
            >
              See full analysis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
